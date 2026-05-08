import {
  NovaComponentNode,
  type NovaApp,
  type NovaNode,
  type NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  FLEX_NODE_DESCRIPTOR,
  normalizeFlexProps,
  type FlexDescriptor,
} from '@/components/Flex/Flex.config'
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
} from '@/components/Flex/types'
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

/** Layout-компонент, который резолвит adaptive values и назначает rect детям. */
export class Flex<E extends EventList = Record<string, any>>
  extends NovaComponentNode<FlexResolvedProps, FlexApi, Record<string, never>, FlexProps, E>
  implements NovaUiLayoutTarget, NovaUiStyleTarget {
  readonly [NOVA_UI_LAYOUT_TARGET] = true as const
  readonly [NOVA_UI_STYLE_TARGET] = true as const

  private readonly engine = new FlexLayoutEngine()
  private readonly ownRect = createLayoutRect()
  private readonly childEntries: FlexChildEntry[] = []
  private readonly childEntriesById = new Map<string, FlexChildEntry>()
  private readonly rectsById = new Map<string, NovaUiLayoutRect>()
  private readonly api: FlexApi
  private layoutDirty = true
  private externalLayout = false
  private inheritedStyleContext = EMPTY_STYLE_CONTEXT
  private effectiveStyleContext = EMPTY_STYLE_CONTEXT
  private subtreeStyleMask = NovaUiStyleMask.None

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: FlexProps = {},
    options: { componentId?: string; children?: FlexChildSchema[] } = {},
    descriptor: FlexDescriptor = FLEX_NODE_DESCRIPTOR,
  ) {
    const resolvedProps = normalizeFlexProps(props)
    super(app, surface, descriptor, resolvedProps, options)
    this.__type = 'Flex'
    this.api = {
      setChildren: children => this.setChildren(children),
      setChildLayout: (id, layout) => this.setChildLayout(id, layout),
      relayout: () => this.relayout(),
      getChildRect: id => this.getChildRect(id),
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

  override setProps(patch: FlexProps): this {
    return super.setProps(patch as Partial<FlexResolvedProps>)
  }

  override getApi(): FlexApi {
    return this.api
  }

  expandCollapse(expandedHeight: number, collapsedHeight = 0): void {
    const nextHeight = this.props.height === expandedHeight ? collapsedHeight : expandedHeight
    this.transitionTo(
      { height: nextHeight },
      resolveNovaUiMotionOptions('expandCollapse'),
    )
  }

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

  /** Пересчитывает layout только если изменились размеры, props или children. */
  update(): void {
    if (!this.layoutDirty) return

    this.engine.compute({
      props: this.props,
      width: this.width,
      height: this.height,
      entries: this.childEntries,
    })

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
  setChildren(children: FlexChildSchema[]): void {
    this.removeManagedChildren()
    this.childEntries.length = 0
    this.childEntriesById.clear()
    this.rectsById.clear()

    for (const child of children) {
      const node = this.nova.schema.createChild(this, child)
      const id = child.id ?? node.componentId
      const entry = createFlexChildEntry(id, node, child.layout)
      this.childEntries.push(entry)
      this.childEntriesById.set(id, entry)
    }

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

  getChildRect(id: string): Readonly<NovaUiLayoutRect> | undefined {
    return this.rectsById.get(id)
  }

  protected override onPropsChanged(_changedKeys: (keyof FlexResolvedProps)[]): void {
    this.props = normalizeFlexProps(this.props)
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

function hasFlexGeometryChanges(keys: (keyof FlexResolvedProps)[]): boolean {
  return keys.includes('x') || keys.includes('y') || keys.includes('width') || keys.includes('height')
}

function hasFlexLayoutChanges(keys: (keyof FlexResolvedProps)[]): boolean {
  return (
    keys.includes('width')
    || keys.includes('height')
    || keys.includes('direction')
    || keys.includes('wrap')
    || keys.includes('gap')
    || keys.includes('rowGap')
    || keys.includes('columnGap')
    || keys.includes('padding')
    || keys.includes('justifyContent')
    || keys.includes('alignItems')
  )
}
