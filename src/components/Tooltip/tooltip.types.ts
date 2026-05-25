import type { NovaComponentSchema, NovaElementSchema, NovaNode, NovaSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'
import type { NovaUiLayoutRect } from '@/shared/layout'

export const TOOLTIP_SCHEMA_TYPE = 'nova-ui.tooltip'
export const TOOLTIPS_SCHEMA_TYPE = 'nova-ui.tooltips'

export type TooltipPlacement = 'top' | 'right' | 'bottom' | 'left' | 'cursor'
export type TooltipPointerTrigger = 'hover' | 'click' | false
export type TooltipKeyboardTrigger = 'focus' | false
export type TooltipModifier = 'ctrl' | 'meta' | 'shift' | 'alt'
export type TooltipPointerButton = 'left' | 'middle' | 'right'
export type TooltipTrigger =
  | 'hover'
  | 'focus'
  | 'click'
  | 'manual'
  | {
      pointer?: TooltipPointerTrigger
      keyboard?: TooltipKeyboardTrigger
      modifier?: TooltipModifier
      button?: TooltipPointerButton
    }

export type TooltipContent =
  | string
  | { text: string }
  | { markdown: string }
  | { schema: NovaSchema | (() => NovaSchema) }

export type TooltipContentMode = 'text' | 'markdown' | 'schema'

export type TooltipInput =
  | string
  | boolean
  | false
  | null
  | undefined
  | ({
      type?: string
      value?: unknown
    } & object)

export interface TooltipCollisionOptions {
  boundary?: 'canvas' | 'parent'
  padding?: number
  flip?: boolean
  shift?: boolean
}

export interface TooltipAnimationOptions {
  type?: 'fade' | 'fade-scale'
  duration?: number
  easing?: string
}

export interface TooltipProps extends NovaUiCommonProps {
  type?: string
  content?: TooltipContent | null
  contentMode?: TooltipContentMode
  placement?: TooltipPlacement
  open?: boolean
  delay?: number
  hideDelay?: number
  trigger?: TooltipTrigger
  followCursor?: boolean
  collision?: TooltipCollisionOptions
  animation?: false | TooltipAnimationOptions
  contentClassName?: string | Array<string>
  arrowClassName?: string | Array<string>
  onOpenChange?: (open: boolean, event?: Event) => void
  onShow?: (event?: Event) => void
  onHide?: (event?: Event) => void
}

export interface TooltipResolvedProps extends NovaUiCommonResolvedProps {
  type: string
  content: TooltipContent | null
  contentMode?: TooltipContentMode
  placement: TooltipPlacement
  open: boolean
  delay: number
  hideDelay: number
  trigger: TooltipTrigger
  followCursor: boolean
  collision: Required<TooltipCollisionOptions>
  animation: false | Required<TooltipAnimationOptions>
  contentClassName: string | Array<string>
  arrowClassName: string | Array<string>
  onOpenChange?: (open: boolean, event?: Event) => void
  onShow?: (event?: Event) => void
  onHide?: (event?: Event) => void
}

export interface TooltipSchema extends NovaComponentSchema<TooltipProps> {
  trigger?: NovaComponentSchema
  children?: Array<NovaComponentSchema>
}

export interface TooltipSlotContext extends Record<string, unknown> {
  type: string
  value?: unknown
  target: {
    id: string
    type: string
    rect: NovaUiLayoutRect
    props?: Record<string, unknown>
    node?: NovaNode<any>
  }
  pointer: {
    x: number
    y: number
  }
}

export type TooltipTemplateFactory = (slot: TooltipSlotContext) => Array<NovaElementSchema<any>>

export interface TooltipDefinition {
  type: string
  props?: TooltipProps
  slot?: TooltipTemplateFactory
}

export interface TooltipsProps extends NovaUiCommonProps {
  definitions?: Array<TooltipDefinition>
}

export interface TooltipsResolvedProps extends NovaUiCommonResolvedProps {
  definitions: Array<TooltipDefinition>
}

export interface TooltipsSchema extends NovaComponentSchema<TooltipsProps> {
  children?: Array<TooltipSchema>
}

export interface TooltipsApi {
  setDefinitions: (definitions: Array<TooltipDefinition>) => void
  getDefinitions: () => ReadonlyArray<TooltipDefinition>
}

export interface TooltipTargetResolution {
  tooltip: TooltipInput
  rect?: NovaUiLayoutRect
  targetId?: string
  targetType?: string
  targetProps?: Record<string, unknown>
}

export interface TooltipTargetResolverInput {
  x: number
  y: number
  event?: MouseEvent
}

export interface NovaTooltipTargetResolver {
  resolveNovaTooltipTarget: (input: TooltipTargetResolverInput) => TooltipTargetResolution | null | undefined
}

export interface TooltipApi {
  open: (event?: Event) => void
  close: (event?: Event) => void
  toggle: (event?: Event) => void
  moveTo: (x: number, y: number) => void
  setContent: (content: TooltipContent) => void
  setProps: (patch: TooltipProps) => void
  getProps: () => Readonly<TooltipResolvedProps>
}
