import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@ibm/plex-sans/css/ibm-plex-sans-default.css'
import '@ibm/plex-mono/css/ibm-plex-mono-default.css'
import './index.scss'
import { CoreUI } from '@workspacenow/core-ui'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CoreUI />
  </StrictMode>,
)
