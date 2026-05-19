// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Nova,
  RaphSchedulerType,
  RendererType,
  type NovaApp,
} from '@endge/nova'
import type { ButtonApi } from '@/components/Button/button.types'
import { BUTTON_SCHEMA_TYPE } from '@/components/Button/button.types'
import { FLEX_SCHEMA_TYPE } from '@/components/Flex/flex.types'
import { GRID_SCHEMA_TYPE } from '@/components/Grid/grid.types'
import type { Flex } from '@/components/Flex/Flex'
import type { Root } from '@/components/Root/Root'
import { ROOT_SCHEMA_TYPE } from '@/components/Root/root.types'
import { SURFACE_SCHEMA_TYPE } from '@/components/Surface/surface.types'
import type { TextBlock } from '@/components/TextBlock/TextBlock'
import type { TextBlockApi } from '@/components/TextBlock/text-block.types'
import { TEXT_BLOCK_SCHEMA_TYPE } from '@/components/TextBlock/text-block.types'
import { registerNovaUIKit } from '@/registerNovaUIKit'

type TestEvents = Record<string, any>

function create2DContextStub(): CanvasRenderingContext2D {
  const state: Record<PropertyKey, any> = {
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    createPattern: vi.fn(() => ({})),
  }

  return new Proxy(state, {
    /**
     * Возвращает значение состояния текущего класса.
     */
    get(target, prop) {
      if (!(prop in target)) {
        target[prop] = vi.fn()
      }
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
  Object.defineProperty(window, 'devicePixelRatio', {
    value: 1,
    configurable: true,
  })

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type: string) => {
    if (type === RendererType.Web2D) return create2DContextStub()
    return null
  })

  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect(this: HTMLCanvasElement) {
    const width = this.width || 800
    const height = this.height || 480
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
}

function createApp(): NovaApp<TestEvents> {
  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)

  const app = Nova.createApp<TestEvents>({
    target: canvas,
    size: { width: 800, height: 480, dpr: 1 },
    renderer: {
      main: RendererType.Web2D,
    },
    scheduler: {
      type: RaphSchedulerType.Sync,
      loop: false,
    },
  })
  registerNovaUIKit(app.schema)
  return app
}

function textApi(app: NovaApp<TestEvents>, id: string): TextBlockApi {
  return app.components.requireApi<TextBlockApi>(id)
}

function buttonApi(app: NovaApp<TestEvents>, id: string): ButtonApi {
  return app.components.requireApi<ButtonApi>(id)
}

describe('Nova UI style propagation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    installCanvasMocks()
  })

  it('propagates color as render-only style and skips explicit color overrides', () => {
    const app = createApp()
    const surface = app.createSurface('style')
    const root = app.schema.createNode(surface, {
      type: ROOT_SCHEMA_TYPE,
      id: 'root',
      props: {
        style: { color: '#111111' },
      },
      children: [
        {
          type: TEXT_BLOCK_SCHEMA_TYPE,
          id: 'inherited',
          props: { text: 'Inherited' },
        },
        {
          type: TEXT_BLOCK_SCHEMA_TYPE,
          id: 'explicit',
          props: { text: 'Explicit', color: '#999999' },
        },
      ],
    }) as Root<TestEvents>
    const inherited = app.components.require<TextBlock<TestEvents>>('inherited')
    const explicit = app.components.require<TextBlock<TestEvents>>('explicit')
    const inheritedDirty = vi.spyOn(inherited, 'dirty')
    const explicitDirty = vi.spyOn(explicit, 'dirty')

    expect(textApi(app, 'inherited').getProps().color).toBe('#111111')
    expect(textApi(app, 'explicit').getProps().color).toBe('#999999')

    root.setProps({ style: { color: '#222222' } })

    expect(textApi(app, 'inherited').getProps().color).toBe('#222222')
    expect(textApi(app, 'explicit').getProps().color).toBe('#999999')
    expect(inheritedDirty).toHaveBeenCalledWith({ render: true })
    expect(inheritedDirty).not.toHaveBeenCalledWith({ update: true, render: true })
    expect(explicitDirty).not.toHaveBeenCalled()

    app.destroy()
  })

  it('requires Root for mounted UI Kit components', () => {
    const app = createApp()
    const surface = app.createSurface('style')

    expect(() => app.schema.createNode(surface, {
      type: TEXT_BLOCK_SCHEMA_TYPE,
      id: 'orphan-text',
      props: { text: 'Orphan' },
    })).toThrow('[Nova UI Kit]')

    app.destroy()
  })

  it('applies selector stylesheet by specificity', () => {
    const app = createApp()
    const surface = app.createSurface('style')

    app.schema.createNode(surface, {
      type: ROOT_SCHEMA_TYPE,
      id: 'root',
      props: {
        styleSheet: `
          TextBlock { color: #111111; fontSize: 13; }
          TextBlock.featured { color: #222222; }
          #target { color: #333333; fontSize: 18; }
        `,
      },
      children: [
        {
          type: TEXT_BLOCK_SCHEMA_TYPE,
          id: 'target',
          props: {
            text: 'Target',
            className: 'featured',
          },
        },
      ],
    })

    expect(textApi(app, 'target').getProps().color).toBe('#333333')
    expect(textApi(app, 'target').getProps().fontSize).toBe(18)

    app.destroy()
  })

  it('compiles pseudo cursor rules into node cursor declarations', () => {
    const app = createApp()
    const surface = app.createSurface('style')

    const root = app.schema.createNode(surface, {
      type: ROOT_SCHEMA_TYPE,
      id: 'root',
      props: {
        styleSheet: `
          Root { cursor: url("/cursors/cursor-pointer.svg", 2 2, default); }
          Button.resize:hover { cursor: component("ResizeCursor", { "axis": "x" }, 8 8); }
          Button.resize:pressed { cursor: pointer; }
          Button.resize { background: #f8fafc; }
        `,
      },
      children: [
        {
          type: BUTTON_SCHEMA_TYPE,
          id: 'resize-button',
          props: {
            className: 'resize',
            text: 'Resize',
          },
        },
      ],
    }) as Root<TestEvents>

    expect(root.getProps().cursor).toEqual({
      type: 'url',
      src: '/cursors/cursor-pointer.svg',
      hotspot: { x: 2, y: 2 },
      fallback: 'default',
    })
    expect(buttonApi(app, 'resize-button').getProps().cursor).toEqual({
      hover: {
        type: 'component',
        component: 'ResizeCursor',
        props: { axis: 'x' },
        hotspot: { x: 8, y: 8 },
      },
      pressed: 'pointer',
    })
    expect(buttonApi(app, 'resize-button').getProps().background).toBe('#f8fafc')

    app.destroy()
  })

  it('applies descendant and direct-child selectors', () => {
    const app = createApp()
    const surface = app.createSurface('style')

    app.schema.createNode(surface, {
      type: ROOT_SCHEMA_TYPE,
      id: 'root',
      props: {
        styleSheet: `
          Grid.cards TextBlock { color: #445566; }
          Grid.cards > TextBlock.note { fontWeight: 800; }
        `,
      },
      children: [
        {
          type: GRID_SCHEMA_TYPE,
          id: 'grid',
          props: {
            className: 'cards',
            columns: 1,
          },
          children: [
            {
              type: TEXT_BLOCK_SCHEMA_TYPE,
              id: 'note',
              props: {
                className: 'note',
                text: 'Note',
              },
            },
          ],
        },
      ],
    })

    expect(textApi(app, 'note').getProps().color).toBe('#445566')
    expect(textApi(app, 'note').getProps().fontWeight).toBe('800')

    app.destroy()
  })

  it('applies automatic responsive class variants against root width', () => {
    const app = createApp()
    const surface = app.createSurface('style')
    const root = app.schema.createNode(surface, {
      type: ROOT_SCHEMA_TYPE,
      id: 'root',
      props: {
        width: 700,
        height: 320,
        styleSheet: `
          .box { background: #123456; }
          @media (min-width: 900px) {
            .box { background: #abcdef; }
          }
        `,
      },
      children: [
        {
          type: SURFACE_SCHEMA_TYPE,
          id: 'panel',
          props: {
            className: 'md:box',
            width: 120,
            height: 80,
          },
        },
      ],
    }) as Root<TestEvents>
    const panel = app.components.require<any>('panel')
    const samePanel = panel

    expect(panel.getProps().background).toBe('#ffffff')

    root.setProps({ width: 800 })
    root.update()
    expect(app.components.require<any>('panel')).toBe(samePanel)
    expect(panel.getProps().background).toBe('#123456')

    root.setProps({ width: 920 })
    root.update()
    expect(app.components.require<any>('panel')).toBe(samePanel)
    expect(panel.getProps().background).toBe('#abcdef')

    app.destroy()
  })

  it('supports display utilities and excludes hidden children from Flex layout without churn', () => {
    const app = createApp()
    const surface = app.createSurface('style')
    const root = app.schema.createNode(surface, {
      type: ROOT_SCHEMA_TYPE,
      id: 'root',
      props: {
        width: 700,
        height: 200,
      },
      children: [
        {
          type: FLEX_SCHEMA_TYPE,
          id: 'row',
          props: {
            width: 300,
            height: 100,
            direction: 'row',
          },
          children: [
            {
              type: SURFACE_SCHEMA_TYPE,
              id: 'hidden',
              props: {
                className: 'hidden md:shown',
                width: 100,
                height: 100,
              },
            },
            {
              type: SURFACE_SCHEMA_TYPE,
              id: 'shown',
              props: {
                width: 100,
                height: 100,
              },
            },
          ],
        },
      ],
    }) as Root<TestEvents>
    const row = app.components.require<Flex<TestEvents>>('row')
    const hidden = app.components.require<any>('hidden')
    const shown = app.components.require<any>('shown')

    root.update()
    row.update()

    expect(hidden.getProps().display).toBe('none')
    expect(hidden.visible).toBe(false)
    expect(hidden.active).toBe(false)
    expect(shown.x).toBe(0)

    root.setProps({ width: 800 })
    root.update()
    row.update()

    expect(app.components.require<any>('hidden')).toBe(hidden)
    expect(hidden.getProps().display).toBe('normal')
    expect(hidden.visible).toBe(true)
    expect(hidden.active).toBe(true)
    expect(shown.x).toBe(100)

    app.destroy()
  })

  it('ignores invalid selector stylesheet and exposes diagnostics', () => {
    const app = createApp()
    const surface = app.createSurface('style')
    const root = app.schema.createNode(surface, {
      type: ROOT_SCHEMA_TYPE,
      id: 'root',
      props: {
        styleSheet: 'TextBlock { fontSize: nope; color: #111111; }',
      },
      children: [
        {
          type: TEXT_BLOCK_SCHEMA_TYPE,
          id: 'target',
          props: { text: 'Target' },
        },
      ],
    }) as Root<TestEvents>

    expect(root.getApi().getValidation().ok).toBe(false)
    expect(textApi(app, 'target').getProps().color).not.toBe('#111111')

    app.destroy()
  })

  it('propagates font size as layout-affecting style', () => {
    const app = createApp()
    const surface = app.createSurface('style')
    const root = app.schema.createNode(surface, {
      type: ROOT_SCHEMA_TYPE,
      id: 'root',
      children: [
        {
          type: TEXT_BLOCK_SCHEMA_TYPE,
          id: 'inherited',
          props: { text: 'Inherited' },
        },
        {
          type: TEXT_BLOCK_SCHEMA_TYPE,
          id: 'explicit',
          props: { text: 'Explicit', fontSize: 13 },
        },
      ],
    }) as Root<TestEvents>
    const inherited = app.components.require<TextBlock<TestEvents>>('inherited')
    const explicit = app.components.require<TextBlock<TestEvents>>('explicit')
    const inheritedDirty = vi.spyOn(inherited, 'dirty')
    const explicitDirty = vi.spyOn(explicit, 'dirty')

    root.setProps({ style: { fontSize: 18, lineHeight: 24 } })

    expect(textApi(app, 'inherited').getProps().fontSize).toBe(18)
    expect(textApi(app, 'inherited').getProps().lineHeight).toBe(24)
    expect(textApi(app, 'explicit').getProps().fontSize).toBe(13)
    expect(inheritedDirty).toHaveBeenCalledWith({ update: true, render: true })
    expect(explicitDirty).toHaveBeenCalledWith({ update: true, render: true })

    app.destroy()
  })

  it('propagates style through Grid children', () => {
    const app = createApp()
    const surface = app.createSurface('style')

    app.schema.createNode(surface, {
      type: ROOT_SCHEMA_TYPE,
      id: 'root',
      children: [
        {
          type: GRID_SCHEMA_TYPE,
          id: 'grid',
          props: {
            style: { color: '#336699' },
            columns: 1,
          },
          children: [
            {
              type: TEXT_BLOCK_SCHEMA_TYPE,
              id: 'grid-text',
              props: { text: 'Grid text' },
            },
          ],
        },
      ],
    })

    expect(textApi(app, 'grid-text').getProps().color).toBe('#336699')

    app.destroy()
  })

  it('skips subtree when nested container overrides changed style key', () => {
    const app = createApp()
    const surface = app.createSurface('style')
    const root = app.schema.createNode(surface, {
      type: ROOT_SCHEMA_TYPE,
      id: 'root',
      props: {
        style: { color: '#111111' },
      },
      children: [
        {
          type: FLEX_SCHEMA_TYPE,
          id: 'nested',
          props: {
            style: { color: '#abcdef' },
          },
          children: [
            {
              type: TEXT_BLOCK_SCHEMA_TYPE,
              id: 'nested-text',
              props: { text: 'Nested text' },
            },
          ],
        },
      ],
    }) as Root<TestEvents>
    const nestedText = app.components.require<TextBlock<TestEvents>>('nested-text')
    const nestedDirty = vi.spyOn(nestedText, 'dirty')

    root.setProps({ style: { color: '#222222' } })

    expect(textApi(app, 'nested-text').getProps().color).toBe('#abcdef')
    expect(nestedDirty).not.toHaveBeenCalled()

    app.destroy()
  })
})
