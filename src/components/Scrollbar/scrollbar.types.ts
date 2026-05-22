import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps, NovaUiOrientation } from '@/shared/component'

export const SCROLLBAR_SCHEMA_TYPE = 'nova-ui.scrollbar'

export type NovaScrollbarAxis = NovaUiOrientation
export type NovaScrollbarVisibility = 'always' | 'hover' | 'scroll' | 'auto' | 'active' | 'hidden'

export interface NovaScrollbarRect {
  x: number
  y: number
  width: number
  height: number
}

export interface NovaScrollbarVisualOptions {
  visibility?: NovaScrollbarVisibility
  thickness?: number
  minThumbSize?: number
  radius?: number
  trackColor?: string
  thumbColor?: string
  thumbHoverColor?: string
  borderColor?: string
  borderWidth?: number
  className?: string
}

export interface NovaScrollbarResolvedVisualOptions {
  visibility: NovaScrollbarVisibility
  thickness: number
  minThumbSize: number
  radius: number
  trackColor: string
  thumbColor: string
  thumbHoverColor: string
  borderColor?: string
  borderWidth: number
  className?: string
}

export interface NovaScrollbarGeometry {
  axis: NovaScrollbarAxis
  track: NovaScrollbarRect
  thumb: NovaScrollbarRect
  value: number
  max: number
  viewportSize: number
  contentSize: number
  visibleStart: number
  visibleEnd: number
  options: NovaScrollbarResolvedVisualOptions
}

export interface NovaScrollbarVisualState {
  alpha: number
  hoveredAxis: NovaScrollbarAxis | null
  draggingAxis: NovaScrollbarAxis | null
  pointerInside?: boolean
}

export interface NovaScrollbarGeometryInput {
  axis: NovaScrollbarAxis
  track: NovaScrollbarRect
  value?: number
  viewportSize?: number
  contentSize?: number
  options?: NovaScrollbarVisualOptions
}

export interface ScrollbarState {
  value: number
  max: number
  viewportSize: number
  contentSize: number
}

export interface ScrollbarProps extends NovaUiCommonProps {
  orientation?: NovaUiOrientation
  value?: number
  viewportSize?: number
  contentSize?: number
  thickness?: number
  minThumbSize?: number
  radius?: number
  onChange?: (value: number, event?: Event) => void
}

export interface ScrollbarResolvedProps extends NovaUiCommonResolvedProps {
  orientation: NovaUiOrientation
  value: number
  viewportSize: number
  contentSize: number
  thickness: number
  minThumbSize: number
  radius: number
  onChange?: (value: number, event?: Event) => void
}

export type ScrollbarSchema = NovaComponentSchema<ScrollbarProps>

export interface ScrollbarApi {
  setValue: (value: number, event?: Event) => void
  getScrollState: () => ScrollbarState
  setProps: (patch: ScrollbarProps) => void
  getProps: () => Readonly<ScrollbarResolvedProps>
}
