import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CarteiraMinimaNaoAtingidaPage } from '@/pages/CarteiraMinimaNaoAtingidaPage'
import { carteiraMinimaService } from '@/services/carteira-minima-service'
import { carteiraMinimaConsolidadaService } from '@/services/carteira-minima-consolidada-service'
import { CarteiraMinimaItem } from '@/types/carteira-minima'

// Mock dos serviços
const mockItens: CarteiraMinimaItem[] = [
  {
    id: 'item-1',
    material: '100010',
    descricao_material: 'BARRA CHATA 1" X 1/8" SAE 1020',
    carteira_tons: 12.0,
    estoque_livre_tons: 2.0,
    saldo_produzir_tons: 10.0,
    producao_minima_tons: 15.0,
    diferenca_minimo_tons: 5.0,
    pedido_venda: 'PED-101',
    item_pedido: '10',
    pedido_formatado: 'PED-101/10',
    data_desejada: '2025-05-10',
    tempo_ciclo_minutos: 40,
    tempo_ciclo_formatado: '40 min',
    centro: '1100',
    linha: 'L1',
    empresa: 'CIAFAL',
    criticidade: 'Crítico',
    motivo_criticidade: 'Saldo crítico',
    observacao_ia: 'Item com carteira abaixo do lote mínimo.',
    analise_detalhada_ia: 'Diagnóstico IA detalhado',
    recomendacoes_ia: ['Recomendação 1'],
  },
  {
    id: 'item-2',
    material: '100020',
    descricao_material: 'CANTONEIRA 2" X 1/4" SAE 1045',
    carteira_tons: 14.0,
    estoque_livre_tons: 4.0,
    saldo_produzir_tons: 10.0,
    producao_minima_tons: 15.0,
    diferenca_minimo_tons: 5.0,
    pedido_venda: 'PED-102',
    item_pedido: '20',
    pedido_formatado: 'PED-102/20',
    data_desejada: '2025-05-20',
    tempo_ciclo_minutos: 50,
    tempo_ciclo_formatado: '50 min',
    centro: '1100',
    linha: 'L1',
    empresa: 'CIAFAL',
    criticidade: 'Atenção',
    motivo_criticidade: 'Saldo moderado',
    observacao_ia: 'Item com carteira abaixo do lote mínimo.',
    analise_detalhada_ia: 'Diagnóstico IA detalhado',
    recomendacoes_ia: ['Recomendação 2'],
  },
]

