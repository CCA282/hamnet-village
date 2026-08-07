import { C } from '../palette.js'

function flowerRows() {
  return ['..p..', '.ppp.', 'ppYpp', '.ppp.', '..s..', '..s..']
}

export const vegetationDefs = {
  tree: {
    rows: [
      '......llgg......',
      '....llgggggg....',
      '...lgggggggdd...',
      '..lggggggggddd..',
      '..lggggggggddd..',
      '.lgggggggggdddd.',
      '.gggggggggggddd.',
      'ggggggggggggdddd',
      'ggggggggggggdddd',
      '.gggggggggggddd.',
      '.gggggggggggddd.',
      '..ggggggggdddd..',
      '..gggggggdddd...',
      '...ggggddddd....',
      '.....gggdd......',
      '.......tt.......',
      '.......tt.......',
      '......TttT......',
    ],
    pal: { g: C.green, l: C.green_l, d: C.green_d, t: C.trunk, T: C.trunk_d },
  },
  stump: {
    rows: [
      '..tttttt..',
      '.tRRRRRRt.',
      'tRRRRRRRRt',
      'tRRttttRRt',
      'tRRRRRRRRt',
      '.tRRRRRRt.',
      '.TTTTTTTT.',
    ],
    pal: { t: C.trunk_d, R: '#8a5c34', T: '#3a2818' },
  },
  grass: {
    rows: ['..g.g.', '.gggg.', 'g.gg.g', '.g..g.'],
    pal: { g: '#4e8a3e' },
  },
  bush: {
    rows: [
      '..bbbbb...',
      '.bbBrBbb..',
      'bbBBBBBrb.',
      'bBrBBBBBBb',
      'bBBBBBrBBb',
      '.bBBBBBb..',
      '..bbbbb...',
    ],
    pal: { b: C.bush_d, B: C.bush, r: C.berry },
  },
  bush_full: {
    rows: [
      '..bbbbb...',
      '.bbBrBbb..',
      'bbBrBBrBb.',
      'bBBrBBBrBb',
      'bBBBBrBBBb',
      '.bBBBBBb..',
      '..bbbbb...',
    ],
    pal: { b: C.bush_d, B: C.bush, r: '#cc3030' },
  },
  bush_empty: {
    rows: [
      '..bbbbb...',
      '.bbBbBbb..',
      'bbBBBBBbb.',
      'bBBBBBBBBb',
      'bBBBBBBBBb',
      '.bBBBBBb..',
      '..bbbbb...',
    ],
    pal: { b: '#4a5230', B: '#5c6a3a' },
  },
  flower_pink:  { rows: flowerRows(), pal: { p: '#e88fb0', Y: C.fire_y, s: C.green } },
  flower_white: { rows: flowerRows(), pal: { p: '#f3ecec', Y: C.fire_y, s: C.green } },
  flower_gold:  { rows: flowerRows(), pal: { p: '#ffd98a', Y: '#e0952f', s: C.green } },

  // Noisette (petite graine) — avant arrosage
  noisette: {
    rows: [
      '..nnn...',
      '.nNNNn..',
      '.nNNNSn.',
      '..nnn...',
      '..Ss....',
      '..ss....',
    ],
    pal: { n: '#7a5028', N: '#a06838', S: '#c08848', s: '#5a3d1a' },
  },

  // Noisetier stade 1 — jeune arbre
  noisetier_1: {
    rows: [
      '....hHh.....',
      '...hHHHhh...',
      '..hHHHHHHh..',
      '.hHHhHHHHHh.',
      'hHHHHHHhHHHh',
      'hHHHHHHHHHHh',
      '.hHHHHHHHHh.',
      '.hHhHHHHhHh.',
      '..hHHHHHHh..',
      '...hhhhhh...',
      '....tttt....',
      '....tttt....',
      '....TTtT....',
    ],
    pal: { h: '#4a7c38', H: '#62a04e', t: C.trunk, T: C.trunk_d },
  },

  // Noisetier stade 2 — arbre adulte avec noisettes
  noisetier_2: {
    rows: [
      '......hHhh......',
      '....hhHHHHhh....',
      '...hHHHHHHHHh...',
      '..hHHHnHHHHHHh..',
      '.hHHHHHHHnHHHHh.',
      'hHHHHHHHHHHHHHHh',
      'hHHnHHHHHHHHnHHh',
      'hHHHHHHhHHHHHHHh',
      '.hHHHHHHHHHHHHh.',
      '.hHnHHHHHHHnHHh.',
      '..hHHHHHHHHHHh..',
      '...hhhhhhhhhhh..',
      '.....tttttttt...',
      '.....tttttttt...',
      '.....TTttTTtt...',
    ],
    pal: { h: '#3d6b2e', H: '#559440', n: '#b87820', t: C.trunk, T: C.trunk_d },
  },

  // Noisetier stade 3 — grand arbre majestueux
  noisetier_3: {
    rows: [
      '.......hHHhh.......',
      '.....hhHHHHHHhh....',
      '....hHHHHHHHHHHh...',
      '...hHHHnHHHHHHHHh..',
      '..hHHHHHHHnHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh',
      'hHHHHHHHHHHHHHHHHHHh',
      'hHHnHHHHHHHHHHnHHHHh',
      'hHHHHHHhHHHHHHHHHHHh',
      '.hHHHHHHHHHHnHHHHHHh',
      '.hHnHHHHHHHHHHHHHHh.',
      '..hHHHHHHHHHHHHHHh..',
      '...hHHnHHHHHHHnHHh..',
      '....hHHHHHHHHHHHh...',
      '.....hhhhhhhhhhh....',
      '......tttttttttt....',
      '......TTttttttTT....',
      '.......TTttttTT.....',
    ],
    pal: { h: '#2e5422', H: '#4a8038', n: '#c88428', t: C.trunk, T: C.trunk_d },
  },
}
