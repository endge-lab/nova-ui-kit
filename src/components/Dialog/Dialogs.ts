import type { NovaApp, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type {
  DialogDefinition,
  DialogsApi,
  DialogsProps,
  DialogsResolvedProps,
} from '@/components/Dialog/dialog.types'
import type { DialogsDescriptor } from '@/components/Dialog/dialogs.config'
import {
  DIALOGS_NODE_DESCRIPTOR,

  normalizeDialogsProps,
} from '@/components/Dialog/dialogs.config'
import { findNovaUiRoot } from '@/components/Root/root-target'
import { NovaUiComponentNode } from '@/shared/component'

/** Регистрирует набор dialog templates в ближайшем Root без участия layout. */
export class Dialogs<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<DialogsResolvedProps, DialogsApi, DialogsProps, E> {
  private readonly _sourceId: string
  private readonly _api: DialogsApi

  /** Создает registry-node для dialog templates. */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: DialogsProps = {},
    options: { componentId?: string } = {},
    descriptor: DialogsDescriptor = DIALOGS_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeDialogsProps(props), options)
    this._sourceId = options.componentId ?? this.id
    this._api = {
      setDefinitions: definitions => this._setDefinitions(definitions),
      getDefinitions: () => this.props.definitions,
    }
    this.visible = false
    this.options({ interactive: false })
  }

  /** Обновляет props registry-node. */
  override setProps(patch: DialogsProps | Partial<DialogsResolvedProps>): this {
    return super.setProps(patch as Partial<DialogsResolvedProps>)
  }

  /** Возвращает публичный API registry-node. */
  override getApi(): DialogsApi {
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
    findNovaUiRoot(this)?.getApi?.().unregisterDialogDefinitions?.(this._sourceId)
  }

  /** Реагирует на замену definitions. */
  protected override onPropsChanged(changedKeys: Array<keyof DialogsResolvedProps>): void {
    this.props = normalizeDialogsProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    this.visible = false
    this.options({ interactive: false })
    if (changedKeys.includes('definitions')) {
      this._syncRootDefinitions()
    }
  }

  /** Заменяет definitions текущего source. */
  private _setDefinitions(definitions: Array<DialogDefinition>): void {
    this.setProps({ definitions })
  }

  /** Передает definitions ближайшему Root. */
  private _syncRootDefinitions(): void {
    findNovaUiRoot(this)?.getApi?.().registerDialogDefinitions?.(this._sourceId, this.props.definitions)
  }
}
