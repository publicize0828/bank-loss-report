const ENGINE_MODEL = '16k_zh'
const SIGN_EXPIRE_SEC = 60

export async function buildASRSignature(
  appId: string,
  secretId: string,
  secretKey: string,
  options?: { engineModel?: string; noiseThreshold?: number; vadSilenceMs?: number },
) {
  const timestamp = Math.floor(Date.now() / 1000)
  const voiceId = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`

  const params: Record<string, string> = {
    secretid: secretId,
    timestamp: String(timestamp),
    expired: String(timestamp + SIGN_EXPIRE_SEC),
    nonce: String(Math.floor(Math.random() * 100000)),
    voice_id: voiceId,
    engine_model_type: options?.engineModel ?? ENGINE_MODEL,
    voice_format: '1',
    needvad: '1',
    noise_threshold: String(options?.noiseThreshold ?? 0.2),
    vad_silence_time: String(options?.vadSilenceMs ?? 1000),
    filter_dirty: '1',
    filter_modal: '1',
    filter_punc: '1',
    convert_num_mode: '1',
    word_info: '1',
  }

  const qs = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
  const signStr = `asr.cloud.tencent.com/asr/v2/${appId}?${qs}`

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secretKey), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(signStr))
  const bytes = new Uint8Array(sig)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])

  const signature = encodeURIComponent(btoa(binary))
  return `wss://asr.cloud.tencent.com/asr/v2/${appId}?${qs}&signature=${signature}`
}
