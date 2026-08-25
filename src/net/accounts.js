import { supabase } from './supabase.js'

function toUser(user) {
  return user ? { id: user.id, email: user.email } : null
}

export async function signup(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return toUser(data.user)
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return toUser(data.user)
}

export async function logout() {
  await supabase.auth.signOut()
}

// Session courante, ou null si signé out / Supabase pas configuré.
export async function fetchMe() {
  const { data } = await supabase.auth.getSession()
  return toUser(data.session?.user)
}

// Header à joindre aux requêtes vers server/index.js (vérifie ce JWT auprès de Supabase).
export async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
