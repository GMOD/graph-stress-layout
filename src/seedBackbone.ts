import { drawnLength, num } from './stressEngine.ts'

import type { StressNode, StressRequest } from './types.ts'

// The backbone end to end along x in reference order, each node at the drawn
// length the engine gives it and a link from the next. That is the start
// stressPlacement lays the rest of an anchored graph against, and what the
// reference term holds straight. Other nodes are left unseeded, and a node
// already seeded keeps its own.
export function seedBackbone(request: StressRequest): StressRequest {
  const { options } = request
  const link = num(options.edgeLength, 1)
  const backbone = request.graph.nodes
    .filter(n => n.stable?.rank === 0 && n.stable.start !== undefined)
    .sort((a, b) => a.stable!.start! - b.stable!.start!)
  const seeds = new Map<string, Pick<StressNode, 'x' | 'y'>>()
  let x = 0
  for (const node of backbone) {
    seeds.set(node.id, { x, y: 0 })
    x += drawnLength(options, node.length) + link
  }
  return {
    ...request,
    graph: {
      ...request.graph,
      nodes: request.graph.nodes.map(node =>
        node.x === undefined && seeds.has(node.id)
          ? { ...node, ...seeds.get(node.id) }
          : node,
      ),
    },
  }
}
