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
  finiteNumber,
  normalizeCommonProps,
} from '@/shared/component/component-props'
import {
  DIVIDER_SCHEMA_TYPE,
  type DividerApi,
  type DividerLineStyle,
  type DividerOrientation,
  type DividerProps,
  type DividerResolvedProps,
} from '@/components/Divider/divider.types'

export type DividerDescriptor = NovaComponentDescriptor<
  DividerResolvedProps,
  DividerApi,
  Record<string, never>,
  DividerProps
>

export type DividerNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<DividerProps>,
) => NovaComponentNode<DividerResolvedProps, DividerApi, Record<string, never>, DividerProps, E>

export const DIVIDER_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  orientation: { type: 'string' },
  thickness: { type: 'number' },
  lineStyle: { type: 'string' },
  dashPattern: { type: 'array' },
} as const

export function normalizeDividerProps(props: DividerProps = {}): DividerResolvedProps {
  const orientation = normalizeOrientation(props.orientation)
  const thickness = normalizeThickness(props.thickness)

  return {
    ...normalizeCommonProps(props, {
      width: orientation === 'vertical' ? thickness : 160,
      height: orientation === 'vertical' ? 160 : thickness,
      border: { width: thickness },
      opacity: 1,
      padding: 0,
      margin: 0,
    }),
    orientation,
    thickness: props.thickness === undefined ? undefined : thickness,
    lineStyle: normalizeLineStyle(props.lineStyle),
    dashPattern: normalizeDashPattern(props.dashPattern),
  }
}

export function createDividerDescriptor(createNode?: DividerNodeFactory): DividerDescriptor {
  const descriptor: DividerDescriptor = {
    type: DIVIDER_SCHEMA_TYPE,
    name: 'Divider',
    title: 'Divider',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: NOVA_UI_COMMON_DIRTY_POLICY.update,
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'orientation', 'thickness', 'lineStyle', 'dashPattern'],
    },
    fields: DIVIDER_FIELD_DEFINITIONS,
    normalize: schema => normalizeDividerProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeDividerProps),
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const DIVIDER_NODE_DESCRIPTOR = createDividerDescriptor()

function normalizeOrientation(value: DividerProps['orientation']): DividerOrientation {
  return value === 'vertical' ? 'vertical' : 'horizontal'
}

function normalizeLineStyle(value: DividerProps['lineStyle']): DividerLineStyle {
  if (value === 'dashed' || value === 'dotted' || value === 'double') return value
  return 'solid'
}

function normalizeThickness(value: DividerProps['thickness']): number {
  return Math.max(0, finiteNumber(value, 1))
}

function normalizeDashPattern(value: DividerProps['dashPattern']): Array<number> | undefined {
  if (!Array.isArray(value)) return undefined
  const normalized = value
    .map(item => finiteNumber(item, 0))
    .filter(item => item > 0)
  return normalized.length > 0 ? normalized : undefined
}
