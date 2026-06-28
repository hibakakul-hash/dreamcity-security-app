import { useState, useEffect } from 'react'
import { Shield, ArrowLeft, Mail } from 'lucide-react'
import {
  signInWithPhone,
  signUpWithPhone,
  signInWithRecoveryEmail,
  sendPasswordResetByPhone,
  sendPasswordResetByEmail,
} from '../lib/auth'
import { supabase } from '../lib/supabase'

const MODES = { login: 'login', signup: 'signup', forgot: 'forgot', recovery: 'recovery', emailLogin: 'emailLogin' }

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState(MODES.login)
  const [form, setForm] = useState({
    phone: '', password: '', confirmPassword: '',
    name: '', unit: '', role: 'resident',
    recoveryEmail: '', forgotPhone: '', forgotEmail: '',
    countryCode: '91', forgotCountryCode: '91',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [residents, setResidents] = useState([])
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    supabase.from('residents').select('unit, name').order('unit').then(({ data }) => {
      if (data) setResidents(data)
    })
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const reset = (m) => { setMode(m); setError(''); setSuccess('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const fullPhone = form.countryCode + form.phone.replace(/^0+/, '')
      const fullForgotPhone = form.forgotCountryCode + form.forgotPhone.replace(/^0+/, '')

      if (mode === MODES.login) {
        const user = await signInWithPhone(fullPhone, form.password)
        onLogin(user)

      } else if (mode === MODES.signup) {
        if (form.password !== form.confirmPassword) throw new Error('Passwords do not match')
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters')
        if ((form.role === 'resident' || form.role === 'household_admin') && !form.unit)
          throw new Error('Please select a unit')
        await signUpWithPhone({
          phone: fullPhone,
          password: form.password,
          name: form.name,
          role: form.role,
          unit: (form.role === 'resident' || form.role === 'household_admin') ? form.unit : null,
          recoveryEmail: form.recoveryEmail || null,
        })
        setSubmitted(true)
        return

      } else if (mode === MODES.forgot) {
        await sendPasswordResetByPhone(fullForgotPhone)
        setSuccess('Reset link sent! Check your recovery email.')

      } else if (mode === MODES.recovery) {
        await sendPasswordResetByEmail(form.forgotEmail)
        setSuccess('Reset link sent to your recovery email.')

      } else if (mode === MODES.emailLogin) {
        const user = await signInWithRecoveryEmail(form.forgotEmail, form.password)
        onLogin(user)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot / Recovery / Email Login screens ───────────────────────────────
  if (mode === MODES.forgot || mode === MODES.recovery || mode === MODES.emailLogin) {
    const isEmailLogin = mode === MODES.emailLogin

    return (
      <Wrapper>
        <button onClick={() => reset(MODES.login)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 mb-4 transition">
          <ArrowLeft size={15} /> Back to Sign In
        </button>

        <h2 className="font-semibold text-slate-700 mb-1">
          {mode === MODES.forgot ? 'Reset via Phone Number'
            : mode === MODES.emailLogin ? 'Sign in with Recovery Email'
            : 'Reset via Recovery Email'}
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          {mode === MODES.forgot
            ? 'Enter your registered phone number. A reset link will go to your recovery email.'
            : mode === MODES.emailLogin
            ? 'Use your recovery email and password to sign in if you no longer have access to your phone number.'
            : 'Enter the recovery email you set up when registering.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === MODES.forgot ? (
            <PhoneInput
              value={form.forgotPhone}
              onChange={(v) => set('forgotPhone', v)}
              countryCode={form.forgotCountryCode}
              onCountryChange={(v) => set('forgotCountryCode', v)}
            />
          ) : (
            <EmailInput
              label="Recovery Email"
              value={form.forgotEmail}
              onChange={(v) => set('forgotEmail', v)}
              placeholder="your.backup@email.com"
            />
          )}

          {isEmailLogin && (
            <Field label="Password" required>
              <input type="password" value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="••••••••" className={inputCls} required minLength={6} />
            </Field>
          )}

          {error && <ErrorBox>{error}</ErrorBox>}
          {success && <SuccessBox>{success}</SuccessBox>}

          <Btn loading={loading} disabled={!!success}>
            {mode === MODES.forgot ? 'Send Reset Link'
              : mode === MODES.emailLogin ? 'Sign In'
              : 'Send via Recovery Email'}
          </Btn>

          {mode === MODES.forgot && (
            <>
              <button type="button" onClick={() => reset(MODES.emailLogin)}
                className="w-full text-sm text-slate-500 hover:text-blue-600 transition text-center">
                Have your recovery email? Sign in directly →
              </button>
              <button type="button" onClick={() => reset(MODES.recovery)}
                className="w-full text-sm text-slate-400 hover:text-slate-600 transition text-center">
                Forgot password? Reset via recovery email
              </button>
            </>
          )}
        </form>
      </Wrapper>
    )
  }

  // ── Submitted / Pending screen ─────────────────────────────────────────────
  if (submitted) {
    return (
      <Wrapper>
        <div className="text-center space-y-4">
          <div className="text-5xl">⏳</div>
          <h2 className="font-bold text-slate-800 text-lg">Account Submitted</h2>
          <p className="text-slate-500 text-sm">
            Your account is awaiting approval from the society admin and your household admin.
            You'll be able to sign in once it's approved.
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
          <>
            <Field label="Confirm Password" required>
              <input type="password" value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                placeholder="••••••••" className={inputCls} required minLength={6} />
            </Field>

            <EmailInput
              label={<>Recovery Email <span className="text-slate-400 font-normal">(optional but recommended)</span></>}
              value={form.recoveryEmail}
              onChange={(v) => set('recoveryEmail', v)}
              placeholder="backup@email.com"
              required={false}
            />
            <p className="text-xs text-slate-400 -mt-2">
              Used to recover your account if you lose your phone number.
            </p>
          </>
        )}

        {error && <ErrorBox>{error}</ErrorBox>}

        <Btn loading={loading}>
          {mode === MODES.login ? 'Sign In' : 'Create Account'}
        </Btn>

        {mode === MODES.login && (
          <>
            <button type="button" onClick={() => reset(MODES.forgot)}
              className="w-full text-sm text-blue-600 hover:text-blue-800 transition text-center">
              Forgot password?
            </button>
            <button type="button" onClick={() => reset(MODES.emailLogin)}
              className="w-full text-sm text-slate-400 hover:text-slate-600 transition text-center">
              Lost your phone number? Sign in with recovery email
            </button>
          </>
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

function EmailInput({ label, value, onChange, placeholder, required }) {
  return (
    <Field label={label} required={required}>
      <div className="relative">
        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputCls} pl-9`}
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

function SuccessBox({ children }) {
  return <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{children}</p>
}
