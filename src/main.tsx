import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WyndbaseProvider } from '@wyndbase/sdk/react'
import { wyndbase } from './wyndbase'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WyndbaseProvider sdk={wyndbase}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </WyndbaseProvider>
  </StrictMode>,
)
