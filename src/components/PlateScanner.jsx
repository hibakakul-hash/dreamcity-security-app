import { useState, useRef, useCallback } from 'react'
import { Camera, X, Search, Loader } from 'lucide-react'
import Tesseract from 'tesseract.js'

export default function PlateScanner({ onResult }) {
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [stream, setStream] = useState(null)
  const [captured, setCaptured] = useState(null)
  const [progress, setProgress] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const startCamera = async () => {
    setOpen(true)
    setCaptured(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      setStream(s)
      if (videoRef.current) videoRef.current.srcObject = s
    } catch {
      setProgress('Camera not available. Type the plate manually.')
    }
  }

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
    setOpen(false)
    setScanning(false)
    setCaptured(null)
    setProgress('')
  }, [stream])

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')
    setCaptured(dataUrl)
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
    runOCR(dataUrl)
  }

  const runOCR = async (imageData) => {
    setScanning(true)
    setProgress('Analysing plate...')
    try {
      const result = await Tesseract.recognize(imageData, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(`Scanning... ${Math.round(m.progress * 100)}%`)
          }
        },
      })
      const raw = result.data.text
      // Extract plate-like pattern (letters + numbers, dashes)
      const matches = raw.match(/[A-Z]{2,4}[-\s]?\d{3,5}/gi)
      const plate = matches ? matches[0].replace(/\s/g, '-').toUpperCase() : raw.trim().toUpperCase()
      setProgress(`Found: ${plate}`)
      onResult(plate)
      setTimeout(stopCamera, 800)
    } catch {
      setProgress('Could not read plate. Try again or type manually.')
    } finally {
      setScanning(false)
    }
  }

  const retake = () => {
    setCaptured(null)
    setProgress('')
    startCamera()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={startCamera}
        className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50 rounded-xl text-sm font-medium transition w-full justify-center"
      >
        <Camera size={18} />
        Scan Number Plate
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-blue-900 text-white">
          <span className="font-semibold flex items-center gap-2">
            <Camera size={18} /> Scan Number Plate
          </span>
          <button onClick={stopCamera}><X size={20} /></button>
        </div>

        <div className="relative bg-black">
          {!captured ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-56 object-cover"
            />
          ) : (
            <img src={captured} alt="captured" className="w-full h-56 object-cover" />
          )}

          {/* Plate guide overlay */}
          {!captured && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-yellow-400 rounded-lg w-3/4 h-16 opacity-80" />
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="p-4 space-y-3">
          {progress && (
            <p className={`text-sm text-center font-medium ${
              progress.startsWith('Found') ? 'text-green-600' : 'text-slate-600'
            }`}>
              {scanning && <Loader size={14} className="inline mr-1 animate-spin" />}
              {progress}
            </p>
          )}

          {!captured && stream && (
            <button
              onClick={capture}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Camera size={18} /> Capture Plate
            </button>
          )}

          {captured && !scanning && !progress.startsWith('Found') && (
            <button
              onClick={retake}
              className="w-full border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium py-2.5 rounded-xl transition"
            >
              Retake
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
