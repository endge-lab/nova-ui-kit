import { type NovaNode } from '@endge/nova'
import {
  normalizeStyleClasses,
  readNovaUiStyleIdentityProps,
} from '@/shared/style/identity/style-identity'
import {
  NOVA_UI_RESPONSIVE_VARIANT_RANK,
  isNovaUiResponsiveVariantActive,
  matchesNovaUiMediaQuery,
  resolveNovaUiResponsiveVariant,
} from '@/shared/style/cascade/style-media'
import type {
  NovaUiCompiledStyleRule,
  NovaUiCompiledStyleSheet,
  NovaUiStyleKeyframes,
  NovaUiStyleComponentName,
  NovaUiStyleMediaContext,
  NovaUiStyleSelector,
  NovaUiStyleSelectorPart,
  NovaUiStylableNode,
} from '@/shared/style/cascade/style-sheet'

interface StyleNodeIdentity {
  type: NovaUiStyleComponentName
  id: string
  classes: Array<string>
  classRanks: Map<string, number>
  attrs: Record<string, string | number | boolean>
}

/** Создает пустой stylesheet, который ничего не применяет. */
export function createEmptyStyleSheet(source = ''): NovaUiCompiledStyleSheet {
  return {
    rules: [],
    byId: new Map(),
    byClass: new Map(),
    byType: new Map(),
    byAttr: new Map(),
    universal: [],
    keyframes: new Map(),
    version: 0,
    source,
    tokenDependencies: [],
  }
}

/** Индексирует rules по правой части selector для O(1) выбора кандидатов. */
export function compileStyleSheetIndexes(
  rules: Array<NovaUiCompiledStyleRule>,
  source = '',
  keyframes: Map<string, NovaUiStyleKeyframes> = new Map(),
): NovaUiCompiledStyleSheet {
  const sheet: NovaUiCompiledStyleSheet = {
    rules,
    byId: new Map(),
    byClass: new Map(),
    byType: new Map(),
    byAttr: new Map(),
    universal: [],
    keyframes,
    version: Date.now(),
    source,
    tokenDependencies: [],
  }

  for (const rule of rules) {
    const rightMost = rule.selector.parts[rule.selector.parts.length - 1]
    rule.rightMostId = rightMost.id
    rule.rightMostClasses = rightMost.classes
    rule.rightMostType = rightMost.type
    rule.rightMostAttrs = rightMost.attrs

    if (rightMost.id) {
      appendIndexedRule(sheet.byId, rightMost.id, rule)
      continue
    }

    if (rightMost.classes.length > 0) {
      for (const className of rightMost.classes) {
        appendIndexedRule(sheet.byClass, className, rule)
      }
      continue
    }

    if (rightMost.type) {
      appendIndexedRule(sheet.byType, rightMost.type, rule)
      continue
    }

    const rightMostAttrs = Object.keys(rightMost.attrs)
    if (rightMostAttrs.length > 0) {
      for (const attrName of rightMostAttrs) {
        appendIndexedRule(sheet.byAttr, attrName, rule)
      }
      continue
    }

    sheet.universal.push(rule)
  }

  return sheet
}

/** Возвращает применимые rules с учетом specificity и порядка объявления. */
export function matchStyleRules(
  node: NovaUiStylableNode,
  styleSheet: NovaUiCompiledStyleSheet,
  mediaContext?: NovaUiStyleMediaContext,
): Array<NovaUiCompiledStyleRule> {
  if (styleSheet.rules.length === 0) return []

  const identity = readStyleNodeIdentity(node, mediaContext)
  const candidates: Array<NovaUiCompiledStyleRule> = []
  const seen = new Set<NovaUiCompiledStyleRule>()

  collectCandidates(candidates, seen, styleSheet.universal)
  collectCandidates(candidates, seen, styleSheet.byType.get(identity.type))
  collectCandidates(candidates, seen, styleSheet.byId.get(identity.id))
  for (const className of identity.classes) {
    collectCandidates(candidates, seen, styleSheet.byClass.get(className))
  }
  for (const attrName of Object.keys(identity.attrs)) {
    collectCandidates(candidates, seen, styleSheet.byAttr.get(attrName))
  }

  const matched: Array<{ rule: NovaUiCompiledStyleRule; variantRank: number }> = []
  for (const rule of candidates) {
    if (!matchesNovaUiMediaQuery(rule.media, mediaContext)) continue

    const variantRank = selectorMatchRankWithIdentity(node, identity, rule.selector, mediaContext)
    if (variantRank < 0) continue
    matched.push({ rule, variantRank })
  }

  matched.sort((left, right) => {
    const specificityDiff = left.rule.selector.specificity - right.rule.selector.specificity
    const variantDiff = left.variantRank - right.variantRank
    return specificityDiff || variantDiff || left.rule.order - right.rule.order
  })

  return matched.map(item => item.rule)
}

/** Проверяет, подходит ли selector к node с учетом ancestor chain. */
export function selectorMatches(
  node: NovaUiStylableNode,
  selector: NovaUiStyleSelector,
  mediaContext?: NovaUiStyleMediaContext,
): boolean {
  return selectorMatchRankWithIdentity(node, readStyleNodeIdentity(node, mediaContext), selector, mediaContext) >= 0
}

