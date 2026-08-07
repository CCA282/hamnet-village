import { C } from '../palette.js'

export const villageDefs = {
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
}
