import type { NovaComponentSchema, NovaSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'

export const TOOLTIP_SCHEMA_TYPE = 'nova-ui.tooltip'

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
  content?: TooltipContent | null
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
  content: TooltipContent | null
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

export interface TooltipApi {
  open: (event?: Event) => void
  close: (event?: Event) => void
  toggle: (event?: Event) => void
  moveTo: (x: number, y: number) => void
  setContent: (content: TooltipContent) => void
  setProps: (patch: TooltipProps) => void
  getProps: () => Readonly<TooltipResolvedProps>
}
