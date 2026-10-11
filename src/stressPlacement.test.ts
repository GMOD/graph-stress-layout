import { chains } from './stressEngine.ts'
import { ROUTE_ID, stressPlacement } from './stressPlacement.ts'

import type { StressNode, StressRequest } from './types.ts'

// drawn units are bp: three backbone nodes of 100 along x, a link apart
const options = {
  nodeLengthPerMegabase: 1_000_000,
  minimumNodeLength: 5,
  nodeSegmentLength: 20,
  edgeLength: 5,
}

function backbone(id: string, x: number): StressNode {
  return { id, length: 100, stable: { rank: 0 }, x, y: 0 }
}

function withAllele(id: string, length: number): StressRequest {
  return {
    graph: {
      nodes: [
        backbone('v1', 0),
        backbone('v2', 105),
        backbone('v3', 210),
        { id, length },
      ],
      edges: [
        { from: 'v1', to: 'v2' },
        { from: 'v2', to: 'v3' },
        { from: 'v1', to: id },
        { from: id, to: 'v3' },
      ],
    },
    options,
  }
}

function placed(request: StressRequest) {
  const c = chains(request)
  const { X, Y } = stressPlacement(c)
  const points = (id: string) => {
    const k = c.ids.indexOf(id)
    return Array.from({ length: c.count[k]! }, (_, i) => ({
      x: X[c.first[k]! + i]!,
      y: Y[c.first[k]! + i]!,
    }))
  }
  return { points }
}

const polylineLength = (points: { x: number; y: number }[]) =>
  points.reduce(
    (sum, p, i) =>
      i ? sum + Math.hypot(p.x - points[i - 1]!.x, p.y - points[i - 1]!.y) : 0,
    0,
  )

test('an allele that nearly fits its gap hangs as a lens below the backbone', () => {
  const { points } = placed(withAllele('a', 120))
  for (const id of ['v1', 'v2', 'v3']) {
    for (const p of points(id)) {
      expect(p.y).toBe(0)
    }
  }
  const allele = points('a')
  for (const p of allele) {
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeGreaterThanOrEqual(100)
    expect(p.x).toBeLessThanOrEqual(210)
  }
  expect(Math.max(...allele.map(p => p.y))).toBeGreaterThan(12)
})

test('an allele much longer than its gap hangs as a teardrop of its own length', () => {
  const { points } = placed(withAllele('a', 600))
  const allele = points('a')
  expect(Math.max(...allele.map(p => p.y))).toBeGreaterThan(100)
  expect(polylineLength(allele) / 600).toBeGreaterThan(0.95)
  expect(polylineLength(allele) / 600).toBeLessThan(1.05)
})

test('a deletion route arches above the backbone', () => {
  const route = `${ROUTE_ID}0`
  const { points } = placed(withAllele(route, 50))
  for (const p of points(route)) {
    expect(p.y).toBeLessThan(0)
  }
})

test('a component with no backbone stays unplaced', () => {
  const request = withAllele('a', 120)
  request.graph.nodes.push({ id: 'z', length: 40 })
  const { X } = stressPlacement(chains(request))
  expect(Number.isNaN(X[X.length - 1]!)).toBe(true)
  expect(Number.isNaN(X[0]!)).toBe(false)
})

const segmentsCross = (
  p: { x: number; y: number }[],
  q: { x: number; y: number }[],
) => {
  const side = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
  ) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  for (let i = 1; i < p.length; i++) {
    for (let j = 1; j < q.length; j++) {
      const [a, b, c, d] = [p[i - 1]!, p[i]!, q[j - 1]!, q[j]!]
      if (
        side(a, b, c) * side(a, b, d) < 0 &&
        side(c, d, a) * side(c, d, b) < 0
      ) {
        return true
      }
    }
  }
  return false
}

test('loops off either side of a short backbone node hang without crossing', () => {
  const request: StressRequest = {
    graph: {
      nodes: [
        backbone('v1', 0),
        { ...backbone('v2', 105), length: 5 },
        backbone('v3', 115),
        { id: 'a', length: 150 },
        { id: 'b', length: 45 },
      ],
      edges: [
        { from: 'v1', to: 'v2' },
        { from: 'v2', to: 'v3' },
        { from: 'v1', to: 'a' },
        { from: 'a', to: 'v2' },
        { from: 'v2', to: 'b' },
        { from: 'b', to: 'v3' },
      ],
    },
    options,
  }
  const { points } = placed(request)
  expect(segmentsCross(points('a'), points('b'))).toBe(false)
})

test('a short allele over a wide gap hangs deeper than one over a narrow gap', () => {
  const narrow = Math.max(
    ...placed(withAllele('a', 60))
      .points('a')
      .map(p => p.y),
  )
  const request = withAllele('a', 60)
  request.graph.nodes[1] = backbone('v2', 505)
  request.graph.nodes[2] = backbone('v3', 1010)
  request.graph.nodes[1].length = 500
  const wide = Math.max(
    ...placed(request)
      .points('a')
      .map(p => p.y),
  )
  expect(wide).toBeGreaterThan(narrow + 50)
})

test('a second loop over the same gap nests inside the first, feet at the anchors, neither above the backbone', () => {
  const request = withAllele('a', 600)
  request.graph.nodes.push({ id: 'b', length: 400 })
  request.graph.edges.push({ from: 'v1', to: 'b' }, { from: 'b', to: 'v3' })
  const { points } = placed(request)
  const a = points('a')
  const b = points('b')
  expect(segmentsCross(a, b)).toBe(false)
  for (const loop of [a, b]) {
    expect(Math.hypot(loop[0]!.x - 100, loop[0]!.y)).toBeLessThan(15)
    expect(Math.hypot(loop.at(-1)!.x - 210, loop.at(-1)!.y)).toBeLessThan(15)
    for (const p of loop) {
      expect(p.y).toBeGreaterThanOrEqual(-1e-6)
    }
  }
})
