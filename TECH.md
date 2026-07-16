# 银行挂失导办 Demo — 项目详解

> 本文档详细介绍 bank-loss-report（银行挂失导办）的项目结构、架构设计、组件实现和数据流。这是一个移动端优先（max-width: 430px）的垂直场景 Demo，通过状态机驱动用户完成"银行卡挂失"的完整业务流程。

---

## 一、项目目录结构

```
bank-loss-report/
├── index.html                    # Vite 入口，引入 SDK CDN + 挂载 #app
├── package.json                  # 项目依赖 + 脚本
├── vite.config.ts                # Vite 配置（端口 3002）
├── tsconfig.json                 # TypeScript 配置
├── env.d.ts                      # 类型声明 + ImportMetaEnv 接口
├── .env.example                  # 环境变量模板（本地开发用）
├── .env                          # 环境变量（本地开发用，不提交 git）
│
└── src/
    ├── main.ts                   # Vue 应用入口（全局错误兜底）
    ├── App.vue                   # 根组件（核心编排：状态机 + SDK + ASR + LLM）
    │
    ├── components/               # 组件
    │   ├── AvatarCanvas.vue          # 数字人渲染画布（半身/PIP 模式）
    │   ├── BottomControlBar.vue      # 底部控制栏（语音+文字输入）
    │   ├── SubtitleOverlay.vue       # 字幕覆盖层（SDK 字幕 + ASR 转写）
    │   ├── ProgressBar.vue           # 步骤进度指示器（6 步点阵）
    │   ├── StatusBanner.vue          # 顶部状态横幅（网络错误/ASR 不可用）
    │   ├── ErrorToast.vue            # 错误 Toast 弹层
    │   ├── ConfigDrawer.vue          # 底部设置抽屉（SDK 凭证 + 初始化）
    │   ├── CredentialModal.vue       # 凭证弹窗（ModelScope 部署用）
    │   │
    │   └── widgets/                  # Widget 组件（状态机驱动的交互卡片）
    │       ├── WidgetPicker.vue          # 选项列表（picker type）
    │       ├── WidgetInput.vue           # 表单输入（input type）
    │       ├── WidgetText.vue            # 文本展示 + 操作按钮（text type）
    │       └── WidgetConfirm.vue         # 信息确认（confirm type）
    │
    ├── composables/              # 组合式函数（核心逻辑）
    │   ├── useSDKStore.ts            # SDK 数据代理 store（单例）
    │   └── useStateMachine.ts        # 业务流程状态机 + 会话管理
    │
    ├── config/                   # 配置文件
    │   ├── credentials.ts            # SDK 网关地址常量
    │   ├── sdk-defaults.ts           # SDK 布局配置（half_center / pip）
    │   ├── state-machine.ts          # 状态定义 + 状态转换表
    │   └── llm-prompts.ts            # LLM 系统提示词 + 响应解析器
    │
    ├── utils/
    │   └── env.ts                    # environment getter（ModelScope + Vite 双源）
    │
    └── types/
        ├── index.ts                  # 会话数据 / 应用状态 / Widget 项 / 输入来源
        └── widget.ts                 # Widget 类型重导出
```

---

## 二、架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                        App.vue（根容器）                           │
│  430px 宽，100vh 高，flex 纵向布局                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                StatusBanner（状态横幅）                     │    │
│  │  网络断开 / ASR 不可用 / SDK 错误                           │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                 AvatarCanvas（画布区域）                    │    │
│  │  half_center 模式：9/11 比例 + 上部垂直居中                │    │
│  │  pip 模式：右下角 100px 圆形浮窗                            │    │
│  │  加载中：进度圆环 + 百分比                                   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  [← 上一步]                    ← 有 backState 时显示       │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │              Widget 叠层（动态组件）                        │    │
│  │  picker → WidgetPicker                                   │    │
│  │  input  → WidgetInput                                    │    │
│  │  text   → WidgetText                                     │    │
│  │  confirm→ WidgetConfirm                                  │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │              SubtitleOverlay（字幕）                       │    │
│  │  SDK subtitle / ASR 转写实时文字                            │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              ProgressBar（步骤指示器）                      │    │
│  │  欢迎 · 卡号 · 身份证 · 原因 · 确认 · 完成                  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │             BottomControlBar（底部控制栏）                  │    │
│  │  [🎤按住录音] [__________________] [发送]                   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ⚙️ 右下角 FAB → ConfigDrawer（底部抽屉设置）                    │
│  ✨ CredentialModal（凭证弹窗，ModelScope 部署用）                │
└──────────────────────────────────────────────────────────────────┘
```

**四层架构**：

```
视图层（Components）        ← 用户交互、UI 渲染
    ↕ (props, emit)
