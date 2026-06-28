import { useState, useEffect, useMemo } from 'react'
import { Users, Home, Shield, Clock, CheckCircle, XCircle, UserX, UserCheck, ChevronDown, ChevronUp, UserPlus, Search, Download, Filter, Activity, ShieldCheck } from 'lucide-react'
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

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState({ units: 0, accounts: 0, todayVisitors: 0, pending: 0 })
  const [units, setUnits] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [accounts, setAccounts] = useState([])
  const [pendingAccounts, setPendingAccounts] = useState([])
  const [adminLogs, setAdminLogs] = useState([])
  const [tab, setTab] = useState('overview')
  const [expandedUnit, setExpandedUnit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  // New admin form
  const [showNewAdmin, setShowNewAdmin] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ name: '', phone: '', countryCode: '91', password: '' })
  const [newAdminLoading, setNewAdminLoading] = useState(false)
  const [newAdminError, setNewAdminError] = useState('')

  // Audit log filters
  const [auditSearch, setAuditSearch] = useState('')
  const [auditStatus, setAuditStatus] = useState('all')   // 'all' | 'approved' | 'denied'
  const [auditUnit, setAuditUnit] = useState('')
  const [auditFrom, setAuditFrom] = useState('')
  const [auditTo, setAuditTo] = useState('')

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

      setPendingAccounts(profiles?.filter(p => p.is_pending && p.role !== 'resident') || [])

      // Admin activity log
      const { data: logs } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      setAdminLogs(logs || [])
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
      await logAction(profile.is_active ? 'suspended_account' : 'restored_account', profile)
      await load()
    } catch (e) { console.error(e) }
    finally { setActionLoading(null) }
  }

  const logAction = async (action, target, notes = '') => {
    await supabase.from('admin_logs').insert({
      admin_id: user?.id,
      admin_name: user?.name || 'SuperAdmin',
      action,
      target_id: target?.id || null,
      target_name: target?.name || null,
      target_unit: target?.unit || null,
      target_role: target?.role || null,
      notes: notes || null,
    })
  }

  const approveAccount = async (profile) => {
    if (profile.role === 'household_admin') {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('unit', profile.unit)
        .eq('role', 'household_admin')
        .eq('is_active', true)
        .neq('id', profile.id)
      if (existing?.length > 0) {
        const name = existing[0].name || 'Unknown'
        alert(
          `Unit ${profile.unit} already has an active Household Admin: ${name}.\n\n` +
          `Go to the Accounts tab, suspend "${name}" first, then approve this request.`
        )
        return
      }
    }
    setActionLoading(profile.id)
    try {
      await supabase.from('profiles')
        .update({ is_pending: false, is_active: true })
        .eq('id', profile.id)
      await logAction('approved_account', profile)
      await load()
    } catch (e) { console.error(e) }
    finally { setActionLoading(null) }
  }

  const rejectAccount = async (profile) => {
    setActionLoading(profile.id + '_reject')
    try {
      await logAction('rejected_account', profile)
      await supabase.from('profiles').delete().eq('id', profile.id)
      await load()
    } catch (e) { console.error(e) }
    finally { setActionLoading(null) }
  }

  const createAdminAccount = async (e) => {
    e.preventDefault()
    setNewAdminError('')
    setNewAdminLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const phone = newAdmin.countryCode + newAdmin.phone.replace(/^0+/, '')
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ phone, password: newAdmin.password, name: newAdmin.name, requesterId: user?.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create admin')
      setShowNewAdmin(false)
      setNewAdmin({ name: '', phone: '', countryCode: '91', password: '' })
      await load()
    } catch (err) {
      setNewAdminError(err.message)
    } finally {
      setNewAdminLoading(false)
    }
  }

  const filteredAuditLog = useMemo(() => {
    const q = auditSearch.toLowerCase()
    return auditLog.filter(v => {
      if (auditStatus !== 'all' && v.status !== auditStatus) return false
      if (auditUnit && v.unit !== auditUnit) return false
      if (auditFrom && new Date(v.approved_at || v.created_at) < new Date(auditFrom)) return false
      if (auditTo && new Date(v.approved_at || v.created_at) > new Date(auditTo + 'T23:59:59')) return false
      if (q && ![v.visitor_name, v.unit, v.purpose, v.decided_by_name, v.vehicle_number]
        .filter(Boolean).some(s => s.toLowerCase().includes(q))) return false
      return true
    })
  }, [auditLog, auditSearch, auditStatus, auditUnit, auditFrom, auditTo])

  const exportCSV = () => {
    const rows = [
      ['Visitor', 'Unit', 'Purpose', 'Status', 'Decided By', 'Date', 'Vehicle'],
      ...filteredAuditLog.map(v => [
        v.visitor_name, v.unit, v.purpose, v.status,
        v.decided_by_name || 'Security',
        formatDate(v.approved_at || v.created_at),
        v.vehicle_number || '',
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dreamcity-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const auditUnits = useMemo(() => [...new Set(auditLog.map(v => v.unit).filter(Boolean))].sort(), [auditLog])

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'approvals', label: `Approvals${pendingAccounts.length ? ` (${pendingAccounts.length})` : ''}` },
    { key: 'units', label: 'Units' },
    { key: 'audit', label: 'Audit Log' },
    { key: 'accounts', label: 'Accounts' },
    { key: 'activity', label: 'Activity' },
    { key: 'admins', label: 'Admins' },
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
              {pendingAccounts.map(a => {
                const activeHA = a.role === 'household_admin'
                  ? accounts.find(p => p.unit === a.unit && p.role === 'household_admin' && p.is_active && p.id !== a.id)
                  : null
                return (
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
                          {' · '}<span className="capitalize">{a.role.replace('_', ' ')}</span>
                          {' · '}Registered {timeAgo(a.created_at)}
                        </div>
                      </div>
                    </div>
                    {activeHA && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                        <strong>Blocked:</strong> Unit {a.unit} already has Household Admin <strong>{activeHA.name}</strong>. Suspend them in the Accounts tab first.
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveAccount(a)}
                        disabled={!!actionLoading || !!activeHA}
                        title={activeHA ? `Suspend ${activeHA.name} first` : ''}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
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
                )
              })}
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
            <div className="space-y-3">
              {/* Search bar */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  placeholder="Search visitor, unit, purpose, decided by…"
                  className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filters row */}
              <div className="bg-white rounded-xl shadow-sm p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Filter size={13} /> Filters
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={auditStatus} onChange={e => setAuditStatus(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                    <option value="all">All statuses</option>
                    <option value="approved">Approved only</option>
                    <option value="denied">Denied only</option>
                  </select>
                  <select value={auditUnit} onChange={e => setAuditUnit(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                    <option value="">All units</option>
                    {auditUnits.map(u => <option key={u} value={u}>Unit {u}</option>)}
                  </select>
                  <div>
                    <label className="text-xs text-slate-400 mb-0.5 block">From</label>
                    <input type="date" value={auditFrom} onChange={e => setAuditFrom(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-0.5 block">To</label>
                    <input type="date" value={auditTo} onChange={e => setAuditTo(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                </div>
                {(auditSearch || auditStatus !== 'all' || auditUnit || auditFrom || auditTo) && (
                  <button onClick={() => { setAuditSearch(''); setAuditStatus('all'); setAuditUnit(''); setAuditFrom(''); setAuditTo('') }}
                    className="text-xs text-blue-600 hover:underline">
                    Clear all filters
                  </button>
                )}
              </div>

              {/* Results bar + export */}
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-slate-500">
                  {filteredAuditLog.length} of {auditLog.length} records
                </p>
                <button onClick={exportCSV} disabled={filteredAuditLog.length === 0}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-40 transition">
                  <Download size={13} /> Export CSV
                </button>
              </div>

              {filteredAuditLog.length === 0 && (
                <div className="text-center text-slate-400 py-12">No records match your filters</div>
              )}

              {filteredAuditLog.map(v => (
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
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        a.role === 'admin' ? 'bg-red-50 text-red-600'
                        : a.role === 'security' ? 'bg-blue-50 text-blue-600'
                        : a.role === 'household_admin' ? 'bg-orange-50 text-orange-600'
                        : 'bg-purple-50 text-purple-600'
                      }`}>{a.role === 'household_admin' ? 'H. Admin' : a.role}</span>
                      {a.role === 'household_admin' && a.unit && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                          Unit {a.unit}
                        </span>
                      )}
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
          {/* ADMIN ACTIVITY */}
          {tab === 'activity' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 px-1">{adminLogs.length} admin actions recorded</p>
              {adminLogs.length === 0 && (
                <div className="text-center text-slate-400 py-12 space-y-2">
                  <Activity size={32} className="mx-auto opacity-30" />
                  <p className="text-sm">No admin activity yet</p>
                </div>
              )}
              {adminLogs.map(log => (
                <div key={log.id} className="bg-white rounded-xl shadow-sm p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {log.admin_name?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-800">
                      <strong>{log.admin_name}</strong>{' '}
                      <span className={`font-medium ${
                        log.action.includes('approved') || log.action.includes('restored') ? 'text-green-600'
                        : log.action.includes('rejected') || log.action.includes('suspended') ? 'text-red-500'
                        : 'text-blue-600'
                      }`}>{log.action.replace(/_/g, ' ')}</span>
                      {log.target_name && <> · <span className="text-slate-600">{log.target_name}</span></>}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 space-x-2">
                      {log.target_unit && <span>Unit {log.target_unit}</span>}
                      {log.target_role && <span className="capitalize">· {log.target_role.replace('_', ' ')}</span>}
                      {log.notes && <span>· {log.notes}</span>}
                      <span>· {timeAgo(log.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ADMIN MANAGEMENT */}
          {tab === 'admins' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-slate-500">
                  {accounts.filter(a => a.role === 'admin').length} / 3 SuperAdmin accounts
                </p>
                {accounts.filter(a => a.role === 'admin' && a.is_active).length < 3 && (
                  <button onClick={() => setShowNewAdmin(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition">
                    <ShieldCheck size={14} /> Add SuperAdmin
                  </button>
                )}
              </div>

              {showNewAdmin && (
                <form onSubmit={createAdminAccount} className="bg-white rounded-xl shadow-sm p-4 space-y-3 border border-blue-100">
                  <h3 className="font-semibold text-slate-700 text-sm">New SuperAdmin Account</h3>
                  <input
                    type="text" placeholder="Full name" required value={newAdmin.name}
                    onChange={e => setNewAdmin(v => ({ ...v, name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <select value={newAdmin.countryCode} onChange={e => setNewAdmin(v => ({ ...v, countryCode: e.target.value }))}
                      className="shrink-0 border border-slate-300 rounded-xl px-2 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {[['91','🇮🇳'],['971','🇦🇪'],['966','🇸🇦'],['44','🇬🇧'],['1','🇺🇸']].map(([c,f]) => (
                        <option key={c} value={c}>{f} +{c}</option>
                      ))}
                    </select>
                    <input type="tel" placeholder="Phone number" required value={newAdmin.phone}
                      onChange={e => setNewAdmin(v => ({ ...v, phone: e.target.value.replace(/\D/g,'').slice(0,13) }))}
                      className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <input type="password" placeholder="Password (min 6 chars)" required minLength={6}
                    value={newAdmin.password}
                    onChange={e => setNewAdmin(v => ({ ...v, password: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {newAdminError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{newAdminError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={newAdminLoading}
                      className="flex-1 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold py-2 rounded-xl disabled:opacity-50 transition">
                      {newAdminLoading ? 'Creating...' : 'Create Account'}
                    </button>
                    <button type="button" onClick={() => { setShowNewAdmin(false); setNewAdminError('') }}
                      className="flex-1 border border-slate-200 text-slate-600 text-sm py-2 rounded-xl hover:bg-slate-50 transition">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {accounts.filter(a => a.role === 'admin').map(a => (
                <div key={a.id} className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 ${!a.is_active ? 'opacity-60' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold shrink-0">
                    {a.name?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 text-sm">{a.name}</span>
                      {a.id === user?.id && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">You</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${a.is_active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                        {a.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {a.phone ? `+${a.phone}` : '—'} · SuperAdmin · Joined {timeAgo(a.created_at)}
                    </div>
                  </div>
                  {a.id !== user?.id && (
                    <button onClick={() => toggleAccount(a)} disabled={actionLoading === a.id}
                      className={`shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                        a.is_active ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'
                      }`}>
                      {actionLoading === a.id ? '...' : a.is_active ? <><UserX size={13} /> Suspend</> : <><UserCheck size={13} /> Restore</>}
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
