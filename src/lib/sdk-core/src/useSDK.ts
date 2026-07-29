import { ref, type Ref } from 'vue'
import type { XmovAvatar, XmovAvatarOptions, InitOptions } from './types'

export interface SdkLogger {
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

const noopLogger: SdkLogger = { log: () => {}, warn: () => {}, error: () => {} }

export interface PerformanceStats {
  fps: number
  driveResponseTime: number
}

export function useSDK(containerId: string, logger: SdkLogger = noopLogger) {
  let sdk: XmovAvatar | null = null

  const isInitialized: Ref<boolean> = ref(false)
  const isInitializing: Ref<boolean> = ref(false)
  const downloadProgress: Ref<number> = ref(0)
  const lastInitError: Ref<string> = ref('')
  const performanceStats: Ref<PerformanceStats> = ref({
    fps: 0,
    driveResponseTime: 0,
  })

  let speakSendTime = 0
  let fpsFrames = 0
  let fpsLastTime = performance.now()

  function trackFps() {
    fpsFrames++
    const now = performance.now()
    if (now - fpsLastTime >= 1000) {
      performanceStats.value.fps = fpsFrames
      fpsFrames = 0
      fpsLastTime = now
    }
    if (sdk) requestAnimationFrame(trackFps)
  }

  async function initSDK(options: XmovAvatarOptions & { init?: InitOptions }): Promise<boolean> {
    if (isInitializing.value) return false

    isInitializing.value = true
    downloadProgress.value = 0
    lastInitError.value = ''

    try {
      if (typeof window.XmovAvatar !== 'function') {
        throw new Error('SDK 脚本未加载，window.XmovAvatar 不存在')
      }

      sdk = new window.XmovAvatar({
        env: 'production',
        enableClientInterrupt: false,
        proxyWidget: {},
        config: {
          layout: {
            container: { size: [window.innerWidth, window.innerHeight] },
            avatar: { v_align: 'center', h_align: 'middle', scale: 0.3 },
          },
        },
        ...options,
        onSpeakStateChange: options.onSpeakStateChange ?? (() => {}),
        onVoiceStateChange: options.onVoiceStateChange ?? (() => {}),
        onWalkStateChange: options.onWalkStateChange ?? (() => {}),
        onStatusChange: options.onStatusChange ?? (() => {}),
        onStateRenderChange: options.onStateRenderChange ?? (() => {}),
        onStateChange: options.onStateChange ?? (() => {}),
        onNetworkInfo: options.onNetworkInfo ?? (() => {}),
        onMessage: options.onMessage ?? (() => {}),
      })

      await sdk.init({
        onDownloadProgress(p: number) {
          downloadProgress.value = p
          options.init?.onDownloadProgress?.(p)
        },
        initModel: options.init?.initModel ?? 'normal',
      })

      isInitialized.value = true
      window.__xmovSdk = sdk
      window.__sdkInitialized = true

      requestAnimationFrame(trackFps)
      logger.log('[useSDK] SDK initialized')
      return true
    } catch (err: any) {
      const msg = err?.message ?? String(err)
      lastInitError.value = msg
      logger.error('[useSDK] init failed:', msg)
      return false
    } finally {
      isInitializing.value = false
    }
  }

  function executeSsml(ssml: string) {
    if (!sdk || !isInitialized.value) {
      logger.warn('[useSDK] SDK not ready, cannot speak')
      return
    }

    sdk.interrupt('user')
    sdk.idle()

    const walkMatch = ssml.match(/<target>(\w+)<\/target>/)
    if (walkMatch) {
      logger.log(`[useSDK] walk target: ${walkMatch[1]}`)
    }
    const kaMatch = ssml.match(/<action_semantic>(\w+)<\/action_semantic>/)
    if (kaMatch) {
      logger.log(`[useSDK] action: ${kaMatch[1]}`)
    }
    const uiMatch = ssml.match(/<type>(show_\w+|bgm_\w+)<\/type>/)
    if (uiMatch) {
      logger.log(`[useSDK] widget: ${uiMatch[1]}`)
    }

    speakSendTime = performance.now()
    sdk.speak(ssml, true, true)
  }

  function interrupt() {
    if (!sdk) return
    sdk.interrupt('user')
  }

  function setVolume(vol: number) {
    if (!sdk) return
    sdk.setVolume(Math.max(0, Math.min(1, vol / 100)))
  }

  function destroy() {
    if (!sdk) return
    sdk.interrupt('user')
    sdk.offlineMode()
    sdk.destroy()
    sdk = null
    isInitialized.value = false
    window.__xmovSdk = null
    window.__sdkInitialized = false
  }

  return {
    initSDK,
    executeSsml,
    interrupt,
    setVolume,
    destroy,
    isInitialized,
    isInitializing,
    downloadProgress,
    lastInitError,
    performanceStats,
    getSdk: () => sdk,
  }
}
