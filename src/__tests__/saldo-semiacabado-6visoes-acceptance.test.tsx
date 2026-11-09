import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { CarteiraMTOView } from '@/components/carteira-views/CarteiraMTOView'
import { CarteiraRevendaView } from '@/components/carteira-views/CarteiraRevendaView'
import { CarteiraImportadoView } from '@/components/carteira-views/CarteiraImportadoView'
import { CarteiraSDCView } from '@/components/carteira-views/CarteiraSDCView'
import { CarteiraItem } from '@/types/carteira-analise'
import { CarteiraSDCItem, CarteiraSDCKpis } from '@/types/carteira-sdc'

const mockItensGenericos: CarteiraItem[] = [
  {
    codigo_material: 'MAT-001',
    descricao_material: 'PERFIL LEVE A36',
    tipo_ordem: 'MTO',
    origem_produto: 'REVENDA',
    carteira_aberta_tons: 100,
    estoque_livre_tons: 40,
    estoque_semiacabado_tons: 25.5,
    estoque_semiacabado_ciafal_tons: 15.5,
    estoque_semiacabado_vallourec_tons: 10,
    saldo_negativo_tons: 0,
    saldo_positivo_tons: 0,
    status_atendimento: 'A_FATURAR',
    status_ruptura: 'VERDE',
    bloqueio: false,
    empresa: 'CIAFAL',
    centro: '1100',
    linha: 'L1',
    data_ordem: '2026-11-01',
    codigo_cliente: 'C001',
    familia: 'PERFIS',
    curva_abc: 'A',
    qtd_ordem_tons: 100,
    qtd_faturada_tons: 0,
    carteira_vendas_tons: 100,
    carteira_mto_tons: 100,
    estoque_mto_tons: 40,
    estoque_acabado_tons: 40,
    saldo_disponivel_tons: 40,
    necessidade_liquida_tons: 60,
    falta_produzir_tons: 60,
    qtd_programada_tons: 0,
    media_faturamento_diario_t_dia: 10,
    data_desejada: '2026-12-01',
    ordem_venda: '4500123',
    item_ordem: '10',
    nome_cliente: 'CLIENTE TESTE S/A',
  },
  {
    codigo_material: 'MAT-002',
    descricao_material: 'BARRA CHATA IMPORTADA',
    tipo_ordem: 'MTO',
    origem_produto: 'IMPORTADO',
    carteira_aberta_tons: 80,
    estoque_livre_tons: 20,
    estoque_semiacabado_tons: 14.5,
    saldo_negativo_tons: 0,
    saldo_positivo_tons: 0,
    status_atendimento: 'A_FATURAR',
    status_ruptura: 'VERDE',
    bloqueio: false,
    empresa: 'CIAFAL',
    centro: '1100',
    linha: 'L2',
    data_ordem: '2026-11-01',
    codigo_cliente: 'C002',
    familia: 'BARRAS',
    curva_abc: 'B',
    qtd_ordem_tons: 80,
    qtd_faturada_tons: 0,
    carteira_vendas_tons: 80,
    carteira_mto_tons: 80,
    estoque_mto_tons: 20,
    estoque_acabado_tons: 20,
    saldo_disponivel_tons: 20,
    necessidade_liquida_tons: 60,
    falta_produzir_tons: 60,
    qtd_programada_tons: 0,
    media_faturamento_diario_t_dia: 8,
    data_desejada: '2026-12-05',
    ordem_venda: '4500124',
    item_ordem: '20',
    nome_cliente: 'IMPORTADORA TESTE',
  },
]

describe('Saldo Semiacabado Card nas visões MTO, Revenda, Importado e SDC', () => {
  it('renderiza o card Saldo Semiacabado na Carteira MTO com soma real e abre drilldown ao clicar', () => {
    render(
      <CarteiraMTOView itens={mockItensGenericos} entradasFuturas={[]} onOpenMemoria={() => {}} />,
    )

    const card = screen.getByTestId('card-saldo-semiacabado-mto')
    expect(card).toBeInTheDocument()
    // Total MTO = 25.5 + 14.5 = 40.00 t
    expect(card).toHaveTextContent('40,00')
    expect(card).toHaveTextContent('t')

    fireEvent.click(card)
    expect(screen.getByText('Drill-down Executivo')).toBeInTheDocument()
    expect(screen.getAllByText('Saldo Semiacabado').length).toBeGreaterThan(0)
  })

  it('renderiza o card Saldo Semiacabado na Carteira Revenda com soma real e abre drilldown ao clicar', () => {
    render(
      <CarteiraRevendaView
        itens={mockItensGenericos}
        entradasFuturas={[]}
        onOpenMemoria={() => {}}
      />,
    )

    const card = screen.getByTestId('card-saldo-semiacabado-revenda')
    expect(card).toBeInTheDocument()
    // Apenas MAT-001 é REVENDA = 25.50 t
    expect(card).toHaveTextContent('25,50')
    expect(card).toHaveTextContent('t')

    fireEvent.click(card)
    expect(screen.getByText('Drill-down Executivo')).toBeInTheDocument()
  })

  it('renderiza o card Saldo Semiacabado na Carteira Importado com soma real e abre drilldown ao clicar', () => {
    render(
      <CarteiraImportadoView
        itens={mockItensGenericos}
        entradasFuturas={[]}
        onOpenMemoria={() => {}}
      />,
    )

    const card = screen.getByTestId('card-saldo-semiacabado-importado')
    expect(card).toBeInTheDocument()
    // Apenas MAT-002 é IMPORTADO = 14.50 t
    expect(card).toHaveTextContent('14,50')
    expect(card).toHaveTextContent('t')

    fireEvent.click(card)
    expect(screen.getByText('Drill-down Executivo')).toBeInTheDocument()
  })

  it('renderiza o card Saldo Semiacabado na Carteira SDC no estado controlado indisponível e posicionado após Estoque Total SDPL', () => {
    const kpis: CarteiraSDCKpis = {
      carteira_total_t: 100,
      estoque_total_t: 50,
      deficit_atual_t: 10,
      itens_com_deficit_count: 2,
      em_producao_total_t: 15,
      itens_cobertura_programada_count: 3,
      itens_criticos_count: 1,
      total_itens: 10,
    }

    render(
      <CarteiraSDCView
        itens={[]}
        kpis={kpis}
        fonteAtual="SAP ECC"
        dataAtualizacao="2026-11-09T10:00:00Z"
        analisesIA={[]}
        isLoading={false}
        onAtualizarItens={() => {}}
        onOpenDetalheSDC={() => {}}
        onAtualizarSap={() => {}}
      />,
    )

    const cardSdc = screen.getByTestId('card-saldo-semiacabado-sdc')
    expect(cardSdc).toBeInTheDocument()
    expect(cardSdc).toHaveTextContent('Dados SAP indisponíveis')
    expect(cardSdc).toHaveTextContent('Fonte não disponível na RFC SDC')
    expect(cardSdc).not.toHaveTextContent('0,00 t')

    // Validar posicionamento: logo após o card 2 (Estoque Total SDPL)
    const cardEstoqueTotal = screen.getByTestId('card-estoque-total-sdpl')
    expect(cardEstoqueTotal.nextElementSibling).toBe(cardSdc)
  })
})
