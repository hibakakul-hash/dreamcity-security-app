import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ResetPassword from './pages/ResetPassword'
import SecurityGate from './pages/SecurityGate'
import VisitorLog from './pages/VisitorLog'
import ResidentPortal from './pages/ResidentPortal'
import AdminPanel from './pages/AdminPanel'
import AdminDashboard from './pages/AdminDashboard'
import AddVisitor from './pages/AddVisitor'
import PlateLookup from './pages/PlateLookup'
import MyVehicles from './pages/MyVehicles'
import ProfileSettings from './pages/ProfileSettings'
import HouseholdAdminPanel from './pages/HouseholdAdminPanel'
import { supabase } from './lib/supabase'
import { getProfile, signOut, updatePassword } from './lib/auth'

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const isResetFlow = window.location.pathname === '/reset-password'

  const loadProfile = async (authUser) => {
    try {
      const p = await getProfile(authUser.id)
      if (p && p.is_pending) {
        await signOut()
        setUser(null)
        setProfile({ _pending: true, _pendingRole: p.role })
        return
      }
      if (p && p.is_active === false) {
        await signOut()
        setUser(null)
        setProfile({ _suspended: true })
        return
      }
      setProfile(p)
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user)
        loadProfile(data.session.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (authUser) => {
    setUser(authUser)
    await loadProfile(authUser)
  }

  const handleLogout = async () => {
    await signOut()
    setUser(null)
    setProfile(null)
  }

  if (isResetFlow) return <ResetPassword />

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center">
        <div className="text-white text-lg font-medium">Loading...</div>
      </div>
    )
  }

  if (!user || !profile) {
    return <LoginPage onLogin={handleLogin} />
  }

  if (profile._pending) {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-3">
          <div className="text-4xl">⏳</div>
          <h2 className="font-bold text-slate-800 text-lg">Awaiting Approval</h2>
          <p className="text-slate-500 text-sm">{pendingMsg} Please check back later.</p>
          <button onClick={handleLogout} className="text-sm text-blue-600 hover:underline">Sign out</button>
        </div>
      </div>
    )
  }

  if (profile.must_change_password) {
    return <ForcePasswordChange profile={profile} onDone={() => setProfile(p => ({ ...p, must_change_password: false }))} onLogout={handleLogout} />
  }

  if (profile._suspended) {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-3">
          <div className="text-4xl">🚫</div>
          <h2 className="font-bold text-slate-800 text-lg">Account Suspended</h2>
          <p className="text-slate-500 text-sm">Your account has been suspended by the admin. Please contact the society management.</p>
          <button onClick={handleLogout} className="text-sm text-blue-600 hover:underline">Sign out</button>
        </div>
      </div>
    )
  }

  // Pending message tailored by role
  const pendingMsg = profile._pendingRole === 'resident'
    ? 'Your account is awaiting approval from your Household Admin.'
    : 'Your account is awaiting approval from the Society Admin.'

  return (
    <BrowserRouter>
      <Layout user={profile} onLogout={handleLogout}>
        <Routes>
          {profile.role === 'security' || profile.role === 'admin' || profile.role === 'household_admin' ? (
            <>
              <Route path="/" element={<SecurityGate user={profile} />} />
              {(profile.role === 'security' || profile.role === 'admin') && <Route path="/add-visitor" element={<AddVisitor user={profile} />} />}
              {(profile.role === 'security' || profile.role === 'admin') && <Route path="/plate" element={<PlateLookup />} />}
              <Route path="/log" element={<VisitorLog />} />
              <Route path="/profile" element={<ProfileSettings user={profile} onProfileUpdate={setProfile} />} />
              {profile.role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
              {profile.role === 'admin' && <Route path="/admin/residents" element={<AdminPanel />} />}
              {profile.role === 'household_admin' && <Route path="/unit" element={<HouseholdAdminPanel user={profile} />} />}
            </>
          ) : (
            <>
              <Route path="/" element={<ResidentPortal user={profile} />} />
              <Route path="/vehicles" element={<MyVehicles user={profile} />} />
              <Route path="/log" element={<VisitorLog user={profile} />} />
              <Route path="/profile" element={<ProfileSettings user={profile} onProfileUpdate={setProfile} />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

function ForcePasswordChange({ profile, onDone, onLogout }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (pw !== confirm) return setError('Passwords do not match')
    if (pw.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    try {
      await updatePassword(pw)
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', profile.id)
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full space-y-5">
        <div className="text-center space-y-2">
          <div className="text-4xl">🔐</div>
          <h2 className="font-bold text-slate-800 text-lg">Set a New Password</h2>
          <p className="text-slate-500 text-sm">
            Your Household Admin has reset your password. Please set a new one to continue.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)}
              placeholder="••••••••" className={inputCls} required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••" className={inputCls} required minLength={6} />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition">
            {loading ? 'Saving...' : 'Set New Password'}
          </button>
        </form>
        <button onClick={onLogout} className="w-full text-sm text-slate-400 hover:text-slate-600 text-center">
          Sign out instead
        </button>
      </div>
    </div>
  )
}
