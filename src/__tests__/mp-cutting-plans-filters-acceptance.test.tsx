import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MPCuttingPlansFilterBar } from '@/components/mp-optimization/MPCuttingPlansFilterBar'
import { MPCuttingPlansUnifiedPage } from '@/pages/mp-optimization/MPCuttingPlansUnifiedPage'
import { mpOptimizationService } from '@/services/mp-optimization'
import { mpCuttingWeightStandardsService } from '@/services/mp-cutting-weight-standards-service'
import { mpCuttingOptimizationEngineService } from '@/services/mp-cutting-optimization-engine-service'
import { MPDimensionalItem } from '@/types/mp-optimization'

// Mock dos serviços de backend
vi.mock('@/services/mp-optimization', () => ({
  mpOptimizationService: {
    getDimensionalInventory: vi.fn(),
    getApplicationRequirements: vi.fn(),
    getCuttingPlans: vi.fn(),
    updateDimensionalItem: vi.fn(),
    createCuttingPlan: vi.fn(),
    createWorkflowApproval: vi.fn(),
  },
}))

vi.mock('@/services/mp-cutting-weight-standards-service', () => ({
  mpCuttingWeightStandardsService: {
    listStandards: vi.fn().mockResolvedValue([]),
    saveSimulation: vi.fn().mockResolvedValue({ id: 'sim-1' }),
  },
}))

