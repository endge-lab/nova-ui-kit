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
} from '@/shared/style/cascade/style-selector-matcher'
import { extractNovaUiStyleTokenDependencies } from '@/shared/style/cascade/style-token-resolver'
import type {
  NovaUiCompiledStyleRule,
  NovaUiStyleComponentName,
  NovaUiStyleDeclarations,
  NovaUiStyleDiagnostic,
  NovaUiStyleSelector,
  NovaUiStyleSelectorCombinator,
  NovaUiStyleSelectorPart,
  NovaUiStyleValidationResult,
} from '@/shared/style/cascade/style-sheet'

const COMPONENT_NAMES: Array<NovaUiStyleComponentName> = [
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
  'SpeedDial',
  'Dock',
  'Carousel',
  'Galleria',
  'ImagePreview',
  'ImageCompare',
  'Skeleton',
  'ProgressBar',
  'ProgressSpinner',
  'MeterGroup',
  'Knob',
  'ToggleSwitch',
  'RadioButton',
  'Rating',
  'SelectButton',
  'Dialog',
  'Drawer',
  'Popover',
  'Toast',
  'Message',
  'BlockUI',
  'Accordion',
  'Fieldset',
  'Tabs',
  'Stepper',
]
const COMPONENT_NAME_MAP = new Map(COMPONENT_NAMES.map(name => [name.toLowerCase(), name]))

interface ParsedStyleRule {
  selector: string
  body: string
  offset: number
}

/** Валидирует CSS-подобный stylesheet и возвращает compiled rules для Root. */
export function validateNovaUiStyleSheetSource(source: string): NovaUiStyleValidationResult {
  const diagnostics: Array<NovaUiStyleDiagnostic> = []
  const rules: Array<NovaUiCompiledStyleRule> = []
  const cleanedSource = stripCommentsPreservePositions(source)
  let order = 0

  for (const parsedRule of parseStyleRules(cleanedSource, source, diagnostics)) {
    const declarations = parseDeclarations(parsedRule.body, source, parsedRule.offset, diagnostics)
    if (!declarations) continue

    for (const selectorSource of splitSelectorList(parsedRule.selector)) {
      const selector = parseSelector(selectorSource, source, parsedRule.offset, diagnostics)
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

  const ok = !diagnostics.some(item => item.severity === 'error')
  const styleSheet = ok ? compileStyleSheetIndexes(rules, source) : null
  if (styleSheet) styleSheet.tokenDependencies = extractNovaUiStyleTokenDependencies(source)

  return {
    ok,
    styleSheet,
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

function parseStyleRules(
  cleanedSource: string,
  originalSource: string,
  diagnostics: Array<NovaUiStyleDiagnostic>,
  parentSelectors: Array<string> = [],
  baseOffset = 0,
): Array<ParsedStyleRule> {
  const rules: Array<ParsedStyleRule> = []
  let cursor = 0

  while (cursor < cleanedSource.length) {
    cursor = skipWhitespace(cleanedSource, cursor)
    if (cursor >= cleanedSource.length) break

    const preludeStart = cursor
    const blockStart = findNextTopLevel(cleanedSource, cursor, ['{', ';'])
    if (blockStart < 0) {
      diagnostics.push(createDiagnostic('error', 'invalid-rule', 'Невалидный блок stylesheet.', originalSource, baseOffset + cursor))
      break
    }

    const separator = cleanedSource[blockStart]
    const prelude = cleanedSource.slice(preludeStart, blockStart).trim()
    if (!prelude) {
      diagnostics.push(createDiagnostic('error', 'empty-selector', 'Пустой selector.', originalSource, baseOffset + preludeStart))
      cursor = blockStart + 1
      continue
    }

    if (prelude.startsWith('@import')) {
      cursor = separator === ';' ? blockStart + 1 : skipBalancedBlock(cleanedSource, blockStart)
      continue
    }

    if (separator === ';') {
      diagnostics.push(createDiagnostic('error', 'invalid-rule', `Невалидная декларация вне selector "${prelude}".`, originalSource, baseOffset + preludeStart))
      cursor = blockStart + 1
      continue
    }

    const blockEnd = findMatchingBrace(cleanedSource, blockStart)
    if (blockEnd < 0) {
      diagnostics.push(createDiagnostic('error', 'unclosed-rule', `Незакрытый selector "${prelude}".`, originalSource, baseOffset + blockStart))
      break
    }

    const selectors = combineSelectors(parentSelectors, splitSelectorList(prelude))
    const body = cleanedSource.slice(blockStart + 1, blockEnd)
    const split = splitRuleBody(body)
    if (split.declarations.trim()) {
      for (const selector of selectors) {
        rules.push({
          selector,
          body: split.declarations,
          offset: baseOffset + blockStart + 1,
        })
      }
    }

    for (const nested of split.nested) {
      const nestedSource = `${nested.selector}{${nested.body}}`
      rules.push(...parseStyleRules(
        nestedSource,
        originalSource,
        diagnostics,
        selectors,
        baseOffset + blockStart + 1 + nested.offset,
      ))
    }

    cursor = blockEnd + 1
  }

  return rules
}

function splitRuleBody(body: string): {
  declarations: string
  nested: Array<{ selector: string; body: string; offset: number }>
} {
  const nested: Array<{ selector: string; body: string; offset: number }> = []
  let declarations = ''
  let cursor = 0

  while (cursor < body.length) {
    cursor = skipWhitespace(body, cursor)
    if (cursor >= body.length) break

    const start = cursor
    const next = findNextTopLevel(body, cursor, ['{', ';'])
    if (next < 0) {
      declarations += `${body.slice(start).trim()};`
      break
    }

    if (body[next] === ';') {
      declarations += `${body.slice(start, next).trim()};`
      cursor = next + 1
      continue
    }

    const end = findMatchingBrace(body, next)
    if (end < 0) {
      declarations += body.slice(start)
      break
    }

    nested.push({
      selector: body.slice(start, next).trim(),
      body: body.slice(next + 1, end),
      offset: start,
    })
    cursor = end + 1
  }

  return { declarations, nested }
}

function splitSelectorList(source: string): Array<string> {
  return splitTopLevel(source, ',')
    .map(selector => selector.trim())
    .filter(Boolean)
}

function combineSelectors(parentSelectors: Array<string>, selectors: Array<string>): Array<string> {
  if (parentSelectors.length === 0) return selectors

  const result: Array<string> = []
  for (const parent of parentSelectors) {
    for (const selector of selectors) {
      result.push(selector.includes('&') ? selector.replace(/&/g, parent) : `${parent} ${selector}`)
    }
  }
  return result
}

function splitTopLevel(source: string, separator: string): Array<string> {
  const result: Array<string> = []
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
    if (char === '(' || char === '[') depth += 1
    if (char === ')' || char === ']') depth -= 1
    if (char === separator && depth === 0) {
      result.push(buffer)
      buffer = ''
      continue
    }
    buffer += char
  }

  result.push(buffer)
  return result
}

function skipWhitespace(source: string, cursor: number): number {
  let index = cursor
  while (index < source.length && /\s/.test(source[index])) index += 1
  return index
}

function findNextTopLevel(source: string, cursor: number, chars: Array<string>): number {
  let depth = 0
  let quote = ''

  for (let index = cursor; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === '\'') {
      quote = char
      continue
    }
    if (char === '(' || char === '[') depth += 1
    if (char === ')' || char === ']') depth -= 1
    if (depth === 0 && chars.includes(char)) return index
  }

  return -1
}

function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 0
  let quote = ''

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === '\'') {
      quote = char
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }

  return -1
}

