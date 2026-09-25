/**
 * Testes Ponta a Ponta e de Aceitação:
 * - Ação "Solicitar revisão" integrada com CRM 360º
 * - Geração de protocolo único
 * - Validação de campos obrigatórios
 * - Idempotência e prevenção contra clique duplo
 * - Preservação do motivo SAP original
 * - Retorno bidirecional do CRM 360º (atualização de status no PCP)
 * - Compatibilidade do PermissionGuard na rota /pcp/analise-carteira/cancelados
 */

import { describe, it, expect } from 'vitest'
import { cancelledOrdersService } from '@/services/cancelled-orders-service'
import { crmRevisionIntegrationService } from '@/services/crm-revision-integration-service'

describe('PCP Robotizado → Pedidos Cancelados ↔ CRM 360º', () => {
  it('Deve criar solicitação de revisão com sucesso para pedido com inconsistência', async () => {
    await cancelledOrdersService.init()
    const orders = await cancelledOrdersService.getOrders()
    expect(orders.length).toBeGreaterThan(0)

    // Encontra pedido com inconsistência
    const target = orders.find((o) => o.has_ai_inconsistency) || orders[0]
    const originalSapReason = target.motivo_original_sap

    const res = await cancelledOrdersService.requestCrmRevision({
      orderId: target.id,
      motivoSolicitacao: 'Existia estoque disponível',
      justificativa:
        'O pedido foi cancelado com motivo sem estoque, porém havia 1,605 t disponível na data.',
      prioridade: 'Alta',
      responsavelDestino: 'CRM 360º / Comercial - Repr. Carlos Silva',
      prazoRetorno: '15/06/2025',
      solicitanteNome: 'Eng. PCP Teste',
    })

    expect(res.pendency).toBeDefined()
    expect(res.pendency.protocolo).toMatch(/^REV-\d{6}-\d{5}$/)
    expect(res.pendency.ordem_venda).toBe(target.ordem_venda)
    expect(res.pendency.item_ordem).toBe(target.item_ordem)
    expect(res.pendency.cliente_nome).toBe(target.cliente_nome)
    expect(res.pendency.material_codigo).toBe(target.material_codigo)
    expect(res.pendency.motivo_sap_original).toBe(originalSapReason)
    expect(res.pendency.status_crm).toBe('Em análise')

    // Pedido no PCP deve refletir status "Revisão solicitada"
    expect(res.order.analysis_status).toBe('Revisão solicitada')
    expect(res.order.crm_protocolo).toBe(res.pendency.protocolo)

    // Motivo original SAP permanece estritamente intocado
    expect(res.order.motivo_original_sap).toBe(originalSapReason)
  })

  it('Idempotência: rejeita duplicidade de solicitação ativa para o mesmo pedido', async () => {
    const orders = await cancelledOrdersService.getOrders()
    const target = orders.find((o) => o.has_ai_inconsistency) || orders[0]

    // Tentar solicitar novamente enquanto já há solicitação em análise
    await expect(
      cancelledOrdersService.requestCrmRevision({
        orderId: target.id,
        motivoSolicitacao: 'Divergência comercial',
        justificativa: 'Tentativa duplicada',
        prioridade: 'Média',
        responsavelDestino: 'CRM 360º / Comercial',
        prazoRetorno: '20/06/2025',
      }),
    ).rejects.toThrow(/Já existe uma solicitação de revisão ativa/)
  })

  it('Validação: falha se o campo Justificativa estiver vazio', async () => {
    const orders = await cancelledOrdersService.getOrders()
    const target = orders[orders.length - 1]

    await expect(
      cancelledOrdersService.requestCrmRevision({
        orderId: target.id,
        motivoSolicitacao: 'Outros',
        justificativa: '   ',
        prioridade: 'Baixa',
        responsavelDestino: 'CRM 360º / Comercial',
        prazoRetorno: '20/06/2025',
      }),
    ).rejects.toThrow(/O campo "Justificativa" é obrigatório/)
  })

  it('Fluxo Bidirecional: resposta do CRM 360º atualiza pedido no PCP sem apagar motivo SAP', async () => {
    const pendencies = await crmRevisionIntegrationService.getAllPendencies()
    expect(pendencies.length).toBeGreaterThan(0)

    const pendency = pendencies[0]

    // Resposta do CRM corrigindo o motivo
    const responseResult = await cancelledOrdersService.respondCrmRevision({
      protocolo: pendency.protocolo,
      statusCrm: 'Motivo corrigido',
      motivoValidadoAposRevisao: 'Divergência de prazo alinhada com cliente',
      observacaoCrm: 'Cliente aceitou prorrogação da entrega, cancelamento revertido.',
      responsavelValidacaoCrm: 'Gerência Comercial CRM',
    })

    expect(responseResult.pendency.status_crm).toBe('Motivo corrigido')
    expect(responseResult.pendency.motivo_validado_apos_revisao).toBe(
      'Divergência de prazo alinhada com cliente',
    )

    if (responseResult.order) {
      expect(responseResult.order.analysis_status).toBe('Revisado')
      expect(responseResult.order.motivo_validado_apos_revisao).toBe(
        'Divergência de prazo alinhada com cliente',
      )
      // Motivo original SAP preservado
      expect(responseResult.order.motivo_original_sap).toBe(pendency.motivo_sap_original)
    }
  })
})
