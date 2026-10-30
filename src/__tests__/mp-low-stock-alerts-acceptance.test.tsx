import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LowStockBadge, getLowStockStatus } from '@/components/mp-optimization/LowStockBadge'
import {
  LowStockAlertPanel,
  LowStockAlertItem,
} from '@/components/mp-optimization/LowStockAlertPanel'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { MPSidercentroSubpage } from '@/pages/mp-optimization/MPSidercentroSubpage'

// Mock dos serviços de Sidercentro para testes determinísticos
vi.mock('@/services/mp-sidercentro-service', () => {
  const mockRows = [
    {
      steel_grade: 'AC',
      steel_class: 'Comercial',
      pool_code: 'POOL_AC_B',
      stock_sdc_ds03_tons: 380.5,
      stock_ciafal_dp04_tons: 120.0,
      stock_ciafal_eligible_tons: 95.0,
      stock_ks_tons: 40.0,
      stock_thin_plates_tons: 15.0,
      stock_usable_scrap_sdc_tons: 22.5,
      expected_receipts_tons: 50.0,
      total_stock_tons: 603.0,
      projected_l2_useful_tons: 175.75,
      projected_consumption_sdc_tons: 245.0,
      projected_balance_tons: 533.75,
      min_stock_tons: 350.0,
      need_mp_tons: 0,
      statistical_coverage_days: 74,
      chronological_coverage_date: '08/11/2026',
      rupture_risk_level: 'VERDE',
      auto_conclusion: 'ESTOQUE_ADEQUADO',
      drilldown_batches_count: 14,
    },
    {
      steel_grade: 'Classe A',
      steel_class: 'Estrutural A',
      pool_code: 'POOL_A_C',
      stock_sdc_ds03_tons: 135.0,
      stock_ciafal_dp04_tons: 60.0,
      stock_ciafal_eligible_tons: 45.0,
      stock_ks_tons: 0,
      stock_thin_plates_tons: 0,
      stock_usable_scrap_sdc_tons: 8.0,
      expected_receipts_tons: 0,
      total_stock_tons: 188.0,
      projected_l2_useful_tons: 95.0,
      projected_consumption_sdc_tons: 150.0,
      projected_balance_tons: 133.0, // Abaixo do mínimo de 140 t (95%)
      min_stock_tons: 140.0,
      need_mp_tons: 7.0,
      statistical_coverage_days: 27,
      chronological_coverage_date: '20/09/2026',
      rupture_risk_level: 'AMARELO',
      auto_conclusion: 'ESTOQUE_ABAIXO_MINIMO',
      drilldown_batches_count: 8,
    },
    {
      steel_grade: '1045',
      steel_class: 'SAE 1045 Tratado',
      stock_sdc_ds03_tons: 32.0,
      stock_ciafal_dp04_tons: 10.0,
      stock_ciafal_eligible_tons: 5.0,
      stock_ks_tons: 0,
      stock_thin_plates_tons: 0,
      stock_usable_scrap_sdc_tons: 1.0,
      expected_receipts_tons: 0,
      total_stock_tons: 38.0,
      projected_l2_useful_tons: 32.9,
      projected_consumption_sdc_tons: 48.0,
      projected_balance_tons: 22.9, // Abaixo do mínimo de 40 t (57.25%)
      min_stock_tons: 40.0,
      need_mp_tons: 17.1,
      statistical_coverage_days: 14,
      chronological_coverage_date: '07/09/2026',
      rupture_risk_level: 'LARANJA',
      auto_conclusion: 'RISCO_RUPTURA',
      drilldown_batches_count: 2,
    },
  ]

  return {
    mpSdcService: {
      getStockSources: vi.fn().mockResolvedValue([]),
      getPools: vi.fn().mockResolvedValue([]),
      getMinStockParameters: vi.fn().mockResolvedValue([]),
      getDailyConsumptions: vi.fn().mockResolvedValue([]),
      getL2PlannedVsRealized: vi.fn().mockResolvedValue([]),
      getSteelMatrixRows: vi.fn().mockResolvedValue(mockRows),
      calculateCockpitKpis: vi.fn().mockReturnValue({
        stock_sdc_tons: 547.5,
        stock_ciafal_eligible_tons: 145.0,
        stock_ks_eligible_tons: 40.0,
        stock_usable_scrap_tons: 31.5,
        expected_entries_tons: 50.0,
        projected_l2_prod_tons: 303.65,
        programmed_sdc_consumption_tons: 443.0,
        projected_balance_tons: 689.65,
        steels_below_min_count: 2,
        first_rupture_date: '07/09/2026',
        first_rupture_steel: '1045',
        avg_coverage_days: 52,
        total_mp_need_tons: 24.1,
        l2_adherence_pct: 92.0,
      }),
      generateRuptureAlerts: vi.fn().mockReturnValue([]),
    },
    initialSdcSteelMatrixRows: mockRows,
  }
})

