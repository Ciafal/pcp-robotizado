import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { AnalyticalModal } from '@/components/common/AnalyticalModal'
import { PortfolioABC } from '@/components/carteira-views/PortfolioABC'
import { PortfolioCharts } from '@/components/carteira-views/PortfolioCharts'
import { PortfolioDrilldown } from '@/components/carteira-views/PortfolioDrilldown'
import {
  ItemCurvaAbcCalculado,
  CurvaAbcResultadoConsolidado,
} from '@/services/curva-abc-faturamento-engine'

describe('AnalyticalModal and Analytical Views Acceptance', () => {
  const mockItens: ItemCurvaAbcCalculado[] = [
    {
      codigo_material: 'BAR-RED-25.4-1020',
      descricao_material: 'Barra Redonda 25.4mm SAE 1020',
      carteira_tons: 40.0,
      estoque_disponivel_tons: 0.0,
      programado_tons: 10.0,
      deficit_tons: 30.0,
      saldo_projetado_tons: -30.0,
      dias_cobertura: 0.0,
      faturamento_brl: 200000,
      participacao_individual_pct: 50.0,
      participacao_acumulada_pct: 50.0,
      curva_abc: 'A',
      risco: 'CRITICO',
      criticidade: 'CRITICA',
      centro: 'SDPL',
      linha: 'L1',
      familia: 'Barras Redondas',
      data_desejada: '2026-04-01',
      situacao: 'Déficit sem programação',
      tipo_carteira: 'L1',
      estoque_livre_tons: 0,
      estoque_qualidade_tons: 0,
      estoque_bloqueado_tons: 0,
      em_producao_tons: 0,
      entradas_previstas_tons: 0,
      saldo_atual_tons: -30,
    },
    {
      codigo_material: 'BAR-CH-50-1045',
      descricao_material: 'Barra Chata 50mm SAE 1045',
      carteira_tons: 20.0,
      estoque_disponivel_tons: 20.0,
      programado_tons: 0.0,
      deficit_tons: 0.0,
      saldo_projetado_tons: 0.0,
      dias_cobertura: 30.0,
      faturamento_brl: 120000,
      participacao_individual_pct: 30.0,
      participacao_acumulada_pct: 80.0,
      curva_abc: 'A',
      risco: 'NORMAL',
      criticidade: 'BAIXA',
      centro: 'SDPL',
      linha: 'L2',
      familia: 'Barras Chatas',
      data_desejada: '2026-04-01',
      situacao: 'Atendido pelo estoque',
      tipo_carteira: 'L2',
      estoque_livre_tons: 20,
      estoque_qualidade_tons: 0,
      estoque_bloqueado_tons: 0,
      em_producao_tons: 0,
      entradas_previstas_tons: 0,
      saldo_atual_tons: 0,
    },
    {
      codigo_material: 'PER-U-100',
      descricao_material: 'Perfil U 100mm Comercial',
      carteira_tons: 15.0,
      estoque_disponivel_tons: 5.0,
      programado_tons: 0.0,
      deficit_tons: 10.0,
      saldo_projetado_tons: -10.0,
      dias_cobertura: 10.0,
      faturamento_brl: 60000,
      participacao_individual_pct: 15.0,
      participacao_acumulada_pct: 95.0,
      curva_abc: 'B',
      risco: 'ATENCAO',
      criticidade: 'ALTA',
      centro: 'SDPL',
      linha: 'SDC',
      familia: 'Perfis',
      data_desejada: '2026-04-01',
      situacao: 'Cobertura parcial',
      tipo_carteira: 'SDC',
      estoque_livre_tons: 5,
      estoque_qualidade_tons: 0,
      estoque_bloqueado_tons: 0,
      em_producao_tons: 0,
      entradas_previstas_tons: 0,
      saldo_atual_tons: -10,
    },
    {
      codigo_material: 'CAN-L-30',
      descricao_material: 'Cantoneira L 30mm',
      carteira_tons: 5.0,
      estoque_disponivel_tons: 5.0,
      programado_tons: 0.0,
      deficit_tons: 0.0,
      saldo_projetado_tons: 0.0,
      dias_cobertura: 30.0,
      faturamento_brl: 20000,
      participacao_individual_pct: 5.0,
      participacao_acumulada_pct: 100.0,
      curva_abc: 'C',
      risco: 'NORMAL',
      criticidade: 'BAIXA',
      centro: 'SDPL',
      linha: 'SDC',
      familia: 'Cantoneiras',
      data_desejada: '2026-04-01',
      situacao: 'Atendido pelo estoque',
      tipo_carteira: 'SDC',
      estoque_livre_tons: 5,
      estoque_qualidade_tons: 0,
      estoque_bloqueado_tons: 0,
      em_producao_tons: 0,
      entradas_previstas_tons: 0,
      saldo_atual_tons: 0,
    },
  ]

  const mockResultadoABC: CurvaAbcResultadoConsolidado = {
    itens: mockItens,
    resumoA: {
      quantidade_itens: 2,
      toneladas: 60.0,
      faturamento_brl: 320000,
      percentual_faturamento: 80.0,
    },
    resumoB: {
      quantidade_itens: 1,
      toneladas: 15.0,
      faturamento_brl: 60000,
      percentual_faturamento: 15.0,
    },
    resumoC: {
      quantidade_itens: 1,
      toneladas: 5.0,
      faturamento_brl: 20000,
      percentual_faturamento: 5.0,
    },
    faturamentoTotal_brl: 400000,
    tonelagemTotal_t: 80.0,
    alertasPrioritariosCurvaA: [
      'Material BAR-RED-25.4-1020 pertence à Curva A, possui déficit de 30,00 t e não apresenta programação PCP suficiente para cobertura.',
    ],
    parametrosAplicados: {
      corteA_pct: 85,
      corteB_pct: 95,
      fonte_faturamento: 'SAP',
      preco_medio_tonelada_padrao_brl: 4850,
      considerar_apenas_faturamento: true,
    },
    fonteFaturamentoParametrizada: false,
  }

  it('deve renderizar o componente AnalyticalModal com 4 zonas estruturais e classes de layout corretas', () => {
    const handleClose = vi.fn()
    render(
      <AnalyticalModal
        isOpen={true}
        onClose={handleClose}
        size="analytical"
        badge="Painel Analítico"
        title="Teste de Modal Analítico"
        subtitle="Subtítulo descritivo com layout executivo"
        headerKpis={[{ label: 'Base', value: '4 materiais' }]}
        footer={<span>Rodapé de Teste</span>}
      >
        <div data-testid="modal-content">Conteúdo Analítico Principal</div>
      </AnalyticalModal>,
    )

    expect(screen.getByText('Teste de Modal Analítico')).toBeInTheDocument()
    expect(screen.getByText('Painel Analítico')).toBeInTheDocument()
    expect(screen.getByText('Base:')).toBeInTheDocument()
    expect(screen.getByText('4 materiais')).toBeInTheDocument()
    expect(screen.getByTestId('modal-content')).toBeInTheDocument()
    expect(screen.getByText('Rodapé de Teste')).toBeInTheDocument()
  })

  it('deve possuir dimensionamento analítico expandido quase fullscreen (min(96vw, 1800px) e altura 94vh)', () => {
    const handleClose = vi.fn()
    render(
      <AnalyticalModal
        isOpen={true}
        onClose={handleClose}
        size="analytical"
        title="Teste de Dimensionamento Quase Fullscreen"
      >
        <div data-testid="modal-content">Conteúdo</div>
      </AnalyticalModal>,
    )

    const dialogEl = screen.getByRole('dialog')
    expect(dialogEl.className).toContain('min(96vw,1800px)')
    expect(dialogEl.className).toContain('94vh')
    expect(dialogEl.className).toContain('modal-analitico')
  })

  it('deve renderizar o PortfolioABC com cards Curva A/B/C e sem quebras indevidas', () => {
    const handleClose = vi.fn()
    render(<PortfolioABC isOpen={true} onClose={handleClose} resultadoABC={mockResultadoABC} />)

    expect(screen.getByText('Curva ABC & Diagrama de Pareto Comercial')).toBeInTheDocument()
    // Badges Curva A, B e C
    expect(screen.getAllByText(/Curva A/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Curva B/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Curva C/i).length).toBeGreaterThan(0)
    // Validação de texto limpo de alerta
    expect(
      screen.getByText(/Alerta Prioritário • Ruptura Comercial na Curva A/i),
    ).toBeInTheDocument()
  })

  it('deve renderizar o PortfolioCharts com navegação por abas uniforme', () => {
    const handleClose = vi.fn()
    render(
      <PortfolioCharts
        isOpen={true}
        onClose={handleClose}
        tituloCarteira="Carteira Consolidada"
        itens={mockItens}
      />,
    )

    expect(screen.getByText('Análise Gráfica • Carteira Consolidada')).toBeInTheDocument()
    expect(screen.getByText('Por Linha de Produção')).toBeInTheDocument()
    expect(screen.getByText('Por Centro SAP (WERKS)')).toBeInTheDocument()
    expect(screen.getByText('Por Família de Produtos')).toBeInTheDocument()
    expect(screen.getByText('Faixas de Cobertura')).toBeInTheDocument()
    expect(screen.getByText('Matriz de Criticidade')).toBeInTheDocument()
  })

  it('deve renderizar o PortfolioDrilldown com toolbar responsiva e filtros', () => {
    const handleClose = vi.fn()
    render(
      <PortfolioDrilldown isOpen={true} onClose={handleClose} curvaInicial="A" itens={mockItens} />,
    )

    expect(screen.getByText(/Detalhamento Analítico • Materiais Curva A/i)).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Buscar código, descrição ou material...'),
    ).toBeInTheDocument()
    expect(screen.getByText('Apenas com Déficit')).toBeInTheDocument()
    expect(screen.getByText('Todas as Curvas')).toBeInTheDocument()
    expect(screen.getByText('BAR-RED-25.4-1020')).toBeInTheDocument()
  })
})
