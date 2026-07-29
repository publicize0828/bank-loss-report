/** LLM 消息角色 */
export type MessageRole = 'system' | 'user' | 'assistant'

/** LLM 对话消息 */
export interface ChatMessage {
  role: MessageRole
  content: string
}

/** LLM 请求参数（兼容 OpenAI Chat Completions 协议） */
export interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  [key: string]: unknown
}

/** LLM 非流式响应 */
export interface ChatResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

/** LLM 流式响应 chunk */
export interface ChatStreamChunk {
  content: string
  isDone: boolean
}

/** LLM 服务配置 */
export interface LlmConfig {
  apiKey: string
  endpoint?: string
  model?: string
  temperature?: number
  maxTokens?: number
  [key: string]: unknown
}

/** LLM 状态 */
export type LlmStatus = 'idle' | 'thinking' | 'streaming' | 'done' | 'error'

/** LLM 事件回调 */
export interface LlmCallbacks {
  onStatusChange: (status: LlmStatus) => void
  onError: (error: Error) => void
}

/** LLM 服务抽象接口 */
export interface LlmService {
  /** 初始化 LLM 服务 */
  init(config: LlmConfig, callbacks: LlmCallbacks): void

  /** 设置 System Prompt（更新后下一次请求生效） */
  setSystemPrompt(prompt: string): void

  /** 非流式对话 */
  chat(userMessage: string): Promise<ChatResponse>

  /** 流式对话，onChunk 每次收到增量文本时回调 */
  chatStream(userMessage: string, onChunk: (chunk: ChatStreamChunk) => void): Promise<void>

  /** 取消当前请求 */
  cancel(): void

  /** 获取当前状态 */
  getStatus(): LlmStatus
}
