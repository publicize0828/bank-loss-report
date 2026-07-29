<template>
  <Transition name="subtitle-fade">
    <div v-if="displayText" class="subtitle-overlay" :class="{ pip: isPip, asr: isAsr }">
      <span class="subtitle-text">
        <svg v-if="isAsr" class="mic-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        {{ displayText }}
      </span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSDKStore } from '../composables/useSDKStore'

const props = defineProps<{ isPip?: boolean; asrText?: string }>()
const { subtitle } = useSDKStore()

const isAsr = computed(() => !!props.asrText)
const displayText = computed(() => props.asrText || subtitle.value)
</script>

<style scoped>
.subtitle-overlay {
  display: flex; justify-content: center;
  padding: 8px 16px;
  flex-shrink: 0;
}
.subtitle-overlay.pip {
  /* pip 模式下字幕保持原位 */
}
.subtitle-text {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; background: rgba(0,0,0,.55); backdrop-filter: blur(6px);
  border-radius: 8px; font-size: 15px; color: #fff; line-height: 1.6; text-align: center; max-width: 100%;
}
.mic-icon {
  flex-shrink: 0;
  opacity: .85;
}
.subtitle-fade-enter-active, .subtitle-fade-leave-active { transition: opacity .25s ease; }
.subtitle-fade-enter-from, .subtitle-fade-leave-to { opacity: 0; }
</style>
