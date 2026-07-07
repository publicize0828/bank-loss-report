# 魔珐数字人银行挂失 Demo

基于魔珐有灵（XmovAvatar）SDK 的业务流程 Demo，模拟银行挂失业务的 7 步智能导办流程。

## 体验地址

👉 [https://media.youyan.xyz/bank-loss-report/index.html](https://media.youyan.xyz/bank-loss-report/index.html)

## 功能

- 📋 7 步业务状态机：挂失受理 → 身份验证 → 信息确认 → 结果通知
- 🤖 LLM 意图识别：自动理解和引导用户操作
- 🎤 语音 + 文字 + 点选：三种输入通道
- 🎭 双布局：半身居中 / PIP 画中画
- 📱 Widget 组件：Picker / Input / Text / Confirm
- 📊 进度条：实时展示办理进度

## 本地开发

```bash
pnpm install
pnpm dev
```

## 获取凭证

1. [魔珐星云官网](https://xingyun3d.com?utm_campaign=github&utm_source=shequ&utm_medium=&utm_term=&utm_content=) 注册
2. 邀请码 **JMPADSWRTX**（1000 积分）
3. 创建横屏应用 → 复制 APP ID / SECRET

## 技术栈

Vue 3 + TypeScript + Vite + XmovAvatar SDK + OpenAI SDK

## 技术手册

详见 [TECH.md](TECH.md)
