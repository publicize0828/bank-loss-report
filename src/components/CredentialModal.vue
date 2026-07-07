<template>
  <Transition name="cred-fade">
    <div v-if="visible" class="cred-overlay">
      <div class="cred-modal">
        <!-- 头部 -->
        <div class="cred-header">
          <div class="cred-header-icon">{{ trialExpired ? '⏰' : '✨' }}</div>
          <h2 class="cred-title">{{ trialExpired ? '体验已结束' : '欢迎使用 魔珐数字人' }}</h2>
          <p class="cred-subtitle">{{ trialExpired ? `${trialDisplay}体验已结束，请注册获取你自己的凭证` : '请先配置应用凭证，连接你的专属具身交互智能体' }}</p>
        </div>

        <!-- 🎁 邀请码卡片 -->
        <div class="invite-card" @click="copyInvite">
          <div class="invite-card-badge">🎁 新人福利</div>
          <div class="invite-card-body">
            <div class="invite-card-label">注册邀请码</div>
            <div class="invite-card-code">
              <span v-for="(ch, i) in inviteCode.split('')" :key="i" class="code-char">{{ ch }}</span>
            </div>
            <div class="invite-card-hint">注册<a href="https://xingyun3d.com?utm_campaign=github&utm_source=shequ&utm_medium=&utm_term=&utm_content=" target="_blank" @click.stop>魔珐星云</a>时填入邀请码即可获得</div>
            <div class="invite-card-reward">
              <span class="reward-num">1000</span>
              <span class="reward-unit">积分</span>
            </div>
            <button class="invite-copy-btn" @click.stop="copyInvite">点击复制邀请码 <span class="copy-arrow">→</span></button>
          </div>
          <div v-if="copied" class="invite-card-copied">✓ 已复制到剪贴板</div>
        </div>

        <!-- 注册步骤 -->
        <div class="cred-steps-section">
          <h4>四步获取 APP ID 和 Secret</h4>
          <div class="cred-steps-grid">
            <div class="step-card">
              <span class="step-num">01</span>
              <span class="step-text">登录<br><a href="https://xingyun3d.com?utm_campaign=github&utm_source=shequ&utm_medium=&utm_term=&utm_content=" target="_blank">魔珐星云官网</a></span>
            </div>
            <div class="step-arrow">→</div>
            <div class="step-card">
              <span class="step-num">02</span>
              <span class="step-text">注册账号<br><span class="step-sub">填入上方邀请码</span></span>
            </div>
            <div class="step-arrow">→</div>
            <div class="step-card">
              <span class="step-num">03</span>
              <span class="step-text">应用管理<br><span class="step-sub">创建横屏应用</span></span>
            </div>
            <div class="step-arrow">→</div>
            <div class="step-card">
              <span class="step-num">04</span>
              <span class="step-text">复制凭证<br><span class="step-sub">APP ID / SECRET</span></span>
            </div>
          </div>
        </div>

        <!-- 试用提示 -->
        <div v-if="!noTrial" class="trial-notice">
          ⏱ 这是体验凭证，仅可体验 <b>{{ trialDisplay }}</b>，体验结束后请注册获取自己的 APP ID 和 Secret
        </div>

        <!-- 表单 -->
        <div class="cred-form">
          <div class="cred-field">
            <label>APP ID</label>
            <input v-model="appId" type="text" placeholder="请输入 APP ID" :disabled="connecting" />
          </div>
          <div class="cred-field">
            <label>APP SECRET</label>
            <input v-model="appSecret" type="password" placeholder="请输入 APP SECRET" :disabled="connecting" />
          </div>
          <p class="cred-env-hint">💡 LLM / ASR 凭证请复制 <code>.env.example</code> 为 <code>.env</code> 后填写</p>
        </div>

        <!-- 错误 -->
        <Transition name="err-fade">
          <p v-if="error" class="cred-error">{{ error }}</p>
        </Transition>

        <!-- 按钮 -->
        <div class="cred-actions">
          <button class="cred-btn cred-btn-cancel" :disabled="connecting" @click="$emit('close')">取消</button>
          <button class="cred-btn cred-btn-connect" :disabled="connecting || !appId.trim() || !appSecret.trim()" @click="onConnect">
            <span v-if="connecting" class="spinner"></span>
            {{ connecting ? '正在连接…' : '连接数字人' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{ visible: boolean; connecting: boolean; error: string; trialExpired?: boolean; trialSeconds?: number }>()
const noTrial = computed(() => (props.trialSeconds ?? 300) <= 0 || props.trialExpired)
const trialDisplay = computed(() => {
  const s = props.trialSeconds ?? 300
  if (s <= 0) return ''
  if (s >= 60 && s % 60 === 0) return `${s / 60} 分钟`
  if (s >= 60) return `${Math.floor(s / 60)} 分 ${s % 60} 秒`
  return `${s} 秒`
})
const emit = defineEmits<{ connect: [appId: string, appSecret: string]; close: [] }>()

declare global { interface Window { __ENV__?: Record<string, string> } }
function env(key: string, fallback = '') {
  return (typeof window !== 'undefined' && window.__ENV__?.[key]) || (import.meta as any).env[key] || fallback
}

const appId = ref(noTrial.value ? '' : env('VITE_SDK_APP_ID'))
const appSecret = ref(noTrial.value ? '' : env('VITE_SDK_APP_SECRET'))
const inviteCode = 'JMPADSWRTX'
const copied = ref(false)

watch(() => noTrial.value, (v) => {
  if (v) { appId.value = ''; appSecret.value = '' }
})

let copyTimer = 0
function copyInvite() {
  navigator.clipboard.writeText(inviteCode)
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => { copied.value = false }, 2000)
}

function onConnect() {
  if (!appId.value.trim() || !appSecret.value.trim()) return
  emit('connect', appId.value.trim(), appSecret.value.trim())
}
</script>

<style scoped>
.cred-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

.cred-modal {
  width: 560px; max-width: 100%; max-height: 92vh; overflow-y: auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.cred-header { text-align: center; padding: 32px 32px 0; }
.cred-header-icon { font-size: 40px; margin-bottom: 10px; }
.cred-title { font-size: 22px; font-weight: 800; color: #111; margin: 0 0 6px; letter-spacing: .5px; }
.cred-subtitle { font-size: 14px; color: #555; margin: 0; }

/* 邀请码卡片 */
.invite-card {
  margin: 24px 28px 0; border-radius: 12px; overflow: hidden;
  background: linear-gradient(135deg, #eff6ff 0%, #f0f7ff 100%);
  border: 1.5px solid #bfdbfe;
  cursor: pointer; transition: all .2s;
  position: relative;
}
.invite-card:hover { border-color: #93c5fd; box-shadow: 0 0 24px rgba(59, 130, 246, 0.08); }
.invite-card:active { transform: scale(0.995); }

.invite-card-badge {
  position: absolute; top: 0; right: 0;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff; font-size: 11px; font-weight: 700;
  padding: 5px 14px; border-radius: 0 10px 0 10px;
}
.invite-card-body { padding: 24px 28px 20px; text-align: center; }
.invite-card-label { font-size: 12px; color: #3b82f6; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }
.invite-card-code { display: flex; justify-content: center; gap: 4px; margin-bottom: 14px; }
.code-char {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 38px;
  background: #fff; border: 1px solid #93c5fd; border-radius: 5px;
  color: #1d4ed8; font-size: 16px; font-weight: 800;
  font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
}
.invite-card:hover .code-char { border-color: #3b82f6; background: #f8faff; }

.invite-card-reward { display: flex; align-items: baseline; justify-content: center; gap: 4px; margin-bottom: 6px; }
.reward-num {
  font-size: 38px; font-weight: 900; line-height: 1;
  background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.reward-unit { font-size: 15px; font-weight: 700; color: #b45309; }
.invite-card-hint { font-size: 14px; color: #444; margin-bottom: 10px; }
.invite-card-hint a { color: #2563eb; font-weight: 600; text-decoration: none; }
.invite-card-hint a:hover { text-decoration: underline; }
.invite-copy-btn { margin-top: 8px; padding: 6px 14px; font-size: 12px; font-weight: 600; font-family: inherit; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; transition: all .15s; }
.invite-copy-btn:hover { background: #2563eb; }
.copy-arrow { margin-left: 4px; font-weight: 700; }

.invite-card-copied {
  text-align: center; padding: 8px;
  background: #f0fdf4; color: #22c55e;
  font-size: 12px; font-weight: 700;
  animation: pulse-copied .4s ease;
}
@keyframes pulse-copied { 0% { opacity: 0; } 100% { opacity: 1; } }

/* 步骤 */
.cred-steps-section { margin: 22px 28px 0; }
.cred-steps-section h4 { font-size: 13px; font-weight: 700; color: #444; margin: 0 0 12px; text-align: center; }
.cred-steps-grid { display: flex; align-items: flex-start; justify-content: center; gap: 0; }
.step-card { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; max-width: 90px; text-align: center; }
.step-num {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  background: #eff6ff; border: 1px solid #93c5fd; border-radius: 50%;
  color: #2563eb; font-size: 12px; font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
}
.step-text { font-size: 12px; color: #444; line-height: 1.5; }
.step-text a { color: #2563eb; font-weight: 600; text-decoration: none; }
.step-text a:hover { text-decoration: underline; }
.step-sub { color: #777; font-size: 11px; }
.step-arrow { font-size: 14px; color: #999; padding: 8px 2px 0; flex-shrink: 0; }

/* 试用提示 */
.trial-notice {
  margin: 20px 28px 0; padding: 10px 14px;
  background: #fffbeb; border: 1px solid #fde68a;
  border-radius: 6px; color: #92400e;
  font-size: 13px; text-align: center; line-height: 1.6;
}
.trial-notice b { color: #b45309; }

/* 表单 */
.cred-form { margin: 22px 28px 0; display: flex; flex-direction: column; gap: 12px; }
.cred-field label { display: block; font-size: 12px; font-weight: 700; color: #444; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px; }
.cred-field input {
  width: 100%; box-sizing: border-box;
  padding: 10px 12px; font-size: 14px; font-family: inherit;
  background: #f7f8fa; border: 1px solid #d1d5db; border-radius: 6px;
  color: #111; outline: none; transition: all .15s;
}
.cred-field input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.06); }
.cred-field input::placeholder { color: #999; }
.cred-field input:disabled { opacity: .4; }

.cred-env-hint { margin: 6px 0 0; font-size: 12px; color: #888; text-align: center; }
.cred-env-hint code { background: #f0f0f5; padding: 1px 5px; border-radius: 3px; font-size: 11px; }
.cred-error {
  margin: 14px 28px 0; padding: 8px 12px;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; color: #dc2626; font-size: 12px; text-align: center;
}
.err-fade-enter-active, .err-fade-leave-active { transition: all .15s; }
.err-fade-enter-from, .err-fade-leave-to { opacity: 0; }

/* 按钮 */
.cred-actions { display: flex; gap: 10px; padding: 24px 28px 28px; }
.cred-btn { flex: 1; padding: 12px 20px; font-size: 14px; font-weight: 700; font-family: inherit; border-radius: 8px; cursor: pointer; transition: all .15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.cred-btn-cancel { background: #fff; border: 1px solid #d1d5db; color: #555; flex: 0 0 auto; }
.cred-btn-cancel:hover { background: #f7f8fa; color: #222; }
.cred-btn-cancel:disabled { opacity: .3; cursor: not-allowed; }
.cred-btn-connect { background: #3b82f6; border: none; color: #fff; }
.cred-btn-connect:hover:not(:disabled) { background: #2563eb; }
.cred-btn-connect:disabled { opacity: .4; cursor: not-allowed; }

.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff; border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.cred-fade-enter-active { transition: all .25s ease; }
.cred-fade-leave-active { transition: all .15s ease; }
.cred-fade-enter-from, .cred-fade-leave-to { opacity: 0; }
.cred-fade-enter-from .cred-modal { transform: translateY(12px) scale(0.98); }
</style>
