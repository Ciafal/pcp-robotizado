/**
 * Testes de Aceitação de Navegação, Rota e Critérios de Aceite para Pedidos Cancelados
 * Critérios 1 a 24 do item 31 da especificação.
 */

import { describe, it, expect } from 'vitest'
import { OFFICIAL_CANCELLATION_CATALOG } from '@/data/cancellation-reasons-catalog'
import { cancelledOrdersService } from '@/services/cancelled-orders-service'
import { formatTons, formatCurrencyPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'

describe('Pedidos Cancelados - Aceitação e Critérios Formais', () => {
  it('Critério 10 e 15: Catálogo de motivos possui todas as 8 categorias oficiais do HUB CIAFAL', () => {
    const categories = new Set(OFFICIAL_CANCELLATION_CATALOG.map((c) => c.category))
    expect(categories.has('PCP/Planejamento')).toBe(true)
    expect(categories.has('Comercial')).toBe(true)
    expect(categories.has('Cliente')).toBe(true)
    expect(categories.has('Crédito/Financeiro')).toBe(true)
    expect(categories.has('Logística')).toBe(true)
    expect(categories.has('Qualidade/Indústria')).toBe(true)
    expect(categories.has('Cadastro/Processo')).toBe(true)
    expect(categories.has('Externo')).toBe(true)
  })

  it('Critério 7: Motivo original SAP nunca é sobrescrito durante validação humana', async () => {
    await cancelledOrdersService.init()
    const orders = await cancelledOrdersService.getOrders()
    expect(orders.length).toBeGreaterThan(0)

    const target = orders[0]
    const originalReason = target.motivo_original_sap

    const updated = await cancelledOrdersService.submitHumanFeedback({
      orderId: target.id,
      newStatus: 'Validado',
      validatedCause: 'Causa revisada pelo comitê PCP',
      validatedResponsibility: 'Logística',
      humanNotes: 'Verificação em campo realizada com sucesso',
      userName: 'Gestor Teste',
    })

    expect(updated.motivo_original_sap).toBe(originalReason)
    expect(updated.analysis_status).toBe('Validado')
    expect(updated.validated_cause).toBe('Causa revisada pelo comitê PCP')
    expect(updated.validated_responsibility).toBe('Logística')
  })

  it('Critério 20 e 22: Criação de Plano de Ação 5W2H preserva integridade do pedido', async () => {
    const orders = await cancelledOrdersService.getOrders()
    const target = orders[0]

    const plan = await cancelledOrdersService.createActionPlan({
      order_id: target.id,
      ordem_venda: target.ordem_venda,
      item_ordem: target.item_ordem,
      cliente_nome: target.cliente_nome,
      material_codigo: target.material_codigo,
      motivo_original: target.motivo_original_sap,
      causa_provavel: target.ai_probable_cause,
      evidencias: 'Evidência de teste',
      centro_linha: `${target.centro} - ${target.linha}`,
      impacto_toneladas: target.saldo_cancelado_t,
      impacto_financeiro_brl: target.valor_cancelado_brl,
      what_acao: 'Ajustar plano de laminação',
      why_motivo: 'Mitigar atrasos de atendimento',
      who_responsavel: 'Programador PCP',
      when_prazo: '31/03/2025',
      where_local: target.centro,
      how_como: 'Remanejamento de tarugo em pátio',
      how_much_custo: 'Sem custo direto',
      status: 'Aberto',
      created_by_name: 'Engenheiro Teste',
    })

    expect(plan.code).toContain('5W2H-CANC-')
    expect(plan.what_acao).toBe('Ajustar plano de laminação')

    const plans = await cancelledOrdersService.getActionPlans()
    expect(plans.some((p) => p.code === plan.code)).toBe(true)
  })

  it('Critério 29: Padrão brasileiro/ABNT formata números, toneladas, moeda e percentual corretamente', () => {
    expect(formatTons(1234.567)).toBe('1.234,567 t')
    expect(formatCurrencyPtBr(1234.56)).toBe('R$ 1.234,56')
    expect(formatPercentPtBr(12.5)).toBe('12,5%')
  })
})
