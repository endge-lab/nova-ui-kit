import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps, NovaUiOrientation } from '@/shared/component'

export const SCROLLBAR_SCHEMA_TYPE = 'nova-ui.scrollbar'

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
  onChange?: (value: number, event?: Event) => void
}

export interface ScrollbarResolvedProps extends NovaUiCommonResolvedProps {
  orientation: NovaUiOrientation
  value: number
  viewportSize: number
  contentSize: number
  thickness: number
  onChange?: (value: number, event?: Event) => void
}

export type ScrollbarSchema = NovaComponentSchema<ScrollbarProps>

export interface ScrollbarApi {
  setValue: (value: number, event?: Event) => void
  getScrollState: () => ScrollbarState
  setProps: (patch: ScrollbarProps) => void
  getProps: () => Readonly<ScrollbarResolvedProps>
}
