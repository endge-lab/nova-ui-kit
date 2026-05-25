import {
  NovaNode,
  reconcileNovaTemplateChildren,
  type NovaApp,
  type NovaElementSchema,
  type NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import { TEXT_BLOCK_SCHEMA_TYPE } from '@/components/TextBlock/text-block.types'
import { OVERLAY_SCHEMA_TYPE } from '@/components/Overlay/overlay.types'
import { normalizeOverlayProps } from '@/components/Overlay/overlay.config'
import type {
  OverlayDefinition,
  OverlayInput,
  OverlayOpenOptions,
  OverlayProps,
  OverlayResolvedProps,
  OverlaySlotContext,
} from '@/components/Overlay/overlay.types'
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
  private readonly sources = new Map<string, RegisteredOverlaySource>()
  private readonly definitions = new Map<string, OverlayDefinition>()
  private readonly managedChildren: Array<NovaNode<E>> = []
  private readonly activeOverlays: Array<ActiveOverlay> = []
  private nextOverlayId = 1
  private dirtyScheduled = false

  /** Создает controller-node и размещает его поверх Root. */
  constructor(app: NovaApp<E>, surface: NovaSurface<E>) {
    super(app, surface)
    this.options({
      x: 0,
      y: 0,
      width: app.width,
      height: app.height,
      zIndex: 18_000,
      interactive: false,
    })
  }

  /** Синхронизирует размер controller с Root. */
  syncRootRect(width: number, height: number): void {
    this.options({ width, height })
  }

  /** Регистрирует definitions из одного Overlays source. */
  registerDefinitions(sourceId: string, definitions: Array<OverlayDefinition>): void {
    this.sources.set(sourceId, { sourceId, definitions })
    this.rebuildDefinitions()
    this.rebuildActiveOverlays()
  }

  /** Удаляет definitions одного Overlays source. */
  unregisterDefinitions(sourceId: string): void {
    this.sources.delete(sourceId)
    this.rebuildDefinitions()
    this.rebuildActiveOverlays()
  }

  /** Открывает overlay по type или object payload. */
  openOverlay(input: OverlayInput, payload: Record<string, unknown> = {}): string {
    const normalized = normalizeOverlayInput(input, payload)
    const id = normalized.id ?? `overlay-${this.nextOverlayId++}`
    const type = normalized.type ?? 'default'
    const existingIndex = this.activeOverlays.findIndex(overlay => overlay.id === id)
    const active = this.createActiveOverlay(id, type, normalized)

    if (existingIndex >= 0) this.activeOverlays.splice(existingIndex, 1, active)
    else this.activeOverlays.push(active)

    this.scheduleDirty()
    return id
  }

  /** Закрывает один overlay или верхний overlay, если id не указан. */
  closeOverlay(id?: string, event?: Event): void {
    const index = id
      ? this.activeOverlays.findIndex(overlay => overlay.id === id)
      : this.activeOverlays.length - 1
    if (index < 0) return

    const [overlay] = this.activeOverlays.splice(index, 1)
    this.notifyOverlayOpenChange(overlay, false, event)
    this.scheduleDirty()
  }

  /** Закрывает все открытые overlays. */
  closeOverlays(event?: Event): void {
    if (this.activeOverlays.length === 0) return
    const overlays = this.activeOverlays.splice(0)
    for (const overlay of overlays) this.notifyOverlayOpenChange(overlay, false, event)
    this.scheduleDirty()
  }

  /** Обновляет props/payload открытого overlay. */
  updateOverlay(id: string, patch: OverlayProps & Record<string, unknown>): void {
    const index = this.activeOverlays.findIndex(overlay => overlay.id === id)
    if (index < 0) return

    const current = this.activeOverlays[index]
    const nextPayload = { ...current.payload, ...patch, id, type: current.type }
    this.activeOverlays.splice(index, 1, this.createActiveOverlay(id, current.type, nextPayload))
    this.scheduleDirty()
  }

  /** Возвращает список открытых overlay ids. */
  getOpenOverlayIds(): Array<string> {
    return this.activeOverlays.map(overlay => overlay.id)
  }

  /** Обновляет subtree открытых overlays. */
  update(): void {
    this.dirtyScheduled = false
    const children = this.activeOverlays.map((overlay, index) => this.createOverlaySchema(overlay, index))
    const reconciled = reconcileNovaTemplateChildren(this, this.managedChildren, children)
    this.managedChildren.length = 0
    this.managedChildren.push(...reconciled.nodes)
    for (const child of this.managedChildren) {
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
  private rebuildDefinitions(): void {
    this.definitions.clear()
    for (const source of this.sources.values()) {
      for (const definition of source.definitions) {
        this.definitions.set(definition.type || 'default', definition)
      }
    }
  }

  /** Пересчитывает props открытых overlays после изменения registry. */
  private rebuildActiveOverlays(): void {
    for (let index = 0; index < this.activeOverlays.length; index += 1) {
      const current = this.activeOverlays[index]
      this.activeOverlays[index] = this.createActiveOverlay(current.id, current.type, current.payload)
    }
    this.scheduleDirty()
  }

  /** Создает runtime-модель открытого overlay. */
  private createActiveOverlay(id: string, type: string, payload: OverlayOpenOptions): ActiveOverlay {
    const definition = this.definitions.get(type) ?? this.definitions.get('default')
    return {
      id,
      type,
      payload,
      slot: definition?.slot,
    }
  }

  /** Создает schema node для одного открытого overlay. */
  private createOverlaySchema(overlay: ActiveOverlay, index: number): NovaElementSchema<any> {
    const props = this.resolveOverlayProps(overlay)
    const slot = this.createSlotContext(overlay, index, props)
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
          if (!open) this.closeOverlay(overlay.id, event)
          else userOpenChange?.(open, event)
        },
      },
      children: body,
    }
  }

  /** Создает implicit slot context для custom overlay template. */
  private createSlotContext(overlay: ActiveOverlay, index: number, props: OverlayResolvedProps): OverlaySlotContext {
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
  private resolveOverlayProps(overlay: ActiveOverlay): OverlayResolvedProps {
    const definition = this.definitions.get(overlay.type) ?? this.definitions.get('default')
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
  private notifyOverlayOpenChange(overlay: ActiveOverlay, open: boolean, event?: Event): void {
    const definition = this.definitions.get(overlay.type) ?? this.definitions.get('default')
    const payloadOpenChange = (overlay.payload as OverlayProps).onOpenChange
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
