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
} from '@/components/ScrollArea/scroll-area.config'
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
import { SCROLLBAR_SCHEMA_TYPE, type ScrollbarApi } from '@/components/Scrollbar/scrollbar.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  clamp,
} from '@/shared/component'
import { applyNodeLayoutRect } from '@/shared/layout'
import type { NovaUiLayoutRect } from '@/shared/layout'
import { hitTestRectPart, toLocalEventPoint, type NovaUiEventPoint, type NovaUiRectPart } from '@/shared/component'

type ScrollbarOrientation = 'horizontal' | 'vertical'
type ScrollAreaFallbackPartKey = 'horizontal-thumb' | 'horizontal-track' | 'vertical-thumb' | 'vertical-track'

/**
 * Описывает ответственность ScrollArea в архитектуре проекта.
 */
export class ScrollArea<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ScrollAreaResolvedProps, ScrollAreaApi, ScrollAreaProps, E> {
  private readonly contentChildren: Array<NovaNode<E>> = []
  private readonly slotRuntimes = new Map<string, NovaTemplateRuntime<E>>()
  private verticalScrollbar: NovaNode<E> | null = null
  private horizontalScrollbar: NovaNode<E> | null = null
  private readonly api: ScrollAreaApi
  private slots: NovaTemplateSlots = {}
  private idleTimer = 0
  private scrollEndTimer = 0
  private lastScrollbarActivityAt = 0
  private scrollSyncPending = false
  private scrollVersion = 0
  private flushedScrollVersion = 0
  private scrollLifecycleActive = false
  private readonly partEventPoint: NovaUiEventPoint = { x: 0, y: 0 }
  private readonly fallbackParts: Array<NovaUiRectPart<ScrollAreaFallbackPartKey>> = []
  private verticalTrackRect: NovaUiLayoutRect = { x: 0, y: 0, width: 0, height: 0 }
  private verticalThumbRect: NovaUiLayoutRect = { x: 0, y: 0, width: 0, height: 0 }
  private horizontalTrackRect: NovaUiLayoutRect = { x: 0, y: 0, width: 0, height: 0 }
  private horizontalThumbRect: NovaUiLayoutRect = { x: 0, y: 0, width: 0, height: 0 }
  private visualState: ScrollAreaVisualState = {
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
    return this.api
  }

  /**
   * Обновляет значение состояния ScrollArea.
   */
  setChildren(children: Array<ScrollAreaChildSchema>): void {
    const reconciled = reconcileNovaTemplateChildren(this, this.contentChildren, children)
    this.contentChildren.length = 0
    this.contentChildren.push(...reconciled.nodes)
    this.dirty({ update: true, render: true })
  }

  /**
   * Обновляет значение состояния ScrollArea.
   */
  setSlots(slots: NovaTemplateSlots = {}): void {
    this.slots = { ...slots }
    this.ensureScrollbars()
    this.dirty({ update: true, render: true })
  }

