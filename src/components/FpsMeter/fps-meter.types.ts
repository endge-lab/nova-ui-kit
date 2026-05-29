import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiInset, NovaUiPosition } from '@/shared/layout'

export const FPS_METER_SCHEMA_TYPE = 'nova-ui.fps-meter'

export type NovaOverlayPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type FpsMeterMetric = 'render' | 'raf'

export interface FpsMeterProps {
  x?: number
  y?: number
  width?: number
  height?: number
  position?: NovaUiPosition
  inset?: NovaUiInset
  zIndex?: number
  placement?: NovaOverlayPlacement
  margin?: number
  sampleSize?: number
  metric?: FpsMeterMetric
  variant?: 'badge' | 'pill' | 'minimal'
  visible?: boolean
}

export interface FpsMeterResolvedProps {
  x?: number
  y?: number
  width: number
  height: number
  position: NovaUiPosition
  inset?: NovaUiInset
  zIndex?: number
  placement?: NovaOverlayPlacement
  margin: number
  sampleSize: number
  metric: FpsMeterMetric
  variant: 'badge' | 'pill' | 'minimal'
  visible: boolean
}

export type FpsMeterSchema = NovaComponentSchema<FpsMeterProps>

export interface FpsMeterApi {
  setVisible: (visible: boolean) => void
  setProps: (patch: FpsMeterProps) => void
  getProps: () => Readonly<FpsMeterResolvedProps>
}
