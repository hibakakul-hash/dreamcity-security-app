import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockResidents } from '../lib/mockData'

const PURPOSES = ['Guest', 'Delivery', 'Family', 'Service', 'Other']

export default function AddVisitor() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    visitor_name: '',
    vehicle_number: '',
    purpose: 'Guest',
    unit: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const resident = mockResidents.find((r) => r.unit === form.unit)

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.visitor_name || !form.unit) return
    setSubmitted(true)
    setTimeout(() => navigate('/'), 1500)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <div className="bg-green-100 rounded-full p-5">
          <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-slate-700">Visitor Logged!</p>
        <p className="text-slate-500 text-sm">Redirecting to gate...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Log New Visitor</h2>
        <p className="text-slate-500 text-sm">Record a visitor arriving at the gate</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
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
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Unit / Flat <span className="text-red-500">*</span>
          </label>
          <select
            value={form.unit}
            onChange={(e) => set('unit', e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select unit...</option>
            {mockResidents.map((r) => (
              <option key={r.id} value={r.unit}>
                {r.unit} · {r.name}
              </option>
            ))}
          </select>
          {resident && (
            <p className="text-xs text-slate-500 mt-1">
              Resident: {resident.name} · {resident.phone}
            </p>
          )}
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
            Vehicle Number <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={form.vehicle_number}
            onChange={(e) => set('vehicle_number', e.target.value)}
            placeholder="e.g. ABC-123"
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition shadow mt-2"
        >
          Log Visitor
        </button>
      </form>
    </div>
  )
}
