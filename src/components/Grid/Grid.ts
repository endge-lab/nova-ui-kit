import {
  NovaComponentNode,
  type NovaApp,
  type NovaNode,
  type NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  GRID_NODE_DESCRIPTOR,
  normalizeGridProps,
  type GridDescriptor,
} from '@/components/Grid/Grid.config'
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
} from '@/components/Grid/types'
import {
  NOVA_UI_LAYOUT_TARGET,
  applyNodeLayoutRect,
  copyRect,
  createLayoutRect,
  rectEquals,
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
  private readonly childEntries: GridChildEntry[] = []
  private readonly childEntriesById = new Map<string, GridChildEntry>()
  private readonly rectsById = new Map<string, NovaUiLayoutRect>()
  private readonly api: GridApi
  private layoutDirty = true
  private externalLayout = false
  private columnCount = 1
  private inheritedStyleContext = EMPTY_STYLE_CONTEXT
  private effectiveStyleContext = EMPTY_STYLE_CONTEXT
  private subtreeStyleMask = NovaUiStyleMask.None

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: GridProps = {},
    options: { componentId?: string; children?: GridChildSchema[] } = {},
    descriptor: GridDescriptor = GRID_NODE_DESCRIPTOR,
  ) {
    const resolvedProps = normalizeGridProps(props)
    super(app, surface, descriptor, resolvedProps, options)
    this.__type = 'Grid'
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

  override setProps(patch: GridProps): this {
    return super.setProps(patch as Partial<GridResolvedProps>)
  }

  override getApi(): GridApi {
    return this.api
  }

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

    if (changedMask === NovaUiStyleMask.None) return {
      update: false,
      render: false,
      layout: false,
    }

    const result = this.propagateStyleContext(changedMask)
    if (result.layout) {
      this.layoutDirty = true
      this.dirty({ update: true, render: true })
    }
    return result
  }

  getSubtreeStyleMask(): NovaUiStyleMask {
    this.recomputeSubtreeStyleMask()
    return this.subtreeStyleMask & ~inheritedTextStyleMask(this.props.style)
  }

  /** Пересчитывает сетку только если изменились размеры, props или children. */
  update(): void {
    if (!this.layoutDirty) return

    const result = this.engine.compute({
      props: this.props,
      width: this.width,
      height: this.height,
      entries: this.childEntries,
    })
    this.columnCount = result.columnCount

    for (const entry of this.childEntries) {
      if (rectEquals(entry.prevRect, entry.nextRect)) continue

      const changed = applyNodeLayoutRect(entry.node as NovaNode<any>, entry.nextRect)
      copyRect(entry.prevRect, entry.nextRect)
      this.rectsById.set(entry.id, entry.prevRect)
      if (changed) entry.node.dirty({ update: true, render: true })
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
  setChildren(children: GridChildSchema[]): void {
    this.removeManagedChildren()
    this.childEntries.length = 0
    this.childEntriesById.clear()
    this.rectsById.clear()

    for (const child of children) {
      const node = this.nova.schema.createChild(this, child)
      const id = child.id ?? node.componentId
      const entry = createGridChildEntry(id, node, child.layout)
      this.childEntries.push(entry)
      this.childEntriesById.set(id, entry)
    }

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

  getChildRect(id: string): Readonly<NovaUiLayoutRect> | undefined {
    return this.rectsById.get(id)
  }

  protected override onPropsChanged(changedKeys: (keyof GridResolvedProps)[]): void {
    this.props = normalizeGridProps(this.props)
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

  private applyResolvedRect(rect: NovaUiLayoutRect): boolean {
    if (rectEquals(this.ownRect, rect)) return false

    copyRect(this.ownRect, rect)
    super.options({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    })
    this.layoutDirty = true
    this.dirty({ update: true, matrix: true, render: true })
    return true
  }

  private removeManagedChildren(): void {
    for (const entry of this.childEntries) {
      entry.node.remove()
    }
  }

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

  private recomputeSubtreeStyleMask(): void {
    let mask = NovaUiStyleMask.None

    for (const entry of this.childEntries) {
      if (isNovaUiStyleTarget(entry.node)) {
        mask |= entry.node.getSubtreeStyleMask()
      }
    }

    this.subtreeStyleMask = mask
  }
}

function hasGridGeometryChanges(keys: (keyof GridResolvedProps)[]): boolean {
  return keys.includes('x') || keys.includes('y') || keys.includes('width') || keys.includes('height')
}

function hasGridLayoutChanges(keys: (keyof GridResolvedProps)[]): boolean {
  return (
    keys.includes('width')
    || keys.includes('height')
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
  )
}
