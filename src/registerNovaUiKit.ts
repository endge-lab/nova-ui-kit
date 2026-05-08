import type { NovaComponentDescriptor, NovaSchemaRegistry } from '@endge/nova'
import { FLEX_DESCRIPTOR } from '@/components/Flex/Flex.registry'
import { TEXT_BLOCK_DESCRIPTOR } from '@/components/TextBlock/TextBlock.registry'

const NOVA_UI_KIT_DESCRIPTORS: Array<NovaComponentDescriptor<any, any, any, any>> = [
  FLEX_DESCRIPTOR,
  TEXT_BLOCK_DESCRIPTOR,
]

export function registerNovaUiKit(registry: NovaSchemaRegistry): void {
  for (const descriptor of NOVA_UI_KIT_DESCRIPTORS) {
    registry.register(descriptor, { override: true })
  }
}
