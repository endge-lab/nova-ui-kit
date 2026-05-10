import type {
  NovaComponentCreateContext,
  NovaComponentDescriptor,
  NovaComponentNode,
  NovaComponentSchema,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  normalizeCommonProps,
} from '@/shared/component/ComponentProps'
import {
  SURFACE_SCHEMA_TYPE,
  type SurfaceApi,
  type SurfaceProps,
  type SurfaceResolvedProps,
} from '@/components/Surface/Surface.types'

export type SurfaceDescriptor = NovaComponentDescriptor<
  SurfaceResolvedProps,
  SurfaceApi,
  Record<string, never>,
  SurfaceProps
>

export type SurfaceNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<SurfaceProps>,
) => NovaComponentNode<SurfaceResolvedProps, SurfaceApi, Record<string, never>, SurfaceProps, E>

export const SURFACE_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
} as const

export function normalizeSurfaceProps(props: SurfaceProps = {}): SurfaceResolvedProps {
  return normalizeCommonProps(props, {
    width: 160,
    height: 96,
    background: '#ffffff',
    border: { color: '#d6d9e2', width: 1, radius: 8 },
    clip: false,
  })
}

export function createSurfaceDescriptor(createNode?: SurfaceNodeFactory): SurfaceDescriptor {
  const descriptor: SurfaceDescriptor = {
    type: SURFACE_SCHEMA_TYPE,
    name: 'Surface',
    title: 'Surface',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: NOVA_UI_COMMON_DIRTY_POLICY,
    fields: SURFACE_FIELD_DEFINITIONS,
    normalize: schema => normalizeSurfaceProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeSurfaceProps),
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const SURFACE_NODE_DESCRIPTOR = createSurfaceDescriptor()
