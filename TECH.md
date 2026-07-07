# 技术实现手册 — 银行挂失导办 Demo

> 基于魔珐有灵（XmovAvatar）SDK 的 7 步业务状态机导办 Demo

## 项目结构

```
bank-loss-report/
├── index.html              # 入口 HTML，加载 CDN SDK
├── package.json            # 依赖与脚本
├── vite.config.ts          # Vite 构建配置
├── tsconfig.json           # TypeScript 配置
├── src/
│   ├── App.vue             # 主应用：状态机驱动 + 多通道输入
│   ├── components/
│   │   ├── AvatarCanvas.vue       # 数字人渲染画布
│   │   ├── BottomControlBar.vue   # 底部控制栏（PTT/文本质检）
│   │   ├── ConfigDrawer.vue       # 右侧配置抽屉
│   │   ├── CredentialModal.vue    # 凭证弹窗（OSS/魔搭）
│   │   ├── ProgressBar.vue        # 进度条
│   │   ├── StatusBanner.vue       # 状态横幅
│   │   ├── SubtitleOverlay.vue    # 字幕覆盖层
│   │   └── widgets/
│   │       ├── WidgetPicker.vue   # 选择器 Widget
│   │       ├── WidgetInput.vue    # 文本输入 Widget
│   │       ├── WidgetText.vue     # 纯展示 Widget
│   │       └── WidgetConfirm.vue  # 信息确认 Widget
│   ├── composables/
│   │   ├── useSDKStore.ts    # SDK 全局状态（字幕/Widget/表情）
│   │   └── useStateMachine.ts # 状态机引擎
│   ├── config/
│   │   ├── credentials.ts    # SDK Gateway 常量
│   │   ├── state-machine.ts  # 7 步状态定义
│   │   ├── llm-prompts.ts    # LLM System Prompt
│   │   └── sdk-defaults.ts   # SDK 布局预设
│   ├── lib/                  # 内联的共享包
│   │   ├── sdk-core/         # SDK 类型 + Composable
│   │   ├── llm/              # LLM 客户端
│   │   └── asr/              # ASR 语音识别
│   └── utils/
│       └── env.ts            # 环境变量读取
```

## 快速开始

```bash
pnpm install
pnpm dev
pnpm build
```

## 7 步业务流程

```
欢迎 → 卡号 → 身份证 → 原因 → 确认 → 完成
   ↘                           ↗
     不支持的业务（存折/支票）
```

| 状态 | 布局 | Widget | 输入模式 | 数字人引导语 |
|------|------|--------|---------|------------|
| welcome | 半身居中 | picker（3选1） | LLM | 您好，欢迎使用银行挂失服务。请问您要挂失什么？ |
| ask_card_no | 画中画 | input（卡号） | regex | 请告诉我您的银行卡号（也可在输入框直接输入） |
| ask_id_no | 画中画 | input（身份证） | regex | 请告诉我您的身份证号 |
| ask_reason | 半身居中 | 无 | passthrough | 请简单说明挂失原因 |
| confirm | 画中画 | confirm + picker | LLM | 请确认以上信息 |
| done | 半身居中 | text（受理单号） | LLM | 挂失已受理。如需其他帮助请随时呼叫 |
| unsupported | 半身居中 | 无（返回按钮） | none | 抱歉，本次 demo 仅支持银行卡挂失。已为您转接人工服务，请稍候。 |

## 架构

```
┌──────────────────────────────────────────┐
│              状态机引擎                    │
│  STATES: { welcome, ask_card_no, ... }    │
│                                           │
│         handleUserInput(text, source)      │
│         ┌── widget intent → 直接跳转       │
│         ├── llm → LLM 意图识别             │
│         ├── regex → 正则校验               │
│         ├── passthrough → 直接采纳          │
│         └── none → 不响应                  │
│                │                           │
│         transition(nextState)              │
│                │                           │
│    ┌───────────┼───────────┐              │
│    ▼           ▼           ▼              │
│  切换布局   切换Widget   数字人播报         │
│  (change    (component   (speak +          │
│   Layout)   :is + :key)  SSML引导语)       │
└──────────────────────────────────────────┘
```

