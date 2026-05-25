import {
  normalizeStyleClasses,
  readNovaUiStyleIdentityProps,
} from '@/shared/style/identity/style-identity'
import {
  NOVA_UI_RESPONSIVE_BREAKPOINTS,
  resolveNovaUiResponsiveVariant,
} from '@/shared/style/cascade/style-media'
import type {
  NovaUiCompiledStyleRule,
  NovaUiCompiledStyleSheet,
  NovaUiStyleComponentName,
  NovaUiStyleMediaContext,
  NovaUiStyleMediaFeature,
  NovaUiStylableNode,
} from '@/shared/style/cascade/style-sheet'

export interface NovaUiStyleIdentityRegistry {
  readonly nodes: Set<NovaUiStylableNode>
  readonly byId: Map<string, Set<NovaUiStylableNode>>
  readonly byClass: Map<string, Set<NovaUiStylableNode>>
  readonly byType: Map<NovaUiStyleComponentName, Set<NovaUiStylableNode>>
  readonly byAttr: Map<string, Set<NovaUiStylableNode>>
}

export interface NovaUiStyleSheetGraph {
  readonly sheet: NovaUiCompiledStyleSheet
  readonly rules: Array<NovaUiCompiledStyleRule>
  readonly tokenAtoms: Set<string>
  readonly mediaAtoms: Set<string>
  readonly ruleSignatures: Map<string, NovaUiCompiledStyleRule>
}

export interface NovaUiStyleInvalidationPlan {
  fallback: boolean
  reason?: string
  candidates: Set<NovaUiStylableNode>
  changedTokens: Set<string>
  changedRuleCount: number
  changedMediaAtoms: Set<string>
}

export interface NovaUiStyleInvalidationOptions {
  candidateFallbackThreshold?: number
}

const DEFAULT_CANDIDATE_FALLBACK_THRESHOLD = 2_048

/** Компилирует runtime graph поверх уже разобранного stylesheet. */
export function createNovaUiStyleSheetGraph(sheet: NovaUiCompiledStyleSheet): NovaUiStyleSheetGraph {
  return {
    sheet,
    rules: sheet.rules,
    tokenAtoms: new Set(sheet.tokenDependencies ?? []),
    mediaAtoms: collectMediaAtoms(sheet.rules),
    ruleSignatures: new Map(sheet.rules.map(rule => [ruleSignature(rule), rule])),
  }
}

/** Индексирует stylable nodes текущего Nova UI Kit subtree. */
export function createNovaUiStyleIdentityRegistry(root: { traverseAll: (visitor: (node: unknown) => void) => void }): NovaUiStyleIdentityRegistry {
  const registry: NovaUiStyleIdentityRegistry = {
    nodes: new Set(),
    byId: new Map(),
    byClass: new Map(),
    byType: new Map(),
    byAttr: new Map(),
  }

  root.traverseAll(node => {
    if (!isStylableNode(node)) return

    registry.nodes.add(node)
    appendIdentityNode(registry.byId, node.componentId, node)
    appendIdentityNode(registry.byType, resolveComponentName(node), node)

    const props = readNovaUiStyleIdentityProps(node)
    for (const className of normalizeStyleClasses(props.className)) {
      appendIdentityNode(registry.byClass, className, node)
      const responsive = resolveNovaUiResponsiveVariant(className)
      if (responsive) appendIdentityNode(registry.byClass, responsive.className, node)
    }

    for (const attrName of Object.keys(props.attrs ?? {})) {
      appendIdentityNode(registry.byAttr, attrName, node)
    }
  })

  return registry
}

/** Планирует точечное применение cascade после изменения stylesheet/theme tokens. */
export function planNovaUiStyleSheetInvalidation(
  previous: NovaUiStyleSheetGraph | null,
  next: NovaUiStyleSheetGraph,
  registry: NovaUiStyleIdentityRegistry,
  options: NovaUiStyleInvalidationOptions = {},
): NovaUiStyleInvalidationPlan {
  if (!previous) {
    return createFallbackPlan('initial stylesheet graph', registry)
  }

  const changedRules = diffRules(previous, next)
  const changedTokens = diffSets(previous.tokenAtoms, next.tokenAtoms)
  const changedMediaAtoms = diffSets(previous.mediaAtoms, next.mediaAtoms)
  const candidates = new Set<NovaUiStylableNode>()

  for (const rule of changedRules) {
    collectRuleCandidates(candidates, registry, rule)
  }

  if (changedTokens.size > 0) {
    for (const rule of next.rules) {
      collectRuleCandidates(candidates, registry, rule)
    }
  }

  if (changedMediaAtoms.size > 0) {
    for (const rule of next.rules) {
      if (!rule.media) continue
      collectRuleCandidates(candidates, registry, rule)
    }
  }

  return finalizePlan(candidates, registry, {
    changedTokens,
    changedRuleCount: changedRules.length,
    changedMediaAtoms,
  }, options)
}

