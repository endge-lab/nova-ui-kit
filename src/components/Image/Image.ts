import type { EventList } from '@endge/utils'
import type { NovaApp, NovaAssetDrawableInput, NovaSchema, NovaSurface } from '@endge/nova'
import {
  IMAGE_NODE_DESCRIPTOR,
  normalizeImageProps,
  type ImageDescriptor,
} from '@/components/Image/image.config'
import type {
  ImageApi,
  ImageFit,
  ImageProps,
  ImageResolvedProps,
} from '@/components/Image/image.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
} from '@/shared/component'
import { borderRadiusToRendererValue } from '@/shared/style'

/**
 * Отображает raster/vector drawable asset с поддержкой cover/contain/fill и скругления.
 */
export class Image<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ImageResolvedProps, ImageApi, ImageProps, E> {
  private readonly api: ImageApi
  private roundedCacheKey = ''
  private roundedCache?: HTMLCanvasElement

  /**
   * Создает экземпляр Image и подготавливает публичный API.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ImageProps = {},
    options: { componentId?: string } = {},
    descriptor: ImageDescriptor = IMAGE_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeImageProps(props), options)
    this.api = {
      setSrc: src => this.setProps({ src }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
  }

  /**
   * Обновляет props Image.
   */
  override setProps(patch: ImageProps): this {
    return super.setProps(patch as Partial<ImageResolvedProps>)
  }

  /**
   * Возвращает публичный API Image.
   */
  override getApi(): ImageApi {
    return this.api
  }

  /**
   * Рисует изображение и декоративную рамку.
   */
  render(): void {
    const schema: NovaSchema = []
    const border = this.props.border
    const backgroundSchema = buildBoxSchema(
      {
        ...this.props,
        border: undefined,
      },
      this.width,
      this.height,
      { radiusFallback: this.props.radius },
    )
    schema.push(...backgroundSchema)

    const source = this.resolveSource()
    const drawable = source ? this.resolveDrawable(source) : undefined
    if (drawable) {
      schema.push({
        type: 'icon',
        icon: drawable,
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        styles: {
          opacity: this.props.opacity,
        },
      })
    }

    if (border?.width) {
      schema.push({
        type: 'border',
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        styles: {
          color: border.color,
          width: border.width,
          radius: borderRadiusToRendererValue(border.radius ?? this.props.radius),
        },
      })
    }

    this.renderer.schema(schema)
  }

  /**
   * Нормализует props после внешних изменений.
   */
  protected override onPropsChanged(changedKeys: Array<keyof ImageResolvedProps>): void {
    this.props = normalizeImageProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    if (changedKeys.some(key => key === 'src' || key === 'source' || key === 'fit' || key === 'radius' || key === 'width' || key === 'height')) {
      this.roundedCacheKey = ''
      this.roundedCache = undefined
    }
  }

  /**
   * Возвращает активный source prop.
   */
  private resolveSource(): NovaAssetDrawableInput {
    return this.props.src ?? this.props.source
  }

  /**
   * Возвращает drawable, при необходимости rasterized в скругленный canvas.
   */
  private resolveDrawable(source: NovaAssetDrawableInput): CanvasImageSource | undefined {
    const drawable = this.nova.assets.resolveDrawable(source)
    if (!drawable) return undefined

    if (this.props.radius <= 0 && this.props.fit === 'fill') return drawable
    return this.resolveRoundedDrawable(drawable, this.props.fit, this.props.radius)
  }

  /**
   * Создает cached canvas с учетом object-fit и radius.
   */
  private resolveRoundedDrawable(source: CanvasImageSource, fit: ImageFit, radius: number): HTMLCanvasElement {
    const width = Math.max(1, Math.round(this.width))
    const height = Math.max(1, Math.round(this.height))
    const key = `${this.nova.assets.resolveDrawableKey('image', this.resolveSource(), () => 'inline')}:${width}:${height}:${fit}:${radius}`

    if (this.roundedCache && this.roundedCacheKey === key) return this.roundedCache

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height

    if (ctx) {
      const rect = resolveDrawRect(source, width, height, fit)
      if (radius > 0) {
        roundedRect(ctx, 0, 0, width, height, radius)
        ctx.clip()
      }
      ctx.drawImage(source, rect.sourceX, rect.sourceY, rect.sourceWidth, rect.sourceHeight, rect.x, rect.y, rect.width, rect.height)
    }

    this.roundedCacheKey = key
    this.roundedCache = canvas
    return canvas
  }
}

interface ImageDrawRect {
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  x: number
  y: number
  width: number
  height: number
}

function resolveDrawRect(source: CanvasImageSource, width: number, height: number, fit: ImageFit): ImageDrawRect {
  const sourceWidth = Math.max(1, readSourceSize(source, 'width'))
  const sourceHeight = Math.max(1, readSourceSize(source, 'height'))

  if (fit === 'contain') {
    const scale = Math.min(width / sourceWidth, height / sourceHeight)
    const drawWidth = sourceWidth * scale
    const drawHeight = sourceHeight * scale
    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth,
      sourceHeight,
      x: (width - drawWidth) / 2,
      y: (height - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    }
  }

  if (fit === 'cover') {
    const scale = Math.max(width / sourceWidth, height / sourceHeight)
    const cropWidth = width / scale
    const cropHeight = height / scale
    return {
      sourceX: (sourceWidth - cropWidth) / 2,
      sourceY: (sourceHeight - cropHeight) / 2,
      sourceWidth: cropWidth,
      sourceHeight: cropHeight,
      x: 0,
      y: 0,
      width,
      height,
    }
  }

  return {
    sourceX: 0,
    sourceY: 0,
    sourceWidth,
    sourceHeight,
    x: 0,
    y: 0,
    width,
    height,
  }
}

function readSourceSize(source: CanvasImageSource, dimension: 'width' | 'height'): number {
  const image = source as Partial<HTMLImageElement & HTMLVideoElement & HTMLCanvasElement & ImageBitmap>
  const natural = dimension === 'width' ? image.naturalWidth : image.naturalHeight
  const video = dimension === 'width' ? image.videoWidth : image.videoHeight
  const direct = image[dimension]
  return Number(natural || video || direct || 1)
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
