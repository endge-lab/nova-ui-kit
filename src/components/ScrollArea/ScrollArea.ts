import type { NovaApp, NovaNode, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  SCROLL_AREA_NODE_DESCRIPTOR,
  normalizeScrollAreaProps,
  type ScrollAreaDescriptor,
} from '@/components/ScrollArea/ScrollArea.config'
import type {
  ScrollAreaApi,
  ScrollAreaChildSchema,
  ScrollAreaProps,
  ScrollAreaResolvedProps,
  ScrollAreaState,
} from '@/components/ScrollArea/ScrollArea.types'
import { SCROLLBAR_SCHEMA_TYPE, type ScrollbarApi } from '@/components/Scrollbar/Scrollbar.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  clamp,
} from '@/shared/component'
import { applyNodeLayoutRect } from '@/shared/layout'

export class ScrollArea<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ScrollAreaResolvedProps, ScrollAreaApi, ScrollAreaProps, E> {
  private readonly contentChildren: NovaNode<E>[] = []
  private verticalScrollbar: NovaNode<E> | null = null
  private horizontalScrollbar: NovaNode<E> | null = null
  private readonly api: ScrollAreaApi

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ScrollAreaProps = {},
    options: { componentId?: string; children?: ScrollAreaChildSchema[] } = {},
    descriptor: ScrollAreaDescriptor = SCROLL_AREA_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeScrollAreaProps(props), options)
    this.api = {
      scrollTo: (x, y) => this.scrollTo(x, y),
      scrollBy: (dx, dy) => this.scrollTo(this.props.scrollX + dx, this.props.scrollY + dy),
      getScrollState: () => this.getScrollState(),
      setChildren: children => this.setChildren(children),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.setChildren(options.children ?? [])
    this.ensureScrollbars()
    this.setupEvents()
  }

  override setProps(patch: ScrollAreaProps): this {
    return super.setProps(patch as Partial<ScrollAreaResolvedProps>)
  }

  override getApi(): ScrollAreaApi {
    return this.api
  }

  setChildren(children: ScrollAreaChildSchema[]): void {
    for (const child of this.contentChildren) child.remove()
    this.contentChildren.length = 0
    for (const child of children) {
      this.contentChildren.push(this.nova.schema.createChild(this, child) as NovaNode<E>)
    }
    this.dirty({ update: true, render: true })
  }

  scrollTo(x: number, y: number): void {
    const next = normalizeScrollAreaProps({ ...this.props, scrollX: x, scrollY: y })
    if (next.scrollX === this.props.scrollX && next.scrollY === this.props.scrollY) return
    this.setProps({ scrollX: next.scrollX, scrollY: next.scrollY })
  }

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

  update(): void {
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

  render(): void {
    const schema = buildBoxSchema(this.props, this.width, this.height)
    if (schema.length > 0) this.renderer.schema(schema)
    this.renderer.clip(0, 0, this.width, this.height)
  }

  protected override onPropsChanged(changedKeys: (keyof ScrollAreaResolvedProps)[]): void {
    this.props = normalizeScrollAreaProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
    this.ensureScrollbars()
    this.dirty({ update: true, render: true })
  }

  private setupEvents(): void {
    this.on('wheel', event => {
      if (this.props.disabled) return false
      event.preventDefault()
      this.scrollTo(
        this.props.scrollX + event.deltaX,
        this.props.scrollY + event.deltaY,
      )
      return false
    })
  }

  private ensureScrollbars(): void {
    if (this.props.scrollbarVisibility === 'hidden') {
      this.verticalScrollbar?.remove()
      this.horizontalScrollbar?.remove()
      this.verticalScrollbar = null
      this.horizontalScrollbar = null
      return
    }

    if (!this.verticalScrollbar) {
      this.verticalScrollbar = this.nova.schema.createChild(this, {
        type: SCROLLBAR_SCHEMA_TYPE,
        id: `${this.componentId}-scrollbar-y`,
        props: {
          orientation: 'vertical',
          onChange: (value: number) => this.scrollTo(this.props.scrollX, value),
        },
      }) as NovaNode<E>
    }
    if (!this.horizontalScrollbar) {
      this.horizontalScrollbar = this.nova.schema.createChild(this, {
        type: SCROLLBAR_SCHEMA_TYPE,
        id: `${this.componentId}-scrollbar-x`,
        props: {
          orientation: 'horizontal',
          onChange: (value: number) => this.scrollTo(value, this.props.scrollY),
        },
      }) as NovaNode<E>
    }
    this.syncScrollbars()
  }

  private syncScrollbars(): void {
    const thickness = this.props.scrollbar.thickness ?? 8
    const showY = this.props.scrollbarVisibility === 'always' || this.props.contentHeight > this.height
    const showX = this.props.scrollbarVisibility === 'always' || this.props.contentWidth > this.width

    this.verticalScrollbar?.options({
      x: Math.max(0, this.width - thickness - 2),
      y: 2,
      width: thickness,
      height: Math.max(0, this.height - (showX ? thickness + 6 : 4)),
      visible: showY,
      active: showY,
    })
    this.horizontalScrollbar?.options({
      x: 2,
      y: Math.max(0, this.height - thickness - 2),
      width: Math.max(0, this.width - (showY ? thickness + 6 : 4)),
      height: thickness,
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
      trackColor: this.props.trackColor,
      thumbColor: this.props.thumbColor,
    })
    this.horizontalScrollbarApi()?.setProps({
      ...this.props.scrollbar,
      orientation: 'horizontal',
      value: clamp(this.props.scrollX, 0, Math.max(0, this.props.contentWidth - this.width)),
      viewportSize: this.width,
      contentSize: this.props.contentWidth,
      thickness,
      trackColor: this.props.trackColor,
      thumbColor: this.props.thumbColor,
    })
  }

  private verticalScrollbarApi(): ScrollbarApi | null {
    return this.verticalScrollbar && 'getApi' in this.verticalScrollbar
      ? (this.verticalScrollbar as unknown as { getApi: () => ScrollbarApi }).getApi()
      : null
  }

  private horizontalScrollbarApi(): ScrollbarApi | null {
    return this.horizontalScrollbar && 'getApi' in this.horizontalScrollbar
      ? (this.horizontalScrollbar as unknown as { getApi: () => ScrollbarApi }).getApi()
      : null
  }
}
