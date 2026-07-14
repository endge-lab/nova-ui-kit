import { describe, expect, it, vi } from 'vitest'
import type { NovaNode } from '@endge/nova'
import {
  applyNodeLayoutRect,
  compileLayoutValue,
  copyRect,
  createLayoutRect,
  isNovaUiOutOfFlowPosition,
  readNovaUiNodeProps,
  rectEquals,
  resolveLayoutValue,
  resolveNovaUiPositionedRect,
  resolveSpacing,
} from '@/shared/layout'

describe('Nova UI layout primitives', () => {
  it('compiles and resolves percent, fill and px values', () => {
    expect(resolveLayoutValue(compileLayoutValue('100%', 0), 320, 0)).toBe(320)
    expect(resolveLayoutValue(compileLayoutValue('50%', 0), 320, 0)).toBe(160)
    expect(resolveLayoutValue(compileLayoutValue('fill', 0), 320, 0)).toBe(320)
    expect(resolveLayoutValue(compileLayoutValue(42, 0), 320, 0)).toBe(42)
  })

  it('normalizes spacing shorthands', () => {
    expect(resolveSpacing(12)).toEqual({ left: 12, right: 12, top: 12, bottom: 12 })
    expect(resolveSpacing({ all: 8 })).toEqual({ left: 8, right: 8, top: 8, bottom: 8 })
    expect(resolveSpacing({ horizontal: 10, vertical: 4 })).toEqual({ left: 10, right: 10, top: 4, bottom: 4 })
    expect(resolveSpacing({ left: 1, right: 2, top: 3, bottom: 4 })).toEqual({ left: 1, right: 2, top: 3, bottom: 4 })
  })

  it('reuses rect objects and detects equality', () => {
    const target = createLayoutRect()
    const source = { x: 1, y: 2, width: 3, height: 4 }

    copyRect(target, source)

    expect(target).toEqual(source)
    expect(rectEquals(target, source)).toBe(true)
    expect(rectEquals(target, { ...source, width: 5 })).toBe(false)
  })

  it('does not call options when fallback node rect is unchanged', () => {
    const options = vi.fn()
    const node = {
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      options,
    } as unknown as NovaNode<any>

    expect(applyNodeLayoutRect(node, { x: 1, y: 2, width: 3, height: 4 })).toBe(false)
    expect(options).not.toHaveBeenCalled()

    expect(applyNodeLayoutRect(node, { x: 1, y: 2, width: 5, height: 4 })).toBe(true)
    expect(options).toHaveBeenCalledWith({ x: 1, y: 2, width: 5, height: 4 })
  })

  it('syncs generated component props and node geometry for layout rects', () => {
    const setProps = vi.fn()
    const options = vi.fn()
    const node = {
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      setProps,
      options,
    } as unknown as NovaNode<any>

    expect(applyNodeLayoutRect(node, { x: 4, y: 8, width: 120, height: 48 })).toBe(true)
    expect(setProps).toHaveBeenCalledWith({ x: 4, y: 8, width: 120, height: 48 })
    expect(options).toHaveBeenCalledWith({ x: 4, y: 8, width: 120, height: 48 })
  })

  it('reads generated Nova SFC props when getProps is unavailable', () => {
    const node = {
      props: {
        className: 'h-48 shrink-0',
      },
    }

    expect(readNovaUiNodeProps(node)).toEqual({ className: 'h-48 shrink-0' })
  })

  it('resolves CSS-like positioned rects without affecting flow semantics', () => {
    const container = { x: 10, y: 20, width: 300, height: 200 }
    const fallback = { x: 30, y: 40, width: 80, height: 50 }

    expect(resolveNovaUiPositionedRect(container, fallback, { position: 'static' })).toEqual(fallback)
    expect(resolveNovaUiPositionedRect(container, fallback, { position: 'relative', inset: { left: 6, top: 4 } })).toEqual({
      x: 36,
      y: 44,
      width: 80,
      height: 50,
    })
    expect(resolveNovaUiPositionedRect(container, fallback, {
      position: 'absolute',
      inset: { top: 12, right: 16 },
      width: 90,
      height: 32,
    })).toEqual({
      x: 204,
      y: 32,
      width: 90,
      height: 32,
    })
    expect(resolveNovaUiPositionedRect(container, fallback, {
      position: 'absolute',
      inset: { left: 12, right: 18, top: 10, bottom: 20 },
    })).toEqual({
      x: 22,
      y: 30,
      width: 270,
      height: 170,
    })
    expect(isNovaUiOutOfFlowPosition('absolute')).toBe(true)
    expect(isNovaUiOutOfFlowPosition('relative')).toBe(false)
  })
})
