<script setup lang="ts">
import { ref, computed, watch, onUnmounted, type Component } from 'vue'
import { useSDK as useSdkCore } from '@xmov/sdk-core'
import { useASR } from '@xmov/asr'
import { createLLMClient } from '@xmov/llm'
import { SDK_GATEWAY } from './config/credentials'
import { getLayoutMap } from './config/sdk-defaults'
import { STATES } from './config/state-machine'
import { buildSystemPrompt, parseLLMResponse } from './config/llm-prompts'
import { useSDKStore } from './composables/useSDKStore'
import { useStateMachine, session, type StateName } from './composables/useStateMachine'
import { formatSdkError } from '@xmov/sdk-core'
import { LLM_API_KEY, LLM_ENDPOINT, ASR_APP_ID, ASR_SECRET_ID, ASR_SECRET_KEY, SDK_APP_ID, SDK_APP_SECRET } from './utils/env'
import type { PickerOption, StateDef } from './config/state-machine'
import AvatarCanvas from './components/AvatarCanvas.vue'
import SubtitleOverlay from './components/SubtitleOverlay.vue'
import ProgressBar from './components/ProgressBar.vue'
import BottomControlBar from './components/BottomControlBar.vue'
import StatusBanner from './components/StatusBanner.vue'
import ConfigDrawer, { type ConfigValues } from './components/ConfigDrawer.vue'
import WidgetPicker from './components/widgets/WidgetPicker.vue'
import WidgetInput from './components/widgets/WidgetInput.vue'
import WidgetText from './components/widgets/WidgetText.vue'
import WidgetConfirm from './components/widgets/WidgetConfirm.vue'
import ErrorToast from './components/ErrorToast.vue'
import type { InputSource } from './types'
import type { SdkLogger } from '@xmov/sdk-core'

// ============ Widget 组件映射 ============
const widgetMap: Record<string, Component> = { picker: WidgetPicker, input: WidgetInput, text: WidgetText, confirm: WidgetConfirm }

// ============ 错误 Toast ============
const errorToast = ref<InstanceType<typeof ErrorToast>>()
const sdkErrorMsg = ref('')
function showSdkError(data: any) {
  const msg = formatSdkError(data)
  if (msg) { sdkErrorMsg.value = msg }
}

// ============ SDK Store ============
const sdkStore = useSDKStore()

// ============ 状态机 ============
const {
  currentState, state, appStatus, progressSteps,
  widgetConfigFor, transition, recordRetry, isRetryExhausted, getRetryMessage,
  updateSession, generateReceiptNo,
} = useStateMachine()

// speak-then-transition：等当前 speak 播完再跳转状态
const pendingNextState = ref<StateName | null>(null)

function onSpeakEnd() {
  if (pendingNextState.value) {
    const next = pendingNextState.value
    pendingNextState.value = null
    if (next === 'done') {
      updateSession({ receiptNo: generateReceiptNo() })
    }
    transition(next)
  }
}

// ============ SDK ============
const logger: SdkLogger = { log: () => {}, warn: () => {}, error: () => {} }
const {
  initSDK, destroy: sdkDestroy,
  isInitialized, isInitializing, downloadProgress, lastInitError,
  getSdk,
} = useSdkCore('#avatar-canvas', logger)

const sdkError = computed(() => lastInitError.value)
const configOpen = ref(false)
// 部署模式检测（源码发布版：无弹窗，走 ConfigDrawer 手动输入凭证）
const isModelScopePreview = false
const isModelScopeMode = false
const isOSSDeploy = false
const showCredOnStart = false

const sdkAppId = ref(SDK_APP_ID.value)
const sdkAppSecret = ref(SDK_APP_SECRET.value)
const sdkConfigured = computed(() => !!(sdkAppId.value.trim() && sdkAppSecret.value.trim()))

const configValues = computed<ConfigValues>(() => ({
  sdk: { appId: sdkAppId.value, appSecret: sdkAppSecret.value },
  status: { sdkConfigured: sdkConfigured.value, isInitialized: isInitialized.value, isInitializing: isInitializing.value, downloadProgress: downloadProgress.value },
}))

