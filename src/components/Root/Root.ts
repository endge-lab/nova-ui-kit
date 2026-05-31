import {
  NovaComponentNode,
  reconcileNovaTemplateChildren,
  type NovaApp,
  type NovaCursorDeclaration,
  type NovaCursorStateMap,
  type NovaCursorValue,
  type NovaMotionPlayback,
  type NovaNode,
  type NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  ROOT_NODE_DESCRIPTOR,
  normalizeRootProps,
  type RootDescriptor,
} from '@/components/Root/root.config'
import {
  NOVA_UI_ROOT_TARGET,
  type NovaUiRootTarget,
} from '@/components/Root/root-target'
import type {
  RootApi,
  RootChildSchema,
  RootProps,
  RootResolvedProps,
} from '@/components/Root/root.types'
import { RootDialogControllerNode } from '@/components/Dialog/RootDialogControllerNode'
import type {
  DialogDefinition,
  DialogInput,
  DialogProps,
} from '@/components/Dialog/dialog.types'
import { RootOverlayControllerNode } from '@/components/Overlay/RootOverlayControllerNode'
import type {
  OverlayDefinition,
  OverlayInput,
  OverlayProps,
} from '@/components/Overlay/overlay.types'
import { RootTooltipControllerNode } from '@/components/Tooltip/RootTooltipControllerNode'
import type {
  NovaTooltipTargetResolver,
  TooltipDefinition,
  TooltipInput,
} from '@/components/Tooltip/tooltip.types'
import {
  NOVA_UI_LAYOUT_TARGET,
  applyNodeLayoutRect,
  copyRect,
  createLayoutRect,
  readNovaUiNodeProps,
  isNovaUiLayoutTarget,
  isNovaUiOutOfFlowPosition,
  isNovaUiLayoutDisplayed,
  rectEquals,
  relayoutNovaUiLayoutAncestors,
  resolveNovaUiPositionedLayout,
  resolveNovaUiPositionedRect,
  resolveSpacing,
  setNovaUiNodeLayoutIntent,
  type NovaUiLayoutRect,
  type NovaUiLayoutTarget,
} from '@/shared/layout'
import {
  EMPTY_STYLE_CONTEXT,
  NovaUiStyleMask,
  borderRadiusToRendererValue,
  bumpNovaUiStyleSheetVersion,
  bumpNovaUiStyleTokenVersions,
  createEmptyStyleSheet,
  createEmptyStyleSheetValidationResult,
  createNovaUiStyleIdentityRegistry,
  createNovaUiStyleSheetGraph,
  getNovaUiBuiltInUtilityStyleSheet,
  getNovaUiGlobalStyleSheet,
  getNovaUiStyleMediaSignature,
  isNovaUiStyleTarget,
  isNovaUiStyleSheetAsset,
  matchStyleRules,
  mergeNovaUiStyleSheets,
  mergeStyleContext,
  resolveNovaUiClassUtilities,
  resolveNovaUiStyleSheetTokens,
  planNovaUiMediaInvalidation,
  planNovaUiStyleSheetInvalidation,
  styleContextChangedMask,
  subscribeNovaUiGlobalStyleSheets,
  validateNovaUiStyleSheetSource,
  type NovaUiCompiledStyleSheet,
  type NovaUiStyleInvalidationPlan,
  type NovaUiStyleDeclarations,
  type NovaUiStyleKeyframeDeclaration,
  type NovaUiStyleInspectionDebug,
  type NovaUiStyleMediaContext,
  type NovaUiStyleSheetGraph,
  type NovaUiStyleSheetAsset,
  type NovaUiStyleTokenResolver,
  type NovaUiStyleReceiveResult,
  type NovaUiStyleValidationResult,
  type NovaUiStylableNode,
} from '@/shared/style'
import { ensureNovaUIKitThemes } from '@/shared/style/nova-ui-kit-theme'

interface AppliedCascadeState {
  baseline: Record<string, unknown>
  keys: Set<string>
}

