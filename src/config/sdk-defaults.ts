import type { LayoutConfig } from '@xmov/sdk-core'

/** 半身居中：数字人在上半屏垂直居中 */
export function getLayoutHalfCenter(): LayoutConfig {
  return {
    container: { size: [1080, 1920] },
    avatar: { v_align: 'center', h_align: 'middle', scale: 0.48, offset_x: 0, offset_y: 200 },
  }
}

/** 画中画：数字人缩小到右下角，offset_y 上推露出头部 */
export function getLayoutPip(): LayoutConfig {
  return {
    container: { size: [1080, 1920] },
    // h_align=bottom → 脚底贴底，offset_y 正值上移露出头部区域
    avatar: { v_align: 'center', h_align: 'bottom', scale: 0.25, offset_x: 0, offset_y: 140 },
  }
}

export function getLayoutMap() {
  return {
    half_center: getLayoutHalfCenter(),
    pip: getLayoutPip(),
  } as const
}
