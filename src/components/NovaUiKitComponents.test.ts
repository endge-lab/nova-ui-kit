// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Nova,
  RaphSchedulerType,
  RendererType,
  type NovaApp,
} from '@endge/nova'
import {
  NovaUiKit,
  type ButtonApi,
  type CheckboxApi,
  type PanelApi,
  type FlexApi,
  type ScrollAreaApi,
  type ScrollbarApi,
  type SegmentedControlApi,
  type SliderApi,
  type SplitPaneApi,
  type TagApi,
  type ToggleApi,
  type TooltipApi,
  validateNovaUiStyleSheetSource,
} from '@/index'
import { registerNovaUiKit } from '@/registerNovaUiKit'
import { normalizeButtonProps } from '@/components/Button/Button.config'
import { normalizeCheckboxProps } from '@/components/Checkbox/Checkbox.config'
import { normalizePanelProps } from '@/components/Panel/Panel.config'
import { normalizeScrollAreaProps } from '@/components/ScrollArea/ScrollArea.config'
import { normalizeScrollbarProps } from '@/components/Scrollbar/Scrollbar.config'
import { normalizeSegmentedControlProps } from '@/components/SegmentedControl/SegmentedControl.config'
import { normalizeSliderProps } from '@/components/Slider/Slider.config'
import { normalizeSplitPaneProps } from '@/components/SplitPane/SplitPane.config'
import { normalizeSurfaceProps } from '@/components/Surface/Surface.config'
import { normalizeTagProps } from '@/components/Tag/Tag.config'
import { normalizeToggleProps } from '@/components/Toggle/Toggle.config'
import { normalizeTooltipProps } from '@/components/Tooltip/Tooltip.config'
import { RowResizer } from '@/components/RowResizer/RowResizer'
import { ColResizer } from '@/components/ColResizer/ColResizer'

type TestEvents = Record<string, any>

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
    size: { width: 900, height: 560, dpr: 1 },
    renderer: {
      main: RendererType.Web2D,
    },
    scheduler: {
      type: RaphSchedulerType.Sync,
      loop: false,
    },
  })
  registerNovaUiKit(app.schema)
  return app
}

