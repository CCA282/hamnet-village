let _ws = null
const _handlers = {}

export function onMsg(type, fn) { _handlers[type] = fn }
export function offMsg(type) { delete _handlers[type] }

export function connect(url) {
  return new Promise((resolve, reject) => {
    _ws = new WebSocket(url)
    _ws.onopen = () => resolve()
    _ws.onerror = (e) => reject(e)
    _ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        _handlers[msg.type]?.(msg)
        _handlers['*']?.(msg)
      } catch { /* ignore malformed message */ }
    }
    _ws.onclose = () => { _handlers['_close']?.() }
  })
}

export function send(msg) {
  if (_ws && _ws.readyState === WebSocket.OPEN) _ws.send(JSON.stringify(msg))
}

export function disconnect() {
  if (_ws) { _ws.close(); _ws = null }
}

export function wsUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/ws`
}
