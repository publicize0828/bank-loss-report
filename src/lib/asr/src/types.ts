/** ASR 识别结果 */
export interface AsrResult {
  text: string
  isFinal: boolean
  timestamp: number
}

/** ASR 状态 */
export type AsrStatus = 'idle' | 'listening' | 'processing' | 'error'

/** ASR 服务配置 */
export interface AsrConfig {
  apiKey?: string
  apiSecret?: string
  endpoint?: string
  language?: string
  [key: string]: unknown
}

/** ASR 服务事件回调 */
export interface AsrCallbacks {
  onResult: (result: AsrResult) => void
  onStatusChange: (status: AsrStatus) => void
  onError: (error: Error) => void
}

/** ASR 服务抽象接口 */
export interface AsrService {
  /** 初始化 ASR 服务 */
  init(config: AsrConfig, callbacks: AsrCallbacks): Promise<void>

  /** 开始语音识别 */
  start(): Promise<void>

  /** 停止语音识别 */
  stop(): Promise<void>

  /** 获取当前状态 */
  getStatus(): AsrStatus

  /** 销毁 ASR 实例 */
  destroy(): void
}
