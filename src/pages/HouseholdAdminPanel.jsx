import { useState, useEffect } from 'react'
import { UserCheck, XCircle, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

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
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [tab, setTab] = useState('pending')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('unit', user.unit)
      .order('created_at')
    if (data) {
      setPending(data.filter(p => p.is_pending))
      setMembers(data.filter(p => !p.is_pending))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const approveAccount = async (profile) => {
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Unit {user.unit}</h2>
        <p className="text-slate-500 text-sm">Manage members of your household</p>
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
                        {a.phone ? `+${a.phone}` : '—'} · <span className="capitalize">{a.role}</span> · {timeAgo(a.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approveAccount(a)} disabled={!!actionLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition">
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
              {members.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No approved members yet</p>}
              {members.map(m => (
                <div key={m.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                    {m.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm">{m.name}</div>
                    <div className="text-xs text-slate-400">
                      {m.phone ? `+${m.phone}` : '—'} · <span className="capitalize">{m.role}</span>
                      {!m.is_active && <span className="text-red-400 ml-1">(suspended)</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
