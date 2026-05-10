import type { NovaComponentSchema } from '@endge/nova'
import type {
  NovaUiCommonProps,
  NovaUiCommonResolvedProps,
} from '@/shared/component/ComponentProps'
import type { NovaUiLayoutRect } from '@/shared/layout'

export const SURFACE_SCHEMA_TYPE = 'nova-ui.surface'

export interface SurfaceProps extends NovaUiCommonProps {}

export interface SurfaceResolvedProps extends NovaUiCommonResolvedProps {}

export interface SurfaceChildSchema<TProps = Record<string, any>> extends NovaComponentSchema<TProps> {}

export interface SurfaceSchema extends NovaComponentSchema<SurfaceProps> {
  children?: SurfaceChildSchema[]
}

export interface SurfaceApi {
  setProps: (patch: SurfaceProps) => void
  setChildren: (children: SurfaceChildSchema[]) => void
  relayout: () => void
  getChildRect: () => Readonly<NovaUiLayoutRect>
}
