<script setup lang="ts">
import { ref, watch } from 'vue'
import { session } from '../../composables/useStateMachine'

const props = defineProps<{ title: string; placeholder: string; hint?: string; inputmode?: 'numeric' | 'text'; maxlength?: number; submitLabel?: string; validate?: 'cardNo' | 'idNo'; defaultValue?: string }>()
const emit = defineEmits<{ submit: [value: string] }>()
const inputValue = ref(props.defaultValue ?? '')

// store → input：外部 session 变化时同步到输入框
watch(() => props.defaultValue, (v) => {
  if (v !== undefined && v !== inputValue.value) inputValue.value = v
})

// input → store：用户输入实时写入模块级 session
function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  inputValue.value = v
  if (props.validate === 'cardNo') session.cardNo = v
  else if (props.validate === 'idNo') session.idNo = v
  else session.reason = v
}

const error = ref('')

function doSubmit() {
  error.value = ''
  const val = inputValue.value.trim()
  if (!val) return
  if (props.validate === 'cardNo') {
    const digits = val.replace(/\s/g, '')
    if (!/^\d{16,19}$/.test(digits)) { error.value = '卡号格式错误：应为 16-19 位数字'; return }
    emit('submit', digits)
  } else if (props.validate === 'idNo') {
    const digits = val.replace(/\s/g, '')
    if (!/^\d{17}[\dXx]$/.test(digits)) { error.value = '身份证号格式错误：应为 18 位'; return }
    emit('submit', digits)
  } else {
    emit('submit', val)
  }
}
</script>

<template>
  <div class="widget-card">
    <div class="widget-title">{{ title }}</div>
    <input :value="inputValue" @input="onInput" class="widget-input" :placeholder="placeholder" :inputmode="inputmode || 'text'" :maxlength="maxlength ?? 100" @keyup.enter="doSubmit" />
    <p v-if="error" class="widget-error">{{ error }}</p>
    <p v-else-if="hint" class="widget-hint">{{ hint }}</p>
    <button class="widget-submit" @click="doSubmit">{{ submitLabel || '提交' }}</button>
  </div>
</template>

<style scoped>
.widget-card { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 10px; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
.widget-title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.widget-input { width: 100%; padding: 14px 16px; border-radius: 10px; background: #f5f6fa; border: 1px solid #e8e8e8; color: #1a1a1a; font-size: 16px; outline: none; transition: border-color .2s; box-sizing: border-box; }
.widget-input:focus { border-color: #e5333b; background: #fff; }
.widget-input::placeholder { color: #bbb; }
.widget-hint { font-size: 12px; color: #999; margin-top: 6px; }
.widget-error { font-size: 12px; color: #ef4444; margin-top: 6px; }
.widget-submit { margin-top: 12px; width: 100%; padding: 12px; border: none; border-radius: 10px; cursor: pointer; background: #e5333b; color: #fff; font-size: 15px; font-weight: 600; -webkit-tap-highlight-color: transparent; transition: opacity .15s; }
.widget-submit:hover { opacity: .9; }
</style>
