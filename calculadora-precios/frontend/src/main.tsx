import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ProveedorAuth } from './contextos/ContextoAuth'

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error captured:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

const contenedor = document.getElementById('root')
if (!contenedor) {
  throw new Error('Root container not found')
}

const raiz = createRoot(contenedor)

raiz.render(
  <React.StrictMode>
    <BrowserRouter>
      <ProveedorAuth>
        <App />
      </ProveedorAuth>
    </BrowserRouter>
  </React.StrictMode>
)