import type { NovaComponentSchema } from '@endge/nova'
import type {
  NovaUiCommonProps,
  NovaUiCommonResolvedProps,
} from '@/shared/component/component-props'

export const ZOOM_CONTROLS_SCHEMA_TYPE = 'nova-ui.zoom-controls'

export interface ZoomControlsProps extends NovaUiCommonProps {
  value?: number
  minZoom?: number
  maxZoom?: number
  step?: number
  showValue?: boolean
  valueWidth?: number
  minusLabel?: string
  plusLabel?: string
  formatValue?: (value: number) => string
  onChange?: (value: number) => void
}

export interface ZoomControlsResolvedProps extends NovaUiCommonResolvedProps {
  value: number
  minZoom: number
  maxZoom: number
  step: number
  showValue: boolean
  valueWidth: number
  minusLabel: string
  plusLabel: string
  formatValue?: (value: number) => string
  onChange?: (value: number) => void
}

export type ZoomControlsSchema = NovaComponentSchema<ZoomControlsProps>

export interface ZoomControlsApi {
  zoomIn: () => void
  zoomOut: () => void
  setValue: (value: number) => void
  setProps: (patch: ZoomControlsProps) => void
  getProps: () => Readonly<ZoomControlsResolvedProps>
}
