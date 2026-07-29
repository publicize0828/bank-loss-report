import { ref } from 'vue'
import type { ProxyWidgetHandlers } from '@xmov/sdk-core'

// 单例 store — proxyWidget 回调写入，SubtitleOverlay 读取
let _store: ReturnType<typeof _createStore> | null = null

function _createStore() {
  const subtitle = ref('')

  const proxyWidget: ProxyWidgetHandlers & Record<string, (data: any) => void> = {
    subtitle_on(d: any) {
      const text = d?.data?.text ?? d?.text ?? ''
      if (text) subtitle.value = text
    },
    subtitle_off() {
      subtitle.value = ''
    },
  }

  return { subtitle, proxyWidget }
}

export function useSDKStore() {
  if (!_store) _store = _createStore()
  return _store
}
