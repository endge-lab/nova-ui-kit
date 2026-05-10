import {
  NovaComponentNode,
  type NovaApp,
  type NovaCursorDeclaration,
  type NovaNode,
  type NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  ROOT_NODE_DESCRIPTOR,
  normalizeRootProps,
  type RootDescriptor,
} from '@/components/Root/Root.config'
import {
  NOVA_UI_ROOT_TARGET,
  type NovaUiRootTarget,
} from '@/components/Root/RootTarget'
import type {
  RootApi,
  RootChildSchema,
  RootProps,
  RootResolvedProps,
} from '@/components/Root/Root.types'
import {
  NOVA_UI_LAYOUT_TARGET,
  applyNodeLayoutRect,
  copyRect,
  createLayoutRect,
  rectEquals,
  resolveSpacing,
  type NovaUiLayoutRect,
  type NovaUiLayoutTarget,
} from '@/shared/layout'
import {
  EMPTY_STYLE_CONTEXT,
  NovaUiStyleMask,
  borderRadiusToRendererValue,
  createEmptyStyleSheet,
  createEmptyStyleSheetValidationResult,
  isNovaUiStyleTarget,
  matchStyleRules,
  mergeStyleContext,
  styleContextChangedMask,
  validateNovaUiStyleSheetSource,
  type NovaUiCompiledStyleSheet,
  type NovaUiStyleDeclarations,
  type NovaUiStyleReceiveResult,
  type NovaUiStyleValidationResult,
  type NovaUiStylableNode,
} from '@/shared/style'

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
  private readonly managedChildren: NovaNode<E>[] = []
  private readonly appliedCascade = new WeakMap<NovaUiStylableNode, AppliedCascadeState>()
  private readonly api: RootApi
  private layoutDirty = true
  private externalLayout = false
  private styleSheet: NovaUiCompiledStyleSheet = createEmptyStyleSheet()
  private validation: NovaUiStyleValidationResult = createEmptyStyleSheetValidationResult()
  private effectiveStyleContext = EMPTY_STYLE_CONTEXT

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: RootProps = {},
    options: { componentId?: string; children?: RootChildSchema[] } = {},
    descriptor: RootDescriptor = ROOT_NODE_DESCRIPTOR,
  ) {
    const resolvedProps = normalizeRootProps(props)
    super(app, surface, descriptor, resolvedProps, options)
    this.__type = 'Root'
    this.api = {
      setStyleSheetSource: source => this.setStyleSheetSource(source),
      resetStyleSheet: () => this.resetStyleSheet(),
      validateStyleSheet: source => validateNovaUiStyleSheetSource(source),
      setChildren: children => this.setChildren(children),
      getValidation: () => this.validation,
      getDiagnostics: () => this.validation.diagnostics,
      relayout: () => this.relayout(),
      getChildRect: () => this.childRect,
    }
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
    this.setChildren(options.children ?? [])
  }

  override setProps(patch: RootProps): this {
    return super.setProps(patch as Partial<RootResolvedProps>)
  }

  override getApi(): RootApi {
    return this.api
  }

  /** Принимает итоговый rect от внешнего runtime и запускает пересчет Root children. */
  applyLayoutRect(rect: NovaUiLayoutRect): boolean {
    this.externalLayout = true
    return this.applyResolvedRect(rect)
  }

  /** Валидирует stylesheet source и применяет пустую схему при ошибке. */
  setStyleSheetSource(source: string): void {
    const validation = source.trim()
      ? validateNovaUiStyleSheetSource(source)
      : createEmptyStyleSheetValidationResult(source)

    this.validation = validation
    this.styleSheet = validation.ok && validation.styleSheet
      ? validation.styleSheet
      : createEmptyStyleSheet(source)
    this.props.styleSheet = source
    this.applyCascade()
  }

  /** Сбрасывает selector stylesheet без пересоздания дерева. */
  resetStyleSheet(): void {
    this.setStyleSheetSource('')
  }

  /** Заменяет managed children и применяет layout/style одним проходом. */
  setChildren(children: RootChildSchema[]): void {
    this.removeManagedChildren()
    this.managedChildren.length = 0

    for (const child of children) {
      const node = this.nova.schema.createChild(this, child)
      this.managedChildren.push(node)
    }

    this.layoutDirty = true
    this.applyCascade()
    this.dirty({ update: true, render: true })
  }

  /** Принудительно помечает Root layout грязным без изменения props. */
  relayout(): void {
    this.layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  update(): void {
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
      for (const child of this.managedChildren) {
        const changed = applyNodeLayoutRect(child, this.childRect)
        if (changed) child.dirty({ update: true, render: true })
      }
    }

    this.layoutDirty = false
  }

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

  protected override onPropsChanged(changedKeys: (keyof RootResolvedProps)[]): void {
    this.props = normalizeRootProps(this.props)
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
    this.layoutDirty = true
    this.dirty({ update: true, matrix: true, render: true })
    return true
  }

  private applyCascade(): void {
    this.traverseAll(node => {
      if (isStylableNode(node)) this.applyCascadeToNode(node)
    })

    const previous = this.effectiveStyleContext
    this.effectiveStyleContext = mergeStyleContext(EMPTY_STYLE_CONTEXT, this.props.style)
    this.propagateStyleContext(styleContextChangedMask(previous, this.effectiveStyleContext) || NovaUiStyleMask.AllText)
    this.layoutDirty = true
    this.dirty({ update: true, render: true })
  }

  private applyCascadeToNode(node: NovaUiStylableNode): void {
    const rules = matchStyleRules(node, this.styleSheet)
    const declarations = mergeRuleDeclarations(rules)
    const patch = this.createCascadePatch(node, declarations)
    if (!patch) return

    node.setProps(patch)
  }

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
    if (declarations.cursor !== undefined) {
      nextKeys.add('cursor')
      patch.cursor = declarations.cursor
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

  private removeManagedChildren(): void {
    for (const child of this.managedChildren) {
      child.remove()
    }
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
    target.mask |= source.mask
    return target
  }, { mask: NovaUiStyleMask.None })
}

function mergeCursorDeclaration(
  target: NovaCursorDeclaration | undefined,
  source: NovaCursorDeclaration,
  state: string,
): NovaCursorDeclaration {
  if (Array.isArray(source)) return source
  const stateKey = state as keyof NonNullable<Exclude<NovaCursorDeclaration, string | any[]>>
  const base = normalizeCursorStateMap(target)
  base[stateKey as 'hover' | 'pressed' | 'dragging' | 'disabled'] = source as never
  return base
}

function normalizeCursorStateMap(source: NovaCursorDeclaration | undefined): Record<string, unknown> {
  if (!source) return {}
  if (typeof source === 'string' || Array.isArray(source) || 'type' in source) {
    return { default: source }
  }
  return { ...source }
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

function hasRootGeometryChanges(keys: (keyof RootResolvedProps)[]): boolean {
  return keys.includes('x') || keys.includes('y') || keys.includes('width') || keys.includes('height')
}

function hasRootLayoutChanges(keys: (keyof RootResolvedProps)[]): boolean {
  return keys.includes('width') || keys.includes('height') || keys.includes('padding')
}
