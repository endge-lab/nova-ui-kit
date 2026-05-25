// @vitest-environment jsdom

import { Nova, RaphSchedulerType, RendererType, type NovaApp } from '@endge/nova'
import { afterAll, beforeAll, bench, describe, vi } from 'vitest'
import { NovaUIKit, registerNovaUIKit, type RootApi } from '@/index'
import type { Root } from '@/components/Root/Root'

const apps: Array<NovaApp<Record<string, any>>> = []
let root: Root<Record<string, any>>

describe('Nova UI Kit overlay registry benchmark', () => {
  bench('open/update/close 1000 lightweight overlays', () => {
    const api = root.getApi() as RootApi
    for (let index = 0; index < 1_000; index += 1) {
      const id = `overlay-${index}`
      api.openOverlay('bench', {
        id,
        value: index,
        anchor: { kind: 'pointer', x: 10 + (index % 20) * 8, y: 10 + (index % 10) * 8 },
      })
      api.updateOverlay(id, { width: 180 + (index % 4) * 10 })
      api.closeOverlay(id)
    }
    root.nova.raph.run()
  }, {
    iterations: 1,
    time: 100,
    warmupIterations: 0,
    warmupTime: 0,
  })
})

afterAll(() => {
  for (const app of apps.splice(0)) {
    app.destroy()
    app.canvas.element.remove()
  }
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
  root = createRoot()
})

function createRoot(): Root<Record<string, any>> {
  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  const app = Nova.createApp<Record<string, any>>({
    target: canvas,
    size: { width: 640, height: 360, maxDpr: 1 },
    input: {
      pointer: { enabled: false },
      keyboard: { enabled: false, scope: 'manual' },
    },
    renderer: { main: RendererType.Web2D },
    scheduler: { type: RaphSchedulerType.Sync, loop: false },
  })
  registerNovaUIKit(app.schema)
  apps.push(app)

  const surface = app.createSurface('overlay-bench')
  const node = app.schema.createNode(surface, {
    type: NovaUIKit.Root,
    id: 'overlay-bench-root',
    props: { width: 640, height: 360 },
    children: [
      {
        type: NovaUIKit.Overlays,
        id: 'overlay-bench-registry',
        props: {
          definitions: [
            {
              type: 'bench',
              props: { width: 180, height: 72, anchor: { kind: 'pointer', x: 0, y: 0 } },
            },
          ],
        },
      },
    ],
  })
  app.raph.run()
  return node as Root<Record<string, any>>
}

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
