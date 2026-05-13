import { reconcileNovaTemplateChildren } from '@endge/nova'
import type { NovaApp, NovaNode, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  SURFACE_NODE_DESCRIPTOR,
  normalizeSurfaceProps,
  type SurfaceDescriptor,
} from '@/components/Surface/surface.config'
import type {
  SurfaceApi,
  SurfaceChildSchema,
  SurfaceProps,
  SurfaceResolvedProps,
} from '@/components/Surface/surface.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
} from '@/shared/component/component-props'
import {
  applyNodeLayoutRect,
  copyRect,
  createLayoutRect,
  resolveSpacing,
} from '@/shared/layout'
import {
  NovaUiStyleMask,
  isNovaUiStyleTarget,
  mergeStyleContext,
  mergeStyleReceiveResult,
  styleContextChangedMask,
  type NovaUiStyleContext,
  type NovaUiStyleReceiveResult,
} from '@/shared/style'

/** Базовый visual container UI Kit: фон, border, clip, padding и children. */
export class Surface<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<SurfaceResolvedProps, SurfaceApi, SurfaceProps, E> {
  private readonly managedChildren: Array<NovaNode<E>> = []
  private readonly childRect = createLayoutRect()
  private readonly api: SurfaceApi
  private layoutDirty = true

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: SurfaceProps = {},
    options: { componentId?: string; children?: Array<SurfaceChildSchema> } = {},
    descriptor: SurfaceDescriptor = SURFACE_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeSurfaceProps(props), options)
    this.api = {
      setProps: patch => this.setProps(patch),
      setChildren: children => this.setChildren(children),
      relayout: () => this.relayout(),
      getChildRect: () => this.childRect,
    }
    this.setChildren(options.children ?? [])
  }

  override setProps(patch: SurfaceProps): this {
    return super.setProps(patch as Partial<SurfaceResolvedProps>)
  }

  override getApi(): SurfaceApi {
    return this.api
  }

  setChildren(children: Array<SurfaceChildSchema>): void {
    const reconciled = reconcileNovaTemplateChildren(this, this.managedChildren, children)
    this.managedChildren.length = 0
    this.managedChildren.push(...reconciled.nodes)

    this.propagateStyleContext(NovaUiStyleMask.AllText)
    this.relayout()
  }

  relayout(): void {
    this.layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  override receiveStyleContext(context: NovaUiStyleContext, _changedMask: NovaUiStyleMask): NovaUiStyleReceiveResult {
    const previous = mergeStyleContext(this.inheritedStyleContext, this.props.style)
    this.inheritedStyleContext = context
    const next = mergeStyleContext(context, this.props.style)
    const changedMask = styleContextChangedMask(previous, next)
    const result = this.propagateStyleContext(changedMask || NovaUiStyleMask.AllText)
    this.dirty({ render: true })
    return mergeStyleReceiveResult(result, { update: false, render: true, layout: result.layout })
  }

  update(): void {
    if (!this.layoutDirty) return

    const padding = resolveSpacing(this.props.padding)
    copyRect(this.childRect, {
      x: padding.left,
      y: padding.top,
      width: Math.max(0, this.width - padding.left - padding.right),
      height: Math.max(0, this.height - padding.top - padding.bottom),
    })

    for (const child of this.managedChildren) {
      applyNodeLayoutRect(child as NovaNode<any>, this.childRect)
      child.dirty({ matrix: true, update: true, render: true })
    }

    this.layoutDirty = false
  }

  render(): void {
    const schema = buildBoxSchema(this.props, this.width, this.height)
    if (schema.length > 0) this.renderer.schema(schema)
    if (this.props.clip) this.renderer.clip(0, 0, this.width, this.height)
  }

  protected override onPropsChanged(changedKeys: Array<keyof SurfaceResolvedProps>): void {
    this.props = normalizeSurfaceProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    if (changedKeys.includes('padding')) this.relayout()
  }

  private propagateStyleContext(changedMask: NovaUiStyleMask): NovaUiStyleReceiveResult {
    const result: NovaUiStyleReceiveResult = { update: false, render: false, layout: false }
    if (changedMask === NovaUiStyleMask.None) return result

    const context = mergeStyleContext(this.inheritedStyleContext, this.props.style)
    for (const child of this.managedChildren) {
      if (!isNovaUiStyleTarget(child)) continue
      const childMask = child.getSubtreeStyleMask()
      if ((changedMask & childMask) === 0) continue
      mergeStyleReceiveResult(result, child.receiveStyleContext(context, changedMask & childMask))
    }
    return result
  }

}
