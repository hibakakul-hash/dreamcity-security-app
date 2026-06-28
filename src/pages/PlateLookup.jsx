import { useState } from 'react'
import { Search, Car, Home, Phone, CheckCircle, XCircle } from 'lucide-react'
import PlateScanner from '../components/PlateScanner'
import { fetchVehicleByPlate } from '../lib/db'
import { mockVehicles } from '../lib/mockData'

const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL

export default function PlateLookup() {
  const [plate, setPlate] = useState('')
  const [result, setResult] = useState(null) // vehicle record or null
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)

  const lookup = async (searchPlate) => {
    const clean = (searchPlate || plate).replace(/\s/g, '').toUpperCase()
    if (!clean) return
    setLoading(true)
    setResult(null)
    setNotFound(false)
    try {
      if (DEMO_MODE) {
        const found = mockVehicles.find(
          (v) => v.plate_number.replace(/[-\s]/g, '').toUpperCase() === clean.replace(/-/g, '')
        )
        setResult(found || null)
        setNotFound(!found)
      } else {
        const found = await fetchVehicleByPlate(clean)
        setResult(found || null)
        setNotFound(!found)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const onScanResult = (scannedPlate) => {
    setPlate(scannedPlate)
    lookup(scannedPlate)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Plate Lookup</h2>
        <p className="text-slate-500 text-sm">Scan or enter a number plate to identify the resident</p>
      </div>

      {/* Scanner */}
      <PlateScanner onResult={onScanResult} />

      {/* Manual input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Car size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && lookup()}
            placeholder="e.g. LEA-1234"
            className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono tracking-wide"
          />
        </div>
        <button
          onClick={() => lookup()}
          disabled={loading || !plate}
          className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 text-sm font-medium"
        >
          <Search size={16} />
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl shadow-sm border-l-4 border-green-500 p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            <CheckCircle size={20} />
            Registered Resident Vehicle
          </div>

          <div className="bg-slate-50 rounded-xl px-4 py-3 text-center">
            <span className="text-2xl font-bold font-mono tracking-widest text-slate-800">
              {result.plate_number}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-0.5">Vehicle</p>
              <p className="font-semibold text-slate-800">
                {result.color} {result.make} {result.model}
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-0.5">
                <Home size={12} /> Unit
              </div>
              <p className="font-semibold text-slate-800">{result.unit}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-sm">
            <p className="text-xs text-slate-500 mb-0.5">Resident</p>
            <p className="font-semibold text-slate-800">{result.resident_name}</p>
            {result.residents?.phone && (
              <div className="flex items-center gap-1 text-slate-500 mt-1">
                <Phone size={13} /> {result.residents.phone}
              </div>
            )}
          </div>
        </div>
      )}

      {notFound && (
        <div className="bg-white rounded-2xl shadow-sm border-l-4 border-red-400 p-5">
          <div className="flex items-center gap-2 text-red-500 font-semibold mb-1">
            <XCircle size={20} />
            Not Registered
          </div>
          <p className="text-sm text-slate-500">
            No resident vehicle found for plate <span className="font-mono font-semibold">{plate}</span>.
            This may be a visitor or an unregistered vehicle.
          </p>
        </div>
      )}
    </div>
  )
}
