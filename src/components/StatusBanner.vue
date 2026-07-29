<script setup lang="ts">
import type { AppStatus } from '../types'
defineProps<{ status: AppStatus; sdkError?: string }>()
</script>

<template>
  <Transition name="banner-slide">
    <div v-if="sdkError || status === 'network_error'" class="status-banner status-banner--error">
      {{ sdkError || '🔴 网络已断开，数字人进入离线模式' }}
    </div>
    <div v-else-if="status === 'asr_unavailable'" class="status-banner status-banner--warning">
      ⚠️ 语音服务不可用，请使用文字输入
    </div>
  </Transition>
</template>

<style scoped>
.status-banner { position: absolute; top: 0; left: 0; right: 0; z-index: 80; padding: 10px 16px; text-align: center; font-size: 13px; font-weight: 500; }
.status-banner--error { background: rgba(220,38,38,.9); color: #fff; }
.status-banner--warning { background: rgba(245,158,11,.9); color: #fff; }
.banner-slide-enter-active, .banner-slide-leave-active { transition: all .3s ease; }
.banner-slide-enter-from, .banner-slide-leave-to { transform: translateY(-100%); opacity: 0; }
</style>
