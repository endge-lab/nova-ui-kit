import type { NovaNodeProperties } from '@endge/nova'
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
  | 'meterSweep'
  | 'thumbSpring'
  | 'activeIndicator'
  | 'stepAdvance'

export interface NovaUiMotionOptions {
  motion?: false | NovaUiMotionPreset
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