/** Корень UI Kit дерева, который запускает layout и selector style engine. */
export class Root<E extends EventList = Record<string, any>>
  extends NovaComponentNode<RootResolvedProps, RootApi, Record<string, never>, RootProps, E>
  implements NovaUiLayoutTarget, NovaUiRootTarget {
  readonly [NOVA_UI_LAYOUT_TARGET] = true as const
  readonly [NOVA_UI_ROOT_TARGET] = true as const

  private readonly ownRect = createLayoutRect()
  private readonly childRect = createLayoutRect()
  private readonly managedChildren: Array<NovaNode<E>> = []
  private readonly appliedCascade = new WeakMap<NovaUiStylableNode, AppliedCascadeState>()
  private readonly appliedAnimations = new WeakMap<NovaUiStylableNode, { signature: string; playback: NovaMotionPlayback }>()
  private readonly appliedAnimationSignatures = new Map<string, string>()
  private readonly api: RootApi
  private layoutDirty = true
  private externalLayout = false
  private styleSheet: NovaUiCompiledStyleSheet = createEmptyStyleSheet()
  private styleSheetGraph: NovaUiStyleSheetGraph | null = null
  private localStyleSheetAsset: NovaUiStyleSheetAsset | null = null
  private localRawStyleSheet: NovaUiCompiledStyleSheet = createEmptyStyleSheet()
  private rawStyleSheet: NovaUiCompiledStyleSheet = createEmptyStyleSheet()
  private validation: NovaUiStyleValidationResult = createEmptyStyleSheetValidationResult()
  private effectiveStyleContext = EMPTY_STYLE_CONTEXT
  private tokenResolver: NovaUiStyleTokenResolver | null = null
  private resolvedTokenVersion: number | null = null
  private readonly resolvedTokenValues = new Map<string, string>()
  private readonly styleCandidateFallbackThreshold = 2_048
  private activeThemeId: string | null = null
  private mediaSignature = ''
  private mediaContext: NovaUiStyleMediaContext = { width: 0, height: 0 }
  private tooltipController: RootTooltipControllerNode<E> | null = null
  private dialogController: RootDialogControllerNode<E> | null = null
  private overlayController: RootOverlayControllerNode<E> | null = null
  private tooltipSurface: NovaSurface<E> | null = null
  private dialogSurface: NovaSurface<E> | null = null
  private overlaySurface: NovaSurface<E> | null = null
  private readonly disposeGlobalStylesSubscription: () => void

  /**
   * Создает экземпляр Root и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: RootProps = {},
    options: { componentId?: string; children?: Array<RootChildSchema> } = {},
    descriptor: RootDescriptor = ROOT_NODE_DESCRIPTOR,
  ) {
    ensureNovaUIKitThemes(app)
    const resolvedProps = normalizeRootProps(props)
    super(app, surface, descriptor, resolvedProps, options)
    this.__type = 'Root'
    this.layoutReady = false
    this.applyDisplayState()
    this.api = {
      setStyleSheetSource: source => this.setStyleSheetSource(source),
      setStyleSheetAsset: asset => this.setStyleSheetAsset(asset),
      resetStyleSheet: () => this.resetStyleSheet(),
      refreshStyleTokens: () => this.refreshStyleTokens(),
      setStyleTokenResolver: resolver => this.setStyleTokenResolver(resolver),
      validateStyleSheet: source => validateNovaUiStyleSheetSource(source),
      setChildren: children => this.setChildren(children),
      getValidation: () => this.validation,
      getDiagnostics: () => this.validation.diagnostics,
      getStyleSheetSource: () => this.getStyleSheetSource(),
      getCompiledStyleSheet: () => this.styleSheet,
      getStyleMediaContext: () => this.getMediaContext(),
      inspectStyleNode: node => this.inspectStyleNode(node),
      relayout: () => this.relayout(),
      getChildRect: () => this.childRect,
      registerTooltipDefinitions: (sourceId, definitions) => this.registerTooltipDefinitions(sourceId, definitions),
      unregisterTooltipDefinitions: sourceId => this.unregisterTooltipDefinitions(sourceId),
      closeTooltip: options => this.closeTooltip(options),
      registerDialogDefinitions: (sourceId, definitions) => this.registerDialogDefinitions(sourceId, definitions),
      unregisterDialogDefinitions: sourceId => this.unregisterDialogDefinitions(sourceId),
      openDialog: (input, payload) => this.openDialog(input, payload),
      closeDialog: (id, event) => this.closeDialog(id, event),
      closeDialogs: event => this.closeDialogs(event),
      updateDialog: (id, patch) => this.updateDialog(id, patch),
      getOpenDialogIds: () => this.getOpenDialogIds(),
      registerOverlayDefinitions: (sourceId, definitions) => this.registerOverlayDefinitions(sourceId, definitions),
      unregisterOverlayDefinitions: sourceId => this.unregisterOverlayDefinitions(sourceId),
      openOverlay: (input, payload) => this.openOverlay(input, payload),
      closeOverlay: (id, event) => this.closeOverlay(id, event),
      closeOverlays: event => this.closeOverlays(event),
      updateOverlay: (id, patch) => this.updateOverlay(id, patch),
      getOpenOverlayIds: () => this.getOpenOverlayIds(),
    }
    this.tokenResolver = app.theme.createTokenResolver()
    this.addDisposer(app.theme.observe(this, { phase: 'update' }))
    this.disposeGlobalStylesSubscription = subscribeNovaUiGlobalStyleSheets(app, () => {
      this.refreshCombinedStyleSheet()
    })
    this.applyResolvedRect({
      x: resolvedProps.x,
      y: resolvedProps.y,
      width: resolvedProps.width,
      height: resolvedProps.height,
    })
    this.options({
      cursor: resolvedProps.cursor ?? null,
      cursorContext: resolvedProps.cursorContext ?? null,
    })
    this.effectiveStyleContext = mergeStyleContext(EMPTY_STYLE_CONTEXT, resolvedProps.style)
    this.setStyleSheetSource(resolvedProps.styleSheet)
    const handleTooltipPointerMove = (event: MouseEvent) => this.handleTooltipPointerMove(event)
    const handleTooltipPointerLeave = () => this.tooltipController?.handlePointerLeave()
    this.nova.canvas.element.addEventListener('mousemove', handleTooltipPointerMove)
    this.nova.canvas.element.addEventListener('mouseleave', handleTooltipPointerLeave)
    this.addDisposer(() => {
      this.nova.canvas.element.removeEventListener('mousemove', handleTooltipPointerMove)
      this.nova.canvas.element.removeEventListener('mouseleave', handleTooltipPointerLeave)
    })
    this.setChildren(options.children ?? [])
    this.update()
    this.layoutReady = true
  }

  /**
   * Обновляет значение состояния Root.
   */
  override setProps(patch: RootProps): this {
    return super.setProps(patch as Partial<RootResolvedProps>)
  }

  /**
   * Возвращает значение состояния Root.
   */
  override getApi(): RootApi {
    return this.api
  }

  /** Принимает итоговый rect от внешнего runtime и запускает пересчет Root children. */
  applyLayoutRect(rect: NovaUiLayoutRect): boolean {
    this.externalLayout = true
    const changed = this.applyResolvedRect(rect)
    if (changed && this.layoutReady) this.update()
    return changed
  }

  /** Валидирует stylesheet source и применяет пустую схему при ошибке. */
  setStyleSheetSource(source: string | NovaUiStyleSheetAsset): void {
    if (isNovaUiStyleSheetAsset(source)) {
      this.setStyleSheetAsset(source)
      return
    }

    const validation = source.trim()
      ? validateNovaUiStyleSheetSource(source)
      : createEmptyStyleSheetValidationResult(source)

    this.validation = validation
    this.localRawStyleSheet = validation.ok && validation.styleSheet
      ? validation.styleSheet
      : createEmptyStyleSheet(source)
    this.localStyleSheetAsset = null
    this.props.styleSheet = source
    this.refreshCombinedStyleSheet()
  }

  /** Применяет precompiled stylesheet asset без повторного parse source. */
  setStyleSheetAsset(asset: NovaUiStyleSheetAsset): void {
    this.validation = {
      ok: asset.ok,
      styleSheet: asset.styleSheet,
      diagnostics: asset.diagnostics,
    }
    this.localRawStyleSheet = asset.ok && asset.styleSheet
      ? asset.styleSheet
      : createEmptyStyleSheet(asset.source)
    this.localStyleSheetAsset = asset
    this.props.styleSheet = asset
    this.refreshCombinedStyleSheet()
  }

  /** Обновляет token-resolved stylesheet после смены темы или token context. */
  refreshStyleTokens(): void {
    const changedTokens = this.collectChangedResolvedTokens()
    this.styleSheet = this.resolveStyleSheetTokens(this.rawStyleSheet)
    if (changedTokens.length > 0) bumpNovaUiStyleTokenVersions(this.nova, changedTokens)
    if (changedTokens.length > 0) bumpNovaUiStyleSheetVersion(this.nova)
    this.applyPlannedCascade()
  }

  /** Пере-применяет selector cascade после изменения вложенного template дерева. */
  refreshStyleCascade(): void {
    this.applyCascade()
  }

  /** Задает resolver theme/CSS tokens для Nova stylesheet. */
  setStyleTokenResolver(resolver: NovaUiStyleTokenResolver | null): void {
    this.tokenResolver = resolver
    this.resolvedTokenVersion = null
    this.refreshStyleTokens()
  }

  /** Сбрасывает selector stylesheet без пересоздания дерева. */
  resetStyleSheet(): void {
    this.setStyleSheetSource('')
  }

  /** Возвращает source активного stylesheet для debug-инспектора. */
  getStyleSheetSource(): string {
    return this.rawStyleSheet.source ?? ''
  }

  /** Возвращает trace selector cascade для выбранной UI Kit node. */
  inspectStyleNode(node: string | NovaUiStylableNode): NovaUiStyleInspectionDebug | null {
    const target = typeof node === 'string'
      ? this.nova.components.get(node)
      : node

    if (!isStylableNode(target)) return null

    const rules = matchStyleRules(target, this.styleSheet, this.getMediaContext())
    const state = this.resolveAppliedState(target)

    return {
      rootComponentId: this.componentId,
      nodeComponentId: target.componentId,
      nodeType: target.descriptor.name,
      styleSheetSource: this.getStyleSheetSource(),
      matchedRules: rules.map(rule => ({
        selector: rule.selector.raw,
        specificity: rule.selector.specificity,
        order: rule.order,
        declarations: rule.declarations,
      })),
      mergedDeclarations: mergeStyleDeclarations(
        resolveNovaUiClassUtilities(readNovaUiNodeProps(target).className),
        mergeRuleDeclarations(rules),
      ),
      baselineProps: { ...state.baseline },
      currentProps: { ...target.getProps() },
      appliedKeys: [...state.keys],
      diagnostics: this.validation.diagnostics.map(item => ({ ...item })),
    }
  }

  /** Заменяет managed children и применяет layout/style одним проходом. */
  setChildren(children: Array<RootChildSchema>): void {
    const reconciled = reconcileNovaTemplateChildren(this, this.managedChildren, children)
    this.managedChildren.length = 0
    this.managedChildren.push(...reconciled.nodes)

    this.layoutDirty = true
    this.applyCascade()
    if (this.layoutReady) this.update()
    this.dirty({ update: true, render: true })
  }

  /** Принудительно помечает Root layout грязным без изменения props. */
  relayout(): void {
    this.layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  /** Регистрирует tooltip definitions из дочернего Tooltips source. */
  registerTooltipDefinitions(sourceId: string, definitions: Array<TooltipDefinition>): void {
    this.ensureTooltipController().registerDefinitions(sourceId, definitions)
  }

  /** Удаляет tooltip definitions дочернего Tooltips source. */
  unregisterTooltipDefinitions(sourceId: string): void {
    this.tooltipController?.unregisterDefinitions(sourceId)
  }

  /** Закрывает активный tooltip без ожидания pointer leave. */
  closeTooltip(options: { suppressMs?: number } = {}): void {
    this.tooltipController?.closeNow(options)
  }

  /** Регистрирует dialog definitions из дочернего Dialogs source. */
  registerDialogDefinitions(sourceId: string, definitions: Array<DialogDefinition>): void {
    this.ensureDialogController().registerDefinitions(sourceId, definitions)
  }

  /** Удаляет dialog definitions дочернего Dialogs source. */
  unregisterDialogDefinitions(sourceId: string): void {
    this.dialogController?.unregisterDefinitions(sourceId)
  }

  /** Открывает registry dialog через единый overlay-controller. */
  openDialog(input: DialogInput, payload?: Record<string, unknown>): string {
    return this.ensureDialogController().openDialog(input, payload)
  }

  /** Закрывает registry dialog по id или верхний dialog. */
  closeDialog(id?: string, event?: Event): void {
    this.dialogController?.closeDialog(id, event)
  }

  /** Закрывает все registry dialogs текущего Root. */
  closeDialogs(event?: Event): void {
    this.dialogController?.closeDialogs(event)
  }

  /** Обновляет открытый registry dialog без пересоздания controller. */
  updateDialog(id: string, patch: DialogProps & Record<string, unknown>): void {
    this.dialogController?.updateDialog(id, patch)
  }

  /** Возвращает ids открытых registry dialogs. */
  getOpenDialogIds(): Array<string> {
    return this.dialogController?.getOpenDialogIds() ?? []
  }

  /** Регистрирует overlay definitions из дочернего Overlays source. */
  registerOverlayDefinitions(sourceId: string, definitions: Array<OverlayDefinition>): void {
    this.ensureOverlayController().registerDefinitions(sourceId, definitions)
  }

  /** Удаляет overlay definitions дочернего Overlays source. */
  unregisterOverlayDefinitions(sourceId: string): void {
    this.overlayController?.unregisterDefinitions(sourceId)
  }

  /** Открывает registry overlay через единый overlay-controller. */
  openOverlay(input: OverlayInput, payload?: Record<string, unknown>): string {
    return this.ensureOverlayController().openOverlay(input, payload)
  }

  /** Закрывает registry overlay по id или верхний overlay. */
  closeOverlay(id?: string, event?: Event): void {
    this.overlayController?.closeOverlay(id, event)
  }

  /** Закрывает все registry overlays текущего Root. */
  closeOverlays(event?: Event): void {
    this.overlayController?.closeOverlays(event)
  }

  /** Обновляет открытый registry overlay без пересоздания controller. */
  updateOverlay(id: string, patch: OverlayProps & Record<string, unknown>): void {
    this.overlayController?.updateOverlay(id, patch)
  }

  /** Возвращает ids открытых registry overlays. */
  getOpenOverlayIds(): Array<string> {
    return this.overlayController?.getOpenOverlayIds() ?? []
  }

  /** Делегирует pointer tracking controller-у, создавая его только для tooltip targets. */
  handleTooltipPointerMove(event: MouseEvent): void {
    if (!this.tooltipController && !this.hasTooltipTargetAt(event)) return
    this.ensureTooltipController().handlePointerMove(event)
  }

  /**
   * Обновляет runtime-состояние Root.
   */
  update(): void {
    this.refreshStyleTokensIfNeeded()
    this.refreshMediaCascadeIfNeeded()
    if (!this.layoutDirty) return

    const padding = resolveSpacing(this.props.padding)
    const nextRect = {
      x: padding.left,
      y: padding.top,
      width: Math.max(0, this.width - padding.left - padding.right),
      height: Math.max(0, this.height - padding.top - padding.bottom),
    }

    if (!rectEquals(this.childRect, nextRect)) {
      copyRect(this.childRect, nextRect)
    }

    if (this.width > 0 && this.height > 0) {
      for (const child of this.managedChildren) {
        if (!isNovaUiLayoutDisplayed(child)) continue
        const layout = resolveNovaUiPositionedLayout(child)
        const measured = isNovaUiLayoutTarget(child) && child.measureLayout
          ? child.measureLayout({ minWidth: 0, maxWidth: Number.MAX_SAFE_INTEGER, minHeight: 0, maxHeight: Number.MAX_SAFE_INTEGER })
          : undefined
        const rect = isNovaUiOutOfFlowPosition(layout.position)
          ? resolveNovaUiPositionedRect(
            this.childRect,
            { x: child.x, y: child.y, width: measured?.width ?? child.width, height: measured?.height ?? child.height },
            layout,
            child,
          )
          : this.childRect
        const changed = applyNodeLayoutRect(child, rect)
        if (changed) child.dirty({ update: true, render: true })
      }
    }

    this.tooltipController?.syncRootRect(this.width, this.height)
    this.dialogController?.syncRootRect(this.width, this.height)
    this.syncPortalSurfaces()
    this.layoutDirty = false
  }

  /**
   * Выполняет отрисовку Root.
   */
  render(): void {
    const schema = []

    if (this.props.background) {
      schema.push({
        type: 'rect' as const,
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        styles: {
          background: this.props.background,
        },
      })
    }

    if (this.props.border?.width) {
      schema.push({
        type: 'border' as const,
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        styles: {
          color: this.props.border.color ?? '#d6d9e2',
          width: this.props.border.width,
          radius: borderRadiusToRendererValue(this.props.border.radius),
        },
      })
    }

    if (this.props.clip) this.renderer.clip(0, 0, this.width, this.height)
    if (schema.length > 0) this.renderer.schema(schema)
  }

  /**
   * Обрабатывает входящее событие Root.
   */
  protected override onPropsChanged(changedKeys: Array<keyof RootResolvedProps>): void {
    this.props = normalizeRootProps(this.props)
    this.applyDisplayState()
    if (hasRootLayoutChanges(changedKeys)) this.layoutDirty = true
    if (!this.externalLayout && hasRootGeometryChanges(changedKeys)) {
      this.applyResolvedRect({
        x: this.props.x,
        y: this.props.y,
        width: this.props.width,
        height: this.props.height,
      })
    }
    if (changedKeys.includes('styleSheet')) {
      this.setStyleSheetSource(this.props.styleSheet)
    }
    if (changedKeys.includes('className') || changedKeys.includes('attrs') || changedKeys.includes('display')) {
      bumpNovaUiStyleSheetVersion(this.nova)
    }
    if (changedKeys.includes('style')) {
      const previous = this.effectiveStyleContext
      this.effectiveStyleContext = mergeStyleContext(EMPTY_STYLE_CONTEXT, this.props.style)
      this.propagateStyleContext(styleContextChangedMask(previous, this.effectiveStyleContext))
    }
    if (changedKeys.includes('cursor') || changedKeys.includes('cursorContext')) {
      this.options({
        cursor: this.props.cursor ?? null,
        cursorContext: this.props.cursorContext ?? null,
      })
    }
  }

  /**
   * Применяет подготовленное состояние Root.
   */
  private applyResolvedRect(rect: NovaUiLayoutRect): boolean {
    if (rectEquals(this.ownRect, rect)) return false

    copyRect(this.ownRect, rect)
    super.options({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      cursor: this.props.cursor ?? null,
      cursorContext: this.props.cursorContext ?? null,
    })
    this.tooltipController?.syncRootRect(rect.width, rect.height)
    this.overlayController?.syncRootRect(rect.width, rect.height)
    this.dialogController?.syncRootRect(rect.width, rect.height)
    this.syncPortalSurfaces()
    this.layoutDirty = true
    this.dirty({ update: true, matrix: true, render: true })
    return true
  }

  /** Создает единственный controller tooltip-ов для текущего Root. */
  private ensureTooltipController(): RootTooltipControllerNode<E> {
    if (!this.tooltipController) {
      const surface = this.ensurePortalSurface('tooltip', 50_000)
      this.tooltipController = new RootTooltipControllerNode(this.nova, surface, this)
      surface.addChild(this.tooltipController)
      this.tooltipController.syncRootRect(this.width, this.height)
    }
    return this.tooltipController
  }

  /** Создает единственный controller диалогов для текущего Root. */
  private ensureDialogController(): RootDialogControllerNode<E> {
    if (!this.dialogController) {
      const surface = this.ensurePortalSurface('dialog', 30_000)
      this.dialogController = new RootDialogControllerNode(this.nova, surface, this)
      surface.addChild(this.dialogController)
      this.dialogController.syncRootRect(this.width, this.height)
    }
    return this.dialogController
  }

  /** Создает единственный controller overlays для текущего Root. */
  private ensureOverlayController(): RootOverlayControllerNode<E> {
    if (!this.overlayController) {
      const surface = this.ensurePortalSurface('overlay', 40_000)
      this.overlayController = new RootOverlayControllerNode(this.nova, surface, this)
      surface.addChild(this.overlayController)
      this.overlayController.syncRootRect(this.width, this.height)
    }
    return this.overlayController
  }

  /** Создает отдельный top-level surface для portal-контроллеров. */
  private ensurePortalSurface(kind: 'dialog' | 'overlay' | 'tooltip', zIndex: number): NovaSurface<E> {
    const current = kind === 'dialog'
      ? this.dialogSurface
      : kind === 'overlay'
        ? this.overlaySurface
        : this.tooltipSurface
    if (current) {
      current.options({ width: this.width, height: this.height, zIndex, interactive: false })
      return current
    }

    const surface = this.nova.createSurface(`${this.componentId}:nova-ui-${kind}-portal`)
    surface.options({
      width: this.width,
      height: this.height,
      zIndex,
      interactive: false,
    })

    if (kind === 'dialog') this.dialogSurface = surface
    else if (kind === 'overlay') this.overlaySurface = surface
    else this.tooltipSurface = surface

    return surface
  }

  /** Синхронизирует portal-surfaces с размером Root. */
  private syncPortalSurfaces(): void {
    this.dialogSurface?.options({ width: this.width, height: this.height })
    this.overlaySurface?.options({ width: this.width, height: this.height })
    this.tooltipSurface?.options({ width: this.width, height: this.height })
  }

  /** Проверяет наличие tooltip target до создания overlay controller. */
  private hasTooltipTargetAt(event: MouseEvent): boolean {
    const { x, y } = this.nova.events.getCanvasMousePosition(event)
    const target = this.nova.events.hitTest(x, y)

    if (!target || target === this || target === this.tooltipController) return false

    const visited = new Set<NovaNode<E>>()
    let current: NovaNode<E> | undefined = target
    while (current) {
      if (visited.has(current)) return false
      visited.add(current)
      if (current === this || current === this.tooltipController) return false

      const resolver = current as NovaNode<E> & Partial<NovaTooltipTargetResolver>
      if (resolver.resolveNovaTooltipTarget?.({ x, y, event })?.tooltip) return true

      const api = (current as unknown as { getProps?: () => Record<string, unknown> }).getProps
      const tooltip = typeof api === 'function'
        ? api.call(current).tooltip as TooltipInput
        : null

      if (tooltip && typeof tooltip !== 'boolean') return true

      current = current.parent as NovaNode<E> | undefined
    }

    return false
  }

  /**
   * Синхронизирует актуальное состояние Root.
   */
  private refreshCombinedStyleSheet(): void {
    const globalAsset = getNovaUiGlobalStyleSheet(this.nova)
    const builtInStyleSheet = getNovaUiBuiltInUtilityStyleSheet()
    const activeThemeId = this.nova.theme.active()
    const globalThemeStyleSheet = resolveActiveNovaUiThemeStyleSheet(globalAsset, activeThemeId)
    const localThemeStyleSheet = resolveActiveNovaUiThemeStyleSheet(this.localStyleSheetAsset, activeThemeId)
    const styleSheets = [
      builtInStyleSheet,
      globalAsset.styleSheet,
      globalThemeStyleSheet,
      this.localRawStyleSheet,
      localThemeStyleSheet,
    ].filter((sheet): sheet is NovaUiCompiledStyleSheet => !!sheet)

    this.rawStyleSheet = mergeNovaUiStyleSheets(styleSheets, [
      builtInStyleSheet.source,
      globalAsset.source,
      globalThemeStyleSheet?.source,
      this.localRawStyleSheet.source,
      localThemeStyleSheet?.source,
    ].filter(Boolean).join('\n'))
    this.activeThemeId = activeThemeId
    this.collectChangedResolvedTokens()
    this.styleSheet = this.resolveStyleSheetTokens(this.rawStyleSheet)
    bumpNovaUiStyleSheetVersion(this.nova)
    this.applyPlannedCascade()
  }

  /**
   * Синхронизирует актуальное состояние Root.
   */
  private refreshStyleTokensIfNeeded(): void {
    const version = this.tokenResolver?.version ?? null
    const activeThemeId = this.nova.theme.active()
    if (activeThemeId !== this.activeThemeId) {
      this.refreshCombinedStyleSheet()
      return
    }

    if (version === this.resolvedTokenVersion) return

    this.refreshStyleTokens()
  }

  /**
   * Нормализует и возвращает итоговое значение Root.
   */
  private resolveStyleSheetTokens(sheet: NovaUiCompiledStyleSheet): NovaUiCompiledStyleSheet {
    this.resolvedTokenVersion = this.tokenResolver?.version ?? null
    return resolveNovaUiStyleSheetTokens(sheet, this.tokenResolver)
  }

  /**
   * Применяет подготовленное состояние Root.
   */
  private applyCascade(): void {
    this.mediaSignature = getNovaUiStyleMediaSignature(this.styleSheet, this.getMediaContext())
    this.mediaContext = this.getMediaContext()
    this.traverseAll(node => {
      if (isStylableNode(node)) this.applyCascadeToNode(node)
    })

    const previous = this.effectiveStyleContext
    this.effectiveStyleContext = mergeStyleContext(EMPTY_STYLE_CONTEXT, this.props.style)
    this.propagateStyleContext(styleContextChangedMask(previous, this.effectiveStyleContext) || NovaUiStyleMask.AllText)
    this.layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  /**
   * Применяет selector cascade через indexed invalidation plan.
   */
  private applyPlannedCascade(): void {
    const registry = createNovaUiStyleIdentityRegistry(this)
    const nextGraph = createNovaUiStyleSheetGraph(this.styleSheet)
    const plan = planNovaUiStyleSheetInvalidation(this.styleSheetGraph, nextGraph, registry, {
      candidateFallbackThreshold: this.styleCandidateFallbackThreshold,
    })
    this.styleSheetGraph = nextGraph
    this.applyCascadePlan(plan)
  }

  /**
   * Применяет selector cascade только для candidates или включает safe full fallback.
   */
  private applyCascadePlan(plan: NovaUiStyleInvalidationPlan): void {
    if (plan.fallback) {
      this.applyCascade()
      return
    }

    this.mediaSignature = getNovaUiStyleMediaSignature(this.styleSheet, this.getMediaContext())
    this.mediaContext = this.getMediaContext()
    for (const node of plan.candidates) {
      this.applyCascadeToNode(node)
    }

    const previous = this.effectiveStyleContext
    this.effectiveStyleContext = mergeStyleContext(EMPTY_STYLE_CONTEXT, this.props.style)
    this.propagateStyleContext(styleContextChangedMask(previous, this.effectiveStyleContext))
    this.layoutDirty = true
    if (plan.candidates.size > 0 || plan.changedTokens.size > 0 || plan.changedRuleCount > 0 || plan.changedMediaAtoms.size > 0) {
      this.dirty({ update: true, render: true })
    }
  }

  /**
   * Применяет подготовленное состояние Root.
   */
  private applyCascadeToNode(node: NovaUiStylableNode): void {
    const rules = matchStyleRules(node, this.styleSheet, this.getMediaContext())
    const utilityDeclarations = resolveNovaUiClassUtilities(readNovaUiNodeProps(node).className)
    const declarations = mergeStyleDeclarations(utilityDeclarations, mergeRuleDeclarations(rules))
    const patch = this.createCascadePatch(node, declarations)
    setNovaUiNodeLayoutIntent(node, declarations.layout)
    if (declarations.layout) this.markLayoutAncestorsDirty(node)
    if (!patch) return

    node.setProps(patch)
    if ('display' in patch) this.markLayoutAncestorsDirty(node)
  }

  /**
   * Создает runtime-сущность Root.
   */
  private createCascadePatch(
    node: NovaUiStylableNode,
    declarations: NovaUiStyleDeclarations,
  ): Record<string, unknown> | null {
    const state = this.resolveAppliedState(node)
    const patch: Record<string, unknown> = {}
    const nextKeys = new Set<string>()

    if (declarations.inheritedText && Object.keys(declarations.inheritedText).length > 0) {
      nextKeys.add('style')
      patch.style = {
        ...readBaselineValue<Record<string, unknown>>(state, 'style', {}),
        ...declarations.inheritedText,
      }
    }
    if (declarations.box?.background !== undefined) {
      nextKeys.add('background')
      patch.background = declarations.box.background
    }
    if (declarations.box?.opacity !== undefined) {
      nextKeys.add('opacity')
      patch.opacity = declarations.box.opacity
    }
    if (declarations.box?.border !== undefined) {
      nextKeys.add('border')
      patch.border = {
        ...readBaselineValue<Record<string, unknown>>(state, 'border', {}),
        ...declarations.box.border,
      }
    }
    if (declarations.box?.clip !== undefined) {
      nextKeys.add('clip')
      patch.clip = declarations.box.clip
    }
    if (declarations.spacing?.padding !== undefined) {
      nextKeys.add('padding')
      patch.padding = declarations.spacing.padding
    }
    if (declarations.spacing?.margin !== undefined) {
      nextKeys.add('margin')
      patch.margin = declarations.spacing.margin
    }
    if (declarations.layout?.display !== undefined) {
      nextKeys.add('display')
      patch.display = declarations.layout.display
    }
    if (declarations.cursor !== undefined) {
      nextKeys.add('cursor')
      patch.cursor = declarations.cursor
    }
    if (declarations.animation !== undefined) {
      this.applyKeyframeAnimation(node, declarations.animation)
    }
    if (supportsLayoutDeclarations(node)) {
      for (const key of ['gap', 'rowGap', 'columnGap'] as const) {
        const value = declarations.layout?.[key]
        if (value === undefined) continue
        nextKeys.add(key)
        patch[key] = value
      }
    }
    if (declarations.visual) {
      for (const key of [
        'accentColor',
        'trackColor',
        'thumbColor',
        'hoverBackground',
        'pressedBackground',
        'activeBackground',
        'disabledOpacity',
        'placeholderColor',
      ] as const) {
        const value = declarations.visual[key]
        if (value === undefined) continue
        nextKeys.add(key)
        patch[key] = value
      }
    }

    for (const key of state.keys) {
      if (nextKeys.has(key)) continue
      patch[key] = fallbackCascadeValue(key, state.baseline[key])
    }

    state.keys = nextKeys
    return Object.keys(patch).length > 0 ? patch : null
  }

  /**
   * Запускает class/keyframes animation один раз на стабильную signature.
   */
  private applyKeyframeAnimation(
    node: NovaUiStylableNode,
    animation: NonNullable<NovaUiStyleDeclarations['animation']>,
  ): void {
    const keyframes = this.styleSheet.keyframes.get(animation.name)
    if (!keyframes || keyframes.frames.length < 2) return

    const first = keyframes.frames[0]?.declarations
    const last = keyframes.frames[keyframes.frames.length - 1]?.declarations
    if (!first || !last) return

    const signature = `${animation.name}:${animation.duration ?? 180}:${animation.delay ?? 0}:${animation.easing ?? 'outCubic'}`
    const persistentKey = node.componentId
    if (this.appliedAnimationSignatures.get(persistentKey) === signature) return
    const current = this.appliedAnimations.get(node)
    if (current?.signature === signature) return
    current?.playback.cancel()

    const from = resolveAnimationPatch(first)
    const to = resolveAnimationPatch(last)
    if (Object.keys(from).length === 0 && Object.keys(to).length === 0) return

    const playback = this.nova.motion.to(node, to, {
      from,
      duration: animation.duration ?? 180,
      delay: animation.delay ?? 0,
      easing: animation.easing ?? 'outCubic',
    })
    this.appliedAnimations.set(node, { signature, playback })
    this.appliedAnimationSignatures.set(persistentKey, signature)
  }

  /**
   * Нормализует и возвращает итоговое значение Root.
   */
  private resolveAppliedState(node: NovaUiStylableNode): AppliedCascadeState {
    const existing = this.appliedCascade.get(node)
    if (existing) return existing

    const props = node.getProps() as Record<string, unknown>
    const state: AppliedCascadeState = {
      baseline: {
        style: props.style,
        background: props.background,
        opacity: props.opacity,
        border: props.border,
        clip: props.clip,
        padding: props.padding,
        margin: props.margin,
        display: props.display,
        gap: props.gap,
        rowGap: props.rowGap,
        columnGap: props.columnGap,
        accentColor: props.accentColor,
        trackColor: props.trackColor,
        thumbColor: props.thumbColor,
        hoverBackground: props.hoverBackground,
        pressedBackground: props.pressedBackground,
        activeBackground: props.activeBackground,
        disabledOpacity: props.disabledOpacity,
        cursor: props.cursor,
        cursorContext: props.cursorContext,
      },
      keys: new Set(),
    }
    this.appliedCascade.set(node, state)
    return state
  }

  /**
   * Синхронизирует актуальное состояние Root.
   */
  private refreshMediaCascadeIfNeeded(): void {
    const nextContext = this.getMediaContext()
    const nextSignature = getNovaUiStyleMediaSignature(this.styleSheet, nextContext)
    if (nextSignature === this.mediaSignature) return

    bumpNovaUiStyleSheetVersion(this.nova)
    const registry = createNovaUiStyleIdentityRegistry(this)
    const graph = this.styleSheetGraph ?? createNovaUiStyleSheetGraph(this.styleSheet)
    this.styleSheetGraph = graph
    this.applyCascadePlan(planNovaUiMediaInvalidation(graph, registry, this.mediaContext, nextContext, {
      candidateFallbackThreshold: this.styleCandidateFallbackThreshold,
    }))
  }

  /**
   * Возвращает значение состояния Root.
   */
  private getMediaContext(): { width: number; height: number } {
    return {
      width: this.width,
      height: this.height,
    }
  }

  /**
   * Сравнивает resolved CSS token values и возвращает только реально изменившиеся atoms.
   */
  private collectChangedResolvedTokens(): Array<string> {
    const dependencies = this.rawStyleSheet.tokenDependencies ?? []
    if (!this.tokenResolver || dependencies.length === 0) {
      this.resolvedTokenValues.clear()
      return []
    }

    const changed: Array<string> = []
    const nextTokens = new Set(dependencies)
    for (const token of dependencies) {
      const nextValue = this.tokenResolver.resolve(token, '') ?? ''
      if (this.resolvedTokenValues.has(token) && this.resolvedTokenValues.get(token) !== nextValue) {
        changed.push(token)
      }
      this.resolvedTokenValues.set(token, nextValue)
    }

    for (const token of [...this.resolvedTokenValues.keys()]) {
      if (!nextTokens.has(token)) this.resolvedTokenValues.delete(token)
    }
    return changed
  }

  /**
   * Применяет подготовленное состояние Root.
   */
  private applyDisplayState(): void {
    const displayed = this.props.display !== 'none'
    this.visible = displayed
    this.active = displayed
  }

  /**
   * Выполняет внутренний шаг markLayoutAncestorsDirty для Root.
   */
  private markLayoutAncestorsDirty(node: { parent?: unknown }): void {
    relayoutNovaUiLayoutAncestors(node)
  }

  /**
   * Выполняет внутренний шаг propagateStyleContext для Root.
   */
  private propagateStyleContext(changedMask: NovaUiStyleMask): NovaUiStyleReceiveResult {
    const result: NovaUiStyleReceiveResult = {
      update: false,
      render: false,
      layout: false,
    }
    if (changedMask === NovaUiStyleMask.None) return result

    for (const child of this.children) {
      if (!isNovaUiStyleTarget(child)) continue

      const childMask = child.getSubtreeStyleMask()
      if ((changedMask & childMask) === 0) continue

      const childResult = child.receiveStyleContext(this.effectiveStyleContext, changedMask & childMask)
      result.update ||= childResult.update
      result.render ||= childResult.render
      result.layout ||= childResult.layout
    }

    return result
  }

  /**
   * Освобождает runtime-ресурсы и подписки Root.
   */
  override dispose(): void {
    this.disposeGlobalStylesSubscription()
    for (const surface of [this.dialogSurface, this.overlaySurface, this.tooltipSurface]) {
      if (surface) this.nova.removeSurface(surface)
    }
    this.dialogSurface = null
    this.overlaySurface = null
    this.tooltipSurface = null
    this.dialogController = null
    this.overlayController = null
    this.tooltipController = null
    super.dispose()
  }

}

function mergeRuleDeclarations(rules: ReturnType<typeof matchStyleRules>): NovaUiStyleDeclarations {
  return rules.reduce<NovaUiStyleDeclarations>((target, rule) => {
    const source = rule.declarations
    const pseudoState = rule.selector.parts[rule.selector.parts.length - 1]?.pseudos[0]
    if (pseudoState && source.cursor !== undefined) {
      target.cursor = mergeCursorDeclaration(target.cursor, source.cursor, pseudoState)
    }
    if (pseudoState) {
      return target
    }

    target.inheritedText = {
      ...target.inheritedText,
      ...source.inheritedText,
    }
    target.box = {
      ...target.box,
      ...source.box,
      border: {
        ...target.box?.border,
        ...source.box?.border,
      },
    }
    target.spacing = {
      ...target.spacing,
      ...source.spacing,
    }
    target.layout = {
      ...target.layout,
      ...source.layout,
    }
    target.visual = {
      ...target.visual,
      ...source.visual,
    }
    if (source.cursor !== undefined) target.cursor = source.cursor
    if (source.animation !== undefined) target.animation = source.animation
    target.mask |= source.mask
    return target
  }, { mask: NovaUiStyleMask.None })
}

function mergeStyleDeclarations(...items: Array<NovaUiStyleDeclarations>): NovaUiStyleDeclarations {
  return items.reduce<NovaUiStyleDeclarations>((target, source) => {
    target.inheritedText = {
      ...target.inheritedText,
      ...source.inheritedText,
    }
    target.box = {
      ...target.box,
      ...source.box,
      border: {
        ...target.box?.border,
        ...source.box?.border,
      },
    }
    target.spacing = {
      ...target.spacing,
      ...source.spacing,
    }
    target.layout = {
      ...target.layout,
      ...source.layout,
    }
    target.visual = {
      ...target.visual,
      ...source.visual,
    }
    if (source.cursor !== undefined) target.cursor = source.cursor
    if (source.animation !== undefined) target.animation = source.animation
    target.mask |= source.mask
    return target
  }, { mask: NovaUiStyleMask.None })
}

function resolveAnimationPatch(declarations: NovaUiStyleKeyframeDeclaration): Record<string, number> {
  const patch: Record<string, number> = {}
  if (declarations.opacity !== undefined) patch.opacity = declarations.opacity
  if (declarations.scaleX !== undefined) patch.scaleX = declarations.scaleX
  if (declarations.scaleY !== undefined) patch.scaleY = declarations.scaleY
  return patch
}

function mergeCursorDeclaration(
  target: NovaCursorDeclaration | undefined,
  source: NovaCursorDeclaration,
  state: string,
): NovaCursorDeclaration {
  if (Array.isArray(source)) return source
  const base = normalizeCursorStateMap(target)
  if (isCursorStateName(state) && isCursorValue(source)) {
    base[state] = source
  }
  return base
}

function normalizeCursorStateMap(source: NovaCursorDeclaration | undefined): NovaCursorStateMap {
  if (!source) return {}
  if (Array.isArray(source)) return {}
  if (isCursorValue(source)) {
    return { default: source }
  }
  return { ...source }
}

function isCursorValue(source: NovaCursorDeclaration): source is NovaCursorValue {
  return typeof source === 'string' || (!!source && typeof source === 'object' && !Array.isArray(source) && 'type' in source)
}

function isCursorStateName(value: string): value is Exclude<keyof NovaCursorStateMap, 'default'> {
  return value === 'hover' || value === 'pressed' || value === 'dragging' || value === 'disabled'
}

function readBaselineValue<T>(state: AppliedCascadeState, key: string, fallback: T): T {
  return state.baseline[key] === undefined ? fallback : state.baseline[key] as T
}

function fallbackCascadeValue(key: string, value: unknown): unknown {
  if (value !== undefined) return value
  if (key === 'style') return {}
  if (key === 'background') return ''
  if (key === 'opacity') return 1
  if (key === 'border') return { width: 0 }
  if (key === 'clip') return false
  if (key === 'padding') return 0
  if (key === 'margin') return 0
  if (key === 'display') return 'normal'
  if (key === 'gap' || key === 'rowGap' || key === 'columnGap') return 0
  if (key === 'disabledOpacity') return 0.45
  if (key === 'cursor') return null
  if (key === 'cursorContext') return null
  if (
    key === 'accentColor'
    || key === 'trackColor'
    || key === 'thumbColor'
    || key === 'hoverBackground'
    || key === 'pressedBackground'
    || key === 'activeBackground'
    || key === 'placeholderColor'
  ) return ''
  return value
}

function supportsLayoutDeclarations(node: NovaUiStylableNode): boolean {
  return node.descriptor.name === 'Root' || node.descriptor.name === 'Flex' || node.descriptor.name === 'Grid'
}

function isStylableNode(node: unknown): node is NovaUiStylableNode {
  return !!node
    && typeof node === 'object'
    && 'descriptor' in node
    && 'componentId' in node
    && 'setProps' in node
}

function hasRootGeometryChanges(keys: Array<keyof RootResolvedProps>): boolean {
  return keys.includes('x') || keys.includes('y') || keys.includes('width') || keys.includes('height')
}

function hasRootLayoutChanges(keys: Array<keyof RootResolvedProps>): boolean {
  return keys.includes('width') || keys.includes('height') || keys.includes('padding') || keys.includes('display')
}

function resolveActiveNovaUiThemeStyleSheet(
  asset: NovaUiStyleSheetAsset | null,
  activeThemeId: string | null,
): NovaUiCompiledStyleSheet | null {
  if (!asset || !activeThemeId) return null
  const styleSheets = (asset.themes ?? [])
    .filter(theme => theme.id === activeThemeId)
    .map(theme => theme.styleSheet)
    .filter((sheet): sheet is NovaUiCompiledStyleSheet => !!sheet)
  if (styleSheets.length === 0) return null
  if (styleSheets.length === 1) return styleSheets[0] ?? null

  return mergeNovaUiStyleSheets(styleSheets, styleSheets.map(sheet => sheet.source).filter(Boolean).join('\n'))
}
