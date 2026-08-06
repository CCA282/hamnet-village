<script setup>
import { game } from '../game/store.js'
</script>

<template>
  <transition name="fade">
    <div class="welcome" v-if="game.players.length === 0">
      <div class="card">
        <h1>Petit&nbsp;Hameau <span>🌿</span></h1>
        <p class="tag">Un coin de nature à faire s'épanouir, ensemble et sans pression.</p>
        <div class="join">
          <div class="way"><b>📱 Mobile</b><span>joystick + bouton Récolter</span></div>
          <div class="way"><b>🎮 Manette</b><span>un bouton (USB / Bluetooth)</span></div>
          <div class="way"><b>⌨️ Clavier</b><span>ZQSD / Espace</span></div>
          <div class="way"><b>⌨️ 2ᵉ clavier</b><span>Flèches / Entrée</span></div>
        </div>
        <p class="cta">Touche l'écran, appuie sur une touche ou un bouton pour apparaître ✨</p>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.welcome {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none; /* laisse passer clics/entrées vers le jeu */
  z-index: 15;
}
.card {
  background: rgba(244, 234, 213, 0.96);
  border: 3px solid rgba(0, 0, 0, 0.14);
  border-radius: 20px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
  padding: 26px 34px;
  text-align: center;
  max-width: 460px;
}
h1 { margin: 0 0 6px; font-size: 34px; color: #3f5b34; }
h1 span { font-size: 30px; }
.tag { margin: 0 0 18px; color: var(--cozy-ink-soft); font-weight: 600; }
.join {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.way {
  background: var(--cozy-panel-dark);
  border-radius: 12px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.way b { font-size: 13px; color: var(--cozy-ink); }
.way span { font-size: 12px; color: var(--cozy-ink-soft); }
.cta {
  margin: 0;
  font-weight: 700;
  color: #3f5b34;
  animation: pulse 1.8s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
