import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  finiteNumber,
  normalizeCommonProps,
} from '@/shared/component'
import {
  SPLIT_PANE_SCHEMA_TYPE,
  type SplitPaneApi,
  type SplitPaneProps,
  type SplitPaneResolvedProps,
} from '@/components/SplitPane/SplitPane.types'

export type SplitPaneDescriptor = NovaComponentDescriptor<SplitPaneResolvedProps, SplitPaneApi, Record<string, never>, SplitPaneProps>

export type SplitPaneNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<SplitPaneProps>,
) => NovaComponentNode<SplitPaneResolvedProps, SplitPaneApi, Record<string, never>, SplitPaneProps, E>

export const SPLIT_PANE_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  direction: { type: 'string' },
  sizes: { type: 'tuple' },
  minSizes: { type: 'tuple' },
  maxSizes: { type: 'tuple' },
  resizer: { type: 'record' },
  collapsedPane: { type: 'string' },
} as const

export function normalizeSplitPaneProps(props: SplitPaneProps = {}): SplitPaneResolvedProps {
  return {
    ...normalizeCommonProps(props, {
      width: 420,
      height: 220,
      background: '#ffffff',
      border: { color: '#cbd5e1', width: 1, radius: 8 },
      clip: true,
    }),
    direction: props.direction ?? 'horizontal',
    sizes: normalizePair(props.sizes, [0.5, 0.5]),
    minSizes: normalizePair(props.minSizes, [80, 80]),
    maxSizes: normalizePair(props.maxSizes, [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]),
    resizer: {
      color: props.resizer?.color ?? '#94a3b8',
      lineWidth: finiteNumber(props.resizer?.lineWidth, 1),
      hitSize: finiteNumber(props.resizer?.hitSize, 8),
      overlayColor: props.resizer?.overlayColor ?? 'rgba(37,99,235,0.14)',
    },
    collapsedPane: props.collapsedPane ?? null,
  }
}

export function createSplitPaneDescriptor(createNode?: SplitPaneNodeFactory): SplitPaneDescriptor {
  const descriptor: SplitPaneDescriptor = {
    type: SPLIT_PANE_SCHEMA_TYPE,
    name: 'SplitPane',
    title: 'Split pane',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'direction', 'sizes', 'minSizes', 'maxSizes', 'resizer', 'collapsedPane'],
      render: NOVA_UI_COMMON_DIRTY_POLICY.render,
    },
    fields: SPLIT_PANE_FIELD_DEFINITIONS,
    normalize: schema => normalizeSplitPaneProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeSplitPaneProps),
  }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const SPLIT_PANE_NODE_DESCRIPTOR = createSplitPaneDescriptor()

function normalizePair(value: [number, number] | undefined, fallback: [number, number]): [number, number] {
  return [
    finiteNumber(value?.[0], fallback[0]),
    finiteNumber(value?.[1], fallback[1]),
  ]
}
