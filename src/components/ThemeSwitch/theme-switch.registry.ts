import type { NovaSchemaRegistry } from '@endge/nova'
import type { ThemeSwitchDescriptor } from '@/components/ThemeSwitch/theme-switch.config'
import type { ThemeSwitchSchema } from '@/components/ThemeSwitch/theme-switch.types'
import {
  createThemeSwitchDescriptor,
  normalizeThemeSwitchProps,

} from '@/components/ThemeSwitch/theme-switch.config'
import { ThemeSwitch } from '@/components/ThemeSwitch/ThemeSwitch'

export const THEME_SWITCH_DESCRIPTOR: ThemeSwitchDescriptor = createThemeSwitchDescriptor((context, schema) => {
  const themeSwitchSchema = schema as ThemeSwitchSchema
  return new ThemeSwitch(
    context.app,
    context.surface,
    normalizeThemeSwitchProps(themeSwitchSchema.props),
    { componentId: themeSwitchSchema.id },
    THEME_SWITCH_DESCRIPTOR,
  )
})

export function registerThemeSwitch(registry: { register: (descriptor: ThemeSwitchDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(THEME_SWITCH_DESCRIPTOR, { override: true })
}

export function registerThemeSwitchSchema(registry: NovaSchemaRegistry): void {
  registerThemeSwitch(registry)
}
