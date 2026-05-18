// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { NovaUIKit, registerNovaUIKit } from '@/index'
import { normalizeInputProps } from '@/components/Input/input.config'
import {
  INPUT_DESCRIPTORS,
  INPUT_DESCRIPTOR,
  NUMBER_INPUT_DESCRIPTOR,
  TEXT_AREA_DESCRIPTOR,
} from '@/components/Input/input.registry'

describe('Nova UI Kit input components', () => {
  it('normalizes common input defaults', () => {
    const props = normalizeInputProps({ placeholder: 'Name' })

    expect(props.inputEngine).toBe('auto')
    expect(props.placeholder).toBe('Name')
    expect(props.variant).toBe('default')
    expect(props.validation).toBe('onBlur')
    expect(props.clearable).toBe(false)
  })

  it('normalizes search, number and textarea specifics', () => {
    expect(normalizeInputProps({}, 'search').clearable).toBe(true)
    expect(normalizeInputProps({ step: 5 }, 'number').step).toBe(5)
    expect(normalizeInputProps({ minRows: 2, maxRows: 5 }, 'textarea')).toMatchObject({
      minRows: 2,
      maxRows: 5,
      wrap: true,
    })
  })

  it('registers all input descriptors through UI Kit registration', () => {
    const registered: Array<string> = []
    const registry = {
      reserveTag: (_name: string) => {},
      register: (descriptor: any) => registered.push(descriptor.type),
    }

    registerNovaUIKit(registry as any)

    for (const descriptor of INPUT_DESCRIPTORS) {
      expect(registered).toContain(descriptor.type)
    }
    expect(NovaUIKit.Input).toBe(INPUT_DESCRIPTOR.type)
    expect(NovaUIKit.NumberInput).toBe(NUMBER_INPUT_DESCRIPTOR.type)
    expect(NovaUIKit.TextArea).toBe(TEXT_AREA_DESCRIPTOR.type)
  })
})
