import type { NovaApp, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type {
  TooltipDefinition,
  TooltipsApi,
  TooltipsProps,
  TooltipsResolvedProps,
} from '@/components/Tooltip/tooltip.types'
import type { TooltipsDescriptor } from '@/components/Tooltip/tooltips.config'
import { findNovaUiRoot } from '@/components/Root/root-target'
import {
  normalizeTooltipsProps,
  TOOLTIPS_NODE_DESCRIPTOR,

} from '@/components/Tooltip/tooltips.config'
import { NovaUiComponentNode } from '@/shared/component'

/** Регистрирует набор tooltip templates в ближайшем Root без участия layout. */
export class Tooltips<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<TooltipsResolvedProps, TooltipsApi, TooltipsProps, E> {
  private readonly _sourceId: string
  private readonly _api: TooltipsApi

  /** Создает registry-node для tooltip templates. */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: TooltipsProps = {},
    options: { componentId?: string } = {},
    descriptor: TooltipsDescriptor = TOOLTIPS_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeTooltipsProps(props), options)
    this._sourceId = options.componentId ?? this.id
    this._api = {
      setDefinitions: definitions => this._setDefinitions(definitions),
      getDefinitions: () => this.props.definitions,
    }
    this.visible = false
    this.options({ interactive: false })
  }

  /** Обновляет props registry-node. */
  override setProps(patch: TooltipsProps | Partial<TooltipsResolvedProps>): this {
    return super.setProps(patch as Partial<TooltipsResolvedProps>)
  }

  /** Возвращает публичный API registry-node. */
  override getApi(): TooltipsApi {
    return this._api
  }

  /** Registry-node не участвует в update-фазе. */
  update(): void {}

  /** Registry-node ничего не рисует. */
  render(): void {}

  /** Регистрирует definitions после mount. */
  protected override onMount(): void {
    super.onMount()
    this._syncRootDefinitions()
  }

  /** Снимает definitions при удалении registry-node. */
  protected override onUnmount(): void {
    findNovaUiRoot(this)?.getApi?.().unregisterTooltipDefinitions?.(this._sourceId)
  }

  /** Реагирует на замену definitions. */
  protected override onPropsChanged(changedKeys: Array<keyof TooltipsResolvedProps>): void {
    this.props = normalizeTooltipsProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    this.visible = false
    this.options({ interactive: false })
    if (changedKeys.includes('definitions')) {
      this._syncRootDefinitions()
    }
  }

  /** Заменяет definitions текущего source. */
  private _setDefinitions(definitions: Array<TooltipDefinition>): void {
    this.setProps({ definitions })
  }

  /** Передает definitions ближайшему Root. */
  private _syncRootDefinitions(): void {
    findNovaUiRoot(this)?.getApi?.().registerTooltipDefinitions?.(this._sourceId, this.props.definitions)
  }
}