逻辑层（App.vue 编排）       ← 状态机驱动 + ASR + LLM + SDK 调度
    ↕ (composables)
数据层（useSDKStore /       ← 会话数据、Widget 列表、状态机
  useStateMachine）
    ↕ (window.XmovAvatar / @xmov/* packages)
SDK 层（CDN + packages）     ← 3D 渲染、TTS、口型驱动、Widget 通信
```

**不同于 lite-sdk-demo 的关键差异**：

- 无 DevTools 浮动面板、无 CodeMirror、无行走系统、无性能 HUD
- 状态机驱动业务流程（非自由探索）
- 移动端优先（max-width: 430px），只支持 portrait 竖屏
- ASR 使用 `@xmov/asr` package（腾讯云实时语音识别）
- LLM 使用 `@xmov/llm` package（阿里百炼 DashScope API）
- 两个 composables 替代 lite-sdk-demo 的十余个 composables

---

## 三、完整数据流

```
用户操作（语音/文字/按钮点击）
       │
       ▼
handleUserInput(text, source, widgetIntent?)
       │
       ├── widgetIntent 存在 → transition(widgetIntent)
       │
       ├── LLM 模式（inputMode === 'llm'）
       │     │
       │     ├── 关键词匹配 PickerOption → 快捷跳转（等效点击按钮）
       │     │
       │     └── 调用 LLM → parseLLMResponse() → handleLLMIntent()
       │            │
       │            ├── intent === 'stay' → 只说，不跳转
       │            ├── intent === 'done' → updateSession(receiptNo) → transition('done')
       │            └── 其他 intent  → transition(target)
       │
       ├── Regex 模式（inputMode === 'regex'）
       │     │
       │     ├── 匹配成功 → applyExtractedData() → transition(nextState)
       │     └── 匹配失败 → recordRetry() → 重试耗尽 → transition(onFail)
       │
       └── Passthrough 模式（inputMode === 'passthrough'）
             │
             └── applyExtractedData() → transition(nextState)

transition(next) 触发：
  1. 重置当前状态重试计数
  2. 更新 currentState（响应式）
  3. watch(currentState) → speakText(subtitleText)
  4. widgetConfigFor() → 动态生成 Widget 配置

用户语音输入路径：
  语音 → ASR（腾讯云）→ onResult(text, isFinal)
      → isFinal → handleUserInput(text.trim(), 'voice') → 同上状态机逻辑

SDK 播报路径：
  speakText(text) → sdk.speak(`<speak>${text}</speak>`, true, true)
      → 播完 → onSpeakStateChange('speak_end') → onSpeakEnd()
      → 有 pendingNextState → transition(pendingNextState)
```

---

## 四、核心组件详解

### 4.1 App.vue — 根组件（~520 行）

整个应用的唯一编排层，所有业务逻辑在此汇聚。职责：

- **初始化 SDK**：调用 `@xmov/sdk-core` 的 `initSDK()`
- **管理状态机**：调用 `useStateMachine()`，驱动 welcome → ask_card_no → ask_id_no → ask_reason → confirm → done 流程
- **管理 ASR**：调用 `@xmov/asr` 的 `useASR()`，处理语音识别
- **管理 LLM**：调用 `@xmov/llm` 的 `createLLMClient()`，构建系统提示词 + 解析响应
- **UI 编排**：根据当前状态渲染对应的 Widget 组件
- **部署模式适配**：ModelScope（有试用计时）/ OSS（无试用）/ 本地开发（ConfigDrawer 手动输入）

关键代码结构：

```vue
<script setup>
// 1. 引入 composables
const sdkStore = useSDKStore()
const { currentState, state, transition, widgetConfigFor, ... } = useStateMachine()
const { initSDK, destroy: sdkDestroy, isInitialized, ... } = useSdkCore('#avatar-canvas', logger)
const asr = useASR()
const _llmClient = createLLMClient({ apiKey, endpoint })

// 2. 用户输入收口函数
function handleUserInput(text, source, widgetIntent) { ... }
// 3. 输入模式分发：llm / regex / passthrough
function handleLLMInput(text) { ... }
function handleRegexInput(def, text) { ... }
function handlePassthroughInput(def, text) { ... }
// 4. LLM 意图处理
function handleLLMIntent(parsed) { ... }

// 5. SDK 生命周期
async function handleInit() { ... }
function handleDestroy() { ... }

// 6. 监听状态变化 → 播报引导语
watch(currentState, (newState) => { speakText(def.subtitleText) })
watch(isInitialized, (ready) => { if (ready) speakText(subtitleText) })
</script>
```

**三个关键设计决策**：

1. **全部逻辑在 App.vue，零子组件状态**：Widget 组件是纯展示组件，通过 props 接收配置、emit 通知用户操作。没有 Pinia 或 Vuex，状态全部在 composables 的模块级变量中
2. **speak-then-transition**：等 SDK 播完当前引导语再跳转状态，避免 speak 打断
3. **SDK 字幕由 MutationObserver 隐藏**：应用使用自己的 SubtitleOverlay 渲染字幕，SDK 原生字幕容器通过 observer 隐藏

### 4.2 AvatarCanvas.vue — 数字人渲染画布

为 SDK 提供渲染容器 `<div id="avatar-canvas">`，支持两种布局模式：

| 模式 | 用途 | 外观 |
|-|-|-|
| `half_center` | 业务流程开始步骤 | 上半屏 9/11 比例，数字人垂直居中 |
| `pip` | 信息输入/确认步骤 | 右下角 100px 圆形浮窗，带红色边框阴影 |

- **Props**：`layout` / `isReady` / `isLoading` / `progress`
- 加载时显示 SVG 环形进度条；未初始化时显示"点击右下角 ⚙️ 配置并初始化数字人"

### 4.3 BottomControlBar.vue — 底部控制栏

功能：语音按钮（按住录音）+ 文字输入框 + 发送按钮 + 字符计数。

- **Props**：`disabled` / `recording` / `asrDisabled` / `maxlength`
- **Emits**：`ptt-start` / `ptt-end`（录音）、`text`（提交文字）、`input`（实时输入同步）
- 支持 `maxlength` 动态限制（passthrough 模式下限制 140 字符）
- 录音按钮使用 `@touchstart.prevent` / `@touchend.prevent` 适配移动端

### 4.4 SubtitleOverlay.vue — 字幕覆盖层

展示当前语音引导文字（SDK 字幕 + ASR 实时转写）。

- 优先显示 ASR 转写文字（带麦克风图标），ASR 无内容时显示 SDK subtitle
- ASR 最终识别结果停留 2 秒后消失（在 App.vue 中用 setTimeout 控制）
- 使用 `useSDKStore().subtitle` 读取 SDK 侧通过 `proxyWidget.subtitle()` 回调写入的字幕

### 4.5 ProgressBar.vue — 步骤进度指示器

6 步点阵：欢迎 → 卡号 → 身份证 → 原因 → 确认 → 完成

- 圆点：灰色（未到）/ 红色（当前）/ 绿色（已完成）
- 连接线：灰色（未到）/ 绿色（已完成）
- 标签文字：灰色（未到）/ 红色（当前加粗）/ 绿色（已完成）

### 4.6 StatusBanner.vue — 状态横幅

固定在画布顶部的状态提示条：

| 状态 | 显示内容 |
|-|-|
| `network_error` | "网络已断开，数字人进入离线模式" |
| `asr_unavailable` | "语音服务不可用，请使用文字输入" |
| `sdkError` | SDK 错误消息（由 `onMessage` 回调触发） |

### 4.7 ErrorToast.vue — 错误 Toast

Teleport 到 body 的错误提示层，同时最多保留 5 条，每条 5 秒自动消失。通过 `defineExpose({ show })` 暴露给 App.vue 调用。

### 4.8 ConfigDrawer.vue — 设置抽屉

右下角齿轮 FAB → 弹出底部抽屉，两种模式：

- **非 ModelScope 模式**（本地开发）：显示 APP ID / APP SECRET 输入框 + 初始化/销毁按钮 + 凭证获取帮助
- **ModelScope 模式**：只显示"连接数字人"按钮，点击弹出 CredentialModal

### 4.9 CredentialModal.vue — 凭证弹窗

ModelScope / OSS 部署模式下首次打开时显示。包含：

- 邀请码卡片（一键复制）
- 四步注册指引（登录官网 → 注册账号 → 创建应用 → 复制凭证）
- APP ID / APP SECRET 表单
- 试用倒计时提示（ModelScope 模式专用）
- 连接/取消按钮

部署模式检测逻辑（在 App.vue 中）：

```ts
const isModelScopeMode = window.__ENV__ 存在 || VITE_MODELSCOPE_PREVIEW === 'true'
const isOSSDeploy = import.meta.env.PROD && !isModelScopeMode
const showCredOnStart = isModelScopeMode || isOSSDeploy
```

---

## 五、Widget 组件详解

Widget 系统是 bank-loss-report 区别于 lite-sdk-demo 的核心特色。状态机中的每个状态可配置一个 widgetType，App.vue 根据 `widgetComponent` 动态渲染对应组件。

### 5.1 WidgetPicker.vue — 选项列表（picker）

用户从预设选项中选择一项。

- **Props**：`title` / `items: PickerOption[]`
- **Emits**：`select(item)` → App.vue 调用 `handleUserInput(item.value, 'widget', item.intent)`
- 每个选项包含 icon + label + value + intent，点击直接携带 intent 跳转状态

### 5.2 WidgetInput.vue — 表单输入（input）

收集用户输入的文本，支持前端校验。

- **Props**：`title` / `placeholder` / `hint` / `inputmode` / `maxlength` / `submitLabel` / `validate` / `defaultValue`
- **Emits**：`submit(value)`
- **校验规则**：
  - `validate: 'cardNo'` → `/^\d{16,19}$/`（去空格后）
  - `validate: 'idNo'` → `/^\d{17}[\dXx]$/`
- **双向同步**：用户输入实时写入 session（模块级变量），外部 session 变化也同步回输入框 default value

### 5.3 WidgetText.vue — 文本展示（text）

展示信息文本 + 可选的底部操作按钮（done 页的"办理其他业务"/"修改信息"等）。

- **Props**：`title` / `content` / `actions?: PickerOption[]`
- **Emits**：`action(item)` → 同上 `handleUserInput` 路径

### 5.4 WidgetConfirm.vue — 信息确认（confirm）

展示已收集信息的摘要（脱敏显示）+ 三个操作按钮：确认提交 / 修改信息 / 取消挂失。

- **Props**：`title` / `fields: { key, val }[]` / `picker: PickerOption[]`
- **Emits**：`action(item)` → 跳转 done / modify_field / welcome

### 5.5 Widget 路由表

```ts
const widgetMap: Record<string, Component> = {
  picker:  WidgetPicker,
  input:   WidgetInput,
  text:    WidgetText,
  confirm: WidgetConfirm,
}
```

`currentWidgetConfig` 由 `widgetConfigFor()` 函数运行时生成——confirm 和 text 类型的配置包含动态数据（脱敏后的卡号/身份证号、受理单号等）。

---

## 六、Composables 详解

### 6.1 useSDKStore.ts — 单例数据代理

**用途**：作为 SDK 回调与应用 UI 之间的数据桥梁。SDK 通过 `proxyWidget` 回调写入数据，UI 组件（SubtitleOverlay 等）通过响应式 ref 读取。

**对外暴露**：

```ts
const {
  subtitle,         // Ref<string> — 字幕文本
  avatarEmotion,    // Ref<string> — 数字人情绪
  widgetItems,      // Ref<WidgetItem[]> — Widget 列表（供 CustomWidgetOverlay 渲染用）
  proxyWidget,      // ProxyWidgetHandlers — 传递给 initSDK 的回调对象
  clearWidgets,     // () => void — 清空 Widget 列表
} = useSDKStore()
```

**模块级单例**：`_store` 在模块闭包中共享，多个组件调用 `useSDKStore()` 返回同一份数据。

**proxyWidget 处理函数**（共 9 个方法）：

| SDK 回调 | 数据类型 | 处理方式 |
|-|-|-|
| `subtitle(d)` | 字幕文本 | `subtitle.value = text` |
| `widget_text(d)` | 弹框文本 | `subtitle.value = text` |
| `emotion(d)` | 情绪标识 | `avatarEmotion.value = emo` |
| `show_image(d)` | 图片 Widget | `pushWidget('image', d)` |
| `show_video(d)` | 视频 Widget | `pushWidget('video', d)` |
| `show_link(d)` | 链接 Widget | `pushWidget('link', d)` |
| `show_model3d(d)` | 3D 模型 | 先移除同类，再 `pushWidget('model3d', d)` |
| `show_text(d)` | 文本 Widget | `pushWidget('text', d)` |
| `bgm_start(d)` / `audio(d)` | 音频 Widget | `pushWidget('audio', d)` |

> 注：bank-loss-report 的 Widget 系统目前仅用于字幕和情绪，`widgetItems` 供 CustomWidgetOverlay 渲染（当前未实装 Overlay 组件），数据通道已预留。

### 6.2 useStateMachine.ts — 业务流程状态机

**用途**：管理银行挂失业务的完整对话状态机，是 bank-loss-report 最核心的 composable（~140 行）。

**对外暴露**：

```ts
const {
  currentState,      // Ref<StateName> — 当前状态
  state,             // Computed<StateDef> — 当前状态定义
  appStatus,         // Ref<AppStatus> — 应用状态（normal / network_error / asr_unavailable）
  progressSteps,     // Computed — 进度条数据
  widgetConfigFor,   // (stateName) => WidgetConfig — 运行时 Widget 配置
  transition,        // (next: StateName) => void — 状态跳转
  recordRetry,       // () => void — 记录重试
  isRetryExhausted,  // () => boolean — 重试是否耗尽
  getRetryMessage,   // () => string — 重试耗尽提示
  updateSession,     // (data) => void — 更新会话数据
  generateReceiptNo, // () => string — 生成受理单号
} = useStateMachine()
```

**模块级共享响应式 session**：

```ts
export const session = reactive<SessionData>({
  businessType: '',
  cardNo: '',
  idNo: '',
  reason: '',
  receiptNo: '',
  isModifying: false,
})
```

所有调用方（`widgetConfigFor` / `watch` 回调 / `onBarInput`）读写同一个 session，保证数据一致性。

**状态流转图**：

```
                    ┌─────────────────────────────────────────────┐
                    │             welcome (欢迎页)                  │
                    │  Picker: [银行卡挂失] [存折挂失] [支票挂失]   │
                    │  InputMode: llm                              │
                    │  Intent: ask_card_no / unsupported           │
                    └──────────────┬──────────────────────────────┘
                                   │ 选择"银行卡挂失"
                                   ▼
                    ┌─────────────────────────────────────────────┐
                    │          ask_card_no (输入卡号)              │
                    │  Widget: Input (validate: cardNo)           │
                    │  InputMode: regex (/^\d{16,19}$/)           │
                    │  Retry: 2次 → unsupported                   │
                    └──────────────┬──────────────────────────────┘
                                   │ 卡号校验通过
                                   ▼
                    ┌─────────────────────────────────────────────┐
                    │          ask_id_no (输入身份证)              │
                    │  Widget: Input (validate: idNo)             │
                    │  InputMode: regex (/^\d{17}[\dXx]$/)        │
                    │  Retry: 2次 → unsupported                   │
                    └──────────────┬──────────────────────────────┘
                                   │ 身份证校验通过
                                   ▼
                    ┌─────────────────────────────────────────────┐
                    │           ask_reason (输入原因)               │
                    │  Widget: null（纯 LLM/输入框）                │
                    │  InputMode: passthrough (max 140字)          │
                    └──────────────┬──────────────────────────────┘
                                   │ 用户输入原因
                                   ▼
                    ┌─────────────────────────────────────────────┐
                    │      confirm (信息确认)                      │
                    │  Widget: Confirm                            │
                    │  展示脱敏后信息 + 3个操作按钮                 │
                    │  InputMode: llm                              │
                    │  Intent: done / modify_field / welcome       │
                    └─────┬──────────────┬────────────────────────┘
                          │              │
           ┌──────────────┘              └──────────────┐
           ▼                                            ▼
  ┌──────────────────┐                    ┌─────────────────────────┐
  │   done (完成)     │                    │  modify_field (选择修改)  │
  │  Widget: Text     │                    │  Picker: 卡号/身份证/原因  │
  │  受理单号+操作按钮  │                    │  InputMode: llm           │
  │  Intent: welcome  │                    │  Intent: ask_*           │
  │  / modify_field   │                    └──────────┬──────────────┘
  └──────────────────┘                               │
        │                                            │
        └────── 回到 welcome ──────┐                 │
                                   │                 │
                                   ▼                 ▼
                           ┌─────────────────────────────────────┐
                           │       unsupported (暂不支持)          │
                           │  Widget: Text + [返回首页]            │
                           └─────────────────────────────────────┘
```

**修改模式（isModifying）**：

当用户在 `confirm` 或 `done` 页选择"修改信息"时，`session.isModifying = true`。在此模式下：
- 跳转到 `ask_card_no` / `ask_id_no` / `ask_reason` 时，填完**单步**后直接回到 `confirm`，不走完整链路
- 判断逻辑：`if (session.isModifying && session.cardNo && session.idNo && session.reason) transition('confirm')`

**状态重试机制**：

每个状态有独立的 `retryCount`，`ask_card_no` 和 `ask_id_no` 配置了 `retry: { maxRetries: 2, onFail: 'unsupported' }`。重试耗尽时，SubtitleOverlay 显示预设的转人工提示，并跳转到 `unsupported` 状态。

---

## 七、配置文件说明

### 7.1 credentials.ts

```ts
export const SDK_GATEWAY = 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session'
```

仅定义 SDK 网关地址。与 lite-sdk-demo 不同，不在此文件中放置任何 API Key/Secret——所有敏感凭据通过环境变量或运行时注入提供。

### 7.2 sdk-defaults.ts

定义 SDK 的两种布局配置，用于 `initSDK(config.layout)` 和 `sdk.changeLayout()`：

**半身居中（half_center）**：

```ts
{
  container: { size: [1080, 1920] },   // 竖直 9:16 画布
  avatar: { v_align: 'center', h_align: 'middle', scale: 0.48, offset_x: 0, offset_y: 200 },
}
```

适用于欢迎页、原因输入等需要数字人全屏展示的场景。`offset_y: 200` 将数字人略微下移，在竖屏上半区居中。

**画中画（pip）**：

```ts
{
  container: { size: [1080, 1920] },
  avatar: { v_align: 'center', h_align: 'bottom', scale: 0.25, offset_x: 0, offset_y: 140 },
}
```

适用于信息输入步骤（卡号/身份证/确认），数字人缩小到右下角圆形浮窗，露出更多操作空间。`h_align: 'bottom'` 让脚底贴底，`offset_y: 140` 上推露出头部区域。

**布局缓存**：`getLayoutMap()` 返回 `{ half_center, pip }` 的冻结对象，在 App.vue 中缓存为 `layoutCache`，避免每次切换重复创建。

### 7.3 state-machine.ts（~240 行）

最核心的配置文件，定义了整个业务流程的所有状态。详见第六节状态机详解。

**`StateDef` 接口**：

```ts
interface StateDef {
  layout: 'half_center' | 'pip'         // AvatarCanvas 布局模式
  widgetType: 'picker' | 'input' | 'text' | 'confirm' | null  // Widget 类型
  widgetConfig: WidgetConfig | null      // Widget 配置数据
  subtitleText: string                   // SDK 播报的引导语
  progressIdx: number                    // ProgressBar 位置索引（-1=不显示）
  inputMode: InputMode                   // 输入处理模式
  regexPattern?: RegExp                  // regex 模式校验正则
  regexErrorMsg?: string                 // regex 校验失败提示
  llmIntents?: string[]                  // LLM 可用 intent 白名单
  nextState?: StateName | null           // 默认下一状态
  backState?: StateName                  // 返回上一步的状态
  retry?: RetryConfig                    // 重试配置（maxRetries / onFail / errorMsg）
  maxInputLength?: number                // 最大输入字符数
}
```

**四种输入模式**：

| 模式 | 用途 | 处理函数 |
|-|-|-|
| `llm` | 自由对话（welcome / confirm / modify_field / done） | `handleLLMInput()` → LLM 分析意图 |
| `regex` | 卡号/身份证校验 | `handleRegexInput()` → 正则匹配 |
| `passthrough` | 原因输入（无需校验） | `handlePassthroughInput()` → 直接通过 |
| `none` | 暂不支持（只读） | 不响应输入 |

**8 个状态配置表**：

| 状态名 | 布局 | Widget | InputMode | 下一步 | 上一步 |
|-|-|-|-|-|-|
| welcome | half_center | picker | llm | LLM 决定 | - |
| ask_card_no | pip | input (cardNo) | regex | ask_id_no | welcome |
| ask_id_no | pip | input (idNo) | regex | ask_reason | ask_card_no |
| ask_reason | half_center | null | passthrough | confirm | ask_id_no |
| modify_field | half_center | picker | llm | LLM 决定 | confirm |
| confirm | pip | confirm | llm | LLM 决定 | ask_reason |
| done | pip | text | llm | LLM 决定 | - |
| unsupported | half_center | text | none | - | welcome |

### 7.4 llm-prompts.ts（~110 行）

**`buildSystemPrompt(state, session)`**：根据当前状态和已收集数据，动态构建 LLM 系统提示词（约 30 行），包含：

- 角色定义："你是银行挂失导办智能助手"
- 当前进度摘要（已收集的卡号/身份证/原因/受理单号）
- 当前任务描述（每种状态有专属指令）
- 回复格式约束（严格 JSON：reply + intent + extractedData）
- 安全规则（寒暄 → intent: stay、确认页不允许提取数据、done 页只能 welcome/modify_field/stay）

**状态特定的 task 指令示例**：

```
confirm 状态：
⚠️ 关键规则：用户输入一串数字但没有说"修改/改/不对/错了/重填"等词时，
绝对不要提取为卡号或身份证号。只有用户明确说"确认"才返回 done。

done 状态：
⚠️ 你已经完成了挂失流程，用户只有三条路：
(1) 说"重新办理"→ welcome
(2) 说"修改信息"→ modify_field
(3) 说其他无关的话 → intent: stay
绝对不要返回 ask_card_no / ask_id_no / ask_reason。
```

**`parseLLMResponse(raw)`**：解析 LLM 返回的 JSON 字符串，容错提取第一个 `{...}` 片段：

```ts
// LLM 返回原始字符串
// {
//   "reply": "好的，请告诉我您的银行卡号",
//   "intent": "ask_card_no",
//   "extractedData": { "businessType": "银行卡挂失", "cardNo": null }
// }

// 解析逻辑
const start = raw.indexOf('{')
const end = raw.lastIndexOf('}')
const parsed = JSON.parse(raw.slice(start, end + 1))
return {
  reply: parsed.reply ?? '',
  intent: parsed.intent ?? 'stay',
  extractedData: { businessType, cardNo, idNo, reason } // 只取非 null 字段
}
```

---

## 八、环境变量说明

```env
# 数字人 SDK（必填：注册 https://xingyun3d.com → 应用管理 → 创建横屏应用）
VITE_SDK_APP_ID=              # 魔珐星云应用 ID
VITE_SDK_APP_SECRET=          # 魔珐星云应用密钥

# LLM 大模型（阿里百炼 DashScope：https://dashscope.aliyun.com → API-KEY 管理）
VITE_LLM_API_KEY=             # LLM API Key（必填，否则 LLM 模式不可用）
VITE_LLM_ENDPOINT=            # 兼容 OpenAI 的端点（默认 https://dashscope.aliyuncs.com/compatible-mode/v1）
VITE_LLM_MODEL=               # 模型名（默认 qwen-flash）

# ASR 语音识别（腾讯实时语音识别：https://console.cloud.tencent.com/casr）
VITE_ASR_APP_ID=              # 腾讯云 ASR App ID
VITE_ASR_SECRET_ID=           # 腾讯云 ASR Secret ID
VITE_ASR_SECRET_KEY=          # 腾讯云 ASR Secret Key

# 部署模式（可选，由部署脚本注入）
VITE_MODELSCOPE_PREVIEW=      # ModelScope 预览模式（true/false）
VITE_TRIAL_SECONDS=           # 试用时限（仅 ModelScope 模式，默认 300）
```

**运行时注入（ModelScope 场景）**：所有环境变量支持通过 `window.__ENV__` 运行时注入，优先级高于 `import.meta.env`。`utils/env.ts` 中的 lazy getter 确保注入时点不受启动顺序影响：

```ts
function env(key: string, fallback = ''): string {
  if (typeof window !== 'undefined' && window.__ENV__?.[key]) return window.__ENV__[key]
  return (import.meta.env[key] as string) || fallback
}

export const LLM_API_KEY = { get value() { return env('VITE_LLM_API_KEY') } }
export const LLM_ENDPOINT = { get value() { return env('VITE_LLM_ENDPOINT', 'https://dashscope.aliyuncs.com/compatible-mode/v1') } }
```

---

## 九、完整技术链路

```
┌────────────────┐    ┌──────────────────────┐    ┌───────────────────┐
│    ASR 识别     │    │     LLM 语义理解      │    │   SDK 数字人驱动   │
│  @xmov/asr     │    │  @xmov/llm            │    │  CDN XmovAvatar  │
│  腾讯云实时语音  │    │  阿里百炼 DashScope   │    │  3D渲染+TTS+口型  │
│                │    │  兼容 OpenAI 协议      │    │  动作+Widget 通信 │
│  onResult(text)│    │  chat.completions     │    │                  │
│  ↑ 语音输入     │    │  ↑ 文字输入            │    │  speak(ssml)     │
└────────────────┘    └──────────────────────┘    └───────────────────┘
        │                       │                         │
        └───────────┬───────────┘                         │
                    │                                     │
                    ▼                                     │
        ┌───────────────────────┐                          │
        │     App.vue 编排       │◄────────────────────────┘
        │                       │    onSpeakStateChange('speak_end')
        │  handleUserInput()    │    → onSpeakEnd() → transition()
        │                       │
        │  transition(next)     │──→ watch(currentState) → speakText()
        │                       │
        │  widgetConfigFor()    │──→ WidgetConfig → Widget 组件渲染
        └───────────────────────┘
```

**链路时序示例（用户说"我要挂失银行卡"）**：

1. 用户按下录音按钮 → ASR start（腾讯云 WebSocket 连接）
2. 用户说话 → ASR 实时转写（`onResult(text, isFinal)`）→ 输入框显示识别中文字
3. `isFinal=true` → `handleUserInput(text.trim(), 'voice')`
4. 当前状态 `welcome`，`inputMode === 'llm'` → `handleLLMInput(text)`
5. LLM 系统提示词 `buildSystemPrompt('welcome', session)` → 发送给 DashScope
6. LLM 返回 JSON → `parseLLMResponse()` → `{ intent: 'ask_card_no', reply: '好的，请告诉我您的银行卡号', extractedData: { businessType: '银行卡挂失' } }`
7. `handleLLMIntent()` → 校验 intent 在白名单 `['ask_card_no', 'unsupported']` → `updateSession({ businessType: '银行卡挂失' })` → `transition('ask_card_no')`
8. `watch(currentState)` → `speakText('请告诉我您的银行卡号（也可在输入框直接输入）')`
9. SDK 播报 → `onSpeakStateChange('speak_end')` → 无 pendingNextState，不跳转
10. Widget 层自动切换为 WidgetInput（input type），AvatarCanvas 切换到 pip 模式
11. 用户输入 "6222 0200 1234 5678" → `handleRegexInput()` → 去空格 → 匹配 `/^\d{16,23}$/` → `applyExtractedData('ask_card_no', '6222020012345678')` → `transition('ask_id_no')`

---

## 十、SDK 集成细节

### 10.1 初始化与销毁

```ts
async function handleInit() {
  const ok = await initSDK({
    containerId: '#avatar-canvas',
    appId: sdkAppId.value.trim(),
    appSecret: sdkAppSecret.value.trim(),
    gatewayServer: SDK_GATEWAY,
    proxyWidget: sdkStore.proxyWidget,         // SDK → App 数据通道
    config: { layout: layoutCache[state.value.layout] },
    onWidgetEvent: (data) => {                  // 字幕事件
      if (data?.type === 'subtitle_on') sdkStore.subtitle.value = data.text
      if (data?.type === 'subtitle_off') sdkStore.subtitle.value = ''
    },
    onSpeakStateChange: (state) => {            // 播报结束 → speak-then-transition
      if (state === 'speak_end') onSpeakEnd()
    },
    onStatusChange: (status) => {               // 网络状态
      if (status === 1) appStatus.value = 'network_error'
      else appStatus.value = 'normal'
    },
    onMessage: (data) => { showSdkError(data) },  // SDK 错误事件
  })
}
```

**SDK 销毁顺序**（`useSdkCore.destroy` 已封装）：
```ts
sdk.interrupt('user')   // 1. 先打断当前播报
sdk.offlineMode()       // 2. 再下线
sdk.destroy()           // 3. 最后销毁
```

### 10.2 字幕双重处理

bank-loss-report 通过两种路径获取字幕：

1. **onWidgetEvent 回调**：SDK 原生 subtitle_on / subtitle_off 事件 → 写入 `sdkStore.subtitle`
2. **MutationObserver**：隐藏 SDK 原生 `.avatar-sdk-widget-container` 容器（只保留含媒体元素的原生容器）

```
SDK 内置字幕（SDK 渲染的 DOM） → MutationObserver → display:none
SDK onWidgetEvent 回调         → useSDKStore.subtitle → SubtitleOverlay
```

### 10.3 三种部署模式

| 模式 | 检测条件 | 凭证来源 | 试用计时 |
|-|-|-|-|
| ModelScope 预览 | `window.__ENV__` 存在 | 环境变量运行时注入 | 有（`__ENV__.VITE_TRIAL_SECONDS`） |
| OSS 静态部署 | `PROD && !isModelScopeMode` | .env 构建时注入 | 无 |
| 本地开发 | `!PROD` | ConfigDrawer 手动输入 | 无 |

---

## 十一、全局调试 API

SDK 初始化完成后，以下变量挂载到 `window`：

```javascript
window.__xmovSdk            // SDK 实例
window.__sdkInitialized     // boolean
window.__youlingUi          // UI 控制 API（当前仅暴露 showCredModal）
```

**控制台快速测试**：

```javascript
// 播报引导语
__xmovSdk.speak('<speak>您好，请告诉我您的银行卡号</speak>', true, true)

// 直接跳转流程（App.vue 的 watch(currentState) 会自动播报对应引导语）
// 需要在 App.vue 作用域内手动设置 currentState，或通过 App.vue 暴露的方法
```
