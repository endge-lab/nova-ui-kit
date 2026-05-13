import { type NovaNode } from '@endge/nova'
import {
  normalizeStyleClasses,
  readNovaUiStyleIdentityProps,
} from '@/shared/style/identity/style-identity'
import type {
  NovaUiCompiledStyleRule,
  NovaUiCompiledStyleSheet,
  NovaUiStyleComponentName,
  NovaUiStyleSelector,
  NovaUiStyleSelectorPart,
  NovaUiStylableNode,
} from '@/shared/style/cascade/style-sheet'

interface StyleNodeIdentity {
  type: NovaUiStyleComponentName
  id: string
  classes: Array<string>
  attrs: Record<string, string | number | boolean>
}

/** Создает пустой stylesheet, который ничего не применяет. */
export function createEmptyStyleSheet(source = ''): NovaUiCompiledStyleSheet {
  return {
    rules: [],
    byId: new Map(),
    byClass: new Map(),
    byType: new Map(),
    universal: [],
    version: 0,
    source,
    tokenDependencies: [],
  }
}

/** Индексирует rules по правой части selector для O(1) выбора кандидатов. */
export function compileStyleSheetIndexes(
  rules: Array<NovaUiCompiledStyleRule>,
  source = '',
): NovaUiCompiledStyleSheet {
  const sheet: NovaUiCompiledStyleSheet = {
    rules,
    byId: new Map(),
    byClass: new Map(),
    byType: new Map(),
    universal: [],
    version: Date.now(),
    source,
    tokenDependencies: [],
  }

  for (const rule of rules) {
    const rightMost = rule.selector.parts[rule.selector.parts.length - 1]
    rule.rightMostId = rightMost.id
    rule.rightMostClasses = rightMost.classes
    rule.rightMostType = rightMost.type

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

    sheet.universal.push(rule)
  }

  return sheet
}

/** Возвращает применимые rules с учетом specificity и порядка объявления. */
export function matchStyleRules(
  node: NovaUiStylableNode,
  styleSheet: NovaUiCompiledStyleSheet,
): Array<NovaUiCompiledStyleRule> {
  if (styleSheet.rules.length === 0) return []

  const identity = readStyleNodeIdentity(node)
  const candidates: Array<NovaUiCompiledStyleRule> = []
  const seen = new Set<NovaUiCompiledStyleRule>()

  collectCandidates(candidates, seen, styleSheet.universal)
  collectCandidates(candidates, seen, styleSheet.byType.get(identity.type))
  collectCandidates(candidates, seen, styleSheet.byId.get(identity.id))
  for (const className of identity.classes) {
    collectCandidates(candidates, seen, styleSheet.byClass.get(className))
  }

  const matched = candidates.filter(rule => selectorMatchesWithIdentity(node, identity, rule.selector))
  matched.sort((left, right) => {
    const specificityDiff = left.selector.specificity - right.selector.specificity
    return specificityDiff || left.order - right.order
  })

  return matched
}

/** Проверяет, подходит ли selector к node с учетом ancestor chain. */
export function selectorMatches(node: NovaUiStylableNode, selector: NovaUiStyleSelector): boolean {
  return selectorMatchesWithIdentity(node, readStyleNodeIdentity(node), selector)
}

function selectorMatchesWithIdentity(
  node: NovaUiStylableNode,
  identity: StyleNodeIdentity,
  selector: NovaUiStyleSelector,
): boolean {
  let current: NovaNode<any> | null = node
  let partIndex = selector.parts.length - 1

  if (!matchesIdentityPart(identity, selector.parts[partIndex])) return false
  partIndex -= 1

  while (partIndex >= 0) {
    const combinator = selector.combinators[partIndex]
    const part = selector.parts[partIndex]

    if (combinator === 'child') {
      current = current.parent instanceof Object ? current.parent as NovaNode<any> : null
      if (!current || !matchesPart(current, part)) return false
      partIndex -= 1
      continue
    }

    current = findAncestorMatching(current, part)
    if (!current) return false
    partIndex -= 1
  }

  return true
}

function findAncestorMatching(
  node: NovaNode<any>,
  part: NovaUiStyleSelectorPart,
): NovaNode<any> | null {
  let parent = node.parent

  while (parent) {
    if (matchesPart(parent, part)) return parent as NovaNode<any>
    parent = parent.parent
  }

  return null
}

function matchesPart(node: unknown, part: NovaUiStyleSelectorPart): boolean {
  if (!isStylableNode(node)) return false

  return matchesIdentityPart(readStyleNodeIdentity(node), part)
}

function matchesIdentityPart(identity: StyleNodeIdentity, part: NovaUiStyleSelectorPart): boolean {
  if (part.type && identity.type !== part.type) return false
  if (part.id && identity.id !== part.id) return false

  for (const className of part.classes) {
    if (!identity.classes.includes(className)) return false
  }

  for (const [name, expected] of Object.entries(part.attrs)) {
    const actual = identity.attrs[name]
    if (expected === true) {
      if (actual === undefined) return false
    } else if (String(actual) !== expected) {
      return false
    }
  }

  return true
}

function readStyleNodeIdentity(node: NovaUiStylableNode): StyleNodeIdentity {
  const props = readNovaUiStyleIdentityProps(node)

  return {
    type: resolveComponentName(node),
    id: node.componentId,
    classes: normalizeStyleClasses(props.className),
    attrs: props.attrs ?? {},
  }
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
