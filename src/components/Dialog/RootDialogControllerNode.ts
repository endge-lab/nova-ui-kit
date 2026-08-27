import type { NovaApp, NovaElementSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type {
  DialogDefinition,
  DialogInput,
  DialogOpenOptions,
  DialogProps,
  DialogResolvedProps,
  DialogSlotContext,
} from '@/components/Dialog/dialog.types'
import type { NovaUiRootTarget } from '@/components/Root/root-target'
import {

  NovaNode,

  reconcileNovaTemplateChildren,
} from '@endge/nova'
import { normalizeDialogProps } from '@/components/Dialog/dialog.config'
import { DIALOG_SCHEMA_TYPE } from '@/components/Dialog/dialog.types'
import {
  NOVA_UI_ROOT_TARGET,

} from '@/components/Root/root-target'
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

  private readonly _sources = new Map<string, RegisteredDialogSource>()
  private readonly _definitions = new Map<string, DialogDefinition>()
  private readonly _managedChildren: Array<NovaNode<E>> = []
  private readonly _activeDialogs: Array<ActiveDialog> = []
  private _nextDialogId = 1
  private _dirtyScheduled = false

  /** Создает controller-node и размещает его поверх Root. */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    private readonly _ownerRoot?: NovaNode<E> & NovaUiRootTarget,
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
    if (!this._ownerRoot) {
      throw new Error('[Nova UI Kit] Dialog portal is not attached to Root')
    }
    return this._ownerRoot.getApi()
  }

  /** Проксирует style cascade refresh для UI Kit компонентов внутри dialog portal. */
  refreshStyleCascade(): void {
    this._ownerRoot?.refreshStyleCascade()
  }

  /** Синхронизирует размер controller с Root. */
  syncRootRect(width: number, height: number): void {
    this.options({ width, height })
  }

  /** Регистрирует definitions из одного Dialogs source. */
  registerDefinitions(sourceId: string, definitions: Array<DialogDefinition>): void {
    this._sources.set(sourceId, { sourceId, definitions })
    this._rebuildDefinitions()
    this._rebuildActiveDialogs()
  }

  /** Удаляет definitions одного Dialogs source. */
  unregisterDefinitions(sourceId: string): void {
    this._sources.delete(sourceId)
    this._rebuildDefinitions()
    this._rebuildActiveDialogs()
  }

  /** Открывает диалог по type или object payload. */
  openDialog(input: DialogInput, payload: Record<string, unknown> = {}): string {
    const normalized = normalizeDialogInput(input, payload)
    const id = normalized.id ?? `dialog-${this._nextDialogId++}`
    const type = normalized.type ?? 'default'
    const existingIndex = this._activeDialogs.findIndex(dialog => dialog.id === id)
    const active = this._createActiveDialog(id, type, normalized)

    if (existingIndex >= 0) {
      this._activeDialogs.splice(existingIndex, 1, active)
    }
    else { this._activeDialogs.push(active) }

    this._scheduleDirty()
    return id
  }

  /** Закрывает один диалог или верхний диалог, если id не указан. */
  closeDialog(id?: string, event?: Event): void {
    const index = id
      ? this._activeDialogs.findIndex(dialog => dialog.id === id)
      : this._activeDialogs.length - 1
    if (index < 0) {
      return
    }

    const [dialog] = this._activeDialogs.splice(index, 1)
    this._notifyDialogOpenChange(dialog, false, event)
    this._scheduleDirty()
  }

  /** Закрывает все открытые диалоги. */
  closeDialogs(event?: Event): void {
    if (this._activeDialogs.length === 0) {
      return
    }
    const dialogs = this._activeDialogs.splice(0)
    for (const dialog of dialogs) {
      this._notifyDialogOpenChange(dialog, false, event)
    }
    this._scheduleDirty()
  }

  /** Обновляет props/payload открытого диалога. */
  updateDialog(id: string, patch: DialogProps & Record<string, unknown>): void {
    const index = this._activeDialogs.findIndex(dialog => dialog.id === id)
    if (index < 0) {
      return
    }

    const current = this._activeDialogs[index]
    const nextPayload = { ...current.payload, ...patch, id, type: current.type }
    this._activeDialogs.splice(index, 1, this._createActiveDialog(id, current.type, nextPayload))
    this._scheduleDirty()
  }

  /** Возвращает список открытых dialog ids. */
  getOpenDialogIds(): Array<string> {
    return this._activeDialogs.map(dialog => dialog.id)
  }

  /** Обновляет subtree открытых диалогов. */
  update(): void {
    this._dirtyScheduled = false
    const children = this._activeDialogs.flatMap((dialog, index) => this._createDialogLayerSchemas(dialog, index))
    const reconciled = reconcileNovaTemplateChildren(this, this._managedChildren, children)
    this._managedChildren.length = 0
    this._managedChildren.push(...reconciled.nodes)
    for (const child of this._managedChildren) {
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
      if (changed) {
        child.dirty({ matrix: true, update: true, render: true })
      }
    }
  }

  /** Controller ничего не рисует напрямую. */
  render(): void {
    this.renderer.schema([])
  }

  /** Пересобирает итоговую map с учетом порядка source registration. */
  private _rebuildDefinitions(): void {
    this._definitions.clear()
    for (const source of this._sources.values()) {
      for (const definition of source.definitions) {
        this._definitions.set(definition.type || 'default', definition)
      }
    }
  }

  /** Пересчитывает props открытых диалогов после изменения registry. */
  private _rebuildActiveDialogs(): void {
    for (let index = 0; index < this._activeDialogs.length; index += 1) {
      const current = this._activeDialogs[index]
      this._activeDialogs[index] = this._createActiveDialog(current.id, current.type, current.payload)
    }
    this._scheduleDirty()
  }

  /** Создает runtime-модель открытого диалога. */
  private _createActiveDialog(id: string, type: string, payload: DialogOpenOptions): ActiveDialog {
    const definition = this._definitions.get(type) ?? this._definitions.get('default')
    return {
      id,
      type,
      payload,
      slot: definition?.slot,
    }
  }

  /** Создает visual backdrop и panel-node одного открытого диалога. */
  private _createDialogLayerSchemas(dialog: ActiveDialog, index: number): Array<NovaElementSchema<any>> {
    const props = this._resolveDialogProps(dialog)
    const slot = this._createSlotContext(dialog, index, props)
    const body = dialog.slot
      ? dialog.slot(slot)
      : createDefaultDialogBody(slot)
    const userOpenChange = props.onOpenChange
    const schemas: Array<NovaElementSchema<any>> = []

    if (props.backdrop) {
      schemas.push({
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
    }

    schemas.push({
      type: DIALOG_SCHEMA_TYPE,
      id: `nova-root-dialog-${dialog.id}`,
      key: dialog.id,
      renderBackdrop: false,
      props: {
        ...props,
        onOpenChange: (open: boolean, event?: Event) => {
          if (!open) {
            this.closeDialog(dialog.id, event)
          }
          else { userOpenChange?.(open, event) }
        },
      },
      children: body,
    })

    return schemas
  }

  /** Создает implicit slot context для custom dialog template. */
  private _createSlotContext(dialog: ActiveDialog, index: number, props: DialogResolvedProps): DialogSlotContext {
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
  private _resolveDialogProps(dialog: ActiveDialog): DialogResolvedProps {
    const definition = this._definitions.get(dialog.type) ?? this._definitions.get('default')
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
  private _notifyDialogOpenChange(dialog: ActiveDialog, open: boolean, event?: Event): void {
    const definition = this._definitions.get(dialog.type) ?? this._definitions.get('default')
    const payloadOpenChange = (dialog.payload as DialogProps).onOpenChange
    definition?.props?.onOpenChange?.(open, event)
    payloadOpenChange?.(open, event)
  }

  /** Коалесцирует invalidation для серийных API-вызовов в одном scheduler turn. */
  private _scheduleDirty(): void {
    if (this._dirtyScheduled) {
      return
    }
    this._dirtyScheduled = true
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
  if (slot.value === undefined || slot.value === null || slot.value === '') {
    return []
  }
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
