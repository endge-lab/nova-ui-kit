import type { NovaAssetDrawableInput, NovaComponentSchema } from '@endge/nova'
import type {
  NovaUiCommonProps,
  NovaUiCommonResolvedProps,
} from '@/shared/component'

export const IMAGE_SCHEMA_TYPE = 'nova-ui.image'

export type ImageFit = 'cover' | 'contain' | 'fill'

export interface ImageProps extends NovaUiCommonProps {
  src?: NovaAssetDrawableInput
  source?: NovaAssetDrawableInput
  alt?: string
  fit?: ImageFit
  radius?: number
}

export interface ImageResolvedProps extends NovaUiCommonResolvedProps {
  src?: NovaAssetDrawableInput
  source?: NovaAssetDrawableInput
  alt: string
  fit: ImageFit
  radius: number
}

export type ImageSchema = NovaComponentSchema<ImageProps>

export interface ImageApi {
  setSrc: (src: NovaAssetDrawableInput) => void
  setProps: (patch: ImageProps) => void
  getProps: () => Readonly<ImageResolvedProps>
}