## 状态定义

```ts
interface StateDef {
  layout: 'half_center' | 'pip'        // 布局模式
  widgetType: 'picker' | 'input' | 'text' | 'confirm' | null
  widgetConfig: WidgetConfig | null     // Widget 配置
  subtitleText: string                  // 数字人引导语
  progressIdx: number                   // 进度位置，-1 隐藏
  inputMode: 'llm' | 'regex' | 'passthrough' | 'none'
  regexPattern?: RegExp                 // regex 校验正则
  llmIntents?: string[]                 // LLM 允许的 intent 白名单
  nextState?: StateName | null          // 默认下一步
  retry?: {                             // 重试机制
    maxRetries: number
    onFail: StateName                   // 超限跳转
    errorMsg: string                    // 超限提示
  }
}
```

## LLM 意图识别

```ts
const SYSTEM_PROMPT = `
你是银行挂失导办助手。
当前步骤：${stateName}，已收集：卡号=${cardNo}，身份证=${idNo}

回复严格 JSON：
{"reply":"对用户说的话","intent":"next_state/.../stay","extractedData":{"field":"值"}}
`

// 解析时容错：提取 JSON 片段
function parseLLMResponse(raw: string) {
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  return JSON.parse(raw.slice(start, end + 1))
}
```

## 多通道输入收口

三种输入通道统一走 `handleUserInput()`：

```ts
// Widget 点选（自带 intent，直接跳转）—— 优先级最高
function onPickerSelect(item: PickerOption) {
  handleUserInput(item.value, 'widget', item.intent)
}

// 底部文本输入
function onTextSubmit(text: string) {
  handleUserInput(text, 'text-bar')
}

// 语音输入（PTT 按住说话）
asr.onResult((text, isFinal) => {
  if (isFinal) handleUserInput(text, 'voice')
})
```

## Widget 输入通道

```ts
const widgetMap = {
  picker: WidgetPicker,    // 选择器：点选项直接跳转
  input: WidgetInput,      // 输入框：卡号/身份证号 + 格式校验
  text: WidgetText,        // 纯展示：受理单号、状态展示
  confirm: WidgetConfirm,  // 确认页：字段展示 + 确认/修改/取消
}

// 动态渲染 + key 强制重建（避免切换时残留旧数据）
<component :is="widgetMap[state.widgetType]" :key="currentState" v-bind="config" />
```

## 布局切换

```ts
const LAYOUT_HALF = {
  container: { size: [1080, 1920] },
  avatar: { v_align: 'center', h_align: 'middle', scale: 0.48, offset_y: 200 },
}
const LAYOUT_PIP = {
  container: { size: [1080, 1920] },
  avatar: { v_align: 'center', h_align: 'bottom', scale: 0.25, offset_y: 140 },
}

// watch(currentState) 自动切换
watch(currentState, (s) => sdk.changeLayout(STATES[s].layout === 'pip' ? LAYOUT_PIP : LAYOUT_HALF))

## 环境变量

```env
VITE_SDK_APP_ID=
VITE_SDK_APP_SECRET=
VITE_LLM_API_KEY=
VITE_LLM_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1
VITE_LLM_MODEL=qwen-flash
VITE_ASR_APP_ID=
VITE_ASR_SECRET_ID=
VITE_ASR_SECRET_KEY=
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 + TypeScript |
| 构建 | Vite 8 |
| 数字人 | XmovAvatar SDK (CDN) |
| LLM | 阿里百炼 DashScope（OpenAI 兼容协议） |
| ASR | 腾讯云实时语音识别（WebSocket） |
| 包管理 | pnpm |
