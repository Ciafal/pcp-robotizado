import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CreateReferenceMatrixModal } from '@/components/line-master/CreateReferenceMatrixModal'
import { LineBottleneckMatrixPanel } from '@/components/line-master/LineBottleneckMatrixPanel'
import { SapMrpControllerItem } from '@/types/sap-mrp'
import { LineBottleneckMatrixRecord } from '@/types/bottleneck-matrix'
import { AuthContext } from '@/contexts/AuthContext'

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const mockControllers: SapMrpControllerItem[] = [
  {
    id: 'ctrl-1',
    dispo: 'P01',
    description: 'Planejamento Laminação L1',
    werks: '1001',
    is_active: true,
    materials_count: 142,
    origin_source: 'SAP_RFC',
  },
  {
    id: 'ctrl-2',
    dispo: 'P02',
    description: 'Planejamento Perfis Leves',
    werks: '1001',
    is_active: true,
    materials_count: 85,
    origin_source: 'SAP_RFC',
  },
]

const mockMatrices: LineBottleneckMatrixRecord[] = [
  {
    id: 'mat-1',
    matrix_name: 'Matriz L1 — Principal',
    line_code: 'L1',
    line_id: 'line-l1',
    company_code: 'CIAFAL',
    werks: '1001',
    mrp_controller_code: 'P01',
    mrp_controller_description: 'Planejamento Laminação L1',
    mrp_controllers_json: ['P01'],
    valid_from: '2026-01-01 00:00:00.000Z',
    valid_until: '2026-12-31 00:00:00.000Z',
    status: 'VIGENTE',
    version: 1,
    is_homologated: true,
    furnace_capacity_th: 32,
    roughing_capacity_th: 29.5,
    continuous_mill_capacity_th: 24.8,
    shear_tr2_capacity_th: 27.5,
    cooling_bed_tcc_capacity_th: 26.1,
    straightener_capacity_th: 30,
    packaging_capacity_th: 34,
    primary_bottleneck_stage: 'TREM_CONTINUO',
    primary_bottleneck_rate_th: 24.8,
    secondary_bottleneck_stage: 'TCC_RESFRIAMENTO',
    secondary_bottleneck_rate_th: 26.1,
    bottleneck_gap_th: 1.3,
    max_tcc_bar_length_m: 72,
    max_tcc_bars_per_rack: 14,
    min_bar_interval_seconds: 3.2,
    max_crop_end_weight_kg: 15,
    reference_doc: 'Matriz Oficial L1',
    source_authority: 'Engenharia CIAFAL',
    responsible_name: 'PCP Robotizado',
    approver_name: 'Engenharia de Processos',
  },
  {
    id: 'mat-2',
    matrix_name: 'Matriz L1 — Perfis Leves',
    line_code: 'L1',
    line_id: 'line-l1',
    company_code: 'CIAFAL',
    werks: '1001',
    mrp_controller_code: 'P02',
    mrp_controller_description: 'Planejamento Perfis Leves',
    mrp_controllers_json: ['P02'],
    valid_from: '2026-01-01 00:00:00.000Z',
    valid_until: '2026-12-31 00:00:00.000Z',
    status: 'VIGENTE',
    version: 2,
    is_homologated: false,
    furnace_capacity_th: 30,
    roughing_capacity_th: 28,
    continuous_mill_capacity_th: 25,
    shear_tr2_capacity_th: 27,
    cooling_bed_tcc_capacity_th: 26,
    straightener_capacity_th: 29,
    packaging_capacity_th: 33,
    primary_bottleneck_stage: 'TREM_CONTINUO',
    primary_bottleneck_rate_th: 25,
    secondary_bottleneck_stage: 'TCC_RESFRIAMENTO',
    secondary_bottleneck_rate_th: 26,
    bottleneck_gap_th: 1.0,
    max_tcc_bar_length_m: 72,
    max_tcc_bars_per_rack: 14,
    min_bar_interval_seconds: 3.2,
    max_crop_end_weight_kg: 15,
    reference_doc: 'Matriz Perfis Leves L1',
    source_authority: 'Engenharia CIAFAL',
    responsible_name: 'PCP Robotizado',
    approver_name: 'Pendente de Homologação',
  },
]

// Mock de serviços para o painel
vi.mock('@/services/bottleneck-rules-engine', () => {
  return {
    BottleneckRulesEngine: {
      calculateDynamicBottleneck: () => ({
        primary_bottleneck: {
          stage: 'TREM_CONTINUO',
          stageName: 'Trem Contínuo',
          capacity_th: 24.8,
        },
        secondary_bottleneck: {
          stage: 'TCC_RESFRIAMENTO',
          stageName: 'Leito TCC',
          capacity_th: 26.1,
        },
        gap_to_secondary_th: 1.3,
        rope_cadence_th: 24.8,
        operational_robustness: 'ALTA',
        robustness_details: 'Operação balanceada.',
        starvation_risk: 'BAIXO',
        blocking_risk: 'BAIXO',
        stages: [],
      }),
    },
    bottleneckMatrixService: {
      listMatrices: vi.fn().mockResolvedValue(mockMatrices),
      listConstraints: vi.fn().mockResolvedValue([]),
      createMatrix: vi
        .fn()
        .mockImplementation((payload) => Promise.resolve({ id: 'new-id', ...payload })),
      updateMatrix: vi
        .fn()
        .mockImplementation((id, payload) => Promise.resolve({ id, ...payload })),
    },
  }
})

