<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { netState } from '../net/netState.js'
import {
  createRoomAsHost, joinRoomAsGuest, broadcastState, leaveRoom,
  onGuestJoined, onGuestLeft, onInput, onGuestMenuAction,
  onState, onOpenMenu, onCloseMenu, onHostLeft, onDisconnected,
} from '../net/realtime.js'
import { serializeWorld, applyWorldState, listLocalSaves, loadLocal, deleteLocal, listServerSaves, loadServer } from '../net/sync.js'
import { login, signup, logout } from '../net/accounts.js'
import { engine } from '../game/engine.js'
import { game } from '../game/store.js'
import { clipboardCopy } from '../utils/clipboard.js'
import { startMusic } from '../game/audio.js'
import SettingsButton from './SettingsButton.vue'

function startOnce() { startMusic(); window.removeEventListener('pointerdown', startOnce) }
onMounted(() => window.addEventListener('pointerdown', startOnce))
onUnmounted(() => window.removeEventListener('pointerdown', startOnce))

// ── State ─────────────────────────────────────────────────────────────────────

const step = ref('home')        // home | local | online | new_local | new_online | join | saves_local | saves_server | auth
const error = ref('')
const busy = ref(false)
const roomCodeInput = ref('')
const displayCode = ref('')
const localSaves = ref([])
const serverSaves = ref([])
const worldNameInput = ref('')

// ── Compte (Supabase Auth) ──────────────────────────────────────────────────
// Les sauvegardes vont sur le compte si connecté, sinon dans le localStorage de cet appareil.

const authMode = ref('login')   // 'login' | 'signup'
const authEmail = ref('')
const authPassword = ref('')

function goAuth(mode) { step.value = 'auth'; authMode.value = mode; authEmail.value = ''; authPassword.value = ''; error.value = '' }

async function submitAuth() {
  error.value = ''
  busy.value = true
  try {
    const fn = authMode.value === 'signup' ? signup : login
    netState.user = await fn(authEmail.value.trim(), authPassword.value)
    goHome()
  } catch (e) {
    error.value = e.message || 'Erreur de connexion'
  }
  busy.value = false
}

async function doLogout() { await logout(); netState.user = null }

// Source unique des sauvegardes : le compte si connecté, sinon cet appareil.
async function listMySaves() { return netState.user ? await listServerSaves() : listLocalSaves() }
async function loadMyWorld(id) { return netState.user ? await loadServer(id) : loadLocal(id) }

// ── Navigation ────────────────────────────────────────────────────────────────

function goHome() { step.value = 'home'; error.value = ''; displayCode.value = ''; busy.value = false }

watch(() => netState.mode, (v) => { if (v === null) goHome() })
async function goLocal() {
  step.value = 'local'; error.value = ''
  try { localSaves.value = await listMySaves() } catch { localSaves.value = [] }
}
function goNewLocal() { step.value = 'new_local'; worldNameInput.value = ''; error.value = '' }
function goNewOnline() { step.value = 'new_online'; worldNameInput.value = ''; error.value = '' }
async function goOnline() { step.value = 'online'; error.value = '' }
async function goServerSaves() {
  step.value = 'saves_server'
  busy.value = true
  try { serverSaves.value = await listMySaves() } catch { serverSaves.value = [] }
  busy.value = false
}

// ── Local mode ────────────────────────────────────────────────────────────────

function startLocal(worldData = null, name = null) {
  if (worldData) applyWorldState(engine.world, worldData)
  netState.mode = 'local'
  if (worldData?.id) netState.worldId = worldData.id
  netState.worldName = name ?? worldData?.name ?? 'Mon monde'
}

function confirmNewLocal() {
  const name = worldNameInput.value.trim()
  if (!name) { error.value = 'Choisis un nom pour ton monde'; return }
  startLocal(null, name)
}

async function loadLocalWorld(id) {
  const data = await loadMyWorld(id)
  if (!data) { error.value = 'Sauvegarde introuvable'; return }
  startLocal(data)
}

