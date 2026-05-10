import {
  NovaUiStyleMask,
  type NovaUiBorder,
  type NovaUiFontStyle,
  type NovaUiFontWeight,
} from '@/shared/style'
import type { NovaUiSpacing } from '@/shared/layout'
import {
  compileStyleSheetIndexes,
  createEmptyStyleSheet,
} from '@/shared/style/cascade/StyleSelectorMatcher'
import type {
  NovaUiCompiledStyleRule,
  NovaUiStyleComponentName,
  NovaUiStyleDeclarations,
  NovaUiStyleDiagnostic,
  NovaUiStyleSelector,
  NovaUiStyleSelectorCombinator,
  NovaUiStyleSelectorPart,
  NovaUiStyleValidationResult,
} from '@/shared/style/cascade/StyleSheet'

const COMPONENT_NAMES: NovaUiStyleComponentName[] = [
  'Root',
  'Flex',
  'Grid',
  'TextBlock',
  'Surface',
  'Button',
  'Tag',
  'SplitPane',
  'ScrollArea',
  'Scrollbar',
  'Slider',
  'Checkbox',
  'Toggle',
  'Tooltip',
  'SegmentedControl',
  'Panel',
]
const COMPONENT_NAME_MAP = new Map(COMPONENT_NAMES.map(name => [name.toLowerCase(), name]))

/** Валидирует CSS-подобный stylesheet и возвращает compiled rules для Root. */
export function validateNovaUiStyleSheetSource(source: string): NovaUiStyleValidationResult {
  const diagnostics: NovaUiStyleDiagnostic[] = []
  const rules: NovaUiCompiledStyleRule[] = []
  const cleanedSource = stripCommentsPreservePositions(source)
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g
  let order = 0
  let consumed = ''
  let match: RegExpExecArray | null

  while ((match = rulePattern.exec(cleanedSource)) !== null) {
    consumed += cleanedSource.slice(consumed.length, match.index).replace(/[^\s]/g, ' ')
    consumed += cleanedSource.slice(match.index, rulePattern.lastIndex)

    const rawSelectors = match[1].trim()
    const rawBody = match[2]
    const selectors = rawSelectors
      .split(',')
      .map(selector => selector.trim())
      .filter(Boolean)

    if (selectors.length === 0) {
      diagnostics.push(createDiagnostic('error', 'empty-selector', 'Пустой selector.', source, match.index))
      continue
    }

    const declarations = parseDeclarations(rawBody, source, match.index + match[1].length + 1, diagnostics)
    if (!declarations) continue

    for (const selectorSource of selectors) {
      const selector = parseSelector(selectorSource, source, match.index, diagnostics)
      if (!selector) continue

      rules.push({
        selector,
        declarations,
        order,
        rightMostClasses: [],
      })
      order += 1
    }
  }

  const rest = cleanedSource.slice(consumed.length).trim()
  if (rest.length > 0) {
    const restIndex = cleanedSource.indexOf(rest, consumed.length)
    diagnostics.push(createDiagnostic('error', 'invalid-rule', 'Невалидный блок stylesheet.', source, restIndex))
  }

  const ok = !diagnostics.some(item => item.severity === 'error')

  return {
    ok,
    styleSheet: ok ? compileStyleSheetIndexes(rules, source) : null,
    diagnostics,
  }
}

/** Создает пустой successful validation result. */
export function createEmptyStyleSheetValidationResult(source = ''): NovaUiStyleValidationResult {
  return {
    ok: true,
    styleSheet: createEmptyStyleSheet(source),
    diagnostics: [],
  }
}

function parseSelector(
  raw: string,
  source: string,
  offset: number,
  diagnostics: NovaUiStyleDiagnostic[],
): NovaUiStyleSelector | null {
  const tokens = tokenizeSelector(raw)
  if (!tokens) {
    diagnostics.push(createDiagnostic('error', 'invalid-selector', `Невалидный selector "${raw}".`, source, offset))
    return null
  }

  const parts: NovaUiStyleSelectorPart[] = []
  const combinators: NovaUiStyleSelectorCombinator[] = []

  for (const token of tokens) {
    if (token === '>' || token === ' ') {
      combinators.push(token === '>' ? 'child' : 'descendant')
      continue
    }

    const part = parseSelectorPart(token)
    if (!part) {
      diagnostics.push(createDiagnostic('error', 'invalid-selector-part', `Невалидная часть selector "${token}".`, source, offset))
      return null
    }
    parts.push(part)
  }

  if (parts.length === 0 || combinators.length !== parts.length - 1) {
    diagnostics.push(createDiagnostic('error', 'invalid-selector-chain', `Невалидная цепочка selector "${raw}".`, source, offset))
    return null
  }
  if (parts.slice(0, -1).some(part => part.pseudos.length > 0)) {
    diagnostics.push(createDiagnostic('error', 'invalid-pseudo-selector', `Pseudo selector поддерживается только справа "${raw}".`, source, offset))
    return null
  }

  return {
    raw,
    parts,
    combinators,
    specificity: parts.reduce((sum, part) => sum + selectorPartSpecificity(part), 0),
  }
}

