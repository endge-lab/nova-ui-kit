import { describe, expect, it } from 'vitest'
import {
  borderRadiusToRendererValue,
  diffInheritedTextStyle,
  inheritedTextStyleMask,
  mergeStyleContext,
  normalizeBorderRadius,
  NovaUiStyleMask,
  styleContextChangedMask,
  validateNovaUiStyleSheetSource,
} from '@/shared/style'

describe('примитивы стилей Nova UI', () => {
  it('нормализует число радиуса border и объект углов', () => {
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

  it('строит маски стиля из унаследованного стиля текста', () => {
    expect(inheritedTextStyleMask({
      color: '#fff',
      fontSize: 14,
      lineHeight: 20,
    })).toBe(NovaUiStyleMask.Color | NovaUiStyleMask.FontSize | NovaUiStyleMask.LineHeight)
  })

  it('сравнивает только изменённые ключи стиля внутри маски', () => {
    expect(diffInheritedTextStyle(
      { color: '#111', fontSize: 14, fontWeight: '400' },
      { color: '#222', fontSize: 14, fontWeight: '700' },
      NovaUiStyleMask.Color | NovaUiStyleMask.FontSize,
    )).toBe(NovaUiStyleMask.Color)
  })

  it('объединяет локальный стиль с родительским контекстом и сообщает изменённые ключи', () => {
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

  it('разбирает объявления курсора и крайние правые pseudo-selectors', () => {
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