function skipBalancedBlock(source: string, openIndex: number): number {
  const end = findMatchingBrace(source, openIndex)
  return end < 0 ? source.length : end + 1
}

function parseSelector(
  raw: string,
  source: string,
  offset: number,
  diagnostics: Array<NovaUiStyleDiagnostic>,
): NovaUiStyleSelector | null {
  const tokens = tokenizeSelector(raw)
  if (!tokens) {
    diagnostics.push(createDiagnostic('error', 'invalid-selector', `Невалидный selector "${raw}".`, source, offset))
    return null
  }

  const parts: Array<NovaUiStyleSelectorPart> = []
  const combinators: Array<NovaUiStyleSelectorCombinator> = []

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

function tokenizeSelector(raw: string): Array<string> | null {
  const tokens: Array<string> = []
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

function flushSelectorToken(tokens: Array<string>, value: string): void {
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
  diagnostics: Array<NovaUiStyleDiagnostic>,
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
    if (parsed === null) continue

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
  diagnostics: Array<NovaUiStyleDiagnostic>,
  source: string,
  offset: number,
): unknown {
  if (!value) {
    diagnostics.push(createDiagnostic('error', 'empty-value', `Пустое значение "${key}".`, source, offset))
    return null
  }

  if (key === 'clip') return parseBoolean(value, diagnostics, source, offset)
  if (key === 'cursor') return parseCursor(value, diagnostics, source, offset)
  if (value.startsWith('var(') && NUMERIC_KEYS.has(key)) return value
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
  diagnostics: Array<NovaUiStyleDiagnostic>,
  source: string,
  offset: number,
): NovaUiSpacing | null {
  const items = value.split(/\s+/).map(item => parseNumberToken(item))
  if (items.some(item => item === null) || ![1, 2, 4].includes(items.length)) {
    diagnostics.push(createDiagnostic('error', 'invalid-spacing', `Невалидный spacing "${value}".`, source, offset))
    return null
  }

  const numbers = items as Array<number>
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
  diagnostics: Array<NovaUiStyleDiagnostic>,
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
  diagnostics: Array<NovaUiStyleDiagnostic>,
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
  diagnostics: Array<NovaUiStyleDiagnostic>,
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

function splitFunctionArgs(source: string): Array<string> {
  const result: Array<string> = []
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
  diagnostics: Array<NovaUiStyleDiagnostic>,
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
  const lineStarts = getLineStarts(source)
  const normalizedIndex = Math.max(0, index)
  let low = 0
  let high = lineStarts.length - 1
  let lineIndex = 0

  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (lineStarts[middle] <= normalizedIndex) {
      lineIndex = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }

  return {
    line: lineIndex + 1,
    column: normalizedIndex - lineStarts[lineIndex] + 1,
  }
}

const LINE_STARTS_CACHE = new Map<string, Array<number>>()

function getLineStarts(source: string): Array<number> {
  const cached = LINE_STARTS_CACHE.get(source)
  if (cached) return cached

  const starts = [0]
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) starts.push(index + 1)
  }

  if (LINE_STARTS_CACHE.size > 8) LINE_STARTS_CACHE.clear()
  LINE_STARTS_CACHE.set(source, starts)
  return starts
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
