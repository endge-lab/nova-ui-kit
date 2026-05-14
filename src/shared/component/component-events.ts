import type { NovaNode } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { NovaUiLayoutRect } from '@/shared/layout'

export interface NovaUiEventPoint {
  x: number
  y: number
}

export interface NovaUiRectPart<TPart extends string = string> {
  part: TPart
  rect: NovaUiLayoutRect
}

export function toLocalEventPoint<E extends EventList>(
  node: NovaNode<E>,
  event: MouseEvent,
  target: NovaUiEventPoint = { x: 0, y: 0 },
): NovaUiEventPoint {
  const { x, y } = node.events.getCanvasMousePosition(event)
  const [localX, localY] = node.toLocal(x, y)
  target.x = localX
  target.y = localY
  return target
}

export function hitTestRectPart<TPart extends string>(
  parts: ReadonlyArray<NovaUiRectPart<TPart>>,
  point: NovaUiEventPoint,
): TPart | null {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const item = parts[index]
    if (
      point.x >= item.rect.x
      && point.y >= item.rect.y
      && point.x <= item.rect.x + item.rect.width
      && point.y <= item.rect.y + item.rect.height
    ) return item.part
  }
  return null
}

export function emitSemanticProp<TProps extends Record<string, unknown>, TName extends keyof TProps>(
  props: TProps,
  name: TName,
  ...args: TProps[TName] extends (...handlerArgs: infer TArgs) => unknown ? TArgs : Array<unknown>
): void {
  const handler = props[name]
  if (typeof handler === 'function') {
    ;(handler as (...handlerArgs: Array<unknown>) => void)(...args)
  }
}
