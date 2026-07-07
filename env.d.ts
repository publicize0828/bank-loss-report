/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_SDK_APP_ID: string
  readonly VITE_SDK_APP_SECRET: string
  readonly VITE_LLM_API_KEY: string
  readonly VITE_LLM_ENDPOINT: string
  readonly VITE_LLM_MODEL: string
  readonly VITE_ASR_APP_ID: string
  readonly VITE_ASR_SECRET_ID: string
  readonly VITE_ASR_SECRET_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
