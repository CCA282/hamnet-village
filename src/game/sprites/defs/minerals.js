import { C } from '../palette.js'

export const mineralDefs = {
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
  meteorite: {
    rows: [
      '...ggg...',
      '..gMMMg..',
      '.gMmMmMg.',
      'gMMmMMMmg',
      '.gMMMMMg.',
      '..gMMMg..',
      '...ggg...',
    ],
    pal: { M: '#c8b8ff', m: '#ede8ff', g: '#5838a0' },
  },
}
