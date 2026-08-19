const TOKEN_KEY = 'hamnet_auth_token'

export function accountsUrl() {
  if (import.meta.env.VITE_ACCOUNTS_URL) return import.meta.env.VITE_ACCOUNTS_URL
  return 'http://localhost:4000'
}

export function getToken() { return localStorage.getItem(TOKEN_KEY) }
function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function authRequest(path, username, password) {
  const r = await fetch(`${accountsUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!r.ok) throw new Error(await r.text())
  const { token, user } = await r.json()
  setToken(token)
  return user
}

export function signup(username, password) { return authRequest('/signup', username, password) }
export function login(username, password) { return authRequest('/login', username, password) }

export function logout() { setToken(null) }

export async function fetchMe() {
  if (!getToken()) return null
  try {
    const r = await fetch(`${accountsUrl()}/me`, { headers: authHeaders() })
    if (!r.ok) { setToken(null); return null }
    return await r.json()
  } catch {
    return null
  }
}
