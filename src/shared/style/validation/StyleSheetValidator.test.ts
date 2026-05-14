import { describe, expect, it } from 'vitest'
import { validateNovaUiStyleSheetSource } from '@/shared/style/validation'

describe('Nova UI stylesheet validator', () => {
  it('parses comments, selector syntax and supported declarations', () => {
    const result = validateNovaUiStyleSheetSource(`
      /* Комментарии не мешают позициям diagnostics. */
      Root {
        padding: 24;
        color: #172033;
      }
      Grid.cards > TextBlock[variant="warning"] {
        fontSize: 16;
        background: #fef2f2;
        borderWidth: 1;
        borderRadius: 8;
      }
    `)

    expect(result.ok).toBe(true)
    expect(result.styleSheet?.rules).toHaveLength(2)
    expect(result.diagnostics).toHaveLength(0)
  })

  it('returns warning for unknown declaration without breaking valid rule', () => {
    const result = validateNovaUiStyleSheetSource(`
      TextBlock {
        unknownValue: 10;
        color: #123456;
      }
    `)

    expect(result.ok).toBe(true)
    expect(result.styleSheet?.rules).toHaveLength(1)
    expect(result.diagnostics[0]?.severity).toBe('warning')
    expect(result.diagnostics[0]?.code).toBe('unknown-declaration')
  })

  it('returns error for invalid values and drops compiled stylesheet', () => {
    const result = validateNovaUiStyleSheetSource(`
      TextBlock {
        fontSize: nope;
      }
    `)

    expect(result.ok).toBe(false)
    expect(result.styleSheet).toBeNull()
    expect(result.diagnostics[0]?.severity).toBe('error')
    expect(result.diagnostics[0]?.line).toBeGreaterThan(0)
    expect(result.diagnostics[0]?.column).toBeGreaterThan(0)
  })

  it('returns error for unknown component selector type', () => {
    const result = validateNovaUiStyleSheetSource(`
      UnknownComponent {
        color: #111111;
      }
    `)

    expect(result.ok).toBe(false)
    expect(result.styleSheet).toBeNull()
    expect(result.diagnostics[0]?.code).toBe('invalid-selector-part')
  })

  it('parses canvas media queries, display declarations and escaped class selectors', () => {
    const result = validateNovaUiStyleSheetSource(`
      .hidden { display: none; }
      .shown { display: normal; }
      .md\\:box { background: #123456; }

      @media (min-width: 900px) and (max-height: 600) {
        Flex.panel > TextBlock.title {
          display: normal;
          font-size: 18;
        }
      }
    `)

    expect(result.ok).toBe(true)
    expect(result.diagnostics).toHaveLength(0)
    expect(result.styleSheet?.rules).toHaveLength(4)
    expect(result.styleSheet?.rules[0]?.declarations.layout?.display).toBe('none')
    expect(result.styleSheet?.rules[2]?.selector.parts[0]?.classes).toEqual(['md:box'])
    expect(result.styleSheet?.rules[3]?.media?.features).toEqual([
      { name: 'min-width', value: 900 },
      { name: 'max-height', value: 600 },
    ])
  })

  it('diagnoses unsupported display values', () => {
    const result = validateNovaUiStyleSheetSource(`
      Flex {
        display: flex;
      }
    `)

    expect(result.ok).toBe(false)
    expect(result.diagnostics.some(item => item.code === 'unsupported-display')).toBe(true)
  })
})
