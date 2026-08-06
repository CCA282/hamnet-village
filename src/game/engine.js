// ============================================================================
// Moteur : boucle de jeu (requestAnimationFrame), rendu haute-résolution.
// Le canvas correspond aux pixels physiques de l'écran (clientSize × dpr) → net
// à toutes tailles. Le monde reste en "world units" ; la caméra gère la mise
// à l'échelle. Singleton partagé avec les composants Vue.
// ============================================================================
import { World } from './world/World.js'
import { Input } from './input.js'

class Engine {
  constructor() {
    this.world = new World()
    this.input = new Input()
    this.ctx = null
    this.canvas = null
    this.raf = 0
    this.last = 0
    this.running = false
    this._resizeObs = null
  }

  // Met à jour la taille physique du canvas (pixels réels = css × dpr).
  // Appelé au démarrage et à chaque changement de taille.
  _resize() {
    if (!this.canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(this.canvas.clientWidth * dpr)
    const h = Math.round(this.canvas.clientHeight * dpr)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    this.world.setCanvasSize(w, h)
  }

  start(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.ctx.imageSmoothingEnabled = false

    this._resize()
    this._resizeObs = new ResizeObserver(() => this._resize())
    this._resizeObs.observe(canvas)

    this.running = true
    this.last = performance.now()
    const loop = (now) => {
      if (!this.running) return
      let dt = (now - this.last) / 1000
      this.last = now
      if (dt > 0.05) dt = 0.05 // évite les sauts après un onglet en arrière-plan
      this.input.beginFrame()
      this.world.update(dt, this.input)
      this.ctx.imageSmoothingEnabled = false
      this.world.render(this.ctx)
      this.input.endFrame()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    if (this._resizeObs) { this._resizeObs.disconnect(); this._resizeObs = null }
  }
}

export const engine = new Engine()