function tokenizeSelector(raw: string): string[] | null {
  const tokens: string[] = []
  let buffer = ''
  let inAttr = false
  let pendingSpace = false

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    if (char === '[') inAttr = true
    if (char === ']') inAttr = false

    if (!inAttr && char === '>') {
      flushSelectorToken(tokens, buffer)
      buffer = ''
      if (tokens[tokens.length - 1] === ' ') tokens.pop()
      tokens.push('>')
      pendingSpace = false
      continue
    }

    if (!inAttr && /\s/.test(char)) {
      flushSelectorToken(tokens, buffer)
      buffer = ''
      pendingSpace = tokens.length > 0 && tokens[tokens.length - 1] !== '>'
      continue
    }

    if (pendingSpace && tokens[tokens.length - 1] !== '>' && buffer.length === 0) {
      tokens.push(' ')
    }
    pendingSpace = false
    buffer += char
  }

  flushSelectorToken(tokens, buffer)
  if (tokens[0] === ' ' || tokens[tokens.length - 1] === ' ' || tokens[tokens.length - 1] === '>') return null
  return tokens
}

function flushSelectorToken(tokens: string[], value: string): void {
  const token = value.trim()
  if (token) tokens.push(token)
}

function parseSelectorPart(raw: string): NovaUiStyleSelectorPart | null {
  const typeMatch = raw.match(/^[a-zA-Z][\w-]*/)
  let type: NovaUiStyleComponentName | undefined
  let cursor = 0

  if (typeMatch) {
    const resolvedType = COMPONENT_NAME_MAP.get(typeMatch[0].toLowerCase())
    if (!resolvedType) return null
    type = resolvedType
    cursor = typeMatch[0].length
  }

  const part: NovaUiStyleSelectorPart = {
    type,
    classes: [],
    attrs: {},
    pseudos: [],
  }

  while (cursor < raw.length) {
    const rest = raw.slice(cursor)
    const idMatch = rest.match(/^#([\w-]+)/)
    if (idMatch) {
      part.id = idMatch[1]
      cursor += idMatch[0].length
      continue
    }

    const classMatch = rest.match(/^\.([\w-]+)/)
    if (classMatch) {
      part.classes.push(classMatch[1])
      cursor += classMatch[0].length
      continue
    }

    const attrMatch = rest.match(/^\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/)
    if (attrMatch) {
      part.attrs[attrMatch[1]] = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4]?.trim() ?? true
      cursor += attrMatch[0].length
      continue
    }

    const pseudoMatch = rest.match(/^:(hover|pressed|dragging|disabled)/)
    if (pseudoMatch) {
      part.pseudos.push(pseudoMatch[1])
      cursor += pseudoMatch[0].length
      continue
    }

    return null
  }

  return part
}

function parseDeclarations(
  rawBody: string,
  source: string,
  offset: number,
  diagnostics: NovaUiStyleDiagnostic[],
): NovaUiStyleDeclarations | null {
  const declarations: NovaUiStyleDeclarations = {
    mask: NovaUiStyleMask.None,
  }
  let applied = 0

  for (const rawDeclaration of rawBody.split(';')) {
    const declaration = rawDeclaration.trim()
    if (!declaration) continue

    const separatorIndex = declaration.indexOf(':')
    if (separatorIndex < 0) {
      diagnostics.push(createDiagnostic('error', 'invalid-declaration', `Невалидная декларация "${declaration}".`, source, offset))
      continue
    }

    const key = declaration.slice(0, separatorIndex).trim()
    const value = declaration.slice(separatorIndex + 1).trim()
    const parsed = parseDeclarationValue(key, value, diagnostics, source, offset)
    if (!parsed) continue

    applyParsedDeclaration(declarations, key, parsed)
    applied += 1
  }

  if (applied === 0) {
    diagnostics.push(createDiagnostic('warning', 'empty-declarations', 'Правило не содержит применимых деклараций.', source, offset))
    return null
  }

  return declarations
}

