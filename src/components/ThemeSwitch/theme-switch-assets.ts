import { NovaAssets } from '@endge/nova'
import moonIconSource from '@/assets/icons/moon.svg?raw'
import sunIconSource from '@/assets/icons/sun.svg?raw'
import type { ThemeSwitchTheme } from '@/components/ThemeSwitch/theme-switch.types'

export const THEME_SWITCH_ASSETS = NovaAssets.define('nova-ui-kit-theme-switch', {
  icons: {
    moon: NovaAssets.svg(moonIconSource, { width: 24, height: 24, color: '#f8fafc' }),
    sun: NovaAssets.svg(sunIconSource, { width: 24, height: 24, color: '#111827' }),
  },
})

export const DEFAULT_THEME_SWITCH_THEMES: ThemeSwitchTheme[] = [
  { id: 'light', label: 'Light', icon: THEME_SWITCH_ASSETS.icons.sun },
  { id: 'dark', label: 'Dark', icon: THEME_SWITCH_ASSETS.icons.moon },
]

export function normalizeThemeSwitchThemes(themes?: ThemeSwitchTheme[]): ThemeSwitchTheme[] {
  const source = themes && themes.length > 0 ? themes : DEFAULT_THEME_SWITCH_THEMES
  return source.map(theme => ({
    ...theme,
    background: theme.background ?? resolveThemeSwitchDefaultBackground(theme.id),
    icon: theme.icon ?? resolveThemeSwitchDefaultIcon(theme.id),
    label: theme.label ?? resolveThemeSwitchDefaultLabel(theme.id),
  }))
}

export function resolveThemeSwitchDefaultIcon(themeId: string): ThemeSwitchTheme['icon'] {
  const iconKind = resolveThemeSwitchDefaultIconKind(themeId)
  if (iconKind === 'moon') return THEME_SWITCH_ASSETS.icons.moon
  if (iconKind === 'sun') return THEME_SWITCH_ASSETS.icons.sun
  return undefined
}

export function resolveThemeSwitchDefaultIconKind(themeId: string): 'moon' | 'sun' | undefined {
  const normalizedId = themeId.toLowerCase()
  if (normalizedId.includes('dark') || normalizedId.includes('night')) return 'moon'
  if (normalizedId.includes('light') || normalizedId.includes('day') || normalizedId === 'default') return 'sun'
  return undefined
}

export function resolveThemeSwitchDefaultBackground(themeId: string): string | undefined {
  const normalizedId = themeId.toLowerCase()
  if (normalizedId.includes('dark') || normalizedId.includes('night')) return '#111827'
  if (normalizedId.includes('light') || normalizedId.includes('day') || normalizedId === 'default') return '#ffffff'
  return undefined
}

function resolveThemeSwitchDefaultLabel(themeId: string): string {
  if (themeId === 'light') return 'Light'
  if (themeId === 'dark') return 'Dark'
  return themeId
}
