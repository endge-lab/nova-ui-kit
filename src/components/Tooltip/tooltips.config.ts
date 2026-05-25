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
  TOOLTIPS_SCHEMA_TYPE,
  type TooltipsApi,
  type TooltipsProps,
  type TooltipsResolvedProps,
} from '@/components/Tooltip/tooltip.types'

export type TooltipsDescriptor = NovaComponentDescriptor<
  TooltipsResolvedProps,
  TooltipsApi,
  Record<string, never>,
  TooltipsProps
>

export type TooltipsNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<TooltipsProps>,
) => NovaComponentNode<TooltipsResolvedProps, TooltipsApi, Record<string, never>, TooltipsProps, E>

export const TOOLTIPS_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  definitions: { type: 'array' },
} as const

/** Нормализует props registry-компонента Tooltips. */
export function normalizeTooltipsProps(props: TooltipsProps = {}): TooltipsResolvedProps {
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

/** Создает descriptor для Tooltips registry-node. */
export function createTooltipsDescriptor(createNode?: TooltipsNodeFactory): TooltipsDescriptor {
  const descriptor: TooltipsDescriptor = {
    type: TOOLTIPS_SCHEMA_TYPE,
    name: 'Tooltips',
    title: 'Tooltips',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: NOVA_UI_COMMON_DIRTY_POLICY.update,
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'definitions'],
    },
    fields: TOOLTIPS_FIELD_DEFINITIONS,
    normalize: schema => normalizeTooltipsProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeTooltipsProps),
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const TOOLTIPS_NODE_DESCRIPTOR = createTooltipsDescriptor()
