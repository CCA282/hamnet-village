import { vegetationDefs } from './vegetation.js'
import { mineralDefs }    from './minerals.js'
import { buildingDefs }   from './buildings.js'
import { faunaDefs }      from './fauna.js'
import { villageDefs }    from './village.js'
import { iconDefs }       from './icons.js'

export const DEFS = {
  ...vegetationDefs,
  ...mineralDefs,
  ...buildingDefs,
  ...faunaDefs,
  ...villageDefs,
  ...iconDefs,
}
