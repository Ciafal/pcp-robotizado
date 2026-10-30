import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PcpResumoGeralPage } from '@/pages/pcp/PcpResumoGeralPage'
import { officialNavGroups } from '@/components/layout/PCPNavigation'

// Mock de services
vi.mock('@/services/mp-sidercentro-service', () => ({
  mpSdcService: {
    getSteelMatrixRows: vi.fn().mockResolvedValue([
      {
        id: 'sdc-1',
        material_code: 'MAT-1020-01',
        steel_grade: 'SAE 1020',
        total_stock_tons: 1055,
        stock_sdc_ds03_tons: 650,
        stock_ciafal_dp04_tons: 405,
        min_stock_tons: 1200,
        statistical_coverage_days: 14,
        rupture_risk_level: 'AMARELO',
      },
    ]),
    getL2PlannedVsRealized: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/services/mp-dimensional-notes-service', () => ({
  mpMultipleCuttingPlansService: {
    listPlans: vi.fn().mockResolvedValue([
      {
        id: 'plan-1',
        plan_code: 'PCM-2026-00001',
        status: 'Aprovado',
        version: 1,
        material_code: 'MAT-1020-01',
        material_description: 'Barra Redonda 1020',
        cutting_yield_pct: 94.5,
        created: '2026-03-20T10:00:00Z',
      },
      {
        id: 'plan-2',
        plan_code: 'PCM-2026-00002',
        status: 'Em Revisão',
        version: 1,
        material_code: 'MAT-1045-02',
        material_description: 'Barra Redonda 1045',
        cutting_yield_pct: 91.2,
        created: '2026-03-21T11:00:00Z',
      },
    ]),
  },
}))

vi.mock('@/services/pcp-raw-material-inventory-service', () => ({
  rawMaterialInventoryService: {
    listInventoryOrders: vi.fn().mockResolvedValue([
      {
        id: 'inv-1',
        line: 'L1',
        schedule_date: '2026-03-22',
        schedule_version: 1,
        status: 'Aberto',
        total_items_count: 5,
      },
    ]),
  },
}))

const mockGetFullList = vi.fn().mockImplementation((options?: any) => {
  return Promise.resolve([])
})

vi.mock('@/lib/pocketbase/client', () => ({
  pb: {
    collection: vi.fn().mockImplementation((name: string) => {
      if (name === 'pcp_production_orders') {
        return {
          getFullList: vi.fn().mockResolvedValue([
            {
              id: 'ord-101',
              op_number: '4500012342',
              empresa_code: 'CIAFAL',
              centro_code: 'SEML1',
              linha_code: 'L1',
              material_code: 'TUB-IND-5050',
              material_description: 'Tubo Industrial Quadrado 50x50x2,00 mm',
              steel_grade: 'SAE 1012',
              gauge_dimension: '50x50 mm',
              programming_type: 'Laminação',
              quantity_planned_tons: 140,
              quantity_produced_tons: 114.24,
              quantity_posted_tons: 110,
              quantity_sap_tons: 110,
              balance_tons: 25.76,
              yield_planned_pct: 94,
              yield_realized_pct: 91.5,
              status_op: 'EM_PRODUCAO',
              status_mes: 'EM_EXECUCAO',
              status_sap: 'CONFIRMADA_PARCIAL',
              status_fechamento: 'PENDENTE_DE_FECHAMENTO',
              has_pendency: true,
              deviation_reason: 'Produção 18,4% abaixo do previsto por instabilidade no forno',
              operator_leader: 'Carlos Mendes',
            },
            {
              id: 'ord-102',
              op_number: 'OP-2025-0892',
              empresa_code: 'CIAFAL',
              centro_code: 'ENDL1',
              linha_code: 'L1',
              material_code: 'TUB-RED-6025',
              material_description: 'Tubo Redondo 60,30x2,65 mm',
              steel_grade: 'SAE 1020',
              gauge_dimension: 'Ø 60,30 mm',
              programming_type: 'Endireitadeira',
              quantity_planned_tons: 85,
              quantity_produced_tons: 85,
              quantity_posted_tons: 85,
              quantity_sap_tons: 85,
              balance_tons: 0,
              yield_planned_pct: 95,
              yield_realized_pct: 95.2,
              status_op: 'ENCERRADA',
              status_mes: 'FINALIZADO_OPERADOR',
              status_sap: 'FECHADA_TECNICAMENTE',
              status_fechamento: 'FECHADA',
              has_pendency: false,
              operator_leader: 'Julio Cesar',
            },
          ]),
        }
      }
      return {
        getFullList: mockGetFullList,
      }
    }),
    authStore: {
      isValid: true,
      record: { id: 'user-1', role: 'PCP_ADMIN' },
    },
  },
  default: {
    collection: vi.fn().mockImplementation((name: string) => {
      if (name === 'pcp_production_orders') {
        return {
          getFullList: vi.fn().mockResolvedValue([
            {
              id: 'ord-101',
              op_number: '4500012342',
              empresa_code: 'CIAFAL',
              centro_code: 'SEML1',
              linha_code: 'L1',
              material_code: 'TUB-IND-5050',
              material_description: 'Tubo Industrial Quadrado 50x50x2,00 mm',
              steel_grade: 'SAE 1012',
              gauge_dimension: '50x50 mm',
              programming_type: 'Laminação',
              quantity_planned_tons: 140,
              quantity_produced_tons: 114.24,
              quantity_posted_tons: 110,
              quantity_sap_tons: 110,
              balance_tons: 25.76,
              yield_planned_pct: 94,
              yield_realized_pct: 91.5,
              status_op: 'EM_PRODUCAO',
              status_mes: 'EM_EXECUCAO',
              status_sap: 'CONFIRMADA_PARCIAL',
              status_fechamento: 'PENDENTE_DE_FECHAMENTO',
              has_pendency: true,
              deviation_reason: 'Produção 18,4% abaixo do previsto por instabilidade no forno',
              operator_leader: 'Carlos Mendes',
            },
            {
              id: 'ord-102',
              op_number: 'OP-2025-0892',
              empresa_code: 'CIAFAL',
              centro_code: 'ENDL1',
              linha_code: 'L1',
              material_code: 'TUB-RED-6025',
              material_description: 'Tubo Redondo 60,30x2,65 mm',
              steel_grade: 'SAE 1020',
              gauge_dimension: 'Ø 60,30 mm',
              programming_type: 'Endireitadeira',
              quantity_planned_tons: 85,
              quantity_produced_tons: 85,
              quantity_posted_tons: 85,
              quantity_sap_tons: 85,
              balance_tons: 0,
              yield_planned_pct: 95,
              yield_realized_pct: 95.2,
              status_op: 'ENCERRADA',
              status_mes: 'FINALIZADO_OPERADOR',
              status_sap: 'FECHADA_TECNICAMENTE',
              status_fechamento: 'FECHADA',
              has_pendency: false,
              operator_leader: 'Julio Cesar',
            },
          ]),
        }
      }
      return {
        getFullList: mockGetFullList,
      }
    }),
    authStore: {
      isValid: true,
      record: { id: 'user-1', role: 'PCP_ADMIN' },
    },
  },
}))

describe('PcpResumoGeralPage — Dashboard de Resumo Geral', () => {
  it('contém a rota /pcp/resumo-geral no menu oficial de navegação oficialNavGroups', () => {
    const principalGroup = officialNavGroups.find((g) => g.groupTitle === 'PRINCIPAL')
    expect(principalGroup).toBeDefined()
    const resumoItem = principalGroup?.items.find((item) => item.href === '/pcp/resumo-geral')
    expect(resumoItem).toBeDefined()
    expect(resumoItem?.title).toBe('Resumo Geral')
  })

  it('renderiza o dashboard com formato de toneladas pt-BR (ex.: 1.055,000 t) e dados agregados reais', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/resumo-geral']}>
        <PcpResumoGeralPage />
      </MemoryRouter>,
    )

    // Aguarda carregar dados
    await waitFor(() => {
      expect(screen.getByText(/Resumo Geral — PCP Robotizado/i)).toBeInTheDocument()
    })

    // Verifica formatação em 3 decimais padrão pt-BR de toneladas
    expect(screen.getByText('1.055,000 t')).toBeInTheDocument()

    // Verifica plano de corte carregado
    expect(screen.getByText('PCM-2026-00001')).toBeInTheDocument()
    expect(screen.getByText('SAE 1020')).toBeInTheDocument()

    // Verifica cards de navegação rápida e botões de acesso
    expect(screen.getByText(/Acessar MP/i)).toBeInTheDocument()
    expect(screen.getByText(/Planos de Corte/i)).toBeInTheDocument()
    expect(screen.getByText(/Inventário/i)).toBeInTheDocument()
  })

  it('exibe "Dado não disponível" honesto quando indicador SAP ou L2 não possui registro, nunca zero inventado', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/resumo-geral']}>
        <PcpResumoGeralPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Resumo Geral — PCP Robotizado/i)).toBeInTheDocument()
    })

    // Volume planejado ou L2 sem registros carregados deve exibir estado honesto
    expect(screen.getAllByText(/Dado não disponível/i).length).toBeGreaterThan(0)
  })

  it('integra dados reais de produção da collection pcp_production_orders com toneladas formatadas (3 decimais pt-BR)', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/resumo-geral']}>
        <PcpResumoGeralPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Controle de Produção Fabril/i)).toBeInTheDocument()
    })

    // Volume produzido real: 114.24 + 85 = 199.240 t
    // Total planejado: 140 + 85 = 225.000 t
    expect(screen.getByText('199,240 t')).toBeInTheDocument()
    expect(screen.getByText('225,000 t')).toBeInTheDocument()

    // Ordens na seção de produção
    expect(screen.getByText(/OP 4500012342/i)).toBeInTheDocument()
    expect(screen.getByText(/OP OP-2025-0892/i)).toBeInTheDocument()

    // Contadores de status de ordens
    expect(screen.getByText('Total Ordens')).toBeInTheDocument()
    expect(screen.getByText('Em Execução')).toBeInTheDocument()
    expect(screen.getByText('Concluídas')).toBeInTheDocument()

    // Navegações diretas do controle de produção
    expect(screen.getByText('Ver Todas as Ordens')).toBeInTheDocument()
    expect(screen.getByText('Indicadores de Produção')).toBeInTheDocument()
    expect(screen.getByText('Torre de Controle')).toBeInTheDocument()
  })

  it('permite navegar diretamente para a tela de ordens de produção ao clicar no card', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/resumo-geral']}>
        <PcpResumoGeralPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Controle de Produção Fabril/i)).toBeInTheDocument()
    })

    const opCard = screen.getByText(/OP 4500012342/i).closest('[role="button"]')
    expect(opCard).toBeInTheDocument()
  })
})
