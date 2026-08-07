import { shadowSprite } from '../../sprites/index.js'

const TWO_PI = Math.PI * 2

export const helperMethods = {
  drawBottom(ctx, cv, cx, by, opts = {}) {
    const scale = opts.scale ?? 1
    const w = cv.width * scale, h = cv.height * scale
    const x = Math.round(cx - w / 2), y = Math.round(by - h)
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha
    if (opts.flip) {
      ctx.save()
      ctx.translate(x + w, y)
      ctx.scale(-1, 1)
      ctx.drawImage(cv, 0, 0, w, h)
      ctx.restore()
    } else {
      ctx.drawImage(cv, x, y, w, h)
    }
    if (opts.alpha != null) ctx.globalAlpha = 1
  },

  drawShadow(ctx, cx, by, w) {
    const s = shadowSprite(Math.max(6, Math.round(w)))
    ctx.drawImage(s, Math.round(cx - s.width / 2), Math.round(by - s.height / 2))
  },

  _ellipse(ctx, cx, cy, rx, ry) {
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TWO_PI)
    ctx.fill()
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y,     x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x,     y + h, r)
    ctx.arcTo(x,     y + h, x,     y,     r)
    ctx.arcTo(x,     y,     x + w, y,     r)
    ctx.closePath()
  },
}
