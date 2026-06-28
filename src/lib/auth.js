import { supabase } from './supabase'

// Phone number is used as the user-facing identity.
// Internally we map it to <phone>@dreamcity.app for Supabase email auth.
const DOMAIN = 'dreamcity.app'

export function phoneToEmail(phone) {
  // Normalize: remove spaces, dashes, leading zeros, add country code
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.startsWith('92') ? digits : digits.startsWith('0') ? '92' + digits.slice(1) : '92' + digits
  return `${normalized}@${DOMAIN}`
}

export async function signInWithPhone(phone, password) {
  const email = phoneToEmail(phone)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function signUpWithPhone({ phone, password, name, role, unit, recoveryEmail }) {
  const email = phoneToEmail(phone)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role, unit: unit || null, phone, recovery_email: recoveryEmail || null },
    },
  })
  if (error) throw error
  return data.user
}

export async function signInWithRecoveryEmail(recoveryEmail, password) {
  // Look up the profile by recovery email to get the internal email
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('phone')
    .eq('recovery_email', recoveryEmail)
    .maybeSingle()
  if (error || !profile) throw new Error('No account found with that recovery email')
  const email = phoneToEmail(profile.phone)
  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  return data.user
}

export async function sendPasswordResetByPhone(phone) {
  const email = phoneToEmail(phone)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function sendPasswordResetByEmail(recoveryEmail) {
  // Look up internal email from recovery email
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('phone')
    .eq('recovery_email', recoveryEmail)
    .maybeSingle()
  if (error || !profile) throw new Error('No account found with that recovery email')
  const email = phoneToEmail(profile.phone)
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (resetError) throw resetError
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

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
