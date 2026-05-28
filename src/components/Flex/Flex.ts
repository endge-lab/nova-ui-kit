import {
  NovaComponentNode,
  reconcileNovaTemplateChildren,
  type NovaApp,
  type NovaNode,
  type NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  FLEX_NODE_DESCRIPTOR,
  normalizeFlexProps,
  type FlexDescriptor,
} from '@/components/Flex/flex.config'
import {
  FlexLayoutEngine,
  compileFlexChildLayout,
  createFlexChildEntry,
  type FlexChildEntry,
} from '@/components/Flex/FlexLayoutEngine'
import type {
  FlexApi,
  FlexChildLayout,
  FlexChildSchema,
  FlexProps,
  FlexResolvedProps,
} from '@/components/Flex/flex.types'
import {
  NOVA_UI_LAYOUT_TARGET,
  applyNodeLayoutRect,
  applyNovaUiLayoutZIndex,
  copyRect,
  createLayoutRect,
  getNovaUiNodeLayoutIntent,
  isNovaUiOutOfFlowPosition,
  isNovaUiLayoutTarget,
  isNovaUiLayoutDisplayed,
  mergeNovaUiLayoutIntents,
  readNovaUiNodeProps,
  rectEquals,
  relayoutNovaUiLayoutAncestors,
  resolveNovaUiPositionedLayout,
  resolveNovaUiPositionedRect,
  resolveSpacing,
  type NovaUiLayoutRect,
  type NovaUiLayoutTarget,
} from '@/shared/layout'
import {
  EMPTY_STYLE_CONTEXT,
  NOVA_UI_STYLE_TARGET,
  NovaUiStyleMask,
  borderRadiusToRendererValue,
  inheritedTextStyleMask,
  isNovaUiStyleTarget,
  mergeStyleContext,
  mergeStyleReceiveResult,
  styleContextChangedMask,
  type NovaUiStyleContext,
  type NovaUiStyleReceiveResult,
  type NovaUiStyleTarget,
  resolveNovaUiClassLayoutIntent,
} from '@/shared/style'
import { resolveNovaUiMotionOptions } from '@/shared/motion'