describe('CarteiraMinimaNaoAtingidaPage — Integração e Alternância de Visões', () => {
  beforeEach(() => {
    vi.spyOn(carteiraMinimaService, 'obterItensCarteiraMinima').mockResolvedValue(mockItens)
    vi.spyOn(carteiraMinimaConsolidadaService, 'auditarAcessoVisao').mockResolvedValue()
  })

  it('deve renderizar os três botões de visualização: [Visualizar por Material], [Analisar Bitola] e [Analisar Família]', async () => {
    render(<CarteiraMinimaNaoAtingidaPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Visualizar por Material/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Analisar Bitola/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Analisar Família/i })).toBeInTheDocument()
    })
  })

  it('inicia na visão Material por padrão e exibe a tabela por material', async () => {
    render(<CarteiraMinimaNaoAtingidaPage />)

    await waitFor(() => {
      expect(screen.getByText(/Itens com Carteira Mínima Não Atingida/i)).toBeInTheDocument()
      expect(screen.getByText('100010')).toBeInTheDocument()
      expect(screen.getByText('100020')).toBeInTheDocument()
    })
  })

  it('ao clicar em [Analisar Bitola], alterna para visão Bitola e habilita o botão [Análise IA]', async () => {
    render(<CarteiraMinimaNaoAtingidaPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Analisar Bitola/i })).toBeInTheDocument()
    })

    const btnBitola = screen.getByRole('button', { name: /Analisar Bitola/i })
    fireEvent.click(btnBitola)

    await waitFor(() => {
      expect(screen.getByText(/Visão Bitola ativa/i)).toBeInTheDocument()
      expect(screen.getByText('1" X 1/8"')).toBeInTheDocument()
      expect(screen.getByText('2" X 1/4"')).toBeInTheDocument()
    })

    // Botão de IA deve estar habilitado na visão consolidada
    const btnIa = screen.getByRole('button', { name: /Análise IA/i })
    expect(btnIa).not.toBeDisabled()
  })

  it('ao clicar em [Analisar Família], agrupa por Família e exibe colunas consolidadas', async () => {
    render(<CarteiraMinimaNaoAtingidaPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Analisar Família/i })).toBeInTheDocument()
    })

    const btnFamilia = screen.getByRole('button', { name: /Analisar Família/i })
    fireEvent.click(btnFamilia)

    await waitFor(() => {
      expect(screen.getByText(/Visão Família ativa/i)).toBeInTheDocument()
      expect(screen.getByText('Barras Chatas')).toBeInTheDocument()
      expect(screen.getByText('Cantoneiras')).toBeInTheDocument()
    })
  })

  it('clicar em uma linha consolidada abre o modal de detalhamento da Bitola/Família', async () => {
    render(<CarteiraMinimaNaoAtingidaPage />)

    const btnBitola = await screen.findByRole('button', { name: /Analisar Bitola/i })
    fireEvent.click(btnBitola)

    const rowBitola = await screen.findByText('1" X 1/8"')
    fireEvent.click(rowBitola)

    await waitFor(() => {
      expect(screen.getByText(/Detalhamento Consolidado • Bitola/i)).toBeInTheDocument()
      expect(screen.getByText(/Itens da Bitola: 1" X 1\/8"/i)).toBeInTheDocument()
      expect(screen.getByText('PED-101/10')).toBeInTheDocument()
    })

    // Fechar detalhamento
    const btnFechar = screen.getByRole('button', { name: /Fechar detalhamento/i })
    fireEvent.click(btnFechar)

    await waitFor(() => {
      expect(screen.queryByText(/Detalhamento Consolidado • Bitola/i)).not.toBeInTheDocument()
    })
  })

  it('clicar em [Análise IA] na visão consolidada abre o modal analítico de IA', async () => {
    render(<CarteiraMinimaNaoAtingidaPage />)

    const btnBitola = await screen.findByRole('button', { name: /Analisar Bitola/i })
    fireEvent.click(btnBitola)

    await waitFor(() => {
      expect(screen.getByText('1" X 1/8"')).toBeInTheDocument()
    })

    const btnIa = screen.getByRole('button', { name: /Análise IA/i })
    fireEvent.click(btnIa)

    await waitFor(() => {
      expect(
        screen.getByText(/Diagnóstico Inteligente de Carteira Mínima por Bitola/i),
      ).toBeInTheDocument()
      expect(screen.getByText(/Resumo Executivo do Diagnóstico/i)).toBeInTheDocument()
      expect(screen.getByText(/Restrições Identificadas para Agrupamento/i)).toBeInTheDocument()
    })
  })

  it('ao clicar em [Visualizar por Material], retorna à visão original por material', async () => {
    render(<CarteiraMinimaNaoAtingidaPage />)

    const btnBitola = await screen.findByRole('button', { name: /Analisar Bitola/i })
    fireEvent.click(btnBitola)

    await waitFor(() => {
      expect(screen.getByText(/Visão Bitola ativa/i)).toBeInTheDocument()
    })

    const btnMaterial = screen.getByRole('button', { name: /Visualizar por Material/i })
    fireEvent.click(btnMaterial)

    await waitFor(() => {
      expect(screen.getByText(/Itens com Carteira Mínima Não Atingida/i)).toBeInTheDocument()
      expect(screen.queryByText(/Visão Bitola ativa/i)).not.toBeInTheDocument()
    })
  })
})