function removeLocalSave(id) {
  deleteLocal(id)
  localSaves.value = listLocalSaves()
}

// ── Online host mode ──────────────────────────────────────────────────────────

async function createRoom(worldData = null, name = null) {
  error.value = ''; busy.value = true
  try {
    onGuestJoined(({ guestId, name }) => {
      const p = engine.world.addRemotePlayer(guestId, name)
      if (p) broadcastState({ ...serializeWorld(engine.world), guestPlayerId: p.id })
    })

    onGuestLeft(({ guestId }) => {
      const p = engine.world.players.find((pl) => pl.remoteGuestId === guestId)
      if (p) engine.world.removePlayer(p)
    })

    onInput(({ guestId, input }) => {
      engine.world.applyRemoteInput(guestId, input)
    })

    onGuestMenuAction(({ guestId, action }) => {
      engine.processGuestMenuAction(guestId, action)
    })

    onDisconnected(() => { netState.connected = false })

    const { code } = await createRoomAsHost()
    netState.connected = true
    displayCode.value = code
    netState.roomCode = code

    if (worldData) applyWorldState(engine.world, worldData)

    netState.worldName = name ?? worldData?.name ?? 'Mon monde'
    netState.mode = 'host'
    step.value = 'waiting_players'
  } catch {
    error.value = 'Impossible de se connecter au serveur'
    leaveRoom()
  }
  busy.value = false
}

async function confirmNewOnline() {
  const name = worldNameInput.value.trim()
  if (!name) { error.value = 'Choisis un nom pour ton monde'; return }
  await createRoom(null, name)
}

async function loadServerAndHost(id) {
  const data = await loadMyWorld(id)
  if (!data) { error.value = 'Monde introuvable'; return }
  await createRoom(data)
}

// ── Online guest mode ─────────────────────────────────────────────────────────

async function joinRoom() {
  const code = roomCodeInput.value.trim().toUpperCase()
  if (code.length !== 6) { error.value = 'Code invalide (6 caractères)'; return }
  error.value = ''; busy.value = true
  try {
    onState((snap) => {
      engine.applySnapshot(snap)
    })

    onOpenMenu(({ buildingId }) => {
      engine.applyRemoteMenuOpen(buildingId)
    })

    onCloseMenu(() => {
      game.buildingMenuOpen = false
      game.menuOpen = false
      game.buildingMenuOpener = null
      game.menuOpener = null
    })

    onHostLeft(() => { error.value = "L'hôte a quitté la partie" })
    onDisconnected(() => { netState.connected = false })

    // Reset before joining: the very first `state` broadcast can arrive (and set
    // myPlayerId from its guestPlayerId) before joinRoomAsGuest's promise resolves.
    netState.myPlayerId = null
    await joinRoomAsGuest(code, netState.playerName.trim() || null)
    netState.connected = true
    netState.roomCode = code
    netState.mode = 'guest'
  } catch (e) {
    error.value = e.message || 'Impossible de se connecter au serveur'
    leaveRoom()
  }
  busy.value = false
}

// ── Clipboard ─────────────────────────────────────────────────────────────────

const codeCopied = ref(false)
async function copyCode() {
  if (!displayCode.value) return
  await clipboardCopy(displayCode.value)
  codeCopied.value = true
  setTimeout(() => { codeCopied.value = false }, 2000)
}

// ── Start playing (close lobby) ───────────────────────────────────────────────

const playing = computed(() => netState.mode !== null && step.value !== 'waiting_players')
</script>

