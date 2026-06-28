import { useState } from 'react'
import { Shield } from 'lucide-react'
import { signIn, signUp } from '../lib/auth'

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [form, setForm] = useState({ email: '', password: '', name: '', unit: '', role: 'resident' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const user = await signIn(form.email, form.password)
        onLogin(user)
      } else {
        const meta = { name: form.name, role: form.role, unit: form.role === 'resident' ? form.unit : null }
        const user = await signUp(form.email, form.password, meta)
        onLogin(user)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-100 rounded-full p-4 mb-3">
            <Shield size={40} className="text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Dreamcity</h1>
          <p className="text-slate-500 text-sm mt-1">Society Gate Security</p>
        </div>

        {/* Tab toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          {['login', 'signup'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition capitalize ${
                mode === m ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Sara Ali"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="resident">Resident</option>
                  <option value="security">Security Guard</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {form.role === 'resident' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit / Flat</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => set('unit', e.target.value)}
                    placeholder="e.g. A-201"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition shadow"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
