import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import AuthGate from './auth/AuthGate'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthGate>
    </AuthProvider>
  </React.StrictMode>,
)
