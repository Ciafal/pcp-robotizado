import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DetalheMaterialUnificadoModal } from '@/components/carteira-views/DetalheMaterialUnificadoModal'
import { CarteiraItem } from '@/types/carteira-analise'
import { criarCarteiraItemMinimo, resolverCarteiraItem } from '@/lib/carteira-item-helper'
import { ItemCurvaAbcCalculado } from '@/services/curva-abc-faturamento-engine'

describe('DetalheMaterialUnificadoModal & Carteira Resolutivo Acceptance', () => {
  const itemMock: CarteiraItem = {
    empresa: 'CIAFAL',
    centro: '1100',
    linha: 'CFPL',
    ordem_venda: '45001234',
    item_ordem: '10',
    data_ordem: '2026-09-01',
    data_desejada: '2026-09-20',
    codigo_cliente: 'CLI-001',
    nome_cliente: 'Aço Forte Indústria',
    codigo_material: 'MAT-100200',
    descricao_material: 'Barra Redonda Trefilada 1045 25mm',
    familia: 'Barras',
    curva_abc: 'A',
    tipo_ordem: 'MTS',
    origem_produto: 'PRODUCAO_PROPRIA',
    qtd_ordem_tons: 50,
    qtd_faturada_tons: 0,
    carteira_aberta_tons: 50,
    carteira_vendas_tons: 50,
    carteira_mto_tons: 0,
    estoque_livre_tons: 20,
    estoque_mto_tons: 0,
    estoque_semiacabado_tons: 0,
    estoque_acabado_tons: 20,
    saldo_disponivel_tons: -30,
    saldo_positivo_tons: 0,
    saldo_negativo_tons: 30,
    necessidade_liquida_tons: 30,
    falta_produzir_tons: 30,
    status_atendimento: 'A_PRODUZIR',
    qtd_programada_tons: 10,
    media_faturamento_diario_t_dia: 1.5,
    dias_cobertura: 13.3,
    status_ruptura: 'VERMELHO',
    bloqueio: false,
    data_programada: '2026-09-25',
  }

  it('exibe título padrão "Detalhe do Material • {código}" e seção "Análise IA" consultiva', () => {
    render(
      <DetalheMaterialUnificadoModal
        isOpen={true}
        onClose={() => {}}
        item={itemMock}
        origemCarteira="GERAL"
      />,
    )

    // Título padrão
    expect(screen.getByText('Detalhe do Material • MAT-100200')).toBeDefined()

    // Seção Análise IA
    expect(screen.getByText(/Análise IA • Síntese da Situação do Material/i)).toBeDefined()
    expect(screen.getByText(/Consultivo • Apoio à Decisão/i)).toBeDefined()

    // Diagnósticos gerados
    expect(screen.getByText('Carteira sem Cobertura Imediata')).toBeDefined()
    expect(screen.getByText('Programação Insuficiente')).toBeDefined()
    expect(screen.getByText('Concentração de Carteira (Curva A)')).toBeDefined()
    expect(screen.getByText('Necessidade de Priorização')).toBeDefined()
    expect(screen.getByText('Risco de Data de Entrega')).toBeDefined()
  })

  it('exibe exatamente "Dados insuficientes para gerar esta análise." quando não houver dados suficientes', () => {
    const itemVazio: CarteiraItem = {
      ...itemMock,
      codigo_material: 'MAT-VAZIO',
      qtd_ordem_tons: 0,
      carteira_aberta_tons: 0,
      carteira_vendas_tons: 0,
      estoque_livre_tons: 0,
      estoque_acabado_tons: 0,
      qtd_programada_tons: 0,
    }

    render(
      <DetalheMaterialUnificadoModal
        isOpen={true}
        onClose={() => {}}
        item={itemVazio}
        origemCarteira="GERAL"
      />,
    )

    expect(screen.getByText('Dados insuficientes para gerar esta análise.')).toBeDefined()
  })

  it('resolve CarteiraItem via resolverCarteiraItem e criarCarteiraItemMinimo sem caminho silencioso', () => {
    const itemCalc: ItemCurvaAbcCalculado = {
      codigo_material: 'MAT-ABC-01',
      descricao_material: 'Tubo Mecânico 1020',
      familia: 'Tubos',
      linha: 'Trefilação',
      centro: '1100',
      carteira_tons: 100,
      estoque_livre_tons: 40,
      estoque_qualidade_tons: 0,
      estoque_bloqueado_tons: 0,
      estoque_disponivel_tons: 40,
      em_producao_tons: 0,
      programado_tons: 30,
      entradas_previstas_tons: 0,
      saldo_atual_tons: -60,
      saldo_projetado_tons: -30,
      deficit_tons: 30,
      dias_cobertura: 10,
      faturamento_brl: 500000,
      participacao_individual_pct: 12.5,
      participacao_acumulada_pct: 12.5,
      curva_abc: 'A',
      risco: 'CRITICO',
      criticidade: 'CRITICA',
      situacao: 'Déficit Projetado',
      tipo_carteira: 'GERAL',
    }

    // Resolvendo a partir de lista vazia -> usa fallback resolutivo infalível
    const resolvido = resolverCarteiraItem(itemCalc, [])
    expect(resolvido).toBeDefined()
    expect(resolvido.codigo_material).toBe('MAT-ABC-01')
    expect(resolvido.carteira_aberta_tons).toBe(100)
    expect(resolvido.estoque_livre_tons).toBe(40)
    expect(resolvido.qtd_programada_tons).toBe(30)
    expect(resolvido.necessidade_liquida_tons).toBe(30)

    // criarCarteiraItemMinimo diretamente
    const minimo = criarCarteiraItemMinimo({
      codigo_material: 'MAT-MIN',
      carteira_tons: 80,
      estoque_disponivel_tons: 20,
      programado_tons: 10,
    })
    expect(minimo.codigo_material).toBe('MAT-MIN')
    expect(minimo.carteira_aberta_tons).toBe(80)
    expect(minimo.necessidade_liquida_tons).toBe(50) // 80 - 20 - 10
  })
})
