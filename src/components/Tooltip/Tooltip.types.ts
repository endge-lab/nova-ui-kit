import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'

export const TOOLTIP_SCHEMA_TYPE = 'nova-ui.tooltip'

export type TooltipPlacement = 'top' | 'right' | 'bottom' | 'left'

export interface TooltipProps extends NovaUiCommonProps {
  content?: string
  placement?: TooltipPlacement
  delay?: number
  open?: boolean
  onOpenChange?: (open: boolean, event?: Event) => void
  onShow?: (event?: Event) => void
  onHide?: (event?: Event) => void
}

export interface TooltipResolvedProps extends NovaUiCommonResolvedProps {
  content: string
  placement: TooltipPlacement
  delay: number
  open: boolean
  onOpenChange?: (open: boolean, event?: Event) => void
  onShow?: (event?: Event) => void
  onHide?: (event?: Event) => void
}

export interface TooltipSchema extends NovaComponentSchema<TooltipProps> {
  trigger?: NovaComponentSchema
  children?: Array<NovaComponentSchema>
}

export interface TooltipApi {
  open: (event?: Event) => void
  close: (event?: Event) => void
  toggle: (event?: Event) => void
  setProps: (patch: TooltipProps) => void
  getProps: () => Readonly<TooltipResolvedProps>
}
