export const VILLAGE = { x: 480, y: 320, r: 44 }

export const RIVER = { baseX: 862, amp: 18, freq: 0.02, halfWidth: 22 }
export function riverCenterX(y) {
  return RIVER.baseX + Math.sin(y * RIVER.freq) * RIVER.amp
}
