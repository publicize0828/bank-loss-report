<script setup lang="ts">
import { ref } from 'vue'

interface ToastItem {
  id: number
  message: string
}

const toasts = ref<ToastItem[]>([])
let _id = 0

function show(message: string) {
  const id = ++_id
  toasts.value = [...toasts.value.slice(-4), { id, message }]
  setTimeout(() => dismiss(id), 5000)
}

function dismiss(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

defineExpose({ show })
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="error-toast-container">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="error-toast-item"
        @click="dismiss(t.id)"
      >
        <span class="error-toast-icon">⚠</span>
        <span class="error-toast-text">{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.error-toast-container {
  position: fixed; top: 12px; left: 12px; right: 12px; z-index: 20000;
  display: flex; flex-direction: column; gap: 8px;
  pointer-events: none;
}
.error-toast-item {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 12px 14px; background: rgba(220,38,38,.92);
  backdrop-filter: blur(8px); border-radius: 12px;
  color: #fff; font-size: 13px; line-height: 1.4;
  pointer-events: auto; cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,.3);
  -webkit-tap-highlight-color: transparent;
  user-select: none; -webkit-user-select: none;
}
.error-toast-icon { flex-shrink: 0; font-size: 16px; }
.error-toast-text { word-break: break-all; }

/* TransitionGroup */
.toast-enter-active { transition: all .25s ease-out; }
.toast-leave-active { transition: all .2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateY(-16px); }
.toast-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
