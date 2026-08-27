import type { NovaApp, NovaNode, NovaSurface, NovaTemplateChildSchema, NovaTemplateSlots } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { ScrollAreaDescriptor } from '@/components/ScrollArea/scroll-area.config'
import type {
  ScrollAreaApi,
  ScrollAreaChildSchema,
  ScrollAreaCornerSlotContext,
  ScrollAreaOrientation,
  ScrollAreaPartEventContext,
  ScrollAreaPartName,
  ScrollAreaProps,
  ScrollAreaResolvedProps,
  ScrollAreaSlotContext,
  ScrollAreaState,
  ScrollAreaVisualState,
} from '@/components/ScrollArea/scroll-area.types'
import type { ScrollbarApi } from '@/components/Scrollbar/scrollbar.types'
import type { NovaUiEventPoint, NovaUiRectPart } from '@/shared/component'
import type { NovaUiLayoutRect } from '@/shared/layout'
import {

  NovaTemplateRuntime,

  reconcileNovaTemplateChildren,
} from '@endge/nova'
import {
  normalizeScrollAreaProps,
  SCROLL_AREA_NODE_DESCRIPTOR,

} from '@/components/ScrollArea/scroll-area.config'
import { SCROLLBAR_SCHEMA_TYPE } from '@/components/Scrollbar/scrollbar.types'
import {
  buildBoxSchema,
  clamp,
  hitTestRectPart,
  NovaUiComponentNode,
  toLocalEventPoint,
} from '@/shared/component'
import { applyNodeLayoutRect } from '@/shared/layout'

type ScrollbarOrientation = 'horizontal' | 'vertical'
type ScrollAreaFallbackPartKey = 'horizontal-thumb' | 'horizontal-track' | 'vertical-thumb' | 'vertical-track'

/**
 * Описывает ответственность ScrollArea в архитектуре проекта.
 */
export class ScrollArea<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ScrollAreaResolvedProps, ScrollAreaApi, ScrollAreaProps, E> {
  private readonly _contentChildren: Array<NovaNode<E>> = []
  private readonly _slotRuntimes = new Map<string, NovaTemplateRuntime<E>>()
  private _verticalScrollbar: NovaNode<E> | null = null
  private _horizontalScrollbar: NovaNode<E> | null = null
  private readonly _api: ScrollAreaApi
  private _slots: NovaTemplateSlots = {}
  private _idleTimer = 0
  private _scrollEndTimer = 0
  private _lastScrollbarActivityAt = 0
  private _scrollSyncPending = false
  private _scrollVersion = 0
  private _flushedScrollVersion = 0
  private _scrollLifecycleActive = false
  private readonly _partEventPoint: NovaUiEventPoint = { x: 0, y: 0 }
  private readonly _fallbackParts: Array<NovaUiRectPart<ScrollAreaFallbackPartKey>> = []
  private _verticalTrackRect: NovaUiLayoutRect = { x: 0, y: 0, width: 0, height: 0 }
  private _verticalThumbRect: NovaUiLayoutRect = { x: 0, y: 0, width: 0, height: 0 }
  private _horizontalTrackRect: NovaUiLayoutRect = { x: 0, y: 0, width: 0, height: 0 }
  private _horizontalThumbRect: NovaUiLayoutRect = { x: 0, y: 0, width: 0, height: 0 }
  private _visualState: ScrollAreaVisualState = {
    hovered: false,
    scrolling: false,
    dragging: false,
    idle: true,
    visible: false,
    opacity: 0,
  }

  /**
   * Создает экземпляр ScrollArea и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ScrollAreaProps = {},
    options: { componentId?: string, children?: Array<ScrollAreaChildSchema>, slots?: NovaTemplateSlots } = {},
    descriptor: ScrollAreaDescriptor = SCROLL_AREA_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeScrollAreaProps(props), options)
    this._api = {
      scrollTo: (x, y) => this.scrollTo(x, y),
      scrollBy: (dx, dy) => this.scrollTo(this.props.scrollX + dx, this.props.scrollY + dy),
      getScrollState: () => this.getScrollState(),
      getScrollbarState: () => ({ ...this._visualState }),
      setChildren: children => this.setChildren(children),
      setSlots: slots => this.setSlots(slots),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this._slots = { ...(options.slots ?? {}) }
    this.setChildren(options.children ?? [])
    this._ensureScrollbars()
    this._setupEvents()
  }

  /**
   * Обновляет значение состояния ScrollArea.
   */
  override setProps(patch: ScrollAreaProps): this {
    return super.setProps(patch as Partial<ScrollAreaResolvedProps>)
  }

