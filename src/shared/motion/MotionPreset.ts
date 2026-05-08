import type { NovaMotionOptions } from '@endge/nova'
import type { NovaUiMotionOptions, NovaUiMotionPreset } from '@/domain/types'

export const NOVA_UI_MOTION_DEFAULTS: Record<NovaUiMotionPreset, NovaMotionOptions> = {
  fadeIn: { duration: 180, easing: 'outCubic' },
  textColorPulse: { duration: 420, easing: 'inOutCubic' },
  expandCollapse: { duration: 220, easing: 'outCubic' },
  gapShift: { duration: 260, easing: 'inOutCubic' },
  responsiveReflow: { duration: 260, easing: 'outCubic' },
  hoverLine: { duration: 120, easing: 'outCubic' },
  dragOverlay: { duration: 120, easing: 'outCubic' },
  pressFeedback: { duration: 100, easing: 'outCubic' },
}

export function isNovaUiMotionEnabled(options?: NovaUiMotionOptions): boolean {
  return options?.motion !== false
}

export function resolveNovaUiMotionOptions(
  preset: NovaUiMotionPreset,
  options?: NovaMotionOptions,
): NovaMotionOptions {
  return {
    ...NOVA_UI_MOTION_DEFAULTS[preset],
    ...options,
  }
}
