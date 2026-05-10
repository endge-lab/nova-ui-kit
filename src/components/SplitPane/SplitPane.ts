import { reconcileNovaTemplateChildren, type NovaApp, type NovaNode, type NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import { ColResizer } from '@/components/ColResizer/ColResizer'
import { RowResizer } from '@/components/RowResizer/RowResizer'
import {
  SPLIT_PANE_NODE_DESCRIPTOR,
  normalizeSplitPaneProps,
  type SplitPaneDescriptor,
} from '@/components/SplitPane/SplitPane.config'
import type {
  SplitPaneApi,
  SplitPaneChildSchema,
  SplitPaneProps,
  SplitPaneResolvedProps,
} from '@/components/SplitPane/SplitPane.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  clamp,
} from '@/shared/component'

export class SplitPane<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<SplitPaneResolvedProps, SplitPaneApi, SplitPaneProps, E> {
  private readonly panes: NovaNode<E>[] = []
  private resizerNode: RowResizer<E> | ColResizer<E> | null = null
  private readonly api: SplitPaneApi

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: SplitPaneProps = {},
    options: { componentId?: string; children?: SplitPaneChildSchema[] } = {},
    descriptor: SplitPaneDescriptor = SPLIT_PANE_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeSplitPaneProps(props), options)
    this.api = {
      setSizes: sizes => this.setProps({ sizes }),
      collapse: pane => this.setProps({ collapsedPane: pane }),
      expand: () => this.setProps({ collapsedPane: null }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.setChildren(options.children ?? [])
    this.ensureResizer()
  }

  override setProps(patch: SplitPaneProps): this {
    return super.setProps(patch as Partial<SplitPaneResolvedProps>)
  }

  override getApi(): SplitPaneApi {
    return this.api
  }

  setChildren(children: SplitPaneChildSchema[]): void {
    const nextSchemas = children.slice(0, 2)
    const reconciled = reconcileNovaTemplateChildren(this, this.panes, nextSchemas)
    this.panes.length = 0
    this.panes.push(...reconciled.nodes)
    this.dirty({ update: true, render: true })
  }

  update(): void {
    this.ensureResizer()
    const { first, second, resizer } = this.resolveRects()
    this.panes[0]?.options(first)
    this.panes[1]?.options(second)
    this.panes[0]?.dirty({ matrix: true, update: true, render: true })
    this.panes[1]?.dirty({ matrix: true, update: true, render: true })
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

  render(): void {
    const schema = buildBoxSchema(this.props, this.width, this.height)
    if (schema.length > 0) this.renderer.schema(schema)
    if (this.props.clip) this.renderer.clip(0, 0, this.width, this.height)
  }

  protected override onPropsChanged(changedKeys: (keyof SplitPaneResolvedProps)[]): void {
    const previousDirection = this.props.direction
    this.props = normalizeSplitPaneProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    if (previousDirection !== this.props.direction) {
      this.resizerNode?.remove()
      this.resizerNode = null
    }
    this.dirty({ update: true, render: true })
  }

  private ensureResizer(): void {
    if (this.resizerNode) return
    this.resizerNode = this.props.direction === 'horizontal'
      ? new ColResizer<E>(this.nova, this.surface, this.props.resizer.color, this.props.resizer.lineWidth)
      : new RowResizer<E>(this.nova, this.surface, this.props.resizer.color, this.props.resizer.lineWidth)
    this.addChild(this.resizerNode)
    this.resizerNode.onChangeMove((_event, delta) => this.resizeBy(delta))
  }

  private resizeBy(delta: number): void {
    const total = this.props.direction === 'horizontal' ? this.width : this.height
    const [first] = this.resolvePixelSizes(total)
    const nextFirst = first + delta
    const nextSecond = total - nextFirst
    this.setProps({ sizes: [nextFirst, nextSecond] })
  }

  private resolveRects(): {
    first: { x: number; y: number; width: number; height: number }
    second: { x: number; y: number; width: number; height: number }
    resizer: { x: number; y: number; width: number; height: number }
  } {
    const horizontal = this.props.direction === 'horizontal'
    const total = horizontal ? this.width : this.height
    const [firstSize] = this.resolvePixelSizes(total)
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

  private resolvePixelSizes(total: number): [number, number] {
    if (this.props.collapsedPane === 'first') return [0, total]
    if (this.props.collapsedPane === 'second') return [total, 0]

    const [rawFirst, rawSecond] = this.props.sizes
    const ratioMode = rawFirst <= 1 && rawSecond <= 1
    const first = ratioMode ? total * rawFirst : rawFirst
    const minFirst = this.props.minSizes[0]
    const minSecond = this.props.minSizes[1]
    const maxFirst = Math.min(this.props.maxSizes[0], total - minSecond)
    const clampedFirst = clamp(first, minFirst, maxFirst)
    return [clampedFirst, Math.max(0, total - clampedFirst)]
  }
}