describe('Funcionalidade Alerta de Estoque Baixo — PCP Robotizado', () => {
  describe('1. Regras determinísticas da função getLowStockStatus', () => {
    it('retorna SEM_DADOS se hasSapData for falso ou valores forem nulos', () => {
      expect(getLowStockStatus(null, 100, true)).toBe('SEM_DADOS')
      expect(getLowStockStatus(50, null, true)).toBe('SEM_DADOS')
      expect(getLowStockStatus(50, 100, false)).toBe('SEM_DADOS')
      expect(getLowStockStatus(undefined, undefined, true)).toBe('SEM_DADOS')
    })

    it('retorna NORMAL se estoque mínimo for <= 0', () => {
      expect(getLowStockStatus(50, 0, true)).toBe('NORMAL')
      expect(getLowStockStatus(50, -10, true)).toBe('NORMAL')
    })

    it('retorna CRITICO quando estoque atual < estoque mínimo', () => {
      expect(getLowStockStatus(99.9, 100, true)).toBe('CRITICO')
      expect(getLowStockStatus(22.9, 40.0, true)).toBe('CRITICO')
      expect(getLowStockStatus(133.0, 140.0, true)).toBe('CRITICO')
    })

    it('retorna ATENCAO quando estoque atual está entre o mínimo e até 10% acima do mínimo', () => {
      expect(getLowStockStatus(100.0, 100.0, true)).toBe('ATENCAO')
      expect(getLowStockStatus(105.0, 100.0, true)).toBe('ATENCAO')
      expect(getLowStockStatus(110.0, 100.0, true)).toBe('ATENCAO')
    })

    it('retorna NORMAL quando estoque atual > 110% do mínimo', () => {
      expect(getLowStockStatus(110.1, 100.0, true)).toBe('NORMAL')
      expect(getLowStockStatus(350.0, 100.0, true)).toBe('NORMAL')
    })
  })

  describe('2. Componente LowStockBadge', () => {
    it('renderiza badge "Estoque Baixo" com cor rose e percentual para status CRITICO', () => {
      render(<LowStockBadge currentStockTons={50} minStockTons={100} hasSapData={true} />)
      const badge = screen.getByTestId('badge-estoque-baixo')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent(/Estoque Baixo/i)
      expect(badge).toHaveTextContent(/50,00 %/i)
    })

    it('renderiza badge "Atenção" para material na faixa <= 10% acima do mínimo', () => {
      render(<LowStockBadge currentStockTons={105} minStockTons={100} hasSapData={true} />)
      const badge = screen.getByTestId('badge-atencao')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent(/Atenção/i)
      expect(badge).toHaveTextContent(/105,00 %/i)
    })

    it('renderiza "Dado não disponível na integração SAP" e NUNCA zero quando sem dado SAP', () => {
      render(<LowStockBadge currentStockTons={null} minStockTons={null} hasSapData={false} />)
      const badge = screen.getByTestId('badge-sem-dados')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('Dado não disponível na integração SAP')
      expect(badge).not.toHaveTextContent('0')
    })
  })

  describe('3. Componente LowStockAlertPanel', () => {
    const mockItems: LowStockAlertItem[] = [
      {
        id: '1',
        code: '1045',
        description: 'SAE 1045 Tratado',
        currentStockTons: 22.9,
        minStockTons: 40.0,
        plantCenter: 'SDC1',
        storageDeposit: 'DS03',
        hasSapData: true,
      },
      {
        id: '2',
        code: 'Classe A',
        description: 'Estrutural A',
        currentStockTons: 133.0,
        minStockTons: 140.0,
        plantCenter: 'SDC1',
        storageDeposit: 'DS03',
        hasSapData: true,
      },
      {
        id: '3',
        code: 'AC',
        description: 'Comercial',
        currentStockTons: 533.75,
        minStockTons: 350.0,
        hasSapData: true,
      },
      {
        id: '4',
        code: 'SAP-SEM-DADOS',
        description: 'Material sem RFC',
        currentStockTons: null,
        minStockTons: 50.0,
        hasSapData: false,
      },
    ]

    it('filtra e exibe apenas materiais com déficit/atenção, descartando materiais sem dados SAP e normais', () => {
      render(<LowStockAlertPanel items={mockItems} />)
      // Deve exibir 1045 e Classe A
      expect(screen.getByTestId('low-stock-item-1045')).toBeInTheDocument()
      expect(screen.getByTestId('low-stock-item-Classe A')).toBeInTheDocument()

      // AC está normal e não deve constar na lista de alertas
      expect(screen.queryByTestId('low-stock-item-AC')).toBeNull()

      // SAP-SEM-DADOS não deve constar no alerta
      expect(screen.queryByTestId('low-stock-item-SAP-SEM-DADOS')).toBeNull()
    })

    it('ordena do mais crítico ao menos crítico (menor % do mínimo primeiro)', () => {
      render(<LowStockAlertPanel items={mockItems} />)
      const items = screen.getAllByTestId(/low-stock-item-/)
      // 1045 (22.9 / 40 = 57.25%) deve vir antes de Classe A (133 / 140 = 95%)
      expect(items[0]).toHaveAttribute('data-testid', 'low-stock-item-1045')
      expect(items[1]).toHaveAttribute('data-testid', 'low-stock-item-Classe A')
    })

    it('formata valores de peso em t com 3 casas no padrão pt-BR', () => {
      render(<LowStockAlertPanel items={mockItems} />)
      // 22.900 t e 40.000 t
      expect(screen.getByText('22,900 t')).toBeInTheDocument()
      expect(screen.getByText('40,000 t')).toBeInTheDocument()
    })

    it('executa a ação de detalhar repassando o item ao callback onSelectMaterial', () => {
      const onSelect = vi.fn()
      render(<LowStockAlertPanel items={mockItems} onSelectMaterial={onSelect} />)
      const detailButtons = screen.getAllByRole('button', { name: /Detalhar/i })
      fireEvent.click(detailButtons[0])
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ code: '1045' }))
    })

    it('exibe SapEmptyState quando não há materiais em alerta', () => {
      render(<LowStockAlertPanel items={[]} />)
      expect(
        screen.getByText(/NENHUM MATERIAL EM ESTOQUE BAIXO OU AGUARDANDO INTEGRAÇÃO SAP/i),
      ).toBeInTheDocument()
      expect(screen.getByText(/RFC ZPP86 \/ MB52/i)).toBeInTheDocument()
    })
  })

  describe('4. MPModuleLayout — Contador discreto no cabeçalho sem desalinhar botões', () => {
    it('renderiza o indicador discreto com contador de materiais críticos quando count > 0', () => {
      render(
        <MemoryRouter>
          <MPModuleLayout lowStockCount={3}>
            <div>Conteúdo</div>
          </MPModuleLayout>
        </MemoryRouter>,
      )

      const indicator = screen.getByTestId('mp-header-low-stock-indicator')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveTextContent('3 materiais críticos')
    })

    it('renderiza status de estoque regular quando count === 0', () => {
      render(
        <MemoryRouter>
          <MPModuleLayout lowStockCount={0}>
            <div>Conteúdo</div>
          </MPModuleLayout>
        </MemoryRouter>,
      )

      const indicator = screen.getByTestId('mp-header-low-stock-indicator-ok')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveTextContent('Estoque regular')
    })
  })

  describe('5. MPSidercentroSubpage — Preservação dos botões e nova aba de Alertas', () => {
    it('preserva os botões oficiais "Pools de MP", "Estoque Mínimo" e "Simular Cenário"', async () => {
      render(
        <MemoryRouter initialEntries={['/pcp/gestao-materia-prima/sidercentro']}>
          <MPSidercentroSubpage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('button', { name: /Pools de MP/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Estoque Mínimo/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Simular Cenário/i })).toBeInTheDocument()
    })

    it('renderiza a aba "Alertas de Estoque Baixo" e a coluna "Alerta Estoque" na Matriz', async () => {
      render(
        <MemoryRouter initialEntries={['/pcp/gestao-materia-prima/sidercentro']}>
          <MPSidercentroSubpage />
        </MemoryRouter>,
      )

      // Coluna da tabela
      expect(screen.getByRole('columnheader', { name: /Alerta Estoque/i })).toBeInTheDocument()

      // Aba de Alertas
      const tabAlertas = screen.getByRole('tab', { name: /Alertas de Estoque Baixo/i })
      expect(tabAlertas).toBeInTheDocument()

      // Ao clicar na aba, o painel Alertas de Estoque Baixo é exibido
      fireEvent.click(tabAlertas)
      expect(await screen.findByTestId('low-stock-alert-panel')).toBeInTheDocument()
    })
  })
})
