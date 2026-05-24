import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'
import type { NovaUiPartStyleOptions } from '@/domain/domain.types'
import type { NovaUiOverlayDismissMode, NovaUiOverlayPlacement } from '@/shared/overlay/overlay.types'

export const DIALOG_SCHEMA_TYPE = 'nova-ui.dialog'

export interface DialogProps extends NovaUiCommonProps, NovaUiPartStyleOptions {
  open?: boolean
  modal?: boolean
  backdrop?: boolean
  title?: string
  description?: string
  placement?: NovaUiOverlayPlacement
  position?: { x?: number; y?: number }
  dismiss?: NovaUiOverlayDismissMode
  closeButton?: boolean
  draggable?: boolean
  resizable?: boolean
  scale?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  header?: Array<NovaComponentSchema>
  footer?: Array<NovaComponentSchema>
  onOpenChange?: (open: boolean, event?: Event) => void
  onMove?: (position: { x: number; y: number }, event?: Event) => void
  onResize?: (size: { width: number; height: number }, event?: Event) => void
}

export interface DialogResolvedProps extends NovaUiCommonResolvedProps, NovaUiPartStyleOptions {
  open: boolean
  modal: boolean
  backdrop: boolean
  title: string
  description: string
  placement: NovaUiOverlayPlacement
  position?: { x?: number; y?: number }
  dismiss: { outside: boolean; escape: boolean }
  closeButton: boolean
  draggable: boolean
  resizable: boolean
  scale: number
  minWidth: number
  minHeight: number
  maxWidth: number
  maxHeight: number
  header: Array<NovaComponentSchema>
  footer: Array<NovaComponentSchema>
  onOpenChange?: (open: boolean, event?: Event) => void
  onMove?: (position: { x: number; y: number }, event?: Event) => void
  onResize?: (size: { width: number; height: number }, event?: Event) => void
}

export interface DialogSchema extends NovaComponentSchema<DialogProps> {
  children?: Array<NovaComponentSchema>
}

export interface DialogApi {
  open: (event?: Event) => void
  close: (event?: Event) => void
  toggle: (event?: Event) => void
  moveTo: (x: number, y: number, event?: Event) => void
  resizeTo: (width: number, height: number, event?: Event) => void
  setProps: (patch: DialogProps) => void
  getProps: () => Readonly<DialogResolvedProps>
}