<template>
  <!-- Lobby overlay — hidden once game is running -->
  <transition name="lobby-fade">
    <div class="lobby" v-if="!playing">
      <SettingsButton />

      <!-- Home -->
      <div class="card" v-if="step === 'home'">
        <h1 class="title">🏡 Petit Hameau</h1>
        <p class="sub">Jeu de gestion cosy en co-op local</p>
        <div class="name-field">
          <label class="name-label">Votre pseudo</label>
          <input
            class="name-input"
            v-model="netState.playerName"
            placeholder="Joueur…"
            maxlength="12"
            spellcheck="false"
          />
        </div>
        <p class="auth-status" v-if="netState.user">
          Connecté : <strong>{{ netState.user.email }}</strong>
          · <a @pointerdown="doLogout">se déconnecter</a>
        </p>
        <p class="auth-status" v-else>
          <a @pointerdown="goAuth('login')">Se connecter</a> ou
          <a @pointerdown="goAuth('signup')">créer un compte</a>
          pour sauvegarder tes parties en ligne
        </p>
        <div class="actions">
          <button class="btn primary" @pointerdown="goLocal">🌿 Jouer en local</button>
          <button class="btn" @pointerdown="goOnline">🌐 Jouer en ligne</button>
        </div>
      </div>

      <!-- Connexion / inscription -->
      <div class="card" v-else-if="step === 'auth'">
        <h2>{{ authMode === 'signup' ? 'Créer un compte' : 'Se connecter' }}</h2>
        <input
          class="name-input"
          v-model="authEmail"
          type="email"
          placeholder="Email"
          spellcheck="false"
          autofocus
        />
        <input
          class="name-input"
          v-model="authPassword"
          type="password"
          placeholder="Mot de passe"
          @keydown.enter="submitAuth"
        />
        <div class="actions">
          <button class="btn primary" :disabled="busy || !authEmail.trim() || authPassword.length < 6" @pointerdown="submitAuth">
            {{ authMode === 'signup' ? "✨ Créer le compte" : "Connexion" }}
          </button>
        </div>
        <p class="sub small">
          <a v-if="authMode === 'login'" @pointerdown="authMode = 'signup'">Pas encore de compte ? En créer un</a>
          <a v-else @pointerdown="authMode = 'login'">Déjà un compte ? Se connecter</a>
        </p>
        <p class="err" v-if="error">{{ error }}</p>
        <button class="back" @pointerdown="goHome">← Retour</button>
      </div>

      <!-- Local -->
      <div class="card" v-else-if="step === 'local'">
        <h2>Jouer en local</h2>
        <div class="actions">
          <button class="btn primary" @pointerdown="goNewLocal">✨ Nouvelle partie</button>
          <button class="btn" :class="{ off: !localSaves.length }" @pointerdown="step = 'saves_local'">
            📂 Charger une partie
            <span class="badge" v-if="localSaves.length">{{ localSaves.length }}</span>
          </button>
        </div>
        <button class="back" @pointerdown="goHome">← Retour</button>
      </div>

      <!-- New local game (name input) -->
      <div class="card" v-else-if="step === 'new_local'">
        <h2>Nouvelle partie</h2>
        <input
          class="name-input"
          v-model="worldNameInput"
          placeholder="Nom du monde…"
          maxlength="32"
          @keydown.enter="confirmNewLocal"
          autofocus
        />
        <div class="actions">
          <button class="btn primary" :disabled="!worldNameInput.trim()" @pointerdown="confirmNewLocal">✨ Commencer</button>
        </div>
        <p class="err" v-if="error">{{ error }}</p>
        <button class="back" @pointerdown="step = 'local'">← Retour</button>
      </div>

      <!-- New online game (name input) -->
      <div class="card" v-else-if="step === 'new_online'">
        <h2>Créer une room</h2>
        <input
          class="name-input"
          v-model="worldNameInput"
          placeholder="Nom du monde…"
          maxlength="32"
          @keydown.enter="confirmNewOnline"
          autofocus
        />
        <div class="actions">
          <button class="btn primary" :disabled="busy || !worldNameInput.trim()" @pointerdown="confirmNewOnline">🎮 Créer la room</button>
        </div>
        <p class="err" v-if="error">{{ error }}</p>
        <button class="back" @pointerdown="step = 'online'">← Retour</button>
      </div>

      <!-- Saves list (compte si connecté, sinon cet appareil) -->
      <div class="card" v-else-if="step === 'saves_local'">
        <h2>Charger une partie</h2>
        <p class="sub small">{{ netState.user ? 'Sauvegardes de ton compte' : 'Sauvegardes sur cet appareil' }}</p>
        <div class="savelist" v-if="localSaves.length">
          <div v-for="s in localSaves" :key="s.id" class="save-row">
            <button class="save-entry" @pointerdown="loadLocalWorld(s.id)">
              <span class="sname">{{ s.name }}</span>
              <span class="sdate">{{ s.savedAt ? new Date(s.savedAt).toLocaleDateString('fr') : '' }}</span>
            </button>
            <button v-if="!netState.user" class="save-delete" @pointerdown.stop="removeLocalSave(s.id)" title="Supprimer">🗑</button>
          </div>
        </div>
        <p class="empty" v-else>Aucune sauvegarde</p>
        <p class="err" v-if="error">{{ error }}</p>
        <button class="back" @pointerdown="step = 'local'">← Retour</button>
      </div>

      <!-- Online -->
      <div class="card" v-else-if="step === 'online'">
        <h2>Jouer en ligne</h2>
        <div class="actions">
          <button class="btn primary" @pointerdown="goNewOnline">
            🎮 Créer une room
          </button>
          <button class="btn" @pointerdown="step = 'join'">🔑 Rejoindre une room</button>
          <button class="btn" @pointerdown="goServerSaves">
            💾 Charger un monde
          </button>
        </div>
        <p class="err" v-if="error">{{ error }}</p>
        <button class="back" @pointerdown="goHome">← Retour</button>
      </div>

      <!-- Join room -->
      <div class="card" v-else-if="step === 'join'">
        <h2>Rejoindre une room</h2>
        <input
          class="code-input"
          v-model="roomCodeInput"
          placeholder="CODE (6 lettres)"
          maxlength="6"
          spellcheck="false"
          @keydown.enter="joinRoom"
        />
        <div class="actions">
          <button class="btn primary" :disabled="busy" @pointerdown="joinRoom">Rejoindre</button>
        </div>
        <p class="err" v-if="error">{{ error }}</p>
        <button class="back" @pointerdown="step = 'online'">← Retour</button>
      </div>

      <!-- Saves to host online (compte si connecté, sinon cet appareil) -->
      <div class="card" v-else-if="step === 'saves_server'">
        <h2>Charger un monde</h2>
        <p class="sub small">{{ netState.user ? 'Sauvegardes de ton compte' : 'Sauvegardes sur cet appareil' }}</p>
        <p v-if="busy" class="loading">Chargement…</p>
        <div class="savelist" v-else-if="serverSaves.length">
          <button
            v-for="s in serverSaves" :key="s.id"
            class="save-entry"
            @pointerdown="loadServerAndHost(s.id)"
          >
            <span class="sname">{{ s.name }}</span>
            <span class="sdate">{{ s.savedAt ? new Date(s.savedAt).toLocaleDateString('fr') : '' }}</span>
          </button>
        </div>
        <p class="empty" v-else>Aucune sauvegarde</p>
        <p class="err" v-if="error">{{ error }}</p>
        <button class="back" @pointerdown="step = 'online'">← Retour</button>
      </div>

      <!-- Waiting for players (host) -->
      <div class="card" v-else-if="step === 'waiting_players'">
        <h2>Room créée</h2>
        <p class="sub">Partagez ce code avec vos amis :</p>
        <div class="room-code" @pointerdown="copyCode" title="Cliquer pour copier">{{ displayCode }}</div>
        <p class="sub small copy-hint">{{ codeCopied ? '✓ Code copié !' : 'Cliquez sur le code pour le copier' }}</p>
        <p class="sub small">En attente de joueurs… Vous pouvez commencer à jouer dès maintenant.</p>
        <div class="actions">
          <button class="btn primary" @pointerdown="step = 'playing'">🎮 Jouer !</button>
        </div>
      </div>

    </div>
  </transition>
