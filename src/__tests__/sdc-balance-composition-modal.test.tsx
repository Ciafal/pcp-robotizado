import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SdcBalanceCompositionModal } from '@/components/mp-optimization/SdcBalanceCompositionModal'
import { MPSdcSteelMatrixRow } from '@/types/mp-optimization'
import { mpSdcService } from '@/services/mp-sidercentro-service'

vi.mock('@/services/mp-sidercentro-service', () => {
  return {
    mpSdcService: {
      getStockTraceability: vi.fn(),
    },
  }
})

describe('SdcBalanceCompositionModal — Rastreabilidade e Composição do Saldo', () => {
  const mockRow: MPSdcSteelMatrixRow = {
    id: 'row-1',
    steel_grade: '1045',
    steel_class: 'SAE 1045 Tratado',
    material_code: '1045',
    material_description: 'SAE 1045 Tratado',
    pool_code: 'POOL_1045',
    stock_sdc_ds03_tons: 32.0,
    stock_ciafal_dp04_tons: 10.0,
    stock_ciafal_eligible_tons: 10.0,
    stock_ks_tons: 5.0,
    stock_thin_plates_tons: 2.5,
    stock_usable_scrap_sdc_tons: 1.2,
    expected_receipts_tons: 15.0,
    total_stock_tons: 65.7,
    projected_l2_useful_tons: 50.0,
    projected_consumption_sdc_tons: 40.0,
    projected_balance_tons: 75.7,
    min_stock_tons: 40.0,
    statistical_coverage_days: 28,
    chronological_coverage_date: '15/10/2026',
    need_mp_tons: 0,
    eligible_alternatives_json: [],
    rupture_risk_level: 'VERDE',
    auto_conclusion: 'ESTOQUE_ADEQUADO',
    drilldown_batches_count: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza o campo "Código / Material" com código SAP e descrição', async () => {
    vi.mocked(mpSdcService.getStockTraceability).mockResolvedValue({
      success: true,
      material_code: '1045',
      material_description: 'SAE 1045 Tratado',
      items: [
        {
          source: 'Estoque SDC (Depósito DS03)',
          plantCenterDeposit: 'SDC1 / DS03',
          freeUseTons: 32.0,
          qualityTons: 5.0,
          blockedTons: 1.0,
          eligibility: '100% Liberado',
          rule: 'Material em pátio SDC',
          type: 'PROPRIO_SDC',
        },
      ],
    })

    render(<SdcBalanceCompositionModal isOpen={true} onClose={vi.fn()} row={mockRow} />)

    const identityContainer = await screen.findByTestId('traceability-material-identity')
    expect(identityContainer).toBeInTheDocument()
    expect(identityContainer).toHaveTextContent(/1045 — SAE 1045 Tratado/i)
  })

  it('exibe as colunas renomeadas "Centro / Depósito" e "Utilização livre", e as novas colunas "Qualidade t" e "Bloqueado t"', async () => {
    vi.mocked(mpSdcService.getStockTraceability).mockResolvedValue({
      success: true,
      material_code: '1045',
      items: [
        {
          source: 'Estoque SDC (Depósito DS03)',
          plantCenterDeposit: 'SDC1 / DS03',
          freeUseTons: 32.0,
          qualityTons: 5.0,
          blockedTons: 1.0,
          eligibility: '100% Liberado',
          rule: 'Material exclusivo no pátio físico SDC',
          type: 'PROPRIO_SDC',
        },
      ],
    })

    render(<SdcBalanceCompositionModal isOpen={true} onClose={vi.fn()} row={mockRow} />)

    // Cabeçalhos
    expect(
      await screen.findByRole('columnheader', { name: /Centro \/ Depósito/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Utilização livre/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Qualidade t/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Bloqueado t/i })).toBeInTheDocument()

    // Não deve conter a coluna antiga "Proprietário"
    expect(screen.queryByRole('columnheader', { name: /^Proprietário$/i })).toBeNull()

    // Valores com 3 casas e unidade 't'
    expect(screen.getByText('32,000 t')).toBeInTheDocument()
    expect(screen.getByText('5,000 t')).toBeInTheDocument()
    expect(screen.getByText('1,000 t')).toBeInTheDocument()
  })

  it('quando a RFC não retorna dados para um tipo, mostra estado honesto "Dado não disponível" e NUNCA zero', async () => {
    vi.mocked(mpSdcService.getStockTraceability).mockResolvedValue({
      success: true,
      material_code: '1045',
      items: [
        {
          source: 'Estoque CIAFAL (Depósito DP04)',
          plantCenterDeposit: 'CFPL / DP04',
          freeUseTons: 10.0,
          qualityTons: null, // Sem dado da RFC
          blockedTons: null, // Sem dado da RFC
          eligibility: 'Liberado por Regra Técnica',
          rule: 'Cessão autorizada',
          type: 'CIAFAL_ELEGIVEL',
        },
      ],
    })

    render(<SdcBalanceCompositionModal isOpen={true} onClose={vi.fn()} row={mockRow} />)

    expect(await screen.findByText('10,000 t')).toBeInTheDocument()
    const unavailableLabels = screen.getAllByText('Dado não disponível')
    expect(unavailableLabels.length).toBeGreaterThanOrEqual(2)
  })

  it('exibe estado de erro amigável com botão "Tentar novamente" em falha na chamada', async () => {
    vi.mocked(mpSdcService.getStockTraceability).mockResolvedValue({
      success: false,
      material_code: '1045',
      items: [],
      code: 'SAP_RFC_ERROR',
      message: 'Não foi possível carregar os dados de rastreabilidade no momento. Tente novamente.',
    })

    render(<SdcBalanceCompositionModal isOpen={true} onClose={vi.fn()} row={mockRow} />)

    expect(await screen.findByTestId('traceability-error')).toBeInTheDocument()
    expect(
      screen.getByText(
        /Não foi possível carregar os dados de rastreabilidade no momento. Tente novamente./i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument()
  })

  it('exibe estado vazio quando retorno da RFC for lista vazia', async () => {
    vi.mocked(mpSdcService.getStockTraceability).mockResolvedValue({
      success: true,
      material_code: '1045',
      items: [],
    })

    render(<SdcBalanceCompositionModal isOpen={true} onClose={vi.fn()} row={mockRow} />)

    expect(await screen.findByTestId('traceability-empty')).toBeInTheDocument()
    expect(
      screen.getByText(/Nenhum dado de rastreabilidade encontrado para este material/i),
    ).toBeInTheDocument()
  })
})
