import { test, expect } from '@playwright/test'
import { startLocalGame } from './helpers.js'

// Supabase Auth (VITE_SUPABASE_URL is unset in this suite, so the client falls back to the fixed
// placeholder https://not-configured.supabase.co — see src/net/supabase.js) is never actually
// reached: every Auth REST call is intercepted so these tests have zero dependency on a real project.

const SUPABASE_URL = 'https://not-configured.supabase.co'

function authUser(email) {
  return {
    id: 'u-' + email.split('@')[0],
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  }
}

function sessionBody(email) {
  return {
    access_token: 'tok-' + email.split('@')[0],
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'refresh-' + email.split('@')[0],
    user: authUser(email),
  }
}

function errorBody(message) {
  // The exact field @supabase/supabase-js reads for AuthError.message has moved across
  // versions (msg / error_description / error / message) — set them all so the UI shows the
  // same text regardless.
  return { msg: message, error_description: message, error: message, message }
}

async function mockAuthRoute(page, path, { status = 200, body } = {}) {
  await page.route(`${SUPABASE_URL}${path}`, (route) => {
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  })
}

async function signupAs(page, email, { status = 200, errorMessage = 'Erreur' } = {}) {
  await mockAuthRoute(page, '/auth/v1/signup**', {
    status,
    body: status === 200 ? sessionBody(email) : errorBody(errorMessage),
  })
  await page.goto('/')
  await page.getByText('créer un compte').click()
  await page.locator('.name-input').first().fill(email)
  await page.locator('input[type="password"]').fill('password123')
  await page.getByText('Créer le compte').click()
}

test.describe('Comptes — connexion / inscription', () => {
  test('home screen prompts to log in when signed out', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Se connecter')).toBeVisible()
  })

  test('signup creates an account and shows the connected state', async ({ page }) => {
    await signupAs(page, 'alice@example.com')
    await expect(page.getByText('Connecté')).toBeVisible()
    await expect(page.getByText('alice@example.com')).toBeVisible()
  })

  test('signup shows the server error and stays signed out on failure', async ({ page }) => {
    await signupAs(page, 'alice@example.com', { status: 400, errorMessage: 'Un compte existe déjà avec cet email' })
    await expect(page.getByText('Un compte existe déjà avec cet email')).toBeVisible()
    await page.getByText('← Retour').click()
    await expect(page.getByText('Se connecter')).toBeVisible()
  })

  test('login then logout', async ({ page }) => {
    await mockAuthRoute(page, '/auth/v1/token**', { body: sessionBody('bob@example.com') })
    await page.route(`${SUPABASE_URL}/auth/v1/logout**`, (route) => route.fulfill({ status: 204 }))
    await page.goto('/')
    await page.getByText('Se connecter').click()
    await page.locator('.name-input').first().fill('bob@example.com')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByText('Connexion').click()
    await expect(page.getByText('bob@example.com')).toBeVisible()

    await page.getByText('se déconnecter').click()
    await expect(page.getByText('Se connecter')).toBeVisible()
  })
})

test.describe('Comptes — sauvegarde liée au compte', () => {
  test('saving while logged in sends the account token to the backend', async ({ page }) => {
    let capturedAuth = null
    await page.route('**/api/worlds', (route) => {
      capturedAuth = route.request().headers()['authorization']
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'w1' }) })
    })

    await signupAs(page, 'carole@example.com')
    await page.getByText('🌿 Jouer en local').click()
    await page.getByText('✨ Nouvelle partie').click()
    await page.locator('.name-input').fill('Ma partie compte')
    await page.getByText('✨ Commencer').click()
    await page.waitForSelector('canvas')
    await page.waitForTimeout(150)

    await page.locator('.save-btn').click()
    await page.waitForTimeout(200)

    expect(capturedAuth).toBe('Bearer tok-carole')
  })

  test('saving while signed out never calls the backend and stays resumable locally', async ({ page }) => {
    let apiCalled = false
    await page.route('**/api/worlds', (route) => {
      apiCalled = true
      route.fulfill({ status: 401, body: 'Connecte-toi' })
    })

    await startLocalGame(page, 'Partie sans compte')
    await page.waitForTimeout(150)
    await page.locator('.save-btn').click()
    await page.waitForTimeout(200)
    expect(apiCalled).toBe(false)

    await page.locator('.quit-btn').click()
    await page.getByText('Quitter').click()
    await page.getByText('🌿 Jouer en local').click()
    await page.getByText('📂 Charger une partie').click()
    await expect(page.getByText('Partie sans compte')).toBeVisible()
    expect(apiCalled).toBe(false)
  })
})
