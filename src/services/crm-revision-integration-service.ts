/**
 * Serviço de Integração Bidirecional entre PCP Robotizado e CRM 360º
 * Módulo: Solicitação de Revisão de Pedidos Cancelados
 * Suporta persistência real no PocketBase (pcp_crm_revision_pendencies),
 * fallback idempotente em memória, geração de protocolo e auditoria imutável.
 */

import pb from '@/lib/pocketbase/client'
import {
  CancelledOrderRecord,
  CrmRevisionPendencyRecord,
  CrmRevisionReason,
  CrmRevisionStatus,
  PriorityLevel,
} from '@/types/cancelled-orders'
import { pcpAuditService } from '@/services/pcp-audit-service'

export interface CreateRevisionRequestParams {
  order: CancelledOrderRecord
  motivoSolicitacao: CrmRevisionReason
  justificativa: string
  prioridade: PriorityLevel
  responsavelDestino: string
  prazoRetorno: string
  solicitanteNome?: string
}

export interface RespondRevisionParams {
  protocolo: string
  statusCrm: CrmRevisionStatus
  motivoValidadoAposRevisao?: string
  observacaoCrm?: string
  responsavelValidacaoCrm: string
}

class CrmRevisionIntegrationService {
  private memoryPendencies: CrmRevisionPendencyRecord[] = []
  private inflightRequests: Set<string> = new Set()
  private initialized = false

  public async init(): Promise<void> {
    if (this.initialized) return

    try {
      const records = await pb.collection('pcp_crm_revision_pendencies').getFullList({
        sort: '-created',
      })
      if (records && records.length > 0) {
        this.memoryPendencies = records.map((r: any) => ({
          id: r.id,
          protocolo: r.protocolo,
          order_id: r.order_id,
          origem: r.origem,
          tipo_pendencia: r.tipo_pendencia,
          empresa: r.empresa,
          centro: r.centro,
          linha: r.linha,
          ordem_venda: r.ordem_venda,
          item_ordem: r.item_ordem,
          cliente_codigo: r.cliente_codigo,
          cliente_nome: r.cliente_nome,
          representante_vendedor: r.representante_vendedor,
          material_codigo: r.material_codigo,
          material_descricao: r.material_descricao,
          quantidade_t: Number(r.quantidade_t || 0),
          valor_brl: Number(r.valor_brl || 0),
          data_ordem: r.data_ordem,
          data_desejada: r.data_desejada,
          motivo_sap_original: r.motivo_sap_original,
          categoria_motivo: r.categoria_motivo,
          analise_ia: r.analise_ia,
          evidencias_ia: r.evidencias_ia,
          responsabilidade_provavel: r.responsabilidade_provavel,
          motivo_solicitacao: r.motivo_solicitacao as CrmRevisionReason,
          justificativa: r.justificativa,
          prioridade: r.prioridade as PriorityLevel,
          responsavel_destino: r.responsavel_destino,
          prazo_retorno: r.prazo_retorno,
          solicitante_nome: r.solicitante_nome,
          data_solicitacao: r.data_solicitacao,
          status_crm: r.status_crm as CrmRevisionStatus,
          motivo_validado_apos_revisao: r.motivo_validado_apos_revisao,
          observacao_crm: r.observacao_crm,
          responsavel_validacao_crm: r.responsavel_validacao_crm,
          data_conclusao_crm: r.data_conclusao_crm,
          payload_completo: r.payload_completo,
          created: r.created,
          updated: r.updated,
        }))
      }
    } catch {
      // Fallback em memória
    }

    this.initialized = true
  }

  /**
   * Gera protocolo oficial único no padrão CIAFAL
   * Ex: REV-202505-12345
   */
  public generateProtocol(): string {
    const now = new Date()
    const ano = now.getFullYear()
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const rand = Math.floor(10000 + Math.random() * 90000)
    return `REV-${ano}${mes}-${rand}`
  }

