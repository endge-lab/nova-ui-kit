export type NovaUiOverlayPlacement = 'top' | 'top-start' | 'top-end' | 'right' | 'right-start' | 'right-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'center'
export type NovaUiOverlayCollisionMode = 'flip' | 'shift' | 'clamp' | 'none'
export type NovaUiOverlayDismissMode = boolean | { outside?: boolean; escape?: boolean }

export interface NovaUiOverlayRect {
  x: number
  y: number
  width: number
  height: number
}

export interface NovaUiOverlayAnchor extends Partial<NovaUiOverlayRect> {
  kind?: 'root' | 'local' | 'pointer' | 'rect'
}

export interface NovaUiOverlayCollisionOptions {
  mode?: NovaUiOverlayCollisionMode
  padding?: number
}
