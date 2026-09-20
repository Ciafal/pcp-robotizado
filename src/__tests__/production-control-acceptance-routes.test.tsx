import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PCPNavigation } from '@/components/layout/PCPNavigation'
import { AuthContext } from '@/contexts/AuthContext'
import ProductionOrdersPage from '@/pages/production-control/ProductionOrdersPage'
import ProductionPostingsPage from '@/pages/production-control/ProductionPostingsPage'
import ProductionHistoryPage from '@/pages/production-control/ProductionHistoryPage'
import ProductionAIAnalysisPage from '@/pages/production-control/ProductionAIAnalysisPage'

// Mock de dados e chamadas
vi.mock('@/services/pcp-production-service', async () => {
  const actual = await vi.importActual<any>('@/services/pcp-production-service')
  return {
    ...actual,
    pcpProductionService: {
      ...actual.pcpProductionService,
      checkMESConnection: vi.fn().mockResolvedValue({
        status: 'ONLINE',
        lastHeartbeat: new Date().toISOString(),
        pendingBufferCount: 0,
        syncLatencyMs: 42,
      }),
      listOrders: vi.fn().mockResolvedValue([
        {
          id: 'test-op-1',
          op_number: 'OP-TEST-001',
          company_code: 'CIAFAL',
          centro_code: 'SEML1',
          linha_code: 'L1',
          work_center: 'SEML1',
          material_code: 'MAT-101',
          material_description: 'Tubo Teste',
          family_code: 'TUBOS',
          steel_grade: 'SAE 1020',
          gauge_dimension: '50mm',
          product_name: 'Tubo',
          quantity_planned_tons: 100,
          quantity_produced_tons: 95,
          quantity_posted_tons: 90,
          quantity_sap_tons: 90,
          balance_tons: 10,
          yield_planned_pct: 95,
          yield_realized_pct: 92,
          productivity_realized_ton_h: 115,
          status_op: 'EM_PRODUCAO',
          status_mes: 'EM_PRODUCAO',
          status_sap: 'CONFIRMADA_PARCIAL',
          status_fechamento: 'PENDENTE_DE_FECHAMENTO',
          visual_status: 'NORMAL',
          criticidade: 'NORMAL',
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
        },
      ]),
      listPostings: vi.fn().mockResolvedValue([]),
      getOrderEvents: vi.fn().mockResolvedValue([]),
      requestAIAnalysis: vi.fn().mockResolvedValue({ content: 'Parecer gerado com sucesso.' }),
    },
  }
})

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

describe('Testes de Aceite — Controle de Produção (HUB CIAFAL)', () => {
  // TESTE A: expandir Controle de Produção mostra os 4 subitens
  it('TESTE A: ao renderizar o menu, o grupo CONTROLE DE PRODUÇÃO exibe seus 4 subitens funcionais', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/producao/ordens']}>
          <PCPNavigation />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    // O grupo "CONTROLE DE PRODUÇÃO" deve estar no DOM
    const grupoTitle = screen.getByText('CONTROLE DE PRODUÇÃO')
    expect(grupoTitle).toBeInTheDocument()

    // Os 4 subitens obrigatórios devem estar visíveis
    expect(screen.getByText('Controle de Ordens de Produção')).toBeInTheDocument()
    expect(screen.getByText('Apontamentos')).toBeInTheDocument()
    expect(screen.getByText('Histórico de Ordens de Produção')).toBeInTheDocument()
    expect(screen.getByText('Análise de Ordens')).toBeInTheDocument()
  })

  // TESTE B: clicar em cada item aponta para a rota correta
  it('TESTE B: cada subitem possui o link e rota própria esperada no menu', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/']}>
          <PCPNavigation />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    // Clica no header do grupo CONTROLE DE PRODUÇÃO para garantir expansão
    const grupoHeader = screen.getByText('CONTROLE DE PRODUÇÃO')
    fireEvent.click(grupoHeader)

    const linkOrdens = screen.getByText('Controle de Ordens de Produção').closest('a')
    expect(linkOrdens).toHaveAttribute('href', '/pcp/producao/ordens')

    const linkApontamentos = screen.getByText('Apontamentos').closest('a')
    expect(linkApontamentos).toHaveAttribute('href', '/pcp/producao/apontamentos')

    const linkHistorico = screen.getByText('Histórico de Ordens de Produção').closest('a')
    expect(linkHistorico).toHaveAttribute('href', '/pcp/producao/historico')

    const linkAnalise = screen.getByText('Análise de Ordens').closest('a')
    expect(linkAnalise).toHaveAttribute('href', '/pcp/producao/ia-analises')
  })

  // TESTE C: rotas carregam direto (simulação de F5 direto na rota)
  it('TESTE C: cada subrota funcional renderiza sua tela respectiva sem RootRedirect nem erro', async () => {
    // 1. Rota de Ordens
    const { unmount: unmount1 } = render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/producao/ordens']}>
          <Routes>
            <Route path="/pcp/producao/ordens" element={<ProductionOrdersPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    expect(screen.getByText('Controle de Ordens de Produção (MES x SAP ECC)')).toBeInTheDocument()
    unmount1()

    // 2. Rota de Apontamentos
    const { unmount: unmount2 } = render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/producao/apontamentos']}>
          <Routes>
            <Route path="/pcp/producao/apontamentos" element={<ProductionPostingsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    expect(screen.getByText(/Apontamentos de Produção/i)).toBeInTheDocument()
    unmount2()

    // 3. Rota de Histórico
    const { unmount: unmount3 } = render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/producao/historico']}>
          <Routes>
            <Route path="/pcp/producao/historico" element={<ProductionHistoryPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    expect(screen.getByText('Histórico de Ordens de Produção')).toBeInTheDocument()
    unmount3()

    // 4. Rota de Análise
    const { unmount: unmount4 } = render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/producao/ia-analises']}>
          <Routes>
            <Route path="/pcp/producao/ia-analises" element={<ProductionAIAnalysisPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    expect(screen.getByText(/Análise de Ordens com Inteligência Artificial/i)).toBeInTheDocument()
    unmount4()
  })
})
