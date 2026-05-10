import type { NovaSchemaRegistry } from '@endge/nova'
import { Slider } from '@/components/Slider/Slider'
import {
  SLIDER_FIELD_DEFINITIONS,
  createSliderDescriptor,
  normalizeSliderProps,
  type SliderDescriptor,
} from '@/components/Slider/Slider.config'
import type { SliderSchema } from '@/components/Slider/Slider.types'

export const SLIDER_DESCRIPTOR: SliderDescriptor = createSliderDescriptor((context, schema) => {
  const sliderSchema = schema as SliderSchema
  return new Slider(context.app, context.surface, normalizeSliderProps(sliderSchema.props), { componentId: sliderSchema.id }, SLIDER_DESCRIPTOR)
})

export { SLIDER_FIELD_DEFINITIONS }

export function registerSlider(registry: { register: (descriptor: SliderDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(SLIDER_DESCRIPTOR, { override: true })
}

export function registerSliderSchema(registry: NovaSchemaRegistry): void {
  registerSlider(registry)
}
