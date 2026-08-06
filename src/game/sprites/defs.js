import { C } from './palette.js'

function flowerRows() {
  return [
    '..p..',
    '.ppp.',
    'ppYpp',
    '.ppp.',
    '..s..',
    '..s..',
  ]
}

// ── Sprite definitions ────────────────────────────────────────────────────────
// Format : { rows: string[], pal: Record<char, hexColor> }
// '.' / ' ' = pixel transparent
// Pour ajouter un sprite : ajouter une entrée ici, puis l'utiliser via sprite('key')

export const DEFS = {
  // ── Végétation ──────────────────────────────────────────────────────────────
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

  // ── Minerais ────────────────────────────────────────────────────────────────
  rock: {
    rows: [
      '...LLRR....',
      '..LRRRRRd..',
      '.LRRRRRRRd.',
      'LRRRRRRRRRd',
      '.dRRRRRRdd.',
      '..dddddd...',
    ],
    pal: { R: C.rock, d: C.rock_d, L: C.rock_l },
  },
  rock_depleted: {
    rows: [
      '...dRdd....',
      '..dRXRdd...',
      '.dRRXRRdd..',
      'dRRXXXRRdd.',
      '.dRXXRdddd.',
      '..dXdddddd.',
    ],
    pal: { R: C.rock, d: C.rock_d, X: '#28282e' },
  },

  // ── Bâtiments ───────────────────────────────────────────────────────────────
  house: {
    rows: [
      '........RR........',
      '.......RRRR.......',
      '......RRRRRR......',
      '.....RRRRRRRR.....',
      '....RRRRRRRRRR....',
      '...RRRRRRRRRRRR...',
      '..RRRRRRRRRRRRRR..',
      '.rrrrrrrrrrrrrrrr.',
      '..WWWWWWWWWWWWWW..',
      '..WWWWWWWWWWWWWW..',
      '..WGgWWWWWWWWGgW..',
      '..WGgWWWWWWWWGgW..',
      '..WWWWWWWWWWWWWW..',
      '..WWWWWDDDDWWWWW..',
      '..WWWWWDDDDWWWWW..',
      '..WWWWWDDDDWWWWW..',
      '..WWWWWDDDDWWWWW..',
      '..wwwwwwwwwwwwww..',
    ],
    pal: { R: C.roof, r: C.roof_d, W: C.wall, w: C.wall_d, G: C.wall_d, g: C.glass, D: C.door },
  },
  cabin: {
    rows: [
      '....RRRRRRRRRR....',
      '...RRRRRRRRRRRR...',
      '..RRRRRRRRRRRRRR..',
      '.rrrrrrrrrrrrrrrr.',
      '.WWWWWWWWWWWWWWWW.',
      '.wwwwwwwwwwwwwwww.',
      '.WWGgWWWWWWWWWWWW.',
      '.WWGgWWWWWDDDWWWW.',
      '.wwwwwwwwwDDDwwww.',
      '.WWWWWWWWWDDDWWWW.',
      '.WWWWWWWWWDDDWWWW.',
      '.wwwwwwwwwwwwwwww.',
      '.LLLL.WWWWWWWWWWW.',
      '.LLLL.wwwwwwwwwww.',
    ],
    pal: { R: C.roofbrown, r: C.roofbrown_d, W: C.wood, w: C.wood_d, G: C.wood_d, g: C.glass, D: C.door, L: C.wood_l },
  },
  hut: {
    rows: [
      '....RRRRRRRRRR....',
      '...RRRRRRRRRRRR...',
      '..RRRRRRRRRRRRRR..',
      '.rrrrrrrrrrrrrrrr.',
      '.WWWWWWWWWWWWWWWW.',
      '.wwwwwwwwwwwwwwww.',
      '.WWGgWWWWDDDWWWWW.',
      '.WWGgWWWWDDDWWWWW.',
      '.wwwwwwwwDDDwwwww.',
      '.WWWWWWWWDDDWWWWW.',
      '.WWWWWWWWWWWWWWWW.',
      '.wwwwwwwwwwwwwwww.',
      '..pp..pp..pp..pp.',
      '..pp..pp..pp..pp.',
    ],
    pal: { R: C.roofb, r: C.roofb_d, W: C.wood, w: C.wood_d, G: C.wood_d, g: C.glass, D: C.door, p: C.wood_d },
  },
  chalet: {
    rows: [
      '..........cc..........',
      '.........cRRc.........',
      '.......RRRRRRRRRr.....',
      '......RRRRRRRRRRRr....',
      '.....RRRRRRRRRRRRRr...',
      '....rRRRRRRRRRRRRRRr..',
      '...rRRRRRRRRRRRRRRRrr.',
      '..rrrrrrrrrrrrrrrrrrr.',
      '..WWWWWWWWWWWWWWWWWWW.',
      '..WwWWWWWWWWWWWWWwWWW.',
      '..WGgWWWFFWWFFWWWGgWW.',
      '..WGgWWWffWWffWWWGgWW.',
      '..WwWWWWWDDWWWWWwWWW..',
      '..SSSSSSSSSSSSSSSSss..',
      '..sSSSSSSSSSSSSSSSss..',
      '..ssssssssssssssssss..',
    ],
    pal: {
      R: '#8a4e22', r: '#5c3010',
      W: '#cb8a42', w: '#9a6228',
      S: '#a0a2aa', s: '#707280',
      D: '#3a2818',
      G: '#4090b2', g: '#c0e6f8',
      c: '#70737e',
      F: '#e88ab2', f: '#3a8028',
    },
  },
  quarry: {
    rows: [
      '..............TT..',
      '..TttttttttttTTT.',
      '...r...........T.',
      '...r...........T.',
      '...SSSS........T.',
      '...SSdd........T.',
      '...dddd........T.',
      '..TTTTTTTTTTTTT..',
      '.WWWWWWWWWWWWWWWW',
      '.WwwwwwwwwwwwwwwW',
      '.SSSSSSSSSSSSSSSS',
      '..ssssssssssssss.',
    ],
    pal: {
      T: '#8a5c34', t: '#5a3a20',
      W: '#cb8a42', w: '#9a6228',
      S: C.rock_l, d: C.rock_d,
      r: '#2c1c0c',
    },
  },
  garden: {
    rows: [
      '.bb.bb.bb.bb.',
      'bBBbBBbBBbBBb',
      'bBrBBrBBrBBrB',
      'bBBBBBBBBBBBb',
      'bBrBBrBBrBBrB',
      'bBBbBBbBBbBBb',
      '.bb.bb.bb.bb.',
      '..............',
      '..pppppppppp..',
      '...eeeeeeee...',
    ],
    pal: {
      b: '#4a7838', B: '#5e9a48', r: '#cc3030',
      p: '#8a5c34', e: '#7a5030',
    },
  },

  // ── Faune ───────────────────────────────────────────────────────────────────
  deer: {
    rows: [
      '............t...',
      '...........bbt..',
      '..........bbbb..',
      '.bbSbbSbbbbbbb..',
      'bbbbbbbSbbbbbb..',
      'bbbSbbbbbbbbb...',
      '.ll..ll..ll.....',
      '.ll..ll..ll.....',
      '.d...d...d......',
    ],
    pal: { b: C.deer, l: C.deer_d, d: C.trunk_d, S: C.spot, t: C.trunk },
  },
  bird: {
    rows: ['ww...ww', '.ww.ww.', '..www..'],
    pal: { w: '#5a5a6a' },
  },

  // ── Ambiance village ────────────────────────────────────────────────────────
  campfire: {
    rows: [
      '..........',
      '....yy....',
      '...yoy....',
      '..yooyy...',
      '..yoroy...',
      '..orrroo..',
      '.sSrrrrSs.',
      'sSs.rr.sSs',
      '.ss....ss.',
    ],
    pal: { y: C.fire_y, o: C.fire_o, r: C.fire_r, s: C.rock_d, S: C.rock },
  },
  cart: {
    rows: [
      'h..TTTTTTT.',
      'h..TcccccT.',
      'h..TcccccT.',
      '...TTTTTTTT',
      '....T....T.',
      '...wWw..wWw',
    ],
    pal: { T: '#cb8a42', c: '#3e2010', h: '#8a5c34', w: '#2c1c0c', W: '#4a3010' },
  },

  // ── Icônes ressources ───────────────────────────────────────────────────────
  icon_wood: {
    rows: ['.LLLL.', 'LllllL', 'LllllL', '.LLLL.'],
    pal: { L: C.wood_d, l: C.wood_l },
  },
  icon_fish: {
    rows: ['.ffff.t', 'ffffftt', 'fFffftt', '.ffff.t'],
    pal: { f: C.water, F: '#cdeaf5', t: C.water_d },
  },
  icon_stone: {
    rows: ['.LRR.', 'LRRRd', 'LRRdd', '.Rdd.'],
    pal: { L: C.rock_l, R: C.rock, d: C.rock_d },
  },
  icon_berries: {
    rows: ['.r.r.', 'rRrRr', '.rRr.', '..g..'],
    pal: { r: '#c83844', R: '#f05060', g: '#3a6030' },
  },
}
