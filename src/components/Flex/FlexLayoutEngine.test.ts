import { describe, expect, it } from 'vitest'
import type { NovaNode } from '@endge/nova'
import { normalizeFlexProps } from '@/components/Flex/Flex.config'
import {
  FlexLayoutEngine,
  createFlexChildEntry,
} from '@/components/Flex/FlexLayoutEngine'
import type { FlexChildLayout } from '@/components/Flex/Flex.types'
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

describe('FlexLayoutEngine', () => {
  it('resolves child width 100 percent against inner width', () => {
    const engine = new FlexLayoutEngine()
    const entry = createEntry('full', { width: '100%', height: 40 })

    engine.compute({
      props: normalizeFlexProps({ width: 500, height: 120, padding: 10 }),
      width: 500,
      height: 120,
      entries: [entry],
    })

    expect(entry.nextRect).toEqual({ x: 10, y: 10, width: 480, height: 40 })
  })

  it('distributes free space with flexGrow', () => {
    const engine = new FlexLayoutEngine()
    const first = createEntry('first', { flexBasis: 100, height: 40, flexGrow: 1 })
    const second = createEntry('second', { flexBasis: 100, height: 40, flexGrow: 1 })

    engine.compute({
      props: normalizeFlexProps({ width: 800, height: 120, gap: 10 }),
      width: 800,
      height: 120,
      entries: [first, second],
    })

    expect(first.nextRect).toEqual({ x: 0, y: 0, width: 395, height: 40 })
    expect(second.nextRect).toEqual({ x: 405, y: 0, width: 395, height: 40 })
  })

  it('wraps entries into new rows with row gap', () => {
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

  it('shrinks overflowing entries with flexShrink', () => {
    const engine = new FlexLayoutEngine()
    const first = createEntry('first', { flexBasis: 200, height: 40, flexShrink: 1 })
    const second = createEntry('second', { flexBasis: 200, height: 40, flexShrink: 1 })

    engine.compute({
      props: normalizeFlexProps({ width: 310, height: 120, gap: 10 }),
      width: 310,
      height: 120,
      entries: [first, second],
    })

    expect(first.nextRect).toEqual({ x: 0, y: 0, width: 150, height: 40 })
    expect(second.nextRect).toEqual({ x: 160, y: 0, width: 150, height: 40 })
  })

  it('uses measureLayout for auto item size', () => {
    const engine = new FlexLayoutEngine()
    const entry = createMeasuredEntry('auto', { width: 'auto', height: 'auto' }, 180, 44)

    engine.compute({
      props: normalizeFlexProps({ width: 500, height: 120 }),
      width: 500,
      height: 120,
      entries: [entry],
    })

    expect(entry.nextRect).toEqual({ x: 0, y: 0, width: 180, height: 44 })
  })
})
