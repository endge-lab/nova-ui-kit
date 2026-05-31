// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Command,
  Nova,
  NovaComponent,
  NovaComponentNode,
  NovaNode,
  Prop,
  RaphSchedulerType,
  RendererType,
  Watch,
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
  type DialogsApi,
  type DividerApi,
  type FlexApi,
  type FpsMeterApi,
  type GridApi,
  type ImageApi,
  type InputApi,
  type OverlayApi,
  type OverlaysApi,
  type PanelApi,
  type RootApi,
  type ScrollAreaApi,
  type ScrollbarApi,
  type SegmentedControlApi,
  type SliderApi,
  type SplitPaneApi,
  type SplitPaneResizePayload,
  type TagApi,
  type TextBlockApi,
  type ThemeSwitchApi,
  type ToggleApi,
  type ToastRegionApi,
  type TooltipApi,
  type ZoomControlsApi,
  type PopoverApi,
  THEME_SWITCH_ASSETS,
  registerNovaUiGlobalStyleSheet,
  resolveFpsMeterReading,
  resolveNovaUiThemeValue,
  validateNovaUiStyleSheetSource,
} from '@/index'
import { registerNovaUIKit } from '@/registerNovaUIKit'
import { normalizeBadgeProps } from '@/components/Badge/badge.config'
import { normalizeButtonProps } from '@/components/Button/button.config'
import { normalizeCheckboxProps } from '@/components/Checkbox/checkbox.config'
import { normalizeDividerProps } from '@/components/Divider/divider.config'
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
import { RootTooltipControllerNode } from '@/components/Tooltip/RootTooltipControllerNode'
import { RootDialogControllerNode } from '@/components/Dialog/RootDialogControllerNode'
import { RootOverlayControllerNode } from '@/components/Overlay/RootOverlayControllerNode'
import { resolveNovaUiOverlayPosition } from '@/shared/overlay/overlay-position'
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

/**
 * Описывает decorated UI Kit test component.
 */
@NovaComponent({
  type: 'ui-kit.decorated-card',
  dirtyPolicy: { update: ['state.version'], render: ['title'] },
})
class DecoratedUiKitCardNode extends NovaComponentNode<{ title: string; state: { version: number } }> {
  @Prop.string({ default: 'Card' })
  declare title: string

  @Prop.object({ default: () => ({ version: 0 }) })
  declare state: { version: number }

  updates = 0

  /**
   * Отслеживает версию state.
   */
  @Watch('state.version', { phase: 'update' })
  syncState(): void {
    this.updates += 1
  }

  /**
   * Обновляет state через command bus.
   */
  @Command('ui-kit.decorated-card.bump')
  bump(): number {
    this.setProps?.({ state: { version: this.state.version + 1 } })
    return this.state.version
  }

