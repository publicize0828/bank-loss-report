declare global { interface Window { __ENV__?: Record<string, string> } }

/** 优先 window.__ENV__（ModelScope 运行时注入），fallback 到 import.meta.env（本地开发）。
 *  用 getter 保证运行时注入的 window.__ENV__ 在 app 启动后也能被读取 */
function env(key: string, fallback = ''): string {
  if (typeof window !== 'undefined' && window.__ENV__?.[key]) return window.__ENV__[key]
  return (import.meta.env[key] as string) || fallback
}

// 所有值通过 lazy getter 暴露，确保 window.__ENV__ 注入时点不影响读取
export const LLM_API_KEY = { get value() { return env('VITE_LLM_API_KEY') } }
export const LLM_ENDPOINT = { get value() { return env('VITE_LLM_ENDPOINT', 'https://dashscope.aliyuncs.com/compatible-mode/v1') } }
export const LLM_MODEL = { get value() { return env('VITE_LLM_MODEL', 'qwen-flash') } }

export const ASR_APP_ID = { get value() { return env('VITE_ASR_APP_ID') } }
export const ASR_SECRET_ID = { get value() { return env('VITE_ASR_SECRET_ID') } }
export const ASR_SECRET_KEY = { get value() { return env('VITE_ASR_SECRET_KEY') } }

export const SDK_APP_ID = { get value() { return env('VITE_SDK_APP_ID') } }
export const SDK_APP_SECRET = { get value() { return env('VITE_SDK_APP_SECRET') } }
