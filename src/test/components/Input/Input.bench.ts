import { bench, describe } from 'vitest'
import {
  layoutNovaTextInput,
  novaCaretRectAtIndex,
  novaTextIndexAtPoint,
  splitGraphemes,
} from '@endge/nova'
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

  bench('layout 1k centered proportional input fields', () => {
    const measureText = createMeasuredText({ W: 12, i: 3, '.': 4, ' ': 4, m: 11 })
    for (let index = 0; index < 1_000; index += 1) {
      layoutNovaTextInput({
        text: `Wi. mixed ${index}`,
        width: 260,
        height: 36,
        align: 'center',
        fontSize: 13,
        lineHeight: 18,
        padding: { left: 10, right: 10, top: 9, bottom: 9 },
        measureText,
      })
    }
  })

  bench('100k centered proportional caret/index lookups', () => {
    const layout = layoutNovaTextInput({
      text: 'Review Wi. service iii task '.repeat(20),
      width: 320,
      height: 120,
      multiline: true,
      wrap: true,
      align: 'center',
      fontSize: 13,
      lineHeight: 18,
      padding: 10,
      measureText: createMeasuredText({ W: 12, i: 3, '.': 4, ' ': 4, m: 11 }),
    })
    for (let index = 0; index < 100_000; index += 1) {
      const caret = novaCaretRectAtIndex(layout, index % layout.text.length)
      novaTextIndexAtPoint(layout, caret.x, caret.y + 2)
    }
  })
})

function createMeasuredText(widths: Record<string, number>) {
  return (text: string): number => splitGraphemes(text)
    .reduce((sum, segment) => sum + (widths[segment.value] ?? segment.value.length * 7), 0)
}