</template>

<style scoped>
.lobby {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, #37492f 0%, #26331f 60%, #1e2819 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.card {
  background: var(--cozy-panel);
  border: 3px solid rgba(0,0,0,0.14);
  border-radius: 22px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  padding: 36px 40px 30px;
  min-width: 320px;
  max-width: 420px;
  width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
  text-align: center;
  color: var(--cozy-ink);
}

.title { margin: 0; font-size: 32px; }
h2 { margin: 0; font-size: 20px; }
.sub { margin: 0; font-size: 14px; color: var(--cozy-ink-soft); }
.sub.small { font-size: 12px; }

.auth-status { margin: 0; font-size: 12px; color: var(--cozy-ink-soft); }
.card a { color: var(--cozy-gold); cursor: pointer; text-decoration: underline; }

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.btn {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 800;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  background: var(--cozy-panel-dark);
  color: var(--cozy-ink);
  box-shadow: inset 0 -3px 0 rgba(0,0,0,0.15);
  transition: transform 0.08s, opacity 0.08s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(1px); box-shadow: none; }
.btn.primary {
  background: var(--cozy-gold);
  color: #3a2a12;
  box-shadow: inset 0 -3px 0 rgba(0,0,0,0.20);
}
.btn.off { opacity: 0.55; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.badge {
  background: rgba(0,0,0,0.18);
  border-radius: 999px;
  font-size: 11px;
  padding: 1px 7px;
}

.name-field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-start;
}
.name-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--cozy-ink-soft);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.name-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  font-size: 17px;
  font-weight: 700;
  text-align: center;
  border: 2px solid rgba(0,0,0,0.18);
  border-radius: 12px;
  background: var(--cozy-panel-dark);
  color: var(--cozy-ink);
  outline: none;
}
.name-input:focus { border-color: var(--cozy-gold); }
.name-input::placeholder { color: var(--cozy-ink-soft); font-weight: 600; }

