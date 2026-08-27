import type { NovaSchemaRegistry } from '@endge/nova'
import type { SliderDescriptor } from '@/components/Slider/slider.config'
import type { SliderSchema } from '@/components/Slider/slider.types'
import { Slider } from '@/components/Slider/Slider'
import {
  createSliderDescriptor,
  normalizeSliderProps,
  SLIDER_FIELD_DEFINITIONS,

} from '@/components/Slider/slider.config'

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
