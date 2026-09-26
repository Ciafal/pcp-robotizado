import React, { ComponentType, lazy, LazyExoticComponent } from 'react'

/**
 * Utilitário central de Lazy Loading Resiliente para o PCP Robotizado.
 *
 * Resolve o problema crítico em SPAs onde um deploy substitui os chunks com novos hashes,
 * fazendo com que sessões de usuários com o index antigo no cache falhem no import dinâmico
 * com erros como "Failed to fetch dynamically imported module" ou 404 de chunk JS.
 *
 * Estratégia de blindagem:
 * 1. Retry com backoff exponencial (3 tentativas automáticas transparentes).
 * 2. Se falhar por erro de chunk e for a 1ª ocorrência da sessão, aciona um reload transparente
 *    único via sessionStorage ('pcp_chunk_reload_attempted').
 * 3. Se persistir, renderiza um estado de erro visual com botão para que o usuário faça o recarregamento
 *    explícito, buscando os novos chunks e o novo index.html sem tela branca ou spinner infinito.
 */

const CHUNK_RELOAD_FLAG = 'pcp_chunk_reload_attempted'

/**
 * Detecta se o erro decorre de chunk dinâmico desatualizado ou inacessível
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Failed to load module script') ||
    message.includes('Expected a JavaScript module script')
  )
}

/**
 * Aciona window.location.reload() exatamente uma única vez por sessão para evitar reload loop
 */
export function triggerChunkReloadOnce(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const alreadyAttempted = sessionStorage.getItem(CHUNK_RELOAD_FLAG)
    if (!alreadyAttempted) {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, 'true')
      window.location.reload()
      return true
    }
  } catch {
    // sessionStorage inacessível (ex: navegação privada restrita)
  }
  return false
}

/**
 * Limpa a flag de reload quando um módulo é carregado com sucesso
 */
export function clearChunkReloadFlag(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG)
  } catch {
    // Silencia erro em ambientes restritos
  }
}

/**
 * Componente visual de fallback para erro irrecuperável de carregamento de chunk.
 * Oferece botão com ação explícita do usuário para recarregar a aplicação e buscar novo index/chunks.
 */
function createChunkErrorFallback<T extends ComponentType<any>>(
  moduleName: string,
  error: unknown,
): { default: T } {
  const FallbackComponent: React.FC = () => {
    const handleReload = () => {
      clearChunkReloadFlag()
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }

    const message = error instanceof Error ? error.message : String(error || '')

    return React.createElement(
      'div',
      {
        className: 'min-h-[50vh] flex items-center justify-center p-6 bg-slate-50 text-slate-800',
        'data-testid': 'chunk-error-fallback',
      },
      React.createElement(
        'div',
        {
          className:
            'max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center space-y-5',
        },
        React.createElement(
          'div',
          {
            className:
              'w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-xs',
          },
          React.createElement(
            'svg',
            {
              className: 'w-7 h-7',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
              xmlns: 'http://www.w3.org/2000/svg',
            },
            React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
            }),
          ),
        ),
        React.createElement(
          'div',
          { className: 'space-y-2' },
          React.createElement(
            'h2',
            { className: 'text-lg font-bold text-slate-900 tracking-tight' },
            'Nova Versão do Sistema Disponível',
          ),
          React.createElement(
            'p',
            { className: 'text-xs text-slate-600 leading-relaxed max-w-sm mx-auto' },
            'O módulo ',
            React.createElement('strong', { className: 'text-slate-800' }, moduleName),
            ' foi atualizado no servidor. Clique no botão abaixo para recarregar e obter a versão mais recente.',
          ),
          message
            ? React.createElement(
                'p',
                {
                  className: 'text-[11px] font-mono text-slate-400 truncate max-w-xs mx-auto',
                  title: message,
                },
                message,
              )
            : null,
        ),
        React.createElement(
          'div',
          { className: 'flex flex-wrap gap-3 justify-center pt-1' },
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: handleReload,
              className:
                'inline-flex items-center justify-center gap-2 bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer',
            },
            React.createElement(
              'svg',
              {
                className: 'w-3.5 h-3.5',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24',
                xmlns: 'http://www.w3.org/2000/svg',
              },
              React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
              }),
            ),
            'Recarregar Sistema',
          ),
        ),
        React.createElement(
          'div',
          { className: 'text-[11px] text-slate-400 font-mono pt-3 border-t border-slate-100' },
          'CIAFAL • HUB PCP Robotizado',
        ),
      ),
    )
  }

  return { default: FallbackComponent as unknown as T }
}

/**
 * Wrapper de lazy() com retry com backoff exponencial (3 tentativas) e fallback visual
 * com botão explícito de "Recarregar" caso o erro persista.
 * Evita telas brancas ou loaders infinitos após deploys com substituição de assets.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>,
  moduleName = 'Módulo',
  maxRetries = 3,
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
        lastError = error
        console.warn(
          `[PCP Robotizado] Tentativa ${attempt}/${maxRetries} falhou ao carregar módulo "${moduleName}":`,
          error,
        )

        // Se ainda restarem tentativas, aguarda com backoff exponencial (150ms, 300ms, ...)
        if (attempt < maxRetries) {
          const delayMs = attempt * 150
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    console.error(
      `[PCP Robotizado] Todas as ${maxRetries} tentativas esgotadas para o módulo "${moduleName}".`,
      lastError,
    )

    // Se for erro de chunk, tenta reload automático único transparente
    if (isChunkLoadError(lastError)) {
      const reloaded = triggerChunkReloadOnce()
      if (reloaded) {
        // Retorna uma Promise pendente para aguardar o reload do navegador sem renderizar o erro
        return new Promise<{ default: T }>(() => {})
      }
      // Se o reload automático já foi consumido nesta sessão, renderiza estado de erro amigável
      // com botão para recarregar explicitamente a página (sem tela branca e sem suspense infinito)
      return createChunkErrorFallback<T>(moduleName, lastError)
    }

    // Se não for chunk error, lança para o ErrorBoundary mais próximo capturar
    throw lastError
  })
}
