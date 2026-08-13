<script setup>
import { ref } from 'vue'
import { audioSettings } from '../game/audio.js'

defineProps({
  variant: { type: String, default: 'default' }, // 'default' | 'hud'
})

const open = ref(false)
</script>

<template>
  <button
    class="settings-btn"
    :class="variant === 'hud' ? 'in-hud' : variant"
    title="Réglages"
    @pointerdown.stop="open = true"
  >⚙️</button>

  <div class="settings-overlay" v-if="open" @pointerdown.self="open = false">
    <div class="settings-box">
      <h2>Réglages</h2>

      <div class="row">
        <span class="label">🔊 Son</span>
        <button
          class="toggle"
          :class="{ on: audioSettings.soundOn }"
          @pointerdown="audioSettings.soundOn = !audioSettings.soundOn"
        >
          <span class="knob"></span>
        </button>
      </div>

      <div class="row column">
        <span class="label">🎚️ Volume général</span>
        <input
          class="slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          v-model.number="audioSettings.volume"
          :disabled="!audioSettings.soundOn"
        />
      </div>

      <button class="close-btn" @pointerdown="open = false">Fermer</button>
    </div>
  </div>
</template>

<style scoped>
.settings-btn {
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
.settings-btn:hover { opacity: 1; transform: scale(1.15) rotate(20deg); }

.settings-btn.default {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 101;
  font-size: 24px;
  background: var(--cozy-panel);
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  box-shadow: 0 4px 14px var(--cozy-shadow);
  padding: 8px 10px;
}

.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 14, 8, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: auto;
}

.settings-box {
  background: var(--cozy-panel);
  border: 3px solid rgba(0, 0, 0, 0.14);
  border-radius: 18px;
  padding: 24px 28px 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  min-width: 280px;
  max-width: 360px;
  width: 90vw;
  color: var(--cozy-ink);
}

.settings-box h2 {
  margin: 0 0 18px;
  font-size: 19px;
  text-align: center;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
}
.row.column {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.label { font-size: 15px; font-weight: 700; }

.toggle {
  width: 48px;
  height: 26px;
  border-radius: 999px;
  border: none;
  background: var(--cozy-panel-dark);
  cursor: pointer;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  transition: background 0.15s;
}
.toggle.on {
  background: var(--cozy-green);
  justify-content: flex-end;
}
.knob {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  display: block;
}

.slider {
  width: 100%;
  accent-color: var(--cozy-gold);
  cursor: pointer;
}
.slider:disabled { opacity: 0.5; cursor: not-allowed; }

.close-btn {
  width: 100%;
  margin-top: 16px;
  padding: 11px;
  font-size: 15px;
  font-weight: 800;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  background: var(--cozy-gold);
  color: #3a2a12;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.2);
}
</style>
