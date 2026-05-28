import type { NovaAssetRef, NovaComponentSchema } from '@endge/nova'
import type { NovaOverlayPlacement } from '@/components/FpsMeter/fps-meter.types'

export const THEME_SWITCH_SCHEMA_TYPE = 'nova-ui.theme-switch'

export type ThemeSwitchIconSource = CanvasImageSource | string | NovaAssetRef<'icon' | 'image'> | undefined | null

export interface ThemeSwitchTheme {
  id: string
  icon?: ThemeSwitchIconSource
  label?: string
  background?: string
}

export interface ThemeSwitchProps {
  x?: number
  y?: number
  width?: number
  height?: number
  placement?: NovaOverlayPlacement
  margin?: number
  themes?: Array<ThemeSwitchTheme>
  mode?: 'cycle' | 'menu' | 'segmented'
  value?: string
  visible?: boolean
  onChange?: (themeId: string) => void
}

export interface ThemeSwitchResolvedProps {
  x?: number
  y?: number
  width: number
  height: number
  placement: NovaOverlayPlacement
  margin: number
  themes: Array<ThemeSwitchTheme>
  mode: 'cycle' | 'menu' | 'segmented'
  value?: string
  visible: boolean
  onChange?: (themeId: string) => void
}

export type ThemeSwitchSchema = NovaComponentSchema<ThemeSwitchProps>

export interface ThemeSwitchApi {
  next: () => void
  setValue: (themeId: string | undefined) => void
  setProps: (patch: ThemeSwitchProps) => void
  getProps: () => Readonly<ThemeSwitchResolvedProps>
}
