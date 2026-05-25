import type { NovaApp, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  TOOLTIPS_NODE_DESCRIPTOR,
  normalizeTooltipsProps,
  type TooltipsDescriptor,
} from '@/components/Tooltip/tooltips.config'
import type {
  TooltipDefinition,
  TooltipsApi,
  TooltipsProps,
  TooltipsResolvedProps,
} from '@/components/Tooltip/tooltip.types'
import { NovaUiComponentNode } from '@/shared/component'
import { findNovaUiRoot } from '@/components/Root/root-target'

/** Регистрирует набор tooltip templates в ближайшем Root без участия layout. */
export class Tooltips<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<TooltipsResolvedProps, TooltipsApi, TooltipsProps, E> {
  private readonly sourceId: string
  private readonly api: TooltipsApi

  /** Создает registry-node для tooltip templates. */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: TooltipsProps = {},
    options: { componentId?: string } = {},
    descriptor: TooltipsDescriptor = TOOLTIPS_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeTooltipsProps(props), options)
    this.sourceId = options.componentId ?? this.id
    this.api = {
      setDefinitions: definitions => this.setDefinitions(definitions),
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
    findNovaUiRoot(this)?.getApi?.().unregisterTooltipDefinitions?.(this.sourceId)
  }

  /** Реагирует на замену definitions. */
  protected override onPropsChanged(changedKeys: Array<keyof TooltipsResolvedProps>): void {
    this.props = normalizeTooltipsProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    this.visible = false
    this.options({ interactive: false })
    if (changedKeys.includes('definitions')) this.syncRootDefinitions()
  }

  /** Заменяет definitions текущего source. */
  private setDefinitions(definitions: Array<TooltipDefinition>): void {
    this.setProps({ definitions })
  }

  /** Передает definitions ближайшему Root. */
  private syncRootDefinitions(): void {
    findNovaUiRoot(this)?.getApi?.().registerTooltipDefinitions?.(this.sourceId, this.props.definitions)
  }
}
