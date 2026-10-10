# @jbrowse/graph-stress-layout

Stress layout of a sequence graph by stochastic gradient descent (Zheng, Pawar &
Goodman 2019), in plain JS with no dependencies. Target distances come from
random walks along the graph, after odgi's path-guided SGD, so a repeat's loop
draws as a ring of its own circumference. Each node is a chain of points at its
drawn length, and the result is a polyline per node.

A node of rank 0 is the reference backbone. Seeded along x, the backbone is held
straight and in reference order, and the rest of the graph starts from a
structural placement against it (`stressPlacement`).

```ts
import { seedBackbone, stressLayout } from '@jbrowse/graph-stress-layout'

const { nodePositions } = stressLayout(
  seedBackbone({
    graph: {
      nodes: [
        { id: 'a', length: 1200, stable: { rank: 0, start: 0 } },
        { id: 'b', length: 800, stable: { rank: 0, start: 1200 } },
        { id: 'ins', length: 5000, stable: { rank: 1 } },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'ins' },
        { from: 'ins', to: 'b' },
      ],
    },
    options: {
      nodeLengthPerMegabase: 20_000,
      minimumNodeLength: 5,
      nodeSegmentLength: 10,
      edgeLength: 5,
    },
  }),
)
```

It is the stress engine of
[@jbrowse/bandage-core](https://github.com/GMOD/bandage-core), split out under
MIT so a host that does not take bandage-core's GPL can draw with it.
