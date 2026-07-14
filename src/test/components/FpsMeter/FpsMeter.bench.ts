// @vitest-environment jsdom

import { Nova, RaphSchedulerType, RendererType, type NovaApp, type NovaNode } from '@endge/nova'
import { afterAll, beforeAll, bench, describe, vi } from 'vitest'
import { NovaUIKit, registerNovaUIKit } from '@/index'

const apps: Array<NovaApp<Record<string, any>>> = []
let app: NovaApp<Record<string, any>>

describe('Nova UI Kit FPS meter benchmark', () => {
  bench('render 1000 fps meter frame updates', () => {
    const node = app.components.require('fps-bench') as unknown as NovaNode<Record<string, any>>
    for (let index = 0; index < 1_000; index += 1) {
      node.dirty({ render: true })
      app.raph.run()
    }
  }, {
    iterations: 1,
    time: 100,
    warmupIterations: 0,
    warmupTime: 0,
  })
})

beforeAll(() => {
  Object.defineProperty(window, 'devicePixelRatio', {
    value: 1,
    configurable: true,
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type: string) => {
    if (type === RendererType.Web2D) return create2DContextStub()
    return null
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect(this: HTMLCanvasElement) {
    const width = this.width || 640
    const height = this.height || 360
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => ({}),
    } as DOMRect
  })

  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  app = Nova.createApp<Record<string, any>>({
    target: canvas,
    size: { width: 640, height: 360, maxDpr: 1 },
    renderer: { main: RendererType.Web2D },
    scheduler: { type: RaphSchedulerType.Sync, loop: false },
  })
  registerNovaUIKit(app.schema)
  apps.push(app)
  const surface = app.createSurface('fps-bench')
  app.schema.createNode(surface, {
    type: NovaUIKit.FpsMeter,
    id: 'fps-bench',
    props: { placement: 'top-right' },
  })
  app.raph.run()
})

afterAll(() => {
  for (const activeApp of apps.splice(0)) {
    activeApp.destroy()
    activeApp.canvas.element.remove()
  }
})

function create2DContextStub(): CanvasRenderingContext2D {
  const state: Record<PropertyKey, any> = {
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    createPattern: vi.fn(() => ({})),
  }
  return new Proxy(state, {
    get(target, prop) {
      if (!(prop in target)) target[prop] = vi.fn()
      return target[prop]
    },
    set(target, prop, value) {
      target[prop] = value
      return true
    },
  }) as CanvasRenderingContext2D
}
