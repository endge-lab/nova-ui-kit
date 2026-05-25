import { describe, expect, it } from 'vitest'
import {
  createEmptyStyleSheet,
  createNovaUiStyleIdentityRegistry,
  createNovaUiStyleSheetGraph,
  planNovaUiStyleSheetInvalidation,
  validateNovaUiStyleSheetSource,
} from '@/shared/style'
import type { NovaUiStyleComponentName } from '@/shared/style'

class BenchNode {
  readonly descriptor: { name: string }
  readonly __type: string
  parent: BenchNode | null = null
  children: Array<BenchNode> = []

  constructor(
    readonly componentId: string,
    type: NovaUiStyleComponentName,
    private readonly props: Record<string, unknown>,
  ) {
    this.descriptor = { name: type }
    this.__type = type
  }

  getProps(): Record<string, unknown> {
    return this.props
  }

  setProps(): void {}

  append(child: BenchNode): void {
    child.parent = this
    this.children.push(child)
  }

  traverseAll(visitor: (node: unknown) => void): void {
    visitor(this)
    for (const child of this.children) child.traverseAll(visitor)
  }
}

describe('NovaCSS style subscription performance', () => {
  it('prints exact selector invalidation report for 10k nodes', () => {
    const root = new BenchNode('root', 'Root', {})
    for (let index = 0; index < 10_000; index += 1) {
      root.append(new BenchNode(`node-${index}`, index % 2 === 0 ? 'TextBlock' : 'Button', {
        className: index === 9_999 ? 'target' : 'plain',
      }))
    }

    const startedAt = performance.now()
    const registry = createNovaUiStyleIdentityRegistry(root)
    const registryMs = performance.now() - startedAt
    const previous = createNovaUiStyleSheetGraph(createEmptyStyleSheet())
    const next = createNovaUiStyleSheetGraph(validateNovaUiStyleSheetSource(`
      .target { color: #1d73ff; }
    `).styleSheet!)
    const planStartedAt = performance.now()
    const plan = planNovaUiStyleSheetInvalidation(previous, next, registry)
    const planMs = performance.now() - planStartedAt

    console.info('[NovaCSS bench]', {
      scenario: '10k class selector exact invalidation',
      candidateCount: plan.candidates.size,
      subscribedOwners: 0,
      dirtyNodesByPhase: { render: plan.candidates.size, update: 0, matrix: 0 },
      cascadeMs: Number(planMs.toFixed(3)),
      dependencyTrackingMs: 0,
      registryMs: Number(registryMs.toFixed(3)),
      subscriptionCount: 0,
    })

    expect(plan.fallback).toBe(false)
    expect(plan.candidates.size).toBe(1)
    expect(planMs).toBeLessThan(25)
  })
})
