import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import SecurityGate from './pages/SecurityGate'
import VisitorLog from './pages/VisitorLog'
import ResidentPortal from './pages/ResidentPortal'
import AdminPanel from './pages/AdminPanel'
import AddVisitor from './pages/AddVisitor'
export default function App() {
  const [user, setUser] = useState(null)

  if (!user) {
    return <LoginPage onLogin={setUser} />
  }

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={() => setUser(null)}>
        <Routes>
          {user.role === 'security' || user.role === 'admin' ? (
            <>
              <Route path="/" element={<SecurityGate user={user} />} />
              <Route path="/add-visitor" element={<AddVisitor user={user} />} />
              <Route path="/log" element={<VisitorLog />} />
              {user.role === 'admin' && <Route path="/admin" element={<AdminPanel />} />}
            </>
          ) : (
            <>
              <Route path="/" element={<ResidentPortal user={user} />} />
              <Route path="/log" element={<VisitorLog user={user} />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
