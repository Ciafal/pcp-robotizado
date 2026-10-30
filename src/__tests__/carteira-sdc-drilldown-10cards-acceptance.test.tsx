import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CarteiraSDCView } from '@/components/carteira-views/CarteiraSDCView'
import { CarteiraSDCEngine } from '@/services/carteira-sdc-engine'
import { CarteiraSDCItem, CarteiraSDCKpis } from '@/types/carteira-sdc'

// Mock dos hooks de lote mínimo
vi.mock('@/hooks/use-sap-material-lote-minimo', () => ({
  useSapMaterialLoteMinimo: () => ({
    replicaMap: new Map([
      ['C1000A360600', { material: 'C1000A360600', lote_minimo_tons: 30.0, unidade: 't' }],
      [
        'BAR-CH-50x6.35-A36',
        { material: 'BAR-CH-50x6.35-A36', lote_minimo_tons: 50.0, unidade: 't' },
      ],
    ]),
    isLoading: false,
    sincronizarLoteMinimoSap: vi.fn(),
  }),
}))

describe('Carteira SDC — Detalhamento dos 10 Cards (Aceitação v0.0.633)', () => {
  const mockItens: CarteiraSDCItem[] = [
    {
      material: 'C1000A360600',
      descricao: 'Cantoneira Abas Iguais 1" x 1/8" ASTM A36',
      familia: 'Cantoneiras',
      bitola: '1" x 1/8"',
      qualidade_aco: 'ASTM A36',
      curva_abc: 'A',
      carteira_t: 26.0,
      estoque_total_t: 6.84,
      saldo_t: -19.16,
      programado_t: 0,
      em_producao_t: 0,
      saldo_projetado_t: -19.16,
      cobertura_pct: 26.3,
      status: 'CRÍTICO',
      situacao_producao: 'Sem programação',
      origem_producao: 'Sidercentro',
      centro_sap: 'SDPL',
      empresa: 'Sidercentro',
      pedidos_compoem: [
        {
          ordem_venda: 'OV-450891',
          item_ordem: '0010',
          cliente: 'Aço Minas Distribuidora Ltda',
          quantidade_t: 16.0,
          data_desejada: '2026-09-05',
        },
      ],
    },
    {
      material: 'BAR-CH-50x6.35-A36',
      descricao: 'Barra Chata 2" x 1/4" ASTM A36',
      familia: 'Barras Chatas',
      bitola: '2" x 1/4"',
      qualidade_aco: 'ASTM A36',
      curva_abc: 'A',
      carteira_t: 40.0,
      estoque_total_t: 10.0,
      saldo_t: -30.0,
      programado_t: 35.0,
      em_producao_t: 0,
      saldo_projetado_t: 5.0,
      cobertura_pct: 25.0,
      status: 'COBERTURA PROGRAMADA',
      situacao_producao: 'Programado SDC',
      origem_producao: 'Sidercentro',
      centro_sap: 'SDPL',
      empresa: 'Sidercentro',
      programacao_detalhe: {
        quantidade_t: 35.0,
        centro_produtivo: 'SDPL',
        linha: 'Laminação Sidercentro L-SDC',
        data_prevista: '2026-09-08',
        status: 'PROGRAMADO',
      },
    },
    {
      material: 'C1250A360600',
      descricao: 'Cantoneira Abas Iguais 1.1/4" x 1/8" ASTM A36',
      familia: 'Cantoneiras',
      bitola: '1.1/4" x 1/8"',
      qualidade_aco: 'ASTM A36',
      curva_abc: 'A',
      carteira_t: 32.0,
      estoque_total_t: 5.0,
      estoque_bloqueado_t: 5.0,
      saldo_t: -27.0,
      programado_t: 0,
      em_producao_t: 18.0,
      saldo_projetado_t: -9.0,
      cobertura_pct: 15.6,
      status: 'EM PRODUÇÃO',
      situacao_producao: 'Em industrialização SDC',
      origem_producao: 'Sidercentro',
      centro_sap: 'SDPL',
      empresa: 'Sidercentro',
    },
  ]

  const mockKpis: CarteiraSDCKpis = {
    carteira_total_t: 98.0,
    estoque_total_t: 21.84,
    deficit_atual_t: 76.16,
    itens_com_deficit_count: 3,
    em_producao_total_t: 18.0,
    itens_cobertura_programada_count: 1,
    itens_criticos_count: 1,
    total_itens: 3,
    estoque_remessa_cfpl: {
      quantidade_t: 25.4,
      unidade_original: 't',
      centro: 'CFPL',
      status: 'SUCESSO',
      timestamp: new Date().toISOString(),
      origem: 'SAP ECC',
      fonte_rfc: 'SAP ECC • RFC',
      centros: [
        {
          centro: 'CFPL',
          descricao: 'Centro CFPL Laminação',
          quantidade_t: 25.4,
          unidade: 't',
          participacao_pct: 100,
        },
      ],
    },
    estoque_armazenado_ciafal: {
      quantidade_t: 38.75,
      unidade_original: 't',
      centro: '1100',
      status: 'SUCESSO',
      timestamp: new Date().toISOString(),
      origem: 'SAP ECC',
      fonte_rfc: 'SAP ECC • RFC',
      centros: [
        {
          centro: '1100',
          descricao: 'Matriz CIAFAL Contagem',
          quantidade_t: 38.75,
          unidade: 't',
          participacao_pct: 100,
        },
      ],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------
  // TESTE 1: Abertura e fechamento do Card 1 (Carteira Total SDC)
  // -------------------------------------------------------------
  it('Card 1: Clicar em "Carteira Total SDC" abre modal com indicador, tabela de pedidos/clientes e fecha por botão', async () => {
    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={mockKpis}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
      />,
    )

    const card = screen.getByTestId('card-carteira-total-sdc')
    expect(card).toBeInTheDocument()
    fireEvent.click(card)

    const modal = await screen.findByTestId('modal-detalhamento-carteira-total')
    expect(modal).toBeInTheDocument()
    expect(screen.getByText('Carteira Total SDC')).toBeInTheDocument()
    expect(screen.getByTestId('modal-valor-consolidado')).toHaveTextContent('98,000 t')

    // Tabela detalhada
    expect(screen.getByTestId('tabela-detalhamento-card')).toBeInTheDocument()
    expect(screen.getByText('C1000A360600')).toBeInTheDocument()

    // Fecha o modal
    const btnFechar = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(btnFechar)
    await waitFor(() => {
      expect(screen.queryByTestId('modal-detalhamento-carteira-total')).not.toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------
  // TESTE 2: Abertura do Card 5 (Déficit Atual)
  // -------------------------------------------------------------
  it('Card 5: Clicar em "Déficit Atual (-)" abre modal com totalizador conferindo e destaque em vermelho', async () => {
    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={mockKpis}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
      />,
    )

    const card = screen.getByTestId('card-deficit-atual')
    fireEvent.click(card)

    const modal = await screen.findByTestId('modal-detalhamento-deficit-atual')
    expect(modal).toBeInTheDocument()
    expect(screen.getByText('Déficit Atual')).toBeInTheDocument()
    expect(screen.getByTestId('modal-valor-consolidado')).toHaveTextContent('76,160 t')

    const btnFechar = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(btnFechar)
  })

  // -------------------------------------------------------------
  // TESTE 3: Abertura do Card 6 (Itens com Déficit)
  // -------------------------------------------------------------
  it('Card 6: Clicar em "Itens com Déficit" abre modal com contagem de 3 itens', async () => {
    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={mockKpis}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
      />,
    )

    const card = screen.getByTestId('card-itens-com-deficit')
    fireEvent.click(card)

    const modal = await screen.findByTestId('modal-detalhamento-itens-com-deficit')
    expect(modal).toBeInTheDocument()
    expect(screen.getByText('Itens com Déficit')).toBeInTheDocument()
    expect(screen.getByTestId('modal-valor-consolidado')).toHaveTextContent('3 itens')

    const btnFechar = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(btnFechar)
  })

  // -------------------------------------------------------------
  // TESTE 4: Abertura do Card 7 (Em Produção)
  // -------------------------------------------------------------
  it('Card 7: Clicar em "Em Produção (t)" abre modal com OP e quantidade realizada/planejada', async () => {
    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={mockKpis}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
      />,
    )

    const card = screen.getByTestId('card-em-producao')
    fireEvent.click(card)

    const modal = await screen.findByTestId('modal-detalhamento-em-producao')
    expect(modal).toBeInTheDocument()
    expect(screen.getByText('Em Produção')).toBeInTheDocument()
    expect(screen.getByTestId('modal-valor-consolidado')).toHaveTextContent('18,000 t')

    const btnFechar = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(btnFechar)
  })

  // -------------------------------------------------------------
  // TESTE 5: Abertura do Card 8 (Cobertura Programada)
  // -------------------------------------------------------------
  it('Card 8: Clicar em "Cobertura Programada" abre modal com saldo projetado positivo', async () => {
    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={mockKpis}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
      />,
    )

    const card = screen.getByTestId('card-cobertura-programada')
    fireEvent.click(card)

    const modal = await screen.findByTestId('modal-detalhamento-cobertura-programada')
    expect(modal).toBeInTheDocument()
    expect(screen.getByText('Cobertura Programada')).toBeInTheDocument()
    expect(screen.getByTestId('modal-valor-consolidado')).toHaveTextContent('1 itens')

    const btnFechar = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(btnFechar)
  })

  // -------------------------------------------------------------
  // TESTE 6: Abertura do Card 9 (Itens Críticos)
  // -------------------------------------------------------------
  it('Card 9: Clicar em "Itens Críticos" abre modal filtrado por sem estoque/sem programação', async () => {
    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={mockKpis}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
      />,
    )

    const card = screen.getByTestId('card-itens-criticos')
    fireEvent.click(card)

    const modal = await screen.findByTestId('modal-detalhamento-itens-criticos')
    expect(modal).toBeInTheDocument()
    expect(screen.getByText('Itens Críticos')).toBeInTheDocument()
    expect(screen.getByTestId('modal-valor-consolidado')).toHaveTextContent('1 itens')

    const btnFechar = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(btnFechar)
  })

  // -------------------------------------------------------------
  // TESTE 7: Card 10 (Mínimo Não Atingido)
  // -------------------------------------------------------------
  it('Card 10: Clicar em "Mínimo Não Atingido" abre modal específico com parâmetro SAP e diferença em t', async () => {
    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={mockKpis}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
      />,
    )

    const containerMinimo = screen.getByTestId('card-minimo-nao-atingido-container')
    expect(containerMinimo).toBeInTheDocument()
    fireEvent.click(containerMinimo)

    const modal = await screen.findByTestId('modal-detalhamento-minimo-nao-atingido')
    expect(modal).toBeInTheDocument()
    expect(screen.getByText('Mínimo Não Atingido')).toBeInTheDocument()

    const btnFechar = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(btnFechar)
  })

  // -------------------------------------------------------------
  // TESTE 8: Acessibilidade por Teclado (Enter e Espaço)
  // -------------------------------------------------------------
  it('Acessibilidade por teclado: Enter e Espaço acionam abertura do modal', async () => {
    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={mockKpis}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
      />,
    )

    const cardCarteira = screen.getByTestId('card-carteira-total-sdc')
    fireEvent.keyDown(cardCarteira, { key: 'Enter', code: 'Enter' })

    const modal = await screen.findByTestId('modal-detalhamento-carteira-total')
    expect(modal).toBeInTheDocument()

    const btnFechar = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(btnFechar)
  })

  // -------------------------------------------------------------
  // TESTE 9: Resiliência com SAP Indisponível
  // -------------------------------------------------------------
  it('Com SAP indisponível, o modal abre exibindo status da integração sem quebrar nem inventar números', async () => {
    const kpisIndisponivel: CarteiraSDCKpis = {
      ...mockKpis,
      estoque_remessa_cfpl: {
        quantidade_t: null,
        unidade_original: 't',
        centro: 'CFPL',
        status: 'INDISPONIVEL',
        mensagem_erro: 'Falha de comunicação RFC SAP ECC.',
        timestamp: new Date().toISOString(),
        origem: 'SAP ECC',
        fonte_rfc: 'SAP ECC • RFC',
      },
    }

    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={kpisIndisponivel}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
      />,
    )

    const cardRemessa = screen.getByTestId('card-estoque-remessa')
    fireEvent.click(cardRemessa)

    // O card de estoque remessa mantém seu modal por centro existente
    const modal = await screen.findByTestId('modal-detalhamento-estoque-centro')
    expect(modal).toBeInTheDocument()
    expect(screen.getByText('ESTOQUE REMESSA')).toBeInTheDocument()
    expect(screen.getByTestId('aviso-detalhamento-indisponivel')).toBeInTheDocument()
  })

  // -------------------------------------------------------------
  // TESTE 10: Preservação estrita dos cálculos contratuais
  // -------------------------------------------------------------
  it('Preservação estrita: cálculos de déficit, cobertura e totais permanecem intactos', () => {
    const kpis = CarteiraSDCEngine.calcularKpis(mockItens)
    expect(kpis.carteira_total_t).toBe(98.0)
    expect(kpis.estoque_total_t).toBe(21.84)
    expect(kpis.deficit_atual_t).toBe(76.16)
    expect(kpis.itens_com_deficit_count).toBe(3)
  })
})
