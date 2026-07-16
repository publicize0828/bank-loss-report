<template>
  <div v-if="steps.length" class="progress-bar">
    <div class="progress-dots">
      <template v-for="(step, i) in steps" :key="step.label">
        <span class="step-dot" :class="{ active: step.active, done: step.done }" />
        <span v-if="i < steps.length - 1" class="step-line" :class="{ done: step.done }" />
      </template>
    </div>
    <div class="step-labels">
      <span v-for="(step, i) in steps" :key="i" class="step-label" :class="{ active: step.active, done: step.done }">{{ step.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ steps: Array<{ label: string; active: boolean; done: boolean }> }>()
</script>

<style scoped>
.progress-bar { padding: 6px 16px 4px; flex-shrink: 0; }
.progress-dots { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 4px; }
.step-dot { width: 8px; height: 8px; border-radius: 50%; background: #d0d0d0; flex-shrink: 0; transition: background .3s; }
.step-dot.active { background: #e5333b; box-shadow: 0 0 6px rgba(229,51,59,.35); }
.step-dot.done { background: #22c55e; }
.step-line { width: 28px; height: 2px; background: #e8e8e8; flex-shrink: 0; transition: background .3s; }
.step-line.done { background: #22c55e; }
.step-labels { display: flex; justify-content: space-between; padding: 0 4px; }
.step-label { font-size: 10px; color: #ccc; transition: color .3s; }
.step-label.active { color: #e5333b; font-weight: 600; }
.step-label.done { color: #22c55e; }
</style>
