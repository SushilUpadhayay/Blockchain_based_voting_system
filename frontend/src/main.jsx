import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { VotingProvider } from './context/VotingContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <VotingProvider>
      <App />
    </VotingProvider>
  </StrictMode>
)