vi.mock('@/services/sap-mrp-service', () => ({
  sapMrpService: {
    mapCompanyToWerks: (comp: string) => (comp === 'KS-FERRADURA' ? '2001' : '1001'),
    mapWerksToCompany: (werks: string) => (werks === '2001' ? 'KS-FERRADURA' : 'CIAFAL'),
    listMrpControllersByWerks: vi.fn().mockResolvedValue(mockControllers),
    getLastControllersSyncDate: vi.fn().mockResolvedValue('2026-03-30T10:00:00Z'),
    formatMrpControllerDisplay: (c: any) =>
      `${c.dispo} — ${c.description || ''} / WERKS ${c.werks || '1001'}`,
    formatMatrixDropdownItem: (m: any) =>
      `${m.matrix_name || 'Matriz'} — Rev.${m.version || 1} — ${m.status || 'VIGENTE'} [DISPO: ${m.mrp_controller_code || ''}]`,
    syncMrpControllers: vi
      .fn()
      .mockResolvedValue({ last_sync: '2026-03-30T10:00:00Z', records_synced: 2 }),
  },
}))

describe('Testes Obrigatórios de Layout e Ajuste de Cadastro — Matriz de Gargalos Dinâmica', () => {
  describe('Teste 1 & 2: Formulário "+ Nova Matriz"', () => {
    it('NÃO deve renderizar os campos Bitola, Grau do Aço e Família de Produto', () => {
      render(
        <CreateReferenceMatrixModal
          open={true}
          onOpenChange={vi.fn()}
          lineCode="L1"
          lineName="Linha 1 — Laminação"
          currentWerks="1001"
          currentCompany="CIAFAL"
          availableControllers={mockControllers}
          existingMatrices={[]}
          onSuccess={vi.fn()}
        />,
      )

      // Verifica ausência dos três campos removidos
      expect(screen.queryByText(/Bitola \/ Seção de Referência/i)).toBeNull()
      expect(screen.queryByText(/Grau do Aço/i)).toBeNull()
      expect(screen.queryByText(/Família de Produto/i)).toBeNull()

      // Verifica presença obrigatória dos campos necessários
      expect(screen.getByText(/Nome da Matriz \*/i)).toBeDefined()
      expect(screen.getByText(/Empresa \*/i)).toBeDefined()
      expect(screen.getByText(/Centro SAP \(WERKS\) \*/i)).toBeDefined()
      expect(screen.getByText(/Linha Produtiva \*/i)).toBeDefined()
      expect(screen.getByText(/Centro Operacional/i)).toBeDefined()
      expect(screen.getByText(/Planejador MRP \(MARC-DISPO\) \* — Multisseleção/i)).toBeDefined()
      expect(screen.getByText(/Vigência Inicial \*/i)).toBeDefined()
      expect(screen.getByText(/Vigência Final/i)).toBeDefined()
      expect(screen.getByText(/Status/i)).toBeDefined()
      expect(screen.getByText(/Revisão/i)).toBeDefined()
    })
  })

  describe('Teste 3: Layout da Tela Matriz de Gargalos Dinâmica (Cabeçalho e Cards)', () => {
    const mockAuthContextValue: any = {
      user: { id: 'u1', name: 'Analista PCP' },
      isAuthenticated: true,
      hasRole: () => true,
    }

    it('deve renderizar título e subtítulo sem quebra em múltiplas linhas e os 4 cards de resumo', async () => {
      render(
        <AuthContext.Provider value={mockAuthContextValue}>
          <LineBottleneckMatrixPanel
            lineCode="L1"
            lineName="Linha 1 — Laminação"
            initialCompanyCode="CIAFAL"
          />
        </AuthContext.Provider>,
      )

      // Título principal e subtítulo da Área 1
      const titleElement = await screen.findByText(/Matriz de Gargalos Dinâmica — L1/i)
      expect(titleElement).toBeDefined()
      expect(
        screen.getByText(
          /Parâmetros técnicos de capacidade, restrições e gargalos vinculados ao Planejador MRP SAP\./i,
        ),
      ).toBeDefined()

      // Badges da Área 2
      expect(screen.getByText('VIGENTE')).toBeDefined()
      expect(screen.getByText('Rev.1')).toBeDefined()
      expect(screen.getByText('HOMOLOGADA')).toBeDefined()

      // Área 3: Botões de ação
      expect(screen.getByRole('button', { name: /Atualizar/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /\+ Nova Matriz/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /Gerar por Planejador/i })).toBeDefined()

      // Os 4 cards de resumo
      expect(screen.getByText('1. MATRIZ SELECIONADA')).toBeDefined()
      expect(screen.getByText('2. EMPRESA & WERKS SAP')).toBeDefined()
      expect(screen.getByText('3. PLANEJADOR MRP / SAP MARC-DISPO')).toBeDefined()
      expect(screen.getByText('4. VIGÊNCIA & STATUS')).toBeDefined()
    })

    it('Teste 4: Troca de Matriz no dropdown deve atualizar os cards sem quebra', async () => {
      render(
        <AuthContext.Provider value={mockAuthContextValue}>
          <LineBottleneckMatrixPanel
            lineCode="L1"
            lineName="Linha 1 — Laminação"
            initialCompanyCode="CIAFAL"
          />
        </AuthContext.Provider>,
      )

      const selectElement = await screen.findByLabelText(/Matriz de Referência Técnica/i)
      expect(selectElement).toBeDefined()

      // Troca para mat-2
      fireEvent.change(selectElement, { target: { value: 'mat-2' } })

      // Confirma que a nova matriz foi selecionada nos cards
      expect(screen.getByText('Matriz L1 — Perfis Leves')).toBeDefined()
      expect(screen.getByText('P02')).toBeDefined()
      expect(screen.getByText('Planejamento Perfis Leves')).toBeDefined()
      expect(screen.getByText('NÃO HOMOLOGADA')).toBeDefined()
    })
  })
})
