import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// 全局错误兜底，防止未捕获异常导致白屏
app.config.errorHandler = (err, _instance, info) => {
  console.error('[Vue Error]', err, info)
  // 错误已记录，不让整个 app 崩溃白屏
}

app.mount('#app')
