<script setup lang="ts">
export interface ConfigValues {
  sdk: { appId: string; appSecret: string }
  status: { sdkConfigured: boolean; isInitialized: boolean; isInitializing: boolean; downloadProgress: number }
}

defineProps<{ open: boolean; values: ConfigValues; sdkError: string; isModelScope: boolean }>()

const emit = defineEmits<{
  'update:open': [v: boolean]
  'update:values': [v: ConfigValues]
  init: []; destroy: []
}>()

function close() { emit('update:open', false) }
function showCredModal() { (window as any).__youlingUi?.showCredModal?.() }
</script>

<template>
  <Transition name="overlay">
    <div v-if="open" class="sheet-overlay" @click="close" />
  </Transition>
  <Transition name="sheet">
    <div v-if="open" class="bottom-sheet" @click.stop>
      <div class="sheet-handle-bar"><span class="sheet-handle" /></div>
      <div class="sheet-scroll">
        <h2 class="sheet-title">⚙️ 设置</h2>

        <template v-if="!isModelScope">
          <div class="config-section">
            <h3>数字人驱动 <span class="tag" :class="values.status.sdkConfigured ? 'tag-ok' : 'tag-no'">{{ values.status.sdkConfigured ? '已配置' : '未配置' }}</span></h3>
            <input :value="values.sdk.appId" type="text" placeholder="APP ID"
              @input="emit('update:values', { ...values, sdk: { ...values.sdk, appId: ($event.target as HTMLInputElement).value } })" />
            <input :value="values.sdk.appSecret" type="password" placeholder="APP SECRET"
              @input="emit('update:values', { ...values, sdk: { ...values.sdk, appSecret: ($event.target as HTMLInputElement).value } })" />

            <div class="cfg-help">
              <div class="help-title">📋 如何获取 APP ID 和 Secret？</div>
              <p>1. 访问 <a href="https://xingyun3d.com/?utm_campaign=&utm_source=modelscope&utm_medium=&utm_term=&utm_content=" target="_blank">魔珐星云官网</a> 注册账号</p>
              <p>2. 注册时填入邀请码 <b class="invite-code">JMPADSWRTX</b>（可获 1000 积分）</p>
              <p>3. 登录后创建横屏应用，复制 <b>APP ID</b> 和 <b>APP SECRET</b></p>
              <p>4. 粘贴到上方输入框，点击初始化</p>
            </div>
          </div>

          <div class="cfg-actions">
            <button v-if="!values.status.isInitialized" class="btn-init" :disabled="!values.status.sdkConfigured || values.status.isInitializing" @click="emit('init')">
              {{ values.status.isInitializing ? `加载中 ${values.status.downloadProgress.toFixed(1)}%` : '初始化数字人' }}
            </button>
            <button v-else class="btn-destroy" @click="emit('destroy')">断开连接</button>
            <p v-if="sdkError" class="init-error">{{ sdkError }}</p>
          </div>
        </template>
        <template v-else>
          <div class="config-section">
            <h3>数字人驱动</h3>
            <button class="btn-init" @click="showCredModal">
              ✨ 连接数字人
            </button>
          </div>
        </template>
      </div>
    </div>
  </Transition>
  <button v-if="!open" class="fab-toggle" @click="emit('update:open', true)">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  </button>
</template>

<style scoped>
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; -webkit-tap-highlight-color: transparent; }
.bottom-sheet { position: fixed; bottom: 0; left: 0; right: 0; z-index: 201; max-height: 75vh; background: #fff; border-radius: 20px 20px 0 0; display: flex; flex-direction: column; box-shadow: 0 -4px 24px rgba(0,0,0,0.1); }
.sheet-handle-bar { display: flex; justify-content: center; padding: 12px 0 4px; flex-shrink: 0; }
.sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: #d0d0d0; }
.sheet-scroll { padding: 8px 20px 28px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.sheet-title { font-size: 18px; color: #1a1a1a; margin-bottom: 16px; font-weight: 600; }

.overlay-enter-active, .overlay-leave-active { transition: opacity .25s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }
.sheet-enter-active, .sheet-leave-active { transition: transform .3s cubic-bezier(.32,.72,0,1); }
.sheet-enter-from, .sheet-leave-to { transform: translateY(100%); }

.fab-toggle { position: absolute; top: 12px; right: 12px; z-index: 50; width: 40px; height: 40px; border: none; border-radius: 50%; background: rgba(0,0,0,.5); backdrop-filter: blur(8px); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.15); transition: transform .2s, background .2s; -webkit-tap-highlight-color: transparent; }
.fab-toggle:active { transform: scale(.92); }

.config-section { margin-bottom: 16px; }
.config-section h3 { font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: #333; }
.config-section input { width: 100%; padding: 12px 14px; margin-bottom: 8px; background: #f5f6fa; border: 1px solid #e8e8e8; border-radius: 10px; color: #1a1a1a; font-size: 15px; outline: none; transition: border-color .2s; box-sizing: border-box; }
.config-section input:focus { border-color: #e5333b; background: #fff; }
.config-section input::placeholder { color: #bbb; }

.tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
.tag-ok { background: #e8f8ed; color: #22c55e; }
.tag-no { background: #fef0f0; color: #ef4444; }

.cfg-help { background: #f8f9fc; border-radius: 10px; padding: 14px; margin-top: 8px; font-size: 13px; color: #666; line-height: 1.8; }
.help-title { font-weight: 600; color: #333; margin-bottom: 6px; }
.cfg-help a { color: #e5333b; font-weight: 500; }
.invite-code { background: #ffeaea; color: #e5333b; padding: 2px 6px; border-radius: 4px; user-select: all; }

.cfg-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.btn-init { background: linear-gradient(135deg,#e5333b,#c02d34); color: #fff; border: none; padding: 14px 16px; font-weight: 600; font-size: 16px; border-radius: 12px; width: 100%; cursor: pointer; transition: opacity .15s; -webkit-tap-highlight-color: transparent; }
.btn-init:hover:not(:disabled) { opacity: .9; }
.btn-init:disabled { opacity: .35; cursor: not-allowed; }
.btn-destroy { background: transparent; border: 1px solid #e8e8e8; color: #ef4444; padding: 12px 16px; font-weight: 500; font-size: 15px; border-radius: 12px; width: 100%; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.btn-destroy:hover { background: #fef0f0; }
.init-error { font-size: 13px; color: #ef4444; text-align: center; line-height: 1.5; margin: 0; }
</style>
