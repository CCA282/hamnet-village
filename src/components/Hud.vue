<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { game, fmt, effectiveInterval, globalCap } from '../game/store.js'
import { spriteUrl } from '../game/sprites/index.js'
import { netState } from '../net/netState.js'
import { saveLocal, saveServer } from '../net/sync.js'
import { engine } from '../game/engine.js'

const displayHint = computed(() => {
  if (netState.mode === 'guest') {
    const myPlayer = game.players.find((p) => p.id === netState.myPlayerId)
    return myPlayer?.hint ?? ''
  }
  return game.hint
})

const saveMsg = ref('')
const showConfirmQuit = ref(false)
let saveMsgTimer = null

async function triggerSave() {
  if (netState.mode === 'local') {
    const id = netState.worldId || (crypto.randomUUID?.() ?? (Date.now().toString(36) + Math.random().toString(36).slice(2)))
    netState.worldId = id
    try {
      saveLocal(engine.world, id, netState.worldName)
      flash('Sauvegardé !')
    } catch {
      flash('Erreur de sauvegarde')
    }
  } else if (netState.mode === 'host') {
    try {
      const id = await saveServer(engine.world, netState.worldId, netState.worldName)
      if (id) { netState.worldId = id; flash('Sauvegardé sur le serveur !') }
      else flash('Erreur de sauvegarde')
    } catch {
      flash('Erreur de sauvegarde')
    }
  }
}

function flash(msg) {
  saveMsg.value = msg
  game.hintOverride = msg
  clearTimeout(saveMsgTimer)
  saveMsgTimer = setTimeout(() => { saveMsg.value = ''; game.hintOverride = '' }, 2500)
}

const canSave = computed(() => netState.mode === 'local' || netState.mode === 'host')

function confirmQuit() { engine.reset() }

async function copyRoomCode() {
  if (!netState.roomCode) return
  try {
    await navigator.clipboard.writeText(netState.roomCode)
    flash('Code copié !')
  } catch { flash(netState.roomCode) }
}

const woodPerSec = computed(() =>
  game.buildings.lumberjack > 0 ? (1 / effectiveInterval('lumberjack')).toFixed(1) : null,
)
const fishPerSec = computed(() =>
  game.buildings.fishinghut > 0 ? (1 / effectiveInterval('fishinghut')).toFixed(1) : null,
)
const stonePerSec = computed(() =>
  game.buildings.quarry > 0 ? (1 / effectiveInterval('quarry')).toFixed(1) : null,
)
const berriesPerSec = computed(() =>
  game.buildings.garden > 0 ? (1 / effectiveInterval('garden')).toFixed(1) : null,
)

// Icône selon l'heure du jour
const timeIcon = computed(() => {
  const t = game.timeOfDay
  if (t < 0.08 || t >= 0.92) return '🌅'
  if (t < 0.45) return '☀️'
  if (t < 0.6) return '🌇'
  return '🌙'
})

const meteoritesVisible = computed(() => game.villageLevel >= 3 || game.meteorite > 0)

const isDayTime = computed(() => {
  const t = game.timeOfDay
  return t >= 0.08 && t < 0.55
})

function skipTime() {
  game.timeOfDay = isDayTime.value ? 0.58 : 0.12
  const n = engine.world?.noisette
  if (n && n.growing && n.growTimer > 0) n.growTimer = 0
}

const icons = reactive({ wood: '', fish: '', stone: '', berries: '', meteorite: '' })
onMounted(() => {
  icons.wood       = spriteUrl('icon_wood')
  icons.fish       = spriteUrl('icon_fish')
  icons.stone      = spriteUrl('icon_stone')
  icons.berries    = spriteUrl('icon_berries')
  icons.meteorite  = spriteUrl('icon_meteorite')
})
</script>

