import type { NovaApp, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  DIALOGS_NODE_DESCRIPTOR,
  normalizeDialogsProps,
  type DialogsDescriptor,
} from '@/components/Dialog/dialogs.config'
import type {
  DialogDefinition,
  DialogsApi,
  DialogsProps,
  DialogsResolvedProps,
} from '@/components/Dialog/dialog.types'
import { findNovaUiRoot } from '@/components/Root/root-target'
import { NovaUiComponentNode } from '@/shared/component'

/** Регистрирует набор dialog templates в ближайшем Root без участия layout. */
export class Dialogs<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<DialogsResolvedProps, DialogsApi, DialogsProps, E> {
  private readonly sourceId: string
  private readonly api: DialogsApi

  /** Создает registry-node для dialog templates. */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: DialogsProps = {},
    options: { componentId?: string } = {},
    descriptor: DialogsDescriptor = DIALOGS_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeDialogsProps(props), options)
    this.sourceId = options.componentId ?? this.id
    this.api = {
      setDefinitions: definitions => this.setDefinitions(definitions),
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
    findNovaUiRoot(this)?.getApi?.().unregisterDialogDefinitions?.(this.sourceId)
  }

  /** Реагирует на замену definitions. */
  protected override onPropsChanged(changedKeys: Array<keyof DialogsResolvedProps>): void {
    this.props = normalizeDialogsProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    this.visible = false
    this.options({ interactive: false })
    if (changedKeys.includes('definitions')) this.syncRootDefinitions()
  }

  /** Заменяет definitions текущего source. */
  private setDefinitions(definitions: Array<DialogDefinition>): void {
    this.setProps({ definitions })
  }

  /** Передает definitions ближайшему Root. */
  private syncRootDefinitions(): void {
    findNovaUiRoot(this)?.getApi?.().registerDialogDefinitions?.(this.sourceId, this.props.definitions)
  }
}