function selectorMatchRankWithIdentity(
  node: NovaUiStylableNode,
  identity: StyleNodeIdentity,
  selector: NovaUiStyleSelector,
  mediaContext?: NovaUiStyleMediaContext,
): number {
  let current: NovaNode<any> | null = node
  let partIndex = selector.parts.length - 1
  let variantRank = 0

  const ownPartRank = matchIdentityPartRank(identity, selector.parts[partIndex])
  if (ownPartRank < 0) return -1
  variantRank = Math.max(variantRank, ownPartRank)
  partIndex -= 1

  while (partIndex >= 0) {
    const combinator = selector.combinators[partIndex]
    const part = selector.parts[partIndex]

    if (combinator === 'child') {
      if (!current) return -1
      current = current.parent instanceof Object ? current.parent as NovaNode<any> : null
      const partRank = current ? matchPartRank(current, part, mediaContext) : -1
      if (partRank < 0) return -1
      variantRank = Math.max(variantRank, partRank)
      partIndex -= 1
      continue
    }

    if (!current) return -1
    const ancestor = findAncestorMatching(current, part, mediaContext)
    if (!ancestor.node) return -1
    current = ancestor.node
    variantRank = Math.max(variantRank, ancestor.rank)
    partIndex -= 1
  }

  return variantRank
}

function findAncestorMatching(
  node: NovaNode<any>,
  part: NovaUiStyleSelectorPart,
  mediaContext?: NovaUiStyleMediaContext,
): { node: NovaNode<any> | null; rank: number } {
  let parent = node.parent

  while (parent) {
    const rank = matchPartRank(parent, part, mediaContext)
    if (rank >= 0) return { node: parent as NovaNode<any>, rank }
    parent = parent.parent
  }

  return { node: null, rank: -1 }
}

function matchPartRank(
  node: unknown,
  part: NovaUiStyleSelectorPart,
  mediaContext?: NovaUiStyleMediaContext,
): number {
  if (!isStylableNode(node)) return -1

  return matchIdentityPartRank(readStyleNodeIdentity(node, mediaContext), part)
}

function matchIdentityPartRank(identity: StyleNodeIdentity, part: NovaUiStyleSelectorPart): number {
  if (part.type && identity.type !== part.type) return -1
  if (part.id && identity.id !== part.id) return -1

  let variantRank = 0

  for (const className of part.classes) {
    const classRank = identity.classRanks.get(className)
    if (classRank === undefined) return -1
    variantRank = Math.max(variantRank, classRank)
  }

  for (const [name, expected] of Object.entries(part.attrs)) {
    const actual = identity.attrs[name]
    if (expected === true) {
      if (actual === undefined) return -1
    } else if (String(actual) !== expected) {
      return -1
    }
  }

  return variantRank
}

function readStyleNodeIdentity(
  node: NovaUiStylableNode,
  mediaContext?: NovaUiStyleMediaContext,
): StyleNodeIdentity {
  const props = readNovaUiStyleIdentityProps(node)
  const rawClasses = normalizeStyleClasses(props.className)
  const classRanks = new Map<string, number>()

  for (const className of rawClasses) {
    registerClassRank(classRanks, className, NOVA_UI_RESPONSIVE_VARIANT_RANK.base)

    const responsive = resolveNovaUiResponsiveVariant(className)
    if (!responsive || !isNovaUiResponsiveVariantActive(responsive.variant, mediaContext)) continue

    registerClassRank(
      classRanks,
      responsive.className,
      NOVA_UI_RESPONSIVE_VARIANT_RANK[responsive.variant],
    )
  }

  return {
    type: resolveComponentName(node),
    id: node.componentId,
    classes: [...classRanks.keys()],
    classRanks,
    attrs: props.attrs ?? {},
  }
}

function registerClassRank(target: Map<string, number>, className: string, rank: number): void {
  target.set(className, Math.max(target.get(className) ?? 0, rank))
}

function resolveComponentName(node: NovaUiStylableNode): NovaUiStyleComponentName {
  const name = node.descriptor.name
  if (name === 'Root' || name === 'Flex' || name === 'Grid' || name === 'TextBlock') return name

  return node.__type as NovaUiStyleComponentName
}

function collectCandidates(
  target: Array<NovaUiCompiledStyleRule>,
  seen: Set<NovaUiCompiledStyleRule>,
  source?: Array<NovaUiCompiledStyleRule>,
): void {
  if (!source) return

  for (const rule of source) {
    if (seen.has(rule)) continue
    seen.add(rule)
    target.push(rule)
  }
}

function appendIndexedRule<K>(
  index: Map<K, Array<NovaUiCompiledStyleRule>>,
  key: K,
  rule: NovaUiCompiledStyleRule,
): void {
  const bucket = index.get(key)
  if (bucket) {
    bucket.push(rule)
    return
  }

  index.set(key, [rule])
}

function isStylableNode(node: unknown): node is NovaUiStylableNode {
  return !!node
    && typeof node === 'object'
    && 'descriptor' in node
    && 'componentId' in node
    && 'getProps' in node
}
