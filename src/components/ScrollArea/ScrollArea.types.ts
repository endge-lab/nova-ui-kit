import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'
import type { ScrollbarProps, ScrollbarState } from '@/components/Scrollbar/Scrollbar.types'

export const SCROLL_AREA_SCHEMA_TYPE = 'nova-ui.scroll-area'

export type ScrollbarVisibility = 'auto' | 'always' | 'hidden'

export interface ScrollAreaProps extends NovaUiCommonProps {
  scrollX?: number
  scrollY?: number
  contentWidth?: number
  contentHeight?: number
  scrollbarVisibility?: ScrollbarVisibility
  scrollbar?: Partial<ScrollbarProps>
}

export interface ScrollAreaResolvedProps extends NovaUiCommonResolvedProps {
  scrollX: number
  scrollY: number
  contentWidth: number
  contentHeight: number
  scrollbarVisibility: ScrollbarVisibility
  scrollbar: Partial<ScrollbarProps>
}

export interface ScrollAreaChildSchema<TProps = Record<string, any>> extends NovaComponentSchema<TProps> {}

export interface ScrollAreaSchema extends NovaComponentSchema<ScrollAreaProps> {
  children?: Array<ScrollAreaChildSchema>
}

export interface ScrollAreaState {
  x: ScrollbarState
  y: ScrollbarState
}

export interface ScrollAreaApi {
  scrollTo: (x: number, y: number) => void
  scrollBy: (dx: number, dy: number) => void
  getScrollState: () => ScrollAreaState
  setChildren: (children: Array<ScrollAreaChildSchema>) => void
  setProps: (patch: ScrollAreaProps) => void
  getProps: () => Readonly<ScrollAreaResolvedProps>
}