  /**
   * Выполняет отрисовку DecoratedUiKitCardNode.
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
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:nova-ui-kit-icon'),
    configurable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
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
          Surface, Divider, Panel, Button, Tag, Chip, Checkbox, Toggle, Slider, Scrollbar, ScrollArea, SplitPane, Tooltip, Tooltips, Popover, ActionList, Overlay, Overlays, Dialog, Dialogs, Toast, ToastRegion, SegmentedControl, ZoomControls {
            color: #123456;
            borderWidth: 2;
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
        { type: NovaUIKit.Divider, id: 'divider', props: { width: 160, lineStyle: 'dashed', border: { width: 2 }, padding: { horizontal: 8 }, margin: { vertical: 4 } } },
        { type: NovaUIKit.Button, id: 'button', props: { text: 'Run' } },
        { type: NovaUIKit.FpsMeter, id: 'fps-meter', props: { placement: 'top-right', margin: 8 } },
        { type: 'NovaUIKit.ThemeSwitch', id: 'theme-switch', props: { themes: [{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }] } },
        { type: NovaUIKit.ZoomControls, id: 'zoom-controls', props: { value: 1, step: 0.25, minZoom: 0.5, maxZoom: 2 } },
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
          type: NovaUIKit.Overlay,
          id: 'overlay',
          props: { open: true, anchor: { kind: 'pointer', x: 24, y: 160 }, width: 180, height: 76 },
          children: [{ type: NovaUIKit.TextBlock, id: 'overlay-text', props: { text: 'Overlay' } }],
        },
        {
          type: NovaUIKit.Overlays,
          id: 'overlays',
          props: { definitions: [{ type: 'default' }] },
        },
        {
          type: NovaUIKit.Dialog,
          id: 'dialog',
          props: { open: true, title: 'Dialog', draggable: true, resizable: true },
          children: [{ type: NovaUIKit.TextBlock, id: 'dialog-body', props: { text: 'Body' } }],
        },
        {
          type: NovaUIKit.Dialogs,
          id: 'dialogs',
          props: { definitions: [{ type: 'default' }] },
        },
        {
          type: NovaUIKit.ToastRegion,
          id: 'toast-region',
          props: { autoDismiss: false, items: [{ id: 'saved', title: 'Saved', message: 'Done', tone: 'success' }] },
        },
      ],
    })

    app.components.requireApi<ButtonApi>('button').setSelected(true)
    app.components.requireApi<FpsMeterApi>('fps-meter').setVisible(false)
    app.components.requireApi<ThemeSwitchApi>('theme-switch').next()
    app.components.requireApi<ZoomControlsApi>('zoom-controls').zoomIn()
    app.components.requireApi<DividerApi>('divider').setLineStyle('dotted')
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
    app.components.requireApi<OverlayApi>('overlay').close()
    expect(app.components.requireApi<OverlaysApi>('overlays').getDefinitions()).toHaveLength(1)
    app.components.requireApi<DialogApi>('dialog').resizeTo(440, 280)
    expect(app.components.requireApi<DialogsApi>('dialogs').getDefinitions()).toHaveLength(1)
    app.components.requireApi<ToastRegionApi>('toast-region').push({ id: 'queued', title: 'Queued' })
    app.components.requireApi<SegmentedControlApi>('segmented').setValue('b')
    app.components.requireApi<PanelApi>('panel').setTitle('Updated')

    expect(app.components.requireApi<ButtonApi>('button').getProps().selected).toBe(true)
    expect(app.components.requireApi<FpsMeterApi>('fps-meter').getProps().visible).toBe(false)
    expect(app.components.requireApi<ThemeSwitchApi>('theme-switch').getProps().themes).toHaveLength(2)
    expect(app.components.requireApi<ThemeSwitchApi>('theme-switch').getProps().themes.every(theme => theme.icon)).toBe(true)
    expect(app.components.requireApi<ZoomControlsApi>('zoom-controls').getProps().value).toBe(1.25)
    expect(app.components.requireApi<DividerApi>('divider').getProps().lineStyle).toBe('dotted')
    expect(app.components.requireApi<DividerApi>('divider').getProps().border?.width).toBe(2)
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
    expect(app.components.requireApi<OverlayApi>('overlay').getProps().open).toBe(false)
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
      props: { width: 300, height: 260 },
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
    expect(app.events.hitTest(8, 8)?.id).toBe(button.id)

    app.components.requireApi<PopoverApi>('popover-hit-popover').open()
    app.raph.run()
    app.raph.run()

    expect(popover.active).toBe(true)
    expect(popover.visible).toBe(true)
    expect(list.active).toBe(true)
    expect(list.visible).toBe(true)
    expect(app.events.hitTest(8, 8)?.id).not.toBe(button.id)

    app.handleEvent('mousedown', new MouseEvent('mousedown', { clientX: 8, clientY: 8, button: 0 }))
    expect(app.components.requireApi<PopoverApi>('popover-hit-popover').getProps().open).toBe(false)
    app.raph.run()
    app.raph.run()

    expect(popover.active).toBe(false)
    expect(popover.visible).toBe(false)
    expect(app.events.hitTest(8, 8)?.id).toBe(button.id)

    app.destroy()
  })

  it('manages registry overlays through Root API', () => {
    const app = createApp()
    const surface = app.createSurface('overlay-registry')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'overlay-root',
      props: { width: 400, height: 260 },
      children: [
        {
          type: NovaUIKit.Overlays,
          id: 'overlay-source-a',
          props: {
            definitions: [
              {
                type: 'menu',
                props: { width: 180, height: 88, anchor: { kind: 'pointer', x: 24, y: 24 } },
              },
            ],
          },
        },
        {
          type: NovaUIKit.Overlays,
          id: 'overlay-source-b',
          props: {
            definitions: [
              {
                type: 'menu',
                props: { width: 240, height: 96, placement: 'bottom-start' },
                slot: slot => [
                  {
                    type: NovaUIKit.TextBlock,
                    id: `overlay-body-${slot.id}`,
                    props: { text: String(slot.value) },
                    layout: { width: '100%', height: '100%' },
                  },
                ],
              },
            ],
          },
        },
      ],
    })

    app.raph.run()

    const root = app.components.requireApi<RootApi>('overlay-root')
    const id = root.openOverlay('menu', {
      id: 'main-menu',
      value: 'Opened',
      height: 104,
      anchor: { kind: 'pointer', x: 120, y: 80 },
    })
    app.raph.run()
    app.raph.run()

    expect(id).toBe('main-menu')
    expect(root.getOpenOverlayIds()).toEqual(['main-menu'])
    const overlay = app.components.requireApi<OverlayApi>('nova-root-overlay-main-menu')
    expect(overlay.getProps().width).toBe(240)
    expect(overlay.getProps().height).toBe(104)
    expect(overlay.getProps().anchor).toMatchObject({ kind: 'pointer', x: 120, y: 80 })

    root.updateOverlay('main-menu', { width: 260, anchor: { kind: 'rect', x: 20, y: 30, width: 80, height: 24 } })
    app.raph.run()
    expect(overlay.getProps().width).toBe(260)
    expect(overlay.getProps().anchor).toMatchObject({ kind: 'rect', x: 20, y: 30, width: 80, height: 24 })

    root.closeOverlay('main-menu')
    app.raph.run()
    expect(root.getOpenOverlayIds()).toEqual([])

    app.destroy()
  })

  it('dismisses registry overlays by outside click and escape', () => {
    const app = createApp()
    const surface = app.createSurface('overlay-dismiss')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'overlay-dismiss-root',
      props: { width: 400, height: 260 },
      children: [
        {
          type: NovaUIKit.Overlays,
          id: 'overlay-dismiss-registry',
          props: {
            definitions: [
              {
                type: 'menu',
                props: {
                  width: 160,
                  height: 80,
                  anchor: { kind: 'rect', x: 100, y: 80, width: 32, height: 24 },
                },
              },
            ],
          },
        },
      ],
    })

    app.raph.run()

    const root = app.components.requireApi<RootApi>('overlay-dismiss-root')
    root.openOverlay('menu', { id: 'outside-menu' })
    app.raph.run()
    app.handleEvent('mousedown', new MouseEvent('mousedown', { clientX: 8, clientY: 8, button: 0 }))
    expect(root.getOpenOverlayIds()).toEqual([])

    root.openOverlay('menu', { id: 'escape-menu' })
    app.raph.run()
    const overlay = app.components.require('nova-root-overlay-escape-menu') as unknown as NovaNode<TestEvents>
    overlay.eventHandlers.keydown?.(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(root.getOpenOverlayIds()).toEqual([])

    app.destroy()
  })

  it('keeps registry overlays above dialogs for menus opened from dialogs', () => {
    const app = createApp()
    const surface = app.createSurface('dialog-overlay-stack')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'dialog-overlay-root',
      props: { width: 640, height: 420 },
      children: [
        {
          type: NovaUIKit.Overlays,
          id: 'dialog-overlay-source',
          props: {
            definitions: [
              {
                type: 'menu',
                props: { width: 180, height: 88, anchor: { kind: 'pointer', x: 220, y: 120 } },
              },
            ],
          },
        },
      ],
    })

    app.raph.run()

    const rootNode = app.components.require('dialog-overlay-root') as unknown as NovaNode<TestEvents>
    const root = app.components.requireApi<RootApi>('dialog-overlay-root')
    root.openDialog({ id: 'settings-dialog', width: 320, height: 180, title: 'Settings' })
    root.openOverlay('menu', { id: 'settings-menu' })
    app.raph.run()
    app.raph.run()

    const dialogSurface = app.surfaces.find(item => item.name === 'dialog-overlay-root:nova-ui-dialog-portal')
    const overlaySurface = app.surfaces.find(item => item.name === 'dialog-overlay-root:nova-ui-overlay-portal')
    const dialogController = dialogSurface?.children.find(child => child instanceof RootDialogControllerNode)
    const overlayController = overlaySurface?.children.find(child => child instanceof RootOverlayControllerNode)
    expect(dialogController?.weight).toBe(30_000)
    expect(overlayController?.weight).toBe(40_000)
    expect(rootNode.surface.weight).toBe(0)
    expect(dialogSurface?.weight).toBe(30_000)
    expect(overlaySurface?.weight).toBe(40_000)
    expect((overlayController?.weight ?? 0)).toBeGreaterThan(dialogController?.weight ?? 0)

    app.destroy()
  })

  it('resolves overlay pointer and rect anchor positions', () => {
    expect(resolveNovaUiOverlayPosition({
      root: { x: 0, y: 0, width: 320, height: 240 },
      anchor: { kind: 'pointer', x: 120, y: 80 },
      overlay: { width: 100, height: 60 },
      placement: 'bottom-start',
      offset: 8,
      collision: { mode: 'none' },
    })).toMatchObject({ x: 120, y: 88 })

    expect(resolveNovaUiOverlayPosition({
      root: { x: 0, y: 0, width: 320, height: 240 },
      anchor: { kind: 'rect', x: 260, y: 220, width: 40, height: 20 },
      overlay: { width: 100, height: 60 },
      placement: 'bottom-start',
      offset: 8,
      collision: { mode: 'shift', padding: 8 },
    })).toMatchObject({ x: 212, y: 172 })

    expect(resolveNovaUiOverlayPosition({
      root: { x: 0, y: 0, width: 320, height: 240 },
      anchor: { kind: 'rect', x: 120, y: 190, width: 80, height: 30 },
      overlay: { width: 120, height: 80 },
      placement: 'bottom-start',
      offset: 8,
      collision: { mode: 'flip', padding: 8 },
    })).toMatchObject({ x: 120, y: 102 })
  })

  it('opens a default dialog through Root dialog API without a Dialogs registry', () => {
    const app = createApp()
    const surface = app.createSurface('dialog-default-registry')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'dialog-default-root',
      props: { width: 900, height: 560 },
      children: [
        { type: NovaUIKit.Button, id: 'dialog-default-trigger', props: { text: 'Open' } },
      ],
    })

    app.raph.run()
    app.raph.run()

    const root = app.components.require('dialog-default-root') as unknown as NovaNode<TestEvents>
    const initialRootChildCount = root.children.length
    const initialInteractiveCount = app.events.interactiveNodes.size
    const rootApi = app.components.requireApi<RootApi>('dialog-default-root')

    expect(app.surfaces.some(item => item.name === 'dialog-default-root:nova-ui-dialog-portal')).toBe(false)
    const id = rootApi.openDialog({
      title: 'Default dialog',
      value: 'Default body',
      width: 360,
      height: 220,
      resizable: true,
    })
    app.raph.run()
    app.raph.run()

    const dialogSurface = app.surfaces.find(item => item.name === 'dialog-default-root:nova-ui-dialog-portal')
    const controllers = dialogSurface?.children.filter(child => child instanceof RootDialogControllerNode) ?? []
    expect(controllers).toHaveLength(1)
    expect(controllers[0].weight).toBe(30_000)
    expect(root.surface.weight).toBe(0)
    expect(dialogSurface?.weight).toBe(30_000)
    expect(rootApi.getOpenDialogIds()).toEqual([id])
    expect(app.components.requireApi<DialogApi>(`nova-root-dialog-${id}`).getProps()).toMatchObject({
      open: true,
      backdrop: true,
      title: 'Default dialog',
      width: 360,
      height: 220,
      resizable: true,
      className: 'default',
      attrs: { type: 'default' },
    })
    const backdropNode = app.components.require(`nova-root-dialog-${id}-backdrop`) as unknown as NovaNode<TestEvents>
    const dialogNode = app.components.require(`nova-root-dialog-${id}`) as unknown as NovaNode<TestEvents>
    expect(controllers[0].children.indexOf(backdropNode)).toBeLessThan(controllers[0].children.indexOf(dialogNode))
    expect(backdropNode.width).toBe(900)
    expect(backdropNode.height).toBe(560)
    expect(dialogNode.width).toBe(900)
    expect(dialogNode.height).toBe(560)
    expect(app.components.requireApi<DialogApi>(`nova-root-dialog-${id}`).getProps()).toMatchObject({
      width: 360,
      height: 220,
    })
    const dialogApi = app.components.requireApi<DialogApi>(`nova-root-dialog-${id}`)
    const bodyProps = app.components.requireApi<TextBlockApi>(`nova-root-dialog-${id}-value`).getProps()
    const bodyNode = app.components.require(`nova-root-dialog-${id}-value`) as unknown as NovaNode<TestEvents>
    expect(bodyProps.text).toBe('Default body')
    expect(bodyNode.x).toBeGreaterThan(250)
    expect(bodyNode.y).toBeGreaterThan(190)
    dialogApi.moveTo(40, 50)
    expect(bodyNode.x).toBe(58)
    expect(bodyNode.y).toBe(122)
    dialogApi.setChildren([
      {
        type: NovaUIKit.TextBlock,
        id: `nova-root-dialog-${id}-updated-value`,
        props: { text: 'Updated body' },
      },
    ])
    const updatedBodyNode = app.components.require(`nova-root-dialog-${id}-updated-value`) as unknown as NovaNode<TestEvents>
    expect(updatedBodyNode.visible).toBe(true)
    expect(updatedBodyNode.active).toBe(true)
    expect(updatedBodyNode.x).toBe(58)
    expect(updatedBodyNode.y).toBe(122)
    expect(root.children).toHaveLength(initialRootChildCount)
    expect(app.events.interactiveNodes.size).toBeGreaterThanOrEqual(initialInteractiveCount)

    rootApi.closeDialog(id)
    app.raph.run()
    app.raph.run()
    expect(rootApi.getOpenDialogIds()).toEqual([])
    expect(dialogSurface?.children.filter(child => child instanceof RootDialogControllerNode)).toHaveLength(1)

    app.destroy()
  })

  it('resolves custom dialog definitions, payload and local overrides through slot context', () => {
    const app = createApp()
    const surface = app.createSurface('dialog-custom-registry')
    const contexts: Array<Record<string, any>> = []
    const openChanges: Array<boolean> = []

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'dialog-custom-root',
      props: { width: 900, height: 560 },
      children: [
        {
          type: NovaUIKit.Dialogs,
          id: 'dialog-custom-registry-node',
          props: {
            definitions: [
              {
                type: 'confirm',
                props: {
                  title: 'Confirm',
                  width: 420,
                  height: 240,
                  placement: 'top',
                  draggable: true,
                  background: '#f8fafc',
                  border: { color: '#94a3b8', width: 1, radius: 10 },
                },
                slot: slot => {
                  contexts.push(slot as Record<string, any>)
                  return [
                    {
                      type: NovaUIKit.TextBlock,
                      id: 'dialog-custom-body',
                      props: {
                        text: `${slot.title}: ${slot.value}`,
                        color: '#0f172a',
                      },
                    },
                  ]
                },
              },
            ],
          },
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const root = app.components.require('dialog-custom-root') as unknown as NovaNode<TestEvents>
    const rootApi = app.components.requireApi<RootApi>('dialog-custom-root')
    const initialRootChildCount = root.children.length
    const initialInteractiveCount = app.events.interactiveNodes.size
    const id = rootApi.openDialog('confirm', {
      id: 'remove-task',
      title: 'Remove task',
      value: 'T-42',
      width: 480,
      placement: 'bottom',
      onOpenChange: open => openChanges.push(open),
    })
    app.raph.run()
    app.raph.run()

    expect(id).toBe('remove-task')
    expect(contexts).toHaveLength(1)
    expect(contexts[0]).toMatchObject({
      id: 'remove-task',
      type: 'confirm',
      title: 'Remove task',
      value: 'T-42',
      dialog: { id: 'remove-task', type: 'confirm', index: 0 },
    })
    expect(contexts[0].props).toMatchObject({
      width: 480,
      placement: 'bottom',
      draggable: true,
      background: '#f8fafc',
      className: 'confirm',
      attrs: { type: 'confirm' },
    })
    expect(app.components.requireApi<TextBlockApi>('dialog-custom-body').getProps().text).toBe('Remove task: T-42')
    const dialogSurface = app.surfaces.find(item => item.name === 'dialog-custom-root:nova-ui-dialog-portal')
    expect(dialogSurface?.children.filter(child => child instanceof RootDialogControllerNode)).toHaveLength(1)
    expect(root.children).toHaveLength(initialRootChildCount)
    expect(app.events.interactiveNodes.size).toBeGreaterThanOrEqual(initialInteractiveCount)

    rootApi.updateDialog(id, { value: 'T-43', title: 'Remove updated' })
    app.raph.run()
    app.raph.run()
    expect(rootApi.getOpenDialogIds()).toEqual(['remove-task'])

    rootApi.closeDialogs()
    app.raph.run()
    app.raph.run()
    expect(rootApi.getOpenDialogIds()).toEqual([])
    expect(openChanges).toEqual([false])

    app.destroy()
  })

  it('keeps dialog controller single and stable across 1k open-close operations', () => {
    const app = createApp()
    const surface = app.createSurface('dialog-open-close-bench')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'dialog-bench-root',
      props: { width: 900, height: 560 },
      children: [
        {
          type: NovaUIKit.Dialogs,
          id: 'dialog-bench-registry',
          props: {
            definitions: [
              {
                type: 'bench',
                props: { width: 320, height: 180, title: 'Bench', backdrop: false, modal: false },
              },
            ],
          },
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const root = app.components.require('dialog-bench-root') as unknown as NovaNode<TestEvents>
    const rootApi = app.components.requireApi<RootApi>('dialog-bench-root')
    const initialRootChildCount = root.children.length
    const initialInteractiveCount = app.events.interactiveNodes.size
    const startedAt = realNow()

    for (let index = 0; index < 1_000; index += 1) {
      const id = rootApi.openDialog('bench', {
        id: `bench-${index}`,
        value: index,
      })
      rootApi.closeDialog(id)
    }
    app.raph.run()
    app.raph.run()

    const elapsed = realNow() - startedAt
    const dialogSurface = app.surfaces.find(item => item.name === 'dialog-bench-root:nova-ui-dialog-portal')
    const controllers = dialogSurface?.children.filter(child => child instanceof RootDialogControllerNode) ?? []
    expect(controllers).toHaveLength(1)
    expect(root.children).toHaveLength(initialRootChildCount)
    expect(app.events.interactiveNodes.size).toBe(initialInteractiveCount)
    expect(rootApi.getOpenDialogIds()).toEqual([])
    expect(elapsed).toBeLessThan(1_300)
    console.info(`[bench] ui-kit:dialog-registry-1k-open-close elapsed=${elapsed.toFixed(2)}ms budget=1300ms controllerCount=${controllers.length} interactiveGrowth=${app.events.interactiveNodes.size - initialInteractiveCount}`)

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

  it('supports decorated props watchers and commands through UI Kit registry', () => {
    const app = createApp()
    const surface = app.createSurface('decorated-ui-kit')
    Nova.registerComponents(app.schema, DecoratedUiKitCardNode as never)

    const node = app.schema.createNode(surface, {
      type: 'ui-kit.decorated-card',
      id: 'decorated-card',
      props: { state: { version: 1 } },
    }) as DecoratedUiKitCardNode

    node.setProps({ state: { version: 2 } })
    node.update()

    expect(node.title).toBe('Card')
    expect(node.updates).toBeGreaterThan(0)
    expect(app.commands.run('ui-kit.decorated-card.bump', undefined, { target: 'decorated-card' })).toBe(3)
    expect(node.state.version).toBe(3)
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

  it('opens a default tooltip from common tooltip props without a Tooltips registry', () => {
    vi.useFakeTimers()
    const app = createApp()
    const surface = app.createSurface('tooltip-default-registry')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'tooltip-default-root',
      children: [
        {
          type: NovaUIKit.Button,
          id: 'tooltip-default-target',
          props: { text: 'Hover', tooltip: 'Default text', width: 120, height: 32 },
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const root = app.components.require('tooltip-default-root') as unknown as NovaNode<TestEvents>
    const initialRootChildCount = root.children.length
    const initialInteractiveCount = app.events.interactiveNodes.size
    expect(app.surfaces.some(item => item.name === 'tooltip-default-root:nova-ui-tooltip-portal')).toBe(false)

    dispatchMouse(app.canvas.element, 'mousemove', 10, 10)
    vi.advanceTimersByTime(310)
    app.raph.run()
    app.raph.run()

    const tooltipSurface = app.surfaces.find(item => item.name === 'tooltip-default-root:nova-ui-tooltip-portal')
    const controllers = tooltipSurface?.children.filter(child => child instanceof RootTooltipControllerNode) ?? []
    expect(controllers).toHaveLength(1)
    expect(root.children).toHaveLength(initialRootChildCount)
    expect(app.events.interactiveNodes.size).toBe(initialInteractiveCount)

    dispatchMouse(app.canvas.element, 'mousemove', 200, 200)
    vi.advanceTimersByTime(90)
    app.raph.run()
    app.raph.run()

    expect(tooltipSurface?.children.filter(child => child instanceof RootTooltipControllerNode)).toHaveLength(1)
    expect(app.events.interactiveNodes.size).toBe(initialInteractiveCount)

    app.destroy()
    vi.useRealTimers()
  })

  it('resolves custom tooltip definitions, payload and local overrides through slot context', () => {
    vi.useFakeTimers()
    const app = createApp()
    const surface = app.createSurface('tooltip-custom-registry')
    const contexts: Array<Record<string, any>> = []

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'tooltip-custom-root',
      props: { width: 900, height: 560 },
      children: [
        {
          type: NovaUIKit.Tooltips,
          id: 'tooltip-custom-registry-node',
          props: {
            definitions: [
              {
                type: 'task',
                props: {
                  width: 260,
                  height: 72,
                  placement: 'bottom',
                  background: '#fff7ed',
                  border: { color: '#fed7aa', width: 1, radius: 8 },
                  delay: 0,
                },
                slot: slot => {
                  contexts.push(slot as Record<string, any>)
                  return [
                    {
                      type: NovaUIKit.TextBlock,
                      id: 'tooltip-custom-title',
                      props: {
                        text: `${slot.title}: ${slot.value}`,
                        color: '#9a3412',
                      },
                    },
                  ]
                },
              },
            ],
          },
        },
        {
          type: NovaUIKit.Button,
          id: 'tooltip-custom-target',
          props: {
            text: 'Task',
            width: 120,
            height: 32,
            tooltip: {
              type: 'task',
              value: 'T-42',
              title: 'Blocked',
              placement: 'right',
              width: 280,
            },
          },
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const root = app.components.require('tooltip-custom-root') as unknown as NovaNode<TestEvents>
    const initialRootChildCount = root.children.length
    const initialInteractiveCount = app.events.interactiveNodes.size

    const targetNode = app.components.require('tooltip-custom-target') as unknown as NovaNode<TestEvents>
    const targetBounds = targetNode.getWorldBounds()
    expect(app.events.hitTest(targetBounds.x + 12, targetBounds.y + 12)?.id).toBe(targetNode.id)
    dispatchMouse(app.canvas.element, 'mousemove', targetBounds.x + 12, targetBounds.y + 12)
    vi.advanceTimersByTime(1)
    app.raph.run()
    app.raph.run()

    expect(contexts).toHaveLength(1)
    expect(contexts[0]).toMatchObject({
      type: 'task',
      value: 'T-42',
      title: 'Blocked',
      placement: 'right',
      width: 280,
      target: {
        id: 'tooltip-custom-target',
        type: 'Button',
      },
      pointer: { x: targetBounds.x + 12, y: targetBounds.y + 12 },
    })
    expect(app.components.requireApi<TextBlockApi>('tooltip-custom-title').getProps().text).toBe('Blocked: T-42')
    expect((app.components.require('nova-root-tooltip-surface') as any).getProps().x).toBeGreaterThan(
      targetBounds.x + (targetBounds.width - 280) / 2,
    )
    const tooltipSurface = app.surfaces.find(item => item.name === 'tooltip-custom-root:nova-ui-tooltip-portal')
    expect(tooltipSurface?.children.filter(child => child instanceof RootTooltipControllerNode)).toHaveLength(1)
    expect(root.children).toHaveLength(initialRootChildCount)
    expect(app.events.interactiveNodes.size).toBe(initialInteractiveCount)

    app.destroy()
    vi.useRealTimers()
  })

  it('supports markdown tooltip shortcut and keeps legacy Tooltip wrapper API intact', () => {
    const markdown = normalizeTooltipProps({
      contentMode: 'markdown',
      content: { markdown: '**Ready**' },
      type: 'markdown',
    })
    expect(markdown.type).toBe('markdown')
    expect(markdown.contentMode).toBe('markdown')
    expect(markdown.content).toEqual({ markdown: '**Ready**' })

    const app = createApp()
    const surface = app.createSurface('tooltip-wrapper-compat')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'tooltip-wrapper-root',
      children: [
        {
          type: NovaUIKit.Tooltip,
          id: 'tooltip-wrapper',
          props: { content: 'Wrapper', open: true },
          trigger: { type: NovaUIKit.Button, id: 'tooltip-wrapper-trigger', props: { text: '?' } },
        },
      ],
    })

    expect(app.components.requireApi<TooltipApi>('tooltip-wrapper').getProps().open).toBe(true)
    app.components.requireApi<TooltipApi>('tooltip-wrapper').close()
    expect(app.components.requireApi<TooltipApi>('tooltip-wrapper').getProps().open).toBe(false)

    app.destroy()
  })

  it('keeps tooltip controller single and stable across 10k pointer moves', () => {
    vi.useFakeTimers()
    const app = createApp()
    const surface = app.createSurface('tooltip-pointer-bench')
    const children = Array.from({ length: 1_000 }, (_item, index) => ({
      type: NovaUIKit.Button,
      id: `tooltip-bench-target-${index}`,
      props: {
        x: (index % 50) * 18,
        y: Math.floor(index / 50) * 18,
        width: 16,
        height: 16,
        text: '',
        delay: 0,
        tooltip: {
          value: `Target ${index}`,
          width: 120,
          height: 28,
          delay: 10_000,
        },
      },
    }))

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'tooltip-bench-root',
      children,
    })
    app.raph.run()
    app.raph.run()

    const root = app.components.require('tooltip-bench-root') as unknown as NovaNode<TestEvents>
    app.components.requireApi<RootApi>('tooltip-bench-root').registerTooltipDefinitions('__bench__', [])
    const tooltipSurface = app.surfaces.find(item => item.name === 'tooltip-bench-root:nova-ui-tooltip-portal')
    const controller = tooltipSurface?.children.find(child => child instanceof RootTooltipControllerNode) as RootTooltipControllerNode<TestEvents>
    const initialRootChildCount = root.children.length
    const initialInteractiveCount = app.events.interactiveNodes.size
    const startedAt = realNow()

    for (let index = 0; index < 10_000; index += 1) {
      const x = ((index % 50) * 18) + 4
      const y = (Math.floor((index % 1_000) / 50) * 18) + 4
      controller.handlePointerMove({ clientX: x, clientY: y } as MouseEvent)
    }
    app.raph.run()
    app.raph.run()

    const elapsed = realNow() - startedAt
    const controllers = tooltipSurface?.children.filter(child => child instanceof RootTooltipControllerNode) ?? []

    expect(controllers).toHaveLength(1)
    expect(root.children).toHaveLength(initialRootChildCount)
    expect(app.events.interactiveNodes.size).toBe(initialInteractiveCount)
    expect(elapsed).toBeLessThan(400)
    console.info(`[bench] ui-kit:tooltip-registry-10k-pointer-moves elapsed=${elapsed.toFixed(2)}ms budget=400ms controllerCount=${controllers.length} interactiveGrowth=${app.events.interactiveNodes.size - initialInteractiveCount}`)

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

  it('routes SearchInput canvas keyboard input through DOM focus and callbacks', () => {
    const app = createApp()
    const surface = app.createSurface('search-input-events')
    const valueChange = vi.fn()
    const search = vi.fn()

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'search-input-root',
      children: [
        {
          type: NovaUIKit.SearchInput,
          id: 'search-input',
          props: {
            x: 10,
            y: 10,
            width: 260,
            height: 36,
            inputEngine: 'canvas',
            onValueChange: valueChange,
            onSearch: search,
          },
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    app.canvas.element.dispatchEvent(new MouseEvent('mousedown', { clientX: 20, clientY: 20, button: 0, bubbles: true }))

    expect(document.activeElement).toBe(app.canvas.element)

    for (const key of ['m', 'a', 'y']) {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    }
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))

    expect(valueChange).toHaveBeenCalledWith('m', expect.objectContaining({ component: 'search', reason: 'keyboard' }))
    expect(valueChange).toHaveBeenCalledWith('ma', expect.objectContaining({ component: 'search', reason: 'keyboard' }))
    expect(valueChange).toHaveBeenCalledWith('may', expect.objectContaining({ component: 'search', reason: 'keyboard' }))
    expect(search).toHaveBeenCalledWith('may', expect.objectContaining({ component: 'search', reason: 'search' }))
    expect(app.components.requireApi<InputApi>('search-input').getState().draft).toBe('may')

    app.destroy()
  })

  it('keeps SearchInput proxy input callbacks on textarea events', () => {
    const app = createApp()
    const surface = app.createSurface('search-input-proxy-events')
    const valueChange = vi.fn()

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'search-input-proxy-root',
      children: [
        {
          type: NovaUIKit.SearchInput,
          id: 'search-input-proxy',
          props: {
            x: 10,
            y: 10,
            width: 260,
            height: 36,
            inputEngine: 'proxy',
            onValueChange: valueChange,
          },
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    app.canvas.element.dispatchEvent(new MouseEvent('mousedown', { clientX: 20, clientY: 20, button: 0, bubbles: true }))

    const textarea = document.querySelector('textarea')

    expect(textarea).not.toBeNull()
    expect(document.activeElement).toBe(textarea)

    textarea!.value = 'proxy'
    textarea!.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'proxy' }))

    expect(valueChange).toHaveBeenCalledWith('proxy', expect.objectContaining({ component: 'search', reason: 'proxy' }))
    expect(app.components.requireApi<InputApi>('search-input-proxy').getState().draft).toBe('proxy')

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

  it('uses the full rect without resizer when SplitPane has one pane', () => {
    const app = createApp()
    const surface = app.createSurface('split-pane-single-pane')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'split-single-pane-root',
      props: { width: 300, height: 120 },
      children: [
        {
          type: NovaUIKit.SplitPane,
          id: 'split-single-pane',
          props: {
            direction: 'vertical',
            width: 300,
            height: 120,
            sizes: [40, 80],
            minSizes: [40, 40],
            resizer: { hitSize: 10 },
          },
          children: [
            { type: NovaUIKit.Surface, id: 'split-single-pane-content' },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const split = app.components.require('split-single-pane') as unknown as NovaNode<TestEvents>
    const content = app.components.require('split-single-pane-content')

    expect(content.width).toBe(300)
    expect(content.height).toBe(120)
    expect(split.children.some(child => child.__type === 'RowResizer' || child.__type === 'ColResizer')).toBe(false)

    app.destroy()
  })

  it('reflows the first pane to the full rect when the second SplitPane child is removed', () => {
    const app = createApp()
    const surface = app.createSurface('split-pane-dynamic-single-pane')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'split-dynamic-single-pane-root',
      props: { width: 300, height: 120 },
      children: [
        {
          type: NovaUIKit.SplitPane,
          id: 'split-dynamic-single-pane',
          props: {
            direction: 'vertical',
            width: 300,
            height: 120,
            sizes: [40, 80],
            minSizes: [40, 40],
            resizer: { hitSize: 10 },
          },
          children: [
            { type: NovaUIKit.Surface, id: 'split-dynamic-main' },
            { type: NovaUIKit.Surface, id: 'split-dynamic-mini' },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const split = app.components.require('split-dynamic-single-pane') as unknown as NovaNode<TestEvents> & {
      setChildren: (children: Array<Record<string, unknown>>) => void
    }
    expect(split.children.some(child => child.__type === 'RowResizer')).toBe(true)

    split.setChildren([
      { type: NovaUIKit.Surface, id: 'split-dynamic-main' },
    ])
    app.raph.run()
    app.raph.run()

    const main = app.components.require('split-dynamic-main')
    expect(main.width).toBe(300)
    expect(main.height).toBe(120)
    expect(split.children.some(child => child.__type === 'RowResizer' || child.__type === 'ColResizer')).toBe(false)

    app.destroy()
  })

  it('treats SplitPane children with display none as inactive panes without unmounting them', () => {
    const app = createApp()
    const surface = app.createSurface('split-pane-hidden-pane')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'split-hidden-pane-root',
      props: { width: 300, height: 120 },
      children: [
        {
          type: NovaUIKit.SplitPane,
          id: 'split-hidden-pane',
          props: {
            direction: 'vertical',
            width: 300,
            height: 120,
            sizes: [40, 80],
            minSizes: [40, 40],
            resizer: { hitSize: 10 },
          },
          children: [
            { type: NovaUIKit.Surface, id: 'split-hidden-main' },
            { type: NovaUIKit.Surface, id: 'split-hidden-mini' },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const split = app.components.require('split-hidden-pane') as unknown as NovaNode<TestEvents>
    const main = app.components.require('split-hidden-main')
    const mini = app.components.require<any>('split-hidden-mini')

    expect(main.height).toBe(40)
    expect(mini.height).toBe(70)
    expect(split.children.some(child => child.__type === 'RowResizer')).toBe(true)

    mini.setProps({ display: 'none' })
    app.raph.run()
    app.raph.run()

    expect(app.components.require('split-hidden-mini')).toBe(mini)
    expect(main.width).toBe(300)
    expect(main.height).toBe(120)
    expect(mini.visible).toBe(false)
    expect(mini.active).toBe(false)
    expect(mini.width).toBe(0)
    expect(mini.height).toBe(0)
    expect(split.children.some(child => child.__type === 'RowResizer' || child.__type === 'ColResizer')).toBe(false)

    mini.setProps({ display: 'normal' })
    app.raph.run()
    app.raph.run()

    expect(app.components.require('split-hidden-mini')).toBe(mini)
    expect(main.height).toBe(40)
    expect(mini.height).toBe(70)
    expect(mini.visible).toBe(true)
    expect(mini.active).toBe(true)
    expect(split.children.some(child => child.__type === 'RowResizer')).toBe(true)

    app.destroy()
  })

  it('collapses inactive SplitPane children even when child does not implement common display props', () => {
    const app = createApp()
    const surface = app.createSurface('split-pane-custom-hidden-pane')
    Nova.registerComponents(app.schema, InspectorCardNode)

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'split-custom-hidden-root',
      props: { width: 300, height: 120 },
      children: [
        {
          type: NovaUIKit.SplitPane,
          id: 'split-custom-hidden',
          props: {
            direction: 'vertical',
            width: 300,
            height: 120,
            sizes: [40, 80],
            minSizes: [40, 40],
            resizer: { hitSize: 10 },
          },
          children: [
            { type: 'InspectorCard', id: 'split-custom-main' },
            { type: 'InspectorCard', id: 'split-custom-mini' },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const split = app.components.require('split-custom-hidden') as unknown as NovaNode<TestEvents>
    const main = app.components.require<any>('split-custom-main')
    const mini = app.components.require<any>('split-custom-mini')

    expect(main.height).toBe(40)
    expect(mini.height).toBe(70)
    expect(split.children.some(child => child.__type === 'RowResizer')).toBe(true)

    mini.setProps({ display: 'none' })
    app.components.requireApi<SplitPaneApi>('split-custom-hidden').relayout()
    app.raph.run()
    app.raph.run()

    expect(main.width).toBe(300)
    expect(main.height).toBe(120)
    expect(mini.visible).toBe(false)
    expect(mini.active).toBe(false)
    expect(mini.width).toBe(0)
    expect(mini.height).toBe(0)
    expect(split.children.some(child => child.__type === 'RowResizer' || child.__type === 'ColResizer')).toBe(false)

    mini.setProps({ display: 'normal' })
    app.components.requireApi<SplitPaneApi>('split-custom-hidden').relayout()
    app.raph.run()
    app.raph.run()

    expect(main.height).toBe(40)
    expect(mini.height).toBe(70)
    expect(mini.visible).toBe(true)
    expect(mini.active).toBe(true)
    expect(split.children.some(child => child.__type === 'RowResizer')).toBe(true)

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

  it('reports current pane rects while SplitPane is resized', () => {
    const app = createApp()
    const surface = app.createSurface('split-pane-resize-payload')
    const payloads: Array<SplitPaneResizePayload> = []

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'split-payload-root',
      props: { width: 300, height: 180 },
      children: [
        {
          type: NovaUIKit.SplitPane,
          id: 'split-payload',
          props: {
            width: 300,
            height: 180,
            direction: 'vertical',
            sizes: [100, 80],
            minSizes: [40, 40],
            resizer: { hitSize: 12 },
            onResize: payload => payloads.push(payload),
          },
          children: [
            { type: NovaUIKit.Surface, id: 'split-payload-first' },
            { type: NovaUIKit.Surface, id: 'split-payload-second' },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const split = app.components.require('split-payload') as unknown as NovaNode<TestEvents>
    const resizer = split.children.find(child => child.__type === 'RowResizer') as NovaNode<TestEvents>

    resizer.eventHandlers.dragstart?.(new MouseEvent('mousedown', { clientX: 10, clientY: 100 }), { startX: 10, startY: 100 })
    resizer.eventHandlers.dragmove?.(new MouseEvent('mousemove', { clientX: 10, clientY: 120 }), 0, 20, { totalDx: 0, totalDy: 20, startX: 10, startY: 100 })
    app.raph.run()

    expect(payloads.at(-1)?.panes?.first).toMatchObject({ x: 0, y: 0, width: 300, height: 120 })
    expect(payloads.at(-1)?.panes?.second).toMatchObject({ x: 0, y: 132, width: 300, height: 48 })

    app.destroy()
  })

  it('previews SplitPane resizer position and commits pane sizes at drag end in lazy mode', () => {
    const app = createApp()
    const surface = app.createSurface('split-pane-lazy-drag')
    const onResize = vi.fn()
    const onResizeEnd = vi.fn()

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'split-lazy-root',
      props: { width: 300, height: 120 },
      children: [
        {
          type: NovaUIKit.SplitPane,
          id: 'split-lazy',
          props: {
            width: 300,
            height: 120,
            sizes: [120, 180],
            resizeMode: 'lazy',
            resizer: { hitSize: 10 },
            onResize,
            onResizeEnd,
          },
          children: [
            { type: NovaUIKit.Surface, id: 'split-lazy-left' },
            { type: NovaUIKit.Surface, id: 'split-lazy-right' },
          ],
        },
      ],
    })
    app.raph.run()
    app.raph.run()

    const split = app.components.require('split-lazy') as unknown as NovaNode<TestEvents>
    const resizer = split.children.find(child => child.__type === 'ColResizer') as NovaNode<TestEvents>

    resizer.eventHandlers.dragstart?.(new MouseEvent('mousedown', { clientX: 120, clientY: 10 }), { startX: 120, startY: 10 })
    resizer.eventHandlers.dragmove?.(new MouseEvent('mousemove', { clientX: 150, clientY: 10 }), 30, 0, { totalDx: 30, totalDy: 0, startX: 120, startY: 10 })
    app.raph.run()
    app.raph.run()

    expect(app.components.require('split-lazy-left').width).toBe(120)
    expect(app.components.require('split-lazy-right').width).toBe(170)
    expect(resizer.x).toBe(150)
    expect(onResize).toHaveBeenCalledWith(expect.objectContaining({ delta: 30, rect: expect.objectContaining({ x: 150 }) }))

    resizer.eventHandlers.dragend?.(new MouseEvent('mouseup', { clientX: 150, clientY: 10 }), { totalDx: 30, totalDy: 0, startX: 120, startY: 10 })
    app.raph.run()
    app.raph.run()

    expect(app.components.require('split-lazy-left').width).toBe(150)
    expect(app.components.require('split-lazy-right').width).toBe(140)
    expect(onResizeEnd).toHaveBeenCalledWith(expect.objectContaining({ delta: 30, rect: expect.objectContaining({ x: 150 }) }))

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

  it('applies active @theme stylesheet rules without requiring theme classes', () => {
    const app = createApp()
    app.theme.registerMany([
      { id: 'light', tokens: {} },
      { id: 'dark', tokens: {} },
    ], { active: 'light' })
    const base = validateNovaUiStyleSheetSource(`
      Button.test-bg {
        background: #111827;
      }
    `)
    const dark = validateNovaUiStyleSheetSource(`
      Button.test-bg {
        background: #ff0000;
      }
    `)
    const surface = app.createSurface('theme-rule-styles')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'theme-rule-root',
      props: {
        styleSheet: {
          ok: base.ok && dark.ok,
          source: base.styleSheet?.source ?? '',
          styleSheet: base.styleSheet,
          themes: [
            {
              id: 'dark',
              tokens: {},
              styleSheet: null,
            },
            {
              id: 'dark',
              tokens: {},
              styleSheet: dark.styleSheet,
            },
          ],
          diagnostics: [...base.diagnostics, ...dark.diagnostics],
          tokenDependencies: [],
        },
      },
      children: [
        { type: NovaUIKit.Button, id: 'theme-rule-button', props: { className: 'test-bg', text: 'Theme rule' } },
      ],
    })
    app.raph.run()
    app.raph.run()

    expect(app.components.requireApi<ButtonApi>('theme-rule-button').getProps().background).toBe('#111827')

    app.theme.use('dark')
    app.raph.run()
    app.raph.run()

    expect(app.components.requireApi<ButtonApi>('theme-rule-button').getProps().background).toBe('#ff0000')

    app.theme.use('light')
    app.raph.run()
    app.raph.run()

    expect(app.components.requireApi<ButtonApi>('theme-rule-button').getProps().background).toBe('#111827')

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
      normalizeDividerProps,
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
        margin: 4 8;
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

  it('uses built-in light and dark icons for ThemeSwitch defaults', () => {
    const app = createApp()
    const surface = app.createSurface('theme-switch-defaults')

    app.schema.createNode(surface, {
      type: NovaUIKit.ThemeSwitch,
      id: 'theme-switch-defaults',
      props: {},
    })

    const props = app.components.requireApi<ThemeSwitchApi>('theme-switch-defaults').getProps()
    expect(props.themes.map(theme => theme.id)).toEqual(['light', 'dark'])
    expect(props.themes.every(theme => theme.icon)).toBe(true)
    expect(app.assets.resolveRecord(THEME_SWITCH_ASSETS.icons.sun)).toBeDefined()
    expect(app.assets.resolveRecord(THEME_SWITCH_ASSETS.icons.moon)).toBeDefined()

    app.destroy()
  })

  it('commits ThemeSwitch theme change on pointer down', () => {
    const app = createApp()
    const surface = app.createSurface('theme-switch-pointer-down')

    app.schema.createNode(surface, {
      type: NovaUIKit.ThemeSwitch,
      id: 'theme-switch-pointer-down',
      props: {
        x: 16,
        y: 16,
        themes: [{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }],
      },
    })
    app.raph.run()

    expect(app.theme.active()).toBe('light')
    app.handleEvent('mousedown', new MouseEvent('mousedown', { clientX: 34, clientY: 34, button: 0 }))
    expect(app.theme.active()).toBe('dark')

    app.handleEvent('mouseleave', new MouseEvent('mouseleave', { clientX: 120, clientY: 120, button: 0 }))
    app.handleEvent('mouseup', new MouseEvent('mouseup', { clientX: 120, clientY: 120, button: 0 }))
    expect(app.theme.active()).toBe('dark')

    app.destroy()
  })

  it('commits toolbar Button and ZoomControls actions on pointer down', () => {
    const app = createApp()
    const surface = app.createSurface('toolbar-pointer-down-actions')
    const buttonPress = vi.fn()
    const zoomChange = vi.fn()

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'toolbar-pointer-down-root',
      props: { width: 420, height: 240, padding: 0 },
      children: [{
        type: NovaUIKit.Flex,
        id: 'toolbar-pointer-down',
        props: { position: 'fixed', inset: { top: 16, right: 16 }, gap: 8, alignItems: 'center' },
        children: [
          {
            type: NovaUIKit.ZoomControls,
            id: 'toolbar-pointer-down-zoom',
            props: { value: 1, step: 0.2, minZoom: 0.1, maxZoom: 3, onChange: zoomChange },
          },
          {
            type: NovaUIKit.Button,
            id: 'toolbar-pointer-down-settings',
            props: { width: 36, height: 36, onPress: buttonPress },
          },
        ],
      }],
    })
    app.raph.run()
    app.raph.run()

    const toolbar = app.components.require('toolbar-pointer-down')
    const zoom = app.components.require('toolbar-pointer-down-zoom')
    const settings = app.components.require('toolbar-pointer-down-settings')

    app.handleEvent('mousedown', new MouseEvent('mousedown', {
      clientX: toolbar.x + zoom.x + zoom.width - 10,
      clientY: toolbar.y + zoom.y + 10,
      button: 0,
    }))
    expect(zoomChange).toHaveBeenCalledWith(1.2)
    expect(app.components.requireApi<ZoomControlsApi>('toolbar-pointer-down-zoom').getProps().value).toBe(1.2)

    app.handleEvent('mousedown', new MouseEvent('mousedown', {
      clientX: toolbar.x + settings.x + 10,
      clientY: toolbar.y + settings.y + 10,
      button: 0,
    }))
    expect(buttonPress).toHaveBeenCalledTimes(1)

    app.destroy()
  })

  it('registers built-in light and dark NovaUIKit theme tokens on first component use', () => {
    const app = createApp()
    const surface = app.createSurface('built-in-theme-tokens')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'built-in-theme-root',
      children: [
        { type: NovaUIKit.Button, id: 'built-in-theme-button', props: { text: 'Theme' } },
      ],
    })

    expect(app.theme.active()).toBe('light')
    expect(resolveNovaUiThemeValue(app, 'var(--nova-button-background, #ffffff)')).toBe('#ffffff')

    app.theme.use('dark')
    expect(resolveNovaUiThemeValue(app, 'var(--nova-button-background, #ffffff)')).toBe('#172033')

    app.destroy()
  })

  it('supports CSS-like absolute and flow positioning in UI Kit containers', () => {
    const app = createApp()
    const surface = app.createSurface('positioned-layout')

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'positioned-root',
      props: { width: 420, height: 240, padding: 0 },
      children: [
        {
          type: NovaUIKit.Flex,
          id: 'positioned-flex',
          props: { width: 420, height: 240, direction: 'row', gap: 10, padding: 12, alignItems: 'start' },
          children: [
            { type: NovaUIKit.Surface, id: 'positioned-flow-a', layout: { width: 80, height: 40, flexShrink: 0 } },
            { type: NovaUIKit.FpsMeter, id: 'positioned-fps-flow', props: { width: 74, height: 28 }, layout: { flexShrink: 0 } },
            {
              type: NovaUIKit.ThemeSwitch,
              id: 'positioned-theme-absolute',
              props: { width: 36, height: 36, themes: [{ id: 'light', label: 'Light' }] },
              layout: { position: 'absolute', inset: { top: 16, right: 18 }, zIndex: 25 },
            },
          ],
        },
        {
          type: NovaUIKit.Flex,
          id: 'positioned-fixed-flex',
          props: { position: 'fixed', inset: { top: 16, right: 16 }, gap: 8, alignItems: 'center' },
          children: [
            { type: NovaUIKit.FpsMeter, id: 'positioned-fixed-fps' },
            { type: NovaUIKit.ThemeSwitch, id: 'positioned-fixed-theme' },
          ],
        },
      ],
    })

    expect(app.components.require('positioned-fixed-flex').x).toBe(420 - 16 - 130)
    expect(app.components.require('positioned-fixed-flex').y).toBe(16)
    expect(app.components.require('positioned-fixed-flex').layoutReady).toBe(true)

    app.raph.run()
    app.raph.run()

    const flex = app.components.requireApi<FlexApi>('positioned-flex')
    const fps = app.components.require('positioned-fps-flow')
    const theme = app.components.require('positioned-theme-absolute')

    expect(flex.getChildRect('positioned-flow-a')).toEqual({ x: 12, y: 12, width: 80, height: 40 })
    expect(flex.getChildRect('positioned-fps-flow')).toEqual({ x: 102, y: 12, width: 74, height: 28 })
    expect(fps.x).toBe(102)
    expect(fps.y).toBe(12)
    expect(flex.getChildRect('positioned-theme-absolute')).toEqual({ x: 354, y: 28, width: 36, height: 36 })
    expect(theme.weight).toBe(25)
    const fixedFlex = app.components.requireApi<FlexApi>('positioned-fixed-flex')
    expect(app.components.require('positioned-fixed-flex').x).toBe(420 - 16 - 130)
    expect(app.components.require('positioned-fixed-flex').y).toBe(16)
    expect(app.components.require('positioned-fixed-flex').width).toBe(130)
    expect(app.components.require('positioned-fixed-flex').height).toBe(36)
    expect(fixedFlex.getChildRect('positioned-fixed-fps')).toEqual({ x: 0, y: 0, width: 86, height: 36 })
    expect(fixedFlex.getChildRect('positioned-fixed-theme')).toEqual({ x: 94, y: 0, width: 36, height: 36 })

    app.destroy()
  })

  it('uses rAF FPS by default but keeps the public FPS label', () => {
    expect(resolveFpsMeterReading({ fps: 72, rFps: 30 })).toEqual({ value: 30, label: 'FPS' })
    expect(resolveFpsMeterReading({ fps: 72, rFps: 30 }, 'render')).toEqual({ value: 72, label: 'FPS' })
    expect(resolveFpsMeterReading({ fps: 1200, rFps: -10 })).toEqual({ value: 0, label: 'FPS' })
  })

  it('keeps fixed toolbar controls hit-testable with canvas event coordinates', () => {
    const app = createApp()
    const surface = app.createSurface('fixed-toolbar-zoom-hit')
    const onChange = vi.fn()
    const toolbarSchema = (value: number) => ({
      type: NovaUIKit.Flex,
      id: 'fixed-toolbar',
      props: { position: 'fixed', inset: { top: 16, right: 16 }, gap: 8, alignItems: 'center' },
      children: [
        { type: NovaUIKit.FpsMeter, id: 'fixed-toolbar-fps' },
        {
          type: NovaUIKit.ZoomControls,
          id: 'fixed-toolbar-zoom',
          props: { value, step: 0.2, minZoom: 0.1, maxZoom: 3, onChange },
        },
        { type: NovaUIKit.ThemeSwitch, id: 'fixed-toolbar-theme' },
        {
          type: NovaUIKit.Button,
          id: 'fixed-toolbar-settings',
          props: { width: 36, height: 36, iconPlacement: 'only', icon: THEME_SWITCH_ASSETS.icons.sun },
        },
      ],
    })

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'fixed-toolbar-root',
      props: { width: 420, height: 240, padding: 0 },
      children: [toolbarSchema(1)],
    })
    app.raph.run()
    app.raph.run()

    const toolbar = app.components.require('fixed-toolbar')
    const fixedToolbar = app.components.requireApi<FlexApi>('fixed-toolbar')
    const fps = app.components.require('fixed-toolbar-fps')
    const zoom = app.components.require('fixed-toolbar-zoom') as NovaNode<TestEvents>
    const theme = app.components.require('fixed-toolbar-theme')
    const settings = app.components.require('fixed-toolbar-settings')
    const x = toolbar.x + zoom.x + zoom.width - 10
    const y = toolbar.y + zoom.y + 10
    const expectToolbarMatrices = () => {
      expect(Math.round(fps.matrix[6])).toBe(100)
      expect(Math.round(fps.matrix[7])).toBe(16)
      expect(Math.round(zoom.matrix[6])).toBe(194)
      expect(Math.round(zoom.matrix[7])).toBe(16)
      expect(Math.round(theme.matrix[6])).toBe(324)
      expect(Math.round(theme.matrix[7])).toBe(16)
      expect(Math.round(settings.matrix[6])).toBe(368)
      expect(Math.round(settings.matrix[7])).toBe(16)
    }

    expect(toolbar.x).toBe(420 - 16 - 304)
    expect(toolbar.y).toBe(16)
    expect(fixedToolbar.getChildRect('fixed-toolbar-fps')).toEqual({ x: 0, y: 0, width: 86, height: 36 })
    expect(fixedToolbar.getChildRect('fixed-toolbar-zoom')).toEqual({ x: 94, y: 0, width: 122, height: 36 })
    expect(fixedToolbar.getChildRect('fixed-toolbar-theme')).toEqual({ x: 224, y: 0, width: 36, height: 36 })
    expect(fixedToolbar.getChildRect('fixed-toolbar-settings')).toEqual({ x: 268, y: 0, width: 36, height: 36 })
    expect(fps.x).toBe(0)
    expect(zoom.x).toBe(94)
    expect(theme.x).toBe(224)
    expect(settings.x).toBe(268)
    expectToolbarMatrices()
    expect(app.events.hitTest(x, y)?.id).toBe(zoom.id)

    app.handleEvent('mousedown', new MouseEvent('mousedown', { clientX: x, clientY: y, button: 0 }))
    app.handleEvent('mouseup', new MouseEvent('mouseup', { clientX: x, clientY: y, button: 0 }))

    expect(onChange).toHaveBeenCalledWith(1.2)
    expect(app.components.requireApi<ZoomControlsApi>('fixed-toolbar-zoom').getProps().value).toBe(1.2)

    app.components.requireApi<RootApi>('fixed-toolbar-root').setChildren([toolbarSchema(1.2)])
    app.raph.run()
    app.raph.run()

    expect(toolbar.x).toBe(420 - 16 - 304)
    expect(fixedToolbar.getChildRect('fixed-toolbar-fps')).toEqual({ x: 0, y: 0, width: 86, height: 36 })
    expect(fixedToolbar.getChildRect('fixed-toolbar-zoom')).toEqual({ x: 94, y: 0, width: 122, height: 36 })
    expect(fixedToolbar.getChildRect('fixed-toolbar-theme')).toEqual({ x: 224, y: 0, width: 36, height: 36 })
    expect(fixedToolbar.getChildRect('fixed-toolbar-settings')).toEqual({ x: 268, y: 0, width: 36, height: 36 })
    expect(fps.x).toBe(0)
    expect(zoom.x).toBe(94)
    expect(theme.x).toBe(224)
    expect(settings.x).toBe(268)
    expectToolbarMatrices()

    app.destroy()
  })

  it('applies fixed Flex layout synchronously when template children are patched', () => {
    const app = createApp()
    const surface = app.createSurface('fixed-toolbar-sync-layout')
    const compactToolbar = {
      type: NovaUIKit.Flex,
      id: 'sync-fixed-toolbar',
      props: { position: 'fixed', inset: { top: 16, right: 16 }, gap: 8, alignItems: 'center' },
      children: [
        { type: NovaUIKit.FpsMeter, id: 'sync-fixed-toolbar-fps' },
      ],
    }
    const expandedToolbar = {
      ...compactToolbar,
      children: [
        { type: NovaUIKit.FpsMeter, id: 'sync-fixed-toolbar-fps' },
        { type: NovaUIKit.ZoomControls, id: 'sync-fixed-toolbar-zoom', props: { value: 1, step: 0.2, minZoom: 0.1, maxZoom: 3 } },
        { type: NovaUIKit.ThemeSwitch, id: 'sync-fixed-toolbar-theme' },
        {
          type: NovaUIKit.Button,
          id: 'sync-fixed-toolbar-settings',
          props: { width: 36, height: 36, iconPlacement: 'only', icon: THEME_SWITCH_ASSETS.icons.sun },
        },
      ],
    }

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'sync-fixed-toolbar-root',
      props: { width: 420, height: 240, padding: 0 },
      children: [compactToolbar],
    })
    app.raph.run()
    app.raph.run()

    app.components.requireApi<RootApi>('sync-fixed-toolbar-root').setChildren([expandedToolbar])

    const toolbar = app.components.require('sync-fixed-toolbar')
    const fixedToolbar = app.components.requireApi<FlexApi>('sync-fixed-toolbar')
    const fps = app.components.require('sync-fixed-toolbar-fps')
    const zoom = app.components.require('sync-fixed-toolbar-zoom')
    const theme = app.components.require('sync-fixed-toolbar-theme')
    const settings = app.components.require('sync-fixed-toolbar-settings')

    expect(toolbar.x).toBe(420 - 16 - 304)
    expect(fixedToolbar.getChildRect('sync-fixed-toolbar-fps')).toEqual({ x: 0, y: 0, width: 86, height: 36 })
    expect(fixedToolbar.getChildRect('sync-fixed-toolbar-zoom')).toEqual({ x: 94, y: 0, width: 122, height: 36 })
    expect(fixedToolbar.getChildRect('sync-fixed-toolbar-theme')).toEqual({ x: 224, y: 0, width: 36, height: 36 })
    expect(fixedToolbar.getChildRect('sync-fixed-toolbar-settings')).toEqual({ x: 268, y: 0, width: 36, height: 36 })
    expect(fps.x).toBe(0)
    expect(zoom.x).toBe(94)
    expect(theme.x).toBe(224)
    expect(settings.x).toBe(268)
    expect(Math.round(fps.matrix[6])).toBe(100)
    expect(Math.round(zoom.matrix[6])).toBe(194)
    expect(Math.round(theme.matrix[6])).toBe(324)
    expect(Math.round(settings.matrix[6])).toBe(368)

    app.destroy()
  })

  it('plays class keyframe animation once for stable component ids', () => {
    const app = createApp()
    const motionSpy = vi.spyOn(app.motion, 'to')
    const surface = app.createSurface('class-animation')
    const toolbar = {
      type: NovaUIKit.Flex,
      id: 'animated-toolbar',
      props: { position: 'fixed', className: 'fade-slide-in', inset: { top: 16, right: 16 }, gap: 8 },
      children: [
        { type: NovaUIKit.FpsMeter, id: 'animated-toolbar-fps' },
      ],
    }

    app.schema.createNode(surface, {
      type: NovaUIKit.Root,
      id: 'animation-root',
      props: { width: 900, height: 560 },
      children: [toolbar],
    })
    app.raph.run()

    expect(motionSpy).toHaveBeenCalledTimes(1)
    expect(motionSpy.mock.calls[0]?.[1]).toEqual({ opacity: 1 })

    app.components.requireApi<RootApi>('animation-root').setChildren([toolbar])
    app.raph.run()

    expect(motionSpy).toHaveBeenCalledTimes(1)

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

function dispatchMouse(canvas: HTMLCanvasElement, type: string, x: number, y: number): void {
  canvas.dispatchEvent(new MouseEvent(type, {
    clientX: x,
    clientY: y,
    button: 0,
    bubbles: true,
  }))
}
