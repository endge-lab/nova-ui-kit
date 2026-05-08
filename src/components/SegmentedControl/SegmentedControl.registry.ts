import type { NovaSchemaRegistry } from '@endge/nova'
import { SegmentedControl } from '@/components/SegmentedControl/SegmentedControl'
import {
  SEGMENTED_CONTROL_FIELD_DEFINITIONS,
  createSegmentedControlDescriptor,
  normalizeSegmentedControlProps,
  type SegmentedControlDescriptor,
} from '@/components/SegmentedControl/SegmentedControl.config'
import type { SegmentedControlSchema } from '@/components/SegmentedControl/types'

export const SEGMENTED_CONTROL_DESCRIPTOR: SegmentedControlDescriptor = createSegmentedControlDescriptor((context, schema) => {
  const segmentedSchema = schema as SegmentedControlSchema
  return new SegmentedControl(context.app, context.surface, normalizeSegmentedControlProps(segmentedSchema.props), { componentId: segmentedSchema.id }, SEGMENTED_CONTROL_DESCRIPTOR)
})

export { SEGMENTED_CONTROL_FIELD_DEFINITIONS }

export function registerSegmentedControl(registry: { register: (descriptor: SegmentedControlDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(SEGMENTED_CONTROL_DESCRIPTOR, { override: true })
}

export function registerSegmentedControlSchema(registry: NovaSchemaRegistry): void {
  registerSegmentedControl(registry)
}