/** Планирует точечное применение cascade после изменения состояния `@media canvas`. */
export function planNovaUiMediaInvalidation(
  graph: NovaUiStyleSheetGraph,
  registry: NovaUiStyleIdentityRegistry,
  previousContext: NovaUiStyleMediaContext,
  nextContext: NovaUiStyleMediaContext,
  options: NovaUiStyleInvalidationOptions = {},
): NovaUiStyleInvalidationPlan {
  const changedMediaAtoms = diffSets(
    collectActiveMediaAndResponsiveAtoms(graph.rules, previousContext),
    collectActiveMediaAndResponsiveAtoms(graph.rules, nextContext),
  )
  const candidates = new Set<NovaUiStylableNode>()

  if (changedMediaAtoms.size > 0) {
    for (const rule of graph.rules) {
      if (!rule.media && rule.rightMostClasses.length === 0) continue
      collectRuleCandidates(candidates, registry, rule)
    }
  }

  return finalizePlan(candidates, registry, {
    changedTokens: new Set(),
    changedRuleCount: 0,
    changedMediaAtoms,
  }, options)
}

function finalizePlan(
  candidates: Set<NovaUiStylableNode>,
  registry: NovaUiStyleIdentityRegistry,
  stats: Pick<NovaUiStyleInvalidationPlan, 'changedTokens' | 'changedRuleCount' | 'changedMediaAtoms'>,
  options: NovaUiStyleInvalidationOptions,
): NovaUiStyleInvalidationPlan {
  const threshold = options.candidateFallbackThreshold ?? DEFAULT_CANDIDATE_FALLBACK_THRESHOLD
  if (candidates.size > threshold) {
    return createFallbackPlan(`candidate threshold ${threshold} exceeded`, registry, stats)
  }

  return {
    fallback: false,
    candidates,
    ...stats,
  }
}

function createFallbackPlan(
  reason: string,
  registry: NovaUiStyleIdentityRegistry,
  stats: Pick<NovaUiStyleInvalidationPlan, 'changedTokens' | 'changedRuleCount' | 'changedMediaAtoms'> = {
    changedTokens: new Set(),
    changedRuleCount: 0,
    changedMediaAtoms: new Set(),
  },
): NovaUiStyleInvalidationPlan {
  return {
    fallback: true,
    reason,
    candidates: new Set(registry.nodes),
    ...stats,
  }
}

function diffRules(
  previous: NovaUiStyleSheetGraph,
  next: NovaUiStyleSheetGraph,
): Array<NovaUiCompiledStyleRule> {
  const changed = new Set<NovaUiCompiledStyleRule>()

  for (const [signature, rule] of next.ruleSignatures) {
    if (!previous.ruleSignatures.has(signature)) changed.add(rule)
  }
  for (const [signature, rule] of previous.ruleSignatures) {
    if (!next.ruleSignatures.has(signature)) changed.add(rule)
  }

  return [...changed]
}

function ruleSignature(rule: NovaUiCompiledStyleRule): string {
  return JSON.stringify({
    selector: rule.selector.raw,
    order: rule.order,
    media: rule.media ?? null,
    declarations: rule.declarations,
  })
}

function collectRuleCandidates(
  target: Set<NovaUiStylableNode>,
  registry: NovaUiStyleIdentityRegistry,
  rule: NovaUiCompiledStyleRule,
): void {
  const rightMostAttrs = Object.keys(rule.rightMostAttrs ?? {})

  if (rule.rightMostId) {
    collectNodes(target, registry.byId.get(rule.rightMostId))
    collectDescendantsForAncestorSelectors(target, registry, rule)
    return
  }

  if (rule.rightMostClasses.length > 0) {
    for (const className of rule.rightMostClasses) collectNodes(target, registry.byClass.get(className))
    collectDescendantsForAncestorSelectors(target, registry, rule)
    return
  }

  if (rule.rightMostType) {
    collectNodes(target, registry.byType.get(rule.rightMostType))
    collectDescendantsForAncestorSelectors(target, registry, rule)
    return
  }

  if (rightMostAttrs.length > 0) {
    for (const attrName of rightMostAttrs) collectNodes(target, registry.byAttr.get(attrName))
    collectDescendantsForAncestorSelectors(target, registry, rule)
    return
  }

  collectNodes(target, registry.nodes)
}

