import { Link, useLocation } from 'react-router-dom'
import { Shield, List, Users, Settings, LogOut, PlusCircle, Car, ScanLine, UserCircle } from 'lucide-react'

export default function Layout({ user, onLogout, children }) {
  const loc = useLocation()

  const navSecurity = [
    { to: '/', icon: Shield, label: 'Gate' },
    { to: '/add-visitor', icon: PlusCircle, label: 'Add' },
    { to: '/plate', icon: ScanLine, label: 'Plate' },
    { to: '/log', icon: List, label: 'Log' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ]
  const navAdmin = [
    { to: '/', icon: Shield, label: 'Gate' },
    { to: '/add-visitor', icon: PlusCircle, label: 'Add' },
    { to: '/plate', icon: ScanLine, label: 'Plate' },
    { to: '/log', icon: List, label: 'Log' },
    { to: '/admin', icon: Settings, label: 'Admin' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ]
  const navResident = [
    { to: '/', icon: Users, label: 'Approvals' },
    { to: '/vehicles', icon: Car, label: 'Vehicles' },
    { to: '/log', icon: List, label: 'Log' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ]

  const nav =
    user.role === 'admin' ? navAdmin :
    user.role === 'security' ? navSecurity :
    navResident

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Shield size={22} className="text-blue-300" />
          <span className="font-bold text-lg tracking-tight">Dreamcity Security</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-blue-200 text-sm hidden sm:block">
            {user.name} · <span className="capitalize">{user.role}</span>
            {user.unit ? ` · ${user.unit}` : ''}
          </span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-blue-200 hover:text-white text-sm transition"
          >
            <LogOut size={16} />
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-3xl w-full mx-auto pb-24">
        {children}
      </main>

      <nav className="bg-white border-t border-slate-200 flex justify-around py-2 fixed bottom-0 left-0 right-0 shadow-lg">
        {nav.map(({ to, icon: Icon, label }) => {
          const active = loc.pathname === to
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition text-xs font-medium ${
                active ? 'text-blue-700' : 'text-slate-500 hover:text-blue-600'
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
