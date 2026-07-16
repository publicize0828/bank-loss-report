declare global {
  interface Window {
    XmovAvatar: typeof XmovAvatar
    __xmovSdk: XmovAvatar | null
    __sdkInitialized: boolean
  }
}

export interface XmovAvatarOptions {
  containerId: string
  appId: string
  appSecret: string
  gatewayServer: string
  enableClientInterrupt?: boolean
  env?: 'production' | 'develop'
  tag?: string
  enableLogger?: boolean
  enableDebugger?: boolean
  hardwareAcceleration?: 'prefer-hardware' | 'prefer-software'
  cacheServer?: string
  headers?: Record<string, string>
  config?: {
    layout?: LayoutConfig
  }
  onSpeakStateChange?: (state: 'speak_start' | 'speak_end', clientSpeakId?: string) => void
  onWalkStateChange?: (status: 'walk_start' | 'walking' | 'walk_end') => void
  onVoiceStateChange?: (state: 'start' | 'end', duration?: number) => void
  onStateRenderChange?: (state: string, duration?: number) => void
  onStatusChange?: (status: 0 | 1 | 2 | 3 | 4) => void
  onNetworkInfo?: (info: { rtt: number; downlink: number }) => void
  onMessage?: (message: { code: number; message: string; timestamp: number }) => void
  onStateChange?: (state: string) => void
  onWidgetEvent?: (data: { type: string; text?: string; [key: string]: any }) => void
  proxyWidget?: ProxyWidgetHandlers
}

export interface LayoutConfig {
  container: { size: [number, number] }
  avatar: {
    v_align: 'left' | 'center' | 'right'
    h_align: 'top' | 'middle' | 'bottom'
    scale: number | string
    offset_x?: number
    offset_y?: number
  }
}

export interface WalkConfig {
  min_x_offset: number
  max_x_offset: number
  walk_points: Record<string, number>
  init_point: number
}

export interface ProxyWidgetHandlers {
  show_image?: (data: { image: string; title: string }) => void
  show_video?: (data: { video: string; cover: string; title: string }) => void
  show_link?: (data: { url: string; title: string; description: string }) => void
  show_model3d?: (data: { model_url: string; title: string }) => void
  show_text?: (data: { title: string; text_content: string }) => void
  bgm_start?: (data: { src: string; bgm_loop: boolean; bgm_volume: number }) => void
}

export interface InitOptions {
  onDownloadProgress?: (progress: number) => void
  initModel?: 'normal' | 'invisible'
}

export declare class XmovAvatar {
  constructor(options: XmovAvatarOptions)

  init(opts?: InitOptions): Promise<void>
  speak(ssml: string, isStart: boolean, isEnd: boolean): void
  interrupt(source: 'user' | string): void
  idle(): void
  listen(): void
  think(): void
  setVolume(volume: number): void
  destroy(): void
  offlineMode(): void
  changeLayout(cfg: LayoutConfig): void
  changeWalkConfig(cfg: WalkConfig): void
  switchInvisibleMode(): void
  changeAvatarVisible(visible: boolean): void
}
