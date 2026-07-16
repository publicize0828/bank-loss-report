import { ref } from 'vue'
import type { ProxyWidgetHandlers } from '@xmov/sdk-core'
import type { WidgetItem } from '../types'

// 单例 store — proxyWidget 回调写入，SubtitleOverlay 读取
let _store: ReturnType<typeof _createStore> | null = null

function _createStore() {
  const subtitle = ref('')
  const avatarEmotion = ref('')
  const widgetItems = ref<WidgetItem[]>([])
  let _nextId = 1

  function pushWidget(type: WidgetItem['type'], d: any) {
    widgetItems.value = [...widgetItems.value, { id: _nextId++, type, data: d?.data ?? d }]
  }

  const proxyWidget: ProxyWidgetHandlers & Record<string, (data: any) => void> = {
    subtitle(d: any) {
      const text = d?.data?.text ?? d?.text ?? ''
      if (text) subtitle.value = text
    },
    widget_text(d: any) {
      const text = d?.data?.text_content ?? d?.text_content ?? ''
      if (text) subtitle.value = text
    },
    emotion(d: any) {
      const emo = d?.data?.emotion ?? d?.emotion ?? ''
      if (emo) avatarEmotion.value = emo
    },
    show_image:   (d: any) => pushWidget('image', d),
    show_video:   (d: any) => pushWidget('video', d),
    show_link:    (d: any) => pushWidget('link', d),
    show_model3d: (d: any) => { widgetItems.value = widgetItems.value.filter(i => i.type !== 'model3d'); pushWidget('model3d', d) },
    show_text:    (d: any) => pushWidget('text', d),
    bgm_start:    (d: any) => pushWidget('audio', d),
    audio:        (d: any) => pushWidget('audio', d),
  }

  function clearWidgets() {
    widgetItems.value.length = 0
  }

  return { subtitle, avatarEmotion, widgetItems, proxyWidget, clearWidgets }
}

export function useSDKStore() {
  if (!_store) _store = _createStore()
  return _store
}
