import type { NovaSchemaRegistry } from '@endge/nova'
import { createAdvancedComponent } from '@/components/Advanced/advanced'
import {
  ADVANCED_COMPONENT_FIELD_DEFINITIONS,
  createAdvancedComponentDescriptor,
  normalizeAdvancedComponentProps,
  type AdvancedComponentDescriptor,
} from '@/components/Advanced/advanced.config'
import type { AdvancedComponentKind, AdvancedComponentSchema } from '@/components/Advanced/advanced.types'

function createDescriptor(kind: AdvancedComponentKind): AdvancedComponentDescriptor {
  const descriptor = createAdvancedComponentDescriptor(kind, (context, schema) => {
    const advancedSchema = schema as AdvancedComponentSchema
    return createAdvancedComponent(
      context.app,
      context.surface,
      kind,
      normalizeAdvancedComponentProps(kind, advancedSchema.props),
      { componentId: advancedSchema.id },
      descriptor,
    )
  })

  return descriptor
}

export const SPEED_DIAL_DESCRIPTOR = createDescriptor('SpeedDial')
export const DOCK_DESCRIPTOR = createDescriptor('Dock')
export const CAROUSEL_DESCRIPTOR = createDescriptor('Carousel')
export const GALLERIA_DESCRIPTOR = createDescriptor('Galleria')
export const IMAGE_PREVIEW_DESCRIPTOR = createDescriptor('ImagePreview')
export const IMAGE_COMPARE_DESCRIPTOR = createDescriptor('ImageCompare')
export const SKELETON_DESCRIPTOR = createDescriptor('Skeleton')
export const PROGRESS_BAR_DESCRIPTOR = createDescriptor('ProgressBar')
export const PROGRESS_SPINNER_DESCRIPTOR = createDescriptor('ProgressSpinner')
export const METER_GROUP_DESCRIPTOR = createDescriptor('MeterGroup')
export const KNOB_DESCRIPTOR = createDescriptor('Knob')
export const TOGGLE_SWITCH_DESCRIPTOR = createDescriptor('ToggleSwitch')
export const RADIO_BUTTON_DESCRIPTOR = createDescriptor('RadioButton')
export const RATING_DESCRIPTOR = createDescriptor('Rating')
export const SELECT_BUTTON_DESCRIPTOR = createDescriptor('SelectButton')
export const DRAWER_DESCRIPTOR = createDescriptor('Drawer')
export const MESSAGE_DESCRIPTOR = createDescriptor('Message')
export const BLOCK_UI_DESCRIPTOR = createDescriptor('BlockUI')
export const ACCORDION_DESCRIPTOR = createDescriptor('Accordion')
export const FIELDSET_DESCRIPTOR = createDescriptor('Fieldset')
export const TABS_DESCRIPTOR = createDescriptor('Tabs')
export const STEPPER_DESCRIPTOR = createDescriptor('Stepper')

export const ADVANCED_COMPONENT_DESCRIPTORS: Array<AdvancedComponentDescriptor> = [
  SPEED_DIAL_DESCRIPTOR,
  DOCK_DESCRIPTOR,
  CAROUSEL_DESCRIPTOR,
  GALLERIA_DESCRIPTOR,
  IMAGE_PREVIEW_DESCRIPTOR,
  IMAGE_COMPARE_DESCRIPTOR,
  SKELETON_DESCRIPTOR,
  PROGRESS_BAR_DESCRIPTOR,
  PROGRESS_SPINNER_DESCRIPTOR,
  METER_GROUP_DESCRIPTOR,
  KNOB_DESCRIPTOR,
  TOGGLE_SWITCH_DESCRIPTOR,
  RADIO_BUTTON_DESCRIPTOR,
  RATING_DESCRIPTOR,
  SELECT_BUTTON_DESCRIPTOR,
  DRAWER_DESCRIPTOR,
  MESSAGE_DESCRIPTOR,
  BLOCK_UI_DESCRIPTOR,
  ACCORDION_DESCRIPTOR,
  FIELDSET_DESCRIPTOR,
  TABS_DESCRIPTOR,
  STEPPER_DESCRIPTOR,
]

export { ADVANCED_COMPONENT_FIELD_DEFINITIONS }

export function registerAdvancedComponents(registry: { register: (descriptor: AdvancedComponentDescriptor, options?: { override?: boolean }) => void }): void {
  for (const descriptor of ADVANCED_COMPONENT_DESCRIPTORS) {
    registry.register(descriptor, { override: true })
  }
}

export function registerAdvancedComponentSchemas(registry: NovaSchemaRegistry): void {
  registerAdvancedComponents(registry)
}