<template>
  <div class="hud">
    <!-- Ressources -->
    <div class="panel resources">
      <div class="res">
        <img v-if="icons.wood" :src="icons.wood" class="ic-sprite" />
        <span class="val">{{ fmt(game.wood) }}<span class="cap">/{{ globalCap('wood') }}</span></span>
        <span v-if="woodPerSec" class="rate">+{{ woodPerSec }}/s</span>
      </div>
      <div class="res">
        <img v-if="icons.fish" :src="icons.fish" class="ic-sprite" />
        <span class="val">{{ fmt(game.fish) }}<span class="cap">/{{ globalCap('fish') }}</span></span>
        <span v-if="fishPerSec" class="rate">+{{ fishPerSec }}/s</span>
      </div>
      <div class="res">
        <img v-if="icons.stone" :src="icons.stone" class="ic-sprite" />
        <span class="val">{{ fmt(game.stone) }}<span class="cap">/{{ globalCap('stone') }}</span></span>
        <span v-if="stonePerSec" class="rate">+{{ stonePerSec }}/s</span>
      </div>
      <div class="res">
        <img v-if="icons.berries" :src="icons.berries" class="ic-sprite" />
        <span class="val">{{ fmt(game.berries) }}<span class="cap">/{{ globalCap('berries') }}</span></span>
        <span v-if="berriesPerSec" class="rate">+{{ berriesPerSec }}/s</span>
      </div>
      <div class="res" v-if="meteoritesVisible">
        <img v-if="icons.meteorite" :src="icons.meteorite" class="ic-sprite" />
        <span class="val">{{ fmt(game.meteorite) }}<span class="cap">/{{ globalCap('meteorite') }}</span></span>
      </div>
    </div>

    <!-- Village + heure -->
    <div class="panel village">
      <span class="lvl">🏡 Village niv. {{ game.villageLevel }}</span>
      <span class="time">{{ timeIcon }}</span>
      <span v-if="netState.roomCode" class="roomcode" @pointerdown.stop="copyRoomCode" title="Copier le code">🔑 {{ netState.roomCode }}</span>
      <button v-if="canSave" class="save-btn" @pointerdown.stop="triggerSave" title="Sauvegarder">💾</button>
      <button class="quit-btn" @pointerdown.stop="showConfirmQuit = true" title="Retour au menu">⏏</button>
    </div>
    <transition name="fade">
      <div class="save-toast" v-if="saveMsg">{{ saveMsg }}</div>
    </transition>

    <!-- Confirmation quitter -->
    <div class="confirm-overlay" v-if="showConfirmQuit" @pointerdown.self="showConfirmQuit = false">
      <div class="confirm-box">
        <p>Retourner au menu principal ?<br><span class="warn">La partie non sauvegardée sera perdue.</span></p>
        <div class="confirm-btns">
          <button @pointerdown="showConfirmQuit = false">Annuler</button>
          <button class="danger" @pointerdown="confirmQuit">Quitter</button>
        </div>
      </div>
    </div>

    <!-- Joueurs connectés -->
    <div class="panel players" v-if="game.players.length">
      <span
        v-for="p in game.players"
        :key="p.id"
        class="chip"
        :style="{ background: p.color }"
      >{{ p.label }}</span>
    </div>

    <!-- Astuce contextuelle -->
    <transition name="fade">
      <div class="hint" v-if="displayHint">{{ displayHint }}</div>
    </transition>

    <!-- Dev mode panel (host et local uniquement) -->
    <div v-if="netState.mode !== 'guest'" class="dev-bar">
      <template v-if="game.devMode">
        <span v-for="c in game.devCoords" :key="c.id" class="dev-coord">{{ c.label }}: {{ c.x }},{{ c.y }}</span>
        <button class="dev-skip-btn" @pointerdown.stop="skipTime">{{ isDayTime ? '🌙' : '☀️' }}</button>
      </template>
      <button
        class="dev-btn"
        :class="{ active: game.devMode }"
        @pointerdown.stop="game.devMode = !game.devMode"
      >{{ game.devMode ? '⚡ DEV ON' : 'DEV' }}</button>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: fixed;
  inset: 0;
  pointer-events: none;
  font-weight: 600;
  color: var(--cozy-ink);
}
.panel {
  position: absolute;
  background: var(--cozy-panel);
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  box-shadow: 0 4px 14px var(--cozy-shadow);
  padding: 8px 12px;
  display: flex;
  gap: 14px;
  align-items: center;
}
.resources { top: 16px; left: 16px; }
.village { top: 16px; right: 16px; gap: 10px; pointer-events: auto; }
.players { bottom: 16px; left: 16px; gap: 6px; padding: 6px 8px; }

