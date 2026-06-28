import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { subscribeToPush, unsubscribeFromPush, getPermissionState, isPushSupported } from '../lib/push'

export default function PushToggle({ unit }) {
  const [state, setState] = useState('loading') // 'loading'|'unsupported'|'denied'|'granted'|'default'

  useEffect(() => {
    getPermissionState().then(setState)
  }, [])

  const enable = async () => {
    const permission = await Notification.requestPermission()
    setState(permission)
    if (permission === 'granted') await subscribeToPush(unit)
  }

  const disable = async () => {
    await unsubscribeFromPush()
    setState('default')
  }

  if (state === 'loading' || !isPushSupported()) return null

  if (state === 'granted') {
    return (
      <button
        onClick={disable}
        className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl w-full"
      >
        <Bell size={16} className="shrink-0" />
        <span className="flex-1 text-left">Push notifications <strong>ON</strong></span>
        <span className="text-xs text-green-600">Tap to disable</span>
      </button>
    )
  }

  if (state === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
        <BellOff size={16} className="shrink-0" />
        Notifications blocked. Enable in browser settings.
      </div>
    )
  }

  return (
    <button
      onClick={enable}
      className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl w-full hover:bg-blue-100 transition"
    >
      <Bell size={16} className="shrink-0" />
      <span className="flex-1 text-left">Enable push notifications</span>
      <span className="text-xs text-blue-500">Get gate alerts</span>
    </button>
  )
}
