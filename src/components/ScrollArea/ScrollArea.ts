import {
  NovaTemplateRuntime,
  reconcileNovaTemplateChildren,
  type NovaApp,
  type NovaNode,
  type NovaSurface,
  type NovaTemplateChildSchema,
  type NovaTemplateSlots,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  SCROLL_AREA_NODE_DESCRIPTOR,
  normalizeScrollAreaProps,
  type ScrollAreaDescriptor,
} from '@/components/ScrollArea/ScrollArea.config'
import type {
  ScrollAreaApi,
  ScrollAreaChildSchema,
  ScrollAreaCornerSlotContext,
  ScrollAreaProps,
  ScrollAreaResolvedProps,
  ScrollAreaSlotContext,
  ScrollAreaState,
  ScrollAreaVisualState,
} from '@/components/ScrollArea/ScrollArea.types'
import { SCROLLBAR_SCHEMA_TYPE, type ScrollbarApi } from '@/components/Scrollbar/Scrollbar.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  clamp,
} from '@/shared/component'
import { applyNodeLayoutRect } from '@/shared/layout'
import type { NovaUiLayoutRect } from '@/shared/layout'

type ScrollbarOrientation = 'horizontal' | 'vertical'

export class ScrollArea<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ScrollAreaResolvedProps, ScrollAreaApi, ScrollAreaProps, E> {
  private readonly contentChildren: Array<NovaNode<E>> = []
  private readonly slotRuntimes = new Map<string, NovaTemplateRuntime<E>>()
  private verticalScrollbar: NovaNode<E> | null = null
  private horizontalScrollbar: NovaNode<E> | null = null
  private readonly api: ScrollAreaApi
  private slots: NovaTemplateSlots = {}
  private idleTimer = 0
  private lastScrollbarActivityAt = 0
  private scrollSyncPending = false
  private scrollVersion = 0
  private flushedScrollVersion = 0
  private visualState: ScrollAreaVisualState = {
    hovered: false,
    scrolling: false,
    dragging: false,
    idle: true,
    visible: false,
    opacity: 0,
  }

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ScrollAreaProps = {},
    options: { componentId?: string; children?: Array<ScrollAreaChildSchema>; slots?: NovaTemplateSlots } = {},
    descriptor: ScrollAreaDescriptor = SCROLL_AREA_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeScrollAreaProps(props), options)
    this.api = {
      scrollTo: (x, y) => this.scrollTo(x, y),
      scrollBy: (dx, dy) => this.scrollTo(this.props.scrollX + dx, this.props.scrollY + dy),
      getScrollState: () => this.getScrollState(),
      getScrollbarState: () => ({ ...this.visualState }),
      setChildren: children => this.setChildren(children),
      setSlots: slots => this.setSlots(slots),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.slots = { ...(options.slots ?? {}) }
    this.setChildren(options.children ?? [])
    this.ensureScrollbars()
    this.setupEvents()
  }

  override setProps(patch: ScrollAreaProps): this {
    return super.setProps(patch as Partial<ScrollAreaResolvedProps>)
  }

  override getApi(): ScrollAreaApi {
    return this.api
  }

  setChildren(children: Array<ScrollAreaChildSchema>): void {
    const reconciled = reconcileNovaTemplateChildren(this, this.contentChildren, children)
    this.contentChildren.length = 0
    this.contentChildren.push(...reconciled.nodes)
    this.dirty({ update: true, render: true })
  }

  setSlots(slots: NovaTemplateSlots = {}): void {
    this.slots = { ...slots }
    this.ensureScrollbars()
    this.syncScrollbars()
    this.dirty({ update: true, render: true })
  }

  scrollTo(x: number, y: number): void {
    const nextX = clamp(Number.isFinite(x) ? x : 0, 0, Math.max(0, this.props.contentWidth - this.props.width))
    const nextY = clamp(Number.isFinite(y) ? y : 0, 0, Math.max(0, this.props.contentHeight - this.props.height))
    if (nextX === this.props.scrollX && nextY === this.props.scrollY) return
    this.markScrollbarsActive(false)
    this.props.scrollX = nextX
    this.props.scrollY = nextY
    this.scrollVersion += 1
    if (!this.scrollSyncPending) {
      this.scrollSyncPending = true
      this.dirty({ update: true, render: true })
      queueMicrotask(() => this.flushDeferredScrollSync())
    }
  }

  getScrollState(): ScrollAreaState {
    return {
      x: {
        value: this.props.scrollX,
        max: Math.max(0, this.props.contentWidth - this.width),
        viewportSize: this.width,
        contentSize: this.props.contentWidth,
      },
      y: {
        value: this.props.scrollY,
        max: Math.max(0, this.props.contentHeight - this.height),
        viewportSize: this.height,
        contentSize: this.props.contentHeight,
      },
    }
  }

  update(): void {
    this.flushedScrollVersion = this.scrollVersion
    for (const child of this.contentChildren) {
      applyNodeLayoutRect(child as NovaNode<any>, {
        x: -this.props.scrollX,
        y: -this.props.scrollY,
        width: this.props.contentWidth,
        height: this.props.contentHeight,
      })
      child.dirty({ matrix: true, update: true, render: true })
    }
    this.syncScrollbars()
  }

  render(): void {
    const schema = buildBoxSchema(this.props, this.width, this.height)
    if (schema.length > 0) this.renderer.schema(schema)
    this.renderer.clip(0, 0, this.width, this.height)
  }

  protected override onPropsChanged(changedKeys: Array<keyof ScrollAreaResolvedProps>): void {
    this.props = normalizeScrollAreaProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
    if (this.hasStructuralScrollbarChanges(changedKeys)) this.ensureScrollbars()
    else if (!this.shouldDeferScrollbarSync(changedKeys)) this.syncScrollbars()
    this.dirty({ update: true, render: true })
  }

  private setupEvents(): void {
    this.on('mouseenter', () => {
      if (this.props.disabled) return
      this.visualState.hovered = true
      this.markScrollbarsActive()
    })
    this.on('mouseleave', () => {
      this.visualState.hovered = false
      this.scheduleScrollbarIdle()
    })
    this.on('wheel', event => {
      if (this.props.disabled) return false
      event.preventDefault()
      const multiplier = this.props.wheelMultiplier
      const dx = this.props.axis === 'y' ? 0 : event.deltaX * multiplier
      const dy = this.props.axis === 'x' ? 0 : event.deltaY * multiplier
      this.scrollTo(
        this.props.scrollX + dx,
        this.props.scrollY + dy,
      )
      return false
    })
  }

  private ensureScrollbars(): void {
    if (this.props.scrollbarVisibility === 'hidden') {
      this.verticalScrollbar?.remove()
      this.horizontalScrollbar?.remove()
      this.verticalScrollbar = null
      this.horizontalScrollbar = null
      this.clearSlotRuntimes()
      return
    }

    if (this.hasCustomScrollbar('vertical')) {
      this.verticalScrollbar?.remove()
      this.verticalScrollbar = null
    } else if (!this.verticalScrollbar) {
      this.verticalScrollbar = this.nova.schema.createChild(this, {
        type: SCROLLBAR_SCHEMA_TYPE,
        id: `${this.componentId}-scrollbar-y`,
        props: {
          orientation: 'vertical',
          onChange: (value: number) => this.scrollTo(this.props.scrollX, value),
        },
      }) as NovaNode<E>
    }
    if (this.hasCustomScrollbar('horizontal')) {
      this.horizontalScrollbar?.remove()
      this.horizontalScrollbar = null
    } else if (!this.horizontalScrollbar) {
      this.horizontalScrollbar = this.nova.schema.createChild(this, {
        type: SCROLLBAR_SCHEMA_TYPE,
        id: `${this.componentId}-scrollbar-x`,
        props: {
          orientation: 'horizontal',
          onChange: (value: number) => this.scrollTo(value, this.props.scrollY),
        },
      }) as NovaNode<E>
    }
    this.syncScrollbars()
  }

  private syncScrollbars(): void {
    const thickness = this.props.scrollbar.thickness ?? 8
    const canScrollY = this.props.axis !== 'x'
    const canScrollX = this.props.axis !== 'y'
    const showY = canScrollY && (
      this.props.scrollbarVisibility === 'always' || this.props.contentHeight > this.height
    )
    const showX = canScrollX && (
      this.props.scrollbarVisibility === 'always' || this.props.contentWidth > this.width
    )
    const opacity = this.resolveScrollbarOpacity(showX || showY)
    this.visualState = {
      ...this.visualState,
      visible: showX || showY,
      opacity,
    }
    const verticalTrackRect: NovaUiLayoutRect = {
      x: Math.max(0, this.width - thickness - 2),
      y: 2,
      width: thickness,
      height: Math.max(0, this.height - (showX ? thickness + 6 : 4)),
    }
    const horizontalTrackRect: NovaUiLayoutRect = {
      x: 2,
      y: Math.max(0, this.height - thickness - 2),
      width: Math.max(0, this.width - (showY ? thickness + 6 : 4)),
      height: thickness,
    }
    const verticalThumbRect = this.resolveThumbRect('vertical', verticalTrackRect)
    const horizontalThumbRect = this.resolveThumbRect('horizontal', horizontalTrackRect)

    this.verticalScrollbar?.options({
      x: verticalTrackRect.x,
      y: verticalTrackRect.y,
      width: verticalTrackRect.width,
      height: verticalTrackRect.height,
      visible: showY,
      active: showY,
    })
    this.horizontalScrollbar?.options({
      x: horizontalTrackRect.x,
      y: horizontalTrackRect.y,
      width: horizontalTrackRect.width,
      height: horizontalTrackRect.height,
      visible: showX,
      active: showX,
    })

    this.verticalScrollbarApi()?.setProps({
      ...this.props.scrollbar,
      orientation: 'vertical',
      value: clamp(this.props.scrollY, 0, Math.max(0, this.props.contentHeight - this.height)),
      viewportSize: this.height,
      contentSize: this.props.contentHeight,
      thickness,
      trackColor: this.props.trackColor,
      thumbColor: this.props.thumbColor,
      opacity,
    })
    this.horizontalScrollbarApi()?.setProps({
      ...this.props.scrollbar,
      orientation: 'horizontal',
      value: clamp(this.props.scrollX, 0, Math.max(0, this.props.contentWidth - this.width)),
      viewportSize: this.width,
      contentSize: this.props.contentWidth,
      thickness,
      trackColor: this.props.trackColor,
      thumbColor: this.props.thumbColor,
      opacity,
    })

    this.syncCustomSlots('vertical', showY, verticalTrackRect, verticalThumbRect)
    this.syncCustomSlots('horizontal', showX, horizontalTrackRect, horizontalThumbRect)
    this.syncCornerSlot(showX && showY, {
      x: verticalTrackRect.x,
      y: horizontalTrackRect.y,
      width: verticalTrackRect.width,
      height: horizontalTrackRect.height,
    })
  }

  private verticalScrollbarApi(): ScrollbarApi | null {
    return this.verticalScrollbar && 'getApi' in this.verticalScrollbar
      ? (this.verticalScrollbar as unknown as { getApi: () => ScrollbarApi }).getApi()
      : null
  }

  private horizontalScrollbarApi(): ScrollbarApi | null {
    return this.horizontalScrollbar && 'getApi' in this.horizontalScrollbar
      ? (this.horizontalScrollbar as unknown as { getApi: () => ScrollbarApi }).getApi()
      : null
  }

  private resolveScrollbarOpacity(hasVisibleScrollbar: boolean): number {
    if (!hasVisibleScrollbar) return 0
    if (this.props.scrollbarVisibility !== 'active') return 1
    return this.visualState.opacity
  }

  private markScrollbarsActive(sync = true): void {
    if (this.props.scrollbarVisibility !== 'active') return
    this.lastScrollbarActivityAt = Date.now()
    if (!this.visualState.scrolling || this.visualState.idle || this.visualState.opacity !== 1) {
      this.visualState = {
        ...this.visualState,
        scrolling: true,
        idle: false,
        opacity: 1,
      }
    }
    if (sync) this.syncScrollbars()
    this.scheduleScrollbarIdle()
  }

  private hasStructuralScrollbarChanges(changedKeys: Array<keyof ScrollAreaResolvedProps>): boolean {
    return changedKeys.some(key => (
      key === 'contentWidth'
      || key === 'contentHeight'
      || key === 'scrollbarVisibility'
      || key === 'scrollbar'
      || key === 'axis'
      || key === 'width'
      || key === 'height'
    ))
  }

  private shouldDeferScrollbarSync(changedKeys: Array<keyof ScrollAreaResolvedProps>): boolean {
    return changedKeys.every(key => (
      key === 'scrollX'
      || key === 'scrollY'
      || key === 'scrollbarIdleDelay'
      || key === 'scrollbarFadeDuration'
      || key === 'wheelMultiplier'
    ))
  }

  private flushDeferredScrollSync(): void {
    if (this.lifecycleState === 'destroyed') return
    this.scrollSyncPending = false
    if (this.flushedScrollVersion !== this.scrollVersion) {
      this.dirty({ update: true, render: true })
    }
  }

  private scheduleScrollbarIdle(): void {
    if (this.props.scrollbarVisibility !== 'active') return
    if (this.idleTimer !== 0) return
    this.idleTimer = window.setTimeout(() => this.flushScrollbarIdle(), this.props.scrollbarIdleDelay)
  }

  private flushScrollbarIdle(): void {
    this.idleTimer = 0
    const elapsed = Date.now() - this.lastScrollbarActivityAt
    const remaining = this.props.scrollbarIdleDelay - elapsed
    if (remaining > 0) {
      this.idleTimer = window.setTimeout(() => this.flushScrollbarIdle(), remaining)
      return
    }
    if (this.visualState.hovered || this.visualState.dragging) return
    this.visualState = {
      ...this.visualState,
      scrolling: false,
      idle: true,
      opacity: 0,
    }
    this.syncScrollbars()
    this.dirty({ render: true })
  }

  private hasCustomScrollbar(orientation: ScrollbarOrientation): boolean {
    const axisSlot = orientation === 'vertical' ? this.slots['scrollbar-y'] : this.slots['scrollbar-x']
    return !!axisSlot || !!this.slots.scrollbar || !!this.slots.track || !!this.slots.thumb
  }

  private syncCustomSlots(
    orientation: ScrollbarOrientation,
    visible: boolean,
    trackRect: NovaUiLayoutRect,
    thumbRect: NovaUiLayoutRect,
  ): void {
    const suffix = orientation === 'vertical' ? 'y' : 'x'
    const specificScrollbar = this.slots[`scrollbar-${suffix}`]
    const scrollbar = specificScrollbar ?? this.slots.scrollbar
    const context = this.createSlotContext(orientation, trackRect, thumbRect)

    if (!visible || !this.hasCustomScrollbar(orientation)) {
      this.reconcileSlot(`scrollbar-${suffix}`, [])
      this.reconcileSlot(`track-${suffix}`, [])
      this.reconcileSlot(`thumb-${suffix}`, [])
      return
    }

    if (scrollbar) {
      this.reconcileSlot(`scrollbar-${suffix}`, scrollbar(context))
      this.reconcileSlot(`track-${suffix}`, [])
      this.reconcileSlot(`thumb-${suffix}`, [])
      return
    }

    this.reconcileSlot(`scrollbar-${suffix}`, [])
    this.reconcileSlot(`track-${suffix}`, this.slots.track?.(context) ?? [])
    this.reconcileSlot(`thumb-${suffix}`, this.slots.thumb?.(context) ?? [])
  }

  private syncCornerSlot(visible: boolean, rect: NovaUiLayoutRect): void {
    if (!visible || !this.slots.corner) {
      this.reconcileSlot('corner', [])
      return
    }

    const context: ScrollAreaCornerSlotContext = {
      state: { ...this.visualState },
      rect,
    }
    this.reconcileSlot('corner', this.slots.corner(context))
  }

  private createSlotContext(
    orientation: ScrollbarOrientation,
    trackRect: NovaUiLayoutRect,
    thumbRect: NovaUiLayoutRect,
  ): ScrollAreaSlotContext {
    const vertical = orientation === 'vertical'
    return {
      orientation: vertical ? 'vertical' : 'horizontal',
      state: { ...this.visualState },
      metrics: vertical ? this.getScrollState().y : this.getScrollState().x,
      thumbRect,
      trackRect,
      actions: {
        scrollTo: value => {
          if (vertical) this.scrollTo(this.props.scrollX, value)
          else this.scrollTo(value, this.props.scrollY)
        },
        scrollBy: delta => {
          if (vertical) this.scrollTo(this.props.scrollX, this.props.scrollY + delta)
          else this.scrollTo(this.props.scrollX + delta, this.props.scrollY)
        },
      },
    }
  }

  private resolveThumbRect(orientation: ScrollbarOrientation, trackRect: NovaUiLayoutRect): NovaUiLayoutRect {
    const vertical = orientation === 'vertical'
    const viewportSize = vertical ? this.height : this.width
    const contentSize = vertical ? this.props.contentHeight : this.props.contentWidth
    const value = vertical ? this.props.scrollY : this.props.scrollX
    const max = Math.max(0, contentSize - viewportSize)
    const length = Math.max(1, vertical ? trackRect.height : trackRect.width)
    const thumbLength = Math.max(20, length * (viewportSize / Math.max(viewportSize, contentSize)))
    const travel = Math.max(0, length - thumbLength)
    const offset = max > 0 ? travel * (value / max) : 0

    return vertical
      ? { x: trackRect.x, y: trackRect.y + offset, width: trackRect.width, height: thumbLength }
      : { x: trackRect.x + offset, y: trackRect.y, width: thumbLength, height: trackRect.height }
  }

  private reconcileSlot(key: string, schemas: Array<NovaTemplateChildSchema>): void {
    let runtime = this.slotRuntimes.get(key)
    if (!runtime) {
      runtime = new NovaTemplateRuntime(this)
      this.slotRuntimes.set(key, runtime)
    }
    runtime.reconcile(schemas)
  }

  private clearSlotRuntimes(): void {
    for (const runtime of this.slotRuntimes.values()) runtime.dispose()
    this.slotRuntimes.clear()
  }

  override dispose(): void {
    window.clearTimeout(this.idleTimer)
    this.clearSlotRuntimes()
    super.dispose()
  }
}
