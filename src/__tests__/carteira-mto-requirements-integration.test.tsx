import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CarteiraMTOView } from '../components/carteira-views/CarteiraMTOView'
import type { CarteiraItem } from '../types/carteira-analise'
import * as mtoService from '../services/mto-requirements-service'

describe('CarteiraMTOView — Ausência de duplicações e célula Requisitos MTO (Seção 3, 5, 6 e 7)', () => {
  const mockItens: any[] = [
    {
      id: 'item-1',
      empresa: 'CIAFAL',
      centro: '56',
      linha: 'L1',
      ordem_venda: '50000499',
      item_ordem: '10',
      data_ordem: '2026-10-01',
      data_desejada: '2026-10-15',
      codigo_cliente: 'CLI-01',
      nome_cliente: 'CONEXOES SANTA MARTA IND E COM LTDA',
      codigo_material: 'MAT-01',
      descricao_material: 'CANTONEIRA 25,4 X 4,50 MTO',
      familia: 'CANTONEIRAS',
      curva_abc: 'A',
      tipo_ordem: 'MTO',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 100,
      qtd_faturada_tons: 20,
      carteira_aberta_tons: 80,
      carteira_vendas_tons: 80,
      carteira_mto_tons: 80,
      estoque_livre_tons: 10,
      estoque_mto_tons: 10,
      estoque_semiacabado_tons: 0,
      estoque_acabado_tons: 10,
      saldo_disponivel_tons: 10,
      saldo_positivo_tons: 0,
      saldo_negativo_tons: 70,
      necessidade_liquida_tons: 70,
      falta_produzir_tons: 70,
      status_atendimento: 'A_PRODUZIR',
      qtd_programada_tons: 0,
      media_faturamento_diario_t_dia: 5,
      status_ruptura: 'VERMELHO',
      bloqueio: false,
    },
    {
      id: 'item-2',
      empresa: 'CIAFAL',
      centro: '56',
      linha: 'L1',
      ordem_venda: '60000000',
      item_ordem: '10',
      data_ordem: '2026-10-01',
      data_desejada: '2026-10-20',
      codigo_cliente: 'CLI-02',
      nome_cliente: 'OUTRO CLIENTE',
      codigo_material: 'MAT-02',
      descricao_material: 'CANTONEIRA NORMAL MTO',
      familia: 'CANTONEIRAS',
      curva_abc: 'B',
      tipo_ordem: 'MTO',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 50,
      qtd_faturada_tons: 0,
      carteira_aberta_tons: 50,
      carteira_vendas_tons: 50,
      carteira_mto_tons: 50,
      estoque_livre_tons: 0,
      estoque_mto_tons: 0,
      estoque_semiacabado_tons: 0,
      estoque_acabado_tons: 0,
      saldo_disponivel_tons: 0,
      saldo_positivo_tons: 0,
      saldo_negativo_tons: 50,
      necessidade_liquida_tons: 50,
      falta_produzir_tons: 50,
      status_atendimento: 'A_PRODUZIR',
      qtd_programada_tons: 0,
      media_faturamento_diario_t_dia: 2,
      status_ruptura: 'VERMELHO',
      bloqueio: false,
    },
  ]

  it('Garante que NÃO existe botão "Requisitos MTO" no cabeçalho superior nem botão "Requisitos" na coluna Ações', async () => {
    vi.spyOn(mtoService, 'getRequirementsGridInfoMap').mockResolvedValue(
      new Map([
        [
          '50000499__10',
          {
            count: 2,
            tipos: ['Comprimento', 'Garantias Específicas'],
            tiposResumoTexto: 'Tipos: Comprimento, Garantias Específicas',
          },
        ],
      ]),
    )

    render(
      <CarteiraMTOView
        itens={mockItens}
        onOpenDetalheMaterial={() => {}}
        onOpenMemoria={() => {}}
      />,
    )

    // 1. Coluna própria "Requisitos MTO" deve existir no cabeçalho da tabela
    expect(screen.getByRole('columnheader', { name: /Requisitos MTO/i })).toBeInTheDocument()

    // 2. Coluna Ações deve conter apenas "Detalhe", SEM botão "Requisitos" duplicado
    const detalheButtons = screen.getAllByRole('button', { name: /Detalhe/i })
    expect(detalheButtons.length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /^Requisitos$/i })).toBeNull()

    // 3. Botão "Requisitos MTO" solto no cabeçalho superior foi removido (não duplica ação por linha)
    // Curva ABC permanece
    expect(screen.getByRole('button', { name: /Curva ABC/i })).toBeInTheDocument()

    // 4. Célula com requisitos exibe "Ver requisitos (2)" e resumo dos tipos
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ver requisitos \(2\)/i })).toBeInTheDocument()
      expect(screen.getByText('Tipos: Comprimento, Garantias Específicas')).toBeInTheDocument()
    })

    // 5. Célula sem requisitos exibe "Sem requisito"
    expect(screen.getByText('Sem requisito')).toBeInTheDocument()
  })
})
