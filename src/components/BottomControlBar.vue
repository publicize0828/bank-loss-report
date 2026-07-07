<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ disabled: boolean; recording: boolean; asrDisabled: boolean }>()
const emit = defineEmits<{ voice: [text: string]; text: [text: string]; 'ptt-start': []; 'ptt-end': []; input: [text: string] }>()
const textInput = ref('')

function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  textInput.value = v
  emit('input', v)
}
function submitText() {
  const t = textInput.value.trim()
  if (!t) return
  emit('text', t)
  textInput.value = ''
}
function onKeyup(e: KeyboardEvent) { if (e.key === 'Enter') submitText() }
</script>

<template>
  <div class="control-bar">
    <button
      class="mic-btn" :class="{ recording, disabled: asrDisabled }"
      :disabled="disabled || asrDisabled"
      @mousedown="emit('ptt-start')" @mouseup="emit('ptt-end')" @mouseleave="recording ? emit('ptt-end') : undefined"
      @touchstart.prevent="emit('ptt-start')" @touchend.prevent="emit('ptt-end')"
    >
      <svg v-if="!recording" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      <span v-else class="pulse-dot" />
    </button>
    <div class="text-input-wrap">
      <input :value="textInput" @input="onInput" type="text" placeholder="输入文字..." :disabled="disabled" @keyup="onKeyup" />
      <button class="send-btn" @click="submitText" :disabled="disabled">发送</button>
    </div>
  </div>
</template>

<style scoped>
.control-bar { display: flex; gap: 8px; align-items: center; padding: 10px 16px 12px; background: #fff; flex-shrink: 0; border-top: 1px solid #f0f0f0; }

.mic-btn { width: 48px; height: 48px; border-radius: 50%; border: none; background: #e5333b; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: transform .15s, box-shadow .15s; -webkit-tap-highlight-color: transparent; touch-action: none; }
.mic-btn:active { transform: scale(1.15); box-shadow: 0 0 20px rgba(229,51,59,.4); }
.mic-btn.recording { background: #ef4444; box-shadow: 0 0 16px rgba(239,68,68,.4); animation: mic-pulse 1.2s ease-in-out infinite; }
.mic-btn.disabled { background: #ccc; cursor: not-allowed; box-shadow: none; }
@keyframes mic-pulse { 0%,100%{ box-shadow:0 0 0 0 rgba(239,68,68,.4) } 50%{ box-shadow:0 0 0 16px rgba(239,68,68,0) } }
.pulse-dot { width: 10px; height: 10px; border-radius: 50%; background: #fff; animation: pulse-dot .6s ease-in-out infinite; }
@keyframes pulse-dot { 0%,100%{ opacity:1 } 50%{ opacity:.3 } }

.text-input-wrap { flex: 1; height: 40px; border-radius: 20px; background: #f5f6fa; border: 1px solid #e8e8e8; display: flex; align-items: center; padding: 0 14px; gap: 8px; }
.text-input-wrap input { flex: 1; background: none; border: none; outline: none; color: #1a1a1a; font-size: 14px; min-width: 0; }
.text-input-wrap input::placeholder { color: #bbb; }
.text-input-wrap input:disabled { opacity: .4; }
.send-btn { background: #e5333b; border: none; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; flex-shrink: 0; padding: 6px 16px; border-radius: 16px; }
.send-btn:disabled { opacity: .3; cursor: not-allowed; }
</style>
