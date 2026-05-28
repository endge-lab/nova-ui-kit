import type { NovaComponentSchema, NovaElementSchema } from '@endge/nova'
import type {
  NovaUiCommonProps,
  NovaUiCommonResolvedProps,
} from '@/shared/component/component-props'
import type { NovaUiLayoutRect, NovaUiPositionedLayout } from '@/shared/layout'

export const SURFACE_SCHEMA_TYPE = 'nova-ui.surface'

export interface SurfaceProps extends NovaUiCommonProps {
  motionOffsetY?: number
  motionRotation?: number
}

export interface SurfaceResolvedProps extends NovaUiCommonResolvedProps {
  motionOffsetY: number
  motionRotation: number
}

export interface SurfaceChildSchema<TProps = Record<string, any>> extends NovaElementSchema<TProps> {
  layout?: NovaUiPositionedLayout
}

export interface SurfaceSchema extends NovaComponentSchema<SurfaceProps> {
  children?: Array<SurfaceChildSchema>
}

export interface SurfaceApi {
  setProps: (patch: SurfaceProps) => void
  setChildren: (children: Array<SurfaceChildSchema>) => void
  relayout: () => void
  getChildRect: () => Readonly<NovaUiLayoutRect>
}
