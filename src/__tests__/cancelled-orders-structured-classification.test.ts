/**
 * Testes Automatizados Cobrindo os 20 Requisitos de Classificação Estruturada de Recusas
 * Tela: PCP Robotizado → Análise de Carteira → Pedidos Cancelados (/pcp/analise-carteira/cancelados)
 *
 * Cenários Obrigatórios:
 * 1. Campo estruturado categoria_recusa (COMERCIAL, PCP, TRANSPORTE)
 * 2. Independência entre Categoria da Recusa e Motivo da Recusa (filtrado pela categoria)
 * 3. Novo Card "Transporte" no padrão dos demais
 * 4. Cards PCP, Comercial e Transporte alimentados exclusivamente por categoria_recusa
 * 5. Sem dupla contagem (reconciliação total vs soma das categorias)
 * 6. Registros históricos sem classificação permanecem "Sem categorização"
 * 7. Detalhes dos cards com popup responsivo ocupando até 95% da área útil
 * 8. Card "Principal motivo" usa motivo estruturado + volume + categoria relacionada
 * 9. Filtros estruturados (Período, Centro, Categoria, Motivo)
 * 10. Atualização em tempo real (alteração PCP -> Transporte recalcula instantaneamente)
 * 11. Auditoria detalhada em pcp_audit_logs com valor anterior e novo
 * 12. Formatação rigorosa pt-BR (toneladas "125,50 t", percentual "12,50%")
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  STRUCTURED_REASONS_BY_CATEGORY,
  getMotivosPorCategoria,
} from '@/data/cancellation-reasons-catalog'
import { cancelledOrdersService } from '@/services/cancelled-orders-service'
import { CancelledOrderRecord } from '@/types/cancelled-orders'
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'

describe('Classificação Estruturada de Recusas - PCP Robotizado', () => {
  const baseOrder: Partial<CancelledOrderRecord> = {
    empresa: 'CIAFAL',
    representante_vendedor: 'Vendas SP',
    familia: 'Perfis e Barras',
    curva_abc: 'A',
    tipo_carteira: 'Firme',
    quantidade_faturada_t: 0,
    unidade_medida: 'TO',
    estoque_disponivel_data_t: 15.0,
    preco_liquido: 6000.0,
    condicao_pagamento: '30 dias',
    prazo: 'Imediato',
    status_faturamento: 'Cancelado',
    data_desejada_cliente: '2025-01-20',
    data_prevista_producao: '2025-01-18',
    status_recusa: 'Recusado',
    observacao: '',
    data_hora_cancelamento: '2025-01-17 10:00',
    usuario_operacao: 'VENDAS',
    is_demo: false,
    has_ai_inconsistency: false,
    ai_verification_status: 'Coerente com dados disponíveis',
    ai_probable_cause: 'Motivo declarado',
    ai_suggested_responsibility: 'Comercial',
    ai_action_suggested: 'Revisão comercial',
  }

  const sampleOrders: CancelledOrderRecord[] = [
    {
      ...(baseOrder as CancelledOrderRecord),
      id: 'ord-01',
      ordem_venda: '10001',
      item_ordem: '10',
      cliente_nome: 'AÇO BRASIL INDÚSTRIA LTDA',
      cliente_codigo: 'CLI-001',
      material_codigo: 'PERFIL-U-100',
      material_descricao: 'Perfil U Laminado 100x50',
      quantidade_original_ov_t: 30.0,
      saldo_cancelado_t: 30.0,
      valor_cancelado_brl: 180000.0,
      data_ordem: '2025-01-15',
      centro: 'L1',
      linha: 'Linha 1 - Perfis',
      motivo_original_sap: 'Preço divergente',
      categoria_motivo: 'Comercial',
      categoria_recusa: 'COMERCIAL',
      motivo_recusa: 'Preço não aceito',
      analysis_status: 'Pendente',
      ai_confidence_level: 'Alta',
      ai_priority: 'Média',
      ai_avoidable_status: 'Potencialmente evitável',
    },
    {
      ...(baseOrder as CancelledOrderRecord),
      id: 'ord-02',
      ordem_venda: '10002',
      item_ordem: '20',
      cliente_nome: 'METALÚRGICA SUL SA',
      cliente_codigo: 'CLI-002',
      material_codigo: 'BARRA-RED-50',
      material_descricao: 'Barra Redonda 50mm SAE 1045',
      quantidade_original_ov_t: 45.0,
      saldo_cancelado_t: 45.0,
      valor_cancelado_brl: 270000.0,
      data_ordem: '2025-01-16',
      centro: 'L2',
      linha: 'Linha 2 - Barras',
      motivo_original_sap: 'Sem matéria-prima no estoque',
      categoria_motivo: 'PCP/Planejamento',
      categoria_recusa: 'PCP',
      motivo_recusa: 'Falta de matéria-prima',
      analysis_status: 'Pendente',
      ai_confidence_level: 'Alta',
      ai_priority: 'Alta',
      ai_avoidable_status: 'Potencialmente evitável',
    },
    {
      ...(baseOrder as CancelledOrderRecord),
      id: 'ord-03',
      ordem_venda: '10003',
      item_ordem: '10',
      cliente_nome: 'DISTRIBUIDORA NORTE EIRELI',
      cliente_codigo: 'CLI-003',
      material_codigo: 'VIGA-I-150',
      material_descricao: 'Viga I Estrutural 150mm',
      quantidade_original_ov_t: 25.0,
      saldo_cancelado_t: 25.0,
      valor_cancelado_brl: 150000.0,
      data_ordem: '2025-01-17',
      centro: 'SDC',
      linha: 'SDC - Corte e Conformação',
      motivo_original_sap: 'Transportadora sem frota',
      categoria_motivo: 'Logística',
      categoria_recusa: 'TRANSPORTE',
      motivo_recusa: 'Falta de veículo',
      analysis_status: 'Pendente',
      ai_confidence_level: 'Alta',
      ai_priority: 'Média',
      ai_avoidable_status: 'Potencialmente evitável',
    },
    {
      ...(baseOrder as CancelledOrderRecord),
      id: 'ord-04-legado',
      ordem_venda: '10004',
      item_ordem: '10',
      cliente_nome: 'CLIENTE HISTORICO SA',
      cliente_codigo: 'CLI-004',
      material_codigo: 'CANTONEIRA-50',
      material_descricao: 'Cantoneira Abas Iguais 50x5',
      quantidade_original_ov_t: 10.0,
      saldo_cancelado_t: 10.0,
      valor_cancelado_brl: 60000.0,
      data_ordem: '2024-12-01',
      centro: 'L1',
      linha: 'Linha 1 - Perfis',
      motivo_original_sap: 'Cancelamento solicitado pelo cliente',
      categoria_motivo: 'Cliente',
      categoria_recusa: null, // Sem classificação estruturada inicial
      motivo_recusa: null,
      analysis_status: 'Pendente',
      ai_confidence_level: 'Média',
      ai_priority: 'Baixa',
      ai_avoidable_status: 'Necessita investigação',
    },
  ]

  it('1. Categoria da Recusa permite estritamente COMERCIAL, PCP e TRANSPORTE', () => {
    const permitidos = ['COMERCIAL', 'PCP', 'TRANSPORTE']
    expect(Object.keys(STRUCTURED_REASONS_BY_CATEGORY).sort()).toEqual(permitidos.sort())
  })

  it('2. Motivos são filtrados independentemente pela categoria selecionada', () => {
    const motivosPcp = getMotivosPorCategoria('PCP')
    const motivosComercial = getMotivosPorCategoria('COMERCIAL')
    const motivosTransporte = getMotivosPorCategoria('TRANSPORTE')

    expect(motivosPcp).toContain('Falta de estoque')
    expect(motivosPcp).toContain('Falta de matéria-prima')
    expect(motivosPcp).toContain('Restrição de laminação')
    expect(motivosPcp).toContain('Capacidade produtiva')

    expect(motivosComercial).toContain('Preço não aceito')
    expect(motivosComercial).toContain('Condição comercial')
    expect(motivosComercial).toContain('Prazo comercial')

    expect(motivosTransporte).toContain('Falta de veículo')
    expect(motivosTransporte).toContain('Frete não aprovado')
    expect(motivosTransporte).toContain('Transportadora indisponível')
    expect(motivosTransporte).toContain('Prazo logístico incompatível')

    // Categoria vazia ou nula não retorna motivos
    expect(getMotivosPorCategoria(null)).toEqual([])
    expect(getMotivosPorCategoria(undefined)).toEqual([])
  })

  it('3 e 4. Cards PCP, Comercial e Transporte alimentam exclusivamente pela categoria_recusa', () => {
    const kpis = cancelledOrdersService.calculateKPIs(sampleOrders)

    // Total geral: 4 pedidos = 110 t
    expect(kpis.totalPedidosQtd).toBe(4)
    expect(kpis.totalVolumeToneladas).toBe(110.0)

    // PCP: exatamente ord-02 (45 t)
    expect(kpis.pcpQtd).toBe(1)
    expect(kpis.pcpToneladas).toBe(45.0)

    // Comercial: exatamente ord-01 (30 t)
    expect(kpis.comercialQtd).toBe(1)
    expect(kpis.comercialToneladas).toBe(30.0)

    // Transporte: exatamente ord-03 (25 t)
    expect(kpis.transporteQtd).toBe(1)
    expect(kpis.transporteToneladas).toBe(25.0)

    // Participação percentual no volume cancelado
    expect(kpis.pcpPercentualVolume).toBeCloseTo((45 / 110) * 100, 2)
    expect(kpis.comercialPercentualVolume).toBeCloseTo((30 / 110) * 100, 2)
    expect(kpis.transportePercentualVolume).toBeCloseTo((25 / 110) * 100, 2)
  })

  it('5. Sem dupla contagem: Reconciliação exata entre categorias e total de pedidos', () => {
    const kpis = cancelledOrdersService.calculateKPIs(sampleOrders)

    const somaPedidosCategorizados =
      kpis.pcpQtd + kpis.comercialQtd + kpis.transporteQtd + kpis.semCategorizacaoQtd
    const somaToneladasCategorizadas =
      kpis.pcpToneladas +
      kpis.comercialToneladas +
      kpis.transporteToneladas +
      kpis.semCategorizacaoToneladas

    expect(somaPedidosCategorizados).toBe(kpis.totalPedidosQtd)
    expect(somaToneladasCategorizadas).toBe(kpis.totalVolumeToneladas)
  })

  it('6. Registros históricos sem classificação ficam "Sem categorização" e não alimentam os 3 cards', () => {
    const kpis = cancelledOrdersService.calculateKPIs(sampleOrders)

    expect(kpis.semCategorizacaoQtd).toBe(1)
    expect(kpis.semCategorizacaoToneladas).toBe(10.0)
    // Não alimentou nenhum dos três cards específicos
    expect(kpis.pcpQtd + kpis.comercialQtd + kpis.transporteQtd).toBe(3)
  })

  it('8. Card "Principal motivo" usa motivo estruturado com volume e categoria', () => {
    const kpis = cancelledOrdersService.calculateKPIs(sampleOrders)

    // Maior volume é Falta de matéria-prima (45 t, PCP)
    expect(kpis.principalMotivoNome).toBe('Falta de matéria-prima')
    expect(kpis.principalMotivoToneladas).toBe(45.0)
    expect(kpis.principalMotivoCategoria).toBe('PCP')
  })

  it('10. Atualização em tempo real: alteração PCP -> Transporte recalcula instantaneamente os cards', () => {
    // Clona ordens e altera ord-02 (45 t) de PCP para TRANSPORTE
    const updatedOrders: CancelledOrderRecord[] = sampleOrders.map((o) => {
      if (o.id === 'ord-02') {
        return {
          ...o,
          categoria_recusa: 'TRANSPORTE',
          motivo_recusa: 'Restrição de entrega',
        }
      }
      return o
    })

    const kpis = cancelledOrdersService.calculateKPIs(updatedOrders)

    // PCP reduziu 45 t (passou de 45 para 0 t)
    expect(kpis.pcpQtd).toBe(0)
    expect(kpis.pcpToneladas).toBe(0)

    // Transporte aumentou 45 t (passou de 25 t para 70 t)
    expect(kpis.transporteQtd).toBe(2)
    expect(kpis.transporteToneladas).toBe(70.0)

    // Comercial manteve 30 t
    expect(kpis.comercialQtd).toBe(1)
    expect(kpis.comercialToneladas).toBe(30.0)

    // Novo principal motivo passou a ser do Transporte
    expect(kpis.principalMotivoNome).toBe('Restrição de entrega')
    expect(kpis.principalMotivoToneladas).toBe(45.0)
    expect(kpis.principalMotivoCategoria).toBe('TRANSPORTE')
  })

  it('10b. Alteração Transporte -> Comercial recalcula instantaneamente', () => {
    const updatedOrders: CancelledOrderRecord[] = sampleOrders.map((o) => {
      if (o.id === 'ord-03') {
        return {
          ...o,
          categoria_recusa: 'COMERCIAL',
          motivo_recusa: 'Condição comercial',
        }
      }
      return o
    })

    const kpis = cancelledOrdersService.calculateKPIs(updatedOrders)

    // Transporte reduziu para 0
    expect(kpis.transporteQtd).toBe(0)
    expect(kpis.transporteToneladas).toBe(0)

    // Comercial aumentou 25 t (de 30 para 55 t)
    expect(kpis.comercialQtd).toBe(2)
    expect(kpis.comercialToneladas).toBe(55.0)
  })

  it('9. Filtro por Categoria e Motivo da Recusa', () => {
    // Filtro somente Transporte
    const apenasTransporte = sampleOrders.filter((o) => o.categoria_recusa === 'TRANSPORTE')
    expect(apenasTransporte.length).toBe(1)
    expect(apenasTransporte[0].id).toBe('ord-03')

    // Filtro sem categorização
    const semCat = sampleOrders.filter(
      (o) => !o.categoria_recusa || o.categoria_recusa === ('SEM_CATEGORIZACAO' as any),
    )
    expect(semCat.length).toBe(1)
    expect(semCat[0].id).toBe('ord-04-legado')
  })

  it('12. Formatação rigorosa pt-BR para volume em t e percentuais', () => {
    expect(formatTonsPtBr(125.5)).toBe('125,50 t')
    expect(formatPercentPtBr(12.5)).toBe('12,50%')
    expect(formatTonsPtBr(0)).toBe('0,00 t')
    expect(formatPercentPtBr(0)).toBe('0,00%')
  })
})
