import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MPSidercentroSubpage } from '@/pages/mp-optimization/MPSidercentroSubpage'

// Mock de serviços para renderização imediata do componente
vi.mock('@/services/mp-sidercentro-service', () => {
  return {
    mpSdcService: {
      getStockSources: vi.fn().mockResolvedValue([]),
      getPools: vi
        .fn()
        .mockResolvedValue([{ pool_code: 'POOL_AC_B', pool_name: 'Pool Aço Carbono / Classe B' }]),
      getMinStockParameters: vi.fn().mockResolvedValue([]),
      getDailyConsumptions: vi.fn().mockResolvedValue([]),
      getL2PlannedVsRealized: vi.fn().mockResolvedValue([]),
      getSteelMatrixRows: vi.fn().mockResolvedValue([]),
      calculateCockpitKpis: vi.fn().mockReturnValue({
        stock_sdc_tons: 150,
        stock_ciafal_eligible_tons: 50,
        stock_ks_eligible_tons: 10,
        stock_usable_scrap_tons: 5,
        projected_l2_prod_tons: 80,
        programmed_sdc_consumption_tons: 120,
        projected_balance_tons: 175,
        avg_coverage_days: 18,
        steels_below_min_count: 0,
        l2_adherence_pct: 95,
        first_rupture_steel: 'Nenhuma',
        first_rupture_date: 'N/A',
      }),
      generateRuptureAlerts: vi.fn().mockReturnValue([]),
    },
    initialSdcPools: [],
  }
})

describe('MPSidercentroSubpage — Correção de UI do Cabeçalho GESTÃO DE MATÉRIA-PRIMA', () => {
  it('1. NÃO deve exibir os botões "Comparar c/ Legado" e "Fontes & Depósitos"', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/gestao-materia-prima/sidercentro']}>
        <MPSidercentroSubpage />
      </MemoryRouter>,
    )

    // Os botões removidos não devem existir no documento
    expect(screen.queryByText(/Comparar c\/ Legado/i)).toBeNull()
    expect(screen.queryByText(/Fontes & Depósitos/i)).toBeNull()
  })

  it('2. DEVE preservar os botões "Pools de MP", "Estoque Mínimo" e "Simular Cenário"', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/gestao-materia-prima/sidercentro']}>
        <MPSidercentroSubpage />
      </MemoryRouter>,
    )

    // Os botões que devem permanecer visíveis e acessíveis
    expect(screen.getByRole('button', { name: /Pools de MP/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Estoque Mínimo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Simular Cenário/i })).toBeInTheDocument()
  })

  it('3. DEVE renderizar os cards principais do cockpit de disponibilidade e projeção', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/gestao-materia-prima/sidercentro']}>
        <MPSidercentroSubpage />
      </MemoryRouter>,
    )

    expect(screen.getByText('GESTÃO DE MATÉRIA-PRIMA')).toBeInTheDocument()
    expect(screen.getByText('Disponibilidade & Projeção — Sidercentro')).toBeInTheDocument()
    expect(screen.getByText(/Estoque SDC \(DS03\)/i)).toBeInTheDocument()
    expect(screen.getByText(/CIAFAL Elegível \(DP04\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Produção Prevista L2/i)).toBeInTheDocument()
    expect(screen.getByText(/Consumo Programado SDC/i)).toBeInTheDocument()
    expect(screen.getByText(/Saldo Projetado/i)).toBeInTheDocument()
  })
})
