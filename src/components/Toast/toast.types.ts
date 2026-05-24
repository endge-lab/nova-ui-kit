import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps, NovaUiIconSource } from '@/shared/component'
import type { NovaUiPartStyleOptions } from '@/domain/domain.types'

export const TOAST_SCHEMA_TYPE = 'nova-ui.toast'
export const TOAST_REGION_SCHEMA_TYPE = 'nova-ui.toast-region'

export type ToastTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'
export type ToastPlacement = 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center'

export interface ToastItem { id: string; title?: string; message?: string; icon?: NovaUiIconSource; tone?: ToastTone; actionLabel?: string; duration?: number }
export interface ToastProps extends NovaUiCommonProps, NovaUiPartStyleOptions { title?: string; message?: string; icon?: NovaUiIconSource; tone?: ToastTone; actionLabel?: string; progress?: number; closeButton?: boolean; onAction?: (event?: Event) => void; onClose?: (event?: Event) => void }
export interface ToastResolvedProps extends NovaUiCommonResolvedProps, NovaUiPartStyleOptions { title: string; message: string; icon?: NovaUiIconSource; tone: ToastTone; actionLabel: string; progress?: number; closeButton: boolean; onAction?: (event?: Event) => void; onClose?: (event?: Event) => void }
export interface ToastRegionProps extends NovaUiCommonProps, NovaUiPartStyleOptions { items?: Array<ToastItem>; placement?: ToastPlacement; limit?: number; gap?: number; newestFirst?: boolean; autoDismiss?: boolean; pauseOnHover?: boolean; onDismiss?: (item: ToastItem, event?: Event) => void; onAction?: (item: ToastItem, event?: Event) => void }
export interface ToastRegionResolvedProps extends NovaUiCommonResolvedProps, NovaUiPartStyleOptions { items: Array<ToastItem>; placement: ToastPlacement; limit: number; gap: number; newestFirst: boolean; autoDismiss: boolean; pauseOnHover: boolean; onDismiss?: (item: ToastItem, event?: Event) => void; onAction?: (item: ToastItem, event?: Event) => void }
export type ToastSchema = NovaComponentSchema<ToastProps>
export type ToastRegionSchema = NovaComponentSchema<ToastRegionProps>
export interface ToastApi { close: (event?: Event) => void; action: (event?: Event) => void; setProps: (patch: ToastProps) => void; getProps: () => Readonly<ToastResolvedProps> }
export interface ToastRegionApi { push: (item: ToastItem) => void; dismiss: (id: string, event?: Event) => void; clear: () => void; setProps: (patch: ToastRegionProps) => void; getProps: () => Readonly<ToastRegionResolvedProps> }
