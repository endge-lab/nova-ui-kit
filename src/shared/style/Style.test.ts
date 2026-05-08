import { describe, expect, it } from 'vitest'
import {
  NovaUiStyleMask,
  borderRadiusToRendererValue,
  diffInheritedTextStyle,
  inheritedTextStyleMask,
  mergeStyleContext,
  normalizeBorderRadius,
  styleContextChangedMask,
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
})
