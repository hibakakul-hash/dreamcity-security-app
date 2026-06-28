import { supabase } from './supabase'

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function signUp(email, password, meta) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: meta },
  })
  if (error) throw error
  return data.user
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}
