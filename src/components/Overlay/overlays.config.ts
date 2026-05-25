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
} from '@/shared/component'
import {
  OVERLAYS_SCHEMA_TYPE,
  type OverlaysApi,
  type OverlaysProps,
  type OverlaysResolvedProps,
} from '@/components/Overlay/overlay.types'

export type OverlaysDescriptor = NovaComponentDescriptor<
  OverlaysResolvedProps,
  OverlaysApi,
  Record<string, never>,
  OverlaysProps
>

export type OverlaysNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<OverlaysProps>,
) => NovaComponentNode<OverlaysResolvedProps, OverlaysApi, Record<string, never>, OverlaysProps, E>

export const OVERLAYS_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  definitions: { type: 'array' },
} as const

/** Нормализует props registry-компонента Overlays. */
export function normalizeOverlaysProps(props: OverlaysProps = {}): OverlaysResolvedProps {
  return {
    ...normalizeCommonProps(props, {
      width: 0,
      height: 0,
      display: 'none',
    }),
    display: 'none',
    definitions: props.definitions ?? [],
  }
}

/** Создает descriptor для Overlays registry-node. */
export function createOverlaysDescriptor(createNode?: OverlaysNodeFactory): OverlaysDescriptor {
  const descriptor: OverlaysDescriptor = {
    type: OVERLAYS_SCHEMA_TYPE,
    name: 'Overlays',
    title: 'Overlays',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: NOVA_UI_COMMON_DIRTY_POLICY.update,
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'definitions'],
    },
    fields: OVERLAYS_FIELD_DEFINITIONS,
    normalize: schema => normalizeOverlaysProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeOverlaysProps),
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const OVERLAYS_NODE_DESCRIPTOR = createOverlaysDescriptor()
