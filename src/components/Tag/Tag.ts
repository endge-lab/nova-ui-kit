import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  TAG_NODE_DESCRIPTOR,
  normalizeTagProps,
  type TagDescriptor,
} from '@/components/Tag/tag.config'
import type { TagApi, TagProps, TagResolvedProps, TagTone } from '@/components/Tag/tag.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  resolveComponentTextStyle,
 pushIcon, pushText, sizeTokenPadding } from '@/shared/component'

export class Tag<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<TagResolvedProps, TagApi, TagProps, E> {
  private readonly api: TagApi

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: TagProps = {},
    options: { componentId?: string } = {},
    descriptor: TagDescriptor = TAG_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeTagProps(props), options)
    this.api = {
      setText: text => this.setProps({ text }),
      setTone: tone => this.setProps({ tone }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
  }

  override setProps(patch: TagProps): this {
    return super.setProps(patch as Partial<TagResolvedProps>)
  }

  override getApi(): TagApi {
    return this.api
  }

  render(): void {
    const schema: NovaSchema = buildBoxSchema(this.props, this.width, this.height)
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext)
    const padding = sizeTokenPadding(this.props.size)
    const iconSize = padding.icon
    const textX = this.props.icon ? padding.horizontal + iconSize + padding.gap : padding.horizontal

    pushIcon(schema, this.props.icon, padding.horizontal, (this.height - iconSize) / 2, iconSize)
    pushText(schema, this.props.text, textX, 0, Math.max(0, this.width - textX - padding.horizontal), this.height, textStyle, { align: 'center' })
    this.renderer.schema(schema)
  }

  protected override onPropsChanged(changedKeys: Array<keyof TagResolvedProps>): void {
    this.props = normalizeTagProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
  }
}

export type { TagTone }
