/** SDK 错误码中文映射 */
export const SDK_ERROR_MESSAGES: Record<number, string> = {
  // 初始化错误
  10001: '容器不存在，请刷新页面重试',
  10002: 'Socket 连接失败，请检查网络',
  10003: '会话启动失败，请稍后重试',
  10004: '会话停止异常',

  // 前端处理逻辑错误
  20001: '视频抽帧失败',
  20002: '视频处理器初始化失败',
  20003: '视频流处理异常',
  20004: '表情处理异常',
  20005: '身体渲染失败',
  20006: '面部渲染失败',

  // 资源管理错误
  30001: '背景图片加载失败',
  30002: '表情数据加载失败',
  30003: '身体数据无效',
  30004: '视频下载失败，请检查网络',
  30005: '身体数据已过期',

  // TTsa 数据错误
  40001: '音频解码失败',
  40002: '表情解码失败',
  40003: '视频解码失败',
  40004: '事件解码失败',
  40005: '数据格式异常',
  40006: '服务端异常，请稍后重试',
  40007: '音频数据已过期',

  // 网络错误
  50001: '网络已断开，进入离线模式',
  50002: '网络已恢复',
  50003: '正在重连…',
  50004: '网络连接中断',
}

/** 根据 SDK 错误对象生成展示信息：[错误码] SDK原始消息 */
export function formatSdkError(data: any): string | null {
  if (!data) return null
  if (typeof data === 'string') return data
  const code = data?.error_code ?? data?.code ?? data?.errCode ?? 0
  const reason = data?.error_reason ?? data?.message ?? JSON.stringify(data)
  return `[${code}] ${reason}`
}
