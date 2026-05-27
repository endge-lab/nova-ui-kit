import { reconcileNovaTemplateChildren, type NovaApp, type NovaNode, type NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import { ColResizer } from '@/components/ColResizer/ColResizer'
import { RowResizer } from '@/components/RowResizer/RowResizer'
import {
  SPLIT_PANE_NODE_DESCRIPTOR,
  normalizeSplitPaneProps,
  type SplitPaneDescriptor,
} from '@/components/SplitPane/split-pane.config'
import type {
  SplitPaneApi,
  SplitPaneChildSchema,
  SplitPaneProps,
  SplitPaneResizePayload,
  SplitPaneResolvedProps,
} from '@/components/SplitPane/split-pane.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  clamp,
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
  private readonly panes: Array<NovaNode<E>> = []
  private resizerNode: RowResizer<E> | ColResizer<E> | null = null
  private lazyResize: SplitPaneLazyResizeState | null = null
  private readonly api: SplitPaneApi

  /**
   * Создает экземпляр SplitPane и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: SplitPaneProps = {},
    options: { componentId?: string; children?: Array<SplitPaneChildSchema> } = {},
    descriptor: SplitPaneDescriptor = SPLIT_PANE_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeSplitPaneProps(props), options)
    this.api = {
      setSizes: sizes => this.setProps({ sizes }),
      collapse: pane => this.setProps({ collapsedPane: pane }),
      expand: () => this.setProps({ collapsedPane: null }),
      setProps: patch => this.setProps(patch),
      relayout: () => this.relayout(),
      getProps: () => this.props,
    }
    this.setChildren(options.children ?? [])
    this.syncResizer()
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
    return this.api
  }

  /**
   * Обновляет значение состояния SplitPane.
   */
  setChildren(children: Array<SplitPaneChildSchema>): void {
    const nextSchemas = children.slice(0, 2)
    const reconciled = reconcileNovaTemplateChildren(this, this.panes, nextSchemas)
    this.panes.length = 0
    this.panes.push(...reconciled.nodes)
    this.syncResizer()
    this.dirty({ update: true, render: true })
  }

  /**
   * Обновляет runtime-состояние SplitPane.
   */
  update(): void {
    const activePanes = this.resolveActivePanes()
    this.syncPaneParticipation(activePanes)

    if (activePanes.length < 2) {
      this.syncResizer()
      this.applyPaneRect(activePanes[0], { x: 0, y: 0, width: this.width, height: this.height })
      return
    }

    this.syncResizer()
    const { first, second } = this.resolveRects()
    const { resizer } = this.resolveRects(this.lazyResize?.sizes[0])
    this.applyPaneRect(activePanes[0], first)
    this.applyPaneRect(activePanes[1], second)
    this.resizerNode?.options({
      ...resizer,
      color: this.props.resizer.color,
      lineWidth: this.props.resizer.lineWidth,
      hitSize: this.props.resizer.hitSize,
      overlayColor: this.props.resizer.overlayColor,
      minSize: 0,
      maxSize: Number.POSITIVE_INFINITY,
    })
  }

  /**
   * Применяет подготовленное состояние SplitPane.
   */
  private applyPaneRect(pane: NovaNode<E> | undefined, rect: { x: number; y: number; width: number; height: number }): void {
    if (!pane) return
    const changed = applyNodeLayoutRect(pane, rect)
    if (changed) pane.dirty({ matrix: true, update: true, render: true })
  }

  /**
   * Синхронизирует runtime-участие panes с layout-участием.
   */
  private syncPaneParticipation(activePanes: Array<NovaNode<E>>): void {
    const activePaneSet = new Set(activePanes)
    const emptyRect = { x: 0, y: 0, width: 0, height: 0 }

    for (const pane of this.panes) {
      const active = activePaneSet.has(pane)
      if (pane.visible !== active) {
        pane.visible = active
        pane.dirty({ render: true })
      }
      if (pane.active !== active) {
        pane.active = active
        pane.dirty({ update: true })
      }
      if (!active) this.applyPaneRect(pane, emptyRect)
    }
  }

  /**
   * Выполняет отрисовку SplitPane.
   */
  render(): void {
    const schema = buildBoxSchema(this.props, this.width, this.height)
    if (schema.length > 0) this.renderer.schema(schema)
    if (this.props.clip) this.renderer.clip(0, 0, this.width, this.height)
  }

  /**
   * Обрабатывает входящее событие SplitPane.
   */
  protected override onPropsChanged(changedKeys: Array<keyof SplitPaneResolvedProps>): void {
    const previousDirection = this.props.direction
    this.props = normalizeSplitPaneProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    if (previousDirection !== this.props.direction) {
      this.lazyResize = null
      this.disposeResizer()
    }
    this.syncResizer()
    this.dirty({ update: true, render: true })
  }

  /**
   * Пересчитывает panes после изменения display у дочерних node.
   */
  private relayout(): void {
    this.syncResizer()
    this.dirty({ update: true, render: true })
  }

  /**
   * Синхронизирует наличие resizer с количеством активных pane.
   */
  private syncResizer(): void {
    if (this.resolveActivePanes().length < 2) {
      this.disposeResizer()
      return
    }

    if (this.resizerNode) return
    this.resizerNode = this.props.direction === 'horizontal'
      ? new ColResizer<E>(this.nova, this.surface, this.props.resizer.color, this.props.resizer.lineWidth)
      : new RowResizer<E>(this.nova, this.surface, this.props.resizer.color, this.props.resizer.lineWidth)
    this.addChild(this.resizerNode)
    this.resizerNode
      .onChangeStart(event => this.startResize(event))
      .onChangeMove((event, delta) => {
        const payload = this.resizeBy(delta, event)
        this.props.onResize?.(payload)
      })
      .onChangeEnd(event => this.endResize(event))
  }

  /**
   * Удаляет resizer, когда SplitPane работает как single-pane контейнер.
   */
  private disposeResizer(): void {
    this.resizerNode?.remove()
    this.resizerNode = null
  }

  /**
   * Возвращает panes, которые участвуют в split layout.
   */
  private resolveActivePanes(): Array<NovaNode<E>> {
    return this.panes.filter(pane => isNovaUiLayoutDisplayed(pane)).slice(0, 2)
  }

  /**
   * Обновляет размеры runtime-представления SplitPane.
   */
  private resizeBy(delta: number, event: MouseEvent): SplitPaneResizePayload {
    const total = this.props.direction === 'horizontal' ? this.width : this.height
    const [first] = this.lazyResize?.sizes ?? this.resolvePixelSizes(total)
    const nextFirst = this.clampFirstSize(first + delta, total)
    const nextSecond = total - nextFirst

    if (this.props.resizeMode === 'lazy') {
      this.lazyResize = {
        sizes: [nextFirst, nextSecond],
        startFirstSize: this.lazyResize?.startFirstSize ?? first,
      }
      const effectiveDelta = nextFirst - this.lazyResize.startFirstSize
      this.dirty({ update: true, render: true })
      return this.createResizePayload(effectiveDelta, event, nextFirst)
    }

    this.setProps({ sizes: [nextFirst, nextSecond] })
    return this.createResizePayload(delta, event)
  }

  /**
   * Запускает resize и подготавливает preview-состояние для lazy режима.
   */
  private startResize(event: MouseEvent): void {
    if (this.props.resizeMode === 'lazy') {
      const total = this.props.direction === 'horizontal' ? this.width : this.height
      const sizes = this.resolvePixelSizes(total)
      this.lazyResize = { sizes, startFirstSize: sizes[0] }
    }
    this.props.onResizeStart?.(this.createResizePayload(0, event, this.lazyResize?.sizes[0]))
  }

  /**
   * Завершает resize и коммитит lazy preview в реальные sizes.
   */
  private endResize(event: MouseEvent): void {
    const lazyResize = this.lazyResize
    if (!lazyResize) {
      this.props.onResizeEnd?.(this.createResizePayload(0, event))
      return
    }

    const effectiveDelta = lazyResize.sizes[0] - lazyResize.startFirstSize
    const payload = this.createResizePayload(effectiveDelta, event, lazyResize.sizes[0])
    this.lazyResize = null
    this.setProps({ sizes: lazyResize.sizes })
    this.props.onResizeEnd?.(payload)
  }

  /**
   * Создает runtime-сущность SplitPane.
   */
  private createResizePayload(delta: number, event: MouseEvent, firstSize?: number): SplitPaneResizePayload {
    const { resizer } = this.resolveRects(firstSize)
    return {
      width: this.props.direction === 'horizontal' ? resizer.x : this.width,
      height: this.props.direction === 'vertical' ? resizer.y : this.height,
      delta,
      rect: resizer,
      event,
    }
  }

  /**
   * Нормализует и возвращает итоговое значение SplitPane.
   */
  private resolveRects(firstSizeOverride?: number): {
    first: { x: number; y: number; width: number; height: number }
    second: { x: number; y: number; width: number; height: number }
    resizer: { x: number; y: number; width: number; height: number }
  } {
    const horizontal = this.props.direction === 'horizontal'
    const total = horizontal ? this.width : this.height
    const [resolvedFirstSize] = this.resolvePixelSizes(total)
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
  private resolvePixelSizes(total: number): [number, number] {
    if (this.props.collapsedPane === 'first') return [0, total]
    if (this.props.collapsedPane === 'second') return [total, 0]

    const [rawFirst, rawSecond] = this.props.sizes
    const ratioMode = rawFirst <= 1 && rawSecond <= 1
    const first = ratioMode ? total * rawFirst : rawFirst
    const clampedFirst = this.clampFirstSize(first, total)
    return [clampedFirst, Math.max(0, total - clampedFirst)]
  }

  /**
   * Ограничивает первую pane допустимыми min/max размерами.
   */
  private clampFirstSize(first: number, total: number): number {
    const minFirst = this.props.minSizes[0]
    const minSecond = this.props.minSizes[1]
    const maxFirst = Math.min(this.props.maxSizes[0], total - minSecond)
    return clamp(first, minFirst, maxFirst)
  }
}
