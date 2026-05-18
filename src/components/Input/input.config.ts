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
  sizeTokenHeight,
} from '@/shared/component'
import {
  INPUT_SCHEMA_TYPE,
  type InputApi,
  type InputComponentKind,
  type InputProps,
  type InputResolvedProps,
} from '@/components/Input/input.types'

export type InputDescriptor = NovaComponentDescriptor<
  InputResolvedProps,
  InputApi,
  Record<string, never>,
  InputProps
>

export type InputNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<InputProps>,
) => NovaComponentNode<InputResolvedProps, InputApi, Record<string, never>, InputProps, E>

export const INPUT_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  value: { type: 'any' },
  defaultValue: { type: 'any' },
  placeholder: { type: 'string' },
  readonly: { type: 'boolean' },
  required: { type: 'boolean' },
  autofocus: { type: 'boolean' },
  inputEngine: { type: 'string' },
  size: { type: 'string' },
  variant: { type: 'string' },
  align: { type: 'string' },
  maxLength: { type: 'number' },
  selectOnFocus: { type: 'boolean' },
  clearable: { type: 'boolean' },
  validation: { type: 'string' },
  validate: { type: 'function' },
  format: { type: 'function' },
  parse: { type: 'function' },
  onValueChange: { type: 'function' },
  onCommit: { type: 'function' },
  onCancel: { type: 'function' },
  onValidationChange: { type: 'function' },
  icon: { type: 'icon' },
  prefix: { type: 'string' },
  suffix: { type: 'string' },
  selectionColor: { type: 'string' },
  caretColor: { type: 'string' },
  placeholderColor: { type: 'string' },
  focusBorderColor: { type: 'string' },
  errorColor: { type: 'string' },
  revealable: { type: 'boolean' },
  onSearch: { type: 'function' },
  min: { type: 'number' },
  max: { type: 'number' },
  step: { type: 'number' },
  precision: { type: 'number' },
  minRows: { type: 'number' },
  maxRows: { type: 'number' },
  wrap: { type: 'boolean' },
  resize: { type: 'string' },
  label: { type: 'string' },
  hint: { type: 'string' },
  error: { type: 'string' },
  options: { type: 'array' },
  opened: { type: 'boolean' },
} as const

export function normalizeInputProps(props: InputProps = {}, kind: InputComponentKind = 'input'): InputResolvedProps {
  const size = props.size ?? 'md'
  const variant = props.variant ?? 'default'
  const defaults = resolveInputDefaults(variant, size, kind)
  const common = normalizeCommonProps(props, defaults)

  return {
    ...common,
    value: props.value,
    defaultValue: props.defaultValue,
    placeholder: props.placeholder ?? (kind === 'search' ? 'Search' : ''),
    readonly: props.readonly ?? false,
    required: props.required ?? false,
    autofocus: props.autofocus ?? false,
    inputEngine: props.inputEngine ?? 'auto',
    size,
    variant,
    align: props.align ?? 'left',
    maxLength: props.maxLength,
    selectOnFocus: props.selectOnFocus ?? false,
    clearable: props.clearable ?? (kind === 'search'),
    validation: props.validation ?? 'onBlur',
    validate: props.validate,
    format: props.format,
    parse: props.parse,
    onValueChange: props.onValueChange,
    onCommit: props.onCommit,
    onCancel: props.onCancel,
    onValidationChange: props.onValidationChange,
    icon: props.icon,
    prefix: props.prefix,
    suffix: props.suffix,
    selectionColor: props.selectionColor ?? 'rgba(37, 99, 235, 0.22)',
    caretColor: props.caretColor ?? '#2563eb',
    placeholderColor: props.placeholderColor ?? '#94a3b8',
    focusBorderColor: props.focusBorderColor ?? '#2563eb',
    errorColor: props.errorColor ?? '#dc2626',
    revealable: props.revealable ?? kind === 'password',
    onSearch: props.onSearch,
    min: props.min,
    max: props.max,
    step: finiteNumber(props.step, 1),
    precision: props.precision,
    minRows: Math.max(1, Math.floor(finiteNumber(props.minRows, 3))),
    maxRows: Math.max(1, Math.floor(finiteNumber(props.maxRows, 8))),
    wrap: props.wrap ?? true,
    resize: props.resize ?? 'none',
    label: props.label,
    hint: props.hint,
    error: props.error,
    options: props.options ?? [],
    opened: props.opened ?? false,
  }
}

export function createInputDescriptor(
  type = INPUT_SCHEMA_TYPE,
  name = 'Input',
  kind: InputComponentKind = 'input',
  createNode?: InputNodeFactory,
): InputDescriptor {
  const descriptor: InputDescriptor = {
    type,
    name,
    title: name,
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [
        ...NOVA_UI_COMMON_DIRTY_POLICY.update,
        'value',
        'defaultValue',
        'size',
        'variant',
        'minRows',
        'maxRows',
      ],
      render: [
        ...NOVA_UI_COMMON_DIRTY_POLICY.render,
        'placeholder',
        'readonly',
        'required',
        'inputEngine',
        'align',
        'maxLength',
        'selectOnFocus',
        'clearable',
        'validation',
        'icon',
        'prefix',
        'suffix',
        'selectionColor',
        'caretColor',
        'placeholderColor',
        'focusBorderColor',
        'errorColor',
        'revealable',
        'min',
        'max',
        'step',
        'precision',
        'wrap',
        'resize',
        'label',
        'hint',
        'error',
        'options',
        'opened',
      ],
    },
    fields: INPUT_FIELD_DEFINITIONS,
    normalize: schema => normalizeInputProps(schema.props, kind),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, props => normalizeInputProps(props, kind)),
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const INPUT_NODE_DESCRIPTOR = createInputDescriptor()

function resolveInputDefaults(variant: InputResolvedProps['variant'], size: InputResolvedProps['size'], kind: InputComponentKind) {
  const height = kind === 'textarea' ? 104 : kind === 'field' ? 74 : sizeTokenHeight(size, 34)
  const base = {
    width: kind === 'textarea' ? 320 : kind === 'field' ? 320 : 220,
    height,
    color: '#172033',
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: size === 'sm' ? 12 : size === 'lg' ? 15 : 13,
    fontWeight: '500' as const,
    lineHeight: size === 'sm' ? 16 : size === 'lg' ? 22 : 18,
    padding: { horizontal: size === 'lg' ? 14 : 10, vertical: size === 'lg' ? 9 : 7 },
    accentColor: '#2563eb',
    hoverBackground: '#f8fafc',
    pressedBackground: '#eef2ff',
    cursor: { hover: 'text', pressed: 'text', disabled: 'not-allowed' },
  }
  if (variant === 'filled') {
    return {
      ...base,
      background: '#f1f5f9',
      border: { color: '#cbd5e1', width: 1, radius: 8 },
    }
  }
  if (variant === 'ghost') {
    return {
      ...base,
      background: 'rgba(255,255,255,0)',
      border: { color: 'rgba(148,163,184,0)', width: 1, radius: 8 },
      hoverBackground: 'rgba(148,163,184,0.12)',
    }
  }
  if (variant === 'underline') {
    return {
      ...base,
      background: 'rgba(255,255,255,0)',
      border: { color: '#cbd5e1', width: 1, radius: 0 },
    }
  }
  return {
    ...base,
    background: '#ffffff',
    border: { color: '#cbd5e1', width: 1, radius: 8 },
  }
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
