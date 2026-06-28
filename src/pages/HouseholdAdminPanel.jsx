import { useState, useEffect } from 'react'
import { UserCheck, XCircle, UserX, KeyRound, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

const MAX_ACTIVE = 5

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

export default function HouseholdAdminPanel({ user }) {
  const [members, setMembers] = useState([])
  const [pending, setPending] = useState([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [tempPassword, setTempPassword] = useState(null) // { name, password }

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('unit', user.unit)
      .order('created_at')
    if (data) {
      // Pending residents only (HA/security go to SuperAdmin)
      setPending(data.filter(p => p.is_pending && p.role === 'resident'))
      setMembers(data.filter(p => !p.is_pending))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const activeCount = members.filter(m => m.is_active).length
  const slotsLeft = MAX_ACTIVE - activeCount

  const approveAccount = async (profile) => {
    if (activeCount >= MAX_ACTIVE) {
      alert(`Your unit has reached the limit of ${MAX_ACTIVE} active accounts. Mark an inactive account first to free a slot.`)
      return
    }
    setActionLoading(profile.id)
    await supabase.from('profiles').update({ is_pending: false, is_active: true }).eq('id', profile.id)
    await load()
    setActionLoading(null)
  }

  const rejectAccount = async (profile) => {
    setActionLoading(profile.id + '_r')
    await supabase.from('profiles').delete().eq('id', profile.id)
    await load()
    setActionLoading(null)
  }

  const toggleActive = async (profile) => {
    if (profile.id === user.id) return // HA cannot deactivate themselves
    setActionLoading(profile.id + '_t')
    await supabase.from('profiles').update({ is_active: !profile.is_active }).eq('id', profile.id)
    await load()
    setActionLoading(null)
  }

  const resetPassword = async (profile) => {
    if (!confirm(`Reset password for ${profile.name}? A temporary password will be shown to you once.`)) return
    setActionLoading(profile.id + '_pw')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ targetUserId: profile.id, requesterId: user.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Reset failed')
      setTempPassword({ name: profile.name, password: json.tempPassword })
    } catch (e) {
      alert(`Error: ${e.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Unit {user.unit}</h2>
        <p className="text-slate-500 text-sm">Manage members of your household</p>
      </div>

      {/* Slot indicator */}
      <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
        activeCount >= MAX_ACTIVE ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-100'
      }`}>
        <Users size={18} className={activeCount >= MAX_ACTIVE ? 'text-red-500' : 'text-blue-600'} />
        <div>
          <span className={`font-semibold text-sm ${activeCount >= MAX_ACTIVE ? 'text-red-600' : 'text-blue-700'}`}>
            {activeCount} / {MAX_ACTIVE} active slots used
          </span>
          {slotsLeft > 0
            ? <p className="text-xs text-slate-500">{slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} available</p>
            : <p className="text-xs text-red-500">Unit full — mark someone inactive to add new members</p>}
        </div>
      </div>

      <div className="flex gap-1 bg-slate-200 rounded-xl p-1">
        {[
          { key: 'pending', label: `Pending${pending.length ? ` (${pending.length})` : ''}` },
          { key: 'members', label: 'Members' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === key ? 'bg-white text-blue-700 shadow' : 'text-slate-600'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center text-slate-400 py-12">Loading...</div> : (
        <>
          {tab === 'pending' && (
            <div className="space-y-2">
              {pending.length === 0 && (
                <div className="text-center text-slate-400 py-12 space-y-2">
                  <UserCheck size={32} className="mx-auto opacity-30" />
                  <p className="text-sm">No pending approvals for your unit</p>
                </div>
              )}
              {pending.map(a => (
                <div key={a.id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {a.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 text-sm">{a.name}</div>
                      <div className="text-xs text-slate-400">
                        {a.phone ? `+${a.phone}` : '—'} · Registered {timeAgo(a.created_at)}
                      </div>
                    </div>
                  </div>
                  {activeCount >= MAX_ACTIVE && (
                    <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-1.5">
                      Unit is full ({MAX_ACTIVE}/{MAX_ACTIVE}). Mark a member inactive first.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => approveAccount(a)} disabled={!!actionLoading || activeCount >= MAX_ACTIVE}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                      {actionLoading === a.id ? '...' : <><UserCheck size={15} /> Approve</>}
                    </button>
                    <button onClick={() => rejectAccount(a)} disabled={!!actionLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition">
                      {actionLoading === a.id + '_r' ? '...' : <><XCircle size={15} /> Reject</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'members' && (
            <div className="space-y-2">
              {members.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No members yet</p>}
              {members.map(m => (
                <div key={m.id} className={`bg-white rounded-xl shadow-sm p-4 space-y-3 ${!m.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      m.is_active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {m.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800 text-sm">{m.name}</span>
                        {m.id === user.id && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">You</span>}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${m.is_active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                          {m.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {m.phone ? `+${m.phone}` : '—'} · <span className="capitalize">{m.role.replace('_', ' ')}</span>
                        {m.must_change_password && <span className="text-amber-500 ml-1">· Temp password set</span>}
                      </div>
                    </div>
                  </div>

                  {m.id !== user.id && m.role !== 'household_admin' && (
                    <div className="flex gap-2">
                      <button onClick={() => resetPassword(m)} disabled={!!actionLoading || !m.is_active}
                        title={!m.is_active ? 'Activate account first' : 'Reset password'}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                        {actionLoading === m.id + '_pw' ? '...' : <><KeyRound size={13} /> Reset Password</>}
                      </button>
                      <button onClick={() => toggleActive(m)} disabled={!!actionLoading}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg border transition disabled:opacity-40 ${
                          m.is_active
                            ? 'border-red-200 text-red-500 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}>
                        {actionLoading === m.id + '_t' ? '...' : m.is_active
                          ? <><UserX size={13} /> Mark Inactive</>
                          : <><UserCheck size={13} /> Reactivate</>}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Temp password modal */}
      {tempPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Temporary Password</h3>
            <p className="text-sm text-slate-500">
              Share this with <strong>{tempPassword.name}</strong>. It will not be shown again. They will be asked to set a new password on first login.
            </p>
            <div className="bg-slate-100 rounded-xl px-4 py-3 text-center">
              <span className="font-mono text-xl font-bold text-blue-700 tracking-widest">{tempPassword.password}</span>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Tell them this password in person. Do not share via message.
            </p>
            <button onClick={() => setTempPassword(null)}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-xl transition">
              Done — I've noted it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
