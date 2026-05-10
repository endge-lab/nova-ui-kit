import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'

export const SPLIT_PANE_SCHEMA_TYPE = 'nova-ui.split-pane'

export type SplitPaneDirection = 'horizontal' | 'vertical'
export type SplitPaneCollapsedPane = 'first' | 'second' | null

export interface SplitPaneResizerProps {
  color?: string
  lineWidth?: number
  hitSize?: number
  overlayColor?: string
}

export interface SplitPaneProps extends NovaUiCommonProps {
  direction?: SplitPaneDirection
  sizes?: [number, number]
  minSizes?: [number, number]
  maxSizes?: [number, number]
  resizer?: SplitPaneResizerProps
  collapsedPane?: SplitPaneCollapsedPane
}

export interface SplitPaneResolvedProps extends NovaUiCommonResolvedProps {
  direction: SplitPaneDirection
  sizes: [number, number]
  minSizes: [number, number]
  maxSizes: [number, number]
  resizer: Required<SplitPaneResizerProps>
  collapsedPane: SplitPaneCollapsedPane
}

export interface SplitPaneChildSchema<TProps = Record<string, any>> extends NovaComponentSchema<TProps> {}

export interface SplitPaneSchema extends NovaComponentSchema<SplitPaneProps> {
  children?: [SplitPaneChildSchema, SplitPaneChildSchema] | Array<SplitPaneChildSchema>
}

export interface SplitPaneApi {
  setSizes: (sizes: [number, number]) => void
  collapse: (pane: Exclude<SplitPaneCollapsedPane, null>) => void
  expand: () => void
  setProps: (patch: SplitPaneProps) => void
  getProps: () => Readonly<SplitPaneResolvedProps>
}
