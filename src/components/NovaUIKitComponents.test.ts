// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Nova,
  NovaComponent,
  NovaNode,
  RaphSchedulerType,
  RendererType,
  type NovaApp,
} from '@endge/nova'
import {
  NovaUIKit,
  type ActionListApi,
  type BadgeApi,
  type ButtonApi,
  type CheckboxApi,
  type ChipApi,
  type DialogApi,
  type FlexApi,
  type GridApi,
  type ImageApi,
  type PanelApi,
  type RootApi,
  type ScrollAreaApi,
  type ScrollbarApi,
  type SegmentedControlApi,
  type SliderApi,
  type SplitPaneApi,
  type TagApi,
  type TextBlockApi,
  type ToggleApi,
  type ToastRegionApi,
  type TooltipApi,
  type PopoverApi,
  registerNovaUiGlobalStyleSheet,
  validateNovaUiStyleSheetSource,
} from '@/index'
import { registerNovaUIKit } from '@/registerNovaUIKit'
import { normalizeBadgeProps } from '@/components/Badge/badge.config'
import { normalizeButtonProps } from '@/components/Button/button.config'
import { normalizeCheckboxProps } from '@/components/Checkbox/checkbox.config'
import { normalizeImageProps } from '@/components/Image/image.config'
import { normalizePanelProps } from '@/components/Panel/panel.config'
import { normalizeScrollAreaProps } from '@/components/ScrollArea/scroll-area.config'
import { normalizeScrollbarProps } from '@/components/Scrollbar/scrollbar.config'
import { normalizeSegmentedControlProps } from '@/components/SegmentedControl/segmented-control.config'
import { normalizeSliderProps } from '@/components/Slider/slider.config'
import { normalizeSplitPaneProps } from '@/components/SplitPane/split-pane.config'
import { normalizeSurfaceProps } from '@/components/Surface/surface.config'
import { normalizeTagProps } from '@/components/Tag/tag.config'
import { normalizeToggleProps } from '@/components/Toggle/toggle.config'
import { normalizeTooltipProps } from '@/components/Tooltip/tooltip.config'
import { RowResizer } from '@/components/RowResizer/RowResizer'
import { ColResizer } from '@/components/ColResizer/ColResizer'

type TestEvents = Record<string, any>

/**
 * Описывает Nova-node InspectorCardNode и его runtime-поведение.
 */
@NovaComponent({ tag: 'InspectorCard' })
class InspectorCardNode extends NovaNode<TestEvents> {
  /**
   * Выполняет отрисовку InspectorCardNode.
   */
  render(): void {}
}

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

