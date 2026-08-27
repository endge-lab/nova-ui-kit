import type { NovaApp, NovaElementSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type {
  OverlayDefinition,
  OverlayInput,
  OverlayOpenOptions,
  OverlayProps,
  OverlayResolvedProps,
  OverlaySlotContext,
} from '@/components/Overlay/overlay.types'
import type { NovaUiRootTarget } from '@/components/Root/root-target'
import {

  NovaNode,

  reconcileNovaTemplateChildren,
} from '@endge/nova'
import { normalizeOverlayProps } from '@/components/Overlay/overlay.config'
import { OVERLAY_SCHEMA_TYPE } from '@/components/Overlay/overlay.types'
import {
  NOVA_UI_ROOT_TARGET,

} from '@/components/Root/root-target'
import { TEXT_BLOCK_SCHEMA_TYPE } from '@/components/TextBlock/text-block.types'
import { applyNodeLayoutRect } from '@/shared/layout'

interface RegisteredOverlaySource {
  sourceId: string
  definitions: Array<OverlayDefinition>
}

interface ActiveOverlay {
  id: string
  type: string
  payload: OverlayOpenOptions
  slot?: OverlayDefinition['slot']
}

const DEFAULT_OVERLAY_PROPS: OverlayProps = {
  width: 240,
  height: 160,
  kind: 'popover',
  placement: 'bottom-start',
  offset: 8,
  anchor: { kind: 'root' },
  dismiss: { outside: true, escape: true },
  collision: { mode: 'shift', padding: 8 },
  modal: false,
  backdrop: false,
  background: '#ffffff',
  color: '#172033',
  border: {
    color: '#cbd5e1',
    width: 1,
    radius: 8,
  },
  padding: {
    horizontal: 8,
    vertical: 8,
  },
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: 13,
  lineHeight: 18,
}

/** Единый overlay-controller внутри одного UI Kit Root. */
export class RootOverlayControllerNode<E extends EventList = Record<string, any>> extends NovaNode<E> {
  readonly [NOVA_UI_ROOT_TARGET] = true as const

  private readonly _sources = new Map<string, RegisteredOverlaySource>()
  private readonly _definitions = new Map<string, OverlayDefinition>()
  private readonly _managedChildren: Array<NovaNode<E>> = []
  private readonly _activeOverlays: Array<ActiveOverlay> = []
  private _nextOverlayId = 1
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
      zIndex: 40_000,
      interactive: false,
    })
  }

  /** Проксирует Root API для UI Kit компонентов внутри overlay portal. */
  getApi(): ReturnType<NovaUiRootTarget['getApi']> {
    if (!this._ownerRoot) {
      throw new Error('[Nova UI Kit] Overlay portal is not attached to Root')
    }
    return this._ownerRoot.getApi()
  }

  /** Проксирует style cascade refresh для UI Kit компонентов внутри overlay portal. */
  refreshStyleCascade(): void {
    this._ownerRoot?.refreshStyleCascade()
  }

  /** Синхронизирует размер controller с Root. */
  syncRootRect(width: number, height: number): void {
    this.options({ width, height })
  }

  /** Регистрирует definitions из одного Overlays source. */
  registerDefinitions(sourceId: string, definitions: Array<OverlayDefinition>): void {
    this._sources.set(sourceId, { sourceId, definitions })
    this._rebuildDefinitions()
    this._rebuildActiveOverlays()
  }

  /** Удаляет definitions одного Overlays source. */
  unregisterDefinitions(sourceId: string): void {
    this._sources.delete(sourceId)
    this._rebuildDefinitions()
    this._rebuildActiveOverlays()
  }

  /** Открывает overlay по type или object payload. */
  openOverlay(input: OverlayInput, payload: Record<string, unknown> = {}): string {
    const normalized = normalizeOverlayInput(input, payload)
    const id = normalized.id ?? `overlay-${this._nextOverlayId++}`
    const type = normalized.type ?? 'default'
    const existingIndex = this._activeOverlays.findIndex(overlay => overlay.id === id)
    const active = this._createActiveOverlay(id, type, normalized)

    if (existingIndex >= 0) {
      this._activeOverlays.splice(existingIndex, 1, active)
    }
    else { this._activeOverlays.push(active) }

    this._scheduleDirty()
    return id
  }

  /** Закрывает один overlay или верхний overlay, если id не указан. */
  closeOverlay(id?: string, event?: Event): void {
    const index = id
      ? this._activeOverlays.findIndex(overlay => overlay.id === id)
      : this._activeOverlays.length - 1
    if (index < 0) {
      return
    }

    const [overlay] = this._activeOverlays.splice(index, 1)
    this._notifyOverlayOpenChange(overlay, false, event)
    this._scheduleDirty()
  }

  /** Закрывает все открытые overlays. */
  closeOverlays(event?: Event): void {
    if (this._activeOverlays.length === 0) {
      return
    }
    const overlays = this._activeOverlays.splice(0)
    for (const overlay of overlays) {
      this._notifyOverlayOpenChange(overlay, false, event)
    }
    this._scheduleDirty()
  }

  /** Обновляет props/payload открытого overlay. */
  updateOverlay(id: string, patch: OverlayProps & Record<string, unknown>): void {
    const index = this._activeOverlays.findIndex(overlay => overlay.id === id)
    if (index < 0) {
      return
    }

    const current = this._activeOverlays[index]
    const nextPayload = { ...current.payload, ...patch, id, type: current.type }
    this._activeOverlays.splice(index, 1, this._createActiveOverlay(id, current.type, nextPayload))
    this._scheduleDirty()
  }

  /** Возвращает список открытых overlay ids. */
  getOpenOverlayIds(): Array<string> {
    return this._activeOverlays.map(overlay => overlay.id)
  }

  /** Обновляет subtree открытых overlays. */
  update(): void {
    this._dirtyScheduled = false
    const children = this._activeOverlays.map((overlay, index) => this._createOverlaySchema(overlay, index))
    const reconciled = reconcileNovaTemplateChildren(this, this._managedChildren, children)
    this._managedChildren.length = 0
    this._managedChildren.push(...reconciled.nodes)
    for (const child of this._managedChildren) {
      applyNodeLayoutRect(child, {
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
      })
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

  /** Пересчитывает props открытых overlays после изменения registry. */
  private _rebuildActiveOverlays(): void {
    for (let index = 0; index < this._activeOverlays.length; index += 1) {
      const current = this._activeOverlays[index]
      this._activeOverlays[index] = this._createActiveOverlay(current.id, current.type, current.payload)
    }
    this._scheduleDirty()
  }

  /** Создает runtime-модель открытого overlay. */
  private _createActiveOverlay(id: string, type: string, payload: OverlayOpenOptions): ActiveOverlay {
    const definition = this._definitions.get(type) ?? this._definitions.get('default')
    return {
      id,
      type,
      payload,
      slot: definition?.slot,
    }
  }

  /** Создает schema node для одного открытого overlay. */
  private _createOverlaySchema(overlay: ActiveOverlay, index: number): NovaElementSchema<any> {
    const props = this._resolveOverlayProps(overlay)
    const slot = this._createSlotContext(overlay, index, props)
    const body = overlay.slot
      ? overlay.slot(slot)
      : createDefaultOverlayBody(slot)
    const userOpenChange = props.onOpenChange

    return {
      type: OVERLAY_SCHEMA_TYPE,
      id: `nova-root-overlay-${overlay.id}`,
      key: overlay.id,
      props: {
        ...props,
        onOpenChange: (open: boolean, event?: Event) => {
          if (!open) {
            this.closeOverlay(overlay.id, event)
          }
          else { userOpenChange?.(open, event) }
        },
      },
      children: body,
    }
  }

  /** Создает implicit slot context для custom overlay template. */
  private _createSlotContext(overlay: ActiveOverlay, index: number, props: OverlayResolvedProps): OverlaySlotContext {
    return {
      ...overlay.payload,
      id: overlay.id,
      type: overlay.type,
      value: overlay.payload.value,
      anchor: props.anchor,
      props,
      overlay: {
        id: overlay.id,
        type: overlay.type,
        kind: props.kind,
        index,
      },
      close: event => this.closeOverlay(overlay.id, event),
      update: patch => this.updateOverlay(overlay.id, patch as OverlayProps & Record<string, unknown>),
    }
  }

  /** Разрешает итоговые props открытого overlay только перед reconcile. */
  private _resolveOverlayProps(overlay: ActiveOverlay): OverlayResolvedProps {
    const definition = this._definitions.get(overlay.type) ?? this._definitions.get('default')
    const payloadProps = overlay.payload as OverlayProps & Record<string, unknown>
    return normalizeOverlayProps({
      ...DEFAULT_OVERLAY_PROPS,
      ...(definition?.props ?? {}),
      ...payloadProps,
      open: true,
      className: payloadProps.className ?? definition?.props?.className ?? overlay.type,
      attrs: {
        ...(definition?.props?.attrs ?? {}),
        ...((payloadProps.attrs as Record<string, unknown> | undefined) ?? {}),
        type: overlay.type,
        kind: payloadProps.kind ?? definition?.props?.kind ?? 'popover',
      },
    })
  }

  /** Вызывает onOpenChange без полной normalization для overlays, закрытых до reconcile. */
  private _notifyOverlayOpenChange(overlay: ActiveOverlay, open: boolean, event?: Event): void {
    const definition = this._definitions.get(overlay.type) ?? this._definitions.get('default')
    const payloadOpenChange = (overlay.payload as OverlayProps).onOpenChange
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

function normalizeOverlayInput(input: OverlayInput, payload: Record<string, unknown>): OverlayOpenOptions {
  if (typeof input === 'string') {
    return { ...payload, type: input }
  }
  return { ...payload, ...input }
}

function createDefaultOverlayBody(slot: OverlaySlotContext): Array<NovaElementSchema<any>> {
  return [
    {
      type: TEXT_BLOCK_SCHEMA_TYPE,
      id: `nova-root-overlay-${slot.id}-default-body`,
      props: {
        text: String(slot.value ?? ''),
        color: slot.props.color,
        fontFamily: slot.props.fontFamily,
        fontSize: slot.props.fontSize,
        lineHeight: slot.props.lineHeight,
      },
      layout: {
        width: '100%',
        height: '100%',
      },
    },
  ]
}
