import type { NovaComponentSchema } from '@endge/nova'
import type {
  NovaUiCommonProps,
  NovaUiCommonResolvedProps,
  NovaUiComponentSize,
  NovaUiIconSource,
} from '@/shared/component'

export const TAG_SCHEMA_TYPE = 'nova-ui.tag'

export type TagTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface TagProps extends NovaUiCommonProps {
  text?: string
  icon?: NovaUiIconSource
  tone?: TagTone
  size?: NovaUiComponentSize
  selected?: boolean
}

export interface TagResolvedProps extends NovaUiCommonResolvedProps {
  text: string
  icon?: NovaUiIconSource
  tone: TagTone
  size: NovaUiComponentSize
  selected: boolean
}

export type TagSchema = NovaComponentSchema<TagProps>

export interface TagApi {
  setText: (text: string) => void
  setTone: (tone: TagTone) => void
  setProps: (patch: TagProps) => void
  getProps: () => Readonly<TagResolvedProps>
}