function applyConfigValues(v: ConfigValues) {
  sdkAppId.value = v.sdk.appId; sdkAppSecret.value = v.sdk.appSecret
}

// ============ ASR ============
const asr = useASR()
const asrAppId = ref(ASR_APP_ID.value)
const asrSecretId = ref(ASR_SECRET_ID.value)
const asrSecretKey = ref(ASR_SECRET_KEY.value)
const asrConfigured = computed(() => !!(asrAppId.value.trim() && asrSecretId.value.trim() && asrSecretKey.value.trim()))
const isRecording = ref(false)
const asrText = ref('')
let _asrTimer = 0

async function handleVoiceStart() {
  if (isRecording.value || !asrConfigured.value) return
  isRecording.value = true
  asrText.value = ''
  try {
    await asr.start({
      appId: asrAppId.value.trim(),
      secretId: asrSecretId.value.trim(),
      secretKey: asrSecretKey.value.trim(),
      onResult(text: string, isFinal: boolean) {
        if (isFinal && text.trim()) {
          asrText.value = text; handleUserInput(text.trim(), 'voice')
          // 最终识别结果多展示 2 秒再消失
          clearTimeout(_asrTimer); _asrTimer = window.setTimeout(() => { asrText.value = '' }, 2000)
        } else if (text.length >= 2) asrText.value = text
      },
    })
  } catch {
    isRecording.value = false
    appStatus.value = 'asr_unavailable'
  }
}
function handleVoiceEnd() {
  asr.stop()
  isRecording.value = false
  asrText.value = ''
}

// ============ LLM ============
const llmApiKey = ref(LLM_API_KEY.value)
const llmEndpoint = ref(LLM_ENDPOINT.value)
const llmConfigured = computed(() => !!llmApiKey.value.trim())
let _llmClient: ReturnType<typeof createLLMClient> | null = null
const conversationHistory = ref<Array<{ role: string; content: string }>>([])

// Key 变更时重置 client，确保新 Key 生效
watch(llmApiKey, () => { _llmClient = null })

function getLLMClient() {
  if (!_llmClient) {
    _llmClient = createLLMClient({
      apiKey: llmApiKey.value.trim(),
      endpoint: llmEndpoint.value.trim() || undefined,
    })
  }
  return _llmClient
}

// ============ 核心：用户输入收口 ============
function handleUserInput(text: string, source: InputSource, widgetIntent?: string) {
  const def = state.value

  // widget 自带 intent → 直接跳转（优先级最高，必须在 inputMode 检查之前）
  if (source === 'widget' && widgetIntent && STATES[widgetIntent as StateName]) {
    // 从非编辑步骤跳转到编辑步骤时，标记修改模式（改完直接回确认页）
    const jumpFrom = currentState.value
    if ((jumpFrom === 'modify_field' || jumpFrom === 'confirm' || jumpFrom === 'done') && widgetIntent.startsWith('ask_')) {
      session.isModifying = true
    }
    // widget 跳 done 时生成受理单号（LLM 路径在 handleLLMIntent 中生成，widget 路径需单独处理）
    if (widgetIntent === 'done') updateSession({ receiptNo: generateReceiptNo() })
    transition(widgetIntent as StateName)
    return
  }

  if (def.inputMode === 'none') return

  // LLM 模式下，文本匹配 picker/actions 关键词 → 快捷跳转（等效点击按钮）
  if (def.inputMode === 'llm' && source !== 'widget') {
    const sanitized = text.trim()
    const options: PickerOption[] = (def.widgetConfig as any)?.picker ?? (def.widgetConfig as any)?.actions ?? []
    if (options.length > 0) {
      const matched = options.find(
        p => sanitized.includes(p.value) || sanitized.includes(p.label)
      )
      if (matched && STATES[matched.intent as StateName]) {
        handleLLMIntent({ reply: '', intent: matched.intent })
        return
      }
    }
    // done 页兜底：用户说"挂失"（非"修改挂失"）→ 重新办理 → welcome
    if (currentState.value === 'done' && /^挂失$|^我要挂失$|^挂失银行卡$/.test(sanitized)) {
      handleLLMIntent({ reply: '', intent: 'welcome' })
      return
    }
  }

  // 按输入模式分发
  if (def.inputMode === 'regex') return handleRegexInput(def, text)
  if (def.inputMode === 'passthrough') return handlePassthroughInput(def, text)
  handleLLMInput(text)
}

