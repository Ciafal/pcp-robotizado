/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
import { triggerChunkReloadOnce } from './lib/lazyWithRetry'

// Captura evento nativo do Vite quando um chunk falha ao ser pré-carregado / importado dinamicamente
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[PCP Robotizado] vite:preloadError detectado, acionando reload defensivo:', event)
    triggerChunkReloadOnce()
  })
}

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
