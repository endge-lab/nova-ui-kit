import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'
import type { NovaUiPartStyleOptions } from '@/domain/domain.types'
import type { NovaUiOverlayAnchor, NovaUiOverlayCollisionOptions, NovaUiOverlayDismissMode, NovaUiOverlayPlacement } from '@/shared/overlay/overlay.types'

export const POPOVER_SCHEMA_TYPE = 'nova-ui.popover'

export interface PopoverProps extends NovaUiCommonProps, NovaUiPartStyleOptions {
  open?: boolean
  anchor?: NovaUiOverlayAnchor
  placement?: NovaUiOverlayPlacement
  offset?: number
  collision?: NovaUiOverlayCollisionOptions
  dismiss?: NovaUiOverlayDismissMode
  arrow?: boolean
  backdrop?: boolean
  surface?: Partial<NovaUiCommonProps>
  onOpenChange?: (open: boolean, event?: Event) => void
}

export interface PopoverResolvedProps extends NovaUiCommonResolvedProps, NovaUiPartStyleOptions {
  open: boolean
  anchor?: NovaUiOverlayAnchor
  placement: NovaUiOverlayPlacement
  offset: number
  collision: Required<NovaUiOverlayCollisionOptions>
  dismiss: { outside: boolean; escape: boolean }
  arrow: boolean
  backdrop: boolean
  surface?: Partial<NovaUiCommonProps>
  onOpenChange?: (open: boolean, event?: Event) => void
}

export interface PopoverSchema extends NovaComponentSchema<PopoverProps> {
  children?: Array<NovaComponentSchema>
}

export interface PopoverApi {
  open: (event?: Event) => void
  close: (event?: Event) => void
  toggle: (event?: Event) => void
  setProps: (patch: PopoverProps) => void
  getProps: () => Readonly<PopoverResolvedProps>
}
