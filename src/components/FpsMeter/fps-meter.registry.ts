import type { NovaSchemaRegistry } from '@endge/nova'
import { FpsMeter } from '@/components/FpsMeter/FpsMeter'
import {
  createFpsMeterDescriptor,
  normalizeFpsMeterProps,
  type FpsMeterDescriptor,
} from '@/components/FpsMeter/fps-meter.config'
import type { FpsMeterSchema } from '@/components/FpsMeter/fps-meter.types'

export const FPS_METER_DESCRIPTOR: FpsMeterDescriptor = createFpsMeterDescriptor((context, schema) => {
  const fpsSchema = schema as FpsMeterSchema
  return new FpsMeter(
    context.app,
    context.surface,
    normalizeFpsMeterProps(fpsSchema.props),
    { componentId: fpsSchema.id },
    FPS_METER_DESCRIPTOR,
  )
})

export function registerFpsMeter(registry: { register: (descriptor: FpsMeterDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(FPS_METER_DESCRIPTOR, { override: true })
}

export function registerFpsMeterSchema(registry: NovaSchemaRegistry): void {
  registerFpsMeter(registry)
}