.res { display: flex; align-items: center; gap: 6px; }
.ic-sprite {
  width: 24px;
  height: auto;
  image-rendering: pixelated;
  display: block;
}
.val { font-size: 20px; min-width: 26px; font-variant-numeric: tabular-nums; }
.cap { font-size: 11px; opacity: 0.55; margin-left: 1px; font-weight: 600; }
.rate { font-size: 12px; color: var(--cozy-green); font-weight: 700; }

.lvl { font-size: 15px; }
.time { font-size: 20px; }

.chip {
  color: #fff;
  font-size: 12px;
  padding: 3px 9px;
  border-radius: 999px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.18);
}

.hint {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(44, 34, 24, 0.82);
  color: #f4ead5;
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 14px;
  box-shadow: 0 4px 14px var(--cozy-shadow);
}

.dev-bar {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: auto;
}

.dev-coord {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 200, 60, 0.85);
  background: rgba(20, 14, 4, 0.7);
  padding: 3px 7px;
  border-radius: 6px;
  font-family: monospace;
  letter-spacing: 0.5px;
}

.dev-skip-btn {
  background: rgba(40, 30, 14, 0.75);
  border: 1px solid rgba(220, 180, 80, 0.35);
  border-radius: 7px;
  padding: 5px 8px;
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  transition: background 0.12s;
}
.dev-skip-btn:hover { background: rgba(80, 60, 20, 0.9); }

.dev-btn {
  background: rgba(40, 30, 14, 0.65);
  color: rgba(220, 180, 80, 0.6);
  border: 1px solid rgba(220, 180, 80, 0.25);
  border-radius: 7px;
  padding: 5px 10px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.8px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.dev-btn.active {
  background: rgba(230, 160, 20, 0.9);
  color: #2a1a00;
  border-color: rgba(230, 160, 20, 0.8);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.roomcode {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
  background: rgba(0,0,0,0.18);
  border-radius: 8px;
  padding: 2px 7px;
  color: var(--cozy-gold);
  cursor: pointer;
  transition: background 0.12s;
}
.roomcode:hover { background: rgba(0,0,0,0.32); }

.save-btn, .quit-btn {
  pointer-events: auto;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  padding: 0 2px;
  opacity: 0.75;
  transition: opacity 0.12s, transform 0.1s;
}
.save-btn:hover, .quit-btn:hover { opacity: 1; transform: scale(1.15); }

.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 14, 8, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  pointer-events: auto;
}
.confirm-box {
  background: var(--cozy-panel);
  border: 3px solid rgba(0,0,0,0.14);
  border-radius: 16px;
  padding: 22px 28px 18px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.4);
  text-align: center;
  max-width: 300px;
}
.confirm-box p { margin: 0 0 16px; font-size: 15px; font-weight: 700; line-height: 1.5; }
.confirm-box .warn { font-size: 12px; color: #c05040; font-weight: 600; }
.confirm-btns { display: flex; gap: 10px; justify-content: center; }
.confirm-btns button {
  padding: 9px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  background: var(--cozy-panel-dark);
  color: var(--cozy-ink);
  box-shadow: inset 0 -2px 0 rgba(0,0,0,0.15);
}
.confirm-btns button.danger {
  background: #c05040;
  color: #fff;
}

.save-toast {
  position: absolute;
  top: 64px;
  right: 16px;
  background: rgba(44, 34, 24, 0.85);
  color: #f4ead5;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 4px 14px var(--cozy-shadow);
}
</style>
