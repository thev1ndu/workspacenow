import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './index.css'
import { CoreUI } from '@workspacenow/core-ui'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CoreUI />
  </StrictMode>,
)