  /**
   * Возвращает значение состояния ScrollArea.
   */
  override getApi(): ScrollAreaApi {
    return this._api
  }

  /**
   * Обновляет значение состояния ScrollArea.
   */
  setChildren(children: Array<ScrollAreaChildSchema>): void {
    const reconciled = reconcileNovaTemplateChildren(this, this._contentChildren, children)
    this._contentChildren.length = 0
    this._contentChildren.push(...reconciled.nodes)
    this.dirty({ update: true, render: true })
  }

  /**
   * Обновляет значение состояния ScrollArea.
   */
  setSlots(slots: NovaTemplateSlots = {}): void {
    this._slots = { ...slots }
    this._ensureScrollbars()
    this.dirty({ update: true, render: true })
  }

  /**
   * Выполняет действие scrollTo в рамках ответственности ScrollArea.
   */
  scrollTo(x: number, y: number, event?: Event): void {
    const nextX = clamp(Number.isFinite(x) ? x : 0, 0, Math.max(0, this.props.contentWidth - this.props.width))
    const nextY = clamp(Number.isFinite(y) ? y : 0, 0, Math.max(0, this.props.contentHeight - this.props.height))
    if (nextX === this.props.scrollX && nextY === this.props.scrollY) {
      return
    }
    this._emitScrollStart(event)
    this._markScrollbarsActive(false)
    this.props.scrollX = nextX
    this.props.scrollY = nextY
    this.props.onScroll?.(this.getScrollState(), event)
    this._scheduleScrollEnd(event)
    this._scrollVersion += 1
    if (!this._scrollSyncPending) {
      this._scrollSyncPending = true
      this.dirty({ update: true, render: true })
      queueMicrotask(() => this._flushDeferredScrollSync())
    }
  }

  /**
   * Возвращает значение состояния ScrollArea.
   */
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

  /**
   * Обновляет runtime-состояние ScrollArea.
   */
  update(): void {
    this._flushedScrollVersion = this._scrollVersion
    for (const child of this._contentChildren) {
      applyNodeLayoutRect(child as NovaNode<any>, {
        x: -this.props.scrollX,
        y: -this.props.scrollY,
        width: this.props.contentWidth,
        height: this.props.contentHeight,
      })
      child.dirty({ matrix: true, update: true, render: true })
    }
    this._syncScrollbars()
  }

  /**
   * Выполняет отрисовку ScrollArea.
   */
  render(): void {
    const schema = buildBoxSchema(this.props, this.width, this.height, { resolveThemeValue: value => this.resolveThemeValue(value) })
    if (schema.length > 0) {
      this.renderer.schema(schema)
    }
    this.renderer.clip(0, 0, this.width, this.height)
  }

  /**
   * Обрабатывает входящее событие ScrollArea.
   */
  protected override onPropsChanged(changedKeys: Array<keyof ScrollAreaResolvedProps>): void {
    this.props = normalizeScrollAreaProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
    if (this._hasStructuralScrollbarChanges(changedKeys)) {
      this._ensureScrollbars()
    }
    else if (!this._shouldDeferScrollbarSync(changedKeys)) {
      this._syncScrollbars()
    }
    this.dirty({ update: true, render: true })
  }

  /**
   * Обновляет значение состояния ScrollArea.
   */
  private _setupEvents(): void {
    this.on('mouseenter', () => {
      if (this.props.disabled) {
        return
      }
      this._visualState.hovered = true
      this._markScrollbarsActive()
    })
    this.on('mouseleave', () => {
      this._visualState.hovered = false
      this._scheduleScrollbarIdle()
    })
    this.on('wheel', (event) => {
      if (this.props.disabled) {
        return false
      }
      event.preventDefault()
      const multiplier = this.props.wheelMultiplier
      const dx = this.props.axis === 'y' ? 0 : event.deltaX * multiplier
      const dy = this.props.axis === 'x' ? 0 : event.deltaY * multiplier
      this.scrollTo(
        this.props.scrollX + dx,
        this.props.scrollY + dy,
        event,
      )
      return false
    })
    this.on('click', (event) => {
      if (this.props.disabled) {
        return
      }
      this._emitFallbackPartClick(event)
    })
  }

