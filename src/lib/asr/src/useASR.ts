import { ref, onUnmounted } from 'vue'
import type { AsrConfig } from './types'
import { buildASRSignature } from './signature'

const PCM_BUFFER_SIZE = 4096
const SAMPLE_RATE = 16000

function startAudioCapture(stream: MediaStream, ws: WebSocket) {
  const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE })
  const source = audioCtx.createMediaStreamSource(stream)
  const processor = audioCtx.createScriptProcessor(PCM_BUFFER_SIZE, 1, 1)

  let sentCount = 0

  processor.onaudioprocess = (e) => {
    if (ws.readyState !== WebSocket.OPEN) return
    const input = e.inputBuffer.getChannelData(0)
    const pcm = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
      pcm[i] = Math.max(-32768, Math.min(32767, input[i] * 32768))
    }
    ws.send(pcm.buffer)
    sentCount++


  }

  source.connect(processor)
  // 必须连输出 onaudioprocess 才触发；gain=0 静音防啸叫
  const silentGain = audioCtx.createGain()
  silentGain.gain.value = 0
  processor.connect(silentGain)
  silentGain.connect(audioCtx.destination)
  return { audioCtx, source, processor, silentGain }
}

export function useASR() {
  const isListening = ref(false)
  const partialText = ref('')
  const finalText = ref('')
  const error = ref('')

  let ws: WebSocket | null = null
  let mediaStream: MediaStream | null = null
  let audioCtx: AudioContext | null = null
  let processor: ScriptProcessorNode | null = null
  let source: MediaStreamAudioSourceNode | null = null

  // 断线重连
  const MAX_RECONNECT = 5
  let reconnectCount = 0
  let reconnectTimer = 0
  let cachedConfig: any = null

  async function connectWS(config: any): Promise<WebSocket> {
    const wsUrl = await buildASRSignature(config.appId, config.secretId, config.secretKey, {
      vadSilenceMs: config.vadSilenceMs ?? 400,
      noiseThreshold: config.noiseThreshold ?? 0.2,
    })
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(wsUrl)
      socket.binaryType = 'arraybuffer'
      socket.onopen = () => { reconnectCount = 0; resolve(socket) }
      socket.onerror = () => { reject(new Error('ASR WebSocket 连接失败')) }
      socket.onclose = () => {
        // 非主动关闭（stop() 会先置 ws=null），尝试重连
        if (ws && isListening.value && reconnectCount < MAX_RECONNECT) {
          const delay = Math.min(1000 * Math.pow(2, reconnectCount), 10000)
          reconnectCount++
          clearTimeout(reconnectTimer)
          reconnectTimer = window.setTimeout(async () => {
            if (!isListening.value) return
            try {
              ws = await connectWS(cachedConfig)
              // 恢复消息处理
              ws.onmessage = onMessage
            } catch {
              error.value = 'ASR 重连失败，请检查网络后重试'
              stop()
            }
          }, delay)
        }
        isListening.value = false
      }
    })
  }

  function onMessage(event: MessageEvent) {
    try {
      const msg = JSON.parse(event.data as string)
      if (msg.code !== 0) { error.value = msg.message || 'ASR 识别错误'; return }
      const text = msg.result?.voice_text_str ?? ''
      const sliceType = msg.result?.slice_type ?? 0
      if (sliceType === 2) {
        finalText.value += text
        if (text.trim().length >= 2) cachedConfig?.onResult?.(text, true)
      } else {
        partialText.value = text
        cachedConfig?.onResult?.(text, false)
      }
    } catch { /* 无法解析返回数据，忽略 */ }
  }

  async function start(config: AsrConfig & {
    appId: string
    secretId: string
    secretKey: string
    onResult?: (text: string, isFinal: boolean) => void
    vadSilenceMs?: number
    noiseThreshold?: number
  }) {
    if (isListening.value) return
    stop()

    error.value = ''
    partialText.value = ''
    finalText.value = ''
    cachedConfig = config

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      ws = await connectWS(config)
      ws.onmessage = onMessage
      isListening.value = true

      const capture = startAudioCapture(mediaStream, ws)
      audioCtx = capture.audioCtx; source = capture.source; processor = capture.processor
    } catch (e: any) {
      error.value = e?.message ?? String(e)
      stop()
    }
  }

  function stop() {
    isListening.value = false
    clearTimeout(reconnectTimer)
    reconnectCount = 0
    if (ws) { const s = ws; ws = null; s.close() }
    if (processor) { processor.disconnect(); processor = null }
    if (source) { source.disconnect(); source = null }
    if (audioCtx) { audioCtx.close(); audioCtx = null }
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null }
  }

  onUnmounted(() => stop())

  return { isListening, partialText, finalText, error, start, stop }
}
