import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

import { authService } from './services/authService'

// Closed the tab for over 5 minutes? Ask for the PIN again; an open tab just keeps going.
authService.expireStaleSession()
authService.startSessionHeartbeat()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
