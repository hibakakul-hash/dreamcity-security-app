import { useState, useEffect } from 'react'
import { Shield, ArrowLeft } from 'lucide-react'
import { signInWithPhone, signUpWithPhone } from '../lib/auth'
import { supabase } from '../lib/supabase'

const MODES = { login: 'login', signup: 'signup', forgot: 'forgot' }

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState(MODES.login)
  const [form, setForm] = useState({
    phone: '', password: '', confirmPassword: '',
    name: '', unit: '', role: 'resident',
    countryCode: '91',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [residents, setResidents] = useState([])
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    supabase.from('residents').select('unit, name').order('unit').then(({ data }) => {
      if (data) setResidents(data)
    })
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const reset = (m) => { setMode(m); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fullPhone = form.countryCode + form.phone.replace(/^0+/, '')

      if (mode === MODES.login) {
        const user = await signInWithPhone(fullPhone, form.password)
        onLogin(user)

      } else if (mode === MODES.signup) {
        if (form.password !== form.confirmPassword) throw new Error('Passwords do not match')
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters')
        if ((form.role === 'resident' || form.role === 'household_admin') && !form.unit)
          throw new Error('Please select a unit')

        if (form.role === 'household_admin') {
          const { data: existing } = await supabase
            .from('profiles')
            .select('id, name, is_active, is_pending')
            .eq('unit', form.unit)
            .eq('role', 'household_admin')
          const active = existing?.find(p => p.is_active || p.is_pending)
          if (active) {
            throw new Error(
              `Unit ${form.unit} already has a Household Admin${active.name ? ` (${active.name})` : ''}. ` +
              'Contact the society admin to reassign this role.'
            )
          }
        }

        await signUpWithPhone({
          phone: fullPhone,
          password: form.password,
          name: form.name,
          role: form.role,
          unit: (form.role === 'resident' || form.role === 'household_admin') ? form.unit : null,
          recoveryEmail: null,
        })
        setSubmitted(true)
        return
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot password screen ─────────────────────────────────────────────────
  if (mode === MODES.forgot) {
    return (
      <Wrapper>
        <button onClick={() => reset(MODES.login)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 mb-6 transition">
          <ArrowLeft size={15} /> Back to Sign In
        </button>
        <div className="text-center space-y-4">
          <div className="text-4xl">🔑</div>
          <h2 className="font-semibold text-slate-700">Forgot Password?</h2>
          <p className="text-sm text-slate-500">
            Contact your <strong>Household Admin</strong> to reset your password.
            They can generate a temporary password for you from their panel.
          </p>
          <p className="text-sm text-slate-500">
            Once you receive the temporary password, sign in and you'll be prompted to set a new one.
          </p>
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            If you are the Household Admin, contact the <strong>Society Admin (SuperAdmin)</strong> for assistance.
          </p>
        </div>
      </Wrapper>
    )
  }

  // ── Submitted / Pending screen ─────────────────────────────────────────────
  if (submitted) {
    const isResident = form.role === 'resident'
    return (
      <Wrapper>
        <div className="text-center space-y-4">
          <div className="text-5xl">⏳</div>
          <h2 className="font-bold text-slate-800 text-lg">Account Submitted</h2>
          <p className="text-slate-500 text-sm">
            {isResident
              ? 'Your account is awaiting approval from your Household Admin. You\'ll be able to sign in once approved.'
              : 'Your account is awaiting approval from the Society Admin. You\'ll be able to sign in once approved.'}
          </p>
          <button onClick={() => { setSubmitted(false); setMode(MODES.login) }}
            className="text-sm text-blue-600 hover:underline">
            Back to Sign In
          </button>
        </div>
      </Wrapper>
    )
  }

  // ── Login / Signup screens ─────────────────────────────────────────────────
  return (
    <Wrapper>
      <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
        {[MODES.login, MODES.signup].map((m) => (
          <button key={m} onClick={() => reset(m)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
              mode === m ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {m === MODES.login ? 'Sign In' : 'Register'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === MODES.signup && (
          <>
            <Field label="Full Name" required>
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Sara Ali" className={inputCls} required />
            </Field>

            <Field label="Role">
              <select value={form.role} onChange={(e) => { set('role', e.target.value); set('unit', '') }} className={inputCls}>
                <option value="resident">Resident</option>
                <option value="household_admin">Household Admin</option>
                <option value="security">Security Guard</option>
              </select>
            </Field>

            {(form.role === 'resident' || form.role === 'household_admin') && (
              <Field label="Unit / Flat" required>
                <select value={form.unit} onChange={(e) => set('unit', e.target.value)} className={inputCls} required>
                  <option value="">— Select your unit —</option>
                  {residents.map((r) => (
                    <option key={r.unit} value={r.unit}>
                      {r.unit}{r.name ? ` · ${r.name}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </>
        )}

        <PhoneInput
          value={form.phone}
          onChange={(v) => set('phone', v)}
          countryCode={form.countryCode}
          onCountryChange={(v) => set('countryCode', v)}
          required
        />

        <Field label="Password" required>
          <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
            placeholder="••••••••" className={inputCls} required minLength={6} />
        </Field>

        {mode === MODES.signup && (
          <Field label="Confirm Password" required>
            <input type="password" value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              placeholder="••••••••" className={inputCls} required minLength={6} />
          </Field>
        )}

        {error && <ErrorBox>{error}</ErrorBox>}

        <Btn loading={loading}>
          {mode === MODES.login ? 'Sign In' : 'Create Account'}
        </Btn>

        {mode === MODES.login && (
          <button type="button" onClick={() => reset(MODES.forgot)}
            className="w-full text-sm text-blue-600 hover:text-blue-800 transition text-center">
            Forgot password?
          </button>
        )}
      </form>
    </Wrapper>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────

const inputCls = 'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Wrapper({ children }) {
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
        {children}
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const COUNTRY_CODES = [
  { code: '91',  flag: '🇮🇳', label: 'IN' },
  { code: '971', flag: '🇦🇪', label: 'AE' },
  { code: '966', flag: '🇸🇦', label: 'SA' },
  { code: '44',  flag: '🇬🇧', label: 'UK' },
  { code: '1',   flag: '🇺🇸', label: 'US' },
  { code: '61',  flag: '🇦🇺', label: 'AU' },
  { code: '49',  flag: '🇩🇪', label: 'DE' },
]

function PhoneInput({ value, onChange, countryCode, onCountryChange, required }) {
  return (
    <Field label="Mobile Number" required={required}>
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(e) => onCountryChange(e.target.value)}
          className="shrink-0 border border-slate-300 rounded-xl px-2 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} +{c.code}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 13))}
          placeholder="3001234567"
          className={inputCls}
          required={required}
        />
      </div>
    </Field>
  )
}

function Btn({ children, loading, disabled }) {
  return (
    <button type="submit" disabled={loading || disabled}
      className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition shadow">
      {loading ? 'Please wait...' : children}
    </button>
  )
}

function ErrorBox({ children }) {
  return <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{children}</p>
}
