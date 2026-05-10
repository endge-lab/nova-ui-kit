import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  clamp,
  commonMeasureBounds,
  finiteNumber,
  normalizeCommonProps,
} from '@/shared/component'
import {
  SCROLLBAR_SCHEMA_TYPE,
  type ScrollbarApi,
  type ScrollbarProps,
  type ScrollbarResolvedProps,
} from '@/components/Scrollbar/Scrollbar.types'

export type ScrollbarDescriptor = NovaComponentDescriptor<ScrollbarResolvedProps, ScrollbarApi, Record<string, never>, ScrollbarProps>

export type ScrollbarNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<ScrollbarProps>,
) => NovaComponentNode<ScrollbarResolvedProps, ScrollbarApi, Record<string, never>, ScrollbarProps, E>

export const SCROLLBAR_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  orientation: { type: 'string' },
  value: { type: 'number' },
  viewportSize: { type: 'number' },
  contentSize: { type: 'number' },
  thickness: { type: 'number' },
  onChange: { type: 'function' },
} as const

export function normalizeScrollbarProps(props: ScrollbarProps = {}): ScrollbarResolvedProps {
  const orientation = props.orientation ?? 'vertical'
  const viewportSize = Math.max(0, finiteNumber(props.viewportSize, 100))
  const contentSize = Math.max(viewportSize, finiteNumber(props.contentSize, viewportSize))
  const max = Math.max(0, contentSize - viewportSize)
  const cursor = orientation === 'horizontal' ? 'ew-resize' : 'ns-resize'
  return {
    ...normalizeCommonProps(props, {
      width: orientation === 'vertical' ? 12 : 160,
      height: orientation === 'vertical' ? 160 : 12,
      trackColor: 'rgba(148,163,184,0.24)',
      thumbColor: 'rgba(71,85,105,0.72)',
      hoverBackground: 'rgba(71,85,105,0.88)',
      cursor: { hover: cursor, pressed: cursor, dragging: cursor, disabled: 'not-allowed' },
    }),
    orientation,
    value: clamp(finiteNumber(props.value, 0), 0, max),
    viewportSize,
    contentSize,
    thickness: Math.max(4, finiteNumber(props.thickness, 8)),
    onChange: props.onChange,
  }
}

export function createScrollbarDescriptor(createNode?: ScrollbarNodeFactory): ScrollbarDescriptor {
  const descriptor: ScrollbarDescriptor = {
    type: SCROLLBAR_SCHEMA_TYPE,
    name: 'Scrollbar',
    title: 'Scrollbar',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'orientation', 'viewportSize', 'contentSize', 'thickness'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'value', 'onChange'],
    },
    fields: SCROLLBAR_FIELD_DEFINITIONS,
    normalize: schema => normalizeScrollbarProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeScrollbarProps),
  }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const SCROLLBAR_NODE_DESCRIPTOR = createScrollbarDescriptor()