  /**
   * Выполняет действие scrollTo в рамках ответственности ScrollArea.
   */
  scrollTo(x: number, y: number, event?: Event): void {
    const nextX = clamp(Number.isFinite(x) ? x : 0, 0, Math.max(0, this.props.contentWidth - this.props.width))
    const nextY = clamp(Number.isFinite(y) ? y : 0, 0, Math.max(0, this.props.contentHeight - this.props.height))
    if (nextX === this.props.scrollX && nextY === this.props.scrollY) return
    this.emitScrollStart(event)
    this.markScrollbarsActive(false)
    this.props.scrollX = nextX
    this.props.scrollY = nextY
    this.props.onScroll?.(this.getScrollState(), event)
    this.scheduleScrollEnd(event)
    this.scrollVersion += 1
    if (!this.scrollSyncPending) {
      this.scrollSyncPending = true
      this.dirty({ update: true, render: true })
      queueMicrotask(() => this.flushDeferredScrollSync())
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

  /**
   * Выполняет отрисовку ScrollArea.
   */
  render(): void {
    const schema = buildBoxSchema(this.props, this.width, this.height, { resolveThemeValue: value => this.resolveThemeValue(value) })
    if (schema.length > 0) this.renderer.schema(schema)
    this.renderer.clip(0, 0, this.width, this.height)
  }

  /**
   * Обрабатывает входящее событие ScrollArea.
   */
  protected override onPropsChanged(changedKeys: Array<keyof ScrollAreaResolvedProps>): void {
    this.props = normalizeScrollAreaProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
    if (this.hasStructuralScrollbarChanges(changedKeys)) this.ensureScrollbars()
    else if (!this.shouldDeferScrollbarSync(changedKeys)) this.syncScrollbars()
    this.dirty({ update: true, render: true })
  }

  /**
   * Обновляет значение состояния ScrollArea.
   */
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
        event,
      )
      return false
    })
    this.on('click', event => {
      if (this.props.disabled) return
      this.emitFallbackPartClick(event)
    })
  }

  /**
   * Выполняет внутренний шаг ensureScrollbars для ScrollArea.
   */
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
          onChange: (value: number, event?: Event) => this.scrollTo(this.props.scrollX, value, event),
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
          onChange: (value: number, event?: Event) => this.scrollTo(value, this.props.scrollY, event),
        },
      }) as NovaNode<E>
    }
    this.syncScrollbars()
  }

  /**
   * Синхронизирует состояние между слоями ScrollArea.
   */
  private syncScrollbars(): void {
    if (this.props.scrollbarVisibility === 'hidden') {
      this.reconcileSlot('scrollbar-y', [])
      this.reconcileSlot('scrollbar-x', [])
      this.reconcileSlot('track-y', [])
      this.reconcileSlot('track-x', [])
      this.reconcileSlot('thumb-y', [])
      this.reconcileSlot('thumb-x', [])
      this.reconcileSlot('corner', [])
      this.visualState = {
        ...this.visualState,
        visible: false,
        opacity: 0,
      }
      this.fallbackParts.length = 0
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
    this.verticalTrackRect = verticalTrackRect
    this.verticalThumbRect = verticalThumbRect
    this.horizontalTrackRect = horizontalTrackRect
    this.horizontalThumbRect = horizontalThumbRect
    this.syncFallbackParts(showX, showY)

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
      trackColor: this.resolveThemeValue(this.props.trackColor),
      thumbColor: this.resolveThemeValue(this.props.thumbColor),
      opacity,
    })
    this.horizontalScrollbarApi()?.setProps({
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

    this.syncCustomSlots('vertical', showY, verticalTrackRect, verticalThumbRect)
    this.syncCustomSlots('horizontal', showX, horizontalTrackRect, horizontalThumbRect)
    this.syncCornerSlot(showX && showY, {
      x: verticalTrackRect.x,
      y: horizontalTrackRect.y,
      width: verticalTrackRect.width,
      height: horizontalTrackRect.height,
    })
  }

  /**
   * Выполняет внутренний шаг verticalScrollbarApi для ScrollArea.
   */
  private verticalScrollbarApi(): ScrollbarApi | null {
    return this.verticalScrollbar && 'getApi' in this.verticalScrollbar
      ? (this.verticalScrollbar as unknown as { getApi: () => ScrollbarApi }).getApi()
      : null
  }

  /**
   * Выполняет внутренний шаг horizontalScrollbarApi для ScrollArea.
   */
  private horizontalScrollbarApi(): ScrollbarApi | null {
    return this.horizontalScrollbar && 'getApi' in this.horizontalScrollbar
      ? (this.horizontalScrollbar as unknown as { getApi: () => ScrollbarApi }).getApi()
      : null
  }

  /**
   * Нормализует и возвращает итоговое значение ScrollArea.
   */
  private resolveScrollbarOpacity(hasVisibleScrollbar: boolean): number {
    if (!hasVisibleScrollbar) return 0
    if (this.props.scrollbarVisibility !== 'active') return 1
    return this.visualState.opacity
  }

  /**
   * Выполняет внутренний шаг markScrollbarsActive для ScrollArea.
   */
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

  /**
   * Выполняет внутренний шаг hasStructuralScrollbarChanges для ScrollArea.
   */
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

  /**
   * Выполняет внутренний шаг shouldDeferScrollbarSync для ScrollArea.
   */
  private shouldDeferScrollbarSync(changedKeys: Array<keyof ScrollAreaResolvedProps>): boolean {
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
  private flushDeferredScrollSync(): void {
    if (this.lifecycleState === 'destroyed') return
    this.scrollSyncPending = false
    if (this.flushedScrollVersion !== this.scrollVersion) {
      this.dirty({ update: true, render: true })
    }
  }

  /**
   * Планирует отложенное выполнение ScrollArea.
   */
  private scheduleScrollbarIdle(): void {
    if (this.props.scrollbarVisibility !== 'active') return
    if (this.idleTimer !== 0) return
    this.idleTimer = window.setTimeout(() => this.flushScrollbarIdle(), this.props.scrollbarIdleDelay)
  }

  /**
   * Принудительно завершает накопленные изменения ScrollArea.
   */
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

  /**
   * Выполняет внутренний шаг hasCustomScrollbar для ScrollArea.
   */
  private hasCustomScrollbar(orientation: ScrollbarOrientation): boolean {
    const axisSlot = orientation === 'vertical' ? this.slots['scrollbar-y'] : this.slots['scrollbar-x']
    return !!axisSlot || !!this.slots.scrollbar || !!this.slots.track || !!this.slots.thumb
  }

  /**
   * Синхронизирует состояние между слоями ScrollArea.
   */
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

  /**
   * Синхронизирует состояние между слоями ScrollArea.
   */
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

  /**
   * Синхронизирует состояние между слоями ScrollArea.
   */
  private syncFallbackParts(showX: boolean, showY: boolean): void {
    this.fallbackParts.length = 0
    if (showY && !this.hasCustomScrollbar('vertical')) {
      this.fallbackParts.push(
        { part: 'vertical-track', rect: this.verticalTrackRect },
        { part: 'vertical-thumb', rect: this.verticalThumbRect },
      )
    }
    if (showX && !this.hasCustomScrollbar('horizontal')) {
      this.fallbackParts.push(
        { part: 'horizontal-track', rect: this.horizontalTrackRect },
        { part: 'horizontal-thumb', rect: this.horizontalThumbRect },
      )
    }
  }

  /**
   * Создает runtime-сущность ScrollArea.
   */
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

  /**
   * Публикует событие во внутренний event bus ScrollArea.
   */
  private emitScrollStart(event?: Event): void {
    if (this.scrollLifecycleActive) return
    this.scrollLifecycleActive = true
    this.props.onScrollStart?.(this.getScrollState(), event)
  }

  /**
   * Планирует отложенное выполнение ScrollArea.
   */
  private scheduleScrollEnd(event?: Event): void {
    window.clearTimeout(this.scrollEndTimer)
    this.scrollEndTimer = window.setTimeout(() => {
      this.scrollEndTimer = 0
      this.scrollLifecycleActive = false
      this.props.onScrollEnd?.(this.getScrollState(), event)
    }, 80)
  }

  /**
   * Публикует событие во внутренний event bus ScrollArea.
   */
  private emitFallbackPartClick(event: MouseEvent): void {
    if (this.fallbackParts.length === 0) return
    const part = hitTestRectPart(this.fallbackParts, toLocalEventPoint(this, event, this.partEventPoint))
    if (!part) return
    const orientation: ScrollAreaOrientation = part.startsWith('vertical') ? 'vertical' : 'horizontal'
    const semanticPart: ScrollAreaPartName = part.endsWith('thumb') ? 'thumb' : 'track'
    const context = this.createPartEventContext(semanticPart, orientation)
    this.props.onScrollbarClick?.({ ...context, part: 'scrollbar' }, event)
    if (semanticPart === 'thumb') this.props.onThumbClick?.(context, event)
    else this.props.onTrackClick?.(context, event)
  }

  /**
   * Создает runtime-сущность ScrollArea.
   */
  private createPartEventContext(part: ScrollAreaPartName, orientation: ScrollAreaOrientation): ScrollAreaPartEventContext {
    const vertical = orientation === 'vertical'
    return {
      part,
      orientation,
      state: { ...this.visualState },
      metrics: vertical ? this.getScrollState().y : this.getScrollState().x,
      thumbRect: { ...(vertical ? this.verticalThumbRect : this.horizontalThumbRect) },
      trackRect: { ...(vertical ? this.verticalTrackRect : this.horizontalTrackRect) },
    }
  }

  /**
   * Нормализует и возвращает итоговое значение ScrollArea.
   */
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

  /**
   * Согласует runtime-состояние ScrollArea.
   */
  private reconcileSlot(key: string, schemas: Array<NovaTemplateChildSchema>): void {
    let runtime = this.slotRuntimes.get(key)
    if (!runtime) {
      runtime = new NovaTemplateRuntime(this)
      this.slotRuntimes.set(key, runtime)
    }
    runtime.reconcile(schemas)
  }

  /**
   * Очищает накопленное состояние ScrollArea.
   */
  private clearSlotRuntimes(): void {
    for (const runtime of this.slotRuntimes.values()) runtime.dispose()
    this.slotRuntimes.clear()
  }

  /**
   * Освобождает runtime-ресурсы и подписки ScrollArea.
   */
  override dispose(): void {
    window.clearTimeout(this.idleTimer)
    window.clearTimeout(this.scrollEndTimer)
    this.clearSlotRuntimes()
    super.dispose()
  }
}
