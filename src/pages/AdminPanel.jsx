import { useState, useEffect } from 'react'
import { Trash2, Plus, UserCheck } from 'lucide-react'
import { fetchResidents, addResident, deleteResident } from '../lib/db'
import { mockResidents } from '../lib/mockData'

const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL

export default function AdminPanel() {
  const [residents, setResidents] = useState(DEMO_MODE ? mockResidents : [])
  const [form, setForm] = useState({ name: '', unit: '', phone: '' })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (DEMO_MODE) return
    fetchResidents().then(setResidents).catch(console.error)
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name || !form.unit) return
    setSaving(true)
    if (DEMO_MODE) {
      setResidents((prev) => [...prev, { id: Date.now(), ...form }])
    } else {
      try {
        const saved = await addResident(form)
        setResidents((prev) => [...prev, saved])
      } catch (e) {
        console.error(e)
      }
    }
    setForm({ name: '', unit: '', phone: '' })
    setShowForm(false)
    setSaving(false)
  }

  const remove = async (id) => {
    setResidents((prev) => prev.filter((r) => r.id !== id))
    if (!DEMO_MODE) await deleteResident(id).catch(console.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Admin Panel</h2>
          <p className="text-slate-500 text-sm">{residents.length} residents registered</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
        >
          <Plus size={16} /> Add Resident
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm p-5 space-y-4 border border-blue-100">
          <h3 className="font-semibold text-slate-700">New Resident</h3>
          {[
            { key: 'name', label: 'Full Name', placeholder: 'e.g. Sara Ali', required: true },
            { key: 'unit', label: 'Unit / Flat', placeholder: 'e.g. A-201', required: true },
            { key: 'phone', label: 'Phone', placeholder: 'e.g. 0300-1234567', required: false },
          ].map(({ key, label, placeholder, required }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={required}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition"
            >
              {saving ? 'Saving...' : 'Save Resident'}
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
        {residents.map((r) => (
          <div key={r.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="bg-blue-100 rounded-full p-2 shrink-0">
              <UserCheck size={18} className="text-blue-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800">{r.name}</div>
              <div className="text-xs text-slate-500">
                Unit {r.unit}{r.phone ? ` · ${r.phone}` : ''}
              </div>
            </div>
            <button onClick={() => remove(r.id)} className="text-slate-300 hover:text-red-400 transition">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
