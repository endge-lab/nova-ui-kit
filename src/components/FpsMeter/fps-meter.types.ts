import type { NovaComponentSchema } from '@endge/nova'

export const FPS_METER_SCHEMA_TYPE = 'nova-ui.fps-meter'

export type NovaOverlayPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface FpsMeterProps {
  x?: number
  y?: number
  width?: number
  height?: number
  placement?: NovaOverlayPlacement
  margin?: number
  sampleSize?: number
  variant?: 'badge' | 'pill' | 'minimal'
  visible?: boolean
}

export interface FpsMeterResolvedProps {
  x?: number
  y?: number
  width: number
  height: number
  placement: NovaOverlayPlacement
  margin: number
  sampleSize: number
  variant: 'badge' | 'pill' | 'minimal'
  visible: boolean
}

export type FpsMeterSchema = NovaComponentSchema<FpsMeterProps>

export interface FpsMeterApi {
  setVisible: (visible: boolean) => void
  setProps: (patch: FpsMeterProps) => void
  getProps: () => Readonly<FpsMeterResolvedProps>
}
