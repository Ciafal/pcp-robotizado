import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isChunkLoadError, triggerChunkReloadOnce, clearChunkReloadFlag } from '@/lib/lazyWithRetry'

describe('lazyWithRetry & Resiliência a Chunks Desatualizados', () => {
  const originalLocation = window.location

  beforeEach(() => {
    sessionStorage.clear()
    // Mock do reload
    delete (window as any).location
    ;(window as any).location = {
      ...originalLocation,
      reload: vi.fn(),
    }
  })

  afterEach(() => {
    ;(window as any).location = originalLocation
  })

  it('detecta corretamente mensagens típicas de falha de carregamento de chunk dinâmico', () => {
    expect(
      isChunkLoadError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://domain/assets/EcosystemArchitecturePage-DrQM2JGV.js',
        ),
      ),
    ).toBe(true)

    expect(
      isChunkLoadError(
        new TypeError(
          'error loading dynamically imported module: https://domain/assets/EcosystemArchitecturePage-DrQM2JGV.js',
        ),
      ),
    ).toBe(true)

    expect(isChunkLoadError(new Error('Loading chunk 404 failed'))).toBe(true)

    expect(
      isChunkLoadError(
        new Error(
          'Failed to load module script: Expected a JavaScript module script but the server responded with a 404',
        ),
      ),
    ).toBe(true)

    expect(isChunkLoadError(new Error('SyntaxError: Unexpected identifier'))).toBe(false)

    expect(isChunkLoadError(null)).toBe(false)
  })

  it('aciona window.location.reload() exatamente uma vez via flag em sessionStorage', () => {
    // 1ª vez: deve acionar reload e salvar flag
    const firstAttempt = triggerChunkReloadOnce()
    expect(firstAttempt).toBe(true)
    expect(window.location.reload).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('pcp_chunk_reload_attempted')).toBe('true')

    // 2ª vez: não deve acionar reload novamente para evitar loop infinito
    const secondAttempt = triggerChunkReloadOnce()
    expect(secondAttempt).toBe(false)
    expect(window.location.reload).toHaveBeenCalledTimes(1)
  })

  it('clearChunkReloadFlag remove a flag permitindo nova recuperação em deploys subsequentes', () => {
    triggerChunkReloadOnce()
    expect(sessionStorage.getItem('pcp_chunk_reload_attempted')).toBe('true')

    clearChunkReloadFlag()
    expect(sessionStorage.getItem('pcp_chunk_reload_attempted')).toBeNull()

    const retryAfterClear = triggerChunkReloadOnce()
    expect(retryAfterClear).toBe(true)
    expect(window.location.reload).toHaveBeenCalledTimes(2)
  })
})
