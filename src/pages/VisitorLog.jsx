import { useState, useEffect } from 'react'
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react'
import { fetchVisitors } from '../lib/db'
import { mockVisitors } from '../lib/mockData'

const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-PK', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function VisitorLog({ user }) {
  const [visitors, setVisitors] = useState(DEMO_MODE ? mockVisitors : [])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(!DEMO_MODE)

  useEffect(() => {
    if (DEMO_MODE) return
    fetchVisitors(user?.role === 'resident' ? user.unit : null)
      .then(setVisitors)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = visitors.filter((v) => {
    const matchesUnit = user?.role === 'resident' ? v.unit === user.unit : true
    const matchesSearch = [v.visitor_name, v.unit, v.vehicle_number, v.purpose, v.resident_name]
      .join(' ').toLowerCase().includes(search.toLowerCase())
    return matchesUnit && matchesSearch
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Visitor Log</h2>
        <p className="text-slate-500 text-sm">{loading ? 'Loading...' : `${filtered.length} records`}</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, unit, vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="space-y-2">
        {loading && <div className="text-center text-slate-400 py-12">Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-slate-400 py-12">No records found</div>
        )}
        {filtered.map((v) => (
          <div key={v.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
            <div className="shrink-0">
              {v.status === 'approved' ? (
                <CheckCircle size={22} className="text-green-500" />
              ) : v.status === 'denied' ? (
                <XCircle size={22} className="text-red-400" />
              ) : (
                <Clock size={22} className="text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 truncate">{v.visitor_name}</div>
              <div className="text-xs text-slate-500">
                Unit {v.unit} · {v.purpose} · {formatDate(v.created_at)}
              </div>
              {v.vehicle_number && (
                <div className="text-xs text-slate-400">{v.vehicle_number}</div>
              )}
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
              v.status === 'approved' ? 'bg-green-100 text-green-700'
              : v.status === 'denied' ? 'bg-red-100 text-red-600'
              : 'bg-amber-100 text-amber-700'
            }`}>
              {v.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
