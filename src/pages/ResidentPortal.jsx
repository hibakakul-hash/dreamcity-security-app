import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckCircle, Clock } from 'lucide-react'
import { fetchPreApprovals, addPreApproval, deletePreApproval } from '../lib/db'
import { mockPreApprovals } from '../lib/mockData'

const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL
const PURPOSES = ['Guest', 'Delivery', 'Family', 'Service', 'Other']

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function ResidentPortal({ user }) {
  const [approvals, setApprovals] = useState(
    DEMO_MODE ? mockPreApprovals.filter((a) => a.unit === user.unit) : []
  )
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ visitor_name: '', purpose: 'Guest', valid_until: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (DEMO_MODE) return
    fetchPreApprovals(user.unit).then(setApprovals).catch(console.error)
  }, [user.unit])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    const entry = {
      visitor_name: form.visitor_name,
      purpose: form.purpose,
      unit: user.unit,
      resident_name: user.name,
      valid_from: new Date().toISOString(),
      valid_until: form.valid_until
        ? new Date(form.valid_until).toISOString()
        : new Date(Date.now() + 24 * 3600000).toISOString(),
      is_active: true,
    }
    if (DEMO_MODE) {
      setApprovals((prev) => [{ id: Date.now(), ...entry }, ...prev])
    } else {
      try {
        const saved = await addPreApproval(entry)
        setApprovals((prev) => [saved, ...prev])
      } catch (e) {
        console.error(e)
      }
    }
    setForm({ visitor_name: '', purpose: 'Guest', valid_until: '' })
    setShowForm(false)
    setSaving(false)
  }

  const remove = async (id) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id))
    if (!DEMO_MODE) await deletePreApproval(id).catch(console.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Pre-Approvals</h2>
          <p className="text-slate-500 text-sm">Unit {user.unit} · {user.name}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm p-5 space-y-4 border border-blue-100">
          <h3 className="font-semibold text-slate-700">Pre-approve a Visitor</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Visitor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.visitor_name}
              onChange={(e) => set('visitor_name', e.target.value)}
              placeholder="e.g. Ahmed Khan"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('purpose', p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    form.purpose === p
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Valid Until <span className="text-slate-400 font-normal">(default: 24h)</span>
            </label>
            <input
              type="datetime-local"
              value={form.valid_until}
              onChange={(e) => set('valid_until', e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition"
            >
              {saving ? 'Saving...' : 'Save Pre-Approval'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {approvals.length === 0 && (
          <div className="text-center text-slate-400 py-12">
            No pre-approvals yet. Add visitors you expect.
          </div>
        )}
        {approvals.map((a) => {
          const expired = new Date(a.valid_until) < new Date()
          return (
            <div key={a.id} className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 ${expired ? 'opacity-60' : ''}`}>
              <div className="shrink-0">
                {expired
                  ? <Clock size={20} className="text-slate-400" />
                  : <CheckCircle size={20} className="text-green-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800">{a.visitor_name}</div>
                <div className="text-xs text-slate-500">
                  {a.purpose} · Valid until {formatDate(a.valid_until)}
                  {expired && ' · Expired'}
                </div>
              </div>
              <button onClick={() => remove(a.id)} className="text-slate-300 hover:text-red-400 transition">
                <Trash2 size={18} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
