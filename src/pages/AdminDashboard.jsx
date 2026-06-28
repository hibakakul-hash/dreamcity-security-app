import { useState, useEffect } from 'react'
import { Users, Home, Shield, Clock, CheckCircle, XCircle, UserX, UserCheck, ChevronDown, ChevronUp, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ units: 0, accounts: 0, todayVisitors: 0, pending: 0 })
  const [units, setUnits] = useState([])       // per-unit registration breakdown
  const [auditLog, setAuditLog] = useState([]) // decided visitors
  const [accounts, setAccounts] = useState([]) // all profiles
  const [pendingAccounts, setPendingAccounts] = useState([]) // awaiting approval
  const [tab, setTab] = useState('overview')   // 'overview' | 'units' | 'audit' | 'accounts' | 'approvals'
  const [expandedUnit, setExpandedUnit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [
        { data: profiles },
        { data: visitors },
        { data: residents },
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at'),
        supabase.from('visitors').select('*').order('created_at', { ascending: false }),
        supabase.from('residents').select('*').order('unit'),
      ])

      // Stats
      const today = new Date().toDateString()
      const todayVisitors = visitors?.filter(v => new Date(v.created_at).toDateString() === today) || []
      const pending = visitors?.filter(v => v.status === 'pending') || []
      const unitSet = new Set(profiles?.filter(p => p.unit).map(p => p.unit))

      setStats({
        units: unitSet.size,
        accounts: profiles?.length || 0,
        todayVisitors: todayVisitors.length,
        pending: pending.length,
      })

      // Per-unit breakdown
      const unitMap = {}
      residents?.forEach(r => {
        unitMap[r.unit] = { ...r, members: [] }
      })
      profiles?.forEach(p => {
        if (p.unit) {
          if (!unitMap[p.unit]) unitMap[p.unit] = { unit: p.unit, name: '—', phone: '—', members: [] }
          unitMap[p.unit].members.push(p)
        }
      })
      setUnits(Object.values(unitMap).sort((a, b) => a.unit?.localeCompare(b.unit)))

      // Audit log — decided visitors only
      setAuditLog(visitors?.filter(v => v.status !== 'pending') || [])

      // All accounts
      setAccounts(profiles || [])

      // Pending approval accounts
      setPendingAccounts(profiles?.filter(p => p.is_pending) || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggleAccount = async (profile) => {
    setActionLoading(profile.id)
    try {
      await supabase.from('profiles')
        .update({ is_active: !profile.is_active })
        .eq('id', profile.id)
      await load()
    } catch (e) { console.error(e) }
    finally { setActionLoading(null) }
  }

  const approveAccount = async (profile) => {
    setActionLoading(profile.id)
    try {
      await supabase.from('profiles')
        .update({ is_pending: false, is_active: true })
        .eq('id', profile.id)
      await load()
    } catch (e) { console.error(e) }
    finally { setActionLoading(null) }
  }

  const rejectAccount = async (profile) => {
    setActionLoading(profile.id + '_reject')
    try {
      await supabase.from('profiles').delete().eq('id', profile.id)
      await supabase.auth.admin?.deleteUser(profile.id).catch(() => {})
      await load()
    } catch (e) { console.error(e) }
    finally { setActionLoading(null) }
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'approvals', label: `Approvals${pendingAccounts.length ? ` (${pendingAccounts.length})` : ''}` },
    { key: 'units', label: 'Units' },
    { key: 'audit', label: 'Audit Log' },
    { key: 'accounts', label: 'Accounts' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Admin Dashboard</h2>
        <p className="text-slate-500 text-sm">Society-wide management & audit trail</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-200 rounded-xl p-1 overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              tab === key ? 'bg-white text-blue-700 shadow' : 'text-slate-600 hover:text-slate-800'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">Loading...</div>
      ) : (
        <>
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={Home} label="Active Units" value={stats.units} color="blue" />
                <StatCard icon={Users} label="Total Accounts" value={stats.accounts} color="purple" />
                <StatCard icon={Shield} label="Today's Visitors" value={stats.todayVisitors} color="green" />
                <StatCard icon={Clock} label="Pending Now" value={stats.pending} color="amber" />
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <h3 className="font-semibold text-slate-700 text-sm">Recent Decisions</h3>
                {auditLog.slice(0, 5).map(v => (
                  <AuditRow key={v.id} v={v} />
                ))}
                {auditLog.length === 0 && <p className="text-sm text-slate-400">No decisions yet</p>}
                {auditLog.length > 5 && (
                  <button onClick={() => setTab('audit')}
                    className="text-sm text-blue-600 hover:underline">
                    View all {auditLog.length} decisions →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PENDING APPROVALS */}
          {tab === 'approvals' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 px-1">{pendingAccounts.length} account{pendingAccounts.length !== 1 ? 's' : ''} awaiting approval</p>
              {pendingAccounts.length === 0 && (
                <div className="text-center text-slate-400 py-12 space-y-2">
                  <UserPlus size={32} className="mx-auto opacity-30" />
                  <p className="text-sm">No pending approvals</p>
                </div>
              )}
              {pendingAccounts.map(a => (
                <div key={a.id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {a.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 text-sm">{a.name}</div>
                      <div className="text-xs text-slate-400">
                        {a.phone ? `+${a.phone}` : '—'}
                        {a.unit ? ` · Unit ${a.unit}` : ''}
                        {' · '}<span className="capitalize">{a.role}</span>
                        {' · '}Registered {timeAgo(a.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveAccount(a)}
                      disabled={!!actionLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition">
                      {actionLoading === a.id ? '...' : <><UserCheck size={15} /> Approve</>}
                    </button>
                    <button
                      onClick={() => rejectAccount(a)}
                      disabled={!!actionLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition">
                      {actionLoading === a.id + '_reject' ? '...' : <><XCircle size={15} /> Reject</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* UNITS */}
          {tab === 'units' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 px-1">{units.length} units · tap to expand</p>
              {units.map(unit => (
                <div key={unit.unit} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedUnit(expandedUnit === unit.unit ? null : unit.unit)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left"
                  >
                    <div className="bg-blue-100 rounded-lg p-2 shrink-0">
                      <Home size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 text-sm">Unit {unit.unit}</div>
                      <div className="text-xs text-slate-500">
                        {unit.members.length} account{unit.members.length !== 1 ? 's' : ''} registered
                        {unit.name && unit.name !== '—' ? ` · ${unit.name}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        unit.members.length > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {unit.members.length > 0 ? 'Active' : 'No accounts'}
                      </span>
                      {expandedUnit === unit.unit
                        ? <ChevronUp size={16} className="text-slate-400" />
                        : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  {expandedUnit === unit.unit && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      {unit.members.length === 0 ? (
                        <p className="text-sm text-slate-400 px-4 py-3">No registered accounts</p>
                      ) : unit.members.map(m => (
                        <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            m.is_active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {m.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${m.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                              {m.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {m.phone ? `0${m.phone.slice(2)}` : '—'} · Joined {timeAgo(m.created_at)}
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            m.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                          }`}>
                            {m.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AUDIT LOG */}
          {tab === 'audit' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 px-1">{auditLog.length} decided requests</p>
              {auditLog.length === 0 && (
                <div className="text-center text-slate-400 py-12">No decisions recorded yet</div>
              )}
              {auditLog.map(v => (
                <div key={v.id} className="bg-white rounded-xl shadow-sm p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {v.status === 'approved'
                        ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                        : <XCircle size={16} className="text-red-400 shrink-0" />}
                      <span className="font-medium text-slate-800 text-sm">{v.visitor_name}</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      v.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5 pl-6">
                    <div>Unit {v.unit} · {v.purpose}</div>
                    <div className="flex items-center gap-3">
                      <span>Decided by: <strong>{v.decided_by_name || 'Security'}</strong></span>
                      <span>·</span>
                      <span>{formatDate(v.approved_at)}</span>
                    </div>
                    {v.vehicle_number && <div>Vehicle: {v.vehicle_number}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ACCOUNTS */}
          {tab === 'accounts' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 px-1">{accounts.length} total accounts</p>
              {accounts.map(a => (
                <div key={a.id} className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 ${!a.is_active ? 'opacity-60' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    a.role === 'admin' ? 'bg-red-100 text-red-600'
                    : a.role === 'security' ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                  }`}>
                    {a.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800 text-sm truncate">{a.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize font-medium ${
                        a.role === 'admin' ? 'bg-red-50 text-red-600'
                        : a.role === 'security' ? 'bg-blue-50 text-blue-600'
                        : 'bg-purple-50 text-purple-600'
                      }`}>{a.role}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {a.phone ? `0${a.phone.slice(2)}` : '—'}
                      {a.unit ? ` · Unit ${a.unit}` : ''}
                      {' · '}Joined {timeAgo(a.created_at)}
                    </div>
                  </div>
                  {a.role !== 'admin' && (
                    <button
                      onClick={() => toggleAccount(a)}
                      disabled={actionLoading === a.id}
                      className={`shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                        a.is_active
                          ? 'border-red-200 text-red-500 hover:bg-red-50'
                          : 'border-green-200 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {actionLoading === a.id ? '...' : a.is_active
                        ? <><UserX size={13} /> Suspend</>
                        : <><UserCheck size={13} /> Restore</>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    amber:  'bg-amber-50 text-amber-700 border-amber-100',
  }
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <Icon size={20} className="mb-2 opacity-70" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-70 mt-0.5">{label}</div>
    </div>
  )
}

function AuditRow({ v }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {v.status === 'approved'
        ? <CheckCircle size={15} className="text-green-500 shrink-0" />
        : <XCircle size={15} className="text-red-400 shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-slate-700 truncate">{v.visitor_name}</span>
        <span className="text-slate-400"> · Unit {v.unit}</span>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-slate-500">{v.decided_by_name || 'Security'}</div>
        <div className="text-xs text-slate-400">{new Date(v.approved_at || v.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</div>
      </div>
    </div>
  )
}
