import { seedBackbone } from './seedBackbone.ts'
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

type Allele = [id: string, length: number, from: string, to: string]

// a reference of [id, length] nodes in a row, each allele linked from the end
// of one reference node to the start of another
function bubbles(
  reference: [string, number][],
  alleles: Allele[],
  nodeLengthPerMegabase = 1_000_000,
): StressRequest {
  let start = 0
  const nodes: StressNode[] = reference.map(([id, length]) => {
    const node = { id, length, stable: { rank: 0, start } }
    start += length
    return node
  })
  return seedBackbone({
    graph: {
      nodes: [
        ...nodes,
        ...alleles.map(([id, length], i) => ({
          id,
          length,
          stable: { rank: i + 1 },
        })),
      ],
      edges: [
        ...reference
          .slice(1)
          .map(([id], i) => ({ from: reference[i]![0], to: id })),
        ...alleles.flatMap(([id, , from, to]) => [
          { from, to: id },
          { from: id, to },
        ]),
      ],
    },
    options: { ...options, nodeLengthPerMegabase },
  })
}

const distanceToSegment = (
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const f = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)),
  )
  return Math.hypot(p.x - a.x - f * dx, p.y - a.y - f * dy)
}

// every allele's two links pass more than `clear` from every other allele's
// nodes and cross neither those nodes nor their links
function expectLinksClear(
  request: StressRequest,
  alleles: Allele[],
  clear = 10,
) {
  const { points } = placed(request)
  const drawn = alleles.map(([id, , from, to]) => {
    const pts = points(id)
    const a = points(from).at(-1)!
    const b = points(to)[0]!
    return {
      id,
      pts,
      links: [
        [a, pts[0]!],
        [pts.at(-1)!, b],
      ],
      path: [a, ...pts, b],
    }
  })
  for (const s of drawn) {
    for (const t of drawn.filter(other => other !== s)) {
      for (const [a, b] of s.links) {
        expect(segmentsCross([a!, b!], t.path)).toBe(false)
        for (const p of t.pts) {
          expect(distanceToSegment(p, a!, b!)).toBeGreaterThan(clear)
        }
      }
    }
  }
  return points
}

const lowest = (pts: { y: number }[]) =>
  pts.reduce((m, p) => Math.min(m, p.y), Infinity)
const highest = (pts: { y: number }[]) =>
  pts.reduce((m, p) => Math.max(m, p.y), -Infinity)

// chr3:162.77-162.92 Mb in HPRC v2.1's GRCh38 rGFA, at the scale the graph
// track drew it: 15 bp of HG02523 replace 114 kb of GRCh38, and 2.3 kb of
// HG01981 replace the 21.9 kb in the middle of that
const nestedDeletions: Allele[] = [
  ['outer', 15, 'left', 'right'],
  ['inner', 2279, 'outer.start', 'outer.end'],
]

test('a deletion nested in a longer one hangs as its own detour, clear of the outer links', () => {
  const points = expectLinksClear(
    bubbles(
      [
        ['left', 28_766],
        ['outer.start', 13_608],
        ['inner.gap', 21_916],
        ['outer.end', 78_692],
        ['right', 11_259],
      ],
      nestedDeletions,
      710,
    ),
    nestedDeletions,
  )
  expect(lowest(points('outer'))).toBeGreaterThan(highest(points('inner')) + 10)
})

test('a deletion sharing its left anchor with a shorter one inside it hangs clear of that one', () => {
  expectLinksClear(
    bubbles(
      [
        ['left', 50],
        ['m1', 60],
        ['m2', 140],
        ['right', 50],
      ],
      [
        ['outer', 5, 'left', 'right'],
        ['inner', 5, 'left', 'm2'],
      ],
    ),
    [
      ['outer', 5, 'left', 'right'],
      ['inner', 5, 'left', 'm2'],
    ],
  )
})

test('three deletions nested off centre hang with no link through another allele', () => {
  const alleles: Allele[] = [
    ['outermost', 5, 'left', 'right'],
    ['mid', 5, 'a', 'd'],
    ['inner', 5, 'b', 'c'],
  ]
  expectLinksClear(
    bubbles(
      [
        ['left', 50],
        ['a', 10],
        ['b', 10],
        ['g', 15],
        ['c', 56],
        ['d', 500],
        ['right', 50],
      ],
      alleles,
    ),
    alleles,
  )
})

test('equal alleles over one gap hang stacked under its centre', () => {
  const { points } = placed(
    bubbles(
      [
        ['v1', 100],
        ['v2', 590],
        ['v3', 100],
      ],
      [
        ['p', 5, 'v1', 'v3'],
        ['q', 5, 'v1', 'v3'],
      ],
    ),
  )
  const p = points('p')
  const q = points('q')
  for (const allele of [p, q]) {
    expect((allele[0]!.x + allele.at(-1)!.x) / 2).toBeCloseTo(400)
  }
  expect(Math.abs(lowest(p) - lowest(q))).toBeGreaterThanOrEqual(15)
})

test('a deletion over one that dropped to clear its own links hangs below it, its links crossing none', () => {
  const alleles: Allele[] = [
    ['outer', 5, 'left', 'right'],
    ['inner', 5, 'a', 'd'],
    ['innermost', 5, 'b', 'c'],
    ['beside', 5, 'p', 'a'],
  ]
  const points = expectLinksClear(
    bubbles(
      [
        ['left', 50],
        ['p', 10],
        ['q', 5],
        ['a', 30],
        ['b', 5],
        ['g', 10],
        ['c', 5],
        ['d', 5],
        ['right', 50],
      ],
      alleles,
    ),
    alleles,
    0,
  )
  expect(lowest(points('outer'))).toBeGreaterThan(highest(points('inner')))
})
