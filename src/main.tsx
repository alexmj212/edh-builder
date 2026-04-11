import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { requestPersistentStorage } from './lib/storage'

// Initialize theme from localStorage (default is dark — set on <html> in index.html)
const savedTheme = localStorage.getItem('edh-theme')
if (savedTheme === 'light') {
  document.documentElement.classList.remove('dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

requestPersistentStorage()
