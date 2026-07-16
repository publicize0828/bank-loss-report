import type { WidgetItem } from '../types/widget'
// 注意：WidgetItem 仅作引用声明，实际使用在 proxyWidget store 中
import type { AppStatus } from '../types'

// ========== 状态定义 ==========
export type StateName = 'welcome' | 'ask_card_no' | 'ask_id_no' | 'ask_reason' | 'modify_field' | 'confirm' | 'done' | 'unsupported'

export interface RetryConfig {
  maxRetries: number
  onFail: StateName
  errorMsg: string
}

export type InputMode = 'llm' | 'regex' | 'passthrough' | 'none'

export interface StateDef {
  layout: 'half_center' | 'pip'
  widgetType: 'picker' | 'input' | 'text' | 'confirm' | null
  widgetConfig: WidgetConfig | null
  subtitleText: string
  progressIdx: number
  inputMode: InputMode
  /** regex 模式下的校验正则和失败提示 */
  regexPattern?: RegExp
  regexErrorMsg?: string
  /** llm 模式下可接受的 intent 值 */
  llmIntents?: string[]
  /** 通过后的下一状态，null 表示由 LLM intent 决定 */
  nextState?: StateName | null
  /** 返回上一步的状态，undefined 表示不可回退 */
  backState?: StateName
  retry?: RetryConfig
  /** 底部输入框最大字符数（仅 passthrough 模式使用） */
  maxInputLength?: number
}

export interface PickerOption {
  icon: string
  label: string
  value: string
  intent: string
}

export interface InputWidgetConfig {
  type: 'input'
  title: string
  placeholder: string
  hint?: string
  inputmode?: 'numeric' | 'text'
  maxlength?: number
  submitLabel?: string
  validate?: 'cardNo' | 'idNo'
  defaultValue?: string
}

export interface PickerWidgetConfig {
  type: 'picker'
  title: string
  items: PickerOption[]
}

export interface TextWidgetConfig {
  type: 'text'
  title: string
  content: string
  actions?: PickerOption[]
}

export interface ConfirmWidgetConfig {
  type: 'confirm'
  title: string
  fields: Array<{ key: string; val: string }>
  picker: PickerOption[]
}

export type WidgetConfig = InputWidgetConfig | PickerWidgetConfig | TextWidgetConfig | ConfirmWidgetConfig

// ========== 状态配置表 ==========
const FLOW_STEPS = ['欢迎', '卡号', '身份证', '原因', '确认', '完成']