function parseDeclarationValue(
  key: string,
  value: string,
  diagnostics: NovaUiStyleDiagnostic[],
  source: string,
  offset: number,
): unknown {
  if (!value) {
    diagnostics.push(createDiagnostic('error', 'empty-value', `Пустое значение "${key}".`, source, offset))
    return null
  }

  if (key === 'clip') return parseBoolean(value, diagnostics, source, offset)
  if (key === 'cursor') return parseCursor(value, diagnostics, source, offset)
  if (NUMERIC_KEYS.has(key)) return parseFiniteNumber(value, diagnostics, source, offset)
  if (key === 'padding') return parseSpacing(value, diagnostics, source, offset)
  if (STRING_KEYS.has(key)) return stripQuotes(value)

  diagnostics.push(createDiagnostic('warning', 'unknown-declaration', `Неизвестная декларация "${key}" проигнорирована.`, source, offset))
  return null
}

function applyParsedDeclaration(
  target: NovaUiStyleDeclarations,
  key: string,
  value: unknown,
): void {
  if (key === 'color') {
    target.inheritedText = { ...target.inheritedText, color: value as string }
    target.mask |= NovaUiStyleMask.Color
    return
  }
  if (key === 'fontFamily') {
    target.inheritedText = { ...target.inheritedText, fontFamily: value as string }
    target.mask |= NovaUiStyleMask.FontFamily
    return
  }
  if (key === 'fontSize') {
    target.inheritedText = { ...target.inheritedText, fontSize: value as number }
    target.mask |= NovaUiStyleMask.FontSize
    return
  }
  if (key === 'fontWeight') {
    target.inheritedText = { ...target.inheritedText, fontWeight: value as NovaUiFontWeight }
    target.mask |= NovaUiStyleMask.FontWeight
    return
  }
  if (key === 'fontStyle') {
    target.inheritedText = { ...target.inheritedText, fontStyle: value as NovaUiFontStyle }
    target.mask |= NovaUiStyleMask.FontStyle
    return
  }
  if (key === 'lineHeight') {
    target.inheritedText = { ...target.inheritedText, lineHeight: value as number }
    target.mask |= NovaUiStyleMask.LineHeight
    return
  }
  if (key === 'background') {
    target.box = { ...target.box, background: value as string }
    return
  }
  if (key === 'opacity') {
    target.box = { ...target.box, opacity: value as number }
    return
  }
  if (key === 'clip') {
    target.box = { ...target.box, clip: value as boolean }
    return
  }
  if (key === 'borderColor') {
    target.box = {
      ...target.box,
      border: { ...target.box?.border, color: value as string },
    }
    return
  }
  if (key === 'borderWidth') {
    target.box = {
      ...target.box,
      border: { ...target.box?.border, width: value as number },
    }
    return
  }
  if (key === 'borderRadius') {
    target.box = {
      ...target.box,
      border: { ...target.box?.border, radius: value as NovaUiBorder['radius'] },
    }
    return
  }
  if (key === 'padding') {
    target.spacing = { ...target.spacing, padding: value as NovaUiSpacing }
    return
  }
  if (key === 'gap' || key === 'rowGap' || key === 'columnGap') {
    target.layout = { ...target.layout, [key]: value as number }
    return
  }
  if (
    key === 'accentColor'
    || key === 'trackColor'
    || key === 'thumbColor'
    || key === 'hoverBackground'
    || key === 'pressedBackground'
    || key === 'activeBackground'
    || key === 'disabledOpacity'
  ) {
    target.visual = { ...target.visual, [key]: value as never }
    return
  }
  if (key === 'cursor') {
    target.cursor = value as never
  }
}

function parseSpacing(
  value: string,
  diagnostics: NovaUiStyleDiagnostic[],
  source: string,
  offset: number,
): NovaUiSpacing | null {
  const items = value.split(/\s+/).map(item => parseNumberToken(item))
  if (items.some(item => item === null) || ![1, 2, 4].includes(items.length)) {
    diagnostics.push(createDiagnostic('error', 'invalid-spacing', `Невалидный spacing "${value}".`, source, offset))
    return null
  }

  const numbers = items as number[]
  if (numbers.length === 1) return numbers[0]
  if (numbers.length === 2) return { vertical: numbers[0], horizontal: numbers[1] }

  return {
    top: numbers[0],
    right: numbers[1],
    bottom: numbers[2],
    left: numbers[3],
  }
}

