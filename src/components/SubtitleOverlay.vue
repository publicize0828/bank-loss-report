<template>
  <Transition name="subtitle-fade">
    <div v-if="text" class="subtitle-overlay" :class="{ pip: isPip }">
      <span class="subtitle-text">{{ text }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useSDKStore } from '../composables/useSDKStore'
const { subtitle } = useSDKStore()
const text = subtitle
defineProps<{ isPip?: boolean }>()
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
  padding: 6px 14px; background: rgba(0,0,0,.55); backdrop-filter: blur(6px);
  border-radius: 8px; font-size: 15px; color: #fff; line-height: 1.6; text-align: center; max-width: 100%;
}
.subtitle-fade-enter-active, .subtitle-fade-leave-active { transition: opacity .25s ease; }
.subtitle-fade-enter-from, .subtitle-fade-leave-to { opacity: 0; }
</style>
