// ============================================================================
// Système de sprites pixel-art généré en code.
// Chaque sprite est une grille de caractères -> couleurs (palette).
// On pré-rend chaque sprite sur un petit canvas hors-écran (mise en cache),
// puis on le dessine avec drawImage (rapide + net grâce au nearest-neighbor).
// ============================================================================

// --- Utilitaire couleur : éclaircir / assombrir un hex -----------------------
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255
  let g = (n >> 8) & 255
  let b = n & 255
  r = Math.max(0, Math.min(255, r + amt))
  g = Math.max(0, Math.min(255, g + amt))
  b = Math.max(0, Math.min(255, b + amt))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

// --- Construit un canvas hors-écran à partir d'une grille + palette ----------
// Robuste aux lignes de longueurs différentes (largeur = ligne la plus longue).
function build(rows, palette) {
  const h = rows.length
  let w = 0
  for (const r of rows) w = Math.max(w, r.length)
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')
  for (let y = 0; y < h; y++) {
    const row = rows[y]
    for (let x = 0; x < row.length; x++) {
      const c = palette[row[x]]
      if (!c) continue // '.' / ' ' / non défini = transparent
      ctx.fillStyle = c
      ctx.fillRect(x, y, 1, 1)
    }
  }
  return cv
}

// ------------------------------- Palettes -----------------------------------
const C = {
  green_d: '#3f6b34', green: '#5a9146', green_l: '#77b85e',
  trunk: '#6b4a2f', trunk_d: '#4a3320',
  bush_d: '#4e7d3e', bush: '#68a04f', berry: '#d9544d',
  rock: '#a7a9b0', rock_d: '#7d7f86', rock_l: '#c6c8ce',
  wood: '#b5895a', wood_d: '#8a6640', wood_l: '#d0a878',
  wall: '#efe0c4', wall_d: '#d8c39c',
  roof: '#c0655a', roof_d: '#9e4d45',
  roofb: '#6f9aa6', roofb_d: '#517681',
  roofbrown: '#8a5a3a', roofbrown_d: '#6a4229',
  door: '#5a3d27', glass: '#bfe3ef',
  fire_y: '#ffd24d', fire_o: '#f0872f', fire_r: '#e0532f',
  deer: '#b08050', deer_d: '#8a6038', spot: '#e8d3b0',
  water: '#5ba3c7', water_d: '#3d7fa6',
}

// ------------------------------- Sprites ------------------------------------
const DEFS = {
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
  // Buisson avec baies bien visibles (récoltable)
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
  // Buisson vide (en cooldown)
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
  // Rocher épuisé/fissuré
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
  grass: {
    rows: [
      '..g.g.',
      '.gggg.',
      'g.gg.g',
      '.g..g.',
    ],
    pal: { g: '#4e8a3e' },
  },
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
    rows: [
      'ww...ww',
      '.ww.ww.',
      '..www..',
    ],
    pal: { w: '#5a5a6a' },
  },
  // Grand chalet bois+pierre (village niveau 3)
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
  // Carrière : chantier avec grue en bois portant un bloc de pierre
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
  // Jardin : petit champ d'arbustes à baies
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
  // Petites icônes qui flottent quand on récolte
  icon_stone: {
    rows: [
      '.LRR.',
      'LRRRd',
      'LRRdd',
      '.Rdd.',
    ],
    pal: { L: C.rock_l, R: C.rock, d: C.rock_d },
  },
  icon_berries: {
    rows: [
      '.r.r.',
      'rRrRr',
      '.rRr.',
      '..g..',
    ],
    pal: { r: '#c83844', R: '#f05060', g: '#3a6030' },
  },
  icon_wood: {
    rows: [
      '.LLLL.',
      'LllllL',
      'LllllL',
      '.LLLL.',
    ],
    pal: { L: C.wood_d, l: C.wood_l },
  },
  icon_fish: {
    rows: [
      '.ffff.t',
      'ffffftt',
      'fFffftt',
      '.ffff.t',
    ],
    pal: { f: C.water, F: '#cdeaf5', t: C.water_d },
  },
  flower_pink: { rows: flowerRows(), pal: { p: '#e88fb0', Y: C.fire_y, s: C.green } },
  flower_white: { rows: flowerRows(), pal: { p: '#f3ecec', Y: C.fire_y, s: C.green } },
  flower_gold: { rows: flowerRows(), pal: { p: '#ffd98a', Y: '#e0952f', s: C.green } },
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
}

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

// ----------------------------- Accès + cache --------------------------------
const cache = new Map()

export function sprite(name) {
  if (cache.has(name)) return cache.get(name)
  const def = DEFS[name]
  if (!def) throw new Error('Sprite inconnu: ' + name)
  const cv = build(def.rows, def.pal)
  cache.set(name, cv)
  return cv
}

// Personnage : silhouette commune, couleur (chapeau + tunique) par joueur.
const CHAR_ROWS = [
  '.HHHHHH.',
  'HHHHHHHH',
  'HSSSSSSH',
  '.SSSSSS.',
  '.SoSSoS.',
  '.SSSSSS.',
  '.mBBBBm.',
  'sBBBBBBs',
  '.BBBBBB.',
  '.BBBBBB.',
  '.PP..PP.',
  '.f....f.',
]

export function characterSprite(color) {
  const key = 'char:' + color
  if (cache.has(key)) return cache.get(key)
  const pal = {
    H: shade(color, -35),
    B: color,
    m: shade(color, -30),
    S: '#f1c9a5',
    s: '#f1c9a5',
    o: '#3a2e28',
    P: '#41506b',
    f: '#4a3a2a',
  }
  const cv = build(CHAR_ROWS, pal)
  cache.set(key, cv)
  return cv
}

// Retourne un data-URL PNG d'un sprite (pour utilisation dans <img> HTML)
export function spriteUrl(name) {
  return sprite(name).toDataURL('image/png')
}

// Petite ombre douce sous les entités (ellipse pré-rendue)
export function shadowSprite(w) {
  const key = 'shadow:' + w
  if (cache.has(key)) return cache.get(key)
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = Math.max(2, Math.round(w * 0.4))
  const ctx = cv.getContext('2d')
  ctx.fillStyle = 'rgba(30,40,25,0.22)'
  ctx.beginPath()
  ctx.ellipse(cv.width / 2, cv.height / 2, cv.width / 2, cv.height / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  cache.set(key, cv)
  return cv
}
