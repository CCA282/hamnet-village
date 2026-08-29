import { reactive, watch } from 'vue'

const STORAGE_KEY = 'hameau_audio_settings'

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { soundOn: true, volume: 0.5, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { soundOn: true, volume: 0.5 }
}

export const audioSettings = reactive(loadSettings())

const TRACKS = [
  'audio/music/music-01-jazz-melody.mp3',
  'audio/music/music-02-lofi-study.mp3',
  'audio/music/music-03-lofi-chill-2.mp3',
  'audio/music/music-04-lofi-beats.mp3',
  'audio/music/music-05-lofi-chill.mp3',
].map((t) => import.meta.env.BASE_URL + t)

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

let audioEl = null
let playlist = []
let trackIndex = 0
let started = false

function applyVolume() {
  if (!audioEl) return
  audioEl.volume = audioSettings.soundOn ? audioSettings.volume : 0
}

function playTrack() {
  if (!audioEl) return
  audioEl.src = playlist[trackIndex]
  applyVolume()
  audioEl.play().catch(() => { /* autoplay bloqué, réessaiera au prochain geste utilisateur */ })
}

function playNextTrack() {
  trackIndex++
  if (trackIndex >= playlist.length) {
    playlist = shuffle(TRACKS)
    trackIndex = 0
  }
  playTrack()
}

/** Prépare le lecteur audio (idempotent). */
export function initMusic() {
  if (audioEl) return
  audioEl = new Audio()
  audioEl.preload = 'auto'
  audioEl.addEventListener('ended', playNextTrack)
  playlist = shuffle(TRACKS)
  applyVolume()
}

/** Démarre la musique de fond — à appeler sur un geste utilisateur (contrainte autoplay navigateur). */
export function startMusic() {
  initMusic()
  if (!started) {
    started = true
    playTrack()
  } else if (audioEl.paused && audioSettings.soundOn) {
    audioEl.play().catch(() => {})
  }
}

watch(
  () => audioSettings.volume,
  () => applyVolume(),
)

watch(
  () => audioSettings.soundOn,
  (on) => {
    applyVolume()
    if (on && started && audioEl?.paused) audioEl.play().catch(() => {})
  },
)

watch(
  audioSettings,
  (v) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) } catch { /* ignore */ }
  },
  { deep: true },
)
