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
import type {
  DialogDefinition,
  DialogInput,
  DialogOpenOptions,
  DialogProps,
  DialogResolvedProps,
  DialogSlotContext,
} from '@/components/Dialog/dialog.types'
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
  background: 'var(--nova-dialog-background, #ffffff)',
  color: 'var(--nova-dialog-color, #172033)',
  border: {
    color: 'var(--nova-dialog-border-color, #cbd5e1)',
    width: 1,
    radius: 12,
  },
  padding: {
    horizontal: 18,
    vertical: 16,
  },
  fontFamily: 'var(--nova-dialog-font-family, Inter, Arial, sans-serif)',
  fontSize: 13,
  lineHeight: 18,
}

/** Единственный overlay-controller диалогов внутри одного UI Kit Root. */
export class RootDialogControllerNode<E extends EventList = Record<string, any>> extends NovaNode<E> {
  private readonly sources = new Map<string, RegisteredDialogSource>()
  private readonly definitions = new Map<string, DialogDefinition>()
  private readonly managedChildren: Array<NovaNode<E>> = []
  private readonly activeDialogs: Array<ActiveDialog> = []
  private nextDialogId = 1
  private dirtyScheduled = false

  /** Создает controller-node и размещает его поверх Root. */
  constructor(app: NovaApp<E>, surface: NovaSurface<E>) {
    super(app, surface)
    this.options({
      x: 0,
      y: 0,
      width: app.width,
      height: app.height,
      zIndex: 20_000,
      interactive: false,
    })
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
    const children = this.activeDialogs.map((dialog, index) => this.createDialogSchema(dialog, index))
    const reconciled = reconcileNovaTemplateChildren(this, this.managedChildren, children)
    this.managedChildren.length = 0
    this.managedChildren.push(...reconciled.nodes)
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

  /** Создает schema node для одного открытого диалога. */
  private createDialogSchema(dialog: ActiveDialog, index: number): NovaElementSchema<any> {
    const props = this.resolveDialogProps(dialog)
    const slot = this.createSlotContext(dialog, index, props)
    const body = dialog.slot
      ? dialog.slot(slot)
      : createDefaultDialogBody(slot)
    const userOpenChange = props.onOpenChange

    return {
      type: DIALOG_SCHEMA_TYPE,
      id: `nova-root-dialog-${dialog.id}`,
      key: dialog.id,
      props: {
        ...props,
        onOpenChange: (open: boolean, event?: Event) => {
          if (!open) this.closeDialog(dialog.id, event)
          else userOpenChange?.(open, event)
        },
      },
      children: body,
    }
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
        color: 'var(--nova-dialog-body-color, #334155)',
        fontSize: 13,
        lineHeight: 18,
      },
    },
  ]
}
