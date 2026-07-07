import type { LlmConfig, ChatMessage, ChatResponse } from './types'

export function createLLMClient(config: LlmConfig) {
  const endpoint = (config.endpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '')
  const model = config.model || 'qwen-flash'
  let abortController: AbortController | null = null

  function setSystemPrompt(_prompt: string) {
    // stored by caller, passed via messages
  }

  async function chat(userMessage: string, systemPrompt?: string): Promise<ChatResponse> {
    abortController?.abort()
    abortController = new AbortController()

    const messages: ChatMessage[] = []
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
    messages.push({ role: 'user', content: userMessage })

    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ model, messages, ...config }),
      signal: abortController.signal,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`LLM 请求失败: ${res.status} ${err}`)
    }

    const data = await res.json()
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      model: data.model ?? model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
      } : undefined,
    }
  }

  function cancel() {
    abortController?.abort()
  }

  return { chat, cancel, setSystemPrompt }
}
