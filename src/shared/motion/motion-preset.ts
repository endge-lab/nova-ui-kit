import type { NovaMotionOptions } from '@endge/nova'
import type {
  NovaUiMotionConfig,
  NovaUiMotionDeclaration,
  NovaUiMotionObject,
  NovaUiMotionOptions,
  NovaUiMotionPreset,
} from '@/domain/domain.types'

export const NOVA_UI_MOTION_DEFAULTS: Record<NovaUiMotionPreset, NovaMotionOptions> = {
  fadeIn: { duration: 180, easing: 'outCubic' },
  textColorPulse: { duration: 420, easing: 'inOutCubic' },
  expandCollapse: { duration: 220, easing: 'outCubic' },
  gapShift: { duration: 260, easing: 'inOutCubic' },
  responsiveReflow: { duration: 260, easing: 'outCubic' },
  hoverLine: { duration: 120, easing: 'outCubic' },
  dragOverlay: { duration: 120, easing: 'outCubic' },
  pressFeedback: { duration: 100, easing: 'outCubic' },
  radialReveal: { duration: 260, easing: 'outCubic' },
  dockMagnify: { duration: 180, easing: 'outCubic' },
  slideFade: { duration: 240, easing: 'outCubic' },
  maskFade: { duration: 180, easing: 'outCubic' },
  shimmer: { duration: 1200, easing: 'linear', repeat: Infinity },
  bounce: { duration: 520, easing: 'outCubic', repeat: Infinity, yoyo: true },
  spin: { duration: 1200, easing: 'linear', repeat: Infinity, overwrite: false },
  meterSweep: { duration: 520, easing: 'outCubic' },
  thumbSpring: { duration: 180, easing: 'outCubic' },
  activeIndicator: { duration: 220, easing: 'outCubic' },
  stepAdvance: { duration: 260, easing: 'outCubic' },
}

export function isNovaUiMotionEnabled(options?: NovaUiMotionOptions): boolean {
  return options?.motion !== false
}

export function readNovaUiMotionPreset(motion: NovaUiMotionDeclaration | undefined): NovaUiMotionPreset | null {
  if (motion === false || !motion || Array.isArray(motion)) return null
  if (typeof motion === 'string') return motion
  return motion.name ?? motion.preset
}

export function readNovaUiMotionConfig(motion: NovaUiMotionDeclaration | undefined): NovaUiMotionConfig {
  if (motion === false || !motion || typeof motion === 'string' || Array.isArray(motion)) return {}
  return motion
}

export function resolveNovaUiMotionOptions(
  preset: NovaUiMotionPreset,
  options?: NovaMotionOptions | NovaUiMotionConfig,
): NovaMotionOptions {
  return {
    ...NOVA_UI_MOTION_DEFAULTS[preset],
    ...normalizeNovaUiMotionOptions(options),
  }
}

export function resolveNovaUiMotionDeclaration(motion: NovaUiMotionDeclaration | undefined): {
  preset: NovaUiMotionPreset
  config: NovaUiMotionConfig
  options: NovaMotionOptions
} | null {
  const preset = readNovaUiMotionPreset(motion)
  if (!preset) return null
  const config = readNovaUiMotionConfig(motion)
  return {
    preset,
    config,
    options: resolveNovaUiMotionOptions(preset, config),
  }
}

export function resolveNovaUiMotionDeclarations(motion: NovaUiMotionDeclaration | undefined): Array<{
  preset: NovaUiMotionPreset
  config: NovaUiMotionConfig
  options: NovaMotionOptions
}> {
  if (motion === false || !motion) return []
  const items = Array.isArray(motion) ? motion : [motion]
  return items
    .map(item => resolveNovaUiMotionDeclaration(item))
    .filter((item): item is NonNullable<ReturnType<typeof resolveNovaUiMotionDeclaration>> => item !== null)
}

function normalizeNovaUiMotionOptions(options?: NovaMotionOptions | NovaUiMotionConfig): NovaMotionOptions {
  if (!options) return {}
  const { repeat, height: _height, angle: _angle, opacity: _opacity, background: _background, name: _name, preset: _preset, ...rest } = options as NovaUiMotionConfig & NovaUiMotionObject
  return {
    ...rest,
    repeat: repeat === 'infinite' ? Infinity : repeat,
  }
}
