import { C } from '../palette.js'

export const faunaDefs = {
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
  squirrel: {
    rows: [
      '...fff',
      '..fFff',
      '.fffff',
      '.feffe',
      '.fffff',
      'ffnnff',
      '.ffff.',
      '.f..f.',
      'ff..ff',
    ],
    pal: { f: '#c07840', F: '#e09858', n: '#201008', e: '#f0c8a0', },
  },
}
