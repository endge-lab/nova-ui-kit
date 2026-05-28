import { reconcileNovaTemplateChildren } from '@endge/nova'
import type { NovaApp, NovaMotionPlayback, NovaNode, NovaSurface } from '@endge/nova'
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
  applyNovaUiLayoutZIndex,
  copyRect,
  createLayoutRect,
  resolveNovaUiPositionedLayout,
  resolveNovaUiPositionedRect,
  resolveSpacing,
  type NovaUiLayoutRect,
  type NovaUiPositionedLayout,
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
import { resolveNovaUiMotionDeclarations } from '@/shared/motion'

/** Базовый visual container UI Kit: фон, border, clip, padding и children. */
export class Surface<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<SurfaceResolvedProps, SurfaceApi, SurfaceProps, E> {
  private readonly managedChildren: Array<NovaNode<E>> = []
  private readonly managedChildLayouts: Array<NovaUiPositionedLayout | undefined> = []
  private readonly childRect = createLayoutRect()
  private readonly api: SurfaceApi
  private readonly motionPlaybacks: Array<NovaMotionPlayback> = []
  private layoutDirty = true

  /**
   * Создает экземпляр Surface и подготавливает базовое состояние.
   */
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

  /**
   * Обновляет значение состояния Surface.
   */
  override setProps(patch: SurfaceProps): this {
    return super.setProps(patch as Partial<SurfaceResolvedProps>)
  }

  /**
   * Возвращает значение состояния Surface.
   */
  override getApi(): SurfaceApi {
    return this.api
  }

  /**
   * Применяет подготовленное состояние Surface.
   */
  override applyLayoutRect(rect: NovaUiLayoutRect): boolean {
    const changed = super.applyLayoutRect(rect)
    if (changed || hasActiveMotionTransform(this.props)) this.applyMotionTransform()
    return changed
  }

  /**
   * Обновляет значение состояния Surface.
   */
  setChildren(children: Array<SurfaceChildSchema>): void {
    const reconciled = reconcileNovaTemplateChildren(this, this.managedChildren, children)
    this.managedChildren.length = 0
    this.managedChildren.push(...reconciled.nodes)
    this.managedChildLayouts.length = 0
    this.managedChildLayouts.push(...children.map(child => child.layout))

    this.propagateStyleContext(NovaUiStyleMask.AllText)
    this.relayout()
  }

