import { supabase } from './supabase'

// Phone number is used as the user-facing identity.
// Internally we map it to <phone>@dreamcity.app for Supabase email auth.
const DOMAIN = 'dreamcity.app'

export function phoneToEmail(phone) {
  // phone is already a full international number e.g. "923001234567" or "919876543210"
  const digits = phone.replace(/\D/g, '')
  return `${digits}@${DOMAIN}`
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

export async function updatePhone(userId, newPhone, currentPassword) {
  // Re-authenticate first to confirm identity
  const { data: { user } } = await supabase.auth.getUser()
  const currentEmail = user.email
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: currentEmail,
    password: currentPassword,
  })
  if (authError) throw new Error('Current password is incorrect')

  // Check new phone not already taken
  const newEmail = phoneToEmail(newPhone)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', newPhone.replace(/\D/g, ''))
    .maybeSingle()
  if (existing && existing.id !== userId) throw new Error('This phone number is already registered')

  // Update auth email (internal mapping)
  const { error: updateError } = await supabase.auth.updateUser({ email: newEmail })
  if (updateError) throw updateError

  // Update profile
  const digits = newPhone.replace(/\D/g, '')
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ phone: digits })
    .eq('id', userId)
  if (profileError) throw profileError
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  if (error) throw error
}

export async function fetchUnitMembers(unit) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, phone, role, created_at')
    .eq('unit', unit)
    .order('created_at')
  if (error) throw error
  return data
}
