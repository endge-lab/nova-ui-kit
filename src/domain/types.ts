import type { NovaNodeProperties } from '@endge/nova'
import type { Side } from '@endge/utils'

export interface ResizerOptions {
  color: string
  lineWidth: number
  x: number
  y: number
  width: number
  height: number
  blurSecondY: number
}

export interface LazyResizerOptions extends NovaNodeProperties {
  color?: string
  lineWidth?: number
  lineWidthHover?: number
  direction: Side
  activeOverlayColor?: string
  minSize: number
  maxSize: number
}
