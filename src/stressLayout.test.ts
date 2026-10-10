import { seedBackbone, stressLayout } from './index.ts'

import type { StressRequest } from './types.ts'

// drawn units are bp: a 300 bp backbone with a 400 bp insertion over its
// middle node and a deletion edge past it
function anchored(): StressRequest {
  const backbone = (id: string, start: number) => ({
    id,
    length: 100,
    stable: { rank: 0, start },
  })
  return {
    graph: {
      nodes: [
        backbone('v3', 200),
        backbone('v1', 0),
        backbone('v2', 100),
        { id: 'ins', length: 400, stable: { rank: 1 } },
      ],
      edges: [
        { from: 'v1', to: 'v2' },
        { from: 'v2', to: 'v3' },
        { from: 'v1', to: 'ins' },
        { from: 'ins', to: 'v3' },
        { from: 'v1', to: 'v3' },
      ],
    },
    options: {
      nodeLengthPerMegabase: 1_000_000,
      minimumNodeLength: 5,
      nodeSegmentLength: 20,
      edgeLength: 5,
    },
  }
}

test('the backbone is seeded end to end along x in reference order', () => {
  const xs = Object.fromEntries(
    seedBackbone(anchored()).graph.nodes.map(n => [n.id, n.x]),
  )
  expect(xs).toEqual({ v1: 0, v2: 105, v3: 210, ins: undefined })
})

test('a node already seeded keeps its seed', () => {
  const request = anchored()
  request.graph.nodes[1] = { ...request.graph.nodes[1]!, x: 7, y: 3 }
  const v1 = seedBackbone(request).graph.nodes.find(n => n.id === 'v1')!
  expect([v1.x, v1.y]).toEqual([7, 3])
})

test('a seeded backbone lays out as a line in reference order, the same way twice', () => {
  const request = seedBackbone(anchored())
  const { nodePositions } = stressLayout(request)
  expect(stressLayout(request).nodePositions).toEqual(nodePositions)
  const startX = (id: string) => nodePositions[id]![0]!.x
  expect(startX('v1')).toBeLessThan(startX('v2'))
  expect(startX('v2')).toBeLessThan(startX('v3'))
  const points = ['v1', 'v2', 'v3'].flatMap(id => nodePositions[id]!)
  const span = (values: number[]) => Math.max(...values) - Math.min(...values)
  const along = span(points.map(p => p.x))
  const across = span(points.map(p => p.y))
  expect(along).toBeGreaterThan(4 * across)
  expect(nodePositions.ins!.length).toBeGreaterThan(2)
})
