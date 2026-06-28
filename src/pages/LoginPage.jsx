import { useState } from 'react'
import { Shield } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { id: 'sec', label: 'Security Guard', role: 'security', name: 'Guard Ali', unit: null },
  { id: 'res', label: 'Resident (A-201)', role: 'resident', name: 'Sara Ali', unit: 'A-201' },
  { id: 'adm', label: 'Admin', role: 'admin', name: 'Society Admin', unit: null },
]

export default function LoginPage({ onLogin }) {
  const [selected, setSelected] = useState('sec')

  const handleLogin = () => {
    const account = DEMO_ACCOUNTS.find((a) => a.id === selected)
    onLogin({ role: account.role, name: account.name, unit: account.unit })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-100 rounded-full p-4 mb-3">
            <Shield size={40} className="text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Dreamcity</h1>
          <p className="text-slate-500 text-sm mt-1">Society Gate Security</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Login as (Demo)
          </label>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <label
                key={acc.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                  selected === acc.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={acc.id}
                  checked={selected === acc.id}
                  onChange={() => setSelected(acc.id)}
                  className="accent-blue-600"
                />
                <div>
                  <div className="font-medium text-slate-800 text-sm">{acc.label}</div>
                  <div className="text-xs text-slate-500 capitalize">{acc.role}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition shadow"
        >
          Enter App
        </button>

        <p className="text-center text-xs text-slate-400 mt-4">
          Demo mode · Connect Supabase for real auth
        </p>
      </div>
    </div>
  )
}
