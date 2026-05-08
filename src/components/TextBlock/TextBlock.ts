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
import {
  NOVA_UI_LAYOUT_TARGET,
  TextMeasureCache,
  clampLayoutNumber,
  copyRect,
  createLayoutRect,
  rectEquals,
  type NovaUiLayoutConstraints,
  type NovaUiLayoutMeasure,
  type NovaUiLayoutRect,
  type NovaUiLayoutTarget,
} from '@/shared/layout'

/** Текстовый блок, который может работать standalone и внутри layout-родителя. */
export class TextBlock<E extends EventList = Record<string, any>>
  extends NovaComponentNode<TextBlockResolvedProps, TextBlockApi, Record<string, never>, TextBlockProps, E>
  implements NovaUiLayoutTarget {
  readonly [NOVA_UI_LAYOUT_TARGET] = true as const

  private readonly layoutRect = createLayoutRect()
  private readonly textMeasureCache = new TextMeasureCache()
  private _layout: TextBlockLayout | null = null
  private readonly _api: TextBlockApi
  private externalLayout = false

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
    this.applyInitialLayoutRect(resolvedProps)
    this._layout = this.computeLayout()
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

  /** Принимает итоговый rect от Flex и сбрасывает layout cache только при изменении. */
  applyLayoutRect(rect: NovaUiLayoutRect): boolean {
    this.externalLayout = true
    return this.applyResolvedRect(rect)
  }

  /** Измеряет preferred size для auto layout с учетом constraints. */
  measureLayout(constraints: NovaUiLayoutConstraints): NovaUiLayoutMeasure {
    const fallbackWidth = this.layoutRect.width || this.props.width
    const width = clampLayoutNumber(
      fallbackWidth,
      constraints.minWidth,
      constraints.maxWidth,
    )
    const heightLimit = Number.isFinite(constraints.maxHeight)
      ? constraints.maxHeight
      : Math.max(this.layoutRect.height, this.props.height)
    const props = this.resolveLayoutProps(width, heightLimit)
    const layout = layoutTextBlock(props, this.measureText)
    const measuredHeight = layout.contentHeight + props.padding.top + props.padding.bottom

    return {
      width,
      height: clampLayoutNumber(
        measuredHeight,
        constraints.minHeight,
        constraints.maxHeight,
      ),
    }
  }

  update(): void {
    this._layout = this.computeLayout()
  }

  render(): void {
    this.renderSchema(buildTextBlockSchema(this.resolveCurrentLayoutProps(), this.measureText, 'node'))
  }

  protected override onPropsChanged(changedKeys: (keyof TextBlockResolvedProps)[]): void {
    this.props = normalizeTextBlockProps(this.props)
    this._layout = null
    if (!this.externalLayout && hasGeometryChanges(changedKeys)) {
      this.applyResolvedRect({
        x: this.props.x,
        y: this.props.y,
        width: this.props.width,
        height: this.props.height,
      })
    }
  }

  private applyInitialLayoutRect(props: TextBlockResolvedProps): void {
    copyRect(this.layoutRect, {
      x: props.x,
      y: props.y,
      width: props.width,
      height: props.height,
    })
    super.options({
      x: this.layoutRect.x,
      y: this.layoutRect.y,
      width: this.layoutRect.width,
      height: this.layoutRect.height,
    })
  }

  private applyResolvedRect(rect: NovaUiLayoutRect): boolean {
    if (rectEquals(this.layoutRect, rect)) return false

    const sizeChanged = this.layoutRect.width !== rect.width || this.layoutRect.height !== rect.height
    copyRect(this.layoutRect, rect)
    super.options({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    })
    if (sizeChanged) this._layout = null
    this.dirty({ matrix: true, update: sizeChanged, render: true })
    return true
  }

  private ensureLayout(): TextBlockLayout {
    if (!this._layout) this._layout = this.computeLayout()
    return this._layout
  }

  private computeLayout(): TextBlockLayout {
    return layoutTextBlock(this.resolveCurrentLayoutProps(), this.measureText)
  }

  private resolveCurrentLayoutProps(): TextBlockResolvedProps {
    return this.resolveLayoutProps(this.layoutRect.width, this.layoutRect.height)
  }

  private resolveLayoutProps(width: number, height: number): TextBlockResolvedProps {
    return {
      ...this.props,
      x: 0,
      y: 0,
      width: Math.max(0, width),
      height: Math.max(0, height),
    }
  }

  private readonly measureText: TextBlockMeasureFn = (text, options) => (
    this.textMeasureCache.get(
      `${options.fontFamily}|${options.fontSize}|${options.fontWeight}|${options.fontStyle}|${text}`,
      () => this.renderer.measureText(toTextBlockMeasureSchema(text, options)).width,
    )
  )
}

function hasGeometryChanges(keys: (keyof TextBlockResolvedProps)[]): boolean {
  return keys.includes('x') || keys.includes('y') || keys.includes('width') || keys.includes('height')
}