function createCanvasDrawable(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 24
  canvas.height = 24
  return canvas
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
          Surface, Panel, Button, Tag, Chip, Checkbox, Toggle, Slider, Scrollbar, ScrollArea, SplitPane, Tooltip, Popover, ActionList, Dialog, Toast, ToastRegion, SegmentedControl {
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
        { type: NovaUIKit.Badge, id: 'badge', props: { value: 3 } },
        { type: NovaUIKit.Image, id: 'image', props: { src: createCanvasDrawable(), radius: 8 } },
        { type: NovaUIKit.Tag, id: 'tag', props: { text: 'Ready' } },
        { type: NovaUIKit.Chip, id: 'chip', props: { label: 'Filter', removable: true } },
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
        {
          type: NovaUIKit.Popover,
          id: 'popover',
          props: { open: true, anchor: { kind: 'rect', x: 24, y: 24, width: 80, height: 32 }, width: 180, height: 90 },
          children: [{ type: NovaUIKit.TextBlock, id: 'popover-text', props: { text: 'Custom panel' } }],
        },
        {
          type: NovaUIKit.ActionList,
          id: 'action-list',
          props: {
            items: [
              { id: 'copy', label: 'Copy', shortcut: '⌘C' },
              { type: 'separator' },
              { id: 'delete', label: 'Delete', tone: 'danger' },
            ],
          },
        },
        {
          type: NovaUIKit.Dialog,
          id: 'dialog',
          props: { open: true, title: 'Dialog', draggable: true, resizable: true },
          children: [{ type: NovaUIKit.TextBlock, id: 'dialog-body', props: { text: 'Body' } }],
        },
        {
          type: NovaUIKit.ToastRegion,
          id: 'toast-region',
          props: { autoDismiss: false, items: [{ id: 'saved', title: 'Saved', message: 'Done', tone: 'success' }] },
        },
      ],
    })

    app.components.requireApi<ButtonApi>('button').setSelected(true)
    app.components.requireApi<BadgeApi>('badge').setValue(4)
    app.components.requireApi<ImageApi>('image').setSrc(createCanvasDrawable())
    app.components.requireApi<TagApi>('tag').setTone('success')
    app.components.requireApi<ChipApi>('chip').setSelected(true)
    app.components.requireApi<SplitPaneApi>('split').setSizes([120, 180])
    app.components.requireApi<ScrollAreaApi>('scroll-area').scrollTo(0, 80)
    app.components.requireApi<ScrollbarApi>('scrollbar').setValue(40)
    app.components.requireApi<SliderApi>('slider').setValue(50)
    app.components.requireApi<CheckboxApi>('checkbox').toggle()
    app.components.requireApi<ToggleApi>('toggle').toggle()
    app.components.requireApi<TooltipApi>('tooltip').close()
    app.components.requireApi<PopoverApi>('popover').close()
    app.components.requireApi<ActionListApi>('action-list').focusNext()
    app.components.requireApi<DialogApi>('dialog').resizeTo(440, 280)
    app.components.requireApi<ToastRegionApi>('toast-region').push({ id: 'queued', title: 'Queued' })
    app.components.requireApi<SegmentedControlApi>('segmented').setValue('b')
    app.components.requireApi<PanelApi>('panel').setTitle('Updated')

    expect(app.components.requireApi<ButtonApi>('button').getProps().selected).toBe(true)
    expect(app.components.requireApi<BadgeApi>('badge').getProps().value).toBe(4)
    expect(app.components.requireApi<ImageApi>('image').getProps().radius).toBe(8)
    expect(app.components.requireApi<TagApi>('tag').getProps().tone).toBe('success')
    expect(app.components.requireApi<ChipApi>('chip').getProps().selected).toBe(true)
    expect(app.components.requireApi<ScrollAreaApi>('scroll-area').getScrollState().y.value).toBe(80)
    expect(app.components.requireApi<ScrollbarApi>('scrollbar').getScrollState().value).toBe(40)
    expect(app.components.requireApi<SliderApi>('slider').getProps().value).toBe(50)
    expect(app.components.requireApi<CheckboxApi>('checkbox').getProps().checked).toBe(true)
    expect(app.components.requireApi<ToggleApi>('toggle').getProps().checked).toBe(true)
    expect(app.components.requireApi<TooltipApi>('tooltip').getProps().open).toBe(false)
    expect(app.components.requireApi<PopoverApi>('popover').getProps().open).toBe(false)
    expect(app.components.requireApi<ActionListApi>('action-list').getProps().activeIndex).toBe(2)
    expect(app.components.requireApi<DialogApi>('dialog').getProps().open).toBe(true)
    expect(app.components.requireApi<ToastRegionApi>('toast-region').getProps().items).toHaveLength(2)
    expect(app.components.requireApi<SegmentedControlApi>('segmented').getProps().value).toBe('b')
    expect(app.components.requireApi<PanelApi>('panel').getProps().title).toBe('Updated')

    app.destroy()
  })

  it('keeps closed popovers out of hit-test and hides their action children', () => {
    const app = createApp()
    const surface = app.createSurface('popover-hit-test')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'popover-hit-root',
      props: { width: 300, height: 120 },
      children: [
        {
          type: NovaUIKit.Button,
          id: 'popover-hit-button',
          props: { text: 'Saved views', width: 120, height: 32 },
        },
        {
          type: NovaUIKit.Popover,
          id: 'popover-hit-popover',
          props: {
            open: false,
            width: 300,
            height: 120,
            anchor: { kind: 'rect', x: 0, y: 34, width: 120, height: 32 },
            placement: 'bottom-start',
          },
          children: [
            {
              type: NovaUIKit.ActionList,
              id: 'popover-hit-list',
              props: {
                items: [
                  { id: 'data-1', label: 'Данные 1' },
                  { id: 'data-2', label: 'Данные 2' },
                ],
              },
            },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const button = app.components.require('popover-hit-button') as unknown as NovaNode<TestEvents>
    const popover = app.components.require('popover-hit-popover') as unknown as NovaNode<TestEvents>
    const list = app.components.require('popover-hit-list') as unknown as NovaNode<TestEvents>

    expect(popover.active).toBe(false)
    expect(popover.visible).toBe(false)
    expect(list.active).toBe(false)
    expect(list.visible).toBe(false)
    expect(app.events.hitTest(8, 8)).toBe(button)

    app.components.requireApi<PopoverApi>('popover-hit-popover').open()
    app.raph.run()
    app.raph.run()

    expect(popover.active).toBe(true)
    expect(popover.visible).toBe(true)
    expect(list.active).toBe(true)
    expect(list.visible).toBe(true)
    expect(app.events.hitTest(8, 8)).toBe(popover)

    popover.eventHandlers.mousedown?.(new MouseEvent('mousedown', { clientX: 8, clientY: 8 }))
    expect(app.components.requireApi<PopoverApi>('popover-hit-popover').getProps().open).toBe(false)
    app.raph.run()
    app.raph.run()

    expect(popover.active).toBe(false)
    expect(popover.visible).toBe(false)
    expect(app.events.hitTest(8, 8)).toBe(button)

    app.destroy()
  })

  it('accepts mixed constructor and string children inside Root, Panel and SplitPane containers', () => {
    const app = createApp()
    const surface = app.createSurface('mixed-children')
    Nova.registerComponents(app.schema, InspectorCardNode)

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'mixed-root',
      children: [
        {
          type: NovaUIKit.Panel,
          id: 'mixed-panel',
          props: { title: 'Mixed' },
          children: [
            {
              type: NovaUIKit.SplitPane,
              id: 'mixed-split',
              props: { width: 300, height: 120 },
              children: [
                { type: InspectorCardNode, id: 'left-inspector', props: { side: 'left' } },
                { type: 'InspectorCard', id: 'right-inspector', props: { side: 'right' } },
              ],
            },
          ],
        },
      ],
    })

    expect((app.components.api<any>('left-inspector') as { props: Record<string, any> }).props.side).toBe('left')
    expect((app.components.api<any>('right-inspector') as { props: Record<string, any> }).props.side).toBe('right')
    app.destroy()
  })

  it('renders ScrollArea default chrome and custom thumb slots without replacing slot identity', () => {
    const app = createApp()
    const surface = app.createSurface('scroll-area-slots')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'scroll-slot-root',
      children: [
        {
          type: NovaUIKit.ScrollArea,
          id: 'scroll-default',
          props: { width: 220, height: 120, contentHeight: 360 },
          children: [
            { type: NovaUIKit.Surface, id: 'scroll-default-content', props: { background: '#f8fafc' } },
          ],
        },
        {
          type: NovaUIKit.ScrollArea,
          id: 'scroll-custom',
          props: { y: 140, width: 220, height: 120, contentHeight: 360, scrollbarVisibility: 'active' },
          slots: {
            thumb: scope => [
              {
                type: NovaUIKit.Surface,
                id: `custom-thumb-${scope?.orientation}`,
                key: scope?.orientation,
                props: {
                  x: scope?.thumbRect.x,
                  y: scope?.thumbRect.y,
                  width: scope?.thumbRect.width,
                  height: scope?.thumbRect.height,
                  opacity: scope?.state.opacity,
                  background: '#2563eb',
                  border: { width: 0, radius: 999 },
                },
              },
            ],
          },
          children: [
            { type: NovaUIKit.Surface, id: 'scroll-custom-content', props: { background: '#f8fafc' } },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    expect(app.components.api<ScrollbarApi>('scroll-default-scrollbar-y')).toBeTruthy()
    expect(app.components.api<ScrollbarApi>('scroll-custom-scrollbar-y')).toBeUndefined()

    const api = app.components.requireApi<ScrollAreaApi>('scroll-custom')
    const firstThumb = app.components.require('custom-thumb-vertical')
    api.scrollTo(0, 80)
    app.raph.run()
    app.raph.run()

    expect(app.components.require('custom-thumb-vertical')).toBe(firstThumb)
    expect((app.components.require('custom-thumb-vertical') as any).getProps().opacity).toBe(1)

    app.destroy()
  })

  it('supports full ScrollArea scrollbar-y slots and active idle visibility', () => {
    vi.useFakeTimers()
    const app = createApp()
    const surface = app.createSurface('scroll-area-active')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'scroll-active-root',
      children: [
        {
          type: NovaUIKit.ScrollArea,
          id: 'scroll-active',
          props: {
            width: 220,
            height: 120,
            contentHeight: 360,
            scrollbarVisibility: 'active',
            scrollbarIdleDelay: 120,
          },
          slots: {
            'scrollbar-y': scope => [
              {
                type: NovaUIKit.Surface,
                id: 'custom-scrollbar-y',
                key: 'custom-scrollbar-y',
                props: {
                  x: scope?.trackRect.x,
                  y: scope?.trackRect.y,
                  width: scope?.trackRect.width,
                  height: scope?.trackRect.height,
                  opacity: scope?.state.opacity,
                  background: 'rgba(15,23,42,0.12)',
                },
              },
            ],
          },
          children: [
            { type: NovaUIKit.Surface, id: 'scroll-active-content', props: { background: '#f8fafc' } },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const api = app.components.requireApi<ScrollAreaApi>('scroll-active')
    const node = app.components.require('scroll-active') as unknown as NovaNode<TestEvents>

    expect(api.getScrollbarState().opacity).toBe(0)
    node.eventHandlers.wheel?.(new WheelEvent('wheel', { deltaY: 48 }))
    app.raph.run()
    app.raph.run()

    expect(api.getScrollState().y.value).toBe(48)
    expect(api.getScrollbarState().opacity).toBe(1)
    expect((app.components.require('custom-scrollbar-y') as any).getProps().opacity).toBe(1)

    vi.advanceTimersByTime(130)
    app.raph.run()
    app.raph.run()

    expect(api.getScrollbarState().opacity).toBe(0)
    expect((app.components.require('custom-scrollbar-y') as any).getProps().opacity).toBe(0)

    app.destroy()
    vi.useRealTimers()
  })

  it('supports ScrollArea track, thumb, corner slots and exposes public slot context only', () => {
    const app = createApp()
    const surface = app.createSurface('scroll-area-composed-slots')
    const contexts: Array<Record<string, any>> = []

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'scroll-composed-root',
      children: [
        {
          type: NovaUIKit.ScrollArea,
          id: 'scroll-composed',
          props: {
            width: 220,
            height: 120,
            contentWidth: 520,
            contentHeight: 360,
            scrollbarVisibility: 'always',
          },
          slots: {
            track: scope => {
              contexts.push(scope as Record<string, any>)
              return [{
                type: NovaUIKit.Surface,
                id: `custom-track-${scope?.orientation}`,
                key: `track-${scope?.orientation}`,
                props: {
                  x: scope?.trackRect.x,
                  y: scope?.trackRect.y,
                  width: scope?.trackRect.width,
                  height: scope?.trackRect.height,
                  background: '#e2e8f0',
                },
              }]
            },
            thumb: scope => [{
              type: NovaUIKit.Surface,
              id: `custom-thumb-${scope?.orientation}`,
              key: `thumb-${scope?.orientation}`,
              props: {
                x: scope?.thumbRect.x,
                y: scope?.thumbRect.y,
                width: scope?.thumbRect.width,
                height: scope?.thumbRect.height,
                background: '#2563eb',
              },
            }],
            corner: scope => [{
              type: NovaUIKit.Surface,
              id: 'custom-corner',
              key: 'corner',
              props: {
                x: scope?.rect.x,
                y: scope?.rect.y,
                width: scope?.rect.width,
                height: scope?.rect.height,
                background: '#0f172a',
              },
            }],
          },
          children: [
            { type: NovaUIKit.Surface, id: 'scroll-composed-content', props: { background: '#f8fafc' } },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    expect(app.components.api<ScrollbarApi>('scroll-composed-scrollbar-y')).toBeUndefined()
    expect(app.components.api<ScrollbarApi>('scroll-composed-scrollbar-x')).toBeUndefined()
    expect(app.components.require('custom-track-vertical')).toBeTruthy()
    expect(app.components.require('custom-thumb-vertical')).toBeTruthy()
    expect(app.components.require('custom-track-horizontal')).toBeTruthy()
    expect(app.components.require('custom-thumb-horizontal')).toBeTruthy()
    expect(app.components.require('custom-corner')).toBeTruthy()

    const vertical = contexts.find(context => context.orientation === 'vertical')
    expect(vertical).toBeTruthy()
    expect(vertical).toMatchObject({
      orientation: 'vertical',
      state: expect.any(Object),
      metrics: expect.any(Object),
      thumbRect: expect.any(Object),
      trackRect: expect.any(Object),
      actions: expect.any(Object),
    })
    expect(vertical).not.toHaveProperty('node')
    expect(vertical).not.toHaveProperty('surface')
    expect(vertical).not.toHaveProperty('app')

    vertical?.actions.scrollBy(40)
    app.raph.run()
    app.raph.run()

    expect(app.components.requireApi<ScrollAreaApi>('scroll-composed').getScrollState().y.value).toBe(40)

    app.destroy()
  })

  it('supports ScrollArea hidden visibility, axis and wheelMultiplier', () => {
    const app = createApp()
    const surface = app.createSurface('scroll-area-axis')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'scroll-axis-root',
      children: [
        {
          type: NovaUIKit.ScrollArea,
          id: 'scroll-hidden',
          props: {
            width: 220,
            height: 120,
            contentHeight: 360,
            scrollbarVisibility: 'hidden',
          },
          slots: {
            thumb: scope => [{
              type: NovaUIKit.Surface,
              id: `hidden-thumb-${scope?.orientation}`,
              key: scope?.orientation,
            }],
          },
          children: [
            { type: NovaUIKit.Surface, id: 'scroll-hidden-content' },
          ],
        },
        {
          type: NovaUIKit.ScrollArea,
          id: 'scroll-axis-x',
          props: {
            y: 140,
            width: 220,
            height: 120,
            contentWidth: 720,
            contentHeight: 720,
            axis: 'x',
            wheelMultiplier: 2,
          },
          children: [
            { type: NovaUIKit.Surface, id: 'scroll-axis-content' },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    expect(app.components.api<ScrollbarApi>('scroll-hidden-scrollbar-y')).toBeUndefined()
    expect(app.components.api('hidden-thumb-vertical')).toBeUndefined()

    const node = app.components.require('scroll-axis-x') as unknown as NovaNode<TestEvents>
    node.eventHandlers.wheel?.(new WheelEvent('wheel', { deltaX: 10, deltaY: 50 }))
    app.raph.run()
    app.raph.run()

    const state = app.components.requireApi<ScrollAreaApi>('scroll-axis-x').getScrollState()
    expect(state.x.value).toBe(20)
    expect(state.y.value).toBe(0)

    app.destroy()
  })

  it('emits semantic events for Button, checkbox/toggle value changes, Slider drag and SplitPane resize', () => {
    const app = createApp()
    const surface = app.createSurface('semantic-events')
    const buttonPress = vi.fn()
    const checkboxChange = vi.fn()
    const checkboxValueChange = vi.fn()
    const toggleChange = vi.fn()
    const sliderInput = vi.fn()
    const sliderChange = vi.fn()
    const sliderDragStart = vi.fn()
    const sliderDragEnd = vi.fn()
    const resizeStart = vi.fn()
    const resize = vi.fn()
    const resizeEnd = vi.fn()

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'semantic-root',
      children: [
        { type: NovaUIKit.Button, id: 'semantic-button', props: { text: 'Run', onPress: buttonPress } },
        {
          type: NovaUIKit.Checkbox,
          id: 'semantic-checkbox',
          props: { label: 'Check', onChange: checkboxChange, onValueChange: checkboxValueChange },
        },
        {
          type: NovaUIKit.Toggle,
          id: 'semantic-toggle',
          props: { y: 42, label: 'Toggle', onChange: toggleChange },
        },
        {
          type: NovaUIKit.Slider,
          id: 'semantic-slider',
          props: {
            y: 90,
            width: 220,
            value: 0,
            onInput: sliderInput,
            onChange: sliderChange,
            onDragStart: sliderDragStart,
            onDragEnd: sliderDragEnd,
          },
        },
        {
          type: NovaUIKit.SplitPane,
          id: 'semantic-split',
          props: {
            y: 160,
            width: 240,
            height: 120,
            sizes: [120, 120],
            onResizeStart: resizeStart,
            onResize: resize,
            onResizeEnd: resizeEnd,
          },
          children: [
            { type: NovaUIKit.Surface, id: 'semantic-split-a' },
            { type: NovaUIKit.Surface, id: 'semantic-split-b' },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const button = app.components.require('semantic-button') as unknown as NovaNode<TestEvents>
    button.eventHandlers.mousedown?.(new MouseEvent('mousedown', { clientX: 8, clientY: 8 }))
    button.eventHandlers.mouseup?.(new MouseEvent('mouseup', { clientX: 8, clientY: 8 }))
    button.eventHandlers.keydown?.(new KeyboardEvent('keydown', { key: 'Enter' }))
    app.components.requireApi<CheckboxApi>('semantic-checkbox').toggle(new MouseEvent('click'))
    app.components.requireApi<ToggleApi>('semantic-toggle').toggle(new MouseEvent('click'))

    const slider = app.components.require('semantic-slider') as unknown as NovaNode<TestEvents>
    slider.eventHandlers.mousedown?.(new MouseEvent('mousedown', { clientX: 120, clientY: 104 }))
    slider.eventHandlers.dragmove?.(new MouseEvent('mousemove', { clientX: 160, clientY: 104 }), 40, 0, { totalDx: 40, totalDy: 0, startX: 120, startY: 104 })
    slider.eventHandlers.dragend?.(new MouseEvent('mouseup', { clientX: 160, clientY: 104 }), { totalDx: 40, totalDy: 0, startX: 120, startY: 104 })

    const split = app.components.require('semantic-split') as unknown as NovaNode<TestEvents>
    const resizer = split.children.find(child => child.__type === 'ColResizer') as NovaNode<TestEvents>
    resizer.eventHandlers.dragstart?.(new MouseEvent('mousedown', { clientX: 120, clientY: 170 }), { startX: 120, startY: 170 })
    resizer.eventHandlers.dragmove?.(new MouseEvent('mousemove', { clientX: 140, clientY: 170 }), 20, 0, { totalDx: 20, totalDy: 0, startX: 120, startY: 170 })
    resizer.eventHandlers.dragend?.(new MouseEvent('mouseup', { clientX: 140, clientY: 170 }), { totalDx: 20, totalDy: 0, startX: 120, startY: 170 })

    expect(buttonPress).toHaveBeenCalledTimes(2)
    expect(checkboxChange).toHaveBeenCalledWith(true, expect.any(MouseEvent))
    expect(checkboxValueChange).toHaveBeenCalledWith(true, expect.any(MouseEvent))
    expect(toggleChange).toHaveBeenCalledWith(true, expect.any(MouseEvent))
    expect(sliderDragStart).toHaveBeenCalled()
    expect(sliderInput).toHaveBeenCalled()
    expect(sliderChange).toHaveBeenCalled()
    expect(sliderDragEnd).toHaveBeenCalled()
    expect(resizeStart).toHaveBeenCalledWith(expect.objectContaining({ delta: 0, event: expect.any(MouseEvent) }))
    expect(resize).toHaveBeenCalledWith(expect.objectContaining({ delta: 20, rect: expect.any(Object), event: expect.any(MouseEvent) }))
    expect(resizeEnd).toHaveBeenCalledWith(expect.objectContaining({ delta: 0, event: expect.any(MouseEvent) }))

    app.destroy()
  })

  it('reflows UI Kit layout-target panes when SplitPane sizes change', () => {
    const app = createApp()
    const surface = app.createSurface('split-pane-layout-target')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'split-layout-root',
      props: { width: 300, height: 120 },
      children: [
        {
          type: NovaUIKit.SplitPane,
          id: 'split-layout',
          props: {
            width: 300,
            height: 120,
            sizes: [120, 180],
            resizer: { hitSize: 10 },
          },
          children: [
            {
              type: NovaUIKit.Flex,
              id: 'split-layout-left',
              children: [
                {
                  type: NovaUIKit.TextBlock,
                  id: 'split-layout-left-label',
                  layout: { width: 'fill', height: 'fill' },
                  props: { text: 'Left' },
                },
              ],
            },
            {
              type: NovaUIKit.Flex,
              id: 'split-layout-right',
              children: [
                {
                  type: NovaUIKit.TextBlock,
                  id: 'split-layout-right-label',
                  layout: { width: 'fill', height: 'fill' },
                  props: { text: 'Right' },
                },
              ],
            },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const leftLabel = app.components.require('split-layout-left-label')
    const leftPane = app.components.require('split-layout-left')
    expect(leftLabel.width).toBe(120)

    app.components.requireApi<SplitPaneApi>('split-layout').setSizes([180, 120])
    app.raph.run()
    app.raph.run()

    expect(leftPane.width).toBe(180)
    expect(leftLabel.width).toBe(180)

    app.destroy()
  })

  it('resizes SplitPane panes on drag without requiring onResize callback', () => {
    const app = createApp()
    const surface = app.createSurface('split-pane-drag-default')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'split-drag-default-root',
      props: { width: 300, height: 120 },
      children: [
        {
          type: NovaUIKit.SplitPane,
          id: 'split-drag-default',
          props: {
            width: 300,
            height: 120,
            sizes: [120, 180],
            resizer: { hitSize: 10 },
          },
          children: [
            { type: NovaUIKit.Surface, id: 'split-drag-left' },
            { type: NovaUIKit.Surface, id: 'split-drag-right' },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const split = app.components.require('split-drag-default') as unknown as NovaNode<TestEvents>
    const resizer = split.children.find(child => child.__type === 'ColResizer') as NovaNode<TestEvents>

    resizer.eventHandlers.dragstart?.(new MouseEvent('mousedown', { clientX: 120, clientY: 10 }), { startX: 120, startY: 10 })
    resizer.eventHandlers.dragmove?.(new MouseEvent('mousemove', { clientX: 150, clientY: 10 }), 30, 0, { totalDx: 30, totalDy: 0, startX: 120, startY: 10 })
    app.raph.run()
    app.raph.run()

    expect(app.components.require('split-drag-left').width).toBe(150)
    expect(app.components.require('split-drag-right').width).toBe(140)

    app.destroy()
  })

  it('emits ScrollArea semantic scroll lifecycle and fallback part clicks without duplicating slot chrome clicks', () => {
    vi.useFakeTimers()
    const app = createApp()
    const surface = app.createSurface('scroll-area-semantic-events')
    const onScroll = vi.fn()
    const onScrollStart = vi.fn()
    const onScrollEnd = vi.fn()
    const onThumbClick = vi.fn()
    const onTrackClick = vi.fn()
    const onScrollbarClick = vi.fn()
    const slotClick = vi.fn()

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'scroll-semantic-root',
      children: [
        {
          type: NovaUIKit.ScrollArea,
          id: 'scroll-semantic-default',
          props: {
            width: 220,
            height: 120,
            contentHeight: 360,
            onScroll,
            onScrollStart,
            onScrollEnd,
            onThumbClick,
            onTrackClick,
            onScrollbarClick,
          },
        },
        {
          type: NovaUIKit.ScrollArea,
          id: 'scroll-semantic-slot',
          props: {
            y: 140,
            width: 220,
            height: 120,
            contentHeight: 360,
            onThumbClick,
          },
          slots: {
            thumb: scope => [{
              type: NovaUIKit.Surface,
              id: 'scroll-semantic-slot-thumb',
              key: 'thumb',
              props: {
                x: scope?.thumbRect.x,
                y: scope?.thumbRect.y,
                width: scope?.thumbRect.width,
                height: scope?.thumbRect.height,
              },
              events: { click: slotClick },
            }],
          },
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const node = app.components.require('scroll-semantic-default') as unknown as NovaNode<TestEvents>
    node.eventHandlers.wheel?.(new WheelEvent('wheel', { deltaY: 40 }))
    expect(onScrollStart).toHaveBeenCalledTimes(1)
    expect(onScroll).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(90)
    expect(onScrollEnd).toHaveBeenCalledTimes(1)

    node.eventHandlers.click?.(new MouseEvent('click', { clientX: 215, clientY: 30 }))
    node.eventHandlers.click?.(new MouseEvent('click', { clientX: 215, clientY: 90 }))
    expect(onScrollbarClick).toHaveBeenCalled()
    expect(onThumbClick).toHaveBeenCalled()
    expect(onTrackClick).toHaveBeenCalled()

    const beforeSlotPartClicks = onThumbClick.mock.calls.length
    const slotNode = app.components.require('scroll-semantic-slot-thumb') as unknown as NovaNode<TestEvents>
    slotNode.eventHandlers.click?.(new MouseEvent('click', { clientX: 215, clientY: 150 }))
    const slotOwner = app.components.require('scroll-semantic-slot') as unknown as NovaNode<TestEvents>
    slotOwner.eventHandlers.click?.(new MouseEvent('click', { clientX: 215, clientY: 150 }))

    expect(slotClick).toHaveBeenCalledTimes(1)
    expect(onThumbClick).toHaveBeenCalledTimes(beforeSlotPartClicks)

    app.destroy()
    vi.useRealTimers()
  })

  it('keeps fallback ScrollArea part hit-tests under budget without child growth', () => {
    const app = createApp()
    const surface = app.createSurface('scroll-area-part-hit-bench')
    const onThumbClick = vi.fn()

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'scroll-part-root',
      children: [
        {
          type: NovaUIKit.ScrollArea,
          id: 'scroll-part-bench',
          props: {
            width: 220,
            height: 120,
            contentHeight: 360,
            onThumbClick,
          },
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const node = app.components.require('scroll-part-bench') as unknown as NovaNode<TestEvents>
    const initialChildCount = node.children.length
    const event = new MouseEvent('click', { clientX: 215, clientY: 10 })
    const startedAt = realNow()

    for (let index = 0; index < 10_000; index += 1) {
      node.eventHandlers.click?.(event)
    }

    const elapsed = realNow() - startedAt

    expect(onThumbClick).toHaveBeenCalledTimes(10_000)
    expect(node.children).toHaveLength(initialChildCount)
    expect(elapsed).toBeLessThan(40)
    console.info(`[bench] ui-kit:scrollarea-fallback-part-hit-test elapsed=${elapsed.toFixed(2)}ms budget=40ms childGrowth=${node.children.length - initialChildCount}`)

    app.destroy()
  })

  it('keeps Slider drag updates under budget', () => {
    const app = createApp()
    const surface = app.createSurface('slider-drag-bench')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'slider-bench-root',
      children: [
        {
          type: NovaUIKit.Slider,
          id: 'slider-bench',
          props: { width: 220, value: 0, onInput: vi.fn(), onChange: vi.fn() },
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const slider = app.components.require('slider-bench') as unknown as NovaNode<TestEvents>
    slider.eventHandlers.mousedown?.(new MouseEvent('mousedown', { clientX: 10, clientY: 17 }))
    const startedAt = realNow()

    for (let index = 0; index < 1_000; index += 1) {
      slider.eventHandlers.dragmove?.(new MouseEvent('mousemove', { clientX: 10 + (index % 200), clientY: 17 }), index, 0, {
        totalDx: index,
        totalDy: 0,
        startX: 10,
        startY: 17,
      })
    }

    const elapsed = realNow() - startedAt

    expect(elapsed).toBeLessThan(120)
    console.info(`[bench] ui-kit:slider-drag-updates elapsed=${elapsed.toFixed(2)}ms budget=120ms`)

    app.destroy()
  })

  it.skip('keeps a mixed 500-node UI Kit scene with slots and 50 ScrollAreas inside the event budget', () => {
    const app = createApp()
    const surface = app.createSurface('complex-ui-scene-bench')
    const children: Array<Record<string, any>> = []
    const noop = () => {}

    for (let index = 0; index < 50; index += 1) {
      children.push({
        type: NovaUIKit.ScrollArea,
        id: `complex-scroll-${index}`,
        props: {
          x: (index % 10) * 86,
          y: Math.floor(index / 10) * 80,
          width: 80,
          height: 64,
          contentHeight: 240,
          onScroll: noop,
        },
        children: Array.from({ length: 7 }, (_item, childIndex) => ({
          type: NovaUIKit.Surface,
          id: `complex-scroll-${index}-content-${childIndex}`,
          props: {
            x: 4,
            y: childIndex * 34,
            width: 60,
            height: 28,
            background: childIndex % 2 === 0 ? '#f8fafc' : '#eff6ff',
          },
        })),
        slots: {
          thumb: scope => [{
            type: NovaUIKit.Surface,
            id: `complex-scroll-thumb-${index}-${scope?.orientation}`,
            key: scope?.orientation,
            props: {
              x: scope?.thumbRect.x,
              y: scope?.thumbRect.y,
              width: scope?.thumbRect.width,
              height: scope?.thumbRect.height,
              opacity: scope?.state.opacity,
            },
          }],
        },
      })
    }
    for (let index = 0; index < 34; index += 1) {
      children.push({ type: NovaUIKit.Button, id: `complex-button-${index}`, props: { text: `${index}`, onPress: noop } })
    }
    for (let index = 0; index < 33; index += 1) {
      children.push({ type: NovaUIKit.Toggle, id: `complex-toggle-${index}`, props: { checked: index % 2 === 0, onChange: noop } })
    }
    for (let index = 0; index < 33; index += 1) {
      children.push({ type: NovaUIKit.Slider, id: `complex-slider-${index}`, props: { value: index % 100, onInput: noop, onChange: noop } })
    }

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'complex-root',
      children,
    })

    const root = app.components.require('complex-root') as unknown as NovaNode<TestEvents>
    const initialRootChildCount = root.children.length
    const initialInteractiveCount = app.events.interactiveNodes.size
    const firstScroll = app.components.require('complex-scroll-0') as unknown as NovaNode<TestEvents>
    const initialScrollChildCount = firstScroll.children.length
    const mouseDown = new MouseEvent('mousedown', { clientX: 8, clientY: 8 })
    const mouseUp = new MouseEvent('mouseup', { clientX: 8, clientY: 8 })
    const arrowRight = new KeyboardEvent('keydown', { key: 'ArrowRight' })
    const arrowLeft = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
    const startedAt = realNow()

    for (let index = 0; index < 1_000; index += 1) {
      app.components.requireApi<ScrollAreaApi>(`complex-scroll-${index % 50}`).scrollTo(0, index % 140)
      const button = app.components.require(`complex-button-${index % 34}`) as unknown as NovaNode<TestEvents>
      button.eventHandlers.mousedown?.(mouseDown)
      button.eventHandlers.mouseup?.(mouseUp)
      const slider = app.components.require(`complex-slider-${index % 33}`) as unknown as NovaNode<TestEvents>
      slider.eventHandlers.keydown?.(index % 2 === 0 ? arrowRight : arrowLeft)
    }

    const elapsed = realNow() - startedAt

    expect(root.children).toHaveLength(initialRootChildCount)
    expect(firstScroll.children).toHaveLength(initialScrollChildCount)
    expect(app.events.interactiveNodes.size).toBe(initialInteractiveCount)
    expect(elapsed).toBeLessThan(180)
    console.info(`[bench] ui-kit:complex-500-node-scene elapsed=${elapsed.toFixed(2)}ms budget=180ms rootGrowth=${root.children.length - initialRootChildCount} slotChildGrowth=${firstScroll.children.length - initialScrollChildCount} interactiveGrowth=${app.events.interactiveNodes.size - initialInteractiveCount}`)

    app.destroy()
  })

  it('keeps ScrollArea custom thumb slot scroll updates under budget without child growth', () => {
    const app = createApp()
    const surface = app.createSurface('scroll-area-slot-perf')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'scroll-perf-root',
      children: [
        {
          type: NovaUIKit.ScrollArea,
          id: 'scroll-perf',
          props: { width: 220, height: 120, contentHeight: 720, scrollbarVisibility: 'active' },
          slots: {
            thumb: scope => [
              {
                type: NovaUIKit.Surface,
                id: `scroll-perf-thumb-${scope?.orientation}`,
                key: scope?.orientation,
                props: {
                  x: scope?.thumbRect.x,
                  y: scope?.thumbRect.y,
                  width: scope?.thumbRect.width,
                  height: scope?.thumbRect.height,
                  opacity: scope?.state.opacity,
                  background: '#2563eb',
                },
              },
            ],
          },
          children: [
            { type: NovaUIKit.Surface, id: 'scroll-perf-content', props: { background: '#f8fafc' } },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const api = app.components.requireApi<ScrollAreaApi>('scroll-perf')
    const node = app.components.require('scroll-perf') as unknown as NovaNode<TestEvents>
    const initialChildCount = node.children.length
    const startedAt = realNow()

    for (let index = 0; index < 1_000; index += 1) {
      api.scrollTo(0, index % 480)
    }

    const elapsed = realNow() - startedAt

    expect(node.children).toHaveLength(initialChildCount)
    expect(app.components.require('scroll-perf-thumb-vertical')).toBeTruthy()
    expect(elapsed).toBeLessThan(250)
    console.info(`[bench] ui-kit:scrollarea-custom-thumb-scrollTo elapsed=${elapsed.toFixed(2)}ms budget=250ms childGrowth=${node.children.length - initialChildCount}`)

    app.destroy()
  })

  it('keeps ScrollArea active visibility cycles under budget without fallback recreation', () => {
    const app = createApp()
    const surface = app.createSurface('scroll-area-active-perf')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'scroll-active-perf-root',
      children: [
        {
          type: NovaUIKit.ScrollArea,
          id: 'scroll-active-perf',
          props: {
            width: 220,
            height: 120,
            contentHeight: 720,
            scrollbarVisibility: 'active',
            scrollbarIdleDelay: 700,
          },
          slots: {
            thumb: scope => [{
              type: NovaUIKit.Surface,
              id: `scroll-active-perf-thumb-${scope?.orientation}`,
              key: scope?.orientation,
              props: {
                opacity: scope?.state.opacity,
                x: scope?.thumbRect.x,
                y: scope?.thumbRect.y,
                width: scope?.thumbRect.width,
                height: scope?.thumbRect.height,
              },
            }],
          },
          children: [
            { type: NovaUIKit.Surface, id: 'scroll-active-perf-content' },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const api = app.components.requireApi<ScrollAreaApi>('scroll-active-perf')
    const node = app.components.require('scroll-active-perf') as unknown as NovaNode<TestEvents>
    const initialChildCount = node.children.length
    const startedAt = realNow()

    for (let index = 0; index < 1_000; index += 1) {
      api.scrollTo(0, index % 600)
      app.raph.run()
      app.raph.run()
    }

    const elapsed = realNow() - startedAt

    expect(app.components.api<ScrollbarApi>('scroll-active-perf-scrollbar-y')).toBeUndefined()
    expect(node.children).toHaveLength(initialChildCount)
    expect(elapsed).toBeLessThan(250)
    console.info(`[bench] ui-kit:scrollarea-active-visibility elapsed=${elapsed.toFixed(2)}ms budget=250ms childGrowth=${node.children.length - initialChildCount}`)

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

  it('applies global styles to multiple Root trees', () => {
    const app = createApp()
    const validation = validateNovaUiStyleSheetSource(`
      Button.global-action {
        accentColor: #abcdef;
      }
    `)
    registerNovaUiGlobalStyleSheet(app, {
      ok: validation.ok,
      source: validation.styleSheet?.source ?? '',
      styleSheet: validation.styleSheet,
      diagnostics: validation.diagnostics,
      tokenDependencies: [],
    })
    const surface = app.createSurface('global-styles')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'global-root-a',
      children: [
        { type: NovaUIKit.Button, id: 'global-button-a', props: { className: 'global-action', text: 'A' } },
      ],
    })
    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'global-root-b',
      props: { y: 80 },
      children: [
        { type: NovaUIKit.Button, id: 'global-button-b', props: { className: 'global-action', text: 'B' } },
      ],
    })
    app.raph.run()
    app.raph.run()

    expect(app.components.requireApi<ButtonApi>('global-button-a').getProps().accentColor).toBe('#abcdef')
    expect(app.components.requireApi<ButtonApi>('global-button-b').getProps().accentColor).toBe('#abcdef')

    app.destroy()
  })

  it('refreshes NovaCSS theme tokens through Nova Raph theme events', () => {
    const app = createApp()
    app.theme.registerMany([
      {
        id: 'light',
        tokens: {
          '--nova-scene-text': '#111111',
          '--nova-accent': '#2563eb',
          '--nova-label-size': 14,
        },
      },
      {
        id: 'dark',
        tokens: {
          '--nova-scene-text': '#f7f8ff',
          '--nova-accent': '#9b7cff',
          '--nova-label-size': 16,
        },
      },
    ])
    const surface = app.createSurface('theme-styles')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'theme-root',
      props: {
        styleSheet: `
          TextBlock.theme-label {
            color: var(--nova-scene-text, #111111);
            fontSize: var(--nova-label-size, 12);
          }

          Button.theme-action {
            accentColor: var(--nova-accent, #2563eb);
          }
        `,
      },
      children: [
        { type: NovaUIKit.TextBlock, id: 'theme-label', props: { className: 'theme-label', text: 'Theme' } },
        { type: NovaUIKit.Button, id: 'theme-button', props: { className: 'theme-action', text: 'Apply' } },
      ],
    })
    app.raph.run()
    app.raph.run()

    expect(app.components.requireApi<TextBlockApi>('theme-label').getProps().color).toBe('#111111')
    expect(app.components.requireApi<TextBlockApi>('theme-label').getProps().fontSize).toBe(14)
    expect(app.components.requireApi<ButtonApi>('theme-button').getProps().accentColor).toBe('#2563eb')

    app.theme.use('dark')
    app.raph.run()
    app.raph.run()

    expect(app.components.requireApi<TextBlockApi>('theme-label').getProps().color).toBe('#f7f8ff')
    expect(app.components.requireApi<TextBlockApi>('theme-label').getProps().fontSize).toBe(16)
    expect(app.components.requireApi<ButtonApi>('theme-button').getProps().accentColor).toBe('#9b7cff')
    expect(app.components.requireApi<RootApi>('theme-root').getDiagnostics()).toHaveLength(0)

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
      normalizeBadgeProps,
      normalizeImageProps,
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

function realNow(): number {
  return Number(process.hrtime.bigint()) / 1_000_000
}
