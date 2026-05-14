import type {
  NovaUiCompiledStyleSheet,
  NovaUiStyleMediaContext,
  NovaUiStyleMediaQuery,
  NovaUiStyleResponsiveVariant,
} from '@/shared/style/cascade/style-sheet'

export const NOVA_UI_RESPONSIVE_BREAKPOINTS: Record<Exclude<NovaUiStyleResponsiveVariant, 'base'>, number> = {
  sm: 640,
  md: 760,
  lg: 1024,
}

export const NOVA_UI_RESPONSIVE_VARIANT_RANK: Record<NovaUiStyleResponsiveVariant, number> = {
  base: 0,
  sm: 1,
  md: 2,
  lg: 3,
}

export function resolveNovaUiResponsiveVariant(
  token: string,
): { variant: Exclude<NovaUiStyleResponsiveVariant, 'base'>; className: string } | null {
  const separatorIndex = token.indexOf(':')
  if (separatorIndex <= 0) return null

  const variant = token.slice(0, separatorIndex)
  if (variant !== 'sm' && variant !== 'md' && variant !== 'lg') return null

  const className = token.slice(separatorIndex + 1)
  return className ? { variant, className } : null
}

export function isNovaUiResponsiveVariantActive(
  variant: Exclude<NovaUiStyleResponsiveVariant, 'base'>,
  context?: NovaUiStyleMediaContext,
): boolean {
  return !!context && context.width >= NOVA_UI_RESPONSIVE_BREAKPOINTS[variant]
}

export function matchesNovaUiMediaQuery(
  query: NovaUiStyleMediaQuery | undefined,
  context?: NovaUiStyleMediaContext,
): boolean {
  if (!query) return true
  if (!context) return false

  for (const feature of query.features) {
    if (feature.name === 'min-width' && context.width < feature.value) return false
    if (feature.name === 'max-width' && context.width > feature.value) return false
    if (feature.name === 'min-height' && context.height < feature.value) return false
    if (feature.name === 'max-height' && context.height > feature.value) return false
  }

  return true
}

export function getNovaUiStyleMediaSignature(
  styleSheet: NovaUiCompiledStyleSheet,
  context: NovaUiStyleMediaContext,
): string {
  const responsive = [
    context.width >= NOVA_UI_RESPONSIVE_BREAKPOINTS.sm ? 'sm' : '',
    context.width >= NOVA_UI_RESPONSIVE_BREAKPOINTS.md ? 'md' : '',
    context.width >= NOVA_UI_RESPONSIVE_BREAKPOINTS.lg ? 'lg' : '',
  ].filter(Boolean).join('|')

  let mediaBits = ''
  for (const rule of styleSheet.rules) {
    if (!rule.media) continue
    mediaBits += matchesNovaUiMediaQuery(rule.media, context) ? '1' : '0'
  }

  return `${responsive};${mediaBits}`
}
