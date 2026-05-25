import { NovaUiStyleMask } from '@/shared/style/style-context'
import { normalizeStyleClasses } from '@/shared/style/identity/style-identity'
import {
  NOVA_UI_RESPONSIVE_VARIANT_RANK,
  isNovaUiResponsiveVariantActive,
  matchesNovaUiMediaQuery,
  resolveNovaUiResponsiveVariant,
} from '@/shared/style/cascade/style-media'
import type {
  NovaUiCompiledStyleRule,
  NovaUiCompiledStyleSheet,
  NovaUiStyleComponentName,
  NovaUiStyleDeclarations,
  NovaUiStyleMediaContext,
  NovaUiStyleSelectorPart,
} from '@/shared/style/cascade/style-sheet'

export interface NovaUiVirtualStylePrimitiveIdentity {
  type: NovaUiStyleComponentName
  id?: string
  className?: string | Array<string>
  attrs?: Record<string, string | number | boolean>
}

interface VirtualStyleIdentity {
  type: NovaUiStyleComponentName
  id: string
  classes: Array<string>
  classRanks: Map<string, number>
  attrs: Record<string, string | number | boolean>
}

/** Возвращает применимые rules для schema/DSL primitive без регистрации primitive как NovaNode. */
export function matchNovaUiVirtualStyleRules(
  primitive: NovaUiVirtualStylePrimitiveIdentity,
  styleSheet: NovaUiCompiledStyleSheet,
  mediaContext?: NovaUiStyleMediaContext,
): Array<NovaUiCompiledStyleRule> {
  if (styleSheet.rules.length === 0) return []

  const identity = readVirtualStyleIdentity(primitive, mediaContext)
  const candidates: Array<NovaUiCompiledStyleRule> = []
  const seen = new Set<NovaUiCompiledStyleRule>()

  collectCandidates(candidates, seen, styleSheet.universal)
  collectCandidates(candidates, seen, styleSheet.byType.get(identity.type))
  if (identity.id) collectCandidates(candidates, seen, styleSheet.byId.get(identity.id))
  for (const className of identity.classes) {
    collectCandidates(candidates, seen, styleSheet.byClass.get(className))
  }
  for (const attrName of Object.keys(identity.attrs)) {
    collectCandidates(candidates, seen, styleSheet.byAttr.get(attrName))
  }

  const matched: Array<{ rule: NovaUiCompiledStyleRule; variantRank: number }> = []
  for (const rule of candidates) {
    if (rule.selector.parts.length !== 1) continue
    if (rule.selector.parts[0]?.pseudos.length) continue
    if (!matchesNovaUiMediaQuery(rule.media, mediaContext)) continue

    const variantRank = matchVirtualIdentityPartRank(identity, rule.selector.parts[0]!)
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

/** Мержит declarations для virtual primitive тем же порядком, что Root cascade. */
export function resolveNovaUiVirtualStyleDeclarations(
  primitive: NovaUiVirtualStylePrimitiveIdentity,
  styleSheet: NovaUiCompiledStyleSheet,
  mediaContext?: NovaUiStyleMediaContext,
): NovaUiStyleDeclarations {
  return mergeVirtualRuleDeclarations(matchNovaUiVirtualStyleRules(primitive, styleSheet, mediaContext))
}

function readVirtualStyleIdentity(
  primitive: NovaUiVirtualStylePrimitiveIdentity,
  mediaContext?: NovaUiStyleMediaContext,
): VirtualStyleIdentity {
  const rawClasses = normalizeStyleClasses(primitive.className)
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
    type: primitive.type,
    id: primitive.id ?? '',
    classes: [...classRanks.keys()],
    classRanks,
    attrs: primitive.attrs ?? {},
  }
}

function matchVirtualIdentityPartRank(identity: VirtualStyleIdentity, part: NovaUiStyleSelectorPart): number {
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

function mergeVirtualRuleDeclarations(rules: ReadonlyArray<NovaUiCompiledStyleRule>): NovaUiStyleDeclarations {
  return rules.reduce<NovaUiStyleDeclarations>((target, rule) => {
    const source = rule.declarations
    target.customProperties = {
      ...target.customProperties,
      ...source.customProperties,
    }
    target.inheritedText = {
      ...target.inheritedText,
      ...source.inheritedText,
    }
    target.box = {
      ...target.box,
      ...source.box,
    }
    if (target.box?.border || source.box?.border) {
      target.box.border = {
        ...target.box?.border,
        ...source.box?.border,
      }
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

function registerClassRank(target: Map<string, number>, className: string, rank: number): void {
  target.set(className, Math.max(target.get(className) ?? 0, rank))
}

function collectCandidates(
  target: Array<NovaUiCompiledStyleRule>,
  seen: Set<NovaUiCompiledStyleRule>,
  source?: ReadonlyArray<NovaUiCompiledStyleRule>,
): void {
  if (!source) return

  for (const rule of source) {
    if (seen.has(rule)) continue
    seen.add(rule)
    target.push(rule)
  }
}
