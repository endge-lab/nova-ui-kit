import {
  NovaNode,
  reconcileNovaTemplateChildren,
  type NovaApp,
  type NovaElementSchema,
  type NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import { DIALOG_SCHEMA_TYPE } from '@/components/Dialog/dialog.types'
import { normalizeDialogProps } from '@/components/Dialog/dialog.config'
import {
  NOVA_UI_ROOT_TARGET,
  type NovaUiRootTarget,
} from '@/components/Root/root-target'
import type {
  DialogDefinition,
  DialogInput,
  DialogOpenOptions,
  DialogProps,
  DialogResolvedProps,
  DialogSlotContext,
} from '@/components/Dialog/dialog.types'
import { SURFACE_SCHEMA_TYPE } from '@/components/Surface/surface.types'
import { TEXT_BLOCK_SCHEMA_TYPE } from '@/components/TextBlock/text-block.types'

interface RegisteredDialogSource {
  sourceId: string
  definitions: Array<DialogDefinition>
}

interface ActiveDialog {
  id: string
  type: string
  payload: DialogOpenOptions
  slot?: DialogDefinition['slot']
}

const DEFAULT_DIALOG_PROPS: DialogProps = {
  width: 420,
  height: 260,
  modal: true,
  backdrop: true,
  placement: 'center',
  closeButton: true,
  draggable: false,
  resizable: false,
  background: '#ffffff',
  color: '#172033',
  border: {
    color: '#cbd5e1',
    width: 1,
    radius: 12,
  },
  padding: {
    horizontal: 18,
    vertical: 16,
  },
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: 13,
  lineHeight: 18,
}

/** Единственный overlay-controller диалогов внутри одного UI Kit Root. */
export class RootDialogControllerNode<E extends EventList = Record<string, any>> extends NovaNode<E> {
  readonly [NOVA_UI_ROOT_TARGET] = true as const

  private readonly sources = new Map<string, RegisteredDialogSource>()
  private readonly definitions = new Map<string, DialogDefinition>()
  private readonly managedChildren: Array<NovaNode<E>> = []
  private readonly activeDialogs: Array<ActiveDialog> = []
  private nextDialogId = 1
  private dirtyScheduled = false

  /** Создает controller-node и размещает его поверх Root. */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    private readonly ownerRoot?: NovaNode<E> & NovaUiRootTarget,
  ) {
    super(app, surface)
    this.options({
      x: 0,
      y: 0,
      width: app.width,
      height: app.height,
      zIndex: 30_000,
      interactive: false,
    })
  }

  /** Проксирует Root API для UI Kit компонентов внутри dialog portal. */
  getApi(): ReturnType<NovaUiRootTarget['getApi']> {
    if (!this.ownerRoot) throw new Error('[Nova UI Kit] Dialog portal is not attached to Root')
    return this.ownerRoot.getApi()
  }

  /** Проксирует style cascade refresh для UI Kit компонентов внутри dialog portal. */
  refreshStyleCascade(): void {
    this.ownerRoot?.refreshStyleCascade()
  }

  /** Синхронизирует размер controller с Root. */
  syncRootRect(width: number, height: number): void {
    this.options({ width, height })
  }

  /** Регистрирует definitions из одного Dialogs source. */
  registerDefinitions(sourceId: string, definitions: Array<DialogDefinition>): void {
    this.sources.set(sourceId, { sourceId, definitions })
    this.rebuildDefinitions()
    this.rebuildActiveDialogs()
  }

  /** Удаляет definitions одного Dialogs source. */
  unregisterDefinitions(sourceId: string): void {
    this.sources.delete(sourceId)
    this.rebuildDefinitions()
    this.rebuildActiveDialogs()
  }

  /** Открывает диалог по type или object payload. */
  openDialog(input: DialogInput, payload: Record<string, unknown> = {}): string {
    const normalized = normalizeDialogInput(input, payload)
    const id = normalized.id ?? `dialog-${this.nextDialogId++}`
    const type = normalized.type ?? 'default'
    const existingIndex = this.activeDialogs.findIndex(dialog => dialog.id === id)
    const active = this.createActiveDialog(id, type, normalized)

    if (existingIndex >= 0) this.activeDialogs.splice(existingIndex, 1, active)
    else this.activeDialogs.push(active)

    this.scheduleDirty()
    return id
  }

  /** Закрывает один диалог или верхний диалог, если id не указан. */
  closeDialog(id?: string, event?: Event): void {
    const index = id
      ? this.activeDialogs.findIndex(dialog => dialog.id === id)
      : this.activeDialogs.length - 1
    if (index < 0) return

    const [dialog] = this.activeDialogs.splice(index, 1)
    this.notifyDialogOpenChange(dialog, false, event)
    this.scheduleDirty()
  }

  /** Закрывает все открытые диалоги. */
  closeDialogs(event?: Event): void {
    if (this.activeDialogs.length === 0) return
    const dialogs = this.activeDialogs.splice(0)
    for (const dialog of dialogs) this.notifyDialogOpenChange(dialog, false, event)
    this.scheduleDirty()
  }

  /** Обновляет props/payload открытого диалога. */
  updateDialog(id: string, patch: DialogProps & Record<string, unknown>): void {
    const index = this.activeDialogs.findIndex(dialog => dialog.id === id)
    if (index < 0) return

    const current = this.activeDialogs[index]
    const nextPayload = { ...current.payload, ...patch, id, type: current.type }
    this.activeDialogs.splice(index, 1, this.createActiveDialog(id, current.type, nextPayload))
    this.scheduleDirty()
  }

  /** Возвращает список открытых dialog ids. */
  getOpenDialogIds(): Array<string> {
    return this.activeDialogs.map(dialog => dialog.id)
  }

  /** Обновляет subtree открытых диалогов. */
  update(): void {
    this.dirtyScheduled = false
    const children = this.activeDialogs.flatMap((dialog, index) => this.createDialogLayerSchemas(dialog, index))
    const reconciled = reconcileNovaTemplateChildren(this, this.managedChildren, children)
    this.managedChildren.length = 0
    this.managedChildren.push(...reconciled.nodes)
    for (const child of this.managedChildren) {
      const changed = child.x !== 0
        || child.y !== 0
        || child.width !== this.width
        || child.height !== this.height
      child.options({
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
      })
      if (changed) child.dirty({ matrix: true, update: true, render: true })
    }
  }

  /** Controller ничего не рисует напрямую. */
  render(): void {
    this.renderer.schema([])
  }

  /** Пересобирает итоговую map с учетом порядка source registration. */
  private rebuildDefinitions(): void {
    this.definitions.clear()
    for (const source of this.sources.values()) {
      for (const definition of source.definitions) {
        this.definitions.set(definition.type || 'default', definition)
      }
    }
  }

  /** Пересчитывает props открытых диалогов после изменения registry. */
  private rebuildActiveDialogs(): void {
    for (let index = 0; index < this.activeDialogs.length; index += 1) {
      const current = this.activeDialogs[index]
      this.activeDialogs[index] = this.createActiveDialog(current.id, current.type, current.payload)
    }
    this.scheduleDirty()
  }

  /** Создает runtime-модель открытого диалога. */
  private createActiveDialog(id: string, type: string, payload: DialogOpenOptions): ActiveDialog {
    const definition = this.definitions.get(type) ?? this.definitions.get('default')
    return {
      id,
      type,
      payload,
      slot: definition?.slot,
    }
  }

  /** Создает visual backdrop и panel-node одного открытого диалога. */
  private createDialogLayerSchemas(dialog: ActiveDialog, index: number): Array<NovaElementSchema<any>> {
    const props = this.resolveDialogProps(dialog)
    const slot = this.createSlotContext(dialog, index, props)
    const body = dialog.slot
      ? dialog.slot(slot)
      : createDefaultDialogBody(slot)
    const userOpenChange = props.onOpenChange
    const schemas: Array<NovaElementSchema<any>> = []

    if (props.backdrop) schemas.push({
      type: SURFACE_SCHEMA_TYPE,
      id: `nova-root-dialog-${dialog.id}-backdrop`,
      key: `${dialog.id}:backdrop`,
      props: {
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        background: 'var(--nova-dialog-backdrop-background, rgba(15,23,42,0.38))',
        border: { width: 0 },
        padding: 0,
      },
    })

    schemas.push({
      type: DIALOG_SCHEMA_TYPE,
      id: `nova-root-dialog-${dialog.id}`,
      key: dialog.id,
      renderBackdrop: false,
      props: {
        ...props,
        onOpenChange: (open: boolean, event?: Event) => {
          if (!open) this.closeDialog(dialog.id, event)
          else userOpenChange?.(open, event)
        },
      },
      children: body,
    })

    return schemas
  }

  /** Создает implicit slot context для custom dialog template. */
  private createSlotContext(dialog: ActiveDialog, index: number, props: DialogResolvedProps): DialogSlotContext {
    return {
      ...dialog.payload,
      id: dialog.id,
      type: dialog.type,
      value: dialog.payload.value,
      props,
      dialog: {
        id: dialog.id,
        type: dialog.type,
        index,
      },
      close: event => this.closeDialog(dialog.id, event),
      update: patch => this.updateDialog(dialog.id, patch as DialogProps & Record<string, unknown>),
    }
  }

  /** Разрешает итоговые props открытого диалога только перед reconcile. */
  private resolveDialogProps(dialog: ActiveDialog): DialogResolvedProps {
    const definition = this.definitions.get(dialog.type) ?? this.definitions.get('default')
    const payloadProps = dialog.payload as DialogProps & Record<string, unknown>
    return normalizeDialogProps({
      ...DEFAULT_DIALOG_PROPS,
      ...(definition?.props ?? {}),
      ...payloadProps,
      open: true,
      className: payloadProps.className ?? definition?.props?.className ?? dialog.type,
      attrs: {
        ...(definition?.props?.attrs ?? {}),
        ...((payloadProps.attrs as Record<string, unknown> | undefined) ?? {}),
        type: dialog.type,
      },
    })
  }

  /** Вызывает onOpenChange без полной normalization для dialogs, закрытых до reconcile. */
  private notifyDialogOpenChange(dialog: ActiveDialog, open: boolean, event?: Event): void {
    const definition = this.definitions.get(dialog.type) ?? this.definitions.get('default')
    const payloadOpenChange = (dialog.payload as DialogProps).onOpenChange
    definition?.props?.onOpenChange?.(open, event)
    payloadOpenChange?.(open, event)
  }

  /** Коалесцирует invalidation для серийных API-вызовов в одном scheduler turn. */
  private scheduleDirty(): void {
    if (this.dirtyScheduled) return
    this.dirtyScheduled = true
    this.dirty({ update: true, render: true })
  }
}

function normalizeDialogInput(input: DialogInput, payload: Record<string, unknown>): DialogOpenOptions {
  if (typeof input === 'string') {
    return {
      ...payload,
      type: input || 'default',
    }
  }

  return {
    ...payload,
    ...input,
    type: typeof input.type === 'string' && input.type ? input.type : 'default',
  }
}

function createDefaultDialogBody(slot: DialogSlotContext): Array<NovaElementSchema<any>> {
  if (slot.value === undefined || slot.value === null || slot.value === '') return []
  return [
    {
      type: TEXT_BLOCK_SCHEMA_TYPE,
      id: `nova-root-dialog-${slot.id}-value`,
      props: {
        text: String(slot.value),
        x: 0,
        y: 0,
        width: Math.max(0, slot.props.width - 36),
        height: Math.max(24, slot.props.height - 92),
        color: '#334155',
        fontSize: 13,
        lineHeight: 18,
      },
    },
  ]
}
