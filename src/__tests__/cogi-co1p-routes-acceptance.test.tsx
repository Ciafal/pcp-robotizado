import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from '@/contexts/AuthContext'
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

describe('Rotas e Telas de Pendências SAP (COGI / CO1P)', () => {
  it('renderiza página de pendências COGI na rota /pcp/controle-producao/cogi sem erros de runtime', async () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/controle-producao/cogi']}>
          <Routes>
            <Route path="/pcp/controle-producao/cogi" element={<CogiPendenciesPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByText('Pendências - COGI')).toBeInTheDocument()
    expect(
      screen.getByText(/Processamento posterior de movimentos de mercadorias SAP/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Atualizar SAP')).toBeInTheDocument()
    expect(screen.getByText('Gerar Resumo IA')).toBeInTheDocument()
  })

  it('renderiza página de pendências CO1P na rota /pcp/controle-producao/co1p sem erros de runtime', async () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/controle-producao/co1p']}>
          <Routes>
            <Route path="/pcp/controle-producao/co1p" element={<Co1pPendenciesPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByText('Pendências - CO1P')).toBeInTheDocument()
    expect(
      screen.getByText(/Processamento posterior de confirmações de produção SAP/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Atualizar SAP')).toBeInTheDocument()
    expect(screen.getByText('Gerar Resumo IA')).toBeInTheDocument()
  })
})
