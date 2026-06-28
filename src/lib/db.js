import { supabase } from './supabase'

// Visitors
export async function fetchVisitors(unit = null) {
  let query = supabase
    .from('visitors')
    .select('*')
    .order('created_at', { ascending: false })
  if (unit) query = query.eq('unit', unit)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function addVisitor(visitor) {
  const { data, error } = await supabase.from('visitors').insert([visitor]).select().single()
  if (error) throw error
  return data
}

export async function updateVisitorStatus(id, status) {
  const { error } = await supabase
    .from('visitors')
    .update({ status, approved_at: status !== 'pending' ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

// Pre-approvals
export async function fetchPreApprovals(unit) {
  const { data, error } = await supabase
    .from('pre_approvals')
    .select('*')
    .eq('unit', unit)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addPreApproval(approval) {
  const { data, error } = await supabase.from('pre_approvals').insert([approval]).select().single()
  if (error) throw error
  return data
}

export async function deletePreApproval(id) {
  const { error } = await supabase.from('pre_approvals').delete().eq('id', id)
  if (error) throw error
}

// Residents
export async function fetchResidents() {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .order('unit')
  if (error) throw error
  return data
}

export async function addResident(resident) {
  const { data, error } = await supabase.from('residents').insert([resident]).select().single()
  if (error) throw error
  return data
}

export async function deleteResident(id) {
  const { error } = await supabase.from('residents').delete().eq('id', id)
  if (error) throw error
}
