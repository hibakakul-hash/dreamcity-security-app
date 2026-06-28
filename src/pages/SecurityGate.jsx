import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Car, Home, RefreshCw } from 'lucide-react'
import { fetchVisitors, updateVisitorStatus } from '../lib/db'
import { supabase } from '../lib/supabase'
import { mockVisitors } from '../lib/mockData'

const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL

const PURPOSE_COLORS = {
  Guest: 'bg-purple-100 text-purple-700',
  Delivery: 'bg-yellow-100 text-yellow-700',
  Family: 'bg-green-100 text-green-700',
  Service: 'bg-orange-100 text-orange-700',
  Other: 'bg-slate-100 text-slate-600',
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${diff}m ago`
  return `${Math.floor(diff / 60)}h ago`
}

export default function SecurityGate() {
  const [visitors, setVisitors] = useState(DEMO_MODE ? mockVisitors : [])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(!DEMO_MODE)

  const load = async () => {
    if (DEMO_MODE) return
    try {
      const data = await fetchVisitors()
      setVisitors(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    if (DEMO_MODE) return
    const channel = supabase
      .channel('visitors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const handleStatus = async (id, status) => {
    if (DEMO_MODE) {
      setVisitors((prev) =>
        prev.map((v) => v.id === id ? { ...v, status, approved_at: new Date().toISOString() } : v)
      )
      return
    }
    await updateVisitorStatus(id, status)
    load()
  }

  const filtered = visitors.filter((v) => filter === 'all' || v.status === filter)
  const pendingCount = visitors.filter((v) => v.status === 'pending').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gate Control</h2>
          <p className="text-slate-500 text-sm">
            {loading ? 'Loading...' : pendingCount > 0
              ? `${pendingCount} visitor${pendingCount > 1 ? 's' : ''} awaiting approval`
              : 'No pending visitors'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {DEMO_MODE && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Demo</span>
          )}
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
          {!DEMO_MODE && (
            <button onClick={load} className="text-slate-400 hover:text-blue-600 transition">
              <RefreshCw size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 bg-slate-200 rounded-xl p-1">
        {[
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'denied', label: 'Denied' },
          { key: 'all', label: 'All' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === key ? 'bg-white text-blue-700 shadow' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="text-center text-slate-400 py-12">Loading visitors...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-slate-400 py-12">
            No {filter === 'all' ? '' : filter} visitors
          </div>
        )}
        {filtered.map((v) => (
          <div
            key={v.id}
            className={`bg-white rounded-2xl shadow-sm border-l-4 p-4 ${
              v.status === 'pending' ? 'border-amber-400'
              : v.status === 'approved' ? 'border-green-500'
              : 'border-red-400'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">{v.visitor_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PURPOSE_COLORS[v.purpose] || PURPOSE_COLORS.Other}`}>
                    {v.purpose}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Home size={14} className="text-slate-400" />
                    Unit {v.unit} · {v.resident_name}
                  </div>
                  {v.vehicle_number && (
                    <div className="flex items-center gap-1.5">
                      <Car size={14} className="text-slate-400" />
                      {v.vehicle_number}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    {timeAgo(v.created_at)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                {v.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleStatus(v.id, 'approved')}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition"
                    >
                      <CheckCircle size={16} /> Allow
                    </button>
                    <button
                      onClick={() => handleStatus(v.id, 'denied')}
                      className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition"
                    >
                      <XCircle size={16} /> Deny
                    </button>
                  </>
                ) : (
                  <span className={`flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full ${
                    v.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {v.status === 'approved' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {v.status === 'approved' ? 'Allowed' : 'Denied'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
