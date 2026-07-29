<script setup lang="ts">
import type { PickerOption } from '../../types/widget'

defineProps<{
  title: string
  content: string
  actions?: PickerOption[]
}>()

const emit = defineEmits<{
  action: [item: PickerOption]
}>()
</script>

<template>
  <div class="widget-card">
    <div class="widget-title">{{ title }}</div>
    <div class="widget-body">{{ content }}</div>

    <!-- 可选操作按钮 -->
    <div v-if="actions?.length" class="action-list">
      <button
        v-for="item in actions"
        :key="item.value"
        class="action-btn"
        @click="emit('action', item)"
      >
        <span class="action-icon">{{ item.icon }}</span>
        <span class="action-label">{{ item.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.widget-card {
  background: #fff; border-radius: 16px; padding: 24px 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,.08);
  text-align: center;
}
.widget-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px; }
.widget-body { font-size: 14px; color: #666; line-height: 1.8; white-space: pre-line; }

.action-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f8f9fc;
  border: 1px solid #eef0f5;
  color: #1a1a1a;
  font-size: 14px;
  cursor: pointer;
  transition: background .15s;
  -webkit-tap-highlight-color: transparent;
}
.action-btn:hover { background: #fff0f0; border-color: #fcc; }
.action-icon { font-size: 18px; flex-shrink: 0; }
.action-label { flex: 1; text-align: left; }
</style>