describe('Nova UI Kit components', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    installCanvasMocks()
  })

  it('registers and exposes APIs for all new component schemas', () => {
    const app = createApp()
    const surface = app.createSurface2D('components')

    app.schema.createNode(surface, {
      type: NovaUiKit.Root,
      id: 'root',
      props: {
        styleSheet: `
          Surface, Panel, Button, Tag, Checkbox, Toggle, Slider, Scrollbar, ScrollArea, SplitPane, Tooltip, SegmentedControl {
            color: #123456;
            accentColor: #2563eb;
            trackColor: #dbe4ef;
            thumbColor: #ffffff;
            hoverBackground: #f8fafc;
            pressedBackground: #e2e8f0;
            activeBackground: #eff6ff;
            disabledOpacity: 0.35;
          }
        `,
      },
      children: [
        { type: NovaUiKit.Surface, id: 'surface', props: { width: 160, height: 80 } },
        { type: NovaUiKit.Button, id: 'button', props: { text: 'Run' } },
        { type: NovaUiKit.Tag, id: 'tag', props: { text: 'Ready' } },
        {
          type: NovaUiKit.SplitPane,
          id: 'split',
          props: { width: 300, height: 140 },
          children: [
            { type: NovaUiKit.Surface, id: 'split-a', props: { background: '#f8fafc' } },
            { type: NovaUiKit.Surface, id: 'split-b', props: { background: '#eff6ff' } },
          ],
        },
        {
          type: NovaUiKit.ScrollArea,
          id: 'scroll-area',
          props: { width: 220, height: 120, contentHeight: 360 },
          children: [
            { type: NovaUiKit.Surface, id: 'scroll-content', props: { background: '#f8fafc' } },
          ],
        },
        { type: NovaUiKit.Scrollbar, id: 'scrollbar', props: { contentSize: 400, viewportSize: 100 } },
        { type: NovaUiKit.Slider, id: 'slider', props: { value: 25 } },
        { type: NovaUiKit.Checkbox, id: 'checkbox', props: { label: 'Enabled' } },
        { type: NovaUiKit.Toggle, id: 'toggle', props: { label: 'Live' } },
        {
          type: NovaUiKit.Tooltip,
          id: 'tooltip',
          props: { content: 'Tooltip', open: true },
          trigger: { type: NovaUiKit.Button, id: 'tooltip-trigger', props: { text: '?' } },
        },
        {
          type: NovaUiKit.SegmentedControl,
          id: 'segmented',
          props: {
            items: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
          },
        },
        {
          type: NovaUiKit.Panel,
          id: 'panel',
          props: { title: 'Panel' },
          children: [
            { type: NovaUiKit.TextBlock, id: 'panel-text', props: { text: 'Content' } },
          ],
        },
      ],
    })

    app.components.requireApi<ButtonApi>('button').setSelected(true)
    app.components.requireApi<TagApi>('tag').setTone('success')
    app.components.requireApi<SplitPaneApi>('split').setSizes([120, 180])
    app.components.requireApi<ScrollAreaApi>('scroll-area').scrollTo(0, 80)
    app.components.requireApi<ScrollbarApi>('scrollbar').setValue(40)
    app.components.requireApi<SliderApi>('slider').setValue(50)
    app.components.requireApi<CheckboxApi>('checkbox').toggle()
    app.components.requireApi<ToggleApi>('toggle').toggle()
    app.components.requireApi<TooltipApi>('tooltip').close()
    app.components.requireApi<SegmentedControlApi>('segmented').setValue('b')
    app.components.requireApi<PanelApi>('panel').setTitle('Updated')

    expect(app.components.requireApi<ButtonApi>('button').getProps().selected).toBe(true)
    expect(app.components.requireApi<TagApi>('tag').getProps().tone).toBe('success')
    expect(app.components.requireApi<ScrollAreaApi>('scroll-area').getScrollState().y.value).toBe(80)
    expect(app.components.requireApi<ScrollbarApi>('scrollbar').getScrollState().value).toBe(40)
    expect(app.components.requireApi<SliderApi>('slider').getProps().value).toBe(50)
    expect(app.components.requireApi<CheckboxApi>('checkbox').getProps().checked).toBe(true)
    expect(app.components.requireApi<ToggleApi>('toggle').getProps().checked).toBe(true)
    expect(app.components.requireApi<TooltipApi>('tooltip').getProps().open).toBe(false)
    expect(app.components.requireApi<SegmentedControlApi>('segmented').getProps().value).toBe('b')
    expect(app.components.requireApi<PanelApi>('panel').getProps().title).toBe('Updated')

    app.destroy()
  })

  it('normalizes component props and stylesheet declarations under load', () => {
    const cursor = {
      hover: 'pointer',
      dragging: { type: 'component', component: 'ResizeCursor', props: { axis: 'x' }, hotspot: { x: 8, y: 8 } },
      disabled: 'not-allowed',
    } as const
    const buttonProps = normalizeButtonProps({ cursor, cursorContext: { axis: 'x' } })
    const verticalSliderProps = normalizeSliderProps({ orientation: 'vertical' })

    expect(buttonProps.cursor).toBe(cursor)
    expect(buttonProps.cursorContext).toEqual({ axis: 'x' })
    expect(verticalSliderProps.cursor).toEqual({
      hover: 'ns-resize',
      pressed: 'ns-resize',
      dragging: 'ns-resize',
      disabled: 'not-allowed',
    })

    const normalizers = [
      normalizeSurfaceProps,
      normalizeButtonProps,
      normalizeTagProps,
      normalizeSplitPaneProps,
      normalizeScrollAreaProps,
      normalizeScrollbarProps,
      normalizeSliderProps,
      normalizeCheckboxProps,
      normalizeToggleProps,
      normalizeTooltipProps,
      normalizeSegmentedControlProps,
      normalizePanelProps,
    ]

    const start = performance.now()
    for (let index = 0; index < 1_000; index += 1) {
      for (const normalize of normalizers) {
        normalize({
          width: 120 + (index % 40),
          height: 32,
          color: '#123456',
          accentColor: '#2563eb',
          disabledOpacity: 0.4,
        } as never)
      }
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(250)

    const validation = validateNovaUiStyleSheetSource(`
      Button.primary, Slider, Scrollbar, Toggle[disabled=true] {
        accentColor: #2563eb;
        trackColor: #dbe4ef;
        thumbColor: #ffffff;
        hoverBackground: #f8fafc;
        pressedBackground: #e2e8f0;
        activeBackground: #eff6ff;
        disabledOpacity: 0.35;
      }
    `)
    expect(validation.ok).toBe(true)
    expect(validation.styleSheet?.rules.length).toBe(4)
  })

  it('creates schema nodes with common cursor props', () => {
    const app = createApp()
    const surface = app.createSurface2D('cursor-props')
    app.schema.createNode(surface, {
      type: NovaUiKit.Root,
      id: 'cursor-root',
      props: {
        cursor: { default: 'default' },
        cursorContext: { scope: 'root' },
      },
      children: [
        {
          type: NovaUiKit.Button,
          id: 'cursor-button',
          props: {
            text: 'Cursor',
            cursor: {
              hover: 'pointer',
              pressed: { type: 'component', component: 'PressCursor' },
            },
            cursorContext: { axis: 'x' },
          },
        },
      ],
    })

    expect(app.components.requireApi<ButtonApi>('cursor-button').getProps().cursor).toEqual({
      hover: 'pointer',
      pressed: { type: 'component', component: 'PressCursor' },
    })
    expect(app.components.requireApi<ButtonApi>('cursor-button').getProps().cursorContext).toEqual({ axis: 'x' })

    app.destroy()
  })

  it('relayouts layout-target children inside visual containers', () => {
    const app = createApp()
    const surface = app.createSurface2D('containers')

    app.schema.createNode(surface, {
      type: NovaUiKit.Root,
      id: 'layout-root',
      props: { width: 520, height: 320, padding: 0 },
      children: [
        {
          type: NovaUiKit.Panel,
          id: 'layout-panel',
          props: { title: 'Panel', width: 520, height: 320, padding: 16 },
          children: [
            {
              type: NovaUiKit.Flex,
              id: 'layout-flow',
              props: { direction: 'row', wrap: 'wrap', gap: 10 },
              children: [
                { type: NovaUiKit.Surface, id: 'layout-card-a', props: {}, layout: { width: 100, height: 60, flexShrink: 0 } },
                { type: NovaUiKit.Surface, id: 'layout-card-b', props: {}, layout: { width: 100, height: 60, flexShrink: 0 } },
              ],
            },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const flow = app.components.requireApi<FlexApi>('layout-flow')
    expect(flow.getChildRect('layout-card-a')).toEqual({ x: 0, y: 0, width: 100, height: 60 })
    expect(flow.getChildRect('layout-card-b')).toEqual({ x: 110, y: 0, width: 100, height: 60 })

    app.destroy()
  })

  it('keeps RowResizer and ColResizer legacy creation signatures while accepting professional options', () => {
    const app = createApp()
    const surface = app.createSurface2D('resizers')
    const row = RowResizer.create(app, surface, {
      x: 10,
      y: 20,
      width: 240,
      height: 8,
      color: '#94a3b8',
      hoverColor: '#2563eb',
      activeColor: '#1d4ed8',
      hitSize: 12,
      overlayColor: 'rgba(37,99,235,0.14)',
    })
    const col = ColResizer.create(app, surface, {
      x: 30,
      y: 40,
      width: 8,
      height: 220,
      color: '#94a3b8',
      disabled: true,
    })
    const rowStart = vi.fn()
    const colEnd = vi.fn()

    row.onChangeStart(rowStart).options({ disabled: false, motion: false })
    col.onChangeEnd(colEnd).options({ disabled: false, hitSize: 14 })

    expect(row.__type).toBe('RowResizer')
    expect(col.__type).toBe('ColResizer')
    expect(row.x).toBe(10)
    expect(row.y).toBe(20)
    expect(col.width).toBe(8)
    expect(col.height).toBe(220)

    app.destroy()
  })
})
