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
import { supabase } from './lib/supabase'
import { getProfile, signOut } from './lib/auth'

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const isResetFlow = window.location.pathname === '/reset-password'

  const loadProfile = async (authUser) => {
    try {
      const p = await getProfile(authUser.id)
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

  return (
    <BrowserRouter>
      <Layout user={profile} onLogout={handleLogout}>
        <Routes>
          {profile.role === 'security' || profile.role === 'admin' ? (
            <>
              <Route path="/" element={<SecurityGate user={profile} />} />
              <Route path="/add-visitor" element={<AddVisitor user={profile} />} />
              <Route path="/plate" element={<PlateLookup />} />
              <Route path="/log" element={<VisitorLog />} />
              <Route path="/profile" element={<ProfileSettings user={profile} onProfileUpdate={setProfile} />} />
              {profile.role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
              {profile.role === 'admin' && <Route path="/admin/residents" element={<AdminPanel />} />}
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
