// A node as the engine takes it. `length` is in bp, drawn at the request's
// `nodeLengthPerMegabase`. A node of rank 0 is the reference backbone, `start`
// its reference position, and an optional `x`/`y` is where its chain starts: a
// backbone seeded along x is held straight and in order.
export interface StressNode {
  id: string
  length: number
  x?: number
  y?: number
  stable?: { rank: number; start?: number }
}

// A link leaves the END of `from` read `fromStrand` and arrives at the START of
// `to` read `toStrand`. An id ending in `+` or `-` is a node read that way, so a
// strand that disagrees with it enters the other side.
export interface StressEdge {
  from: string
  to: string
  fromStrand?: '+' | '-'
  toStrand?: '+' | '-'
}

// `options` carries the drawn scale (`nodeLengthPerMegabase`,
// `minimumNodeLength`, `nodeSegmentLength`, `edgeLength`) and, unless
// StressOptions says otherwise, `quality` (0-4), `seed` and
// `componentSeparation`.
export interface StressRequest {
  graph: {
    nodes: StressNode[]
    edges: StressEdge[]
  }
  options: Record<string, unknown>
}

export interface NodeSegment {
  x: number
  y: number
}

export interface LayoutResult {
  nodePositions: Record<string, NodeSegment[]>
}