function handleRegexInput(def: StateDef, text: string) {
  if (!def.regexPattern || !def.nextState) return
  // 去空格后再校验：cardNo/idNo 允许用户用空格分隔数字（如 5555 5555 5555 5555 55）
  const cleanText = text.replace(/\s/g, '')
  const match = cleanText.match(def.regexPattern)
  if (match) {
    applyExtractedData(currentState.value, match[0])
    // 修改模式：三项全填完了才回确认页，否则继续走流程（已填的步骤自然跳过）
    if (session.isModifying && session.cardNo && session.idNo && session.reason) {
      transition('confirm')
    } else {
      transition(def.nextState)
    }
  } else {
    recordRetry()
    if (isRetryExhausted()) {
      sdkStore.subtitle.value = getRetryMessage()
      if (def.retry) transition(def.retry.onFail)
    } else {
      sdkStore.subtitle.value = def.regexErrorMsg || '格式错误，请重新输入'
    }
  }
}

function handlePassthroughInput(def: StateDef, text: string) {
  if (!def.nextState) return
  applyExtractedData(currentState.value, text)
  // 修改模式：三项全填完了才回确认页
  if (session.isModifying && session.cardNo && session.idNo && session.reason) {
    transition('confirm')
  } else {
    transition(def.nextState)
  }
}

function trySpeak(text: string) {
  if (isInitialized.value) speakText(text)
}

async function handleLLMInput(text: string) {
  if (!llmConfigured.value) {
    trySpeak('请先配置 LLM API Key：复制 .env.example 为 .env，填写 VITE_LLM_API_KEY')
    return
  }

  const client = getLLMClient()
  const systemPrompt = buildSystemPrompt(currentState.value, session)
  conversationHistory.value.push({ role: 'user', content: text })
  // 保留最近 40 条消息，防止内存泄漏
  if (conversationHistory.value.length > 40) conversationHistory.value.splice(0, 2)

  try {
    const res = await client.chat(text, systemPrompt)
    const parsed = parseLLMResponse(res.content)
    if (parsed) {
      conversationHistory.value.push({ role: 'assistant', content: parsed.reply })
      // confirm 页禁止 LLM 通过 extractedData 覆盖已确认的数据
      if (parsed.extractedData) {
        if (currentState.value === 'confirm') {
          // 只允许通过 LLM 提取的数据在非 confirm 状态写入
        } else {
          updateSession(parsed.extractedData)
        }
      }
      handleLLMIntent(parsed)
    } else {
      trySpeak(res.content)
    }
  } catch {
    trySpeak('AI 服务暂时不可用，请稍后重试')
  }
}

function handleLLMIntent(parsed: { reply: string; intent: string }) {
  try {
    // 校验 intent 是否在白名单内
    const allowed = state.value.llmIntents
    if (allowed && !allowed.includes(parsed.intent) && parsed.intent !== 'stay') {
      trySpeak(parsed.reply) // 只说，不跳转
      return
    }

    if (parsed.intent === 'stay') {
      trySpeak(parsed.reply)
      return
    }
    // confirm 页兜底：ask_* intent 需用户明确表达了修改意图才跳转
    if (currentState.value === 'confirm' && parsed.intent.startsWith('ask_')) {
      const lastMsg = conversationHistory.value.filter(m => m.role === 'user').pop()?.content || ''
      if (!/[修改改不对错了重填重输]/.test(lastMsg)) {
        trySpeak(parsed.reply) // 只说，不跳转
        return
      }
    }
    if (parsed.intent === 'done') {
      updateSession({ receiptNo: generateReceiptNo() })
      transition('done')
      return
    }
    if (STATES[parsed.intent as StateName]) {
      const target = parsed.intent as StateName
      const jumpFrom = currentState.value
      if ((jumpFrom === 'modify_field' || jumpFrom === 'confirm' || jumpFrom === 'done') && target.startsWith('ask_')) {
        session.isModifying = true
      }
      // 直接跳到目标状态 —— watch(currentState) 会自动 speak 新状态的 subtitle
      transition(target)
    }
  } catch {
    trySpeak(parsed.reply) // 降级：只说，不跳转
  }
}

