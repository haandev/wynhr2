import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WyndbaseProvider } from '@wyndbase/sdk/react'
import { WyndbaseDevtools } from '@wyndbase/sdk/devtools'
import { wyndbase } from './wyndbase'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WyndbaseProvider sdk={wyndbase}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      {/* Queries, Realtime and Session tabs over this client (experiment build: mounted everywhere). */}
      <WyndbaseDevtools client={wyndbase.queryClient} sdk={wyndbase} />
    </WyndbaseProvider>
  </StrictMode>,
)
