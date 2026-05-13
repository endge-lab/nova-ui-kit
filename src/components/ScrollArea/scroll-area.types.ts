import type { NovaComponentSchema, NovaElementSchema, NovaTemplateSlots } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'
import type { ScrollbarProps, ScrollbarState } from '@/components/Scrollbar/scrollbar.types'
import type { NovaUiLayoutRect } from '@/shared/layout'

export const SCROLL_AREA_SCHEMA_TYPE = 'nova-ui.scroll-area'

export type ScrollbarVisibility = 'auto' | 'active' | 'always' | 'hidden'
export type ScrollAreaAxis = 'x' | 'y' | 'both'
export type ScrollAreaSlotName = 'scrollbar' | 'scrollbar-x' | 'scrollbar-y' | 'track' | 'thumb' | 'corner'

export interface ScrollAreaProps extends NovaUiCommonProps {
  scrollX?: number
  scrollY?: number
  contentWidth?: number
  contentHeight?: number
  scrollbarVisibility?: ScrollbarVisibility
  scrollbarIdleDelay?: number
  scrollbarFadeDuration?: number
  axis?: ScrollAreaAxis
  wheelMultiplier?: number
  scrollbar?: Partial<ScrollbarProps>
}

export interface ScrollAreaResolvedProps extends NovaUiCommonResolvedProps {
  scrollX: number
  scrollY: number
  contentWidth: number
  contentHeight: number
  scrollbarVisibility: ScrollbarVisibility
  scrollbarIdleDelay: number
  scrollbarFadeDuration: number
  axis: ScrollAreaAxis
  wheelMultiplier: number
  scrollbar: Partial<ScrollbarProps>
}

export interface ScrollAreaChildSchema<TProps = Record<string, any>> extends NovaElementSchema<TProps> {}

export interface ScrollAreaSchema extends NovaComponentSchema<ScrollAreaProps> {
  children?: Array<ScrollAreaChildSchema>
}

export interface ScrollAreaState {
  x: ScrollbarState
  y: ScrollbarState
}

export interface ScrollAreaVisualState {
  hovered: boolean
  scrolling: boolean
  dragging: boolean
  idle: boolean
  visible: boolean
  opacity: number
}

export interface ScrollAreaSlotContext {
  orientation: 'horizontal' | 'vertical'
  state: ScrollAreaVisualState
  metrics: ScrollbarState
  thumbRect: NovaUiLayoutRect
  trackRect: NovaUiLayoutRect
  actions: {
    scrollTo: (value: number) => void
    scrollBy: (delta: number) => void
  }
}

export interface ScrollAreaCornerSlotContext {
  state: ScrollAreaVisualState
  rect: NovaUiLayoutRect
}

export interface ScrollAreaApi {
  scrollTo: (x: number, y: number) => void
  scrollBy: (dx: number, dy: number) => void
  getScrollState: () => ScrollAreaState
  getScrollbarState: () => ScrollAreaVisualState
  setChildren: (children: Array<ScrollAreaChildSchema>) => void
  setSlots: (slots: NovaTemplateSlots) => void
  setProps: (patch: ScrollAreaProps) => void
  getProps: () => Readonly<ScrollAreaResolvedProps>
}
