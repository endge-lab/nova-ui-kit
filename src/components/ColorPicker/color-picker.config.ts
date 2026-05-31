import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  normalizeCommonProps,
} from '@/shared/component'
import {
  COLOR_PICKER_SCHEMA_TYPE,
  type ColorPickerApi,
  type ColorPickerProps,
  type ColorPickerResolvedProps,
} from '@/components/ColorPicker/color-picker.types'
import { normalizeNovaUiColor } from '@/components/ColorPicker/color-picker-utils'

export type ColorPickerDescriptor = NovaComponentDescriptor<ColorPickerResolvedProps, ColorPickerApi, Record<string, never>, ColorPickerProps>

export type ColorPickerNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<ColorPickerProps>,
) => NovaComponentNode<ColorPickerResolvedProps, ColorPickerApi, Record<string, never>, ColorPickerProps, E>

export const COLOR_PICKER_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  value: { type: 'string' },
  presets: { type: 'array' },
  customOpen: { type: 'boolean' },
  format: { type: 'string' },
  allowAlpha: { type: 'boolean' },
} as const

export function resolveColorPickerHeight(customOpen: boolean): number {
  return customOpen ? 356 : 132
}

export function normalizeColorPickerProps(props: ColorPickerProps = {}): ColorPickerResolvedProps {
  const customOpen = props.customOpen ?? false
  return {
    ...normalizeCommonProps(props, {
      width: 260,
      height: props.height ?? resolveColorPickerHeight(customOpen),
      background: 'rgba(0,0,0,0)',
      color: 'var(--nova-ui-color, #172033)',
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 18,
    }),
    value: normalizeNovaUiColor(props.value ?? '#ffffff'),
    presets: props.presets ?? [],
    customOpen,
    format: props.format ?? 'hex',
    allowAlpha: props.allowAlpha ?? true,
    onValueChange: props.onValueChange,
    onCommit: props.onCommit,
    onCustomOpenChange: props.onCustomOpenChange,
  }
}

export function createColorPickerDescriptor(createNode?: ColorPickerNodeFactory): ColorPickerDescriptor {
  const descriptor: ColorPickerDescriptor = {
    type: COLOR_PICKER_SCHEMA_TYPE,
    name: 'ColorPicker',
    title: 'ColorPicker',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'customOpen'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'value', 'presets', 'format', 'allowAlpha'],
    },
    fields: COLOR_PICKER_FIELD_DEFINITIONS,
    normalize: schema => normalizeColorPickerProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeColorPickerProps),
  }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const COLOR_PICKER_NODE_DESCRIPTOR = createColorPickerDescriptor()
