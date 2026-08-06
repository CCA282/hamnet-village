import * as C from '../constants/index.js'

export const cameraMethods = {
  updateCamera(dt) {
    let tx, ty, tz
    if (this.players.length === 0) {
      tx = C.VILLAGE.x; ty = C.VILLAGE.y; tz = 1
    } else {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const p of this.players) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
      }
      tx = (minX + maxX) / 2; ty = (minY + maxY) / 2
      const spanX = (maxX - minX) + 2 * C.CAM_MARGIN
      const spanY = (maxY - minY) + 2 * C.CAM_MARGIN
      tz = Math.min(C.VIEW_W / spanX, C.VIEW_H / spanY)
      tz = Math.max(C.ZOOM_MIN, Math.min(C.ZOOM_MAX, tz))
    }
    const k = Math.min(1, dt * C.CAM_LERP)
    this.cam.zoom += (tz - this.cam.zoom) * k
    this.cam.x   += (tx - this.cam.x) * k
    this.cam.y   += (ty - this.cam.y) * k
    const z = this.cam.zoom
    const hw = C.VIEW_W / (2 * z), hh = C.VIEW_H / (2 * z)
    this.cam.x = Math.max(hw, Math.min(C.WORLD_W - hw, this.cam.x))
    this.cam.y = Math.max(hh, Math.min(C.WORLD_H - hh, this.cam.y))
    this.camView = { left: this.cam.x - hw, top: this.cam.y - hh, zoom: z }
  },
}
