<script setup lang="ts">
import type { PickerOption } from '../../types/widget'
defineProps<{ title: string; items: PickerOption[] }>()
const emit = defineEmits<{ select: [item: PickerOption] }>()
</script>

<template>
  <div class="widget-card">
    <div class="widget-title">{{ title }}</div>
    <div class="picker-list">
      <button v-for="item in items" :key="item.value" class="picker-item" @click="emit('select', item)">
        <span class="picker-icon">{{ item.icon }}</span>
        <span class="picker-label">{{ item.label }}</span>
        <span class="picker-arrow">→</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.widget-card { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 10px; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
.widget-title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.picker-list { display: flex; flex-direction: column; gap: 8px; }
.picker-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 10px; background: #f8f9fc; border: 1px solid #eef0f5; color: #1a1a1a; font-size: 15px; cursor: pointer; transition: background .15s, border-color .15s; text-align: left; -webkit-tap-highlight-color: transparent; }
.picker-item:hover { background: #fff0f0; border-color: #fcc; }
.picker-icon { font-size: 20px; flex-shrink: 0; }
.picker-label { flex: 1; }
.picker-arrow { font-size: 14px; color: #ccc; flex-shrink: 0; }
</style>
