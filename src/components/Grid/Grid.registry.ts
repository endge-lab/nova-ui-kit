import type { NovaSchemaRegistry } from '@endge/nova'
import { Grid } from '@/components/Grid/Grid'
import {
  GRID_FIELD_DEFINITIONS,
  createGridDescriptor,
  normalizeGridProps,
  type GridDescriptor,
} from '@/components/Grid/Grid.config'
import type { GridSchema } from '@/components/Grid/types'

export const GRID_DESCRIPTOR: GridDescriptor = createGridDescriptor((context, schema) => {
  const gridSchema = schema as GridSchema
  return new Grid(
    context.app,
    context.surface,
    normalizeGridProps(gridSchema.props),
    {
      componentId: gridSchema.id,
      children: gridSchema.children ?? [],
    },
    GRID_DESCRIPTOR,
  )
})

export { GRID_FIELD_DEFINITIONS }

/** Регистрирует Grid descriptor в Nova schema registry. */
export function registerGrid(registry: { register: (descriptor: GridDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(GRID_DESCRIPTOR, { override: true })
}

/** Регистрирует Grid в конкретном NovaSchemaRegistry. */
export function registerGridSchema(registry: NovaSchemaRegistry): void {
  registerGrid(registry)
}
