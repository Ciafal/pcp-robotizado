import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AuthContext } from '@/contexts/AuthContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Layout } from '@/components/Layout'
import CogiPendenciesPage from '@/pages/production-control/CogiPendenciesPage'
import Co1pPendenciesPage from '@/pages/production-control/Co1pPendenciesPage'

const mockAuthValue: any = {
  user: {
    id: 'user-pcp',
    name: 'Planejador PCP',
    email: 'planejador@ciafal.com.br',
    roles: ['pcp_planner', 'admin'],
  },
  hasPermission: () => true,
  loading: false,
}

// Auxiliar para simulação com o Layout completo e rotas reais
const renderWithLayout = (initialEntries: string[]) => {
  return render(
    <AuthContext.Provider value={mockAuthValue}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/pcp/controle-producao/cogi" element={<CogiPendenciesPage />} />
            <Route path="/pcp/controle-producao/co1p" element={<Co1pPendenciesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('Testes de Aceitação - Rotas e Telas de Pendências SAP (COGI / CO1P)', () => {
  it('1. Renderização via URL direta /pcp/controle-producao/cogi sem ErrorBoundary', async () => {
    renderWithLayout(['/pcp/controle-producao/cogi'])

    // Título oficial e subtítulo
    expect(await screen.findByText('Pendências - COGI')).toBeInTheDocument()
    expect(
      screen.getByText(/Processamento posterior de movimentos de mercadorias SAP/i),
    ).toBeInTheDocument()

    // Botões oficiais
    expect(screen.getByText('Atualizar SAP')).toBeInTheDocument()
    expect(screen.getByText('Gerar Resumo IA')).toBeInTheDocument()

    // Garante que o ErrorBoundary global não foi acionado (não há PCP- ou mensagem de erro)
    expect(screen.queryByText(/Ocorreu um erro inesperado/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/PCP-/)).not.toBeInTheDocument()
  })

  it('2. Renderização via URL direta /pcp/controle-producao/co1p sem ErrorBoundary', async () => {
    renderWithLayout(['/pcp/controle-producao/co1p'])

    expect(await screen.findByText('Pendências - CO1P')).toBeInTheDocument()
    expect(
      screen.getByText(/Processamento posterior de confirmações de produção SAP/i),
    ).toBeInTheDocument()

    expect(screen.getByText('Atualizar SAP')).toBeInTheDocument()
    expect(screen.getByText('Gerar Resumo IA')).toBeInTheDocument()

    expect(screen.queryByText(/Ocorreu um erro inesperado/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/PCP-/)).not.toBeInTheDocument()
  })

  it('3. Navegação pelo menu lateral para COGI e CO1P', async () => {
    renderWithLayout(['/pcp/controle-producao/cogi'])

    expect(await screen.findByText('Pendências - COGI')).toBeInTheDocument()

    // O menu lateral deve ter os itens de CONTROLE DE PRODUÇÃO
    const cogiMenuItems = screen.getAllByRole('link', { name: /Pendências - COGI/i })
    expect(cogiMenuItems.length).toBeGreaterThan(0)

    const co1pMenuItems = screen.getAllByRole('link', { name: /Pendências - CO1P/i })
    expect(co1pMenuItems.length).toBeGreaterThan(0)

    // Clica no link do menu lateral para CO1P
    fireEvent.click(co1pMenuItems[0])

    expect(await screen.findByText('Pendências - CO1P')).toBeInTheDocument()
    expect(
      screen.getByText(/Processamento posterior de confirmações de produção SAP/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Ocorreu um erro inesperado/i)).not.toBeInTheDocument()
  })

  it('4. Alternância COGI ↔ CO1P mantendo estabilidade', async () => {
    renderWithLayout(['/pcp/controle-producao/cogi'])

    expect(await screen.findByText('Pendências - COGI')).toBeInTheDocument()

    // Alternar para CO1P
    const co1pLink = screen.getAllByRole('link', { name: /Pendências - CO1P/i })[0]
    fireEvent.click(co1pLink)
    expect(await screen.findByText('Pendências - CO1P')).toBeInTheDocument()

    // Alternar de volta para COGI
    const cogiLink = screen.getAllByRole('link', { name: /Pendências - COGI/i })[0]
    fireEvent.click(cogiLink)
    expect(await screen.findByText('Pendências - COGI')).toBeInTheDocument()

    expect(screen.queryByText(/PCP-/)).not.toBeInTheDocument()
  })

  it('5. Simulação de F5 / Reload da página renderizando com TooltipProvider ativo', async () => {
    // Simula reload remontando o componente no mesmo path
    const { unmount } = renderWithLayout(['/pcp/controle-producao/cogi'])
    expect(await screen.findByText('Pendências - COGI')).toBeInTheDocument()
    unmount()

    // Remonta simulando a conclusão do reload
    renderWithLayout(['/pcp/controle-producao/cogi'])
    expect(await screen.findByText('Pendências - COGI')).toBeInTheDocument()
    expect(
      screen.queryByText(/TooltipPrimitive.Root must be used within TooltipProvider/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/PCP-/)).not.toBeInTheDocument()
  })

  it('6. Navegação com histórico do navegador (Voltar / Avançar)', async () => {
    // Componente auxiliar com botões de histórico
    const HistoryTestWrapper = () => {
      const navigate = useNavigate()
      return (
        <div>
          <button onClick={() => navigate(-1)}>Voltar Histórico</button>
          <button onClick={() => navigate(1)}>Avançar Histórico</button>
        </div>
      )
    }

    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter
          initialEntries={['/pcp/controle-producao/cogi', '/pcp/controle-producao/co1p']}
        >
          <HistoryTestWrapper />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/pcp/controle-producao/cogi" element={<CogiPendenciesPage />} />
              <Route path="/pcp/controle-producao/co1p" element={<Co1pPendenciesPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    // Inicialmente no segundo path: CO1P
    expect(await screen.findByText('Pendências - CO1P')).toBeInTheDocument()

    // Clica em "Voltar Histórico"
    fireEvent.click(screen.getByText('Voltar Histórico'))

    // Deve renderizar COGI
    expect(await screen.findByText('Pendências - COGI')).toBeInTheDocument()

    // Clica em "Avançar Histórico"
    fireEvent.click(screen.getByText('Avançar Histórico'))

    // Deve renderizar CO1P novamente
    expect(await screen.findByText('Pendências - CO1P')).toBeInTheDocument()
    expect(screen.queryByText(/PCP-/)).not.toBeInTheDocument()
  })
})
