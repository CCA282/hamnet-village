<script setup>
import GameCanvas from './components/GameCanvas.vue'
import Hud from './components/Hud.vue'
import VillageMenu from './components/VillageMenu.vue'
import JoinHint from './components/JoinHint.vue'
import TouchControls from './components/TouchControls.vue'
</script>

<template>
  <div class="stage">
    <GameCanvas />
    <Hud />
    <JoinHint />
    <TouchControls />
    <VillageMenu />
  </div>
</template>

<style scoped>
.stage {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 50% 20%, #37492f 0%, #26331f 60%, #1e2819 100%);
  overflow: hidden;
}
</style>