export const STATES: Record<StateName, StateDef> = {
  welcome: {
    layout: 'half_center',
    widgetType: 'picker',
    widgetConfig: {
      type: 'picker',
      title: '请选择业务类型',
      items: [
        { icon: '💳', label: '银行卡挂失', value: '我要挂失银行卡', intent: 'ask_card_no' },
        { icon: '📒', label: '存折挂失', value: '存折丢了', intent: 'unsupported' },
        { icon: '📄', label: '支票挂失', value: '支票丢了', intent: 'unsupported' },
      ],
    },
    subtitleText: '您好，欢迎使用银行挂失服务。请问您要挂失什么？',
    progressIdx: 0,
    inputMode: 'llm',
    llmIntents: ['ask_card_no', 'unsupported'],
    nextState: null, // LLM intent 决定
  },

  ask_card_no: {
    layout: 'pip',
    widgetType: 'input',
    widgetConfig: {
      type: 'input',
      title: '银行卡号',
      placeholder: '请输入 16-19 位卡号',
      hint: '可使用空格分隔，如 6222 0200 1234 5678',
      inputmode: 'numeric',
      maxlength: 23,
      submitLabel: '提交卡号',
      validate: 'cardNo',
    },
    subtitleText: '请告诉我您的银行卡号（也可在输入框直接输入）',
    progressIdx: 1,
    inputMode: 'regex',
    regexPattern: /^[\d\s]{16,23}$/,
    regexErrorMsg: '卡号格式错误：应为 16-19 位数字',
    nextState: 'ask_id_no',
    backState: 'welcome',
    retry: { maxRetries: 2, onFail: 'unsupported', errorMsg: '卡号校验多次失败，已为您转接人工服务' },
  },

  ask_id_no: {
    layout: 'pip',
    widgetType: 'input',
    widgetConfig: {
      type: 'input',
      title: '身份证号',
      placeholder: '请输入 18 位身份证号码',
      hint: '💡 格式：XXXXXXXX XXXX XXXX X',
      inputmode: 'text',
      maxlength: 22,
      submitLabel: '提交身份证号',
      validate: 'idNo',
    },
    subtitleText: '请告诉我您的身份证号',
    progressIdx: 2,
    inputMode: 'regex',
    regexPattern: /^\d{17}[\dXx]$/,
    regexErrorMsg: '身份证号格式错误：应为 18 位',
    nextState: 'ask_reason',
    backState: 'ask_card_no',
    retry: { maxRetries: 2, onFail: 'unsupported', errorMsg: '身份证校验多次失败，已为您转接人工服务' },
  },

  ask_reason: {
    layout: 'half_center',
    widgetType: null,
    widgetConfig: null,
    subtitleText: '请简单说明挂失原因',
    progressIdx: 3,
    inputMode: 'passthrough',
    nextState: 'confirm',
    backState: 'ask_id_no',
    maxInputLength: 140,
  },

  // 中间态：确认页点"修改信息"后，询问要修改哪项
  modify_field: {
    layout: 'half_center',
    widgetType: 'picker',
    widgetConfig: {
      type: 'picker',
      title: '请选择要修改的信息',
      items: [
        { icon: '💳', label: '银行卡号', value: '修改卡号', intent: 'ask_card_no' },
        { icon: '🪪', label: '身份证号', value: '修改身份证', intent: 'ask_id_no' },
        { icon: '📝', label: '挂失原因', value: '修改原因', intent: 'ask_reason' },
      ],
    },
    subtitleText: '请问您要修改哪项信息？',
    progressIdx: 4,
    inputMode: 'llm',
    llmIntents: ['ask_card_no', 'ask_id_no', 'ask_reason'],
    nextState: null,
    backState: 'confirm',
  },

  confirm: {
    layout: 'pip',
    widgetType: 'confirm',
    widgetConfig: {
      type: 'confirm',
      title: '📋 挂失信息确认',
      fields: [], // 由运行时填充
      picker: [
        { icon: '✅', label: '确认提交', value: '确认', intent: 'done' },
        { icon: '✏️', label: '修改信息', value: '修改信息', intent: 'modify_field' },
        { icon: '❌', label: '取消挂失', value: '不挂了，取消', intent: 'welcome' },
      ],
    },
    subtitleText: '请确认以上信息',
    progressIdx: 4,
    inputMode: 'llm',
    llmIntents: ['done', 'welcome', 'ask_card_no', 'ask_id_no', 'ask_reason', 'modify_field'],
    nextState: null,
    backState: 'ask_reason',
  },

  done: {
    layout: 'pip',
    widgetType: 'text',
    widgetConfig: {
      type: 'text',
      title: '✅ 挂失受理成功',
      content: '', // 由运行时填充
      actions: [
        { icon: '📋', label: '办理其他业务', value: '办理其他业务', intent: 'welcome' },
        { icon: '✏️', label: '返回修改信息', value: '修改信息', intent: 'modify_field' },
      ],
    },
    subtitleText: '挂失已受理。如需其他帮助请随时呼叫',
    progressIdx: 5,
    inputMode: 'llm',
    llmIntents: ['welcome', 'modify_field'],
    nextState: null,
  },

  unsupported: {
    layout: 'half_center',
    widgetType: 'text',
    widgetConfig: {
      type: 'text',
      title: '⚠️ 暂不支持',
      content: '本次 demo 仅支持银行卡挂失。',
      actions: [
        { icon: '🔄', label: '返回首页重新办理', value: '返回', intent: 'welcome' },
      ],
    },
    subtitleText: '抱歉，本次 demo 仅支持银行卡挂失。已为您转接人工服务，请稍候。',
    progressIdx: -1,
    inputMode: 'none',
    nextState: null,
    backState: 'welcome',
  },
}

export { FLOW_STEPS }
