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

const polylineLength = (points: { x: number; y: number }[]) =>
  points.reduce(
    (sum, p, i) =>
      i ? sum + Math.hypot(p.x - points[i - 1]!.x, p.y - points[i - 1]!.y) : 0,
    0,
  )

test('an anchored graph keeps its placement: the backbone exactly straight, the insertion hanging below it at its own length between its anchors', () => {
  const { nodePositions } = stressLayout(seedBackbone(anchored()))
  for (const id of ['v1', 'v2', 'v3']) {
    for (const p of nodePositions[id]!) {
      expect(p.y).toBe(0)
    }
  }
  const ins = nodePositions.ins!
  const v1End = nodePositions.v1!.at(-1)!
  const v3Start = nodePositions.v3![0]!
  expect(Math.hypot(ins[0]!.x - v1End.x, ins[0]!.y - v1End.y)).toBeLessThan(20)
  expect(
    Math.hypot(ins.at(-1)!.x - v3Start.x, ins.at(-1)!.y - v3Start.y),
  ).toBeLessThan(20)
  for (const p of ins) {
    expect(p.y).toBeGreaterThanOrEqual(0)
  }
  expect(polylineLength(ins) / 400).toBeGreaterThan(0.98)
  expect(polylineLength(ins) / 400).toBeLessThan(1.02)
})

test('a graph with no backbone lays out from a random start, the same way twice', () => {
  const request: StressRequest = {
    graph: {
      nodes: [
        { id: 'a', length: 100 },
        { id: 'b', length: 100 },
        { id: 'c', length: 300 },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'a' },
      ],
    },
    options: anchored().options,
  }
  const { nodePositions } = stressLayout(request)
  expect(stressLayout(request).nodePositions).toEqual(nodePositions)
  for (const line of Object.values(nodePositions)) {
    for (const p of line) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
    }
  }
  expect(polylineLength(nodePositions.c!) / 300).toBeGreaterThan(0.9)
})

test('a component with no backbone beside an anchored one lays out too, below it', () => {
  const request = seedBackbone(anchored())
  request.graph.nodes.push({ id: 'p', length: 100 }, { id: 'q', length: 100 })
  request.graph.edges.push({ from: 'p', to: 'q' }, { from: 'q', to: 'p' })
  const { nodePositions } = stressLayout(request)
  for (const id of ['v1', 'v2', 'v3']) {
    for (const p of nodePositions[id]!) {
      expect(p.y).toBe(0)
    }
  }
  const backboneBottom = Math.max(
    ...['v1', 'v2', 'v3', 'ins'].flatMap(id =>
      nodePositions[id]!.map(p => p.y),
    ),
  )
  for (const id of ['p', 'q']) {
    for (const p of nodePositions[id]!) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
      expect(p.y).toBeGreaterThan(backboneBottom)
    }
  }
  expect(polylineLength(nodePositions.p!) / 100).toBeGreaterThan(0.9)
})

test('a straight backbone node keeps its exact length through smoothing', () => {
  const { nodePositions } = stressLayout(seedBackbone(anchored()))
  for (const id of ['v1', 'v2', 'v3']) {
    expect(polylineLength(nodePositions[id]!)).toBeCloseTo(100, 6)
  }
})
