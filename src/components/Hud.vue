<script setup>
import { computed, onMounted, reactive } from 'vue'
import { game, fmt, effectiveInterval, globalCap } from '../game/store.js'
import { spriteUrl } from '../game/sprites/index.js'

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

const icons = reactive({ wood: '', fish: '', stone: '', berries: '' })
onMounted(() => {
  icons.wood    = spriteUrl('icon_wood')
  icons.fish    = spriteUrl('icon_fish')
  icons.stone   = spriteUrl('icon_stone')
  icons.berries = spriteUrl('icon_berries')
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
    </div>

    <!-- Village + heure -->
    <div class="panel village">
      <span class="lvl">🏡 Village niv. {{ game.villageLevel }}</span>
      <span class="time">{{ timeIcon }}</span>
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
      <div class="hint" v-if="game.hint">{{ game.hint }}</div>
    </transition>

    <!-- Bouton dev mode -->
    <button
      class="dev-btn"
      :class="{ active: game.devMode }"
      @pointerdown.stop="game.devMode = !game.devMode"
    >{{ game.devMode ? '⚡ DEV ON' : 'DEV' }}</button>
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
.village { top: 16px; right: 16px; gap: 10px; }
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

.dev-btn {
  position: absolute;
  bottom: 16px;
  right: 16px;
  pointer-events: auto;
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
</style>
