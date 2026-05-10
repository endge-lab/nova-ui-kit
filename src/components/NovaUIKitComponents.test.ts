// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Nova,
  RaphSchedulerType,
  RendererType,
  type NovaApp,
} from '@endge/nova'
import {
  NovaUIKit,
  type ButtonApi,
  type CheckboxApi,
  type FlexApi,
  type GridApi,
  type PanelApi,
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
import { registerNovaUIKit } from '@/registerNovaUIKit'
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
  registerNovaUIKit(app.schema)
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
    const surface = app.createSurface('components')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
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
        { type: NovaUIKit.Surface, id: 'surface', props: { width: 160, height: 80 } },
        { type: NovaUIKit.Button, id: 'button', props: { text: 'Run' } },
        { type: NovaUIKit.Tag, id: 'tag', props: { text: 'Ready' } },
        {
          type: NovaUIKit.SplitPane,
          id: 'split',
          props: { width: 300, height: 140 },
          children: [
            { type: NovaUIKit.Surface, id: 'split-a', props: { background: '#f8fafc' } },
            { type: NovaUIKit.Surface, id: 'split-b', props: { background: '#eff6ff' } },
          ],
        },
        {
          type: NovaUIKit.ScrollArea,
          id: 'scroll-area',
          props: { width: 220, height: 120, contentHeight: 360 },
          children: [
            { type: NovaUIKit.Surface, id: 'scroll-content', props: { background: '#f8fafc' } },
          ],
        },
        { type: NovaUIKit.Scrollbar, id: 'scrollbar', props: { contentSize: 400, viewportSize: 100 } },
        { type: NovaUIKit.Slider, id: 'slider', props: { value: 25 } },
        { type: NovaUIKit.Checkbox, id: 'checkbox', props: { label: 'Enabled' } },
        { type: NovaUIKit.Toggle, id: 'toggle', props: { label: 'Live' } },
        {
          type: NovaUIKit.Tooltip,
          id: 'tooltip',
          props: { content: 'Tooltip', open: true },
          trigger: { type: NovaUIKit.Button, id: 'tooltip-trigger', props: { text: '?' } },
        },
        {
          type: NovaUIKit.SegmentedControl,
          id: 'segmented',
          props: {
            items: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
          },
        },
        {
          type: NovaUIKit.Panel,
          id: 'panel',
          props: { title: 'Panel' },
          children: [
            { type: NovaUIKit.TextBlock, id: 'panel-text', props: { text: 'Content' } },
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

  it('preserves keyed children and forwards schema context through UI Kit containers', () => {
    const app = createApp()
    const surface = app.createSurface('context')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'root',
      children: [
        {
          type: NovaUIKit.Grid,
          id: 'grid',
          children: [
            {
              type: NovaUIKit.TextBlock,
              id: 'row-a',
              key: 'row-a',
              context: { rowId: 'a' },
              props: { text: 'A' },
            },
          ],
        },
      ],
    })

    const grid = app.components.requireApi<GridApi>('grid')
    const first = app.components.require('row-a')
    expect(first.getContext<{ rowId: string }>().rowId).toBe('a')

    grid.setChildren([
      {
        type: NovaUIKit.TextBlock,
        id: 'row-a',
        key: 'row-a',
        context: { rowId: 'a2' },
        props: { text: 'A2' },
      },
    ])

    expect(app.components.require('row-a')).toBe(first)
    expect(first.getContext<{ rowId: string }>().rowId).toBe('a2')
    expect((first.getApi() as { getProps: () => { text: string } }).getProps().text).toBe('A2')

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
    const surface = app.createSurface('cursor-props')
    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'cursor-root',
      props: {
        cursor: { default: 'default' },
        cursorContext: { scope: 'root' },
      },
      children: [
        {
          type: NovaUIKit.Button,
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

  it('plays declarative sound props for core controls', async () => {
    vi.useFakeTimers()
    const app = createApp()
    const surface = app.createSurface('sound-props')
    await app.sound.load([
      { id: 'ui.press', src: 'press.ogg' },
      { id: 'ui.hover', src: 'hover.ogg' },
      { id: 'ui.change', src: 'change.ogg' },
      { id: 'ui.disabled', src: 'disabled.ogg' },
    ])

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'sound-root',
      props: { width: 520, height: 260 },
      children: [
        {
          type: NovaUIKit.Button,
          id: 'sound-button',
          props: {
            text: 'Play',
            sound: { press: 'ui.press', hover: 'ui.hover', disabledPress: 'ui.disabled' },
          },
        },
        {
          type: NovaUIKit.Button,
          id: 'sound-disabled-button',
          props: {
            text: 'Disabled',
            disabled: true,
            sound: { press: 'ui.press', disabledPress: 'ui.disabled' },
          },
        },
        { type: NovaUIKit.Toggle, id: 'sound-toggle', props: { sound: { change: 'ui.change' } } },
        { type: NovaUIKit.Checkbox, id: 'sound-checkbox', props: { sound: { change: 'ui.change' } } },
        { type: NovaUIKit.Slider, id: 'sound-slider', props: { value: 10, sound: { change: 'ui.change' } } },
        {
          type: NovaUIKit.SegmentedControl,
          id: 'sound-segmented',
          props: {
            width: 160,
            height: 32,
            sound: { hover: 'ui.hover', change: 'ui.change' },
            items: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
          },
        },
      ],
    })

    app.components.requireApi<ButtonApi>('sound-button').press()
    app.components.requireApi<ButtonApi>('sound-disabled-button').press()
    app.components.requireApi<ToggleApi>('sound-toggle').toggle()
    app.components.requireApi<CheckboxApi>('sound-checkbox').toggle()
    app.components.requireApi<SliderApi>('sound-slider').setValue(20)
    app.components.requireApi<SliderApi>('sound-slider').setValue(20)
    app.components.requireApi<SegmentedControlApi>('sound-segmented').setValue('b')
    app.components.requireApi<SegmentedControlApi>('sound-segmented').setValue('b')

    expect(app.sound.stats().played).toBe(6)

    const segmented = app.components.require('sound-segmented')
    segmented.eventHandlers.mousemove?.(new MouseEvent('mousemove', { clientX: 8, clientY: 8 }))
    segmented.eventHandlers.mousemove?.(new MouseEvent('mousemove', { clientX: 9, clientY: 8 }))

    expect(app.sound.stats().played).toBe(7)

    vi.advanceTimersByTime(1)
    app.destroy()
    vi.useRealTimers()
  })

  it('relayouts layout-target children inside visual containers', () => {
    const app = createApp()
    const surface = app.createSurface('containers')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'layout-root',
      props: { width: 520, height: 320, padding: 0 },
      children: [
        {
          type: NovaUIKit.Panel,
          id: 'layout-panel',
          props: { title: 'Panel', width: 520, height: 320, padding: 16 },
          children: [
            {
              type: NovaUIKit.Flex,
              id: 'layout-flow',
              props: { direction: 'row', wrap: 'wrap', gap: 10 },
              children: [
                { type: NovaUIKit.Surface, id: 'layout-card-a', props: {}, layout: { width: 100, height: 60, flexShrink: 0 } },
                { type: NovaUIKit.Surface, id: 'layout-card-b', props: {}, layout: { width: 100, height: 60, flexShrink: 0 } },
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
    const surface = app.createSurface('resizers')
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
