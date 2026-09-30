/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
import { triggerChunkReloadOnce } from './lib/lazyWithRetry'

// Captura eventos quando um chunk falha ao ser pré-carregado / importado dinamicamente
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[PCP Robotizado] vite:preloadError detectado, acionando reload defensivo:', event)
    triggerChunkReloadOnce()
  })

  // Blindagem global contra rejeição não tratada de import dinâmico de chunk antigo em cache
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason
    const message = (
      reason instanceof Error
        ? `${reason.name}: ${reason.message} ${reason.stack || ''}`
        : String(reason || '')
    ).toLowerCase()

    if (
      message.includes('dynamically imported module') ||
      message.includes('failed to fetch dynamically imported module') ||
      message.includes('error loading dynamically imported module') ||
      message.includes('loading chunk') ||
      message.includes('failed to load module script') ||
      message.includes('expected a javascript module script')
    ) {
      console.warn(
        '[PCP Robotizado] unhandledrejection de chunk load detectado, acionando reload defensivo:',
        reason,
      )
      event.preventDefault()
      triggerChunkReloadOnce()
    }
  })
}

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
