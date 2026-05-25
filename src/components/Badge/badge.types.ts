import type { NovaComponentSchema } from '@endge/nova'
import type {
  NovaUiCommonProps,
  NovaUiCommonResolvedProps,
  NovaUiComponentSize,
  NovaUiIconSource,
} from '@/shared/component'
import type { NovaUiOverlayAnchor, NovaUiOverlayPlacement } from '@/shared/overlay'

export const BADGE_SCHEMA_TYPE = 'nova-ui.badge'

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface BadgeProps extends NovaUiCommonProps {
  text?: string
  value?: string | number
  max?: number
  dot?: boolean
  icon?: NovaUiIconSource
  tone?: BadgeTone
  size?: NovaUiComponentSize
  anchor?: NovaUiOverlayAnchor
  placement?: NovaUiOverlayPlacement
  offsetX?: number
  offsetY?: number
}

export interface BadgeResolvedProps extends NovaUiCommonResolvedProps {
  text: string
  value?: string | number
  max: number
  dot: boolean
  icon?: NovaUiIconSource
  tone: BadgeTone
  size: NovaUiComponentSize
  anchor?: NovaUiOverlayAnchor
  placement: NovaUiOverlayPlacement
  offsetX: number
  offsetY: number
}

export type BadgeSchema = NovaComponentSchema<BadgeProps>

export interface BadgeApi {
  setText: (text: string) => void
  setValue: (value: string | number | undefined) => void
  setTone: (tone: BadgeTone) => void
  setProps: (patch: BadgeProps) => void
  getProps: () => Readonly<BadgeResolvedProps>
}
