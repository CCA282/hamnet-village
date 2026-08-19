import { describe, it, expect, beforeEach, vi } from 'vitest'

function makeLocalStorage() {
  let store = {}
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { store = {} },
  }
}
vi.stubGlobal('localStorage', makeLocalStorage())

const { signup, login, logout, getToken, authHeaders, fetchMe, accountsUrl } = await import('../net/accounts.js')

function mockFetchOnce(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('accountsUrl', () => {
  it('defaults to localhost:4000 when VITE_ACCOUNTS_URL is not set', () => {
    expect(accountsUrl()).toBe('http://localhost:4000')
  })
})

describe('signup / login', () => {
  it('signup stores the token and returns the user on success', async () => {
    mockFetchOnce(200, { token: 'tok123', user: { id: 'u1', username: 'clement' } })
    const user = await signup('clement', 'password123')
    expect(user).toEqual({ id: 'u1', username: 'clement' })
    expect(getToken()).toBe('tok123')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:4000/signup',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('signup throws and stores nothing on failure', async () => {
    mockFetchOnce(409, 'Ce pseudo est déjà pris')
    await expect(signup('clement', 'password123')).rejects.toThrow('Ce pseudo est déjà pris')
    expect(getToken()).toBeNull()
  })

  it('login stores the token on success', async () => {
    mockFetchOnce(200, { token: 'tok456', user: { id: 'u2', username: 'bob' } })
    await login('bob', 'password123')
    expect(getToken()).toBe('tok456')
  })

  it('login throws on invalid credentials', async () => {
    mockFetchOnce(401, 'Identifiants invalides')
    await expect(login('bob', 'wrong')).rejects.toThrow('Identifiants invalides')
  })
})

describe('logout', () => {
  it('clears the stored token', () => {
    localStorage.setItem('hamnet_auth_token', 'tok')
    logout()
    expect(getToken()).toBeNull()
  })
})

describe('authHeaders', () => {
  it('returns an empty object when signed out', () => {
    expect(authHeaders()).toEqual({})
  })

  it('returns a Bearer header when signed in', () => {
    localStorage.setItem('hamnet_auth_token', 'tok789')
    expect(authHeaders()).toEqual({ Authorization: 'Bearer tok789' })
  })
})

describe('fetchMe', () => {
  it('returns null without calling fetch when signed out', async () => {
    globalThis.fetch = vi.fn()
    expect(await fetchMe()).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns the user when the token is valid', async () => {
    localStorage.setItem('hamnet_auth_token', 'tok')
    mockFetchOnce(200, { id: 'u1', username: 'clement' })
    expect(await fetchMe()).toEqual({ id: 'u1', username: 'clement' })
  })

  it('clears the token and returns null when it is invalid/expired', async () => {
    localStorage.setItem('hamnet_auth_token', 'expired')
    mockFetchOnce(401, 'Token invalide ou expiré')
    expect(await fetchMe()).toBeNull()
    expect(getToken()).toBeNull()
  })

  it('returns null when accounts-service is unreachable', async () => {
    localStorage.setItem('hamnet_auth_token', 'tok')
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'))
    expect(await fetchMe()).toBeNull()
  })
})
