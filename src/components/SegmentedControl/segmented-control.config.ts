import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  normalizeCommonProps,
  sizeTokenHeight,
} from '@/shared/component'
import {
  SEGMENTED_CONTROL_SCHEMA_TYPE,
  type SegmentedControlApi,
  type SegmentedControlProps,
  type SegmentedControlResolvedProps,
} from '@/components/SegmentedControl/segmented-control.types'

export type SegmentedControlDescriptor = NovaComponentDescriptor<SegmentedControlResolvedProps, SegmentedControlApi, Record<string, never>, SegmentedControlProps>

export type SegmentedControlNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<SegmentedControlProps>,
) => NovaComponentNode<SegmentedControlResolvedProps, SegmentedControlApi, Record<string, never>, SegmentedControlProps, E>

export const SEGMENTED_CONTROL_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  items: { type: 'array' },
  value: { type: 'string' },
  size: { type: 'string' },
  onChange: { type: 'function' },
  onValueChange: { type: 'function' },
} as const

export function normalizeSegmentedControlProps(props: SegmentedControlProps = {}): SegmentedControlResolvedProps {
  const items = props.items ?? []
  const value = props.value ?? items[0]?.value ?? ''
  const size = props.size ?? 'md'
  return {
    ...normalizeCommonProps(props, {
      width: 240,
      height: sizeTokenHeight(size, 34),
      background: 'var(--nova-segmented-control-background, #f1f5f9)',
      border: { color: 'var(--nova-segmented-control-border-color, #cbd5e1)', width: 1, radius: 8 },
      activeBackground: 'var(--nova-segmented-control-active-background, #ffffff)',
      color: 'var(--nova-segmented-control-color, #334155)',
      accentColor: 'var(--nova-segmented-control-accent-color, #2563eb)',
      cursor: { hover: 'pointer', pressed: 'pointer', disabled: 'not-allowed' },
    }),
    items,
    value,
    size,
    onChange: props.onChange,
    onValueChange: props.onValueChange,
  }
}

export function createSegmentedControlDescriptor(createNode?: SegmentedControlNodeFactory): SegmentedControlDescriptor {
  const descriptor: SegmentedControlDescriptor = {
    type: SEGMENTED_CONTROL_SCHEMA_TYPE,
    name: 'SegmentedControl',
    title: 'Segmented control',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'items', 'size'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'value', 'onChange', 'onValueChange'],
    },
    fields: SEGMENTED_CONTROL_FIELD_DEFINITIONS,
    normalize: schema => normalizeSegmentedControlProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeSegmentedControlProps),
  }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const SEGMENTED_CONTROL_NODE_DESCRIPTOR = createSegmentedControlDescriptor()
