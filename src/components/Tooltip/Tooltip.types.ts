import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'

export const TOOLTIP_SCHEMA_TYPE = 'nova-ui.tooltip'

export type TooltipPlacement = 'top' | 'right' | 'bottom' | 'left'

export interface TooltipProps extends NovaUiCommonProps {
  content?: string
  placement?: TooltipPlacement
  delay?: number
  open?: boolean
}

export interface TooltipResolvedProps extends NovaUiCommonResolvedProps {
  content: string
  placement: TooltipPlacement
  delay: number
  open: boolean
}

export interface TooltipSchema extends NovaComponentSchema<TooltipProps> {
  trigger?: NovaComponentSchema
  children?: Array<NovaComponentSchema>
}

export interface TooltipApi {
  open: () => void
  close: () => void
  toggle: () => void
  setProps: (patch: TooltipProps) => void
  getProps: () => Readonly<TooltipResolvedProps>
}
