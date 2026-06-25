import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { StoreContext, rootStore } from './hooks/useStore'
import ErrorBoundary from './components/shared/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreContext.Provider value={rootStore}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <Toaster position="top-right" richColors />
    </StoreContext.Provider>
  </StrictMode>,
)
