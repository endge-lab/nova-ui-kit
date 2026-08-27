import type { NovaApp, NovaCursorDeclaration, NovaCursorStateMap, NovaCursorValue, NovaMotionPlayback, NovaNode, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type {
  DialogDefinition,
  DialogInput,
  DialogProps,
} from '@/components/Dialog/dialog.types'
import type {
  OverlayDefinition,
  OverlayInput,
  OverlayProps,
} from '@/components/Overlay/overlay.types'
import type { NovaUiRootTarget } from '@/components/Root/root-target'
import type { RootDescriptor } from '@/components/Root/root.config'
import type {
  RootApi,
  RootChildSchema,
  RootProps,
  RootResolvedProps,
} from '@/components/Root/root.types'
import type {
  NovaTooltipTargetResolver,
  TooltipDefinition,
  TooltipInput,
} from '@/components/Tooltip/tooltip.types'
import type { NovaUiLayoutRect, NovaUiLayoutTarget } from '@/shared/layout'
import type { NovaUiCompiledStyleSheet, NovaUiStylableNode, NovaUiStyleDeclarations, NovaUiStyleInspectionDebug, NovaUiStyleInvalidationPlan, NovaUiStyleKeyframeDeclaration, NovaUiStyleMediaContext, NovaUiStyleReceiveResult, NovaUiStyleSheetAsset, NovaUiStyleSheetGraph, NovaUiStyleTokenResolver, NovaUiStyleValidationResult } from '@/shared/style'
import {

  NovaComponentNode,

  reconcileNovaTemplateChildren,
} from '@endge/nova'
import { RootDialogControllerNode } from '@/components/Dialog/RootDialogControllerNode'
import { RootOverlayControllerNode } from '@/components/Overlay/RootOverlayControllerNode'
import {
  NOVA_UI_ROOT_TARGET,

} from '@/components/Root/root-target'
import {
  normalizeRootProps,
  ROOT_NODE_DESCRIPTOR,

} from '@/components/Root/root.config'
import { RootTooltipControllerNode } from '@/components/Tooltip/RootTooltipControllerNode'
import {
  applyNodeLayoutRect,
  copyRect,
  createLayoutRect,
  isNovaUiLayoutDisplayed,
  isNovaUiLayoutTarget,
  isNovaUiOutOfFlowPosition,
  NOVA_UI_LAYOUT_TARGET,

  readNovaUiNodeProps,
  rectEquals,
  relayoutNovaUiLayoutAncestors,
  resolveNovaUiPositionedLayout,
  resolveNovaUiPositionedRect,
  resolveSpacing,
  setNovaUiNodeLayoutIntent,
} from '@/shared/layout'
import {
  borderRadiusToRendererValue,
  bumpNovaUiStyleSheetVersion,
  bumpNovaUiStyleTokenVersions,
  createEmptyStyleSheet,
  createEmptyStyleSheetValidationResult,
  createNovaUiStyleIdentityRegistry,
  createNovaUiStyleSheetGraph,
  EMPTY_STYLE_CONTEXT,
  getNovaUiBuiltInUtilityStyleSheet,
  getNovaUiGlobalStyleSheet,
  getNovaUiStyleMediaSignature,
  isNovaUiStyleSheetAsset,
  isNovaUiStyleTarget,
  matchStyleRules,
  mergeNovaUiStyleSheets,
  mergeStyleContext,

  NovaUiStyleMask,

  planNovaUiMediaInvalidation,
  planNovaUiStyleSheetInvalidation,
  resolveNovaUiClassUtilities,
  resolveNovaUiStyleSheetTokens,
  styleContextChangedMask,
  subscribeNovaUiGlobalStyleSheets,
  validateNovaUiStyleSheetSource,
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

  private readonly _ownRect = createLayoutRect()
  private readonly _childRect = createLayoutRect()
  private readonly _managedChildren: Array<NovaNode<E>> = []
  private readonly _appliedCascade = new WeakMap<NovaUiStylableNode, AppliedCascadeState>()
  private readonly _appliedAnimations = new WeakMap<NovaUiStylableNode, { signature: string, playback: NovaMotionPlayback }>()
  private readonly _appliedAnimationSignatures = new Map<string, string>()
  private readonly _api: RootApi
  private _layoutDirty = true
  private _externalLayout = false
  private _styleSheet: NovaUiCompiledStyleSheet = createEmptyStyleSheet()
  private _styleSheetGraph: NovaUiStyleSheetGraph | null = null
  private _localStyleSheetAsset: NovaUiStyleSheetAsset | null = null
  private _localRawStyleSheet: NovaUiCompiledStyleSheet = createEmptyStyleSheet()
  private _rawStyleSheet: NovaUiCompiledStyleSheet = createEmptyStyleSheet()
  private _validation: NovaUiStyleValidationResult = createEmptyStyleSheetValidationResult()
  private _effectiveStyleContext = EMPTY_STYLE_CONTEXT
  private _tokenResolver: NovaUiStyleTokenResolver | null = null
  private _resolvedTokenVersion: number | null = null
  private readonly _resolvedTokenValues = new Map<string, string>()
  private readonly _styleCandidateFallbackThreshold = 2_048
  private _activeThemeId: string | null = null
  private _mediaSignature = ''
  private _mediaContext: NovaUiStyleMediaContext = { width: 0, height: 0 }
  private _tooltipController: RootTooltipControllerNode<E> | null = null
  private _dialogController: RootDialogControllerNode<E> | null = null
  private _overlayController: RootOverlayControllerNode<E> | null = null
  private _tooltipSurface: NovaSurface<E> | null = null
  private _dialogSurface: NovaSurface<E> | null = null
  private _overlaySurface: NovaSurface<E> | null = null
  private readonly _disposeGlobalStylesSubscription: () => void

  /**
   * Создает экземпляр Root и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: RootProps = {},
    options: { componentId?: string, children?: Array<RootChildSchema> } = {},
    descriptor: RootDescriptor = ROOT_NODE_DESCRIPTOR,
  ) {
    ensureNovaUIKitThemes(app)
    const resolvedProps = normalizeRootProps(props)
    super(app, surface, descriptor, resolvedProps, options)
    this.__type = 'Root'
    this.layoutReady = false
    this._applyDisplayState()
    this._api = {
      setStyleSheetSource: source => this.setStyleSheetSource(source),
      setStyleSheetAsset: asset => this.setStyleSheetAsset(asset),
      resetStyleSheet: () => this.resetStyleSheet(),
      refreshStyleTokens: () => this.refreshStyleTokens(),
      setStyleTokenResolver: resolver => this.setStyleTokenResolver(resolver),
      validateStyleSheet: source => validateNovaUiStyleSheetSource(source),
      setChildren: children => this.setChildren(children),
      getValidation: () => this._validation,
      getDiagnostics: () => this._validation.diagnostics,
      getStyleSheetSource: () => this.getStyleSheetSource(),
      getCompiledStyleSheet: () => this._styleSheet,
      getStyleMediaContext: () => this._getMediaContext(),
      inspectStyleNode: node => this.inspectStyleNode(node),
      relayout: () => this.relayout(),
      getChildRect: () => this._childRect,
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
    this._tokenResolver = app.theme.createTokenResolver()
    this.addDisposer(app.theme.observe(this, { phase: 'update' }))
    this._disposeGlobalStylesSubscription = subscribeNovaUiGlobalStyleSheets(app, () => {
      this._refreshCombinedStyleSheet()
    })
    this._applyResolvedRect({
      x: resolvedProps.x,
      y: resolvedProps.y,
      width: resolvedProps.width,
      height: resolvedProps.height,
    })
    this.options({
      cursor: resolvedProps.cursor ?? null,
      cursorContext: resolvedProps.cursorContext ?? null,
    })
    this._effectiveStyleContext = mergeStyleContext(EMPTY_STYLE_CONTEXT, resolvedProps.style)
    this.setStyleSheetSource(resolvedProps.styleSheet)
    const handleTooltipPointerMove = (event: MouseEvent) => this.handleTooltipPointerMove(event)
    const handleTooltipPointerLeave = () => this._tooltipController?.handlePointerLeave()
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
    return this._api
  }

  /** Принимает итоговый rect от внешнего runtime и запускает пересчет Root children. */
  applyLayoutRect(rect: NovaUiLayoutRect): boolean {
    this._externalLayout = true
    const changed = this._applyResolvedRect(rect)
    if (changed && this.layoutReady) {
      this.update()
    }
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

    this._validation = validation
    this._localRawStyleSheet = validation.ok && validation.styleSheet
      ? validation.styleSheet
      : createEmptyStyleSheet(source)
    this._localStyleSheetAsset = null
    this.props.styleSheet = source
    this._refreshCombinedStyleSheet()
  }

  /** Применяет precompiled stylesheet asset без повторного parse source. */
  setStyleSheetAsset(asset: NovaUiStyleSheetAsset): void {
    this._validation = {
      ok: asset.ok,
      styleSheet: asset.styleSheet,
      diagnostics: asset.diagnostics,
    }
    this._localRawStyleSheet = asset.ok && asset.styleSheet
      ? asset.styleSheet
      : createEmptyStyleSheet(asset.source)
    this._localStyleSheetAsset = asset
    this.props.styleSheet = asset
    this._refreshCombinedStyleSheet()
  }

  /** Обновляет token-resolved stylesheet после смены темы или token context. */
  refreshStyleTokens(): void {
    const changedTokens = this._collectChangedResolvedTokens()
    this._styleSheet = this._resolveStyleSheetTokens(this._rawStyleSheet)
    if (changedTokens.length > 0) {
      bumpNovaUiStyleTokenVersions(this.nova, changedTokens)
    }
    if (changedTokens.length > 0) {
      bumpNovaUiStyleSheetVersion(this.nova)
    }
    this._applyPlannedCascade()
  }

  /** Пере-применяет selector cascade после изменения вложенного template дерева. */
  refreshStyleCascade(): void {
    this._applyCascade()
  }

  /** Задает resolver theme/CSS tokens для Nova stylesheet. */
  setStyleTokenResolver(resolver: NovaUiStyleTokenResolver | null): void {
    this._tokenResolver = resolver
    this._resolvedTokenVersion = null
    this.refreshStyleTokens()
  }

  /** Сбрасывает selector stylesheet без пересоздания дерева. */
  resetStyleSheet(): void {
    this.setStyleSheetSource('')
  }

  /** Возвращает source активного stylesheet для debug-инспектора. */
  getStyleSheetSource(): string {
    return this._rawStyleSheet.source ?? ''
  }

  /** Возвращает trace selector cascade для выбранной UI Kit node. */
  inspectStyleNode(node: string | NovaUiStylableNode): NovaUiStyleInspectionDebug | null {
    const target = typeof node === 'string'
      ? this.nova.components.get(node)
      : node

    if (!isStylableNode(target)) {
      return null
    }

    const rules = matchStyleRules(target, this._styleSheet, this._getMediaContext())
    const state = this._resolveAppliedState(target)

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
      diagnostics: this._validation.diagnostics.map(item => ({ ...item })),
    }
  }

  /** Заменяет managed children и применяет layout/style одним проходом. */
  setChildren(children: Array<RootChildSchema>): void {
    const reconciled = reconcileNovaTemplateChildren(this, this._managedChildren, children)
    this._managedChildren.length = 0
    this._managedChildren.push(...reconciled.nodes)

    this._layoutDirty = true
    this._applyCascade()
    if (this.layoutReady) {
      this.update()
    }
    this.dirty({ update: true, render: true })
  }

  /** Принудительно помечает Root layout грязным без изменения props. */
  relayout(): void {
    this._layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  /** Регистрирует tooltip definitions из дочернего Tooltips source. */
  registerTooltipDefinitions(sourceId: string, definitions: Array<TooltipDefinition>): void {
    this._ensureTooltipController().registerDefinitions(sourceId, definitions)
  }

  /** Удаляет tooltip definitions дочернего Tooltips source. */
  unregisterTooltipDefinitions(sourceId: string): void {
    this._tooltipController?.unregisterDefinitions(sourceId)
  }

  /** Закрывает активный tooltip без ожидания pointer leave. */
  closeTooltip(options: { suppressMs?: number } = {}): void {
    this._tooltipController?.closeNow(options)
  }

  /** Регистрирует dialog definitions из дочернего Dialogs source. */
  registerDialogDefinitions(sourceId: string, definitions: Array<DialogDefinition>): void {
    this._ensureDialogController().registerDefinitions(sourceId, definitions)
  }

  /** Удаляет dialog definitions дочернего Dialogs source. */
  unregisterDialogDefinitions(sourceId: string): void {
    this._dialogController?.unregisterDefinitions(sourceId)
  }

  /** Открывает registry dialog через единый overlay-controller. */
  openDialog(input: DialogInput, payload?: Record<string, unknown>): string {
    return this._ensureDialogController().openDialog(input, payload)
  }

  /** Закрывает registry dialog по id или верхний dialog. */
  closeDialog(id?: string, event?: Event): void {
    this._dialogController?.closeDialog(id, event)
  }

  /** Закрывает все registry dialogs текущего Root. */
  closeDialogs(event?: Event): void {
    this._dialogController?.closeDialogs(event)
  }

  /** Обновляет открытый registry dialog без пересоздания controller. */
  updateDialog(id: string, patch: DialogProps & Record<string, unknown>): void {
    this._dialogController?.updateDialog(id, patch)
  }

  /** Возвращает ids открытых registry dialogs. */
  getOpenDialogIds(): Array<string> {
    return this._dialogController?.getOpenDialogIds() ?? []
  }

  /** Регистрирует overlay definitions из дочернего Overlays source. */
  registerOverlayDefinitions(sourceId: string, definitions: Array<OverlayDefinition>): void {
    this._ensureOverlayController().registerDefinitions(sourceId, definitions)
  }

  /** Удаляет overlay definitions дочернего Overlays source. */
  unregisterOverlayDefinitions(sourceId: string): void {
    this._overlayController?.unregisterDefinitions(sourceId)
  }

  /** Открывает registry overlay через единый overlay-controller. */
  openOverlay(input: OverlayInput, payload?: Record<string, unknown>): string {
    return this._ensureOverlayController().openOverlay(input, payload)
  }

  /** Закрывает registry overlay по id или верхний overlay. */
  closeOverlay(id?: string, event?: Event): void {
    this._overlayController?.closeOverlay(id, event)
  }

  /** Закрывает все registry overlays текущего Root. */
  closeOverlays(event?: Event): void {
    this._overlayController?.closeOverlays(event)
  }

  /** Обновляет открытый registry overlay без пересоздания controller. */
  updateOverlay(id: string, patch: OverlayProps & Record<string, unknown>): void {
    this._overlayController?.updateOverlay(id, patch)
  }

  /** Возвращает ids открытых registry overlays. */
  getOpenOverlayIds(): Array<string> {
    return this._overlayController?.getOpenOverlayIds() ?? []
  }

  /** Делегирует pointer tracking controller-у, создавая его только для tooltip targets. */
  handleTooltipPointerMove(event: MouseEvent): void {
    if (!this._tooltipController && !this._hasTooltipTargetAt(event)) {
      return
    }
    this._ensureTooltipController().handlePointerMove(event)
  }

  /**
   * Обновляет runtime-состояние Root.
   */
  update(): void {
    this._refreshStyleTokensIfNeeded()
    this._refreshMediaCascadeIfNeeded()
    if (!this._layoutDirty) {
      return
    }

    const padding = resolveSpacing(this.props.padding)
    const nextRect = {
      x: padding.left,
      y: padding.top,
      width: Math.max(0, this.width - padding.left - padding.right),
      height: Math.max(0, this.height - padding.top - padding.bottom),
    }

    if (!rectEquals(this._childRect, nextRect)) {
      copyRect(this._childRect, nextRect)
    }

    if (this.width > 0 && this.height > 0) {
      for (const child of this._managedChildren) {
        if (!isNovaUiLayoutDisplayed(child)) {
          continue
        }
        const layout = resolveNovaUiPositionedLayout(child)
        const measured = isNovaUiLayoutTarget(child) && child.measureLayout
          ? child.measureLayout({ minWidth: 0, maxWidth: Number.MAX_SAFE_INTEGER, minHeight: 0, maxHeight: Number.MAX_SAFE_INTEGER })
          : undefined
        const rect = isNovaUiOutOfFlowPosition(layout.position)
          ? resolveNovaUiPositionedRect(
              this._childRect,
              { x: child.x, y: child.y, width: measured?.width ?? child.width, height: measured?.height ?? child.height },
              layout,
              child,
            )
          : this._childRect
        const changed = applyNodeLayoutRect(child, rect)
        if (changed) {
          child.dirty({ update: true, render: true })
        }
      }
    }

    this._tooltipController?.syncRootRect(this.width, this.height)
    this._dialogController?.syncRootRect(this.width, this.height)
    this._syncPortalSurfaces()
    this._layoutDirty = false
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

    if (this.props.clip) {
      this.renderer.clip(0, 0, this.width, this.height)
    }
    if (schema.length > 0) {
      this.renderer.schema(schema)
    }
  }

  /**
   * Обрабатывает входящее событие Root.
   */
  protected override onPropsChanged(changedKeys: Array<keyof RootResolvedProps>): void {
    this.props = normalizeRootProps(this.props)
    this._applyDisplayState()
    if (hasRootLayoutChanges(changedKeys)) {
      this._layoutDirty = true
    }
    if (!this._externalLayout && hasRootGeometryChanges(changedKeys)) {
      this._applyResolvedRect({
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
      const previous = this._effectiveStyleContext
      this._effectiveStyleContext = mergeStyleContext(EMPTY_STYLE_CONTEXT, this.props.style)
      this._propagateStyleContext(styleContextChangedMask(previous, this._effectiveStyleContext))
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
  private _applyResolvedRect(rect: NovaUiLayoutRect): boolean {
    if (rectEquals(this._ownRect, rect)) {
      return false
    }

    copyRect(this._ownRect, rect)
    super.options({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      cursor: this.props.cursor ?? null,
      cursorContext: this.props.cursorContext ?? null,
    })
    this._tooltipController?.syncRootRect(rect.width, rect.height)
    this._overlayController?.syncRootRect(rect.width, rect.height)
    this._dialogController?.syncRootRect(rect.width, rect.height)
    this._syncPortalSurfaces()
    this._layoutDirty = true
    this.dirty({ update: true, matrix: true, render: true })
    return true
  }

  /** Создает единственный controller tooltip-ов для текущего Root. */
  private _ensureTooltipController(): RootTooltipControllerNode<E> {
    if (!this._tooltipController) {
      const surface = this._ensurePortalSurface('tooltip', 50_000)
      this._tooltipController = new RootTooltipControllerNode(this.nova, surface, this)
      surface.addChild(this._tooltipController)
      this._tooltipController.syncRootRect(this.width, this.height)
    }
    return this._tooltipController
  }

  /** Создает единственный controller диалогов для текущего Root. */
  private _ensureDialogController(): RootDialogControllerNode<E> {
    if (!this._dialogController) {
      const surface = this._ensurePortalSurface('dialog', 30_000)
      this._dialogController = new RootDialogControllerNode(this.nova, surface, this)
      surface.addChild(this._dialogController)
      this._dialogController.syncRootRect(this.width, this.height)
    }
    return this._dialogController
  }

  /** Создает единственный controller overlays для текущего Root. */
  private _ensureOverlayController(): RootOverlayControllerNode<E> {
    if (!this._overlayController) {
      const surface = this._ensurePortalSurface('overlay', 40_000)
      this._overlayController = new RootOverlayControllerNode(this.nova, surface, this)
      surface.addChild(this._overlayController)
      this._overlayController.syncRootRect(this.width, this.height)
    }
    return this._overlayController
  }

  /** Создает отдельный top-level surface для portal-контроллеров. */
  private _ensurePortalSurface(kind: 'dialog' | 'overlay' | 'tooltip', zIndex: number): NovaSurface<E> {
    const current = kind === 'dialog'
      ? this._dialogSurface
      : kind === 'overlay'
        ? this._overlaySurface
        : this._tooltipSurface
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

    if (kind === 'dialog') {
      this._dialogSurface = surface
    }
    else if (kind === 'overlay') {
      this._overlaySurface = surface
    }
    else { this._tooltipSurface = surface }

    return surface
  }

  /** Синхронизирует portal-surfaces с размером Root. */
  private _syncPortalSurfaces(): void {
    this._dialogSurface?.options({ width: this.width, height: this.height })
    this._overlaySurface?.options({ width: this.width, height: this.height })
    this._tooltipSurface?.options({ width: this.width, height: this.height })
  }

  /** Проверяет наличие tooltip target до создания overlay controller. */
  private _hasTooltipTargetAt(event: MouseEvent): boolean {
    const { x, y } = this.nova.events.getCanvasMousePosition(event)
    const target = this.nova.events.hitTest(x, y)

    if (!target || target === this || target === this._tooltipController) {
      return false
    }

    const visited = new Set<NovaNode<E>>()
    let current: NovaNode<E> | undefined = target
    while (current) {
      if (visited.has(current)) {
        return false
      }
      visited.add(current)
      if (current === this || current === this._tooltipController) {
        return false
      }

      const resolver = current as NovaNode<E> & Partial<NovaTooltipTargetResolver>
      if (resolver.resolveNovaTooltipTarget?.({ x, y, event })?.tooltip) {
        return true
      }

      const api = (current as unknown as { getProps?: () => Record<string, unknown> }).getProps
      const tooltip = typeof api === 'function'
        ? api.call(current).tooltip as TooltipInput
        : null

      if (tooltip && typeof tooltip !== 'boolean') {
        return true
      }

      current = current.parent as NovaNode<E> | undefined
    }

    return false
  }

  /**
   * Синхронизирует актуальное состояние Root.
   */
  private _refreshCombinedStyleSheet(): void {
    const globalAsset = getNovaUiGlobalStyleSheet(this.nova)
    const builtInStyleSheet = getNovaUiBuiltInUtilityStyleSheet()
    const activeThemeId = this.nova.theme.active()
    const globalThemeStyleSheet = resolveActiveNovaUiThemeStyleSheet(globalAsset, activeThemeId)
    const localThemeStyleSheet = resolveActiveNovaUiThemeStyleSheet(this._localStyleSheetAsset, activeThemeId)
    const styleSheets = [
      builtInStyleSheet,
      globalAsset.styleSheet,
      globalThemeStyleSheet,
      this._localRawStyleSheet,
      localThemeStyleSheet,
    ].filter((sheet): sheet is NovaUiCompiledStyleSheet => !!sheet)

    this._rawStyleSheet = mergeNovaUiStyleSheets(styleSheets, [
      builtInStyleSheet.source,
      globalAsset.source,
      globalThemeStyleSheet?.source,
      this._localRawStyleSheet.source,
      localThemeStyleSheet?.source,
    ].filter(Boolean).join('\n'))
    this._activeThemeId = activeThemeId
    this._collectChangedResolvedTokens()
    this._styleSheet = this._resolveStyleSheetTokens(this._rawStyleSheet)
    bumpNovaUiStyleSheetVersion(this.nova)
    this._applyPlannedCascade()
  }

  /**
   * Синхронизирует актуальное состояние Root.
   */
  private _refreshStyleTokensIfNeeded(): void {
    const version = this._tokenResolver?.version ?? null
    const activeThemeId = this.nova.theme.active()
    if (activeThemeId !== this._activeThemeId) {
      this._refreshCombinedStyleSheet()
      return
    }

    if (version === this._resolvedTokenVersion) {
      return
    }

    this.refreshStyleTokens()
  }

  /**
   * Нормализует и возвращает итоговое значение Root.
   */
  private _resolveStyleSheetTokens(sheet: NovaUiCompiledStyleSheet): NovaUiCompiledStyleSheet {
    this._resolvedTokenVersion = this._tokenResolver?.version ?? null
    return resolveNovaUiStyleSheetTokens(sheet, this._tokenResolver)
  }

  /**
   * Применяет подготовленное состояние Root.
   */
  private _applyCascade(): void {
    this._mediaSignature = getNovaUiStyleMediaSignature(this._styleSheet, this._getMediaContext())
    this._mediaContext = this._getMediaContext()
    this.traverseAll((node) => {
      if (isStylableNode(node)) {
        this._applyCascadeToNode(node)
      }
    })

    const previous = this._effectiveStyleContext
    this._effectiveStyleContext = mergeStyleContext(EMPTY_STYLE_CONTEXT, this.props.style)
    this._propagateStyleContext(styleContextChangedMask(previous, this._effectiveStyleContext) || NovaUiStyleMask.AllText)
    this._layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  /**
   * Применяет selector cascade через indexed invalidation plan.
   */
  private _applyPlannedCascade(): void {
    const registry = createNovaUiStyleIdentityRegistry(this)
    const nextGraph = createNovaUiStyleSheetGraph(this._styleSheet)
    const plan = planNovaUiStyleSheetInvalidation(this._styleSheetGraph, nextGraph, registry, {
      candidateFallbackThreshold: this._styleCandidateFallbackThreshold,
    })
    this._styleSheetGraph = nextGraph
    this._applyCascadePlan(plan)
  }

  /**
   * Применяет selector cascade только для candidates или включает safe full fallback.
   */
  private _applyCascadePlan(plan: NovaUiStyleInvalidationPlan): void {
    if (plan.fallback) {
      this._applyCascade()
      return
    }

    this._mediaSignature = getNovaUiStyleMediaSignature(this._styleSheet, this._getMediaContext())
    this._mediaContext = this._getMediaContext()
    for (const node of plan.candidates) {
      this._applyCascadeToNode(node)
    }

    const previous = this._effectiveStyleContext
    this._effectiveStyleContext = mergeStyleContext(EMPTY_STYLE_CONTEXT, this.props.style)
    this._propagateStyleContext(styleContextChangedMask(previous, this._effectiveStyleContext))
    this._layoutDirty = true
    if (plan.candidates.size > 0 || plan.changedTokens.size > 0 || plan.changedRuleCount > 0 || plan.changedMediaAtoms.size > 0) {
      this.dirty({ update: true, render: true })
    }
  }

  /**
   * Применяет подготовленное состояние Root.
   */
  private _applyCascadeToNode(node: NovaUiStylableNode): void {
    const rules = matchStyleRules(node, this._styleSheet, this._getMediaContext())
    const utilityDeclarations = resolveNovaUiClassUtilities(readNovaUiNodeProps(node).className)
    const declarations = mergeStyleDeclarations(utilityDeclarations, mergeRuleDeclarations(rules))
    const patch = this._createCascadePatch(node, declarations)
    setNovaUiNodeLayoutIntent(node, declarations.layout)
    if (declarations.layout) {
      this._markLayoutAncestorsDirty(node)
    }
    if (!patch) {
      return
    }

    node.setProps(patch)
    if ('display' in patch) {
      this._markLayoutAncestorsDirty(node)
    }
  }

  /**
   * Создает runtime-сущность Root.
   */
  private _createCascadePatch(
    node: NovaUiStylableNode,
    declarations: NovaUiStyleDeclarations,
  ): Record<string, unknown> | null {
    const state = this._resolveAppliedState(node)
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
      this._applyKeyframeAnimation(node, declarations.animation)
    }
    if (supportsLayoutDeclarations(node)) {
      for (const key of ['gap', 'rowGap', 'columnGap'] as const) {
        const value = declarations.layout?.[key]
        if (value === undefined) {
          continue
        }
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
        if (value === undefined) {
          continue
        }
        nextKeys.add(key)
        patch[key] = value
      }
    }

    for (const key of state.keys) {
      if (nextKeys.has(key)) {
        continue
      }
      patch[key] = fallbackCascadeValue(key, state.baseline[key])
    }

    state.keys = nextKeys
    return Object.keys(patch).length > 0 ? patch : null
  }

  /**
   * Запускает class/keyframes animation один раз на стабильную signature.
   */
  private _applyKeyframeAnimation(
    node: NovaUiStylableNode,
    animation: NonNullable<NovaUiStyleDeclarations['animation']>,
  ): void {
    const keyframes = this._styleSheet.keyframes.get(animation.name)
    if (!keyframes || keyframes.frames.length < 2) {
      return
    }

    const first = keyframes.frames[0]?.declarations
    const last = keyframes.frames[keyframes.frames.length - 1]?.declarations
    if (!first || !last) {
      return
    }

    const signature = `${animation.name}:${animation.duration ?? 180}:${animation.delay ?? 0}:${animation.easing ?? 'outCubic'}`
    const persistentKey = node.componentId
    if (this._appliedAnimationSignatures.get(persistentKey) === signature) {
      return
    }
    const current = this._appliedAnimations.get(node)
    if (current?.signature === signature) {
      return
    }
    current?.playback.cancel()

    const from = resolveAnimationPatch(first)
    const to = resolveAnimationPatch(last)
    if (Object.keys(from).length === 0 && Object.keys(to).length === 0) {
      return
    }

    const playback = this.nova.motion.to(node, to, {
      from,
      duration: animation.duration ?? 180,
      delay: animation.delay ?? 0,
      easing: animation.easing ?? 'outCubic',
    })
    this._appliedAnimations.set(node, { signature, playback })
    this._appliedAnimationSignatures.set(persistentKey, signature)
  }

  /**
   * Нормализует и возвращает итоговое значение Root.
   */
  private _resolveAppliedState(node: NovaUiStylableNode): AppliedCascadeState {
    const existing = this._appliedCascade.get(node)
    if (existing) {
      return existing
    }

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
    this._appliedCascade.set(node, state)
    return state
  }

  /**
   * Синхронизирует актуальное состояние Root.
   */
  private _refreshMediaCascadeIfNeeded(): void {
    const nextContext = this._getMediaContext()
    const nextSignature = getNovaUiStyleMediaSignature(this._styleSheet, nextContext)
    if (nextSignature === this._mediaSignature) {
      return
    }

    bumpNovaUiStyleSheetVersion(this.nova)
    const registry = createNovaUiStyleIdentityRegistry(this)
    const graph = this._styleSheetGraph ?? createNovaUiStyleSheetGraph(this._styleSheet)
    this._styleSheetGraph = graph
    this._applyCascadePlan(planNovaUiMediaInvalidation(graph, registry, this._mediaContext, nextContext, {
      candidateFallbackThreshold: this._styleCandidateFallbackThreshold,
    }))
  }

  /**
   * Возвращает значение состояния Root.
   */
  private _getMediaContext(): { width: number, height: number } {
    return {
      width: this.width,
      height: this.height,
    }
  }

  /**
   * Сравнивает resolved CSS token values и возвращает только реально изменившиеся atoms.
   */
  private _collectChangedResolvedTokens(): Array<string> {
    const dependencies = this._rawStyleSheet.tokenDependencies ?? []
    if (!this._tokenResolver || dependencies.length === 0) {
      this._resolvedTokenValues.clear()
      return []
    }

    const changed: Array<string> = []
    const nextTokens = new Set(dependencies)
    for (const token of dependencies) {
      const nextValue = this._tokenResolver.resolve(token, '') ?? ''
      if (this._resolvedTokenValues.has(token) && this._resolvedTokenValues.get(token) !== nextValue) {
        changed.push(token)
      }
      this._resolvedTokenValues.set(token, nextValue)
    }

    for (const token of [...this._resolvedTokenValues.keys()]) {
      if (!nextTokens.has(token)) {
        this._resolvedTokenValues.delete(token)
      }
    }
    return changed
  }

  /**
   * Применяет подготовленное состояние Root.
   */
  private _applyDisplayState(): void {
    const displayed = this.props.display !== 'none'
    this.visible = displayed
    this.active = displayed
  }

  /**
   * Выполняет внутренний шаг markLayoutAncestorsDirty для Root.
   */
  private _markLayoutAncestorsDirty(node: { parent?: unknown }): void {
    relayoutNovaUiLayoutAncestors(node)
  }

  /**
   * Выполняет внутренний шаг propagateStyleContext для Root.
   */
  private _propagateStyleContext(changedMask: NovaUiStyleMask): NovaUiStyleReceiveResult {
    const result: NovaUiStyleReceiveResult = {
      update: false,
      render: false,
      layout: false,
    }
    if (changedMask === NovaUiStyleMask.None) {
      return result
    }

    for (const child of this.children) {
      if (!isNovaUiStyleTarget(child)) {
        continue
      }

      const childMask = child.getSubtreeStyleMask()
      if ((changedMask & childMask) === 0) {
        continue
      }

      const childResult = child.receiveStyleContext(this._effectiveStyleContext, changedMask & childMask)
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
    this._disposeGlobalStylesSubscription()
    for (const surface of [this._dialogSurface, this._overlaySurface, this._tooltipSurface]) {
      if (surface) {
        this.nova.removeSurface(surface)
      }
    }
    this._dialogSurface = null
    this._overlaySurface = null
    this._tooltipSurface = null
    this._dialogController = null
    this._overlayController = null
    this._tooltipController = null
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
    if (source.cursor !== undefined) {
      target.cursor = source.cursor
    }
    if (source.animation !== undefined) {
      target.animation = source.animation
    }
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
    if (source.cursor !== undefined) {
      target.cursor = source.cursor
    }
    if (source.animation !== undefined) {
      target.animation = source.animation
    }
    target.mask |= source.mask
    return target
  }, { mask: NovaUiStyleMask.None })
}

function resolveAnimationPatch(declarations: NovaUiStyleKeyframeDeclaration): Record<string, number> {
  const patch: Record<string, number> = {}
  if (declarations.opacity !== undefined) {
    patch.opacity = declarations.opacity
  }
  if (declarations.scaleX !== undefined) {
    patch.scaleX = declarations.scaleX
  }
  if (declarations.scaleY !== undefined) {
    patch.scaleY = declarations.scaleY
  }
  return patch
}

function mergeCursorDeclaration(
  target: NovaCursorDeclaration | undefined,
  source: NovaCursorDeclaration,
  state: string,
): NovaCursorDeclaration {
  if (Array.isArray(source)) {
    return source
  }
  const base = normalizeCursorStateMap(target)
  if (isCursorStateName(state) && isCursorValue(source)) {
    base[state] = source
  }
  return base
}

function normalizeCursorStateMap(source: NovaCursorDeclaration | undefined): NovaCursorStateMap {
  if (!source) {
    return {}
  }
  if (Array.isArray(source)) {
    return {}
  }
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
  if (value !== undefined) {
    return value
  }
  if (key === 'style') {
    return {}
  }
  if (key === 'background') {
    return ''
  }
  if (key === 'opacity') {
    return 1
  }
  if (key === 'border') {
    return { width: 0 }
  }
  if (key === 'clip') {
    return false
  }
  if (key === 'padding') {
    return 0
  }
  if (key === 'margin') {
    return 0
  }
  if (key === 'display') {
    return 'normal'
  }
  if (key === 'gap' || key === 'rowGap' || key === 'columnGap') {
    return 0
  }
  if (key === 'disabledOpacity') {
    return 0.45
  }
  if (key === 'cursor') {
    return null
  }
  if (key === 'cursorContext') {
    return null
  }
  if (
    key === 'accentColor'
    || key === 'trackColor'
    || key === 'thumbColor'
    || key === 'hoverBackground'
    || key === 'pressedBackground'
    || key === 'activeBackground'
    || key === 'placeholderColor'
  ) {
    return ''
  }
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
  if (!asset || !activeThemeId) {
    return null
  }
  const styleSheets = (asset.themes ?? [])
    .filter(theme => theme.id === activeThemeId)
    .map(theme => theme.styleSheet)
    .filter((sheet): sheet is NovaUiCompiledStyleSheet => !!sheet)
  if (styleSheets.length === 0) {
    return null
  }
  if (styleSheets.length === 1) {
    return styleSheets[0] ?? null
  }

  return mergeNovaUiStyleSheets(styleSheets, styleSheets.map(sheet => sheet.source).filter(Boolean).join('\n'))
}
