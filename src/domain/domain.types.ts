import type { NovaMotionEasingName, NovaNodeProperties } from '@endge/nova'
import type { Side } from '@endge/utils'

export type NovaUiMotionPreset =
  | 'fadeIn'
  | 'textColorPulse'
  | 'expandCollapse'
  | 'gapShift'
  | 'responsiveReflow'
  | 'hoverLine'
  | 'dragOverlay'
  | 'pressFeedback'
  | 'radialReveal'
  | 'dockMagnify'
  | 'slideFade'
  | 'maskFade'
  | 'shimmer'
  | 'bounce'
  | 'spin'
  | 'meterSweep'
  | 'thumbSpring'
  | 'activeIndicator'
  | 'stepAdvance'

export interface NovaUiMotionConfig {
  duration?: number
  delay?: number
  easing?: NovaMotionEasingName
  repeat?: number | 'infinite'
  yoyo?: boolean
  overwrite?: boolean
  height?: number
  angle?: number
  opacity?: number
  background?: string
}

export type NovaUiMotionObject = NovaUiMotionConfig & (
  | { name: NovaUiMotionPreset; preset?: never }
  | { preset: NovaUiMotionPreset; name?: never }
)

export type NovaUiMotionItem = NovaUiMotionPreset | NovaUiMotionObject

export type NovaUiMotionDeclaration = false | NovaUiMotionItem | Array<NovaUiMotionItem>

export interface NovaUiMotionOptions {
  motion?: NovaUiMotionDeclaration
}

export interface NovaUiPartStyle {
  background?: string
  color?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  opacity?: number
}

export interface NovaUiPartStyleOptions {
  parts?: Record<string, NovaUiPartStyle>
}

export interface ResizerOptions extends NovaUiMotionOptions {
  color?: string
  lineWidth?: number
  x?: number
  y?: number
  width?: number
  height?: number
  blurSecondY?: number
  hitSize?: number
  hoverColor?: string
  activeColor?: string
  overlayColor?: string
  minSize?: number
  maxSize?: number
  disabled?: boolean
}

export interface LazyResizerOptions extends Partial<NovaNodeProperties>, NovaUiMotionOptions {
  color?: string
  lineWidth?: number
  lineWidthHover?: number
  direction: Side
  activeOverlayColor?: string
  minSize: number
  maxSize: number
}
