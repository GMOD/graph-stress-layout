# @jbrowse/graph-stress-layout

Stress layout of a sequence graph by stochastic gradient descent (Zheng, Pawar &
Goodman 2019), in plain JS with no dependencies.

Key characteristics

- Target distances come from random walks along the graph, after odgi's
  path-guided SGD, so a repeat's loop draws as a ring of its own circumference.

- Each node is a chain of points at its drawn length, and the result is a
  polyline per node.

- A node of rank 0 is the reference backbone. Seeded along x, the backbone is
  held straight and in reference order, and the rest of the graph is drawn
  against it by a structural placement (`stressPlacement`): an allele as a lens
  under its gap, a longer one as a teardrop, a deletion as an arch, and nested
  pieces on the outside of their parent's curve. A component with a backbone
  keeps that drawing; the stress schedule lays out the components without one.

## Example

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

## See also

- [@jbrowse/bandage-core](https://github.com/GMOD/bandage-core) - Bandage layout
  and drawing engine
- [BandageJS](https://github.com/cmdcolin/BandageJS) - standalone page for GFA
  and gbz-base graphs
- [ggbandage](https://github.com/GMOD/ggbandage) - Bandage-style graph figures
  as ggplot2 layers
- [jbrowse-plugin-graphgenomeviewer](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer) -
  JBrowse 2 plugin that browses these graphs by locus

Tutorials on [jbrowse.org](https://jbrowse.org/jb2/docs/tutorials/)

- [HPRC part 3: repeat lengths](https://jbrowse.org/jb2/docs/tutorials/pangenome_hprc_repeats/)

## LICENSE

MIT
