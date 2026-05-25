import type { NovaComponentSchema } from '@endge/nova'
import type {
  NovaUiCommonProps,
  NovaUiCommonResolvedProps,
} from '@/shared/component/component-props'

export const DIVIDER_SCHEMA_TYPE = 'nova-ui.divider'

export type DividerOrientation = 'horizontal' | 'vertical'
export type DividerLineStyle = 'solid' | 'dashed' | 'dotted' | 'double'

export interface DividerProps extends NovaUiCommonProps {
  orientation?: DividerOrientation
  thickness?: number
  lineStyle?: DividerLineStyle
  dashPattern?: Array<number>
}

export interface DividerResolvedProps extends NovaUiCommonResolvedProps {
  orientation: DividerOrientation
  thickness?: number
  lineStyle: DividerLineStyle
  dashPattern?: Array<number>
}

export type DividerSchema = NovaComponentSchema<DividerProps>

export interface DividerApi {
  setOrientation: (orientation: DividerOrientation) => void
  setLineStyle: (lineStyle: DividerLineStyle) => void
  setProps: (patch: DividerProps) => void
  getProps: () => Readonly<DividerResolvedProps>
}
