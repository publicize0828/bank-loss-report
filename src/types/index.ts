// ========== 会话数据 ==========
export interface SessionData {
  businessType: string
  cardNo: string
  idNo: string
  reason: string
  receiptNo: string
  /** 当前是否处于"修改信息"模式——改完单项后直接回 confirm，不走完整链路 */
  isModifying: boolean
}

// ========== 应用状态 ==========
export type AppStatus = 'normal' | 'network_error' | 'asr_unavailable'

// ========== Widget 项（proxyWidget 渲染用） ==========
export interface WidgetItem {
  id: number
  type: 'image' | 'video' | 'link' | 'model3d' | 'text' | 'audio' | 'subtitle'
  data: Record<string, string>
}

// ========== 用户输入来源 ==========
export type InputSource = 'voice' | 'text-bar' | 'widget'
