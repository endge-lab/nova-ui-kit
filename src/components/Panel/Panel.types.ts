import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'
import type { NovaUiLayoutRect } from '@/shared/layout'

export const PANEL_SCHEMA_TYPE = 'nova-ui.panel'

export type PanelDensity = 'compact' | 'regular' | 'spacious'

export interface PanelProps extends NovaUiCommonProps {
  title?: string
  subtitle?: string
  density?: PanelDensity
  header?: NovaComponentSchema
  footer?: NovaComponentSchema
}

export interface PanelResolvedProps extends NovaUiCommonResolvedProps {
  title: string
  subtitle: string
  density: PanelDensity
  header?: NovaComponentSchema
  footer?: NovaComponentSchema
}

export interface PanelChildSchema<TProps = Record<string, any>> extends NovaComponentSchema<TProps> {}

export interface PanelSchema extends NovaComponentSchema<PanelProps> {
  children?: Array<PanelChildSchema>
}

export interface PanelApi {
  setChildren: (children: Array<PanelChildSchema>) => void
  setTitle: (title: string) => void
  setProps: (patch: PanelProps) => void
  getBodyRect: () => Readonly<NovaUiLayoutRect>
  getProps: () => Readonly<PanelResolvedProps>
}