function applyExtractedData(stateName: StateName, value: string) {
  switch (stateName) {
    case 'ask_card_no': updateSession({ cardNo: value }); break
    case 'ask_id_no': updateSession({ idNo: value }); break
    case 'ask_reason': updateSession({ reason: value }); break
  }
}

// SDK speak：SDK 自带 speak 打断 speak，无需手动 interrupt
function speakText(text: string) {
  if (!text || !isInitialized.value) return
  const sdk = getSdk()
  if (!sdk) return
  sdk.speak(`<speak>${text}</speak>`, true, true)
}

// Widget 事件处理
function goBack() {
  const bs = state.value.backState
  if (bs) {
    if (session.isModifying) session.isModifying = false
    transition(bs)
  }
}
function onWidgetSelect(item: PickerOption) { handleUserInput(item.value, 'widget', item.intent) }
function onWidgetSubmit(value: string) { handleUserInput(value, 'widget') }
function onWidgetAction(item: PickerOption) { handleUserInput(item.value, 'widget', item.intent) }
function onTextInput(text: string) { handleUserInput(text, 'text-bar') }
function onBarInput(text: string) {
  // 底部输入框实时输入 → 同步到 session → WidgetInput 自动显示
  if (currentState.value === 'ask_card_no') session.cardNo = text
  else if (currentState.value === 'ask_id_no') session.idNo = text
  else if (currentState.value === 'ask_reason') session.reason = text
}

// ============ SDK 内置字幕隐藏 ============
let _subtitleObserver: MutationObserver | null = null

function hideSDKSubtitle() {
  // 遍历所有 SDK widget 容器，隐藏不含媒体元素的（即字幕容器）
  document.querySelectorAll('.avatar-sdk-widget-container').forEach((el) => {
    const hasMedia = (el as HTMLElement).querySelector('img, video, canvas, iframe')
    if (!hasMedia) (el as HTMLElement).style.display = 'none'
  })
}

function startSubtitleObserver() {
  stopSubtitleObserver()
  _subtitleObserver = new MutationObserver(() => hideSDKSubtitle())
  _subtitleObserver.observe(document.body, { childList: true, subtree: true })
}

function stopSubtitleObserver() {
  _subtitleObserver?.disconnect()
  _subtitleObserver = null
}

// ============ SDK 生命周期 ============
async function handleInit() {
  const ok = await initSDK({
    containerId: '#avatar-canvas',
    appId: sdkAppId.value.trim(),
    appSecret: sdkAppSecret.value.trim(),
    gatewayServer: SDK_GATEWAY,
    proxyWidget: sdkStore.proxyWidget,
    config: { layout: layoutCache[state.value.layout] },
    onWidgetEvent: (data: any) => {
      if (data?.type === 'subtitle_on' && data?.text) {
        sdkStore.subtitle.value = data.text
      }
      if (data?.type === 'subtitle_off') {
        sdkStore.subtitle.value = ''
      }
    },
    onSpeakStateChange: (state: string) => {
      if (state === 'speak_end') onSpeakEnd()
    },
    onStatusChange: (status: number) => {
      if (status === 1) appStatus.value = 'network_error'
      else { appStatus.value = 'normal'; sdkErrorMsg.value = '' }
    },
    onMessage: (data: any) => { showSdkError(data) },
  })
  if (ok) {
    hideSDKSubtitle()
    startSubtitleObserver()
  }
}
function handleDestroy() { stopSubtitleObserver(); sdkDestroy() }


// 布局配置缓存，避免每次切换重复创建
const layoutCache = getLayoutMap()

// 布局切换
watch(() => state.value.layout, (layout) => {
  const sdk = getSdk()
  if (isInitialized.value && sdk && layoutCache[layout]) {
    sdk.changeLayout(layoutCache[layout])
  }
})

