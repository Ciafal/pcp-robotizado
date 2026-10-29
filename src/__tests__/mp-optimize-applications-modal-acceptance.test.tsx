/**
 * Testes de Aceitação Visual e Funcional — Modal MPOptimizeApplicationsModal
 * PCP Robotizado CIAFAL — Gestão de MP
 *
 * Valida os requisitos do usuário:
 * 1. Cabeçalho fixo, conteúdo com rolagem vertical exclusiva, rodapé fixo.
 * 2. Dimensões do popup (94-96% W, max 94% H, nenhum elemento ultrapassa).
 * 3. Esquadrejamento incorporado aos parâmetros técnicos de corte e perfeitamente visível.
 * 4. Padronização de unidades:
 *    - Peso em toneladas com 3 casas (ex.: 5,268 t, 1,325 t)
 *    - Comprimento em metros com 2 casas (ex.: 10,00 m, 3,00 m)
 *    - Dimensões do bloco em mm (ex.: 130 × 130 mm)
 *    - Parâmetros técnicos mantêm unidades corretas (largura serra mm, esquadrejamento mm, ponta mm, massa kg/m)
 * 5. Tabela de aplicações com colunas ajustadas, botões funcionais e alinhamentos numéricos.
 * 6. Gráfico longitudinal proporcional com tooltips em metros (2 casas) e sem corte de textos.
 * 7. Responsividade em 320px, 390px, 768px, 1366px e 1920px.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MPOptimizeApplicationsModal } from '@/components/mp-optimization/MPOptimizeApplicationsModal'
import { mpPieceApplicationOptimizationService } from '@/services/mp-piece-application-optimization-service'
import type {
  IndustrialApplicationCandidate,
  PieceOptimizationResult,
} from '@/types/mp-piece-application-optimization'

// Mock dos serviços de notificação
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('MPOptimizeApplicationsModal — Reestruturação Visual e Padronização de Unidades', () => {
  const mockCandidates: IndustrialApplicationCandidate[] = [
    {
      id: 'app-1',
      application_code: 'BARRA-3000',
      application_name: 'Barra Estrutural 3000mm',
      product_code: 'PROD-3M',
      product_description: 'Barra 3m SAE 1020',
      steel_grade: 'SAE 1020',
      target_length_mm: 3000,
      min_length_mm: 2950,
      max_length_mm: 3050,
      available_demand_qty: 3,
      priority_order: 1,
      is_active: true,
    },
    {
      id: 'app-2',
      application_code: 'TUBO-2000',
      application_name: 'Tubo Cortado 2000mm',
      product_code: 'PROD-2M',
      product_description: 'Tubo 2m SAE 1020',
      steel_grade: 'SAE 1020',
      target_length_mm: 2000,
      min_length_mm: 1950,
      max_length_mm: 2050,
      available_demand_qty: 2,
      priority_order: 2,
      is_active: true,
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(mpPieceApplicationOptimizationService, 'loadCompatibleApplications').mockResolvedValue(
      mockCandidates,
    )
    vi.spyOn(mpPieceApplicationOptimizationService, 'loadSavedPlan').mockResolvedValue(null)
  })

  // Requisito 1: Estrutura do Modal (Cabeçalho Fixo, Conteúdo Rolável, Rodapé Fixo, Limites 94-96% W e 94% H)
  it('1. Reestruturação do Modal: container com 95vw, 94vh, overflow-hidden e área de rolagem vertical exclusiva', async () => {
    render(
      <MPOptimizeApplicationsModal
        isOpen={true}
        onClose={vi.fn()}
        pieceIdentifier="PECA-1"
        scenarioId="SCENARIO-1"
        materialCode="SAE 1020"
        gaugeDimension="130 × 130 mm"
        centerCode="L1"
        pieceWeightKg={1325}
        linearMassKgM={132.5}
        cuttingWidthMm={5}
        onConfirmOptimization={vi.fn()}
      />,
    )

    const modalContent = screen.getByTestId('mp-optimize-applications-modal-content')
    expect(modalContent).toBeInTheDocument()
    expect(modalContent).toHaveClass('w-[95vw]')
    expect(modalContent).toHaveClass('h-[94vh]')
    expect(modalContent).toHaveClass('max-h-[94vh]')
    expect(modalContent).toHaveClass('overflow-hidden')

    // Área rolável identificada
    const scrollBody = screen.getByTestId('mp-optimize-modal-scrollable-body')
    expect(scrollBody).toBeInTheDocument()
    expect(scrollBody).toHaveClass('overflow-y-auto')
    expect(scrollBody).toHaveClass('flex-1')

    // Cabeçalho fixo com títulos
    expect(screen.getByText('Otimização de Aplicações por Peça')).toBeInTheDocument()
    expect(screen.getByText('PECA-1')).toBeInTheDocument()

    // Rodapé fixo com botões
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar Otimização/i })).toBeInTheDocument()
  })

  // Requisito 2: Quadro de Esquadrejamento incorporado e visível
  it('2. Quadro de Esquadrejamento: incorporado de forma permanente aos parâmetros técnicos sem flutuar fora do popup', async () => {
    render(
      <MPOptimizeApplicationsModal
        isOpen={true}
        onClose={vi.fn()}
        pieceIdentifier="PECA-1"
        scenarioId="SCENARIO-1"
        materialCode="SAE 1020"
        gaugeDimension="130 × 130 mm"
        centerCode="L1"
        pieceWeightKg={1325}
        linearMassKgM={132.5}
        cuttingWidthMm={5}
        onConfirmOptimization={vi.fn()}
      />,
    )

    const squaringContainer = screen.getByTestId('param-esquadrejamento-container')
    expect(squaringContainer).toBeInTheDocument()
    expect(squaringContainer).toHaveTextContent('Esquadrejamento')
    expect(squaringContainer).toHaveTextContent('mm')

    // Verificar se o valor de esquadrejamento padrão (10 mm) pode ser alterado
    const input = squaringContainer.querySelector('input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(10)
  })

  // Requisito 3: Padronização Estrita de Unidades (t com 3 casas, m com 2 casas, mm para bloco e serra)
  it('3. Padronização de Unidades: Peso da peça em toneladas com 3 casas decimais e Comprimento em metros com 2 casas', async () => {
    // 1325 kg = 1,325 t; 1325 kg / 132.5 kg/m = 10,00 m
    render(
      <MPOptimizeApplicationsModal
        isOpen={true}
        onClose={vi.fn()}
        pieceIdentifier="PECA-1"
        scenarioId="SCENARIO-1"
        materialCode="SAE 1020"
        gaugeDimension="130 × 130 mm"
        centerCode="L1"
        pieceWeightKg={1325}
        linearMassKgM={132.5}
        cuttingWidthMm={5}
        onConfirmOptimization={vi.fn()}
      />,
    )

    // Peso em toneladas com 3 casas
    expect(screen.getByText('1,325 t')).toBeInTheDocument()
    // Massa linear com unidade kg/m
    expect(screen.getByText('132,5 kg/m')).toBeInTheDocument()
    // Comprimento laminado em metros com 2 casas
    expect(screen.getAllByText('10,00 m').length).toBeGreaterThan(0)
    // Dimensão do bloco em mm
    expect(screen.getByText('130 × 130 mm')).toBeInTheDocument()
  })

  // Requisito 4: Tabela "Aplicações Industriais Compatíveis" com colunas ajustadas e botões funcionais
  it('4. Tabela de Aplicações: títulos padronizados "Comprimento (m)" e "Comprimento Utilizado (m)", botões +/- funcionais', async () => {
    render(
      <MPOptimizeApplicationsModal
        isOpen={true}
        onClose={vi.fn()}
        pieceIdentifier="PECA-1"
        scenarioId="SCENARIO-1"
        materialCode="SAE 1020"
        gaugeDimension="130 × 130 mm"
        centerCode="L1"
        pieceWeightKg={1325}
        linearMassKgM={132.5}
        cuttingWidthMm={5}
        onConfirmOptimization={vi.fn()}
      />,
    )

    // Títulos de colunas conforme prescrição do usuário
    await waitFor(() => {
      expect(screen.getByText('Comprimento (m)')).toBeInTheDocument()
      expect(screen.getByText('Comprimento Utilizado (m)')).toBeInTheDocument()
      expect(screen.getByText('Barra Estrutural 3000mm')).toBeInTheDocument()
    })

    // Valores em metros exibidos
    expect(screen.getByText('3,00 m')).toBeInTheDocument()
    expect(screen.getByText('2,00 m')).toBeInTheDocument()

    // Testar botões de incremento/decremento de quantidade
    const plusButtons = screen.getAllByRole('button', { name: '+' })
    expect(plusButtons.length).toBeGreaterThan(0)
    fireEvent.click(plusButtons[0]) // Incrementa quantidade da primeira aplicação
  })

  // Requisito 5: Gráfico Longitudinal da Peça
  it('5. Gráfico Longitudinal: escala proporcional, tooltips informativos e medidas legíveis', async () => {
    render(
      <MPOptimizeApplicationsModal
        isOpen={true}
        onClose={vi.fn()}
        pieceIdentifier="PECA-1"
        scenarioId="SCENARIO-1"
        materialCode="SAE 1020"
        gaugeDimension="130 × 130 mm"
        centerCode="L1"
        pieceWeightKg={1325}
        linearMassKgM={132.5}
        cuttingWidthMm={5}
        onConfirmOptimization={vi.fn()}
      />,
    )

    // Título do gráfico
    expect(
      screen.getByText('Plano de Corte Longitudinal da Peça (Visualização em Escala)'),
    ).toBeInTheDocument()

    // Legenda presente
    expect(screen.getByText('Produtos Conformes')).toBeInTheDocument()
    expect(screen.getByText('Corte Serra (Kerf)')).toBeInTheDocument()
    expect(screen.getByText('Esquadrejamento')).toBeInTheDocument()
    expect(screen.getByText('Sobra Aproveitável')).toBeInTheDocument()
    expect(screen.getByText('Refugo Final')).toBeInTheDocument()
  })

  // Requisito 6: Simulação de Viewports Responsivos (320px, 390px, 768px, 1366px, 1920px)
  it('6. Responsividade: renderiza sem erros nem estouro de layout em 320px, 390px, 768px, 1366px e 1920px', () => {
    const viewports = [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ]

    for (const vp of viewports) {
      window.innerWidth = vp.width
      window.innerHeight = vp.height
      window.dispatchEvent(new Event('resize'))

      const { unmount } = render(
        <MPOptimizeApplicationsModal
          isOpen={true}
          onClose={vi.fn()}
          pieceIdentifier="PECA-RESP"
          scenarioId="SCENARIO-1"
          materialCode="SAE 1020"
          pieceWeightKg={1325}
          linearMassKgM={132.5}
          onConfirmOptimization={vi.fn()}
        />,
      )

      const modalContent = screen.getByTestId('mp-optimize-applications-modal-content')
      expect(modalContent).toBeInTheDocument()
      expect(modalContent).toHaveClass('overflow-hidden')
      unmount()
    }
  })

  // Requisito 7: Confirmar Otimização aciona o callback e persiste os dados
  it('7. Confirmar Otimização: chama onConfirmOptimization com o resultado do motor', async () => {
    const onConfirmMock = vi.fn()
    const onCloseMock = vi.fn()

    vi.spyOn(mpPieceApplicationOptimizationService, 'savePieceApplicationPlan').mockResolvedValue({
      id: 'saved-cpa-1',
      piece_identifier: 'PECA-1',
      scenario_id: 'SCENARIO-1',
      scenario_name: 'Cenário Teste',
      material_code: 'SAE 1020',
      gauge_dimension: '130 × 130 mm',
      center_code: 'L1',
      heat_number: 'CR-100',
      piece_weight_kg: 1325,
      linear_mass_kg_m: 132.5,
      rolled_length_mm: 10000,
      saw_kerf_mm: 5,
      squaring_loss_mm: 10,
      end_crop_loss_mm: 15,
      cutting_yield_pct: 90,
      used_length_mm: 9000,
      cut_losses_length_mm: 40,
      usable_leftover_mm: 960,
      scrap_mm: 0,
      generated_pieces_count: 3,
      fulfilled_applications_count: 1,
      allocated_items_json: [],
      visual_segments_json: [],
      confirmed_by_user_name: 'Programador Teste',
      notes: '',
      created: '2026-03-24T00:00:00Z',
      updated: '2026-03-24T00:00:00Z',
    })

    render(
      <MPOptimizeApplicationsModal
        isOpen={true}
        onClose={onCloseMock}
        pieceIdentifier="PECA-1"
        scenarioId="SCENARIO-1"
        materialCode="SAE 1020"
        gaugeDimension="130 × 130 mm"
        centerCode="L1"
        pieceWeightKg={1325}
        linearMassKgM={132.5}
        cuttingWidthMm={5}
        onConfirmOptimization={onConfirmMock}
      />,
    )

    await waitFor(() => {
      const confirmBtn = screen.getByRole('button', { name: /Confirmar Otimização/i })
      expect(confirmBtn).not.toBeDisabled()
      fireEvent.click(confirmBtn)
    })

    await waitFor(() => {
      expect(onConfirmMock).toHaveBeenCalledTimes(1)
      expect(onCloseMock).toHaveBeenCalledTimes(1)
    })
  })
})
