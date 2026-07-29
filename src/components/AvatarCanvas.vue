<template>
  <div class="canvas-wrapper" :class="{ 'pip-mode': layout === 'pip' }">
    <div id="avatar-canvas" class="canvas" />
    <div v-if="!isReady" class="canvas-overlay">
      <template v-if="isLoading">
        <div class="progress-ring">
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#e8e8e8" stroke-width="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="#e5333b" stroke-width="3"
              :stroke-dasharray="`${progress * 0.94} 94`"
              stroke-linecap="round" transform="rotate(-90 18 18)" />
          </svg>
          <span class="progress-num">{{ progress.toFixed(1) }}%</span>
        </div>
        <span class="progress-label">正在加载数字人资源...</span>
      </template>
      <template v-else>
        <span class="idle-hint">点击右下角 ⚙️ 配置并初始化数字人</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  layout: 'half_center' | 'pip'
  isReady: boolean
  isLoading: boolean
  progress: number
}>()
</script>

<style scoped>
.canvas-wrapper {
  width: 100%;
  aspect-ratio: 9 / 11;
  max-height: 48vh;
  overflow: hidden;
  background: #f5f5f5;
  flex-shrink: 0;
  position: relative;
}
/* PIP 模式：数字人缩小到右下角浮窗 */
.canvas-wrapper.pip-mode {
  position: absolute;
  bottom: var(--pip-bottom, 154px);
  right: 16px;
  width: 100px;
  height: 100px;
  aspect-ratio: unset;
  max-height: unset;
  border-radius: 50%;
  border: 2px solid rgba(229,51,59,.5);
  box-shadow: 0 4px 16px rgba(0,0,0,.2);
  z-index: 120;
  background: transparent;
  overflow: hidden;
}
.canvas { width: 100%; height: 100%; }
.canvas-wrapper.pip-mode .canvas {
  border-radius: 50%;
}

.pip-mask {
  display: none;
}

.canvas-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 20px; z-index: 15;
  background: rgba(255,255,255,.85);
}
.progress-ring { position: relative; width: 72px; height: 72px; }
.progress-ring svg { width: 100%; height: 100%; }
.progress-num {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; color: #e5333b;
  font-variant-numeric: tabular-nums;
}
.progress-label { font-size: 13px; color: #999; }
.idle-hint { font-size: 13px; color: #bbb; }
</style>