function parseFiniteNumber(
  value: string,
  diagnostics: NovaUiStyleDiagnostic[],
  source: string,
  offset: number,
): number | null {
  const numberValue = parseNumberToken(value)
  if (numberValue === null) {
    diagnostics.push(createDiagnostic('error', 'invalid-number', `Невалидное число "${value}".`, source, offset))
    return null
  }

  return numberValue
}

function parseBoolean(
  value: string,
  diagnostics: NovaUiStyleDiagnostic[],
  source: string,
  offset: number,
): boolean | null {
  if (value === 'true') return true
  if (value === 'false') return false

  diagnostics.push(createDiagnostic('error', 'invalid-boolean', `Невалидный boolean "${value}".`, source, offset))
  return null
}

function parseNumberToken(value: string): number | null {
  const normalized = value.trim().replace(/px$/, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function selectorPartSpecificity(part: NovaUiStyleSelectorPart): number {
  return (part.id ? 100 : 0)
    + (part.classes.length + Object.keys(part.attrs).length + part.pseudos.length) * 10
    + (part.type ? 1 : 0)
}

function parseCursor(
  value: string,
  diagnostics: NovaUiStyleDiagnostic[],
  source: string,
  offset: number,
): unknown {
  const urlMatch = value.match(/^url\((.*)\)$/)
  if (urlMatch) {
    const parts = splitFunctionArgs(urlMatch[1])
    const src = stripQuotes(parts[0] ?? '')
    if (!src) {
      diagnostics.push(createDiagnostic('error', 'invalid-cursor', `Невалидный cursor "${value}".`, source, offset))
      return null
    }
    const hotspot = parseHotspot(parts[1])
    return {
      type: 'url',
      src,
      hotspot,
      fallback: parts[2]?.trim() || 'default',
    }
  }

  const componentMatch = value.match(/^component\((.*)\)$/)
  if (componentMatch) {
    const parts = splitFunctionArgs(componentMatch[1])
    const component = stripQuotes(parts[0] ?? '')
    if (!component) {
      diagnostics.push(createDiagnostic('error', 'invalid-cursor', `Невалидный cursor "${value}".`, source, offset))
      return null
    }
    return {
      type: 'component',
      component,
      props: parseCursorProps(parts[1], diagnostics, source, offset),
      hotspot: parseHotspot(parts[2]),
    }
  }

  return stripQuotes(value)
}

function splitFunctionArgs(source: string): string[] {
  const result: string[] = []
  let buffer = ''
  let depth = 0
  let quote = ''

  for (const char of source) {
    if (quote) {
      buffer += char
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === '\'') {
      quote = char
      buffer += char
      continue
    }
    if (char === '{' || char === '[' || char === '(') depth += 1
    if (char === '}' || char === ']' || char === ')') depth -= 1
    if (char === ',' && depth === 0) {
      result.push(buffer.trim())
      buffer = ''
      continue
    }
    buffer += char
  }

  if (buffer.trim()) result.push(buffer.trim())
  return result
}

function parseHotspot(value: string | undefined): { x: number; y: number } | undefined {
  if (!value) return undefined
  const [x, y] = value.split(/\s+/).map(item => Number(item))
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined
  return { x, y }
}

function parseCursorProps(
  value: string | undefined,
  diagnostics: NovaUiStyleDiagnostic[],
  source: string,
  offset: number,
): Record<string, unknown> | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined
  } catch {
    diagnostics.push(createDiagnostic('error', 'invalid-cursor-props', `Невалидные props cursor "${value}".`, source, offset))
    return undefined
  }
}

function stripCommentsPreservePositions(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
}

function stripQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, '')
}

function createDiagnostic(
  severity: NovaUiStyleDiagnostic['severity'],
  code: string,
  message: string,
  source: string,
  index: number,
): NovaUiStyleDiagnostic {
  const position = resolveLineColumn(source, index)

  return {
    severity,
    code,
    message,
    line: position.line,
    column: position.column,
  }
}

function resolveLineColumn(source: string, index: number): { line: number; column: number } {
  const prefix = source.slice(0, Math.max(0, index))
  const lines = prefix.split('\n')

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  }
}

const STRING_KEYS = new Set([
  'color',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'background',
  'borderColor',
  'accentColor',
  'trackColor',
  'thumbColor',
  'hoverBackground',
  'pressedBackground',
  'activeBackground',
])

const NUMERIC_KEYS = new Set([
  'fontSize',
  'lineHeight',
  'opacity',
  'borderWidth',
  'borderRadius',
  'gap',
  'rowGap',
  'columnGap',
  'disabledOpacity',
])
