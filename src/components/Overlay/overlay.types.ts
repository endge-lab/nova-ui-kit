import type { NovaComponentSchema, NovaElementSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'
import type { NovaUiPartStyleOptions } from '@/domain/domain.types'
import type {
  NovaUiOverlayAnchor,
  NovaUiOverlayCollisionOptions,
  NovaUiOverlayDismissMode,
  NovaUiOverlayPlacement,
} from '@/shared/overlay/overlay.types'

export const OVERLAY_SCHEMA_TYPE = 'nova-ui.overlay'
export const OVERLAYS_SCHEMA_TYPE = 'nova-ui.overlays'

export type OverlayKind = 'menu' | 'panel' | 'popover'

export type OverlayInput =
  | string
  | ({
      type?: string
      id?: string
      value?: unknown
    } & Record<string, unknown>)

export interface OverlayProps extends NovaUiCommonProps, NovaUiPartStyleOptions {
  open?: boolean
  kind?: OverlayKind
  placement?: NovaUiOverlayPlacement
  offset?: number
  anchor?: NovaUiOverlayAnchor
  collision?: NovaUiOverlayCollisionOptions
  dismiss?: NovaUiOverlayDismissMode
  modal?: boolean
  backdrop?: boolean
  onOpenChange?: (open: boolean, event?: Event) => void
}

export interface OverlayResolvedProps extends NovaUiCommonResolvedProps, NovaUiPartStyleOptions {
  open: boolean
  kind: OverlayKind
  placement: NovaUiOverlayPlacement
  offset: number
  anchor: NovaUiOverlayAnchor
  collision: Required<NovaUiOverlayCollisionOptions>
  dismiss: { outside: boolean; escape: boolean }
  modal: boolean
  backdrop: boolean
  onOpenChange?: (open: boolean, event?: Event) => void
}

export interface OverlaySchema extends NovaComponentSchema<OverlayProps> {
  children?: Array<NovaComponentSchema>
}

export interface OverlaySlotContext extends Record<string, unknown> {
  id: string
  type: string
  value?: unknown
  anchor: NovaUiOverlayAnchor
  props: OverlayResolvedProps
  overlay: {
    id: string
    type: string
    kind: OverlayKind
    index: number
  }
  close: (event?: Event) => void
  update: (patch: OverlayProps) => void
}

export type OverlayTemplateFactory = (slot: OverlaySlotContext) => Array<NovaElementSchema<any>>

export interface OverlayDefinition {
  type: string
  props?: OverlayProps
  slot?: OverlayTemplateFactory
}

export interface OverlaysProps extends NovaUiCommonProps {
  definitions?: Array<OverlayDefinition>
}

export interface OverlaysResolvedProps extends NovaUiCommonResolvedProps {
  definitions: Array<OverlayDefinition>
}

export interface OverlaysSchema extends NovaComponentSchema<OverlaysProps> {
  children?: Array<OverlaySchema>
}

export interface OverlaysApi {
  setDefinitions: (definitions: Array<OverlayDefinition>) => void
  getDefinitions: () => ReadonlyArray<OverlayDefinition>
}

export interface OverlayOpenOptions extends Record<string, unknown> {
  type?: string
  id?: string
  value?: unknown
  anchor?: NovaUiOverlayAnchor
}

export interface OverlayApi {
  open: (event?: Event) => void
  close: (event?: Event) => void
  toggle: (event?: Event) => void
  moveTo: (x: number, y: number, event?: Event) => void
  setAnchor: (anchor: NovaUiOverlayAnchor) => void
  setProps: (patch: OverlayProps) => void
  getProps: () => Readonly<OverlayResolvedProps>
}
