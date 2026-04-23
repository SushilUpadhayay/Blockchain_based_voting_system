import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { VotingProvider } from './context/VotingContext'
import { AuthProvider } from './context/AuthContext'

import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <VotingProvider>
          <App />
        </VotingProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
)