vi.mock('@/services/mp-cutting-optimization-engine-service', () => ({
  mpCuttingOptimizationEngineService: {
    generateComparativeScenarios: vi.fn().mockResolvedValue({
      simulation_code: 'SIM-TEST-001',
      scenarios: [],
      best_scenario_id: 'SCEN-1',
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      technical_justification: 'Simulação de teste',
    }),
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', name: 'Engenheiro PCP', email: 'pcp@ciafal.com.br' },
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const mockInventory: MPDimensionalItem[] = [
  {
    id: 'item-1',
    material_code: '10000452',
    material_description: 'Tarugo Redondo 130mm SAE 1020',
    steel_grade: 'SAE 1020',
    center_code: '1020',
    storage_location: 'DP04',
    batch_number: 'LT-998',
    heat_number: 'CR-887',
    supplier_code: 'GERDAU',
    supplier_name: 'Gerdau Aços Especiais',
    item_type: 'BLOCO',
    block_number: 'BL-101',
    thickness_mm: 130,
    width_mm: 130,
    length_mm: 6000,
    weight_kg: 5000, // 5.000 t
    reservation_status: 'LIVRE',
    original_application: 'Laminado Redondo',
    current_application: 'Laminado Redondo',
    sap_block_status: '01_DISPONIVEL',
    dimensional_classification: 'NIVEL_1_IDEAL',
    reception_date: '2026-03-01T10:00:00Z',
    created: '2026-03-01T10:00:00Z',
    updated: '2026-03-01T10:00:00Z',
  },
  {
    id: 'item-2',
    material_code: '20000988',
    material_description: 'Placa Laminada 150x200 SAE 1045',
    steel_grade: 'SAE 1045',
    center_code: '2010',
    storage_location: 'DP01',
    batch_number: 'LT-554',
    heat_number: 'CR-332',
    supplier_code: 'ARCELOR',
    supplier_name: 'ArcelorMittal Tubarão',
    item_type: 'PLACA',
    block_number: 'PL-202',
    thickness_mm: 150,
    width_mm: 200,
    length_mm: 4000,
    weight_kg: 8000, // 8.000 t
    reservation_status: 'RESERVADA',
    original_application: 'Chapa Grossa',
    current_application: 'Chapa Grossa',
    sap_block_status: '02_SELECIONADO_ENVIO',
    dimensional_classification: 'NIVEL_1_IDEAL',
    reception_date: '2026-03-02T10:00:00Z',
    created: '2026-03-02T10:00:00Z',
    updated: '2026-03-02T10:00:00Z',
  },
  {
    id: 'item-3',
    material_code: '30000111',
    material_description: 'Sobra Reutilizável Tarugo SAE 4140',
    steel_grade: 'SAE 4140',
    center_code: '1020',
    storage_location: 'DP02',
    batch_number: 'LT-111',
    heat_number: 'CR-111',
    supplier_code: 'VILLARES',
    supplier_name: 'Villares Metals',
    item_type: 'SOBRA_REUTILIZAVEL',
    block_number: 'SB-303',
    thickness_mm: 120,
    width_mm: 120,
    length_mm: 2000,
    weight_kg: 2000, // 2.000 t
    reservation_status: 'BLOQUEADA',
    original_application: 'Peças Forjadas',
    current_application: 'Peças Forjadas',
    sap_block_status: '01_DISPONIVEL',
    dimensional_classification: 'NIVEL_2_ADMISSIVEL',
    reception_date: '2026-03-03T10:00:00Z',
    created: '2026-03-03T10:00:00Z',
    updated: '2026-03-03T10:00:00Z',
  },
]

describe('Planos de Corte — Filtros da Visualização e Totalizadores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Componente de Filtro: deve renderizar comboboxes pesquisáveis e disparar alterações de busca', () => {
    const onFiltersChange = vi.fn()
    const onClearFilters = vi.fn()

    render(
      <MPCuttingPlansFilterBar
        filters={{
          searchTerm: '',
          center: 'ALL',
          depot: 'ALL',
          itemType: 'ALL',
          steelGrade: 'ALL',
          reservationStatus: 'ALL',
        }}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
        availableCenters={['1020', '2010']}
        availableDepots={['DP01', 'DP04']}
        availableItemTypes={['BLOCO', 'PLACA']}
        availableSteelGrades={['SAE 1020', 'SAE 1045']}
        totalItemsCount={3}
        filteredItemsCount={3}
      />,
    )

    // Input de pesquisa
    const searchInput = screen.getByTestId('filter-cutting-search-input')
    expect(searchInput).toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: '10000452' } })
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTerm: '10000452',
      }),
    )

    // Botões dos comboboxes pesquisáveis
    expect(screen.getByTestId('filter-combobox-center')).toBeInTheDocument()
    expect(screen.getByTestId('filter-combobox-depot')).toBeInTheDocument()
    expect(screen.getByTestId('filter-combobox-type')).toBeInTheDocument()
    expect(screen.getByTestId('filter-combobox-steel')).toBeInTheDocument()
    expect(screen.getByTestId('filter-combobox-reservation')).toBeInTheDocument()
  })

  it('2. Tela Unificada: ao carregar dados, deve exibir os cards de indicadores com valores em t (3 casas decimais)', async () => {
    vi.mocked(mpOptimizationService.getDimensionalInventory).mockResolvedValue(mockInventory)
    vi.mocked(mpOptimizationService.getApplicationRequirements).mockResolvedValue([])
    vi.mocked(mpOptimizationService.getCuttingPlans).mockResolvedValue([])

    render(<MPCuttingPlansUnifiedPage />)

    // Espera dados carregarem
    await waitFor(() => {
      expect(screen.getByText('Peso Total Filtrado')).toBeInTheDocument()
    })

    // Total de 15.000 t (5000 + 8000 + 2000 kg)
    expect(screen.getByText('15,000 t')).toBeInTheDocument()
    // Peso livre = 5.000 t (apenas item-1 é LIVRE)
    expect(screen.getByText('5,000 t')).toBeInTheDocument()

    // Itens na lista lateral (com bloco ou código)
    expect(screen.getByText(/Bloco BL-101/i)).toBeInTheDocument()
    expect(screen.getByText(/Bloco PL-202/i)).toBeInTheDocument()
    expect(screen.getByText(/Bloco SB-303/i)).toBeInTheDocument()
  })

  it('3. Tela Unificada: aplicar filtro de busca atualiza os cards de indicadores e os itens visíveis', async () => {
    vi.mocked(mpOptimizationService.getDimensionalInventory).mockResolvedValue(mockInventory)
    vi.mocked(mpOptimizationService.getApplicationRequirements).mockResolvedValue([])
    vi.mocked(mpOptimizationService.getCuttingPlans).mockResolvedValue([])

    render(<MPCuttingPlansUnifiedPage />)

    await waitFor(() => {
      expect(screen.getByTestId('filter-cutting-search-input')).toBeInTheDocument()
    })

    const input = screen.getByTestId('filter-cutting-search-input')
    // Filtra pelo código do Tarugo
    fireEvent.change(input, { target: { value: '10000452' } })

    // Agora apenas 1 item deve corresponder (5,000 t)
    await waitFor(() => {
      // Indicador de itens filtrados
      expect(screen.getByText(/1 itens/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Bloco BL-101/i)).toBeInTheDocument()
    expect(screen.queryByText(/Bloco PL-202/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Bloco SB-303/i)).not.toBeInTheDocument()

    // Chip de filtro aplicado deve aparecer
    expect(screen.getByText(/Busca: “10000452”/i)).toBeInTheDocument()

    // Botão Limpar Filtros deve estar visível
    const clearBtn = screen.getByTestId('filter-cutting-clear-button')
    expect(clearBtn).toBeInTheDocument()

    // Clicar em Limpar Filtros restaura todos os itens e métricas
    fireEvent.click(clearBtn)

    await waitFor(() => {
      expect(screen.getByText(/Bloco PL-202/i)).toBeInTheDocument()
      expect(screen.getByText(/Bloco SB-303/i)).toBeInTheDocument()
      expect(screen.getByText('15,000 t')).toBeInTheDocument()
    })
  })

  it('4. Resiliência SAP: com dados vazios da integração SAP, exibe estado vazio honesto sem parecer falha de conexão', async () => {
    vi.mocked(mpOptimizationService.getDimensionalInventory).mockResolvedValue([])
    vi.mocked(mpOptimizationService.getApplicationRequirements).mockResolvedValue([])
    vi.mocked(mpOptimizationService.getCuttingPlans).mockResolvedValue([])

    render(<MPCuttingPlansUnifiedPage />)

    await waitFor(() => {
      expect(screen.getByText('SEM MP DISPONÍVEL')).toBeInTheDocument()
    })

    // Deve exibir detalhes da transação SAP
    expect(screen.getByText(/ZPP86 \/ MB52/i)).toBeInTheDocument()
    // Métricas zeradas
    expect(screen.getAllByText('0,000 t').length).toBeGreaterThanOrEqual(2)
  })

  it('5. Filtros não quebram ao digitar busca sem resultados e exibem mensagem contextual amigável', async () => {
    vi.mocked(mpOptimizationService.getDimensionalInventory).mockResolvedValue(mockInventory)
    vi.mocked(mpOptimizationService.getApplicationRequirements).mockResolvedValue([])
    vi.mocked(mpOptimizationService.getCuttingPlans).mockResolvedValue([])

    render(<MPCuttingPlansUnifiedPage />)

    await waitFor(() => {
      expect(screen.getByTestId('filter-cutting-search-input')).toBeInTheDocument()
    })

    const input = screen.getByTestId('filter-cutting-search-input')
    fireEvent.change(input, { target: { value: 'TEXTO_INEXISTENTE_XYZ' } })

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum material encontrado com os filtros aplicados.'),
      ).toBeInTheDocument()
    })

    // Indicador 0/3 itens
    expect(screen.getByText(/0 itens/i)).toBeInTheDocument()
  })
})
