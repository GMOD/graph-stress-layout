# @jbrowse/graph-stress-layout

Lays out a sequence graph in plain JS with no dependencies.

## Usage

```bash
npm install @jbrowse/graph-stress-layout
```

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

- Each node has a `length` in bp, and `stressLayout` returns `nodePositions`, a
  polyline of `{ x, y }` points per node id at the node's drawn length
- A node with `stable: { rank: 0, start }` is on the reference backbone.
  `seedBackbone` places the backbone end to end along x in order of `start`
- In a component with a seeded backbone, `stressPlacement` draws the backbone
  straight and places every other node against it: an allele as a lens under its
  gap, a longer one as a teardrop, a node whose id starts with `ROUTE_ID` as a
  deletion's arch, and nested pieces on the outside of their parent's curve
- A component with no backbone gets a stress layout by stochastic gradient
  descent (Zheng, Pawar & Goodman 2019). As in odgi's path-guided SGD, random
  walks along the graph set the target distances, so the layout draws a repeat's
  loop as a ring whose circumference is the loop's drawn length
- `stressLayout` reads `quality` (0 to 4, default 2), `seed` (default 1) and
  `componentSeparation` (default 15) from its second argument or from `options`

## See also

- [@jbrowse/bandage-core](https://github.com/GMOD/bandage-core) - Bandage layout
  and drawing engine
- [@jbrowse/graph-fmmm-layout](https://github.com/GMOD/graph-fmmm-layout) -
  Bandage's force-directed FMMM layout as wasm
- [BandageJS](https://github.com/cmdcolin/BandageJS) - browser viewer for GFA
  files, gfa-to-tabix walk files and gbz-base databases
- [ggbandage](https://github.com/GMOD/ggbandage) - Bandage-style graph figures
  as ggplot2 layers
- [jbrowse-plugin-graphgenomeviewer](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer) -
  JBrowse 2 plugin that browses these graphs by locus

Tutorials on [jbrowse.org](https://jbrowse.org/jb2/docs/tutorials/)

- [HPRC part 3: repeat lengths](https://jbrowse.org/jb2/docs/tutorials/pangenome_hprc_repeats/)

## LICENSE

MIT
