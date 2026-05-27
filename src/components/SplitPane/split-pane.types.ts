import type { NovaComponentSchema, NovaElementSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'

export const SPLIT_PANE_SCHEMA_TYPE = 'nova-ui.split-pane'

export type SplitPaneDirection = 'horizontal' | 'vertical'
export type SplitPaneCollapsedPane = 'first' | 'second' | null
export type SplitPaneResizeMode = 'live' | 'lazy'

export interface SplitPaneResizerProps {
  color?: string
  lineWidth?: number
  hitSize?: number
  overlayColor?: string
}

export interface SplitPaneResizePayload {
  width?: number
  height?: number
  delta: number
  rect: { x: number; y: number; width: number; height: number }
  panes?: {
    first: { x: number; y: number; width: number; height: number }
    second: { x: number; y: number; width: number; height: number }
  }
  event: MouseEvent
}

export interface SplitPaneProps extends NovaUiCommonProps {
  direction?: SplitPaneDirection
  sizes?: [number, number]
  minSizes?: [number, number]
  maxSizes?: [number, number]
  resizeMode?: SplitPaneResizeMode
  resizer?: SplitPaneResizerProps
  collapsedPane?: SplitPaneCollapsedPane
  onResizeStart?: (payload: SplitPaneResizePayload) => void
  onResize?: (payload: SplitPaneResizePayload) => void
  onResizeEnd?: (payload: SplitPaneResizePayload) => void
}

export interface SplitPaneResolvedProps extends NovaUiCommonResolvedProps {
  direction: SplitPaneDirection
  sizes: [number, number]
  minSizes: [number, number]
  maxSizes: [number, number]
  resizeMode: SplitPaneResizeMode
  resizer: Required<SplitPaneResizerProps>
  collapsedPane: SplitPaneCollapsedPane
  onResizeStart?: (payload: SplitPaneResizePayload) => void
  onResize?: (payload: SplitPaneResizePayload) => void
  onResizeEnd?: (payload: SplitPaneResizePayload) => void
}

export interface SplitPaneChildSchema<TProps = Record<string, any>> extends NovaElementSchema<TProps> {}

export interface SplitPaneSchema extends NovaComponentSchema<SplitPaneProps> {
  children?: [SplitPaneChildSchema, SplitPaneChildSchema] | Array<SplitPaneChildSchema>
}

export interface SplitPaneApi {
  setSizes: (sizes: [number, number]) => void
  collapse: (pane: Exclude<SplitPaneCollapsedPane, null>) => void
  expand: () => void
  setProps: (patch: SplitPaneProps) => void
  relayout: () => void
  getProps: () => Readonly<SplitPaneResolvedProps>
}
