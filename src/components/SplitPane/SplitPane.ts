import type { NovaApp, NovaNode, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { SplitPaneDescriptor } from '@/components/SplitPane/split-pane.config'
import type {
  SplitPaneApi,
  SplitPaneChildSchema,
  SplitPaneProps,
  SplitPaneResizePayload,
  SplitPaneResolvedProps,
} from '@/components/SplitPane/split-pane.types'
import { reconcileNovaTemplateChildren } from '@endge/nova'
import { ColResizer } from '@/components/ColResizer/ColResizer'
import { RowResizer } from '@/components/RowResizer/RowResizer'
import {
  normalizeSplitPaneProps,
  SPLIT_PANE_NODE_DESCRIPTOR,

} from '@/components/SplitPane/split-pane.config'
import {
  buildBoxSchema,
  clamp,
  NovaUiComponentNode,
} from '@/shared/component'
import {
  applyNodeLayoutRect,
  isNovaUiLayoutDisplayed,
} from '@/shared/layout'

interface SplitPaneLazyResizeState {
  sizes: [number, number]
  startFirstSize: number
}

/**
 * Описывает ответственность SplitPane в архитектуре проекта.
 */
export class SplitPane<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<SplitPaneResolvedProps, SplitPaneApi, SplitPaneProps, E> {
  private readonly _panes: Array<NovaNode<E>> = []
  private _resizerNode: RowResizer<E> | ColResizer<E> | null = null
  private _lazyResize: SplitPaneLazyResizeState | null = null
  private readonly _api: SplitPaneApi

  /**
   * Создает экземпляр SplitPane и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: SplitPaneProps = {},
    options: { componentId?: string, children?: Array<SplitPaneChildSchema> } = {},
    descriptor: SplitPaneDescriptor = SPLIT_PANE_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeSplitPaneProps(props), options)
    this._api = {
      setSizes: sizes => this.setProps({ sizes }),
      collapse: pane => this.setProps({ collapsedPane: pane }),
      expand: () => this.setProps({ collapsedPane: null }),
      setProps: patch => this.setProps(patch),
      relayout: () => this._relayout(),
      getProps: () => this.props,
    }
    this.setChildren(options.children ?? [])
    this._syncResizer()
  }

  /**
   * Обновляет значение состояния SplitPane.
   */
  override setProps(patch: SplitPaneProps): this {
    return super.setProps(patch as Partial<SplitPaneResolvedProps>)
  }

  /**
   * Возвращает значение состояния SplitPane.
   */
  override getApi(): SplitPaneApi {
    return this._api
  }

  /**
   * Обновляет значение состояния SplitPane.
   */
  setChildren(children: Array<SplitPaneChildSchema>): void {
    const nextSchemas = children.slice(0, 2)
    const reconciled = reconcileNovaTemplateChildren(this, this._panes, nextSchemas)
    this._panes.length = 0
    this._panes.push(...reconciled.nodes)
    this._syncResizer()
    this.dirty({ update: true, render: true })
  }

  /**
   * Обновляет runtime-состояние SplitPane.
   */
  update(): void {
    const activePanes = this._resolveActivePanes()
    this._syncPaneParticipation(activePanes)

    if (activePanes.length < 2) {
      this._syncResizer()
      this._applyPaneRect(activePanes[0], { x: 0, y: 0, width: this.width, height: this.height })
      return
    }

    this._syncResizer()
    const { first, second } = this._resolveRects()
    const { resizer } = this._resolveRects(this._lazyResize?.sizes[0])
    this._applyPaneRect(activePanes[0], first)
    this._applyPaneRect(activePanes[1], second)
    this._resizerNode?.options({
      ...resizer,
      color: this.resolveThemeValue(this.props.resizer.color) ?? this.props.resizer.color,
      lineWidth: this.props.resizer.lineWidth,
      hitSize: this.props.resizer.hitSize,
      overlayColor: this.resolveThemeValue(this.props.resizer.overlayColor) ?? this.props.resizer.overlayColor,
      minSize: 0,
      maxSize: Number.POSITIVE_INFINITY,
    })
  }

  /**
   * Применяет подготовленное состояние SplitPane.
   */
  private _applyPaneRect(pane: NovaNode<E> | undefined, rect: { x: number, y: number, width: number, height: number }): void {
    if (!pane) {
      return
    }
    const changed = applyNodeLayoutRect(pane, rect)
    if (changed) {
      pane.dirty({ matrix: true, update: true, render: true })
    }
  }

  /**
   * Синхронизирует runtime-участие panes с layout-участием.
   */
  private _syncPaneParticipation(activePanes: Array<NovaNode<E>>): void {
    const activePaneSet = new Set(activePanes)
    const emptyRect = { x: 0, y: 0, width: 0, height: 0 }

    for (const pane of this._panes) {
      const active = activePaneSet.has(pane)
      if (pane.visible !== active) {
        pane.visible = active
        pane.dirty({ render: true })
      }
      if (pane.active !== active) {
        pane.active = active
        pane.dirty({ update: true })
      }
      if (!active) {
        this._applyPaneRect(pane, emptyRect)
      }
    }
  }

  /**
   * Выполняет отрисовку SplitPane.
   */
  render(): void {
    const schema = buildBoxSchema(this.props, this.width, this.height, { resolveThemeValue: value => this.resolveThemeValue(value) })
    if (schema.length > 0) {
      this.renderer.schema(schema)
    }
    if (this.props.clip) {
      this.renderer.clip(0, 0, this.width, this.height)
    }
  }

  /**
   * Обрабатывает входящее событие SplitPane.
   */
  protected override onPropsChanged(changedKeys: Array<keyof SplitPaneResolvedProps>): void {
    const previousDirection = this.props.direction
    this.props = normalizeSplitPaneProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    if (previousDirection !== this.props.direction) {
      this._lazyResize = null
      this._disposeResizer()
    }
    this._syncResizer()
    this.dirty({ update: true, render: true })
  }

  /**
   * Пересчитывает panes после изменения display у дочерних node.
   */
  private _relayout(): void {
    this._syncResizer()
    this.dirty({ update: true, render: true })
  }

  /**
   * Синхронизирует наличие resizer с количеством активных pane.
   */
  private _syncResizer(): void {
    if (this._resolveActivePanes().length < 2) {
      this._disposeResizer()
      return
    }

    if (this._resizerNode) {
      return
    }
    this._resizerNode = this.props.direction === 'horizontal'
      ? new ColResizer<E>(this.nova, this.surface, this.resolveThemeValue(this.props.resizer.color) ?? this.props.resizer.color, this.props.resizer.lineWidth)
      : new RowResizer<E>(this.nova, this.surface, this.resolveThemeValue(this.props.resizer.color) ?? this.props.resizer.color, this.props.resizer.lineWidth)
    this.addChild(this._resizerNode)
    this._resizerNode
      .onChangeStart(event => this._startResize(event))
      .onChangeMove((event, delta) => {
        const payload = this._resizeBy(delta, event)
        this.props.onResize?.(payload)
      })
      .onChangeEnd(event => this._endResize(event))
  }

  /**
   * Удаляет resizer, когда SplitPane работает как single-pane контейнер.
   */
  private _disposeResizer(): void {
    this._resizerNode?.remove()
    this._resizerNode = null
  }

  /**
   * Возвращает panes, которые участвуют в split layout.
   */
  private _resolveActivePanes(): Array<NovaNode<E>> {
    return this._panes.filter(pane => isNovaUiLayoutDisplayed(pane)).slice(0, 2)
  }

  /**
   * Обновляет размеры runtime-представления SplitPane.
   */
  private _resizeBy(delta: number, event: MouseEvent): SplitPaneResizePayload {
    const total = this.props.direction === 'horizontal' ? this.width : this.height
    const [first] = this._lazyResize?.sizes ?? this._resolvePixelSizes(total)
    const nextFirst = this._clampFirstSize(first + delta, total)
    const nextSecond = total - nextFirst

    if (this.props.resizeMode === 'lazy') {
      this._lazyResize = {
        sizes: [nextFirst, nextSecond],
        startFirstSize: this._lazyResize?.startFirstSize ?? first,
      }
      const effectiveDelta = nextFirst - this._lazyResize.startFirstSize
      this.dirty({ update: true, render: true })
      return this._createResizePayload(effectiveDelta, event, nextFirst)
    }

    this.setProps({ sizes: [nextFirst, nextSecond] })
    return this._createResizePayload(delta, event)
  }

  /**
   * Запускает resize и подготавливает preview-состояние для lazy режима.
   */
  private _startResize(event: MouseEvent): void {
    if (this.props.resizeMode === 'lazy') {
      const total = this.props.direction === 'horizontal' ? this.width : this.height
      const sizes = this._resolvePixelSizes(total)
      this._lazyResize = { sizes, startFirstSize: sizes[0] }
    }
    this.props.onResizeStart?.(this._createResizePayload(0, event, this._lazyResize?.sizes[0]))
  }

  /**
   * Завершает resize и коммитит lazy preview в реальные sizes.
   */
  private _endResize(event: MouseEvent): void {
    const lazyResize = this._lazyResize
    if (!lazyResize) {
      this.props.onResizeEnd?.(this._createResizePayload(0, event))
      return
    }

    const effectiveDelta = lazyResize.sizes[0] - lazyResize.startFirstSize
    const payload = this._createResizePayload(effectiveDelta, event, lazyResize.sizes[0])
    this._lazyResize = null
    this.setProps({ sizes: lazyResize.sizes })
    this.props.onResizeEnd?.(payload)
  }

  /**
   * Создает runtime-сущность SplitPane.
   */
  private _createResizePayload(delta: number, event: MouseEvent, firstSize?: number): SplitPaneResizePayload {
    const { first, second, resizer } = this._resolveRects(firstSize)
    return {
      width: this.props.direction === 'horizontal' ? resizer.x : this.width,
      height: this.props.direction === 'vertical' ? resizer.y : this.height,
      delta,
      rect: resizer,
      panes: { first, second },
      event,
    }
  }

  /**
   * Нормализует и возвращает итоговое значение SplitPane.
   */
  private _resolveRects(firstSizeOverride?: number): {
    first: { x: number, y: number, width: number, height: number }
    second: { x: number, y: number, width: number, height: number }
    resizer: { x: number, y: number, width: number, height: number }
  } {
    const horizontal = this.props.direction === 'horizontal'
    const total = horizontal ? this.width : this.height
    const [resolvedFirstSize] = this._resolvePixelSizes(total)
    const firstSize = firstSizeOverride ?? resolvedFirstSize
    const hitSize = this.props.resizer.hitSize
    if (horizontal) {
      return {
        first: { x: 0, y: 0, width: firstSize, height: this.height },
        second: { x: firstSize + hitSize, y: 0, width: Math.max(0, this.width - firstSize - hitSize), height: this.height },
        resizer: { x: firstSize, y: 0, width: hitSize, height: this.height },
      }
    }
    return {
      first: { x: 0, y: 0, width: this.width, height: firstSize },
      second: { x: 0, y: firstSize + hitSize, width: this.width, height: Math.max(0, this.height - firstSize - hitSize) },
      resizer: { x: 0, y: firstSize, width: this.width, height: hitSize },
    }
  }

  /**
   * Нормализует и возвращает итоговое значение SplitPane.
   */
  private _resolvePixelSizes(total: number): [number, number] {
    if (this.props.collapsedPane === 'first') {
      return [0, total]
    }
    if (this.props.collapsedPane === 'second') {
      return [total, 0]
    }

    const [rawFirst, rawSecond] = this.props.sizes
    const ratioMode = rawFirst <= 1 && rawSecond <= 1
    const first = ratioMode ? total * rawFirst : rawFirst
    const clampedFirst = this._clampFirstSize(first, total)
    return [clampedFirst, Math.max(0, total - clampedFirst)]
  }

  /**
   * Ограничивает первую pane допустимыми min/max размерами.
   */
  private _clampFirstSize(first: number, total: number): number {
    const minFirst = this.props.minSizes[0]
    const minSecond = this.props.minSizes[1]
    const maxFirst = Math.min(this.props.maxSizes[0], total - minSecond)
    return clamp(first, minFirst, maxFirst)
  }
}
