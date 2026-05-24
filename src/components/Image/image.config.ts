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
  IMAGE_SCHEMA_TYPE,
  type ImageApi,
  type ImageProps,
  type ImageResolvedProps,
} from '@/components/Image/image.types'

export type ImageDescriptor = NovaComponentDescriptor<
  ImageResolvedProps,
  ImageApi,
  Record<string, never>,
  ImageProps
>

export type ImageNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<ImageProps>,
) => NovaComponentNode<ImageResolvedProps, ImageApi, Record<string, never>, ImageProps, E>

export const IMAGE_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  src: { type: 'image' },
  source: { type: 'image' },
  alt: { type: 'string' },
  fit: { type: 'string' },
  radius: { type: 'number' },
} as const

export function normalizeImageProps(props: ImageProps = {}): ImageResolvedProps {
  return {
    ...normalizeCommonProps(props, {
      width: 40,
      height: 40,
      background: 'rgba(148, 163, 184, 0.18)',
      border: { color: 'rgba(15,23,42,0.10)', width: 0, radius: finiteNumber(props.radius, 0) },
      clip: true,
    }),
    src: props.src,
    source: props.source,
    alt: props.alt ?? '',
    fit: props.fit ?? 'cover',
    radius: Math.max(0, finiteNumber(props.radius, 0)),
  }
}

export function createImageDescriptor(createNode?: ImageNodeFactory): ImageDescriptor {
  const descriptor: ImageDescriptor = {
    type: IMAGE_SCHEMA_TYPE,
    name: 'Image',
    title: 'Image',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'src', 'source', 'fit', 'radius'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'alt'],
    },
    fields: IMAGE_FIELD_DEFINITIONS,
    normalize: schema => normalizeImageProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeImageProps),
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const IMAGE_NODE_DESCRIPTOR = createImageDescriptor()

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

