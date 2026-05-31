import type { NovaSchemaRegistry } from '@endge/nova'
import { ColorPicker } from '@/components/ColorPicker/ColorPicker'
import {
  COLOR_PICKER_FIELD_DEFINITIONS,
  createColorPickerDescriptor,
  normalizeColorPickerProps,
  type ColorPickerDescriptor,
} from '@/components/ColorPicker/color-picker.config'
import type { ColorPickerSchema } from '@/components/ColorPicker/color-picker.types'

export const COLOR_PICKER_DESCRIPTOR: ColorPickerDescriptor = createColorPickerDescriptor((context, schema) => {
  const colorPickerSchema = schema as ColorPickerSchema
  return new ColorPicker(
    context.app,
    context.surface,
    normalizeColorPickerProps(colorPickerSchema.props),
    { componentId: colorPickerSchema.id },
    COLOR_PICKER_DESCRIPTOR,
  )
})

export { COLOR_PICKER_FIELD_DEFINITIONS }

export function registerColorPicker(registry: { register: (descriptor: ColorPickerDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(COLOR_PICKER_DESCRIPTOR, { override: true })
}

export function registerColorPickerSchema(registry: NovaSchemaRegistry): void {
  registerColorPicker(registry)
}
