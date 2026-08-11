<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { game } from '../game/store.js'

const collapsed = ref(false)

// ── Objectives definition ─────────────────────────────────────────────────────

const OBJECTIVES = {
  1: [
    { id: 'hache',       label: 'Acheter la hache',              done: () => game.upgrades.hache >= 1 },
    { id: 'lumberjack',  label: 'Construire la cabane de bûcheron', done: () => game.buildings.lumberjack > 0 },
    { id: 'village_2',   label: 'Améliorer le village (niv. 2)', done: () => game.villageLevel >= 2 },
  ],
  2: [
    { id: 'fishing_rod', label: 'Acheter la canne à pêche',     done: () => game.upgrades.fishing_rod >= 1 },
    { id: 'fishinghut',  label: 'Construire le ponton de pêche', done: () => game.buildings.fishinghut > 0 },
    { id: 'pioche',      label: 'Acheter la pioche',             done: () => game.upgrades.pioche >= 1 },
    { id: 'charrette',   label: 'Acheter une charrette',         done: () => game.upgrades.charrette >= 1 },
    { id: 'village_3',   label: 'Améliorer le village (niv. 3)', done: () => game.villageLevel >= 3 },
  ],
  3: [
    { id: 'faucille',    label: 'Acheter la faucille',           done: () => game.upgrades.faucille >= 1 },
    { id: 'quarry',      label: 'Construire la carrière',        done: () => game.buildings.quarry > 0 },
    { id: 'garden',      label: 'Construire le jardin',          done: () => game.buildings.garden > 0 },
    { id: 'meteorite',   label: 'Récolter une météorite',        done: () => game.meteorite > 0 || game.upgrades.pioche_stellaire >= 1 },
    { id: 'village_4',   label: 'Améliorer le village (niv. 4)', done: () => game.villageLevel >= 4 },
  ],
  4: [
    { id: 'pioche_stell',    label: 'Obtenir la pioche stellaire',      done: () => game.upgrades.pioche_stellaire >= 1 },
    { id: 'astronomy',       label: "Construire la tour d'astronomie",   done: () => game.buildings.astronomy > 0 },
    { id: 'puits',           label: 'Construire le puits',               done: () => game.buildings.puits > 0 },
    { id: 'water_noisette',  label: 'Arroser le noisetier',              done: () => game.noisetierWatered },
    { id: 'pet_squirrel',    label: 'Caresser un écureuil',              done: () => game.squirrelPetted, showWhen: () => game.noisetierStage >= 3 },
  ],
}

const objectives = computed(() => {
  const all = []
  for (let lvl = 1; lvl < game.villageLevel; lvl++) {
    if (OBJECTIVES[lvl]) {
      all.push(
        ...OBJECTIVES[lvl]
          .filter((o) => !o.done() && (!o.showWhen || o.showWhen()))
          .map((o) => ({ ...o, carried: true }))
      )
    }
  }
  if (OBJECTIVES[game.villageLevel]) {
    all.push(
      ...OBJECTIVES[game.villageLevel]
        .filter((o) => !o.showWhen || o.showWhen())
        .map((o) => ({ ...o, carried: false }))
    )
  }
  return all
})
const doneCount  = computed(() => objectives.value.filter((o) => o.done()).length)
const total      = computed(() => objectives.value.length)
const allDone    = computed(() => total.value > 0 && doneCount.value === total.value)

// ── Gamepad toggle (button 8 = Select / Share) ────────────────────────────────

let rafId = null
let prevBtn8 = false

function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []
  for (const gp of pads) {
    if (!gp) continue
    const btn8 = gp.buttons[8]?.pressed ?? false
    if (btn8 && !prevBtn8) collapsed.value = !collapsed.value
    prevBtn8 = btn8
  }
  rafId = requestAnimationFrame(pollGamepad)
}

onMounted(() => { rafId = requestAnimationFrame(pollGamepad) })
onUnmounted(() => { if (rafId) cancelAnimationFrame(rafId) })
</script>

<template>
  <div class="objectives" :class="{ collapsed }">
    <button class="obj-header" @pointerdown.stop="collapsed = !collapsed" aria-label="Basculer les objectifs">
      <span class="obj-title">Objectifs</span>
      <span class="obj-progress">{{ doneCount }}/{{ total }}</span>
      <span class="obj-arrow">{{ collapsed ? '›' : '‹' }}</span>
    </button>

    <transition name="slide">
      <ul v-if="!collapsed" class="obj-list">
        <li
          v-for="o in objectives"
          :key="o.id"
          class="obj-item"
          :class="{ done: o.done(), carried: o.carried }"
        >
          <span class="obj-check">{{ o.done() ? '✓' : '○' }}</span>
          <span class="obj-label">{{ o.label }}</span>
        </li>
        <li v-if="allDone" class="obj-item obj-complete">
          <span class="obj-check">🎉</span>
          <span class="obj-label">Niveau terminé !</span>
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped>
.objectives {
  position: fixed;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: auto;
  z-index: 10;
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  gap: 0;
}

.obj-header {
  background: var(--cozy-panel);
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-left: none;
  border-radius: 0 10px 10px 0;
  box-shadow: 2px 2px 8px var(--cozy-shadow);
  padding: 8px 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 28px;
  writing-mode: vertical-rl;
  user-select: none;
}

.obj-title {
  font-size: 10px;
  font-weight: 800;
  color: var(--cozy-ink);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  transform: rotate(180deg);
}

.obj-progress {
  font-size: 10px;
  font-weight: 700;
  color: var(--cozy-gold);
  transform: rotate(180deg);
}

.obj-arrow {
  font-size: 14px;
  color: var(--cozy-ink-soft);
  transform: rotate(180deg);
  line-height: 1;
}

.obj-list {
  background: var(--cozy-panel);
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-right: none;
  border-radius: 10px 0 0 10px;
  box-shadow: -2px 2px 8px var(--cozy-shadow);
  padding: 10px 10px 10px 12px;
  list-style: none;
  margin: 0;
  min-width: 180px;
  max-width: 220px;
}

.obj-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--cozy-ink);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: opacity 0.2s;
}

.obj-item:last-child { border-bottom: none; }

.obj-item.done .obj-label { text-decoration: line-through; opacity: 0.45; }
.obj-item.done .obj-check { color: var(--cozy-green); }

/* Carried-over incomplete objectives from a previous level */
.obj-item.carried { border-left: 2px solid rgba(255, 160, 30, 0.5); padding-left: 4px; }
.obj-item.carried .obj-check { color: rgba(255, 160, 30, 0.7); }

.obj-check {
  font-size: 11px;
  width: 12px;
  flex-shrink: 0;
  color: var(--cozy-ink-soft);
  text-align: center;
}

.obj-label { line-height: 1.3; }

.obj-complete .obj-label { color: var(--cozy-gold); font-weight: 800; }

/* Slide transition */
.slide-enter-active, .slide-leave-active {
  transition: opacity 0.18s, transform 0.18s;
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
