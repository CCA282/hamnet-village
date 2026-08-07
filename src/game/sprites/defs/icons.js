import { C } from '../palette.js'

export const iconDefs = {
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
  icon_meteorite: {
    rows: ['.mM.', 'mMMm', '.mMm', '..m.'],
    pal: { M: '#d8c8ff', m: '#7850c8' },
  },
  icon_pioche: {
    rows: ['....Mm', '...Mmm', '.mMm..', 'mMm...', 'mm....', 'm.....'],
    pal: { M: '#d8c8ff', m: '#7850c8' },
  },
}