  /**
   * Выполняет внутренний шаг ensureScrollbars для ScrollArea.
   */
  private _ensureScrollbars(): void {
    if (this.props.scrollbarVisibility === 'hidden') {
      this._verticalScrollbar?.remove()
      this._horizontalScrollbar?.remove()
      this._verticalScrollbar = null
      this._horizontalScrollbar = null
      this._clearSlotRuntimes()
      return
    }

    if (this._hasCustomScrollbar('vertical')) {
      this._verticalScrollbar?.remove()
      this._verticalScrollbar = null
    }
    else if (!this._verticalScrollbar) {
      this._verticalScrollbar = this.nova.schema.createChild(this, {
        type: SCROLLBAR_SCHEMA_TYPE,
        id: `${this.componentId}-scrollbar-y`,
        props: {
          orientation: 'vertical',
          onChange: (value: number, event?: Event) => this.scrollTo(this.props.scrollX, value, event),
        },
      }) as NovaNode<E>
    }
    if (this._hasCustomScrollbar('horizontal')) {
      this._horizontalScrollbar?.remove()
      this._horizontalScrollbar = null
    }
    else if (!this._horizontalScrollbar) {
      this._horizontalScrollbar = this.nova.schema.createChild(this, {
        type: SCROLLBAR_SCHEMA_TYPE,
        id: `${this.componentId}-scrollbar-x`,
        props: {
          orientation: 'horizontal',
          onChange: (value: number, event?: Event) => this.scrollTo(value, this.props.scrollY, event),
        },
      }) as NovaNode<E>
    }
    this._syncScrollbars()
  }