.code-input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 8px;
  text-align: center;
  text-transform: uppercase;
  border: 2px solid rgba(0,0,0,0.18);
  border-radius: 12px;
  background: var(--cozy-panel-dark);
  color: var(--cozy-ink);
  outline: none;
}
.code-input:focus { border-color: var(--cozy-gold); }

.copy-hint { transition: color 0.2s; color: var(--cozy-gold) !important; font-weight: 700 !important; }

.room-code {
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.room-code:hover { background: var(--cozy-panel-dark); transform: scale(1.03); }
.room-code:active { transform: scale(0.98); }

.room-code {
  font-size: 40px;
  font-weight: 900;
  letter-spacing: 10px;
  color: var(--cozy-gold);
  background: var(--cozy-panel-dark);
  border-radius: 14px;
  padding: 14px 20px;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
}

.savelist {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.save-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.save-entry {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 14px;
  background: var(--cozy-panel-dark);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  color: var(--cozy-ink);
  transition: border-color 0.1s;
}
.save-entry:hover { border-color: var(--cozy-gold); }
.sname { font-size: 14px; }
.sdate { font-size: 11px; color: var(--cozy-ink-soft); }
.save-delete {
  flex-shrink: 0;
  background: none;
  border: 2px solid transparent;
  border-radius: 10px;
  padding: 9px 10px;
  font-size: 15px;
  cursor: pointer;
  color: var(--cozy-ink-soft);
  transition: border-color 0.1s, color 0.1s;
  line-height: 1;
}
.save-delete:hover { border-color: #c05040; color: #c05040; }

.empty { color: var(--cozy-ink-soft); font-size: 14px; }
.loading { color: var(--cozy-ink-soft); }
.err { color: #e05050; font-size: 13px; font-weight: 700; }

.back {
  background: none;
  border: none;
  color: var(--cozy-ink-soft);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  align-self: flex-start;
}
.back:hover { color: var(--cozy-ink); }

.lobby-fade-enter-active, .lobby-fade-leave-active { transition: opacity 0.4s; }
.lobby-fade-enter-from, .lobby-fade-leave-to { opacity: 0; }
</style>
