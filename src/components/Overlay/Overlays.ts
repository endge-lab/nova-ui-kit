import type { NovaApp, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  OVERLAYS_NODE_DESCRIPTOR,
  normalizeOverlaysProps,
  type OverlaysDescriptor,
} from '@/components/Overlay/overlays.config'
import type {
  OverlayDefinition,
  OverlaysApi,
  OverlaysProps,
  OverlaysResolvedProps,
} from '@/components/Overlay/overlay.types'
import { findNovaUiRoot } from '@/components/Root/root-target'
import { NovaUiComponentNode } from '@/shared/component'

/** Регистрирует набор overlay templates в ближайшем Root без участия layout. */
export class Overlays<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<OverlaysResolvedProps, OverlaysApi, OverlaysProps, E> {
  private readonly sourceId: string
  private readonly api: OverlaysApi

  /** Создает registry-node для overlay templates. */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: OverlaysProps = {},
    options: { componentId?: string } = {},
    descriptor: OverlaysDescriptor = OVERLAYS_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeOverlaysProps(props), options)
    this.sourceId = options.componentId ?? this.id
    this.api = {
      setDefinitions: definitions => this.setDefinitions(definitions),
      getDefinitions: () => this.props.definitions,
    }
    this.visible = false
    this.options({ interactive: false })
  }

  /** Обновляет props registry-node. */
  override setProps(patch: OverlaysProps | Partial<OverlaysResolvedProps>): this {
    return super.setProps(patch as Partial<OverlaysResolvedProps>)
  }

  /** Возвращает публичный API registry-node. */
  override getApi(): OverlaysApi {
    return this.api
  }

  /** Registry-node не участвует в update-фазе. */
  update(): void {}

  /** Registry-node ничего не рисует. */
  render(): void {}

  /** Регистрирует definitions после mount. */
  protected override onMount(): void {
    super.onMount()
    this.syncRootDefinitions()
  }

  /** Снимает definitions при удалении registry-node. */
  protected override onUnmount(): void {
    findNovaUiRoot(this)?.getApi?.().unregisterOverlayDefinitions?.(this.sourceId)
  }

  /** Реагирует на замену definitions. */
  protected override onPropsChanged(changedKeys: Array<keyof OverlaysResolvedProps>): void {
    this.props = normalizeOverlaysProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    this.visible = false
    this.options({ interactive: false })
    if (changedKeys.includes('definitions')) this.syncRootDefinitions()
  }

  /** Заменяет definitions текущего source. */
  private setDefinitions(definitions: Array<OverlayDefinition>): void {
    this.setProps({ definitions })
  }

  /** Передает definitions ближайшему Root. */
  private syncRootDefinitions(): void {
    findNovaUiRoot(this)?.getApi?.().registerOverlayDefinitions?.(this.sourceId, this.props.definitions)
  }
}
