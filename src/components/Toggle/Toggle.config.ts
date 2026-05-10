import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  normalizeCommonProps,
} from '@/shared/component'
import {
  TOGGLE_SCHEMA_TYPE,
  type ToggleApi,
  type ToggleProps,
  type ToggleResolvedProps,
} from '@/components/Toggle/Toggle.types'

export type ToggleDescriptor = NovaComponentDescriptor<ToggleResolvedProps, ToggleApi, Record<string, never>, ToggleProps>

export type ToggleNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<ToggleProps>,
) => NovaComponentNode<ToggleResolvedProps, ToggleApi, Record<string, never>, ToggleProps, E>

export const TOGGLE_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  checked: { type: 'boolean' },
  label: { type: 'string' },
  onChange: { type: 'function' },
} as const

export function normalizeToggleProps(props: ToggleProps = {}): ToggleResolvedProps {
  return {
    ...normalizeCommonProps(props, {
      width: 148,
      height: 30,
      color: '#172033',
      accentColor: '#2563eb',
      trackColor: '#cbd5e1',
      thumbColor: '#ffffff',
      border: { color: '#cbd5e1', width: 1, radius: 999 },
    }),
    checked: props.checked ?? false,
    label: props.label ?? '',
    onChange: props.onChange,
  }
}

export function createToggleDescriptor(createNode?: ToggleNodeFactory): ToggleDescriptor {
  const descriptor: ToggleDescriptor = {
    type: TOGGLE_SCHEMA_TYPE,
    name: 'Toggle',
    title: 'Toggle',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'label'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'checked', 'onChange'],
    },
    fields: TOGGLE_FIELD_DEFINITIONS,
    normalize: schema => normalizeToggleProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeToggleProps),
  }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const TOGGLE_NODE_DESCRIPTOR = createToggleDescriptor()