function collectDescendantsForAncestorSelectors(
  target: Set<NovaUiStylableNode>,
  registry: NovaUiStyleIdentityRegistry,
  rule: NovaUiCompiledStyleRule,
): void {
  if (rule.selector.parts.length <= 1) return

  for (let index = 0; index < rule.selector.parts.length - 1; index += 1) {
    const part = rule.selector.parts[index]
    const ancestors = selectPartCandidates(registry, part)
    if (!ancestors || ancestors.size === 0) continue

    for (const node of registry.nodes) {
      if (hasAnyAncestor(node, ancestors)) target.add(node)
    }
  }
}

function selectPartCandidates(
  registry: NovaUiStyleIdentityRegistry,
  part: NovaUiCompiledStyleRule['selector']['parts'][number],
): Set<NovaUiStylableNode> | null {
  if (part.id) return registry.byId.get(part.id) ?? null
  if (part.classes.length > 0) return registry.byClass.get(part.classes[0]) ?? null
  if (part.type) return registry.byType.get(part.type) ?? null
  const attr = Object.keys(part.attrs)[0]
  if (attr) return registry.byAttr.get(attr) ?? null
  return registry.nodes
}

function hasAnyAncestor(node: NovaUiStylableNode, candidates: Set<NovaUiStylableNode>): boolean {
  let parent = node.parent
  while (parent) {
    if (candidates.has(parent as NovaUiStylableNode)) return true
    parent = parent.parent
  }
  return false
}

function collectMediaAtoms(rules: Array<NovaUiCompiledStyleRule>): Set<string> {
  const atoms = new Set<string>()
  for (const rule of rules) {
    for (const feature of rule.media?.features ?? []) atoms.add(mediaFeatureAtom(feature))
  }
  return atoms
}

function collectActiveMediaAtoms(
  rules: Array<NovaUiCompiledStyleRule>,
  context: NovaUiStyleMediaContext,
): Set<string> {
  const atoms = new Set<string>()
  for (const rule of rules) {
    for (const feature of rule.media?.features ?? []) {
      if (matchesMediaFeature(feature, context)) atoms.add(mediaFeatureAtom(feature))
    }
  }
  return atoms
}

function collectActiveMediaAndResponsiveAtoms(
  rules: Array<NovaUiCompiledStyleRule>,
  context: NovaUiStyleMediaContext,
): Set<string> {
  const atoms = collectActiveMediaAtoms(rules, context)
  for (const [variant, minWidth] of Object.entries(NOVA_UI_RESPONSIVE_BREAKPOINTS)) {
    if (context.width >= minWidth) atoms.add(`responsive:${variant}`)
  }
  return atoms
}

function mediaFeatureAtom(feature: NovaUiStyleMediaFeature): string {
  return `${feature.name}:${feature.value}`
}

function matchesMediaFeature(feature: NovaUiStyleMediaFeature, context: NovaUiStyleMediaContext): boolean {
  if (feature.name === 'min-width') return context.width >= feature.value
  if (feature.name === 'max-width') return context.width <= feature.value
  if (feature.name === 'min-height') return context.height >= feature.value
  return context.height <= feature.value
}

function diffSets<T>(left: Set<T>, right: Set<T>): Set<T> {
  const diff = new Set<T>()
  for (const item of left) if (!right.has(item)) diff.add(item)
  for (const item of right) if (!left.has(item)) diff.add(item)
  return diff
}

function collectNodes(
  target: Set<NovaUiStylableNode>,
  source?: Iterable<NovaUiStylableNode>,
): void {
  if (!source) return
  for (const node of source) target.add(node)
}

function appendIdentityNode<K>(
  index: Map<K, Set<NovaUiStylableNode>>,
  key: K,
  node: NovaUiStylableNode,
): void {
  const bucket = index.get(key)
  if (bucket) {
    bucket.add(node)
    return
  }

  index.set(key, new Set([node]))
}

function resolveComponentName(node: NovaUiStylableNode): NovaUiStyleComponentName {
  const name = node.descriptor.name
  if (name === 'Root' || name === 'Flex' || name === 'Grid' || name === 'TextBlock') return name
  return node.__type as NovaUiStyleComponentName
}

function isStylableNode(node: unknown): node is NovaUiStylableNode {
  return !!node
    && typeof node === 'object'
    && 'descriptor' in node
    && 'componentId' in node
    && 'getProps' in node
    && 'setProps' in node
}
