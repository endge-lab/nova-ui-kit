import type { NovaSchemaRegistry } from '@endge/nova'
import { Badge } from '@/components/Badge/Badge'
import {
  BADGE_FIELD_DEFINITIONS,
  createBadgeDescriptor,
  normalizeBadgeProps,
  type BadgeDescriptor,
} from '@/components/Badge/badge.config'
import type { BadgeSchema } from '@/components/Badge/badge.types'

export const BADGE_DESCRIPTOR: BadgeDescriptor = createBadgeDescriptor((context, schema) => {
  const badgeSchema = schema as BadgeSchema
  return new Badge(
    context.app,
    context.surface,
    normalizeBadgeProps(badgeSchema.props),
    { componentId: badgeSchema.id },
    BADGE_DESCRIPTOR,
  )
})

export { BADGE_FIELD_DEFINITIONS }

export function registerBadge(registry: { register: (descriptor: BadgeDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(BADGE_DESCRIPTOR, { override: true })
}

export function registerBadgeSchema(registry: NovaSchemaRegistry): void {
  registerBadge(registry)
}