  /**
   * Cria solicitação de revisão com validação, idempotência e auditoria completa
   */
  public async createRevisionRequest(
    params: CreateRevisionRequestParams,
  ): Promise<CrmRevisionPendencyRecord> {
    await this.init()

    const {
      order,
      motivoSolicitacao,
      justificativa,
      prioridade,
      responsavelDestino,
      prazoRetorno,
      solicitanteNome = 'Eng. PCP / Operação',
    } = params

    // 1. Validações de campos obrigatórios
    if (!justificativa || !justificativa.trim()) {
      throw new Error('O campo "Justificativa" é obrigatório.')
    }
    if (!motivoSolicitacao) {
      throw new Error('O "Motivo da solicitação" é obrigatório.')
    }
    if (!responsavelDestino || !responsavelDestino.trim()) {
      throw new Error('A "Área / Responsável de destino" é obrigatória.')
    }

    // 2. Idempotência / Bloqueio duplo clique no backend
    const lockKey = `${order.id}-${order.ordem_venda}-${order.item_ordem}`
    if (this.inflightRequests.has(lockKey)) {
      throw new Error('Uma solicitação de revisão para esta ordem já está em processamento.')
    }

    // Verifica se já existe pendência ativa não concluída para esta OV + item
    const existingActive = this.memoryPendencies.find(
      (p) =>
        (p.order_id === order.id ||
          (p.ordem_venda === order.ordem_venda && p.item_ordem === order.item_ordem)) &&
        p.status_crm === 'Em análise',
    )
    if (existingActive) {
      throw new Error(
        `Já existe uma solicitação de revisão ativa para esta ordem (Protocolo nº ${existingActive.protocolo}).`,
      )
    }

    this.inflightRequests.add(lockKey)

    try {
      const protocolo = this.generateProtocol()
      const dataSolicitacao = new Date().toLocaleString('pt-BR')

      const evidenciasStr =
        order.ai_analysis_payload?.evidences?.join(' | ') ||
        (order.has_ai_inconsistency ? order.ai_probable_cause : 'Sem evidências adicionais')

      const pendencyData: Omit<CrmRevisionPendencyRecord, 'id'> = {
        protocolo,
        order_id: order.id,
        origem: 'PCP Robotizado → Pedidos Cancelados',
        tipo_pendencia: 'Revisão de Pedido Cancelado',
        empresa: order.empresa || 'CIAFAL',
        centro: order.centro,
        linha: order.linha,
        ordem_venda: order.ordem_venda,
        item_ordem: order.item_ordem,
        cliente_codigo: order.cliente_codigo,
        cliente_nome: order.cliente_nome,
        representante_vendedor: order.representante_vendedor || 'Padrão Comercial',
        material_codigo: order.material_codigo,
        material_descricao: order.material_descricao,
        quantidade_t: order.saldo_cancelado_t,
        valor_brl: order.valor_cancelado_brl,
        data_ordem: order.data_ordem,
        data_desejada: order.data_desejada_cliente || '',
        motivo_sap_original: order.motivo_original_sap,
        categoria_motivo: order.categoria_motivo,
        analise_ia: order.ai_probable_cause || order.ai_verification_status,
        evidencias_ia: evidenciasStr,
        responsabilidade_provavel: order.ai_suggested_responsibility || 'PCP',
        motivo_solicitacao: motivoSolicitacao,
        justificativa: justificativa.trim(),
        prioridade,
        responsavel_destino: responsavelDestino.trim(),
        prazo_retorno: prazoRetorno || '',
        solicitante_nome: solicitanteNome,
        data_solicitacao: dataSolicitacao,
        status_crm: 'Em análise',
        payload_completo: {
          estoque_disponivel_data_t: order.estoque_disponivel_data_t,
          preco_liquido: order.preco_liquido,
          curva_abc: order.curva_abc,
          ai_confidence_level: order.ai_confidence_level,
          ai_avoidable_status: order.ai_avoidable_status,
          usuario_operacao_sap: order.usuario_operacao,
        },
      }

      let createdId = `CRM-REV-${Date.now()}`

      try {
        const pbRecord = await pb.collection('pcp_crm_revision_pendencies').create({
          ...pendencyData,
        })
        if (pbRecord?.id) {
          createdId = pbRecord.id
        }
      } catch (dbErr: any) {
        console.warn('Persistência PocketBase de pendência CRM falhou, usando memória:', dbErr)
      }

      const fullRecord: CrmRevisionPendencyRecord = {
        ...pendencyData,
        id: createdId,
        created: new Date().toISOString(),
      }

      this.memoryPendencies.unshift(fullRecord)

      // Registrar auditoria imutável detalhada
      try {
        await pcpAuditService.recordLog({
          user_name: solicitanteNome,
          action: `+ SOLICITAÇÃO REVISÃO CANCELAMENTO AO CRM [${protocolo}]`,
          entity: 'pcp_crm_revision_pendencies',
          record_id: fullRecord.id,
          module: 'Gestão de Carteira',
          screen: 'Pedidos Cancelados',
          line: order.linha,
          center: order.centro,
          reason: motivoSolicitacao,
          justification: `Encaminhado ao CRM 360º para revisão do pedido ${order.ordem_venda}/${order.item_ordem}: ${justificativa.slice(0, 150)}`,
          details: {
            protocolo,
            ordem_venda: order.ordem_venda,
            item_ordem: order.item_ordem,
            cliente_codigo: order.cliente_codigo,
            cliente_nome: order.cliente_nome,
            material_codigo: order.material_codigo,
            motivo_original_sap: order.motivo_original_sap,
            analise_ia: order.ai_probable_cause,
            evidencias_ia: evidenciasStr,
            solicitante: solicitanteNome,
            responsavel_crm: responsavelDestino,
            prioridade,
            prazo_retorno: prazoRetorno,
            data_solicitacao: dataSolicitacao,
          },
        })
      } catch {
        // auditoria resiliente
      }

      return fullRecord
    } finally {
      this.inflightRequests.delete(lockKey)
    }
  }

