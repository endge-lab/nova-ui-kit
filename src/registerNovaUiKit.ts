import type { NovaSchemaRegistry } from '@endge/nova'
import { TEXT_BLOCK_DESCRIPTOR } from '@/components/TextBlock/TextBlock.registry'

const NOVA_UI_KIT_DESCRIPTORS = [
  TEXT_BLOCK_DESCRIPTOR,
]

export function registerNovaUiKit(registry: NovaSchemaRegistry): void {
  for (const descriptor of NOVA_UI_KIT_DESCRIPTORS) {
    registry.register(descriptor, { override: true })
  }
}
