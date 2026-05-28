import type { NovaSchema } from '@endge/nova'
import type {
  ButtonResolvedProps,
} from '@/components/Button/button.types'
import {
  buildBoxSchema,
  resolveComponentTextStyle,
  resolveInteractionBackground,
  type NovaUiInteractionState,
} from '@/shared/component/component-props'
import type { NovaUiStyleContext } from '@/shared/style'
import {
  pushIcon,
  pushText,
  sizeTokenPadding,
} from '@/shared/component/component-render'

/** Собирает schema для Button-compatible визуального состояния. */
export function buildButtonSchema(
  props: ButtonResolvedProps,
  width: number,
  height: number,
  inheritedStyleContext: NovaUiStyleContext,
  state: Partial<NovaUiInteractionState> & { active?: boolean } = {},
): NovaSchema {
  const schema: NovaSchema = buildBoxSchema(props, width, height, {
    background: resolveInteractionBackground(props, state),
  })
  const textStyle = resolveComponentTextStyle(props, inheritedStyleContext)
  const padding = sizeTokenPadding(props.size)
  const iconSize = padding.icon
  const hasIcon = !!props.icon
  const hasTrailingIcon = !!props.trailingIcon && props.iconPlacement !== 'only'
  const hasText = !!props.text && props.iconPlacement !== 'only'
  const contentWidth = Math.max(0, width - padding.horizontal * 2)
  const contentHeight = Math.max(0, height - padding.vertical * 2)
  const iconOpacity = props.loading ? 0.45 : 1

  if (props.iconPlacement === 'only') {
    pushIcon(schema, props.icon, (width - iconSize) / 2, (height - iconSize) / 2, iconSize, iconOpacity)
  } else if (props.iconPlacement === 'right') {
    const iconX = width - padding.horizontal - iconSize
    pushText(schema, props.text, padding.horizontal, padding.vertical, Math.max(0, contentWidth - (hasIcon ? iconSize + padding.gap : 0)), contentHeight, textStyle, { align: 'center' })
    pushIcon(schema, props.icon, iconX, (height - iconSize) / 2, iconSize, iconOpacity)
  } else if (props.iconPlacement === 'top' || props.iconPlacement === 'bottom') {
    const iconY = props.iconPlacement === 'top' ? padding.vertical : height - padding.vertical - iconSize
    const textY = props.iconPlacement === 'top' ? iconY + iconSize + padding.gap : padding.vertical
    pushIcon(schema, props.icon, (width - iconSize) / 2, iconY, iconSize, iconOpacity)
    pushText(schema, props.text, padding.horizontal, textY, contentWidth, Math.max(0, contentHeight - (hasIcon ? iconSize + padding.gap : 0)), textStyle, { align: 'center' })
  } else {
    const iconX = padding.horizontal
    const textX = hasIcon ? iconX + iconSize + padding.gap : padding.horizontal
    const trailingWidth = hasTrailingIcon ? iconSize + padding.gap : 0
    pushIcon(schema, props.icon, iconX, (height - iconSize) / 2, iconSize, iconOpacity)
    pushText(schema, props.text, textX, padding.vertical, Math.max(0, contentWidth - (hasIcon ? iconSize + padding.gap : 0) - trailingWidth), contentHeight, textStyle, { align: hasText ? 'center' : 'left' })
    pushIcon(schema, props.trailingIcon, width - padding.horizontal - iconSize, (height - iconSize) / 2, iconSize, iconOpacity)
  }

  return schema
}
