import { describe, expect, it } from 'vitest'
import { layoutTextBlock, normalizeTextBlockProps } from '@/components/TextBlock/TextBlockLayout'
import type { TextBlockMeasureFn } from '@/components/TextBlock/TextBlock.types'

const measureText: TextBlockMeasureFn = text => text.length * 8

describe('TextBlock layout', () => {
  it('wraps normal text into stable lines', () => {
    const props = normalizeTextBlockProps({
      text: 'alpha beta gamma',
      width: 76,
      height: 80,
      fontSize: 12,
      lineHeight: 20,
      padding: 4,
    })

    const layout = layoutTextBlock(props, measureText)

    expect(layout.lines.map(line => line.text)).toEqual(['alpha', 'beta', 'gamma'])
    expect(layout.overflowed).toBe(false)
  })

  it('clips nowrap text with ellipsis', () => {
    const props = normalizeTextBlockProps({
      text: 'abcdefghij',
      width: 52,
      height: 32,
      lineHeight: 18,
      whiteSpace: 'nowrap',
      overflow: 'ellipsis',
      padding: 4,
    })

    const layout = layoutTextBlock(props, measureText)

    expect(layout.lines).toHaveLength(1)
    expect(layout.lines[0].text.endsWith('...')).toBe(true)
    expect(layout.overflowed).toBe(true)
  })

  it('preserves newlines with pre-wrap', () => {
    const props = normalizeTextBlockProps({
      text: 'first\nsecond line',
      width: 120,
      height: 80,
      whiteSpace: 'pre-wrap',
      lineHeight: 18,
    })

    const layout = layoutTextBlock(props, measureText)

    expect(layout.lines[0].text).toBe('first')
    expect(layout.lines[1].text).toBe('second line')
  })

  it('respects maxLines and marks overflow', () => {
    const props = normalizeTextBlockProps({
      text: 'one two three four five six',
      width: 72,
      height: 120,
      lineHeight: 18,
      maxLines: 2,
      overflow: 'ellipsis',
    })

    const layout = layoutTextBlock(props, measureText)

    expect(layout.lines).toHaveLength(2)
    expect(layout.lines[1].text.endsWith('...')).toBe(true)
    expect(layout.overflowed).toBe(true)
  })
})
