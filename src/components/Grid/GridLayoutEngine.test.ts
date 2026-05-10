import { describe, expect, it } from 'vitest'
import type { NovaNode } from '@endge/nova'
import { normalizeGridProps } from '@/components/Grid/Grid.config'
import {
  GridLayoutEngine,
  createGridChildEntry,
} from '@/components/Grid/GridLayoutEngine'
import type { GridChildLayout } from '@/components/Grid/Grid.types'
import { NOVA_UI_LAYOUT_TARGET } from '@/shared/layout'

function createNode(width = 0, height = 0): NovaNode<any> {
  return {
    width,
    height,
  } as NovaNode<any>
}

function createEntry(id: string, layout: GridChildLayout, width = 0, height = 0) {
  return createGridChildEntry(id, createNode(width, height), layout)
}

function createMeasuredEntry(id: string, layout: GridChildLayout, width: number, height: number) {
  const node = {
    width: 0,
    height: 0,
    [NOVA_UI_LAYOUT_TARGET]: true,
    applyLayoutRect: () => true,
    measureLayout: () => ({ width, height }),
  } as unknown as NovaNode<any>

  return createGridChildEntry(id, node, layout)
}

describe('GridLayoutEngine', () => {
  it('places children into fixed columns with padding and gap', () => {
    const engine = new GridLayoutEngine()
    const first = createEntry('first', {})
    const second = createEntry('second', {})
    const third = createEntry('third', {})
    const fourth = createEntry('fourth', {})

    const result = engine.compute({
      props: normalizeGridProps({ width: 978, height: 300, columns: 3, gap: 18, padding: 24, rowHeight: 96 }),
      width: 978,
      height: 300,
      entries: [first, second, third, fourth],
    })

    expect(result).toEqual({ columnCount: 3, rowCount: 2 })
    expect(first.nextRect).toEqual({ x: 24, y: 24, width: 298, height: 96 })
    expect(second.nextRect).toEqual({ x: 340, y: 24, width: 298, height: 96 })
    expect(third.nextRect).toEqual({ x: 656, y: 24, width: 298, height: 96 })
    expect(fourth.nextRect).toEqual({ x: 24, y: 138, width: 298, height: 96 })
  })

  it('changes column count in responsive mode', () => {
    const engine = new GridLayoutEngine()
    const entry = createEntry('first', {})
    const props = normalizeGridProps({
      responsive: true,
      minColumnWidth: 320,
      maxColumns: 3,
      gap: 18,
      rowHeight: 80,
    })

    expect(engine.compute({ props, width: 1104, height: 300, entries: [entry] }).columnCount).toBe(3)
    expect(entry.nextRect).toEqual({ x: 0, y: 0, width: 356, height: 80 })

    expect(engine.compute({ props, width: 700, height: 300, entries: [entry] }).columnCount).toBe(2)
    expect(entry.nextRect).toEqual({ x: 0, y: 0, width: 341, height: 80 })

    expect(engine.compute({ props, width: 300, height: 300, entries: [entry] }).columnCount).toBe(1)
    expect(entry.nextRect).toEqual({ x: 0, y: 0, width: 300, height: 80 })
  })

  it('supports colSpan and wraps to a new row when the span does not fit', () => {
    const engine = new GridLayoutEngine()
    const first = createEntry('first', { colSpan: 2 })
    const second = createEntry('second', {})
    const third = createEntry('third', {})

    engine.compute({
      props: normalizeGridProps({ width: 930, height: 200, columns: 3, columnGap: 15, rowGap: 10, rowHeight: 50 }),
      width: 930,
      height: 200,
      entries: [first, second, third],
    })

    expect(first.nextRect).toEqual({ x: 0, y: 0, width: 615, height: 50 })
    expect(second.nextRect).toEqual({ x: 630, y: 0, width: 300, height: 50 })
    expect(third.nextRect).toEqual({ x: 0, y: 60, width: 300, height: 50 })
  })

  it('uses measured auto height and stretches items to the row height', () => {
    const engine = new GridLayoutEngine()
    const first = createMeasuredEntry('first', { height: 'auto' }, 180, 44)
    const second = createMeasuredEntry('second', { height: 'auto' }, 180, 80)

    engine.compute({
      props: normalizeGridProps({ width: 500, height: 200, columns: 2, gap: 20, rowHeight: 'auto' }),
      width: 500,
      height: 200,
      entries: [first, second],
    })

    expect(first.nextRect).toEqual({ x: 0, y: 0, width: 240, height: 80 })
    expect(second.nextRect).toEqual({ x: 260, y: 0, width: 240, height: 80 })
  })
})
