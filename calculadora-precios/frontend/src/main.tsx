import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error captured:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container not found')
}

const root = createRoot(container)

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)