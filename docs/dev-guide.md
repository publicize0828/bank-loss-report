# 银行挂失导办 Demo — 新手开发完全指南

> 适用人群：大学生 / 应届毕业生 / 前端初学者  
> 前置知识：HTML、CSS、JavaScript 基础，了解 Vue 3 更好但不是必须  
> 预计阅读时间：30-40 分钟

---

## 目录

1. [这是什么项目](#1-这是什么项目)
2. [5 分钟快速跑起来](#2-5-分钟快速跑起来)
3. [项目是怎么跑起来的](#3-项目是怎么跑起来的)
4. [源码逐文件讲解](#4-源码逐文件讲解)
5. [核心概念：状态机](#5-核心概念状态机)
6. [三种输入通道](#6-三种输入通道)
7. [数字人怎么"说话"和"动"](#7-数字人怎么说话和动)
8. [如何修改和扩展](#8-如何修改和扩展)
9. [常见问题排查](#9-常见问题排查)

---

## 1. 这是什么项目

一个**银行挂失导办**的数字人应用。用户和一个 AI 数字人对话，完成银行卡挂失流程：选择业务 → 输入卡号 → 输入身份证 → 说明原因 → 确认信息 → 提交。

**亮点**：
- 支持**语音说话**（按住说话）、**文字输入**、**屏幕点选**三种交互方式
- 数字人有**口型同步**和**肢体动作**
- AI 能理解用户的意图并引导流程

### 技术全景图

```
你的浏览器
    │
    ├─→ 魔珐 SDK (CDN)         数字人渲染 + 口型同步 + 动作
    ├─→ 腾讯云 ASR (WebSocket)   语音识别，把你说的话转成文字
    ├─→ 阿里百炼 LLM (HTTP)      大模型，理解用户意图并生成回复
    └─→ 阿里云 OSS (CDN)         托管前端静态页面
```

---

## 2. 5 分钟快速跑起来

### 2.1 准备工作

你需要安装：
- **Node.js** 18+ （[下载](https://nodejs.org)）
- **pnpm** 包管理器：`npm install -g pnpm`

### 2.2 克隆代码

```bash
git clone https://github.com/publicize0828/bank-loss-report.git
cd bank-loss-report
pnpm install
```

### 2.3 获取凭证（免费！）

| 你需要什么 | 去哪获取 | 免费额度 |
|-----------|---------|---------|
| SDK APP ID / SECRET | [魔珐星云](https://xingyun3d.com/) 注册 → 创建横屏应用 | 注册送 1000 积分 |
| LLM API Key | [阿里百炼](https://bailian.console.aliyun.com/) → 模型广场 → 开通 qwen-flash | 免费额度 |
| ASR 凭证 | [腾讯云 ASR](https://console.cloud.tencent.com/asr) → 实时语音识别 | 每月 5 小时免费 |

> 💡 魔珐星云注册时填邀请码 **JMPADSWRTX** 可以额外获得 1000 积分。

### 2.4 配置并启动

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑 .env 填入你的凭证
# VITE_SDK_APP_ID=你的APP_ID
# VITE_SDK_APP_SECRET=你的APP_SECRET
# VITE_LLM_API_KEY=sk-ws-你的LLM密钥
# VITE_ASR_APP_ID=你的ASR_APP_ID
# VITE_ASR_SECRET_ID=你的ASR_SECRET_ID
# VITE_ASR_SECRET_KEY=你的ASR_SECRET_KEY

# 3. 启动开发服务器
pnpm dev
```

打开浏览器访问 `http://localhost:5173`，看到数字人出现就成功了！

---

## 3. 项目是怎么跑起来的

### 3.1 启动流程（按时间顺序）

```
1. 浏览器加载 index.html
2. index.html 中的 <script> 标签从 CDN 加载魔珐 SDK
3. Vue 应用启动，App.vue 开始渲染
4. App.vue 初始化时调用 initSDK()
5. initSDK() ：
   a. 用你的 APP ID / SECRET 连接魔珐服务器
   b. 下载数字人模型（可能要等几秒）
   c. 连接成功后数字人出现
6. 进入 welcome 状态，数字人说话："您好，欢迎使用银行挂失服务"
7. 等待用户输入（语音 / 文字 / 点击）
```

### 3.2 核心数据流

```
用户输入（语音/文字/点击）
    │
    ▼
handleUserInput()  ←── 统一的输入收口
    │
    ├── 语音 → ASR 识别 → LLM 理解意图 → handleLLMIntent()
    ├── 文字 → LLM 理解意图 → handleLLMIntent()
    └── 点击 → 自带 intent，直接跳转
    │
    ▼
transition(nextState)  ←── 切换到下一个状态
    │
    ├── 改变布局（数字人大小位置）
    ├── 改变 Widget（屏幕上的交互控件）
    └── 数字人播报引导语
```

---

## 4. 源码逐文件讲解

### 4.1 入口文件

#### `index.html` — 应用入口

```html
<script src="https://media.xingyun3d.com/.../xmovAvatar@latest.js"></script>
```

这行是最关键的——它从 CDN 加载魔珐 SDK。加载后，浏览器里就有了 `window.XmovAvatar` 这个全局对象，后面所有和数字人相关的操作都通过它。

#### `src/main.ts` — Vue 应用启动

```ts
import { createApp } from 'vue'
import App from './App.vue'
createApp(App).mount('#app')
```

标准的 Vue 3 入口，不需要理解太深。它把 `App.vue` 这个组件挂载到 `index.html` 中的 `<div id="app">` 上。

### 4.2 主组件：`src/App.vue`

这是整个应用的大脑，约 500 行代码，但结构很清晰：

```
App.vue
├── 模板（template）
│   ├── CredentialModal      ← 凭证弹窗（第一次用会弹出来）
│   ├── AvatarCanvas         ← 数字人渲染区域
│   ├── Widget 叠层          ← 屏幕上的交互卡片
│   ├── SubtitleOverlay      ← 字幕显示
│   ├── ProgressBar          ← 进度条
│   ├── StatusBanner         ← 错误提示横幅
│   └── BottomControlBar     ← 底部控制栏（按住说话 + 文字输入）
│
└── 脚本（script setup）
    ├── SDK 初始化           ← initSDK() 连接数字人
    ├── 状态机逻辑           ← 7 个状态的定义和切换
    ├── 三种输入处理         ← 语音/文字/点击的统一入口
    ├── LLM 对话             ← 调用大模型理解用户意图
    └── ASR 语音识别         ← 按住说话，实时转文字
```

**关键变量**：

| 变量 | 类型 | 作用 |
|------|------|------|
| `currentState` | ref | 当前在哪个步骤（welcome / ask_card_no / ...） |
| `session` | reactive | 收集到的业务数据（卡号、身份证、原因） |
| `isInitialized` | ref | SDK 是否连接成功 |
| `isRecording` | ref | 是否正在录音 |

**关键函数**：

| 函数 | 作用 |
|------|------|
| `handleUserInput(text, source)` | 所有输入的**唯一入口** |
| `transition(stateName)` | 切换到指定状态 |
| `handleLLMInput(text)` | 把文字发给大模型 |
| `handleLLMIntent(parsed)` | 根据大模型返回的意图跳转 |
| `showSdkError(data)` | SDK 出错时显示提示 |

### 4.3 组件详解

#### `AvatarCanvas.vue` — 数字人画布

这就是一个简单的 `<div>` 容器，数字人 SDK 会在这个 div 里渲染 3D 模型。

```html
<div id="avatar-canvas" class="avatar-canvas" />
```

你不需要在这个组件里写任何逻辑，SDK 自己管理里面的一切。

#### `BottomControlBar.vue` — 底部控制栏

两个功能：
- **🎤 按住说话按钮**：按下开始录音，松开停止
- **💬 文字输入框**：打字发送

```ts
// 按下 → 开始录音
@mousedown="emit('ptt-start')"
// 松开 → 停止录音
@mouseup="emit('ptt-end')"
// 回车 → 发送文字
@keyup.enter="emit('text', textInput)"
```

#### `CredentialModal.vue` — 凭证弹窗

第一次打开应用或者没有配置凭证时自动弹出。包括：
- 注册引导（4 步图文）
- 邀请码（新人福利 1000 积分）
- APP ID / SECRET 输入框
- 连接按钮

#### `ProgressBar.vue` — 进度条

显示当前在第几步。7 个步骤：欢迎 → 卡号 → 身份证 → 原因 → 确认 → 完成。

```ts
// 每个状态的 progressIdx 对应进度条位置
// welcome=0, ask_card_no=1, ask_id_no=2, ...
```

#### `StatusBanner.vue` — 状态横幅

显示错误提示的红条，比如：
- 🔴 网络已断开，数字人进入离线模式
- ⚠️ 语音服务不可用，请使用文字输入

#### `SubtitleOverlay.vue` — 字幕覆盖层

显示数字人说的话。字幕数据来自 SDK 的 `subtitle_on` 事件，不需要手动设置。

### 4.4 Widget 组件

Widget 是屏幕上显示的交互卡片，根据当前状态动态切换。

#### `WidgetPicker.vue` — 选择器

显示几个选项按钮，用户点击后直接跳转。用于 welcome 页面（选业务类型）和 modify_field 页面（选修改哪个字段）。

```ts
// 点击选项 → 触发 select 事件 → handleUserInput
emit('select', { value: '我要挂失银行卡', intent: 'ask_card_no' })
```

#### `WidgetInput.vue` — 输入框

带格式校验的输入框，用于输入卡号（16-19 位数字）和身份证号（18 位）。

```ts
// 校验规则：
// cardNo：/^\d{16,19}$/ （纯数字，16-19 位）
// idNo：/^\d{17}[\dXx]$/ （17 位数字 + 1 位数字或 X）
```

#### `WidgetConfirm.vue` — 确认页

显示收集到的信息（卡号、身份证、原因），并提供三个操作按钮：
- ✅ 确认提交 → 生成受理单号，进入完成页
- ✏️ 修改信息 → 选择要修改哪个字段
- ❌ 取消挂失 → 返回欢迎页

#### `WidgetText.vue` — 纯展示

显示一段文字，比如完成页的受理单号、不支持业务的提示。

### 4.5 Composables（组合式函数）

#### `useStateMachine.ts` — 状态机引擎

整个应用最核心的逻辑。包含：

```ts
// 模块级响应式 store — 所有组件共享
export const session = reactive({
  businessType: '',
  cardNo: '',
  idNo: '',
  reason: '',
  receiptNo: '',
})

// 状态切换
function transition(next: StateName) { ... }

// 根据状态返回对应的 Widget 配置
function widgetConfigFor(stateName: StateName): WidgetConfig { ... }
```

#### `useSDKStore.ts` — SDK 全局状态

管理所有和数字人 SDK 相关的状态：
- `subtitle`：当前字幕文本
- `widgets`：SDK 下发的控件列表
- `emotion`：数字人表情
- `proxyWidget`：代理控件回调

### 4.6 配置文件

#### `state-machine.ts` — 7 步状态定义

定义了整个业务流程的每一步。核心数据结构：

```ts
interface StateDef {
  layout: 'half_center' | 'pip'   // 数字人布局（半身居中 / 画中画小窗）
  widgetType: 'picker' | 'input' | 'text' | 'confirm' | null  // 显示什么交互控件
  subtitleText: string              // 数字人说什么引导语
  inputMode: 'llm' | 'regex' | 'passthrough' | 'none'  // 如何理解用户输入
  nextState: StateName              // 默认下一步
  retry: { maxRetries, onFail, errorMsg }  // 错误重试机制
}
```

**修改流程的最简单方式**：改这个文件里的 `subtitleText` 和 `widgetConfig`。

#### `llm-prompts.ts` — AI 提示词

定义了发给大模型的 System Prompt。大模型根据这个 Prompt 理解它在干什么，以及如何回复。

```ts
// 核心格式：要求 AI 返回 JSON
{
  "reply": "对用户说的话",
  "intent": "ask_card_no / confirm / done / ...",
  "extractedData": { "cardNo": "6222020012345678" }
}
```

**Prompt 的每一段都在告诉 AI**：
- 你是谁（银行挂失导办助手）
- 你的职责（引导用户完成 7 步流程）
- 当前进度（已经收集了哪些信息）
- 当前要做什么（询问卡号 / 确认信息 / ...）
- 规则（卡号格式、重试次数、寒暄处理）

---

## 5. 核心概念：状态机

### 5.1 什么是状态机

想象一个**自动售货机**：
- 你在"等待投币"状态时，按"出货"按钮不会有用
- 你投了币进入"等待选择"状态，按"出货"才有用
- 出货完成后回到"等待投币"状态

我们的导办应用也是一样的——**每一步就是一个状态**，当前在哪个状态决定了：
- 数字人怎么站（半身居中 / 画中画小窗）
- 屏幕上显示什么（选项按钮 / 输入框 / 确认信息）
- 用户说的话怎么理解（用 AI 理解 / 正则校验格式 / 直接采用）

### 5.2 7 个状态详解

```
                    ┌──────────┐
         ┌─────────→│  welcome │←────────────┐
         │          │  欢迎页   │             │
         │          └────┬─────┘             │
         │               │ 选银行卡挂失       │
         │          ┌────▼─────┐             │
         │          │ask_card_no│             │
         │          │  输卡号   │             │
         │          └────┬─────┘             │
         │               │ 卡号正确          │
         │          ┌────▼─────┐             │
         │          │ask_id_no  │             │
         │          │ 输身份证  │             │
         │          └────┬─────┘             │
         │               │ 身份证正确        │
         │          ┌────▼─────┐             │
         │          │ask_reason │             │
         │          │  说原因   │             │
         │          └────┬─────┘             │
         │               │ 确认             │
         │          ┌────▼─────┐   修改信息  │
         │          │ confirm  │────→modify_field
         │          │ 确认信息  │             │
         │          └────┬─────┘             │
         │               │ 确认提交          │
         │          ┌────▼─────┐             │
         │          │   done   │────→办理其他业务
         │          │  完成页   │             │
         │          └──────────┘             │
         │                                  │
         └──────────────────────────────────┘
```

| 状态 | 布局 | 屏幕控件 | 用户怎么操作 | AI 怎么理解 |
|------|------|---------|------------|-----------|
| welcome | 半身居中 | 3 个选项按钮 | 点击选业务 | LLM 理解意图 |
| ask_card_no | 画中画 | 卡号输入框 | 打字或说话报卡号 | 正则校验 16-19 位 |
| ask_id_no | 画中画 | 身份证输入框 | 打字或说话报身份证 | 正则校验 18 位 |
| ask_reason | 半身居中 | 无 | 说话说原因 | 直接采用 |
| confirm | 画中画 | 确认卡片 + 3 按钮 | 点击确认/修改/取消 | LLM 理解意图 |
| done | 半身居中 | 受理单号展示 | 点击返回 | LLM 理解意图 |
| unsupported | 半身居中 | 不支持提示 | 点击返回 | 不响应 |

### 5.3 状态怎么切换

```ts
// 切换状态就是一句话
transition('ask_card_no')  // 跳到输卡号
transition('confirm')       // 跳到确认页
transition('welcome')       // 回到首页
```

`transition()` 会自动：
1. 重置当前状态的重试计数
2. 如果跳到 welcome → 清空所有数据
3. 如果跳到 confirm → 退出修改模式
4. 更新 `currentState`

Vue 发现 `currentState` 变了 → 所有依赖它的东西自动更新：
- 数字人布局切换
- 屏幕控件切换
- 进度条更新
- 数字人播报新引导语

---

## 6. 三种输入通道

### 6.1 统一入口

**所有输入都经过 `handleUserInput()`**，不管你用什么方式：

```ts
function handleUserInput(text: string, source: 'voice' | 'text-bar' | 'widget', widgetIntent?: string) {
  // 1. Widget 点击（自带意图，优先级最高）→ 直接跳转
  if (source === 'widget' && widgetIntent) {
    transition(widgetIntent)
    return
  }
  
  // 2. 按当前状态的 inputMode 处理
  if (inputMode === 'regex')       handleRegexInput(def, text)      // 正则校验
  if (inputMode === 'passthrough') handlePassthroughInput(def, text) // 直接采用
  if (inputMode === 'llm')         handleLLMInput(text)              // AI 理解
}
```

### 6.2 语音输入（按住说话）

```
按住按钮
  ↓
ASR.start()  ← 开始录音，音频实时发到腾讯云
  ↓
腾讯云 ASR 实时返回识别结果
  ├── slice_type ≠ 2 → 中间结果（显示在屏幕上，但 < 2 字不显示）
  └── slice_type = 2 → 最终结果 → handleUserInput(text, 'voice')
```

### 6.3 文字输入

```
输入框打字 → 回车 / 点发送
  ↓
handleUserInput(text, 'text-bar')
  ↓
根据 inputMode 处理（正则 / 直通 / LLM）
```

### 6.4 屏幕点选

```
点击 Widget 上的按钮
  ↓
Widget 组件 emit 事件 → onWidgetSelect(item)
  ↓
handleUserInput(item.value, 'widget', item.intent)
  ↓
item.intent 就是目标状态 → 直接 transition()
```

---

## 7. 数字人怎么"说话"和"动"

### 7.1 说话（TTS）

```ts
// 让数字人说一句话
sdk.speak(`<speak>${text}</speak>`, true, true)
//              ↑ 用 SSML 包裹      ↑ 打断之前的话  ↑ 自动播放
```

SDK 收到后：
1. 调用魔珐 TTS 服务合成语音
2. 计算口型数据（viseme）
3. 播放音频 + 驱动数字人嘴巴同步

### 7.2 动作

数字人的动作通过 SSML 标签驱动：

```xml
<!-- 做一个"欢迎"动作 -->
<speak>
  <ue4event>ka:ka_welcome</ue4event>
  您好，欢迎使用银行挂失服务
</speak>
```

`ka:` 开头的动作标签在 SSML 文本中嵌入，SDK 播放到对应时间点时会执行动作。

### 7.3 布局

数字人有两种布局，通过 `changeLayout()` 切换：

```
半身居中（half_center）：             画中画（pip）：
┌─────────────────┐          ┌─────────────────┐
│                 │          │  ┌─卡片──┐      │
│    ┌─────┐      │          │  │ Widget│      │
│    │数字人│      │          │  └───────┘      │
│    │半身  │      │          │                 │
│    └─────┘      │          │    ┌─数字人─┐   │
│                 │          │    │ 小窗   │   │
├─────────────────┤          ├────┴────────┴───┤
│  控件 / 字幕     │          │  控件 / 字幕     │
└─────────────────┘          └─────────────────┘
```

---

## 8. 如何修改和扩展

### 8.1 改提示文案

编辑 `src/config/state-machine.ts`，找到对应状态的 `subtitleText`：

```ts
welcome: {
  // 改这行！
  subtitleText: '你好呀，欢迎来办银行卡挂失～请问你要挂失什么呀？',
}
```

### 8.2 改 Widget 样式

编辑 `src/components/widgets/` 下对应组件，修改 `<style scoped>` 中的 CSS。

### 8.3 增加一个新的业务类型

1. 在 `welcome` 的 picker 里加一个选项：
```ts
{ icon: '📱', label: '手机银行挂失', value: '我要挂失手机银行', intent: 'ask_phone_no' },
```

2. 新增一个状态 `ask_phone_no`：
```ts
ask_phone_no: {
  layout: 'pip',
  widgetType: 'input',
  widgetConfig: {
    type: 'input', title: '手机号', placeholder: '请输入 11 位手机号',
    inputmode: 'numeric', maxlength: 11, submitLabel: '提交手机号', validate: undefined,
  },
  subtitleText: '请告诉我您的手机号',
  progressIdx: 2,
  inputMode: 'regex',
  regexPattern: /^1\d{10}$/,
  nextState: 'ask_id_no',
}
```

3. 把 `StateName` 类型和 `FLOW_STEPS` 加上新状态。

### 8.4 改成其他行业流程

核心思路：**只改 `state-machine.ts` 和 `llm-prompts.ts`**。

比如改成"医院挂号"：
- welcome → 选择科室
- ask_card_no → 输入医保卡号
- ask_id_no → 输入身份证
- ask_reason → 描述症状
- confirm → 确认预约信息
- done → 挂号成功

只需要改文案和 Prompt，代码一行不用动。

### 8.5 换 LLM 供应商

编辑 `src/config/credentials.ts` 和 `.env`：

```env
# 用 DeepSeek
VITE_LLM_ENDPOINT=https://api.deepseek.com/v1
VITE_LLM_MODEL=deepseek-chat
VITE_LLM_API_KEY=sk-你的密钥
```

---

## 9. 常见问题排查

### Q: 数字人不出现，页面空白？
1. 检查 `.env` 文件是否存在且 APP ID / SECRET 正确
2. 打开浏览器控制台（F12）看有没有红色报错
3. 常见错误：10003 = 积分不足，去魔珐星云充值或重新注册

### Q: 说话后数字人不回复？
1. 检查 LLM API Key 是否配置正确
2. 打开控制台看有没有网络请求报错
3. 确认 `VITE_LLM_ENDPOINT` 和 `VITE_LLM_MODEL` 正确

### Q: 按住说话没反应？
1. 检查 ASR 凭证是否配置
2. 浏览器需要 HTTPS 或 localhost 才能用麦克风
3. 确认浏览器麦克风权限已开启

### Q: 卡号/身份证校验一直不过？
- 卡号：16-19 位纯数字，空格会被自动去掉
- 身份证：18 位，最后一位可以是 X

### Q: 怎么调试？
1. 浏览器 F12 → Console 看日志
2. 控制台输入 `window.__xmovSdk` 可以直接操作 SDK
3. 看 Network 标签查看 API 请求

---

## 附录：完整 API 速查

### SDK 核心 API

```ts
// 初始化
const sdk = await initSDK({ appId, appSecret, gatewayServer, ... })

// 说话
sdk.speak('<speak>你好</speak>', true, true)

// 打断
sdk.interrupt('user')

// 切换布局
sdk.changeLayout({ container: {...}, avatar: {...} })

// 销毁下线
sdk.offlineMode()
sdk.destroy()
```

### 状态机 API

```ts
import { useStateMachine, session } from './composables/useStateMachine'

const { currentState, transition, widgetConfigFor } = useStateMachine()

// 跳转
transition('ask_card_no')

// 读写业务数据
session.cardNo = '6222020012345678'
console.log(session.cardNo)
```
