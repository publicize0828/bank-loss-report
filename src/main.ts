import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// 全局错误兜底，防止未捕获异常导致白屏
app.config.errorHandler = (err: unknown) => {
  if (import.meta.env.DEV) console.error('[Vue Error]', err)
}

app.mount('#app')
