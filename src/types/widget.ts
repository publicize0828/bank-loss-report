// 从 state-machine 重导出 widget 相关类型
export type {
  PickerOption,
  InputWidgetConfig,
  TextWidgetConfig,
  ConfirmWidgetConfig,
  WidgetConfig,
} from '../config/state-machine'

// proxyWidget 渲染用的 widget 项
export interface WidgetItem {
  id: number
  type: 'image' | 'video' | 'link' | 'model3d' | 'text' | 'audio' | 'subtitle'
  data: Record<string, string>
}
