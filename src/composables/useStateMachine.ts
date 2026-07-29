import { reactive, computed, ref } from 'vue'
import { STATES, FLOW_STEPS } from '../config/state-machine'
import type { StateName, StateDef, ConfirmWidgetConfig, WidgetConfig } from '../config/state-machine'
import type { SessionData, AppStatus } from '../types'

export type { StateName, StateDef }

// 模块级共享响应式 store —— 所有消费者读写同一个 session
export const session = reactive<SessionData>({
  businessType: '',
  cardNo: '',
  idNo: '',
  reason: '',
  receiptNo: '',
  isModifying: false,
})

export function useStateMachine() {
  const currentState = ref<StateName>('welcome')
  const appStatus = ref<AppStatus>('normal')

  // 每个状态的重试计数（纯数据，非响应式）
  const retryCount: Record<StateName, number> = {
    welcome: 0, ask_card_no: 0, ask_id_no: 0, ask_reason: 0, modify_field: 0, confirm: 0, done: 0, unsupported: 0,
  }

  const state = computed<StateDef>(() => STATES[currentState.value])

  const progressSteps = computed(() => {
    const s = state.value
    if (s.progressIdx < 0) return []
    return FLOW_STEPS.map((label, i) => ({
      label,
      active: i === s.progressIdx,
      done: i < s.progressIdx,
    }))
  })

  /** 获取运行时填充的 widgetConfig */
  function widgetConfigFor(stateName: StateName): WidgetConfig | null {
    const s = STATES[stateName]
    if (!s.widgetConfig) return null

    switch (s.widgetConfig.type) {
      case 'input':
        {
          const dv = stateName === 'ask_card_no' ? session.cardNo
            : stateName === 'ask_id_no' ? session.idNo
            : stateName === 'ask_reason' ? session.reason
            : ''
          return { ...s.widgetConfig, defaultValue: dv }
        }
      case 'confirm':
        return {
          ...s.widgetConfig,
          fields: [
            { key: '卡  号', val: maskCardNo(session.cardNo) },
            { key: '身份证', val: maskIdNo(session.idNo) },
            { key: '原  因', val: session.reason },
          ],
        } satisfies ConfirmWidgetConfig
      case 'text':
        if (stateName === 'done') {
          return {
            ...s.widgetConfig,
            content: `受理单号：${session.receiptNo}\n受理时间：${new Date().toLocaleString()}`,
          }
        }
        return s.widgetConfig
      default:
        return s.widgetConfig
    }
  }

  function transition(next: StateName) {
    retryCount[currentState.value] = 0
    // 回到欢迎页时清空会话数据
    if (next === 'welcome') {
      Object.assign(session, { businessType: '', cardNo: '', idNo: '', reason: '', receiptNo: '', isModifying: false })
      Object.keys(retryCount).forEach(k => retryCount[k as StateName] = 0)
    }
    // 回到确认页时退出修改模式
    if (next === 'confirm') session.isModifying = false
    currentState.value = next
  }

  function recordRetry() {
    retryCount[currentState.value]++
  }

  function isRetryExhausted(): boolean {
    const s = state.value
    if (!s.retry) return false
    return retryCount[currentState.value] >= s.retry.maxRetries
  }

  function getRetryMessage(): string {
    return state.value.retry?.errorMsg ?? ''
  }

  function updateSession(data: Partial<SessionData>) {
    Object.assign(session, data)
  }

  function generateReceiptNo(): string {
    const now = new Date()
    const y = now.getFullYear().toString().slice(2)
    const m = (now.getMonth() + 1).toString().padStart(2, '0')
    const d = now.getDate().toString().padStart(2, '0')
    const seq = (crypto.getRandomValues(new Uint32Array(1))[0] % 1000).toString().padStart(3, '0')
    return `BS-${y}${m}${d}-${seq}`
  }

  return {
    currentState,
    state,
    appStatus,
    progressSteps,
    widgetConfigFor,
    transition,
    recordRetry,
    isRetryExhausted,
    getRetryMessage,
    updateSession,
    generateReceiptNo,
  }
}

// ---- 脱敏工具 ----
function maskCardNo(raw: string): string {
  if (raw.length < 8) return raw
  return raw.slice(0, 4) + ' **** **** ' + raw.slice(-4)
}

function maskIdNo(raw: string): string {
  if (raw.length < 8) return raw
  return raw.slice(0, 4) + ' **** **** ' + raw.slice(-4)
}
