import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EfficiencyCenterCards } from '@/components/control-tower/efficiency/EfficiencyCenterCards'
import { EfficiencyUnifiedFilterBar } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import { EfficiencyCenterHierarchyView } from '@/components/control-tower/efficiency/EfficiencyCenterHierarchyView'
import { ProductEfficiencyCardsView } from '@/components/control-tower/efficiency/ProductEfficiencyCardsView'
import { LineEfficiencyCardsView } from '@/components/control-tower/efficiency/LineEfficiencyCardsView'
import { PlantEfficiencyCardsView } from '@/components/control-tower/efficiency/PlantEfficiencyCardsView'
import { CenterEfficiencyRow } from '@/services/efficiency-center-service'

describe('Previsto x Realizado - UI/UX CIAFAL e Responsividade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('EfficiencyCenterCards - Grid Responsivo e Labels Completas', () => {
    const mockSummary = {
      totalCenters: 14,
      totalPlannedTons: 4087.0,
      totalRealizedTons: 3908.75,
      overallAdherencePct: 95.83,
      withinPlannedCount: 10,
      withinPlannedPct: 71.4,
      delayedCount: 4,
      delayedPct: 28.6,
      estimatedImpactTons: 178.25,
    }

    it('exibe labels completas sem truncamento e formatação pt-BR correta', () => {
      render(<EfficiencyCenterCards summary={mockSummary} loading={false} />)

      // Labels completas obrigatórias
      expect(screen.getByText('Centros avaliados')).toBeDefined()
      expect(screen.getByText('Produção prevista')).toBeDefined()
      expect(screen.getByText('Produção realizada')).toBeDefined()
      expect(screen.getByText('Aderência ao planejado')).toBeDefined()
      expect(screen.getByText('Centros no planejado')).toBeDefined()
      expect(screen.getByText('Centros com atraso')).toBeDefined()
      expect(screen.getByText('Impacto do desvio')).toBeDefined()

      // Valores numéricos formatados em pt-BR
      expect(screen.getByText('14')).toBeDefined()
      expect(screen.getByText('4.087,00 t')).toBeDefined()
      expect(screen.getByText('3.908,75 t')).toBeDefined()
      expect(screen.getByText('95,8%')).toBeDefined()
      expect(screen.getByText('178,25 t')).toBeDefined()
    })

    it('renderiza com grid responsivo sem classe rígida lg:grid-cols-7', () => {
      const { container } = render(<EfficiencyCenterCards summary={mockSummary} loading={false} />)
      const grid = container.firstChild as HTMLElement
      expect(grid.className).not.toContain('lg:grid-cols-7')
      expect(grid.className).toContain('grid-cols-1')
      expect(grid.className).toContain('xl:grid-cols-4')
    })
  })

  describe('EfficiencyUnifiedFilterBar - Hierarquia Reativa Empresa -> Planta -> Linha -> Centro', () => {
    const mockOptions = {
      companies: [
        { code: 'CIAFAL', name: 'CIAFAL Matriz' },
        { code: 'SIDER', name: 'Siderúrgica CIAFAL' },
      ],
      plants: [
        { code: 'DIV', name: 'Divinópolis', companyCode: 'CIAFAL' },
        { code: 'BH', name: 'Belo Horizonte', companyCode: 'CIAFAL' },
        { code: 'SIDER_P1', name: 'Planta Siderúrgica 1', companyCode: 'SIDER' },
      ],
      lines: [
        { code: 'L1', name: 'Laminação', plantCode: 'DIV' },
        { code: 'L2', name: 'Trefilação', plantCode: 'DIV' },
        { code: 'L3', name: 'Corte e Dobra', plantCode: 'BH' },
      ],
      centers: [
        { code: 'TREFILA_1', name: 'Trefila 01', lineCode: 'L2' },
        { code: 'ACAB_L2', name: 'Acabamento L2', lineCode: 'L2' },
      ],
    }

    it('renderiza os botões agrupados Limpar Filtros e Atualizar', () => {
      const onReset = vi.fn()
      const onRefresh = vi.fn()
      render(
        <EfficiencyUnifiedFilterBar
          filters={{ companyCode: 'CIAFAL', plantCode: 'DIV', lineCode: 'L2' }}
          options={mockOptions}
          onChange={() => {}}
          onReset={onReset}
          onRefresh={onRefresh}
        />,
      )

      const btnLimpar = screen.getByText('Limpar filtros')
      expect(btnLimpar).toBeDefined()
      fireEvent.click(btnLimpar)
      expect(onReset).toHaveBeenCalledTimes(1)

      const btnAtualizar = screen.getByText('Atualizar')
      expect(btnAtualizar).toBeDefined()
      fireEvent.click(btnAtualizar)
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('EfficiencyCenterHierarchyView - Agrupamento Planta -> Linha -> Centro com expansão inline', () => {
    const mockRows: CenterEfficiencyRow[] = [
      {
        companyCode: 'CIAFAL',
        plantCode: 'DIV',
        lineCode: 'L2',
        lineName: 'Trefilação e Acabamento',
        centerCode: 'ACAB_L2',
        centerName: 'ACABAMENTO L2',
        plannedQuantityTons: 120.0,
        realizedQuantityTons: 115.0,
        differenceTons: -5.0,
        adherencePct: 95.83,
        status: 'ATENCAO',
        delayMinutes: 10,
        plannedProductName: 'TELA SOLDADA Q-138',
        plannedProductCode: 'TQ-50',
        plannedStart: '2025-05-10T08:00:00',
        realStart: '2025-05-10T08:10:00',
        ordersCount: 1,
        programacaoOrigem: {
          scheduleCode: 'PROG-2025-W19',
          version: 1,
          status: 'PUBLICADO',
          totalItems: 1,
        },
        mesAvailable: true,
        details: [
          {
            orderNumber: 'OP-2024-001',
            productCode: 'TQ-50',
            productDescription: 'Tela Soldada Nervurada',
            scheduledSequence: 1,
            plannedQuantityTons: 60.0,
            realizedQuantityTons: 58.0,
            plannedStart: '2025-05-10T08:00:00',
            plannedEnd: '2025-05-10T12:00:00',
            realStart: '2025-05-10T08:10:00',
            realEnd: '2025-05-10T12:20:00',
            stopsCount: 0,
            stopsDurationMinutes: 0,
            hasDeviation: true,
            deviationReason: 'Ajuste de malha',
            operationalImpact: null,
            mesStatus: 'CONCLUIDA',
            sapStatus: 'CONF',
            postingsCount: 1,
          },
        ],
      },
    ]

    it('exibe o card resumido do centro e expande inline sem navegar', () => {
      render(<EfficiencyCenterHierarchyView rows={mockRows} loading={false} />)

      // Identificação da planta, linha e centro
      expect(screen.getByText('CIAFAL • Planta DIV')).toBeDefined()
      expect(screen.getByText(/Linha L2/)).toBeDefined()
      expect(screen.getByText('ACABAMENTO L2')).toBeDefined()
      expect(screen.getByText('120,00 t')).toBeDefined()
      expect(screen.getByText('115,00 t')).toBeDefined()
      expect(screen.getByText('95,8%')).toBeDefined()
      expect(screen.getByText('-5,00 t')).toBeDefined()

      // Antes de expandir, os detalhes internos não estão visíveis
      expect(screen.queryByText('OP-2024-001')).toBeNull()

      // Clicar em "Ver detalhes"
      const expandBtn = screen.getByText('Ver detalhes')
      fireEvent.click(expandBtn)

      // Após expansão inline
      expect(screen.getByText('OP-2024-001')).toBeDefined()
      expect(screen.getByText('Tela Soldada Nervurada')).toBeDefined()
      expect(screen.getByText('Ajuste de malha')).toBeDefined()
    })
  })

  describe('Consistência Responsiva de Cards (1920, 1366, 768, 375px)', () => {
    it('renderiza cards de produtos com identidade clara e sem overflow', () => {
      const mockProducts = [
        {
          id: 'p1',
          productCode: 'TQ-50',
          productName: 'Tela Soldada Q-138',
          familyCode: 'TELAS',
          lineCode: 'L2',
          plantCode: 'DIV',
          version: 1,
          currentEfficiencyPct: 96.0,
          expectedEfficiencyPct: 95.0,
          minEfficiencyPct: 90.0,
          plannedCapacityRatePerHour: 5.0,
          minCapacityRatePerHour: 4.0,
          maxCapacityRatePerHour: 6.0,
          standardSetupMinutes: 30,
          expectedYieldPct: 98.0,
          status: 'DENTRO_ESPERADO',
        },
      ]

      const { container } = render(
        <ProductEfficiencyCardsView products={mockProducts} onRunAiAnalysis={() => {}} />,
      )
      expect(screen.getByText('TQ-50')).toBeDefined()
      expect(screen.getByText('Tela Soldada Q-138')).toBeDefined()
      // Não deve ter overflow-x: hidden forçado
      expect(container.innerHTML).not.toContain('overflow-x: hidden')
    })

    it('renderiza cards de linhas com identidade clara e sem overflow', () => {
      const mockLines = [
        {
          id: 'l1',
          lineCode: 'L1',
          lineName: 'Laminação a Quente',
          plantCode: 'DIV',
          companyCode: 'CIAFAL',
          nominalCapacityTonsPerDay: 280,
          plannedTons: 1000,
          realizedTons: 980,
          adherencePct: 98.0,
          oeePct: 92.0,
          availabilityPct: 95.0,
          performancePct: 97.0,
          qualityPct: 99.0,
          status: 'DENTRO_ESPERADO',
        },
      ]

      const { container } = render(
        <LineEfficiencyCardsView lines={mockLines} onRunAiAnalysis={() => {}} />,
      )
      expect(screen.getByText('Laminação a Quente')).toBeDefined()
      expect(container.innerHTML).not.toContain('overflow-x: hidden')
    })

    it('renderiza cards de plantas com dados reais e sem overflow', () => {
      const mockPlants = [
        {
          id: 'pl1',
          companyCode: 'CIAFAL',
          plantCode: 'DIV',
          plantName: 'Planta Industrial Divinópolis',
          cityState: 'Divinópolis, MG',
          totalLinesCount: 2,
          totalCentersCount: 14,
          plannedTons: 2500,
          realizedTons: 2400,
          adherencePct: 96.0,
          occupancyPct: 90.0,
          lostCapacityTons: 100,
          status: 'DENTRO_ESPERADO',
        },
      ]

      const { container } = render(
        <PlantEfficiencyCardsView plants={mockPlants} onSelectPlant={() => {}} />,
      )
      expect(screen.getByText('Planta Industrial Divinópolis')).toBeDefined()
      expect(screen.getByText('Ver linhas da planta')).toBeDefined()
      expect(container.innerHTML).not.toContain('overflow-x: hidden')
    })
  })
})
