import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { GestaoIndustrializadorSequenciamentoPage } from '@/pages/GestaoIndustrializadorSequenciamentoPage'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { AuthContext, AuthContextType } from '@/contexts/AuthContext'
import { pb } from '@/lib/pocketbase/client'

const mockAuthProgrammer = {
  user: {
    id: 'user-prog-01',
    email: 'programador@ciafal.com.br',
    name: 'Programador PCP',
    role: 'PCP_PROGRAMMER' as const,
  },
  roles: ['PCP_PROGRAMMER' as const],
  permissions: ['pcp.schedule.view' as any],
  activeRole: 'PCP_PROGRAMMER' as const,
  isLoading: false,
  isAuthenticated: true,
  isGlobalAdmin: false,
  isExecutiveViewer: false,
  isPcpSupervisor: false,
  isProgrammer: true,
  isOperator: false,
  hasCriticalPermission: false,
  can: (perm: string) => perm === 'pcp.schedule.view',
  canAccessModule: () => true,
  hasLineScope: () => true,
  login: async () => {},
  logout: () => {},
  loginAsProfile: () => {},
  refreshPermissions: async () => {},
  delegations: [],
  switchRole: () => {},
} as unknown as AuthContextType

describe('Suíte de Aceitação — Página de Sequenciamento P x R (Layout, Filtros e Cascata)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    pb.authStore.clear()
  })

  // Teste 8: Rota abre por menu, URL direta e F5 sem travar no PermissionGuard nem acionar ErrorBoundary global
  it('Teste 8: Sequenciamento P x R abre sem travar no PermissionGuard nem acionar ErrorBoundary', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/gestao-industrializador/sequenciamento']}>
        <AuthContext.Provider value={mockAuthProgrammer}>
          <Routes>
            <Route
              path="/pcp/gestao-industrializador/sequenciamento"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <GestaoIndustrializadorSequenciamentoPage />
                </PermissionGuard>
              }
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Sequenciamento — Previsto x Realizado/i)).toBeInTheDocument()
    })
    expect(screen.getByText('Oficial Aprovada')).toBeInTheDocument()
    expect(screen.queryByText(/Não foi possível carregar esta página/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Instabilidade na Validação de Acessos/i)).not.toBeInTheDocument()
  })

  // Teste: Grid único de filtros contém Empresa, Linha, Material / MP, Aço / Norma, etc.
  it('Contém os novos campos Empresa e Linha na ordem de filtros unificada', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/gestao-industrializador/sequenciamento']}>
        <AuthContext.Provider value={mockAuthProgrammer}>
          <Routes>
            <Route
              path="/pcp/gestao-industrializador/sequenciamento"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <GestaoIndustrializadorSequenciamentoPage />
                </PermissionGuard>
              }
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Selecionar Empresa/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Selecionar Linha/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Selecionar Industrializador/i)).toBeInTheDocument()
    })

    // Cabeçalho da grade com as colunas padronizadas
    expect(screen.getByText('Centro de Trabalho')).toBeInTheDocument()
    expect(screen.getByText('Data prevista no Centro')).toBeInTheDocument()
    expect(screen.getByText('Data Inventário WMS')).toBeInTheDocument()
    expect(screen.getByText('Data Faturamento')).toBeInTheDocument()
    expect(screen.getByText('Data Arcelor')).toBeInTheDocument()
  })
})
