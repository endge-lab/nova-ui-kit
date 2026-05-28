import {
  NovaComponentNode,
  reconcileNovaTemplateChildren,
  type NovaApp,
  type NovaNode,
  type NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  GRID_NODE_DESCRIPTOR,
  normalizeGridProps,
  type GridDescriptor,
} from '@/components/Grid/grid.config'
import {
  GridLayoutEngine,
  compileGridChildLayout,
  createGridChildEntry,
  type GridChildEntry,
} from '@/components/Grid/GridLayoutEngine'
import type {
  GridApi,
  GridChildLayout,
  GridChildSchema,
  GridProps,
  GridResolvedProps,
} from '@/components/Grid/grid.types'
import {
  NOVA_UI_LAYOUT_TARGET,
  applyNodeLayoutRect,
  applyNovaUiLayoutZIndex,
  copyRect,
  createLayoutRect,
  getNovaUiNodeLayoutIntent,
  isNovaUiOutOfFlowPosition,
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

/** Сеточный layout-компонент с fixed и responsive режимом колонок. */
export class Grid<E extends EventList = Record<string, any>>
  extends NovaComponentNode<GridResolvedProps, GridApi, Record<string, never>, GridProps, E>
  implements NovaUiLayoutTarget, NovaUiStyleTarget {
  readonly [NOVA_UI_LAYOUT_TARGET] = true as const
  readonly [NOVA_UI_STYLE_TARGET] = true as const

  private readonly engine = new GridLayoutEngine()
  private readonly ownRect = createLayoutRect()
  private readonly childEntries: Array<GridChildEntry> = []
  private readonly childEntriesById = new Map<string, GridChildEntry>()
  private readonly rectsById = new Map<string, NovaUiLayoutRect>()
  private readonly api: GridApi
  private layoutDirty = true
  private externalLayout = false
  private columnCount = 1
  private inheritedStyleContext = EMPTY_STYLE_CONTEXT
  private effectiveStyleContext = EMPTY_STYLE_CONTEXT
  private subtreeStyleMask = NovaUiStyleMask.None

  /**
   * Создает экземпляр Grid и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: GridProps = {},
    options: { componentId?: string; children?: Array<GridChildSchema> } = {},
    descriptor: GridDescriptor = GRID_NODE_DESCRIPTOR,
  ) {
    const resolvedProps = normalizeGridProps(props)
    super(app, surface, descriptor, resolvedProps, options)
    this.__type = 'Grid'
    this.applyDisplayState()
    this.api = {
      setChildren: children => this.setChildren(children),
      setChildLayout: (id, layout) => this.setChildLayout(id, layout),
      relayout: () => this.relayout(),
      getChildRect: id => this.getChildRect(id),
      getColumnCount: () => this.columnCount,
    }
    this.applyResolvedRect({
      x: resolvedProps.x,
      y: resolvedProps.y,
      width: resolvedProps.width,
      height: resolvedProps.height,
    })
    this.effectiveStyleContext = mergeStyleContext(this.inheritedStyleContext, resolvedProps.style)
    this.setChildren(options.children ?? [])
  }

  /**
   * Обновляет значение состояния Grid.
   */
  override setProps(patch: GridProps): this {
    return super.setProps(patch as Partial<GridResolvedProps>)
  }

  /**
   * Возвращает значение состояния Grid.
   */
  override getApi(): GridApi {
    return this.api
  }

  /**
   * Выполняет действие responsiveReflow в рамках ответственности Grid.
   */
  responsiveReflow(columns: number, gap = this.props.gap): void {
    this.transitionTo(
      { columns, gap, rowGap: gap, columnGap: gap },
      resolveNovaUiMotionOptions('responsiveReflow'),
    )
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
   * Возвращает значение состояния Grid.
   */
  getSubtreeStyleMask(): NovaUiStyleMask {
    this.recomputeSubtreeStyleMask()
    return this.subtreeStyleMask & ~inheritedTextStyleMask(this.props.style)
  }

  /** Пересчитывает сетку только если изменились размеры, props или children. */
  update(): void {
    if (!this.layoutDirty) return
    if (!this.externalLayout) this.applyResolvedRect(this.resolveStandaloneRect())

    const layoutEntries = this.childEntries.filter(entry => isNovaUiLayoutDisplayed(entry.node))
    const flowEntries: Array<GridChildEntry> = []
    const positionedEntries: Array<GridChildEntry> = []
    const layoutsById = new Map<string, GridChildLayout>()

    for (const entry of layoutEntries) {
      const layout = resolveGridChildLayout(entry.node, entry.rawLayout)
      layoutsById.set(entry.id, layout)
      entry.compiledLayout = compileGridChildLayout(layout)
      if (isNovaUiOutOfFlowPosition(layout.position)) positionedEntries.push(entry)
      else flowEntries.push(entry)
    }

    const result = this.engine.compute({
      props: this.props,
      width: this.width,
      height: this.height,
      entries: flowEntries,
    })
    this.columnCount = result.columnCount

    const containerRect = resolveGridContentRect(this.props.padding, this.width, this.height)
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
  setChildren(children: Array<GridChildSchema>): void {
    const previousNodes = this.childEntries.map(entry => entry.node as NovaNode<E>)
    const reconciled = reconcileNovaTemplateChildren(this, previousNodes, children)
    this.childEntries.length = 0
    this.childEntriesById.clear()
    this.rectsById.clear()

    children.forEach((child, index) => {
      const node = reconciled.nodes[index]
      const id = child.id ?? (node as NovaNode<E> & { componentId?: string }).componentId ?? node.id
      const entry = createGridChildEntry(id, node, child.layout)
      this.childEntries.push(entry)
      this.childEntriesById.set(id, entry)
    })

    this.recomputeSubtreeStyleMask()
    this.propagateStyleContext(NovaUiStyleMask.AllText)
    this.layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  /** Меняет layout-намерение ребенка без пересоздания node. */
  setChildLayout(id: string, layout: GridChildLayout): void {
    const entry = this.childEntriesById.get(id)
    if (!entry) return

    entry.rawLayout = layout
    entry.compiledLayout = compileGridChildLayout(layout)
    this.layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  /** Принудительно помечает layout грязным без изменения props. */
  relayout(): void {
    this.layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  /**
   * Возвращает значение состояния Grid.
   */
  getChildRect(id: string): Readonly<NovaUiLayoutRect> | undefined {
    return this.rectsById.get(id)
  }

  /**
   * Обрабатывает входящее событие Grid.
   */
  protected override onPropsChanged(changedKeys: Array<keyof GridResolvedProps>): void {
    this.props = normalizeGridProps(this.props)
    this.applyDisplayState()
    this.options({ zIndex: this.props.zIndex })
    if (changedKeys.includes('display')) this.markLayoutAncestorsDirty()
    if (changedKeys.includes('position') || changedKeys.includes('inset') || changedKeys.includes('zIndex')) this.markLayoutAncestorsDirty()
    if (hasGridLayoutChanges(changedKeys)) this.layoutDirty = true
    if (!this.externalLayout && hasGridGeometryChanges(changedKeys)) {
      this.applyResolvedRect({
        x: this.props.x,
        y: this.props.y,
        width: this.props.width,
        height: this.props.height,
      })
    }
    if (changedKeys.includes('style')) {
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
   * Применяет подготовленное состояние Grid.
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

  /**
   * Выполняет внутренний шаг propagateStyleContext для Grid.
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
   * Выполняет внутренний шаг recomputeSubtreeStyleMask для Grid.
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
   * Применяет подготовленное состояние Grid.
   */
  private applyDisplayState(): void {
    const displayed = this.props.display !== 'none'
    this.visible = displayed
    this.active = displayed
  }

  /**
   * Выполняет внутренний шаг markLayoutAncestorsDirty для Grid.
   */
  private markLayoutAncestorsDirty(): void {
    relayoutNovaUiLayoutAncestors(this)
  }

  private applyChildLayoutRect(entry: GridChildEntry, rect: NovaUiLayoutRect): void {
    const layout = resolveGridChildLayout(entry.node, entry.rawLayout)
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
    const fallback = {
      x: this.props.x,
      y: this.props.y,
      width: this.props.width,
      height: this.props.height,
    }
    if (this.props.position === 'static') return fallback
    return resolveNovaUiPositionedRect(
      { x: 0, y: 0, width: this.surface.width, height: this.surface.height },
      fallback,
      { position: this.props.position, inset: this.props.inset, zIndex: this.props.zIndex },
      this,
    )
  }
}

function hasGridGeometryChanges(keys: Array<keyof GridResolvedProps>): boolean {
  return keys.includes('x') || keys.includes('y') || keys.includes('width') || keys.includes('height') || keys.includes('position') || keys.includes('inset')
}

function resolveGridChildLayout(node: unknown, explicitLayout: GridChildLayout = {}): GridChildLayout {
  const props = readNovaUiNodeProps(node)
  const propLayout = resolveNovaUiPositionedLayout(node)
  return mergeNovaUiLayoutIntents<GridChildLayout>(
    resolveNovaUiClassLayoutIntent(props.className),
    getNovaUiNodeLayoutIntent(node),
    propLayout,
    explicitLayout,
  )
}

function resolveGridContentRect(paddingInput: GridResolvedProps['padding'], width: number, height: number): NovaUiLayoutRect {
  const padding = resolveSpacing(paddingInput)
  return {
    x: padding.left,
    y: padding.top,
    width: Math.max(0, width - padding.left - padding.right),
    height: Math.max(0, height - padding.top - padding.bottom),
  }
}

function hasGridLayoutChanges(keys: Array<keyof GridResolvedProps>): boolean {
  return (
    keys.includes('width')
    || keys.includes('height')
    || keys.includes('position')
    || keys.includes('inset')
    || keys.includes('responsive')
    || keys.includes('columns')
    || keys.includes('minColumns')
    || keys.includes('maxColumns')
    || keys.includes('minColumnWidth')
    || keys.includes('gap')
    || keys.includes('rowGap')
    || keys.includes('columnGap')
    || keys.includes('padding')
    || keys.includes('rowHeight')
    || keys.includes('alignItems')
    || keys.includes('justifyItems')
    || keys.includes('display')
  )
}
