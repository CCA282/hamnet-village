<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { engine } from '../game/engine.js'

const canvasEl = ref(null)

function onPointerDown(e) {
  // Le tactile est géré par TouchControls (joystick + bouton). Ici, seule la
  // souris déclenche l'action du joueur clavier 1 (récolte / rejoindre).
  if (e.pointerType === 'touch') return
  engine.input.mouseAction = true
}

onMounted(() => engine.start(canvasEl.value))
onBeforeUnmount(() => engine.stop())
</script>

<template>
  <canvas
    ref="canvasEl"
    class="game-canvas"
    @pointerdown="onPointerDown"
  />
</template>

<style scoped>
/*
  Le canvas est rendu à clientWidth × devicePixelRatio → même résolution que
  l'écran physique. Pas besoin de CSS image-rendering puisqu'il n'y a plus
  d'agrandissement CSS : le canvas remplit exactement son conteneur.
*/
.game-canvas {
  display: block;
  width: min(100vw, calc(100vh * 480 / 270));
  height: min(100vh, calc(100vw * 270 / 480));
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  touch-action: none;
}
</style>