  /**
   * Выполняет действие relayout в рамках ответственности Surface.
   */
  relayout(): void {
    this.layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  /**
   * Выполняет действие receiveStyleContext в рамках ответственности Surface.
   */
  override receiveStyleContext(context: NovaUiStyleContext, _changedMask: NovaUiStyleMask): NovaUiStyleReceiveResult {
    const previous = mergeStyleContext(this.inheritedStyleContext, this.props.style)
    this.inheritedStyleContext = context
    const next = mergeStyleContext(context, this.props.style)
    const changedMask = styleContextChangedMask(previous, next)
    const result = this.propagateStyleContext(changedMask || NovaUiStyleMask.AllText)
    this.dirty({ render: true })
    return mergeStyleReceiveResult(result, { update: false, render: true, layout: result.layout })
  }

  /**
   * Обновляет runtime-состояние Surface.
   */
  update(): void {
    if (!this.layoutDirty) return

    const padding = resolveSpacing(this.props.padding)
    copyRect(this.childRect, {
      x: padding.left,
      y: padding.top,
      width: Math.max(0, this.width - padding.left - padding.right),
      height: Math.max(0, this.height - padding.top - padding.bottom),
    })

    this.managedChildren.forEach((child, index) => {
      const layout = resolveNovaUiPositionedLayout(child, this.managedChildLayouts[index])
      const rect = resolveNovaUiPositionedRect(
        this.childRect,
        this.childRect,
        layout,
        child,
      )
      applyNodeLayoutRect(child as NovaNode<any>, rect)
      applyNovaUiLayoutZIndex(child as NovaNode<any>, layout.zIndex)
      child.dirty({ matrix: true, update: true, render: true })
    })

    this.layoutDirty = false
  }

  /**
   * Выполняет отрисовку Surface.
   */
  render(): void {
    const schema = buildBoxSchema(this.props, this.width, this.height, { resolveThemeValue: value => this.resolveThemeValue(value) })
    if (schema.length > 0) this.renderer.schema(schema)
    if (this.props.clip) this.renderer.clip(0, 0, this.width, this.height)
  }

  /**
   * Обрабатывает входящее событие Surface.
   */
  protected override onMount(): void {
    super.onMount()
    this.syncMotion()
  }

  /**
   * Обрабатывает входящее событие Surface.
   */
  protected override onUnmount(): void {
    this.stopMotion()
  }

  /**
   * Обрабатывает входящее событие Surface.
   */
  protected override onPropsChanged(changedKeys: Array<keyof SurfaceResolvedProps>): void {
    this.props = normalizeSurfaceProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    if (hasMotionTransformChanges(changedKeys)) this.applyMotionTransform()
    if (changedKeys.includes('padding')) this.relayout()
    if (changedKeys.includes('motion')) this.syncMotion()
  }

  /**
   * Выполняет внутренний шаг propagateStyleContext для Surface.
   */
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

  /**
   * Синхронизирует состояние между слоями Surface.
   */
  private syncMotion(): void {
    this.stopMotion(true)
    const motions = resolveNovaUiMotionDeclarations(this.props.motion)

    for (const motion of motions) {
      if (motion.preset === 'shimmer') {
        this.motionPlaybacks.push(this.transitionTo(
          {
            background: motion.config.background ?? this.props.accentColor ?? '#22d3ee',
            opacity: motion.config.opacity ?? 0.66,
          },
          {
            ...motion.options,
            duration: motion.config.duration ?? 760,
            yoyo: motion.options.yoyo ?? true,
          },
        ))
        continue
      }

      if (motion.preset === 'bounce') {
        const height = finiteMotionNumber(motion.config.height, 32)
        this.motionPlaybacks.push(this.transitionTo(
          { motionOffsetY: -height },
          {
            ...motion.options,
            yoyo: motion.options.yoyo ?? true,
          },
        ))
        continue
      }

      if (motion.preset === 'spin') {
        this.motionPlaybacks.push(this.transitionTo(
          { motionRotation: finiteMotionNumber(motion.config.angle, Math.PI * 2) },
          {
            ...motion.options,
            overwrite: motion.options.overwrite ?? false,
          },
        ))
      }
    }
  }

  /**
   * Останавливает runtime-процесс Surface.
   */
  private stopMotion(resetOffset = false): void {
    for (const playback of this.motionPlaybacks) playback.cancel()
    this.motionPlaybacks.length = 0
    if (resetOffset && (this.props.motionOffsetY !== 0 || this.props.motionRotation !== 0)) {
      this.props.motionOffsetY = 0
      this.props.motionRotation = 0
      this.applyMotionTransform()
      this.dirty({ matrix: true, render: true })
    }
  }

  /**
   * Применяет подготовленное состояние Surface.
   */
  private applyMotionTransform(): void {
    const rotation = this.props.motionRotation
    const offsetY = this.props.motionOffsetY
    const centerX = this.layoutRect.width / 2
    const centerY = this.layoutRect.height / 2
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    super.options({
      x: this.layoutRect.x + centerX - (cos * centerX - sin * centerY),
      y: this.layoutRect.y + offsetY + centerY - (sin * centerX + cos * centerY),
      rotation,
    })
  }
}

function finiteMotionNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function hasMotionTransformChanges(changedKeys: Array<keyof SurfaceResolvedProps>): boolean {
  return changedKeys.includes('x')
    || changedKeys.includes('y')
    || changedKeys.includes('width')
    || changedKeys.includes('height')
    || changedKeys.includes('motionOffsetY')
    || changedKeys.includes('motionRotation')
}

function hasActiveMotionTransform(props: SurfaceResolvedProps): boolean {
  return props.motionOffsetY !== 0 || props.motionRotation !== 0
}