/** Layout-компонент, который резолвит adaptive values и назначает rect детям. */
export class Flex<E extends EventList = Record<string, any>>
  extends NovaComponentNode<FlexResolvedProps, FlexApi, Record<string, never>, FlexProps, E>
  implements NovaUiLayoutTarget, NovaUiStyleTarget {
  readonly [NOVA_UI_LAYOUT_TARGET] = true as const
  readonly [NOVA_UI_STYLE_TARGET] = true as const

  private readonly engine = new FlexLayoutEngine()
  private readonly ownRect = createLayoutRect()
  private readonly childEntries: Array<FlexChildEntry> = []
  private readonly childEntriesById = new Map<string, FlexChildEntry>()
  private readonly rectsById = new Map<string, NovaUiLayoutRect>()
  private readonly api: FlexApi
  private layoutDirty = true
  private externalLayout = false
  private inheritedStyleContext = EMPTY_STYLE_CONTEXT
  private effectiveStyleContext = EMPTY_STYLE_CONTEXT
  private subtreeStyleMask = NovaUiStyleMask.None

  /**
   * Создает экземпляр Flex и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: FlexProps = {},
    options: { componentId?: string; children?: Array<FlexChildSchema> } = {},
    descriptor: FlexDescriptor = FLEX_NODE_DESCRIPTOR,
  ) {
    const resolvedProps = normalizeFlexProps(props)
    super(app, surface, descriptor, resolvedProps, options)
    this.__type = 'Flex'
    this.layoutReady = false
    this.applyDisplayState()
    this.api = {
      setChildren: children => this.setChildren(children),
      setChildLayout: (id, layout) => this.setChildLayout(id, layout),
      relayout: () => this.relayout(),
      getChildRect: id => this.getChildRect(id),
    }
    this.effectiveStyleContext = mergeStyleContext(this.inheritedStyleContext, resolvedProps.style)
    this.setChildren(options.children ?? [])
    this.update()
    this.layoutReady = true
  }

  /**
   * Обновляет значение состояния Flex.
   */
  override setProps(patch: FlexProps): this {
    return super.setProps(patch as Partial<FlexResolvedProps>)
  }

  /**
   * Возвращает значение состояния Flex.
   */
  override getApi(): FlexApi {
    return this.api
  }

  /**
   * Выполняет действие expandCollapse в рамках ответственности Flex.
   */
  expandCollapse(expandedHeight: number, collapsedHeight = 0): void {
    const nextHeight = this.props.height === expandedHeight ? collapsedHeight : expandedHeight
    this.transitionTo(
      { height: nextHeight },
      resolveNovaUiMotionOptions('expandCollapse'),
    )
  }

  /**
   * Выполняет действие gapShift в рамках ответственности Flex.
   */
  gapShift(to = 20, backTo = 8): void {
    this.transitionTo(
      { gap: to, rowGap: to, columnGap: to },
      { ...resolveNovaUiMotionOptions('gapShift'), duration: 130 },
    )
    this.nova.motion.to(this, { gap: backTo, rowGap: backTo, columnGap: backTo }, {
      ...resolveNovaUiMotionOptions('gapShift'),
      delay: 130,
      overwrite: false,
    })
  }

  /** Принимает итоговый rect от layout-родителя и запускает пересчет детей. */
  applyLayoutRect(rect: NovaUiLayoutRect): boolean {
    this.externalLayout = true
    return this.applyResolvedRect(rect)
  }

  /** Принимает style context от родителя и точечно проталкивает его детям. */
  receiveStyleContext(context: NovaUiStyleContext, _changedMask: NovaUiStyleMask): NovaUiStyleReceiveResult {
    this.inheritedStyleContext = context
    const previousContext = this.effectiveStyleContext
    this.effectiveStyleContext = mergeStyleContext(context, this.props.style)
    const changedMask = styleContextChangedMask(previousContext, this.effectiveStyleContext)

    if (changedMask === NovaUiStyleMask.None) {return {
      update: false,
      render: false,
      layout: false,
    }}

    const result = this.propagateStyleContext(changedMask)
    if (result.layout) {
      this.layoutDirty = true
      this.dirty({ update: true, render: true })
    }
    return result
  }

  /**
   * Возвращает значение состояния Flex.
   */
  getSubtreeStyleMask(): NovaUiStyleMask {
    this.recomputeSubtreeStyleMask()
    return this.subtreeStyleMask & ~inheritedTextStyleMask(this.props.style)
  }

  /**
   * Применяет подготовленное состояние Flex.
   */
  private applyResolvedRect(rect: NovaUiLayoutRect): boolean {
    if (rectEquals(this.ownRect, rect)) return false

    copyRect(this.ownRect, rect)
    super.options({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      zIndex: this.props.zIndex,
    })
    this.layoutDirty = true
    this.dirty({ update: true, matrix: true, render: true })
    return true
  }

  /** Пересчитывает layout только если изменились размеры, props или children. */
  update(): void {
    if (!this.layoutDirty) return
    if (!this.externalLayout) this.applyResolvedRect(this.resolveStandaloneRect())

    const layoutEntries = this.childEntries.filter(entry => isNovaUiLayoutDisplayed(entry.node))
    const flowEntries: Array<FlexChildEntry> = []
    const positionedEntries: Array<FlexChildEntry> = []
    const layoutsById = new Map<string, FlexChildLayout>()

    for (const entry of layoutEntries) {
      const layout = resolveFlexChildLayout(entry.node, entry.rawLayout)
      layoutsById.set(entry.id, layout)
      entry.compiledLayout = compileFlexChildLayout(layout)
      if (isNovaUiOutOfFlowPosition(layout.position)) positionedEntries.push(entry)
      else flowEntries.push(entry)
    }

    this.engine.compute({
      props: this.props,
      width: this.width,
      height: this.height,
      entries: flowEntries,
    })

    const containerRect = resolveFlexContentRect(this.props.padding, this.width, this.height)
    for (const entry of flowEntries) {
      this.applyChildLayoutRect(entry, resolveNovaUiPositionedRect(
        containerRect,
        entry.nextRect,
        layoutsById.get(entry.id) ?? {},
        entry.node,
      ))
    }

    for (const entry of positionedEntries) {
      const fallback = {
        x: entry.prevRect.x,
        y: entry.prevRect.y,
        width: entry.prevRect.width || entry.node.width,
        height: entry.prevRect.height || entry.node.height,
      }
      this.applyChildLayoutRect(entry, resolveNovaUiPositionedRect(
        containerRect,
        fallback,
        layoutsById.get(entry.id) ?? {},
        entry.node,
      ))
    }

    this.layoutDirty = false
  }

  /** Рисует только фон, border и clip контейнера. Дети рендерятся Nova lifecycle. */
  render(): void {
    const schema = []

    if (this.props.background) {
      schema.push({
        type: 'rect' as const,
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        styles: {
          background: this.props.background,
        },
      })
    }

    if (this.props.border?.width) {
      schema.push({
        type: 'border' as const,
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        styles: {
          color: this.props.border.color ?? '#d6d9e2',
          width: this.props.border.width,
          radius: borderRadiusToRendererValue(this.props.border.radius),
        },
      })
    }

    if (this.props.clip) {
      this.renderer.clip(0, 0, this.width, this.height)
    }

    if (schema.length > 0) this.renderer.schema(schema)
  }

  /** Заменяет managed children и пересчитывает layout одним dirty pass. */
  setChildren(children: Array<FlexChildSchema>): void {
    const previousNodes = this.childEntries.map(entry => entry.node as NovaNode<E>)
    const reconciled = reconcileNovaTemplateChildren(this, previousNodes, children)
    this.childEntries.length = 0
    this.childEntriesById.clear()
    this.rectsById.clear()

    children.forEach((child, index) => {
      const node = reconciled.nodes[index]
      const id = child.id ?? (node as NovaNode<E> & { componentId?: string }).componentId ?? node.id
      const entry = createFlexChildEntry(id, node, child.layout)
      entry.compiledLayout = compileFlexChildLayout(resolveFlexChildLayout(node, child.layout))
      this.childEntries.push(entry)
      this.childEntriesById.set(id, entry)
    })

    this.recomputeSubtreeStyleMask()
    this.propagateStyleContext(NovaUiStyleMask.AllText)
    this.layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  /** Меняет layout-намерение ребенка без пересоздания node. */
  setChildLayout(id: string, layout: FlexChildLayout): void {
    const entry = this.childEntriesById.get(id)
    if (!entry) return

    entry.rawLayout = layout
    entry.compiledLayout = compileFlexChildLayout(layout)
    this.layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  /** Принудительно помечает layout грязным без изменения props. */
  relayout(): void {
    this.layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  /**
   * Возвращает значение состояния Flex.
   */
  getChildRect(id: string): Readonly<NovaUiLayoutRect> | undefined {
    return this.rectsById.get(id)
  }

  /**
   * Обрабатывает входящее событие Flex.
   */
  protected override onPropsChanged(_changedKeys: Array<keyof FlexResolvedProps>): void {
    this.props = normalizeFlexProps(this.props)
    this.applyDisplayState()
    this.options({ zIndex: this.props.zIndex })
    if (_changedKeys.includes('display')) this.markLayoutAncestorsDirty()
    if (_changedKeys.includes('position') || _changedKeys.includes('inset') || _changedKeys.includes('zIndex')) this.markLayoutAncestorsDirty()
    if (hasFlexLayoutChanges(_changedKeys)) this.layoutDirty = true
    if (!this.externalLayout && hasFlexGeometryChanges(_changedKeys)) {
      this.applyResolvedRect({
        x: this.props.x,
        y: this.props.y,
        width: this.props.width,
        height: this.props.height,
      })
    }
    if (_changedKeys.includes('style')) {
      const previousContext = this.effectiveStyleContext
      this.effectiveStyleContext = mergeStyleContext(this.inheritedStyleContext, this.props.style)
      const changedMask = styleContextChangedMask(previousContext, this.effectiveStyleContext)

      this.recomputeSubtreeStyleMask()
      if (changedMask !== NovaUiStyleMask.None) {
        const result = this.propagateStyleContext(changedMask)
        if (result.layout) this.layoutDirty = true
      }
    }
  }

  /**
   * Выполняет внутренний шаг propagateStyleContext для Flex.
   */
  private propagateStyleContext(changedMask: NovaUiStyleMask): NovaUiStyleReceiveResult {
    const result: NovaUiStyleReceiveResult = {
      update: false,
      render: false,
      layout: false,
    }

    for (const entry of this.childEntries) {
      const node = entry.node
      if (!isNovaUiStyleTarget(node)) continue

      const childMask = node.getSubtreeStyleMask()
      if ((changedMask & childMask) === 0) continue

      mergeStyleReceiveResult(
        result,
        node.receiveStyleContext(this.effectiveStyleContext, changedMask & childMask),
      )
    }

    return result
  }

  /**
   * Выполняет внутренний шаг recomputeSubtreeStyleMask для Flex.
   */
  private recomputeSubtreeStyleMask(): void {
    let mask = NovaUiStyleMask.None

    for (const entry of this.childEntries) {
      if (isNovaUiStyleTarget(entry.node)) {
        mask |= entry.node.getSubtreeStyleMask()
      }
    }

    this.subtreeStyleMask = mask
  }

  /**
   * Применяет подготовленное состояние Flex.
   */
  private applyDisplayState(): void {
    const displayed = this.props.display !== 'none'
    this.visible = displayed
    this.active = displayed
  }

  /**
   * Выполняет внутренний шаг markLayoutAncestorsDirty для Flex.
   */
  private markLayoutAncestorsDirty(): void {
    relayoutNovaUiLayoutAncestors(this)
  }

  private applyChildLayoutRect(entry: FlexChildEntry, rect: NovaUiLayoutRect): void {
    const layout = resolveFlexChildLayout(entry.node, entry.rawLayout)
    if (rectEquals(entry.prevRect, rect)) {
      applyNovaUiLayoutZIndex(entry.node as NovaNode<any>, layout.zIndex)
      return
    }

    const changed = applyNodeLayoutRect(entry.node as NovaNode<any>, rect)
    applyNovaUiLayoutZIndex(entry.node as NovaNode<any>, layout.zIndex)
    copyRect(entry.prevRect, rect)
    this.rectsById.set(entry.id, entry.prevRect)
    if (changed) entry.node.dirty({ update: true, render: true })
  }

  private resolveStandaloneRect(): NovaUiLayoutRect {
    const preferred = this.measurePreferredSize()
    const fallback = {
      x: this.props.x,
      y: this.props.y,
      width: this.props.width > 0 ? this.props.width : preferred.width,
      height: this.props.height > 0 ? this.props.height : preferred.height,
    }
    if (this.props.position === 'static') return fallback
    return resolveNovaUiPositionedRect(
      { x: 0, y: 0, width: this.surface.width, height: this.surface.height },
      fallback,
      { position: this.props.position, inset: this.props.inset, zIndex: this.props.zIndex },
      this,
    )
  }

  private measurePreferredSize(): { width: number; height: number } {
    const entries = this.childEntries.filter(entry => {
      if (!isNovaUiLayoutDisplayed(entry.node)) return false
      return !isNovaUiOutOfFlowPosition(resolveFlexChildLayout(entry.node, entry.rawLayout).position)
    })
    if (entries.length === 0) return { width: Math.max(0, this.props.width), height: Math.max(0, this.props.height) }

    const padding = resolveSpacing(this.props.padding)
    const isRow = this.props.direction === 'row'
    const mainGap = isRow ? this.props.columnGap : this.props.rowGap
    let main = 0
    let cross = 0

    entries.forEach((entry, index) => {
      const layout = resolveFlexChildLayout(entry.node, entry.rawLayout)
      const size = measureFlexChild(entry, layout)
      const margin = resolveSpacing(layout.margin)
      const itemMain = isRow ? size.width + margin.left + margin.right : size.height + margin.top + margin.bottom
      const itemCross = isRow ? size.height + margin.top + margin.bottom : size.width + margin.left + margin.right
      main += itemMain + (index > 0 ? mainGap : 0)
      cross = Math.max(cross, itemCross)
    })

    return isRow
      ? { width: main + padding.left + padding.right, height: cross + padding.top + padding.bottom }
      : { width: cross + padding.left + padding.right, height: main + padding.top + padding.bottom }
  }
}

function hasFlexGeometryChanges(keys: Array<keyof FlexResolvedProps>): boolean {
  return keys.includes('x') || keys.includes('y') || keys.includes('width') || keys.includes('height') || keys.includes('position') || keys.includes('inset')
}

function measureFlexChild(entry: FlexChildEntry, layout: FlexChildLayout): { width: number; height: number } {
  const layoutWidth = typeof layout.width === 'number' && Number.isFinite(layout.width) ? layout.width : undefined
  const layoutHeight = typeof layout.height === 'number' && Number.isFinite(layout.height) ? layout.height : undefined
  const measured = isNovaUiLayoutTarget(entry.node) && entry.node.measureLayout
    ? entry.node.measureLayout({ minWidth: 0, maxWidth: Number.MAX_SAFE_INTEGER, minHeight: 0, maxHeight: Number.MAX_SAFE_INTEGER })
    : undefined
  return {
    width: Math.max(0, layoutWidth ?? measured?.width ?? entry.node.width ?? 0),
    height: Math.max(0, layoutHeight ?? measured?.height ?? entry.node.height ?? 0),
  }
}

function resolveFlexChildLayout(node: unknown, explicitLayout: FlexChildLayout = {}): FlexChildLayout {
  const props = readNovaUiNodeProps(node)
  const propLayout = resolveNovaUiPositionedLayout(node)
  return mergeNovaUiLayoutIntents<FlexChildLayout>(
    resolveNovaUiClassLayoutIntent(props.className),
    getNovaUiNodeLayoutIntent(node),
    propLayout,
    explicitLayout,
  )
}

function resolveFlexContentRect(paddingInput: FlexResolvedProps['padding'], width: number, height: number): NovaUiLayoutRect {
  const padding = resolveSpacing(paddingInput)
  return {
    x: padding.left,
    y: padding.top,
    width: Math.max(0, width - padding.left - padding.right),
    height: Math.max(0, height - padding.top - padding.bottom),
  }
}

function hasFlexLayoutChanges(keys: Array<keyof FlexResolvedProps>): boolean {
  return (
    keys.includes('width')
    || keys.includes('height')
    || keys.includes('position')
    || keys.includes('inset')
    || keys.includes('row')
    || keys.includes('col')
    || keys.includes('direction')
    || keys.includes('wrap')
    || keys.includes('gap')
    || keys.includes('rowGap')
    || keys.includes('columnGap')
    || keys.includes('padding')
    || keys.includes('justifyContent')
    || keys.includes('alignItems')
    || keys.includes('display')
  )
}
