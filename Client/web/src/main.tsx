import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AgencyBrandingProvider } from './branding/AgencyBranding.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AgencyBrandingProvider>
      <App />
    </AgencyBrandingProvider>
  </StrictMode>,
)
