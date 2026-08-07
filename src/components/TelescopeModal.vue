<script setup>
import { computed, watch, ref, onUnmounted } from 'vue'
import { game } from '../game/store.js'

const level = computed(() => game.buildingUpgrades.astronomy?.observatory || 0)

const canvasRef = ref(null)
let raf = 0
let time = 0
let stars = []
let planets = []
let shootingStars = []
let ssTimer = 0
const SZ = 200

function initScene() {
  stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * SZ,
    y: Math.random() * SZ,
    r: 0.4 + Math.random() * 1.4,
    phase: Math.random() * Math.PI * 2,
    spd: 0.6 + Math.random() * 1.8,
  }))
  planets = [
    { bx: 70,  by: 65,  r: 13, col: '#4870d8', col2: '#90b8ff', orbitR: 28, os: 0.14, op: 0.0 },
    { bx: 145, by: 125, r: 7,  col: '#c85030', col2: '#ff9060', orbitR: 16, os: 0.26, op: 2.1 },
    { bx: 115, by: 155, r: 4,  col: '#38b090', col2: '#70dcc0', orbitR: 10, os: 0.42, op: 4.4 },
  ]
}

function drawNebula(ctx, t) {
  const clouds = [
    { x: 55 + Math.sin(t * 0.07) * 4,  y: 75,  rx: 55, ry: 38, c: 'rgba(90,30,150,0.22)' },
    { x: 145 + Math.sin(t * 0.05) * 3, y: 55,  rx: 48, ry: 32, c: 'rgba(30,60,150,0.18)' },
    { x: 105,                           y: 155, rx: 65, ry: 28, c: 'rgba(150,30,90,0.16)' },
  ]
  for (const n of clouds) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, Math.max(n.rx, n.ry))
    g.addColorStop(0, n.c)
    g.addColorStop(1, 'transparent')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(n.x, n.y, n.rx, n.ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawFrame(ctx, t, lvl) {
  ctx.clearRect(0, 0, SZ, SZ)

  if (lvl >= 3) {
    const bg = ctx.createRadialGradient(SZ / 2, SZ / 2, 8, SZ / 2, SZ / 2, SZ / 2)
    bg.addColorStop(0, '#1a0830')
    bg.addColorStop(0.5, '#0c0420')
    bg.addColorStop(1, '#04020c')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, SZ, SZ)
    drawNebula(ctx, t)
  } else {
    ctx.fillStyle = '#04020c'
    ctx.fillRect(0, 0, SZ, SZ)
  }

  for (const s of stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(t * s.spd + s.phase)
    ctx.globalAlpha = 0.35 + twinkle * 0.65
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r * (0.6 + twinkle * 0.4), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  if (lvl >= 2) {
    for (const ss of shootingStars) {
      const a = 1 - ss.t
      ctx.save()
      ctx.globalAlpha = a * 0.9
      const len = 18 * (1 - ss.t * 0.4)
      const grd = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * len, ss.y - ss.vy * len)
      grd.addColorStop(0, '#e8e0ff')
      grd.addColorStop(1, 'transparent')
      ctx.strokeStyle = grd
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(ss.x, ss.y)
      ctx.lineTo(ss.x - ss.vx * len, ss.y - ss.vy * len)
      ctx.stroke()
      ctx.restore()
    }
  }

  const count = Math.min(lvl, planets.length)
  for (let i = 0; i < count; i++) {
    const pl = planets[i]
    const px = pl.bx + Math.cos(t * pl.os + pl.op) * pl.orbitR
    const py = pl.by + Math.sin(t * pl.os + pl.op) * pl.orbitR * 0.38

    const glow = ctx.createRadialGradient(px, py, 0, px, py, pl.r * 2.5)
    glow.addColorStop(0, pl.col + '50')
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(px, py, pl.r * 2.5, 0, Math.PI * 2)
    ctx.fill()

    const grad = ctx.createRadialGradient(px - pl.r * 0.32, py - pl.r * 0.32, 1, px, py, pl.r)
    grad.addColorStop(0, pl.col2)
    grad.addColorStop(1, pl.col)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(px, py, pl.r, 0, Math.PI * 2)
    ctx.fill()

    if (lvl >= 3 && i === 0) {
      ctx.save()
      ctx.translate(px, py)
      ctx.scale(1, 0.28)
      ctx.strokeStyle = 'rgba(210,185,130,0.55)'
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.arc(0, 0, pl.r + 7, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  ctx.globalAlpha = 1
}

function animate() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  time += 0.016

  if (level.value >= 2) {
    ssTimer -= 0.016
    if (ssTimer <= 0) {
      ssTimer = 2.5 + Math.random() * 4.5
      const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.6
      shootingStars.push({
        x: 15 + Math.random() * 160,
        y: 8 + Math.random() * 50,
        vx: Math.cos(angle), vy: Math.sin(angle), t: 0,
      })
    }
    for (const ss of shootingStars) ss.t += 0.016 / 0.7
    shootingStars = shootingStars.filter((ss) => ss.t < 1)
  }

  drawFrame(ctx, time, level.value)
  raf = requestAnimationFrame(animate)
}

watch(
  () => game.telescopeOpen,
  (v) => {
    if (v) {
      initScene()
      time = 0
      shootingStars = []
      ssTimer = 1.5
      raf = requestAnimationFrame(animate)
    } else {
      cancelAnimationFrame(raf)
    }
  },
  { immediate: true },
)

onUnmounted(() => cancelAnimationFrame(raf))

function close() { game.telescopeOpen = false }
</script>

<template>
  <transition name="scope-fade">
    <div v-if="game.telescopeOpen" class="scope-scrim" @pointerdown.self="close">
      <div class="scope-wrap">
        <canvas ref="canvasRef" :width="200" :height="200" class="scope-canvas" />
        <div class="scope-label">
          {{ ['✦ Observatoire', '✦✦ Observatoire avancé', '✦✦✦ Observatoire ultime'][level - 1] || '' }}
        </div>
        <button class="scope-close" @pointerdown="close">✕</button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.scope-scrim {
  position: fixed;
  inset: 0;
  background: rgba(4, 2, 12, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  backdrop-filter: blur(4px);
}

.scope-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.scope-canvas {
  width: 280px;
  height: 280px;
  border-radius: 50%;
  border: 6px solid #28204a;
  box-shadow:
    0 0 0 3px #181030,
    0 0 40px rgba(120, 80, 255, 0.35),
    0 0 80px rgba(80, 40, 200, 0.15),
    0 24px 60px rgba(0, 0, 0, 0.7);
  image-rendering: pixelated;
  display: block;
  cursor: default;
}

.scope-label {
  color: rgba(200, 180, 255, 0.75);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.scope-close {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #201838;
  border: 2px solid #503878;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  color: #b0a0d8;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  transition: background 0.12s;
}
.scope-close:hover { background: #382858; }

.scope-fade-enter-active,
.scope-fade-leave-active { transition: opacity 0.3s; }
.scope-fade-enter-from,
.scope-fade-leave-to { opacity: 0; }
.scope-fade-enter-active .scope-canvas { transition: transform 0.3s; }
.scope-fade-enter-from .scope-canvas { transform: scale(0.82); }
</style>
