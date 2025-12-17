import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Initialize mode registry before app starts
import './game/modes'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
