import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { ProgramacaoParadaPage } from '@/pages/ProgramacaoParadaPage'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { officialNavGroups } from '@/components/layout/PCPNavigation'
import { programacaoParadaService } from '@/services/programacao-parada-service'
import { pb } from '@/lib/pocketbase/client'

// Mocks defensivos de autenticação
let mockUser: any = {
  id: 'usr-pcp-test',
  email: 'programador.pcp@ciafal.com.br',
  name: 'Lucas Ferreira (PCP)',
  role: 'PCP_PROGRAMMER',
}

let mockHasPermission = vi.fn((_perm?: string) => true)

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    hasPermission: (perm?: string) => mockHasPermission(perm),
    can: (perm?: string) => mockHasPermission(perm),
  }),
}))

// Mini shell de navegação para simular o menu lateral e transições rápidas
const NavigationHarness: React.FC = () => {
  const location = useLocation()
  return (
    <div>
      <nav data-testid="sidebar-nav" className="flex gap-2 p-2 bg-slate-100">
        <Link to="/pcp/cockpit" data-testid="nav-principal">
          Principal
        </Link>
        <Link to="/pcp/sequenciamento/montagem-semanal" data-testid="nav-montagem">
          Montagem Semanal
        </Link>
        <Link to="/pcp/programacao/parada" data-testid="nav-parada">
          Programação de Parada
        </Link>
        <Link to="/pcp/sequenciamento/programacao-testes" data-testid="nav-testes">
          Programação de Testes
        </Link>
        <Link to="/pcp/controle-producao" data-testid="nav-controle">
          Controle de Produção
        </Link>
      </nav>

      <div data-testid="current-path">{location.pathname}</div>

      <Routes>
        <Route
          path="/pcp/cockpit"
          element={<div data-testid="page-cockpit">Cockpit Principal PCP</div>}
        />
        <Route
          path="/pcp/sequenciamento/montagem-semanal"
          element={<div data-testid="page-montagem">Página Montagem Semanal</div>}
        />
        <Route
          path="/pcp/programacao/parada"
          element={
            <PermissionGuard permission="pcp.schedule.view">
              <ProgramacaoParadaPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/pcp/sequenciamento/programacao-testes"
          element={<div data-testid="page-testes">Página Programação de Testes</div>}
        />
        <Route
          path="/pcp/controle-producao"
          element={<div data-testid="page-controle">Página Controle de Produção</div>}
        />
      </Routes>
    </div>
  )
}

describe('Regressão — Navegação PCP Robotizado e Programação de Parada (PCP-DC331BCF)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = {
      id: 'usr-pcp-test',
      email: 'programador.pcp@ciafal.com.br',
      name: 'Lucas Ferreira (PCP)',
      role: 'PCP_PROGRAMMER',
    }
    mockHasPermission = vi.fn((_perm?: string) => true)
  })

  // 1. Cenário: abrir Principal -> Programação de Parada
  it('Cenário 1: Navegar de Principal para Programação de Parada abre sem Error Boundary', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/cockpit']}>
        <NavigationHarness />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('page-cockpit')).toBeInTheDocument()

    // Clicar no menu lateral: Programação de Parada
    fireEvent.click(screen.getByTestId('nav-parada'))

    await waitFor(() => {
      expect(screen.getByText(/PROGRAMAÇÃO DE PARADA/i)).toBeInTheDocument()
      expect(screen.getByTestId('current-path')).toHaveTextContent('/pcp/programacao/parada')
      expect(screen.queryByText(/Não foi possível carregar esta página/i)).not.toBeInTheDocument()
    })
  })

  // 2. Cenário: abrir Montagem Semanal -> Programação de Parada
  it('Cenário 2: Navegar de Montagem Semanal para Programação de Parada abre perfeitamente', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/sequenciamento/montagem-semanal']}>
        <NavigationHarness />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('page-montagem')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('nav-parada'))

    await waitFor(() => {
      expect(screen.getByText(/PROGRAMAÇÃO DE PARADA/i)).toBeInTheDocument()
      expect(screen.getByTestId('current-path')).toHaveTextContent('/pcp/programacao/parada')
    })
  })

  // 3. Cenário: Programação de Parada -> outro item -> retornar
  it('Cenário 3: Navegar de Programação de Parada para outro item e retornar com sucesso', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/programacao/parada']}>
        <NavigationHarness />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/PROGRAMAÇÃO DE PARADA/i)).toBeInTheDocument()
    })

    // Navega para Programação de Testes
    fireEvent.click(screen.getByTestId('nav-testes'))
    expect(screen.getByTestId('page-testes')).toBeInTheDocument()

    // Retorna para Programação de Parada
    fireEvent.click(screen.getByTestId('nav-parada'))
    await waitFor(() => {
      expect(screen.getByText(/PROGRAMAÇÃO DE PARADA/i)).toBeInTheDocument()
      expect(screen.queryByText(/Não foi possível carregar esta página/i)).not.toBeInTheDocument()
    })
  })

  // 4. Cenário: Acesso direto e refresh (F5/reload simulado) a /pcp/programacao/parada
  it('Cenário 4: Acesso direto e recarregamento na rota /pcp/programacao/parada renderizam sem tela branca', async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/pcp/programacao/parada']}>
        <NavigationHarness />
      </MemoryRouter>,
    )

    expect(screen.getByText(/PROGRAMAÇÃO DE PARADA/i)).toBeInTheDocument()

    // Simula refresh (desmonta e remonta na mesma rota direta)
    unmount()

    render(
      <MemoryRouter initialEntries={['/pcp/programacao/parada']}>
        <NavigationHarness />
      </MemoryRouter>,
    )

    expect(screen.getByText(/PROGRAMAÇÃO DE PARADA/i)).toBeInTheDocument()
    expect(screen.queryByText(/Não foi possível carregar esta página/i)).not.toBeInTheDocument()
  })

  // 5. Cenário: Troca rápida consecutiva entre vários itens do menu lateral
  it('Cenário 5: Transições rápidas consecutivas entre itens do menu lateral não quebram o router', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/cockpit']}>
        <NavigationHarness />
      </MemoryRouter>,
    )

    // Trocas rápidas sucessivas
    fireEvent.click(screen.getByTestId('nav-montagem'))
    fireEvent.click(screen.getByTestId('nav-parada'))
    fireEvent.click(screen.getByTestId('nav-testes'))
    fireEvent.click(screen.getByTestId('nav-controle'))
    fireEvent.click(screen.getByTestId('nav-parada'))

    await waitFor(() => {
      expect(screen.getByText(/PROGRAMAÇÃO DE PARADA/i)).toBeInTheDocument()
      expect(screen.getByTestId('current-path')).toHaveTextContent('/pcp/programacao/parada')
    })
  })

  // 6. Cenário: Estado vazio em Programação de Parada (sem registros no banco = estado vazio, nunca Error Boundary)
  it('Cenário 6: Base sem registros cadastrados exibe estado vazio limpo, nunca Error Boundary', async () => {
    vi.spyOn(programacaoParadaService, 'listarCentrosPorFiltro').mockResolvedValueOnce([])
    vi.spyOn(programacaoParadaService, 'listarProgramacoes').mockResolvedValueOnce([])

    render(
      <MemoryRouter initialEntries={['/pcp/programacao/parada']}>
        <NavigationHarness />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/PROGRAMAÇÃO DE PARADA/i)).toBeInTheDocument()
      // Estado vazio na seção de centros
      expect(
        screen.getByText(/Nenhum registro encontrado para os filtros selecionados./i),
      ).toBeInTheDocument()
      // Não exibe crash
      expect(screen.queryByText(/Não foi possível carregar esta página/i)).not.toBeInTheDocument()
    })
  })

  // 7. Cenário: Falha de API contida no componente com botão de tentar novamente (sem derrubar o shell)
  it('Cenário 7: Falha de API fica contida com mensagem amigável e botão de tentar novamente', async () => {
    vi.spyOn(programacaoParadaService, 'listarCentrosPorFiltro').mockRejectedValueOnce(
      new Error('Timeout de rede 504'),
    )

    render(
      <MemoryRouter initialEntries={['/pcp/programacao/parada']}>
        <NavigationHarness />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/PROGRAMAÇÃO DE PARADA/i)).toBeInTheDocument()
      // Mensagem amigável de erro localizada
      expect(
        screen.getByText(/Não foi possível carregar os dados. Tente novamente./i),
      ).toBeInTheDocument()
      // Botão de tentar novamente presente
      expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument()
      // Menu lateral e shell preservados
      expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument()
      // Sem Error Boundary global
      expect(screen.queryByText(/Não foi possível carregar esta página/i)).not.toBeInTheDocument()
    })
  })

  // 8. Cenário: Usuário sem permissão recebe mensagem de acesso não autorizado sem crash
  it('Cenário 8: Usuário sem permissão recebe estado de acesso restrito amigável sem crash', async () => {
    mockHasPermission = vi.fn((_perm?: string) => {
      return false
    })

    render(
      <MemoryRouter initialEntries={['/pcp/programacao/parada']}>
        <NavigationHarness />
      </MemoryRouter>,
    )

    await waitFor(() => {
      // Mensagem amigável de acesso não autorizado do PermissionGuard
      expect(screen.getByText(/Acesso não autorizado/i)).toBeInTheDocument()
      // O shell de navegação continua vivo
      expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument()
      // Sem Error Boundary de tela inteira
      expect(screen.queryByText(/Não foi possível carregar esta página/i)).not.toBeInTheDocument()
    })
  })

  // 9. Cenário: Todas as rotas do menu lateral officialNavGroups possuem caminho absoluto válido (/pcp/...)
  it('Cenário 9: Todas as rotas em officialNavGroups iniciam com barra "/" e são caminhos absolutos', () => {
    officialNavGroups.forEach((group) => {
      group.items.forEach((item) => {
        expect(item.href.startsWith('/')).toBe(true)
        expect(item.href).toMatch(/^\/pcp(\/|$)/)
        expect(item.permission).toBeTruthy()
        expect(item.title).toBeTruthy()
      })
    })
  })

  // 10. Cenário: Garantir que export duplo do pb (named + default) permanece estritamente canônico
  it('Cenário 10: PocketBase client export duplo canônico está preservado', async () => {
    const importedModule = await import('@/lib/pocketbase/client')
    expect(importedModule.pb).toBeDefined()
    expect(importedModule.default).toBeDefined()
    expect(importedModule.pb).toBe(importedModule.default)
    expect(typeof importedModule.pb.collection).toBe('function')
  })
})
