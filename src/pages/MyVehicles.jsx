import { useState, useEffect } from 'react'
import { Car, Plus, Trash2 } from 'lucide-react'
import { fetchVehicles, addVehicle, deleteVehicle } from '../lib/db'
import { mockVehicles } from '../lib/mockData'

const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL
const COLORS = ['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Green', 'Other']

export default function MyVehicles({ user }) {
  const [vehicles, setVehicles] = useState(
    DEMO_MODE ? mockVehicles.filter((v) => v.unit === user.unit) : []
  )
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ plate_number: '', make: '', model: '', color: 'White' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (DEMO_MODE) return
    fetchVehicles(user.unit).then(setVehicles).catch(console.error)
  }, [user.unit])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    const entry = {
      unit: user.unit,
      resident_name: user.name,
      plate_number: form.plate_number.toUpperCase(),
      make: form.make,
      model: form.model,
      color: form.color,
    }
    if (DEMO_MODE) {
      setVehicles((prev) => [{ id: Date.now(), ...entry }, ...prev])
    } else {
      try {
        const saved = await addVehicle(entry)
        setVehicles((prev) => [saved, ...prev])
      } catch (e) { console.error(e) }
    }
    setForm({ plate_number: '', make: '', model: '', color: 'White' })
    setShowForm(false)
    setSaving(false)
  }

  const remove = async (id) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id))
    if (!DEMO_MODE) await deleteVehicle(id).catch(console.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Vehicles</h2>
          <p className="text-slate-500 text-sm">Unit {user.unit} · {vehicles.length} registered</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
        >
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm p-5 space-y-4 border border-blue-100">
          <h3 className="font-semibold text-slate-700">Register Vehicle</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Number Plate <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.plate_number}
              onChange={(e) => set('plate_number', e.target.value.toUpperCase())}
              placeholder="e.g. LEA-1234"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
              <input
                type="text"
                value={form.make}
                onChange={(e) => set('make', e.target.value)}
                placeholder="Toyota"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => set('model', e.target.value)}
                placeholder="Corolla"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    form.color === c
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition"
            >
              {saving ? 'Saving...' : 'Save Vehicle'}
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
        {vehicles.length === 0 && (
          <div className="text-center text-slate-400 py-12">
            No vehicles registered. Add yours so security can identify you.
          </div>
        )}
        {vehicles.map((v) => (
          <div key={v.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="bg-blue-100 rounded-full p-2.5 shrink-0">
              <Car size={20} className="text-blue-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono font-bold text-slate-800 text-lg tracking-wider">
                {v.plate_number}
              </div>
              <div className="text-xs text-slate-500">
                {[v.color, v.make, v.model].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button onClick={() => remove(v.id)} className="text-slate-300 hover:text-red-400 transition">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
