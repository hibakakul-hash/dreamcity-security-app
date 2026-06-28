import { useState, useEffect } from 'react'
import { User, Phone, Mail, Lock, Users, CheckCircle, ChevronRight, X } from 'lucide-react'
import { updatePhone, updatePassword, updateProfile, fetchUnitMembers } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function ProfileSettings({ user, onProfileUpdate }) {
  const [section, setSection] = useState(null) // 'name' | 'phone' | 'email' | 'password'
  const [unitMembers, setUnitMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: user.name || '',
    recoveryEmail: user.recovery_email || '',
    newPhone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (user.unit) {
      fetchUnitMembers(user.unit).then(setUnitMembers).catch(console.error)
    }
  }, [user.unit])

  const openSection = (s) => {
    setSection(s)
    setError('')
    setSuccess('')
  }

  const handleSaveName = async () => {
    setSaving(true)
    setError('')
    try {
      await updateProfile(user.id, { name: form.name })
      onProfileUpdate({ ...user, name: form.name })
      setSuccess('Name updated successfully')
      setSection(null)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleSaveEmail = async () => {
    setSaving(true)
    setError('')
    try {
      await updateProfile(user.id, { recovery_email: form.recoveryEmail })
      onProfileUpdate({ ...user, recovery_email: form.recoveryEmail })
      setSuccess('Recovery email updated')
      setSection(null)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleSavePhone = async () => {
    if (!form.newPhone || !form.currentPassword) {
      setError('Enter new phone number and current password')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updatePhone(user.id, form.newPhone, form.currentPassword)
      onProfileUpdate({ ...user, phone: form.newPhone.replace(/\D/g, '') })
      setSuccess('Phone number updated. You may need to sign in again.')
      setForm((f) => ({ ...f, newPhone: '', currentPassword: '' }))
      setSection(null)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleSavePassword = async () => {
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setSaving(true)
    setError('')
    try {
      // Verify current password first
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: authUser.email,
        password: form.currentPassword,
      })
      if (authErr) throw new Error('Current password is incorrect')
      await updatePassword(form.newPassword)
      setSuccess('Password updated successfully')
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }))
      setSection(null)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handlers = {
    name: handleSaveName,
    email: handleSaveEmail,
    phone: handleSavePhone,
    password: handleSavePassword,
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Profile Settings</h2>
        <p className="text-slate-500 text-sm capitalize">{user.role}{user.unit ? ` · Unit ${user.unit}` : ''}</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Profile rows */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
        <SettingRow icon={User} label="Full Name" value={user.name} onClick={() => openSection('name')} />
        <SettingRow icon={Phone} label="Mobile Number"
          value={user.phone ? `0${user.phone.slice(2)}` : 'Not set'}
          onClick={() => openSection('phone')} />
        <SettingRow icon={Mail} label="Recovery Email"
          value={user.recovery_email || 'Not set'}
          onClick={() => openSection('email')} />
        <SettingRow icon={Lock} label="Password" value="••••••••" onClick={() => openSection('password')} />
      </div>

      {/* Expandable edit forms */}
      {section && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 border border-blue-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">
              {section === 'name' && 'Change Name'}
              {section === 'phone' && 'Change Phone Number'}
              {section === 'email' && 'Change Recovery Email'}
              {section === 'password' && 'Change Password'}
            </h3>
            <button onClick={() => setSection(null)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          {section === 'name' && (
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="Full name" className={inputCls} />
          )}

          {section === 'email' && (
            <input type="email" value={form.recoveryEmail}
              onChange={(e) => set('recoveryEmail', e.target.value)}
              placeholder="backup@email.com" className={inputCls} />
          )}

          {section === 'phone' && (
            <>
              <div>
                <label className={labelCls}>New Phone Number</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-slate-100 border border-slate-300 rounded-xl text-sm text-slate-600 shrink-0">
                    +92
                  </span>
                  <input type="tel" value={form.newPhone}
                    onChange={(e) => set('newPhone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="03001234567" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Current Password (to confirm)</label>
                <input type="password" value={form.currentPassword}
                  onChange={(e) => set('currentPassword', e.target.value)}
                  placeholder="••••••••" className={inputCls} />
              </div>
            </>
          )}

          {section === 'password' && (
            <>
              <div>
                <label className={labelCls}>Current Password</label>
                <input type="password" value={form.currentPassword}
                  onChange={(e) => set('currentPassword', e.target.value)}
                  placeholder="••••••••" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>New Password</label>
                <input type="password" value={form.newPassword}
                  onChange={(e) => set('newPassword', e.target.value)}
                  placeholder="••••••••" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Confirm New Password</label>
                <input type="password" value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  placeholder="••••••••" className={inputCls} />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handlers[section]} disabled={saving}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setSection(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Household members */}
      {user.unit && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Users size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-600">
              Unit {user.unit} — {unitMembers.length} account{unitMembers.length !== 1 ? 's' : ''}
            </h3>
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
            {unitMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  m.id === user.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {m.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">
                    {m.name} {m.id === user.id && <span className="text-xs text-blue-500">(you)</span>}
                  </div>
                  <div className="text-xs text-slate-400">
                    {m.phone ? `0${m.phone.slice(2)}` : 'No phone'}
                  </div>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 text-xs text-slate-400">
              Each household member can register with their own phone number using unit <strong>{user.unit}</strong>.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

function SettingRow({ icon: Icon, label, value, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition text-left">
      <div className="bg-blue-50 rounded-lg p-2 shrink-0">
        <Icon size={16} className="text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-sm font-medium text-slate-800 truncate">{value}</div>
      </div>
      <ChevronRight size={16} className="text-slate-300 shrink-0" />
    </button>
  )
}
