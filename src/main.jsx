import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register push notification service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-push.js').catch(console.error)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
