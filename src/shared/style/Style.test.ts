import { describe, expect, it } from 'vitest'
import {
  NovaUiStyleMask,
  borderRadiusToRendererValue,
  diffInheritedTextStyle,
  inheritedTextStyleMask,
  mergeStyleContext,
  normalizeBorderRadius,
  styleContextChangedMask,
  validateNovaUiStyleSheetSource,
} from '@/shared/style'

describe('Nova UI style primitives', () => {
  it('normalizes border radius number and corner object', () => {
    expect(normalizeBorderRadius(12)).toBe(12)
    expect(normalizeBorderRadius({
      topLeft: 12,
      topRight: 8,
      bottomRight: 4,
      bottomLeft: 2,
    })).toEqual({
      topLeft: 12,
      topRight: 8,
      bottomRight: 4,
      bottomLeft: 2,
    })
    expect(borderRadiusToRendererValue({
      topLeft: 12,
      topRight: 8,
      bottomRight: 4,
      bottomLeft: 2,
    })).toBe(12)
  })

  it('builds style masks from inherited text style', () => {
    expect(inheritedTextStyleMask({
      color: '#fff',
      fontSize: 14,
      lineHeight: 20,
    })).toBe(NovaUiStyleMask.Color | NovaUiStyleMask.FontSize | NovaUiStyleMask.LineHeight)
  })

  it('diffs only changed style keys inside mask', () => {
    expect(diffInheritedTextStyle(
      { color: '#111', fontSize: 14, fontWeight: '400' },
      { color: '#222', fontSize: 14, fontWeight: '700' },
      NovaUiStyleMask.Color | NovaUiStyleMask.FontSize,
    )).toBe(NovaUiStyleMask.Color)
  })

  it('merges local style into parent context and reports changed keys', () => {
    const parent = {
      values: {
        color: '#111',
        fontSize: 14,
      },
      mask: NovaUiStyleMask.Color | NovaUiStyleMask.FontSize,
      version: 3,
    }
    const next = mergeStyleContext(parent, {
      color: '#333',
      fontFamily: 'Inter',
    })

    expect(next.values).toEqual({
      color: '#333',
      fontSize: 14,
      fontFamily: 'Inter',
    })
    expect(next.mask).toBe(NovaUiStyleMask.Color | NovaUiStyleMask.FontSize | NovaUiStyleMask.FontFamily)
    expect(styleContextChangedMask(parent, next)).toBe(NovaUiStyleMask.Color | NovaUiStyleMask.FontFamily)
  })

  it('parses cursor declarations and right-most pseudo selectors', () => {
    const result = validateNovaUiStyleSheetSource(`
      Root {
        cursor: url("/cursors/cursor-pointer.svg", 2 2, default);
      }

      Surface.resize-x:hover {
        cursor: component("ResizeCursor", { "axis": "x" }, 8 8);
      }

      Surface.resize-x:dragging {
        cursor: component("ResizeCursor", { "axis": "x", "active": true }, 8 8);
      }
    `)

    expect(result.diagnostics).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.styleSheet?.rules[0]?.declarations.cursor).toEqual({
      type: 'url',
      src: '/cursors/cursor-pointer.svg',
      hotspot: { x: 2, y: 2 },
      fallback: 'default',
    })
    expect(result.styleSheet?.rules[1]?.selector.parts[0]?.pseudos).toEqual(['hover'])
    expect(result.styleSheet?.rules[1]?.declarations.cursor).toEqual({
      type: 'component',
      component: 'ResizeCursor',
      props: { axis: 'x' },
      hotspot: { x: 8, y: 8 },
    })
    expect(result.styleSheet?.rules[2]?.selector.parts[0]?.pseudos).toEqual(['dragging'])
  })
})
