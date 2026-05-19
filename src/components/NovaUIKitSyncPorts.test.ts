// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Nova, RaphSchedulerType, RendererType, type NovaApp } from '@endge/nova'
import { NovaUIKit, type Panel, type Surface } from '@/index'
import { registerNovaUIKit } from '@/registerNovaUIKit'

type TestEvents = Record<string, any>

function create2DContextStub(): CanvasRenderingContext2D {
  return new Proxy({
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    createPattern: vi.fn(() => ({})),
  } as Record<PropertyKey, any>, {
    /**
     * Возвращает значение состояния текущего класса.
     */
    get(target, prop) {
      if (!(prop in target)) target[prop] = vi.fn()
      return target[prop]
    },
    /**
     * Обновляет значение состояния текущего класса.
     */
    set(target, prop, value) {
      target[prop] = value
      return true
    },
  }) as CanvasRenderingContext2D
}

function installCanvasMocks(): void {
  Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type: string) => {
    if (type === RendererType.Web2D) return create2DContextStub()
    return null
  })
}

function createApp(): NovaApp<TestEvents> {
  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  const app = Nova.createApp<TestEvents>({
    target: canvas,
    size: { width: 640, height: 360, dpr: 1 },
    renderer: { main: RendererType.Web2D },
    scheduler: { type: RaphSchedulerType.Sync, loop: false },
  })
  registerNovaUIKit(app.schema)
  return app
}

describe('Nova UI Kit sync ports', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    installCanvasMocks()
  })

  it('exposes common ports on UI Kit components and syncs props', () => {
    const app = createApp()
    const surface = app.createSurface('sync-uikit')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'root',
      props: { width: 640, height: 360 },
      children: [
        { type: NovaUIKit.Surface, id: 'source', props: { x: 10, y: 20, width: 120, height: 60, opacity: 1 } },
        { type: NovaUIKit.Panel, id: 'target', props: { x: 0, y: 0, width: 220, height: 140, opacity: 0.4 } },
        { type: NovaUIKit.Button, id: 'button', props: { text: 'Run', width: 96, height: 36 } },
        { type: NovaUIKit.Slider, id: 'slider', props: { value: 20, width: 160, height: 32 } },
      ],
    })

    expect(app.sync.resolvePort('#source.x')).toBeDefined()
    expect(app.sync.resolvePort('#target.layoutRect')).toBeDefined()
    expect(app.sync.resolvePort('#button.opacity')).toBeDefined()
    expect(app.sync.resolvePort('#slider.width')).toBeDefined()

    const source = app.components.require<Surface>('source')
    const target = app.components.require<Panel>('target')

    app.sync.link({ from: '#source.x', to: '#target.x' })
    app.sync.link({ from: '#source.opacity', to: '#target.opacity' })

    source.setProps({ x: 88, opacity: 0.7 })

    expect(target.getProps().x).toBe(88)
    expect(target.getProps().opacity).toBe(0.7)
    expect(target.x).toBe(88)
    expect(target.opacity).toBe(0.7)
    app.destroy()
  })

  it('syncs external layout rect updates without losing dirty invalidation', () => {
    const app = createApp()
    const surface = app.createSurface('sync-layout')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'root',
      props: { width: 640, height: 360 },
      children: [
        { type: NovaUIKit.Surface, id: 'source', props: { width: 120, height: 60 } },
        { type: NovaUIKit.Surface, id: 'target', props: { width: 90, height: 40 } },
      ],
    })

    const source = app.components.require<Surface>('source')
    const target = app.components.require<Surface>('target')
    const dirtySpy = vi.spyOn(target, 'dirty')

    app.sync.link({ from: '#source.layoutRect', to: '#target.layoutRect' })
    source.applyLayoutRect({ x: 32, y: 44, width: 210, height: 96 })

    expect(target.x).toBe(32)
    expect(target.y).toBe(44)
    expect(target.width).toBe(210)
    expect(target.height).toBe(96)
    expect(dirtySpy).toHaveBeenCalledWith({ matrix: true, update: true, render: true })
    app.destroy()
  })
})
