import { ComponentType, lazy, LazyExoticComponent } from 'react'

const RELOAD_FLAG_KEY = 'pcp_chunk_reload_attempted'

/**
 * Verifica se um erro parece ser falha de carregamento de chunk/módulo dinâmico
 * (por exemplo, após novo deploy com hash alterado).
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()
  return (
    lower.includes('error loading dynamically imported module') ||
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('loading chunk') ||
    lower.includes('failed to load module script') ||
    lower.includes('dynamically imported module')
  )
}

/**
 * Tenta recarregar a janela uma única vez por sessão caso o erro seja de chunk desatualizado.
 * Retorna true se um reload foi disparado, false se já havia sido tentado.
 */
export function triggerChunkReloadOnce(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const hasReloaded = sessionStorage.getItem(RELOAD_FLAG_KEY)
    if (!hasReloaded) {
      sessionStorage.setItem(RELOAD_FLAG_KEY, 'true')
      window.location.reload()
      return true
    }
  } catch {
    // sessionStorage indisponível ou bloqueado
  }
  return false
}

/**
 * Reseta a flag de reload (útil quando um módulo é montado com sucesso)
 */
export function clearChunkReloadFlag(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(RELOAD_FLAG_KEY)
  } catch {
    // ignorar
  }
}

/**
 * Wrapper de lazy() com retry e reload automático uma única vez quando o chunk falhar.
 * Evita telas brancas ou crashes após deploys com substituição de assets.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>,
  moduleName = 'Módulo',
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const m = await factory()
      // Se carregou com sucesso, limpa a flag de reload para que futuros deploys possam usá-la novamente
      clearChunkReloadFlag()
      // Resolução segura: se m já tiver default component válido usa-o, senão procura named export
      if (m && typeof m === 'object') {
        if (m.default !== undefined) {
          return m
        }
        // Se default for undefined mas existir named export igual ao moduleName ou outro componente
        const candidate =
          (moduleName && m[moduleName]) ||
          m.Component ||
          m.Index ||
          m[Object.keys(m).find((k) => typeof m[k] === 'function') || '']
        if (candidate) {
          return { default: candidate }
        }
      }
      return m
    } catch (error) {
      console.warn(`[PCP Robotizado] Falha ao carregar chunk dinâmico de "${moduleName}":`, error)

      if (isChunkLoadError(error)) {
        const reloaded = triggerChunkReloadOnce()
        if (reloaded) {
          // Retorna uma Promise pendente para aguardar o reload do navegador sem renderizar o erro
          return new Promise<{ default: T }>(() => {})
        }
      }

      // Se já tentou o reload uma vez e ainda falhou, ou se for outro erro, repassa ao ErrorBoundary
      throw error
    }
  })
}
