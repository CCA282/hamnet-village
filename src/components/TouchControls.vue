<script setup>
import { reactive, ref, computed } from 'vue'
import { engine } from '../game/engine.js'
import { game } from '../game/store.js'

// Affiché uniquement si le pointeur principal est "coarse" (doigt/stylet),
// c'est-à-dire sur mobile/tablette. Sur laptop/desktop (souris = "fine")
// les contrôles sont masqués même si touchscreen disponible.
// Forcer avec ?touch=1 dans l'URL pour tester au bureau.
const force = new URLSearchParams(location.search).has('touch')
const isTouch = force
  || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)

const baseEl = ref(null)
const knob = reactive({ x: 0, y: 0 })
let joyPointer = null

function joyStart(e) {
  joyPointer = e.pointerId
  e.currentTarget.setPointerCapture(e.pointerId)
  joyMove(e)
}
function joyMove(e) {
  if (joyPointer !== e.pointerId) return
  const r = baseEl.value.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const R = r.width / 2
  let dx = e.clientX - cx
  let dy = e.clientY - cy
  const mag = Math.hypot(dx, dy)
  if (mag > R) { dx = (dx / mag) * R; dy = (dy / mag) * R }
  knob.x = dx; knob.y = dy
  let nx = dx / R, ny = dy / R
  if (Math.hypot(nx, ny) < 0.18) { nx = 0; ny = 0 } // zone morte
  engine.input.touch.mx = nx
  engine.input.touch.my = ny
}
function joyEnd(e) {
  if (joyPointer !== e.pointerId) return
  joyPointer = null
  knob.x = 0; knob.y = 0
  engine.input.touch.mx = 0
  engine.input.touch.my = 0
}

function actDown(e) {
  e.currentTarget.setPointerCapture(e.pointerId)
  engine.input.touch.down = true
}
function actUp() {
  engine.input.touch.down = false
}

// Icône contextuelle du bouton selon l'astuce courante
const actIcon = computed(() => {
  const h = game.hint || ''
  if (h.includes('bois')) return '🪓'
  if (h.includes('Pêcher') || h.includes('pêche')) return '🎣'
  if (h.includes('pierre') || h.includes('Miner')) return '⛏️'
  if (h.includes('baies') || h.includes('Cueillir')) return '🫐'
  if (h.includes('Construire')) return '🔨'
  if (h.includes('village')) return '🏡'
  return '✋'
})
</script>

<template>
  <div class="touch" v-if="isTouch">
    <!-- Joystick (gauche) -->
    <div
      class="joy-surface"
      @pointerdown.prevent="joyStart"
      @pointermove.prevent="joyMove"
      @pointerup.prevent="joyEnd"
      @pointercancel.prevent="joyEnd"
    >
      <div ref="baseEl" class="joy-base">
        <div class="joy-knob" :style="{ transform: `translate(${knob.x}px, ${knob.y}px)` }" />
      </div>
    </div>

    <!-- Bouton récolte (droite) -->
    <button
      class="act-btn"
      @pointerdown.prevent="actDown"
      @pointerup.prevent="actUp"
      @pointercancel.prevent="actUp"
      @pointerleave.prevent="actUp"
    >
      <span class="act-icon">{{ actIcon }}</span>
      <span class="act-label">Récolter</span>
    </button>
  </div>
</template>

<style scoped>
.touch {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 12;
  touch-action: none;
}
.joy-surface {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 45%;
  height: 55%;
  pointer-events: auto;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.joy-base {
  position: relative;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: rgba(244, 234, 213, 0.28);
  border: 3px solid rgba(244, 234, 213, 0.5);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}
.joy-knob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 62px;
  height: 62px;
  margin: -31px 0 0 -31px;
  border-radius: 50%;
  background: rgba(244, 234, 213, 0.92);
  border: 3px solid rgba(120, 100, 70, 0.5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}
.act-btn {
  position: absolute;
  right: 26px;
  bottom: 40px;
  width: 116px;
  height: 116px;
  border-radius: 50%;
  pointer-events: auto;
  touch-action: none;
  border: 4px solid rgba(255, 255, 255, 0.6);
  background: radial-gradient(circle at 40% 35%, #7fbf66, #4f8f3f);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.4), inset 0 -5px 0 rgba(0, 0, 0, 0.18);
  user-select: none;
  -webkit-user-select: none;
}
.act-btn:active {
  transform: scale(0.94);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 -3px 0 rgba(0, 0, 0, 0.2);
}
.act-icon { font-size: 40px; line-height: 1; }
.act-label { font-size: 13px; font-weight: 800; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4); }
</style>
