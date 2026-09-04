import type { NovaNode } from '@endge/nova'
import type { FlexChildLayout } from '@/components/Flex/flex.types'
import { describe, expect, it } from 'vitest'
import { normalizeFlexProps } from '@/components/Flex/flex.config'
import {
  createFlexChildEntry,
  FlexLayoutEngine,
} from '@/components/Flex/FlexLayoutEngine'
import { NOVA_UI_LAYOUT_TARGET } from '@/shared/layout'

function createNode(width = 0, height = 0): NovaNode<any> {
  return {
    width,
    height,
  } as NovaNode<any>
}

function createEntry(id: string, layout: FlexChildLayout, width = 0, height = 0) {
  return createFlexChildEntry(id, createNode(width, height), layout)
}

function createMeasuredEntry(id: string, layout: FlexChildLayout, width: number, height: number) {
  const node = {
    width: 0,
    height: 0,
    [NOVA_UI_LAYOUT_TARGET]: true,
    applyLayoutRect: () => true,
    measureLayout: () => ({ width, height }),
  } as unknown as NovaNode<any>

  return createFlexChildEntry(id, node, layout)
}

describe('движок layout Flex', () => {
  it('разрешает ширину дочернего узла 100 процентов относительно внутренней ширины', () => {
    const engine = new FlexLayoutEngine()
    const entry = createEntry('full', { width: '100%', height: 40 })

    engine.compute({
      props: normalizeFlexProps({ width: 500, height: 120, padding: 10, alignItems: 'start' }),
      width: 500,
      height: 120,
      entries: [entry],
    })

    expect(entry.nextRect).toEqual({ x: 10, y: 10, width: 480, height: 40 })
  })

  it('распределяет свободное пространство через flexGrow', () => {
    const engine = new FlexLayoutEngine()
    const first = createEntry('first', { flexBasis: 100, height: 40, flexGrow: 1 })
    const second = createEntry('second', { flexBasis: 100, height: 40, flexGrow: 1 })

    engine.compute({
      props: normalizeFlexProps({ width: 800, height: 120, gap: 10, alignItems: 'start' }),
      width: 800,
      height: 120,
      entries: [first, second],
    })

    expect(first.nextRect).toEqual({ x: 0, y: 0, width: 395, height: 40 })
    expect(second.nextRect).toEqual({ x: 405, y: 0, width: 395, height: 40 })
  })

  it('переносит элементы в новые строки с row gap', () => {
    const engine = new FlexLayoutEngine()
    const first = createEntry('first', { flexBasis: 320, height: 40 })
    const second = createEntry('second', { flexBasis: 320, height: 40 })
    const third = createEntry('third', { flexBasis: 320, height: 40 })

    engine.compute({
      props: normalizeFlexProps({ width: 700, height: 200, wrap: 'wrap', gap: 10 }),
      width: 700,
      height: 200,
      entries: [first, second, third],
    })

    expect(first.nextRect).toEqual({ x: 0, y: 0, width: 320, height: 40 })
    expect(second.nextRect).toEqual({ x: 330, y: 0, width: 320, height: 40 })
    expect(third.nextRect).toEqual({ x: 0, y: 50, width: 320, height: 40 })
  })

  it('уменьшает переполняющие элементы через flexShrink', () => {
    const engine = new FlexLayoutEngine()
    const first = createEntry('first', { flexBasis: 200, height: 40, flexShrink: 1 })
    const second = createEntry('second', { flexBasis: 200, height: 40, flexShrink: 1 })

    engine.compute({
      props: normalizeFlexProps({ width: 310, height: 120, gap: 10, alignItems: 'start' }),
      width: 310,
      height: 120,
      entries: [first, second],
    })

    expect(first.nextRect).toEqual({ x: 0, y: 0, width: 150, height: 40 })
    expect(second.nextRect).toEqual({ x: 160, y: 0, width: 150, height: 40 })
  })

  it('использует measureLayout для автоматического размера элемента', () => {
    const engine = new FlexLayoutEngine()
    const entry = createMeasuredEntry('auto', { width: 'auto', height: 'auto' }, 180, 44)

    engine.compute({
      props: normalizeFlexProps({ width: 500, height: 120, alignItems: 'start' }),
      width: 500,
      height: 120,
      entries: [entry],
    })

    expect(entry.nextRect).toEqual({ x: 0, y: 0, width: 180, height: 44 })
  })
})