  /**
   * Resposta do CRM 360º (Fluxo Bidirecional)
   * Status CRM: 'Em análise' | 'Motivo confirmado' | 'Motivo corrigido' | 'Improcedente' | 'Concluído'
   */
  public async respondRevision(params: RespondRevisionParams): Promise<CrmRevisionPendencyRecord> {
    await this.init()

    const idx = this.memoryPendencies.findIndex((p) => p.protocolo === params.protocolo)
    if (idx === -1) {
      throw new Error(`Solicitação de revisão nº ${params.protocolo} não encontrada.`)
    }

    const pendency = this.memoryPendencies[idx]
    const dataConclusao = new Date().toLocaleString('pt-BR')

    const updated: CrmRevisionPendencyRecord = {
      ...pendency,
      status_crm: params.statusCrm,
      motivo_validado_apos_revisao: params.motivoValidadoAposRevisao,
      observacao_crm: params.observacaoCrm,
      responsavel_validacao_crm: params.responsavelValidacaoCrm,
      data_conclusao_crm: dataConclusao,
      updated: new Date().toISOString(),
    }

    this.memoryPendencies[idx] = updated

    try {
      await pb.collection('pcp_crm_revision_pendencies').update(pendency.id, {
        status_crm: updated.status_crm,
        motivo_validado_apos_revisao: updated.motivo_validado_apos_revisao,
        observacao_crm: updated.observacao_crm,
        responsavel_validacao_crm: updated.responsavel_validacao_crm,
        data_conclusao_crm: updated.data_conclusao_crm,
      })
    } catch {
      // memoria resiliente
    }

    // Auditoria de retorno CRM
    try {
      await pcpAuditService.recordLog({
        user_name: params.responsavelValidacaoCrm,
        action: `~ RETORNO CRM REVISÃO CANCELAMENTO [${params.protocolo}]`,
        entity: 'pcp_crm_revision_pendencies',
        record_id: pendency.id,
        module: 'CRM 360º / Gestão de Carteira',
        screen: 'Pedidos Cancelados',
        line: pendency.linha,
        center: pendency.centro,
        reason: params.statusCrm,
        justification: `Retorno do CRM: status '${params.statusCrm}', motivo validado: '${params.motivoValidadoAposRevisao || 'Nenhum'}'`,
        details: {
          protocolo: params.protocolo,
          status_anterior: pendency.status_crm,
          status_novo: params.statusCrm,
          motivo_validado: params.motivoValidadoAposRevisao,
          observacao: params.observacaoCrm,
          responsavel: params.responsavelValidacaoCrm,
          data_conclusao: dataConclusao,
        },
      })
    } catch {
      // silencia
    }

    return updated
  }

  public async getPendencyByProtocol(protocolo: string): Promise<CrmRevisionPendencyRecord | null> {
    await this.init()
    const found = this.memoryPendencies.find((p) => p.protocolo === protocolo)
    return found || null
  }

  public async getPendenciesByOrderId(orderId: string): Promise<CrmRevisionPendencyRecord[]> {
    await this.init()
    return this.memoryPendencies.filter((p) => p.order_id === orderId)
  }

  public async getAllPendencies(): Promise<CrmRevisionPendencyRecord[]> {
    await this.init()
    return [...this.memoryPendencies]
  }
}

export const crmRevisionIntegrationService = new CrmRevisionIntegrationService()
