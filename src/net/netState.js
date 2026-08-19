import { reactive, watch } from 'vue'
import { fetchMe } from './accounts.js'

export const netState = reactive({
  mode: null,         // null | 'local' | 'host' | 'guest'
  roomCode: null,
  connected: false,
  myPlayerId: null,   // guest: which player ID is controlled locally
  worldId: null,      // current world save ID (local or server)
  worldName: 'Mon monde',
  playerName: localStorage.getItem('hamnet_player_name') || '',
  user: null,          // { id, username } si connecté via accounts-service, sinon null
})

watch(() => netState.playerName, (v) => localStorage.setItem('hamnet_player_name', v))

fetchMe().then((user) => { netState.user = user })
