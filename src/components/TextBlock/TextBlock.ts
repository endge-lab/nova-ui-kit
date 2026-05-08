import {
  NovaComponentNode,
  type NovaApp,
  type NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  TEXT_BLOCK_NODE_DESCRIPTOR,
  type TextBlockDescriptor,
} from '@/components/TextBlock/TextBlock.config'
import {
  buildTextBlockSchema,
  toTextBlockMeasureSchema,
} from '@/components/TextBlock/TextBlock.schema'
import { layoutTextBlock, normalizeTextBlockProps } from '@/components/TextBlock/TextBlockLayout'
import {
  type TextBlockApi,
  type TextBlockLayout,
  type TextBlockMeasureFn,
  type TextBlockProps,
  type TextBlockResolvedProps,
} from '@/components/TextBlock/types'

export class TextBlock<E extends EventList = Record<string, any>>
  extends NovaComponentNode<TextBlockResolvedProps, TextBlockApi, Record<string, never>, TextBlockProps, E> {
  private _layout: TextBlockLayout
  private readonly _api: TextBlockApi

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: TextBlockProps = {},
    options: { componentId?: string } = {},
    descriptor: TextBlockDescriptor = TEXT_BLOCK_NODE_DESCRIPTOR,
  ) {
    const resolvedProps = normalizeTextBlockProps(props)
    super(app, surface, descriptor, resolvedProps, options)
    this.__type = 'TextBlock'
    this._layout = this.computeLayout()
    this.applyNodeOptions()
    this._api = {
      setText: text => this.setProps({ text }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.getProps(),
      measure: () => this.ensureLayout(),
      getLines: () => this.ensureLayout().lines,
      isOverflowed: () => this.ensureLayout().overflowed,
    }
  }

  override setProps(patch: TextBlockProps): this {
    return super.setProps(patch as Partial<TextBlockResolvedProps>)
  }

  override getApi(): TextBlockApi {
    return this._api
  }

  update(): void {
    this._layout = this.computeLayout()
  }

  render(): void {
    this.renderSchema(buildTextBlockSchema(this.props, this.measureText, 'node'))
  }

  protected override onPropsChanged(_changedKeys: (keyof TextBlockResolvedProps)[]): void {
    this.props = normalizeTextBlockProps(this.props)
    this.applyNodeOptions()
  }

  private applyNodeOptions(): void {
    this.options({
      x: this.props.x,
      y: this.props.y,
      width: this.props.width,
      height: this.props.height,
    })
  }

  private ensureLayout(): TextBlockLayout {
    if (!this._layout) this._layout = this.computeLayout()
    return this._layout
  }

  private computeLayout(): TextBlockLayout {
    return layoutTextBlock(this.props, this.measureText)
  }

  private readonly measureText: TextBlockMeasureFn = (text, options) => (
    this.renderer.measureText(toTextBlockMeasureSchema(text, options)).width
  )
}
