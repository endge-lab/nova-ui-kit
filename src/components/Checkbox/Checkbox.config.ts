import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  normalizeCommonProps,
} from '@/shared/component'
import {
  CHECKBOX_SCHEMA_TYPE,
  type CheckboxApi,
  type CheckboxProps,
  type CheckboxResolvedProps,
} from '@/components/Checkbox/Checkbox.types'

export type CheckboxDescriptor = NovaComponentDescriptor<CheckboxResolvedProps, CheckboxApi, Record<string, never>, CheckboxProps>

export type CheckboxNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<CheckboxProps>,
) => NovaComponentNode<CheckboxResolvedProps, CheckboxApi, Record<string, never>, CheckboxProps, E>

export const CHECKBOX_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  checked: { type: 'boolean' },
  indeterminate: { type: 'boolean' },
  label: { type: 'string' },
  onChange: { type: 'function' },
} as const

export function normalizeCheckboxProps(props: CheckboxProps = {}): CheckboxResolvedProps {
  return {
    ...normalizeCommonProps(props, {
      width: 160,
      height: 28,
      color: '#172033',
      accentColor: '#2563eb',
      background: '#ffffff',
      border: { color: '#cbd5e1', width: 1, radius: 4 },
      hoverBackground: '#f8fafc',
      pressedBackground: '#eff6ff',
    }),
    checked: props.checked ?? false,
    indeterminate: props.indeterminate ?? false,
    label: props.label ?? '',
    onChange: props.onChange,
  }
}

export function createCheckboxDescriptor(createNode?: CheckboxNodeFactory): CheckboxDescriptor {
  const descriptor: CheckboxDescriptor = {
    type: CHECKBOX_SCHEMA_TYPE,
    name: 'Checkbox',
    title: 'Checkbox',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'label'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'checked', 'indeterminate', 'onChange'],
    },
    fields: CHECKBOX_FIELD_DEFINITIONS,
    normalize: schema => normalizeCheckboxProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeCheckboxProps),
  }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const CHECKBOX_NODE_DESCRIPTOR = createCheckboxDescriptor()
