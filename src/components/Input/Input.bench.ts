import { bench, describe } from 'vitest'
import { normalizeInputProps } from '@/components/Input/input.config'

describe('Nova UI Kit input benchmarks', () => {
  bench('normalize 10k input props', () => {
    for (let index = 0; index < 10_000; index += 1) {
      normalizeInputProps({
        value: index,
        placeholder: `Input ${index}`,
        variant: index % 2 ? 'filled' : 'default',
        clearable: index % 3 === 0,
      })
    }
  })
})