// SDK 就绪时播报当前状态的欢迎语（延迟 500ms 等 SDK speak 就绪）
watch(isInitialized, (ready) => {
  if (ready) {
    const def = state.value
    if (def.subtitleText) {
      setTimeout(() => speakText(def.subtitleText), 500)
    }
  }
})

// 状态变化时播报引导语（字幕由 SDK subtitle_on 事件驱动）
watch(currentState, (newState) => {
  if (!isInitialized.value) return
  const def = STATES[newState]
  if (def.subtitleText) {
    const text = newState === 'done' && session.receiptNo
      ? `${def.subtitleText}。受理单号：${session.receiptNo.replace(/-/g, '')}，请记下您的受理单号`
      : def.subtitleText
    try { speakText(text) } catch {}
  }
})

// ============ Widget 配置 ============
const currentWidgetConfig = computed(() => widgetConfigFor(currentState.value))
const widgetComponent = computed(() => {
  if (!state.value.widgetType) return null
  return widgetMap[state.value.widgetType] ?? null
})


</script>

<template>
  <div class="app-root">

    <ErrorToast ref="errorToast" />
    <StatusBanner :status="appStatus" :sdk-error="sdkErrorMsg" />
    <AvatarCanvas
      :layout="state.layout"
      :is-ready="isInitialized"
      :is-loading="isInitializing"
      :progress="downloadProgress"
    />

    <!-- 下半屏区域 -->
    <div class="main-area">
      <!-- 上一步按钮 -->
      <div v-if="state.backState && widgetComponent" class="back-bar" :class="state.layout">
        <button class="back-btn" @click="goBack">← 上一步</button>
      </div>
      <!-- Widget 叠层 -->
      <div v-if="widgetComponent && currentWidgetConfig" class="widget-layer" :class="state.layout">
        <component
          :is="widgetComponent"
          :key="currentState"
          v-bind="currentWidgetConfig"
          @select="onWidgetSelect"
          @submit="onWidgetSubmit"

          @action="onWidgetAction"
        />
      </div>

      <SubtitleOverlay :is-pip="state.layout === 'pip'" :asr-text="asrText" />
    </div>

    <div class="bottom-area">
      <ProgressBar :steps="progressSteps" />
      <BottomControlBar
        :key="currentState"
        :disabled="!isInitialized || state.inputMode === 'none'"
        :recording="isRecording"
        :asr-disabled="!asrConfigured || appStatus === 'asr_unavailable'"
        :maxlength="state.maxInputLength"
        @ptt-start="handleVoiceStart"
        @ptt-end="handleVoiceEnd"
        @text="onTextInput"
        @input="onBarInput"
      />
    </div>

    <ConfigDrawer
      :is-model-scope="showCredOnStart"
      :open="configOpen"
      :values="configValues"
      :sdk-error="sdkError"
      @update:open="configOpen = $event"
      @update:values="applyConfigValues"
      @init="handleInit"
      @destroy="handleDestroy"
    />
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app {
  height: 100%;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #e8e8ed; color: #1a1a1a;
  display: flex; justify-content: center; align-items: center;
}
#app { width: 100%; max-width: 430px; }

/* SDK 字幕由 MutationObserver 隐藏，见 initSDK 回调 */
</style>

<style scoped>
.app-root {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, #fafafa 0%, #f0f0f5 100%);
  position: relative;
}

/* 下半屏：flex-1 自动填满，包含 widget + 字幕 */
.main-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.widget-layer {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 12px 16px;
  z-index: 10;
}
.widget-layer.pip {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: visible;
}
.widget-layer.pip > :deep(*) {
  width: 100%;
  max-width: 340px;
}

/* 上一步按钮 */
.back-bar {
  padding: 8px 16px 0;
  z-index: 11;
}
.back-bar.pip {
  display: flex;
  justify-content: center;
  padding: 12px 16px 0;
}
.back-bar.pip .back-btn {
  width: 100%;
  max-width: 340px;
}
.back-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
}

/* 底部控件：固定在底部 + 安全区适配 */
.bottom-area {
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom, 8px);
  z-index: 50;
}
</style>