  /**
   * Синхронизирует состояние между слоями ScrollArea.
   */
  private _syncScrollbars(): void {
    if (this.props.scrollbarVisibility === 'hidden') {
      this._reconcileSlot('scrollbar-y', [])
      this._reconcileSlot('scrollbar-x', [])
      this._reconcileSlot('track-y', [])
      this._reconcileSlot('track-x', [])
      this._reconcileSlot('thumb-y', [])
      this._reconcileSlot('thumb-x', [])
      this._reconcileSlot('corner', [])
      this._visualState = {
        ...this._visualState,
        visible: false,
        opacity: 0,
      }
      this._fallbackParts.length = 0
      return
    }

    const thickness = this.props.scrollbar.thickness ?? 8
    const canScrollY = this.props.axis !== 'x'
    const canScrollX = this.props.axis !== 'y'
    const showY = canScrollY && (
      this.props.scrollbarVisibility === 'always' || this.props.contentHeight > this.height
    )
    const showX = canScrollX && (
      this.props.scrollbarVisibility === 'always' || this.props.contentWidth > this.width
    )
    const opacity = this._resolveScrollbarOpacity(showX || showY)
    this._visualState = {
      ...this._visualState,
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
    const verticalThumbRect = this._resolveThumbRect('vertical', verticalTrackRect)
    const horizontalThumbRect = this._resolveThumbRect('horizontal', horizontalTrackRect)
    this._verticalTrackRect = verticalTrackRect
    this._verticalThumbRect = verticalThumbRect
    this._horizontalTrackRect = horizontalTrackRect
    this._horizontalThumbRect = horizontalThumbRect
    this._syncFallbackParts(showX, showY)

    this._verticalScrollbar?.options({
      x: verticalTrackRect.x,
      y: verticalTrackRect.y,
      width: verticalTrackRect.width,
      height: verticalTrackRect.height,
      visible: showY,
      active: showY,
    })
    this._horizontalScrollbar?.options({
      x: horizontalTrackRect.x,
      y: horizontalTrackRect.y,
      width: horizontalTrackRect.width,
      height: horizontalTrackRect.height,
      visible: showX,
      active: showX,
    })

    this._verticalScrollbarApi()?.setProps({
      ...this.props.scrollbar,
      orientation: 'vertical',
      value: clamp(this.props.scrollY, 0, Math.max(0, this.props.contentHeight - this.height)),
      viewportSize: this.height,
      contentSize: this.props.contentHeight,
      thickness,
      trackColor: this.resolveThemeValue(this.props.trackColor),
      thumbColor: this.resolveThemeValue(this.props.thumbColor),
      opacity,
    })
    this._horizontalScrollbarApi()?.setProps({
      ...this.props.scrollbar,
      orientation: 'horizontal',
      value: clamp(this.props.scrollX, 0, Math.max(0, this.props.contentWidth - this.width)),
      viewportSize: this.width,
      contentSize: this.props.contentWidth,
      thickness,
      trackColor: this.resolveThemeValue(this.props.trackColor),
      thumbColor: this.resolveThemeValue(this.props.thumbColor),
      opacity,
    })

    this._syncCustomSlots('vertical', showY, verticalTrackRect, verticalThumbRect)
    this._syncCustomSlots('horizontal', showX, horizontalTrackRect, horizontalThumbRect)
    this._syncCornerSlot(showX && showY, {
      x: verticalTrackRect.x,
      y: horizontalTrackRect.y,
      width: verticalTrackRect.width,
      height: horizontalTrackRect.height,
    })
  }

  /**
   * Выполняет внутренний шаг verticalScrollbarApi для ScrollArea.
   */
  private _verticalScrollbarApi(): ScrollbarApi | null {
    return this._verticalScrollbar && 'getApi' in this._verticalScrollbar
      ? (this._verticalScrollbar as unknown as { getApi: () => ScrollbarApi }).getApi()
      : null
  }

  /**
   * Выполняет внутренний шаг horizontalScrollbarApi для ScrollArea.
   */
  private _horizontalScrollbarApi(): ScrollbarApi | null {
    return this._horizontalScrollbar && 'getApi' in this._horizontalScrollbar
      ? (this._horizontalScrollbar as unknown as { getApi: () => ScrollbarApi }).getApi()
      : null
  }

  /**
   * Нормализует и возвращает итоговое значение ScrollArea.
   */
  private _resolveScrollbarOpacity(hasVisibleScrollbar: boolean): number {
    if (!hasVisibleScrollbar) {
      return 0
    }
    if (this.props.scrollbarVisibility !== 'active') {
      return 1
    }
    return this._visualState.opacity
  }

  /**
   * Выполняет внутренний шаг markScrollbarsActive для ScrollArea.
   */
  private _markScrollbarsActive(sync = true): void {
    if (this.props.scrollbarVisibility !== 'active') {
      return
    }
    this._lastScrollbarActivityAt = Date.now()
    if (!this._visualState.scrolling || this._visualState.idle || this._visualState.opacity !== 1) {
      this._visualState = {
        ...this._visualState,
        scrolling: true,
        idle: false,
        opacity: 1,
      }
    }
    if (sync) {
      this._syncScrollbars()
    }
    this._scheduleScrollbarIdle()
  }

  /**
   * Выполняет внутренний шаг hasStructuralScrollbarChanges для ScrollArea.
   */
  private _hasStructuralScrollbarChanges(changedKeys: Array<keyof ScrollAreaResolvedProps>): boolean {
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

  /**
   * Выполняет внутренний шаг shouldDeferScrollbarSync для ScrollArea.
   */
  private _shouldDeferScrollbarSync(changedKeys: Array<keyof ScrollAreaResolvedProps>): boolean {
    return changedKeys.every(key => (
      key === 'scrollX'
      || key === 'scrollY'
      || key === 'scrollbarIdleDelay'
      || key === 'scrollbarFadeDuration'
      || key === 'wheelMultiplier'
    ))
  }

  /**
   * Принудительно завершает накопленные изменения ScrollArea.
   */
  private _flushDeferredScrollSync(): void {
    if (this.lifecycleState === 'destroyed') {
      return
    }
    this._scrollSyncPending = false
    if (this._flushedScrollVersion !== this._scrollVersion) {
      this.dirty({ update: true, render: true })
    }
  }

  /**
   * Планирует отложенное выполнение ScrollArea.
   */
  private _scheduleScrollbarIdle(): void {
    if (this.props.scrollbarVisibility !== 'active') {
      return
    }
    if (this._idleTimer !== 0) {
      return
    }
    this._idleTimer = window.setTimeout(() => this._flushScrollbarIdle(), this.props.scrollbarIdleDelay)
  }

  /**
   * Принудительно завершает накопленные изменения ScrollArea.
   */
  private _flushScrollbarIdle(): void {
    this._idleTimer = 0
    const elapsed = Date.now() - this._lastScrollbarActivityAt
    const remaining = this.props.scrollbarIdleDelay - elapsed
    if (remaining > 0) {
      this._idleTimer = window.setTimeout(() => this._flushScrollbarIdle(), remaining)
      return
    }
    if (this._visualState.hovered || this._visualState.dragging) {
      return
    }
    this._visualState = {
      ...this._visualState,
      scrolling: false,
      idle: true,
      opacity: 0,
    }
    this._syncScrollbars()
    this.dirty({ render: true })
  }

  /**
   * Выполняет внутренний шаг hasCustomScrollbar для ScrollArea.
   */
  private _hasCustomScrollbar(orientation: ScrollbarOrientation): boolean {
    const axisSlot = orientation === 'vertical' ? this._slots['scrollbar-y'] : this._slots['scrollbar-x']
    return !!axisSlot || !!this._slots.scrollbar || !!this._slots.track || !!this._slots.thumb
  }

  /**
   * Синхронизирует состояние между слоями ScrollArea.
   */
  private _syncCustomSlots(
    orientation: ScrollbarOrientation,
    visible: boolean,
    trackRect: NovaUiLayoutRect,
    thumbRect: NovaUiLayoutRect,
  ): void {
    const suffix = orientation === 'vertical' ? 'y' : 'x'
    const specificScrollbar = this._slots[`scrollbar-${suffix}`]
    const scrollbar = specificScrollbar ?? this._slots.scrollbar
    const context = this._createSlotContext(orientation, trackRect, thumbRect)

    if (!visible || !this._hasCustomScrollbar(orientation)) {
      this._reconcileSlot(`scrollbar-${suffix}`, [])
      this._reconcileSlot(`track-${suffix}`, [])
      this._reconcileSlot(`thumb-${suffix}`, [])
      return
    }

    if (scrollbar) {
      this._reconcileSlot(`scrollbar-${suffix}`, scrollbar(context))
      this._reconcileSlot(`track-${suffix}`, [])
      this._reconcileSlot(`thumb-${suffix}`, [])
      return
    }

    this._reconcileSlot(`scrollbar-${suffix}`, [])
    this._reconcileSlot(`track-${suffix}`, this._slots.track?.(context) ?? [])
    this._reconcileSlot(`thumb-${suffix}`, this._slots.thumb?.(context) ?? [])
  }

  /**
   * Синхронизирует состояние между слоями ScrollArea.
   */
  private _syncCornerSlot(visible: boolean, rect: NovaUiLayoutRect): void {
    if (!visible || !this._slots.corner) {
      this._reconcileSlot('corner', [])
      return
    }

    const context: ScrollAreaCornerSlotContext = {
      state: { ...this._visualState },
      rect,
    }
    this._reconcileSlot('corner', this._slots.corner(context))
  }

  /**
   * Синхронизирует состояние между слоями ScrollArea.
   */
  private _syncFallbackParts(showX: boolean, showY: boolean): void {
    this._fallbackParts.length = 0
    if (showY && !this._hasCustomScrollbar('vertical')) {
      this._fallbackParts.push(
        { part: 'vertical-track', rect: this._verticalTrackRect },
        { part: 'vertical-thumb', rect: this._verticalThumbRect },
      )
    }
    if (showX && !this._hasCustomScrollbar('horizontal')) {
      this._fallbackParts.push(
        { part: 'horizontal-track', rect: this._horizontalTrackRect },
        { part: 'horizontal-thumb', rect: this._horizontalThumbRect },
      )
    }
  }

  /**
   * Создает runtime-сущность ScrollArea.
   */
  private _createSlotContext(
    orientation: ScrollbarOrientation,
    trackRect: NovaUiLayoutRect,
    thumbRect: NovaUiLayoutRect,
  ): ScrollAreaSlotContext {
    const vertical = orientation === 'vertical'
    return {
      orientation: vertical ? 'vertical' : 'horizontal',
      state: { ...this._visualState },
      metrics: vertical ? this.getScrollState().y : this.getScrollState().x,
      thumbRect,
      trackRect,
      actions: {
        scrollTo: (value) => {
          if (vertical) {
            this.scrollTo(this.props.scrollX, value)
          }
          else { this.scrollTo(value, this.props.scrollY) }
        },
        scrollBy: (delta) => {
          if (vertical) {
            this.scrollTo(this.props.scrollX, this.props.scrollY + delta)
          }
          else { this.scrollTo(this.props.scrollX + delta, this.props.scrollY) }
        },
      },
    }
  }

  /**
   * Публикует событие во внутренний event bus ScrollArea.
   */
  private _emitScrollStart(event?: Event): void {
    if (this._scrollLifecycleActive) {
      return
    }
    this._scrollLifecycleActive = true
    this.props.onScrollStart?.(this.getScrollState(), event)
  }

  /**
   * Планирует отложенное выполнение ScrollArea.
   */
  private _scheduleScrollEnd(event?: Event): void {
    window.clearTimeout(this._scrollEndTimer)
    this._scrollEndTimer = window.setTimeout(() => {
      this._scrollEndTimer = 0
      this._scrollLifecycleActive = false
      this.props.onScrollEnd?.(this.getScrollState(), event)
    }, 80)
  }

  /**
   * Публикует событие во внутренний event bus ScrollArea.
   */
  private _emitFallbackPartClick(event: MouseEvent): void {
    if (this._fallbackParts.length === 0) {
      return
    }
    const part = hitTestRectPart(this._fallbackParts, toLocalEventPoint(this, event, this._partEventPoint))
    if (!part) {
      return
    }
    const orientation: ScrollAreaOrientation = part.startsWith('vertical') ? 'vertical' : 'horizontal'
    const semanticPart: ScrollAreaPartName = part.endsWith('thumb') ? 'thumb' : 'track'
    const context = this._createPartEventContext(semanticPart, orientation)
    this.props.onScrollbarClick?.({ ...context, part: 'scrollbar' }, event)
    if (semanticPart === 'thumb') {
      this.props.onThumbClick?.(context, event)
    }
    else { this.props.onTrackClick?.(context, event) }
  }

  /**
   * Создает runtime-сущность ScrollArea.
   */
  private _createPartEventContext(part: ScrollAreaPartName, orientation: ScrollAreaOrientation): ScrollAreaPartEventContext {
    const vertical = orientation === 'vertical'
    return {
      part,
      orientation,
      state: { ...this._visualState },
      metrics: vertical ? this.getScrollState().y : this.getScrollState().x,
      thumbRect: { ...(vertical ? this._verticalThumbRect : this._horizontalThumbRect) },
      trackRect: { ...(vertical ? this._verticalTrackRect : this._horizontalTrackRect) },
    }
  }

  /**
   * Нормализует и возвращает итоговое значение ScrollArea.
   */
  private _resolveThumbRect(orientation: ScrollbarOrientation, trackRect: NovaUiLayoutRect): NovaUiLayoutRect {
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

  /**
   * Согласует runtime-состояние ScrollArea.
   */
  private _reconcileSlot(key: string, schemas: Array<NovaTemplateChildSchema>): void {
    let runtime = this._slotRuntimes.get(key)
    if (!runtime) {
      runtime = new NovaTemplateRuntime(this)
      this._slotRuntimes.set(key, runtime)
    }
    runtime.reconcile(schemas)
  }

  /**
   * Очищает накопленное состояние ScrollArea.
   */
  private _clearSlotRuntimes(): void {
    for (const runtime of this._slotRuntimes.values()) {
      runtime.dispose()
    }
    this._slotRuntimes.clear()
  }

  /**
   * Освобождает runtime-ресурсы и подписки ScrollArea.
   */
  override dispose(): void {
    window.clearTimeout(this._idleTimer)
    window.clearTimeout(this._scrollEndTimer)
    this._clearSlotRuntimes()
    super.dispose()
  }
}
