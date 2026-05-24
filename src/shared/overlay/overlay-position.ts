import { clamp, finiteNumber } from '@/shared/component'
import type { NovaUiOverlayAnchor, NovaUiOverlayCollisionOptions, NovaUiOverlayPlacement, NovaUiOverlayRect } from '@/shared/overlay/overlay.types'

export function resolveNovaUiOverlayPosition(input: {
  root: NovaUiOverlayRect
  anchor?: NovaUiOverlayAnchor
  overlay: { width: number; height: number }
  placement?: NovaUiOverlayPlacement
  offset?: number
  collision?: NovaUiOverlayCollisionOptions
}): { x: number; y: number; placement: NovaUiOverlayPlacement } {
  const placement = input.placement ?? 'bottom-start'
  const offset = finiteNumber(input.offset, 8)
  const anchor = input.anchor?.kind === 'pointer'
    ? { x: finiteNumber(input.anchor.x, 0), y: finiteNumber(input.anchor.y, 0), width: 0, height: 0 }
    : input.anchor?.kind === 'root' || !input.anchor
      ? input.root
      : { x: finiteNumber(input.anchor.x, 0), y: finiteNumber(input.anchor.y, 0), width: finiteNumber(input.anchor.width, 0), height: finiteNumber(input.anchor.height, 0) }
  let { x, y } = preferred(anchor, input.overlay.width, input.overlay.height, placement, offset)
  const padding = finiteNumber(input.collision?.padding, 8)
  const mode = input.collision?.mode ?? 'shift'
  if (mode === 'flip') {
    const side = placement.split('-')[0]
    const over = side === 'top' ? y < padding : side === 'bottom' ? y + input.overlay.height > input.root.height - padding : side === 'left' ? x < padding : side === 'right' ? x + input.overlay.width > input.root.width - padding : false
    if (over) ({ x, y } = preferred(anchor, input.overlay.width, input.overlay.height, flip(placement), offset))
  }
  if (mode !== 'none') {
    x = clamp(x, padding, Math.max(padding, input.root.width - input.overlay.width - padding))
    y = clamp(y, padding, Math.max(padding, input.root.height - input.overlay.height - padding))
  }
  return { x, y, placement }
}

function preferred(anchor: NovaUiOverlayRect, width: number, height: number, placement: NovaUiOverlayPlacement, offset: number): { x: number; y: number } {
  if (placement === 'center') return { x: anchor.x + (anchor.width - width) / 2, y: anchor.y + (anchor.height - height) / 2 }
  const [side, align = 'center'] = placement.split('-')
  let x = side === 'right' ? anchor.x + anchor.width + offset : side === 'left' ? anchor.x - width - offset : anchor.x
  let y = side === 'bottom' ? anchor.y + anchor.height + offset : side === 'top' ? anchor.y - height - offset : anchor.y
  if (side === 'top' || side === 'bottom') x = align === 'end' ? anchor.x + anchor.width - width : align === 'start' ? anchor.x : anchor.x + (anchor.width - width) / 2
  else y = align === 'end' ? anchor.y + anchor.height - height : align === 'start' ? anchor.y : anchor.y + (anchor.height - height) / 2
  return { x, y }
}

function flip(placement: NovaUiOverlayPlacement): NovaUiOverlayPlacement {
  return placement.replace('top', 'tmp').replace('bottom', 'top').replace('tmp', 'bottom').replace('left', 'tmp').replace('right', 'left').replace('tmp', 'right') as NovaUiOverlayPlacement
}
