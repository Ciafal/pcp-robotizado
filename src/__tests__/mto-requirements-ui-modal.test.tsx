import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConsultarRequisitosMTOModal } from '../components/carteira-views/ConsultarRequisitosMTOModal'
import * as mtoService from '../services/mto-requirements-service'
import type { MtoRequirementRecord } from '../types/mto-requirements'

describe('ConsultarRequisitosMTOModal Component Tests', () => {
  const mockReq1: MtoRequirementRecord = {
    id: 'req-01',
    requisito_id: 'REQ-01',
    requisito_numero: 1,
    pedido_numero: '50000499',
    item_pedido: '10',
    codigo_documento: 'MTO-50000499-01',
    cliente_nome: 'CONEXOES SANTA MARTA IND E COM LTDA',
    produto: 'CANTONEIRA',
    aplicacao: 'NÃO INFORMADA',
    classe_aco: '1006/1022M',
    responsavel_consulta: 'Emiraldo Xavier',
    norma_aplicavel: 'NBR 15980',
    quantidade: 70,
    data_consulta: '05/06/2026',
    descricao_material: 'CANT. 25,4 X 4,50 -1006/1022- MTO',
    condicao: 'NBR 7007',
    comprimento: {
      comprimento_principal: 4.8,
      tolerancia_mais: 0.1,
      tolerancia_menos: 0.0,
      unidade: 'm',
    },
    garantias_superficie: {
      padrao_qualidade_superficial: 'QS 3',
    },
    garantias_especificas: {
      ensaio_tracao: {
        lr_mpa: 400,
        le_mpa: 250,
        alongamento_pct: 20,
      },
    },
    politica_qualidade:
      'Buscar sempre o atendimento dos requisitos para satisfazer os clientes, produzir e comercializar laminados a quente, utilizando recursos de forma otimizada, satisfazendo as partes interessadas, melhorando continuamente.',
  }

  const mockReq2: MtoRequirementRecord = {
    id: 'req-02',
    requisito_id: 'REQ-02',
    requisito_numero: 2,
    pedido_numero: '50000499',
    item_pedido: '10',
    codigo_documento: 'MTO-50000499-02',
    cliente_nome: 'CONEXOES SANTA MARTA IND E COM LTDA',
    produto: 'CANTONEIRA',
    aplicacao: 'NÃO INFORMADA',
    classe_aco: '1006/1022M',
    responsavel_consulta: 'Emiraldo Xavier',
    norma_aplicavel: 'NBR 15980',
    quantidade: 30,
    data_consulta: '05/06/2026',
    descricao_material: 'CANT. 25,4 X 4,50 -1006/1022- MTO',
    condicao: 'AISI SAE J403/01',
    comprimento: {
      comprimento_principal: 4.77,
      tolerancia_mais: 0.1,
      tolerancia_menos: 0.0,
      unidade: 'm',
    },
    garantias_superficie: {
      padrao_qualidade_superficial: 'QS 3',
    },
    garantias_especificas: {
      ensaio_tracao: {
        lr_mpa: null,
        le_mpa: null,
        alongamento_pct: null,
      },
    },
    politica_qualidade:
      'Buscar sempre o atendimento dos requisitos para satisfazer os clientes, produzir e comercializar laminados a quente, utilizando recursos de forma otimizada, satisfazendo as partes interessadas, melhorando continuamente.',
  }

  it('Alternância entre Requisito 01 e Requisito 02 sem fechar o modal', async () => {
    vi.spyOn(mtoService, 'getRequirementsByOrderAndItem').mockResolvedValue([mockReq1, mockReq2])

    render(
      <ConsultarRequisitosMTOModal
        open={true}
        onOpenChange={() => {}}
        pedidoNumero="50000499"
        itemPedido="10"
        clienteNome="CONEXOES SANTA MARTA IND E COM LTDA"
        descricaoMaterial="CANT. 25,4 X 4,50 -1006/1022- MTO"
      />,
    )

    // Aguarda carregar dados
    const tabReq1 = await screen.findByRole('button', { name: /Requisito 01/i })
    const tabReq2 = screen.getByRole('button', { name: /Requisito 02/i })

    expect(tabReq1).toBeDefined()
    expect(tabReq2).toBeDefined()

    // No Requisito 01: condição NBR 7007 e 400 MPa
    expect(screen.getByText('NBR 7007')).toBeDefined()
    expect(screen.getByText('400 MPa')).toBeDefined()

    // Título / Tipo em destaque no cabeçalho
    expect(screen.getByText(/Tipo Principal:/i)).toBeDefined()

    // Clica na aba Requisito 02
    fireEvent.click(tabReq2)

    // No Requisito 02: condição AISI SAE J403/01 e valores de tração "—"
    expect(screen.getByText('AISI SAE J403/01')).toBeDefined()
    expect(screen.queryByText('400 MPa')).toBeNull()
  })

  it('Verifica rótulos de abas com Requisito 01 — [Tipo] (Seção 5 e 6)', async () => {
    vi.spyOn(mtoService, 'getRequirementsByOrderAndItem').mockResolvedValue([mockReq1, mockReq2])

    render(
      <ConsultarRequisitosMTOModal
        open={true}
        onOpenChange={() => {}}
        pedidoNumero="50000499"
        itemPedido="10"
      />,
    )

    const tabReq1 = await screen.findByRole('button', { name: /Requisito 01 — Comprimento/i })
    const tabReq2 = screen.getByRole('button', { name: /Requisito 02 — Comprimento/i })
    expect(tabReq1).toBeDefined()
    expect(tabReq2).toBeDefined()
  })
})
