import { pb } from '@/lib/pocketbase/client'
import {
  ChecklistFechamentoExecucao,
  ChecklistFechamentoItem,
  FechamentoDestinatario,
  FechamentoComunicacao,
  DestinatarioGrupo,
} from '@/types/checklist-fechamento'
import { fechamentoDestinatariosService } from './fechamento-destinatarios-service'

class FechamentoEnvioService {
  /**
   * Log de auditoria em pcp_audit_logs
   */
  private async logAuditoria(dados: {
    acao: string
    descricao: string
    competencia?: string
    resultado?: 'SUCCESS' | 'FAILED'
    detalhes?: Record<string, any>
  }): Promise<void> {
    try {
      const user = pb.authStore.record
      await pb.collection('pcp_audit_logs').create({
        user_id: user?.id || 'admin-user',
        user_name: user?.name || user?.email || 'Controle de Produção',
        user_email: user?.email || 'pcp@ciafal.com.br',
        user_role: (user?.role as string) || 'PCP_ADMIN',
        event_type: 'SCHEDULE_ACTION',
        action: dados.acao,
        resource: 'FECHAMENTO_COMUNICACAO',
        record_id: dados.competencia || '',
        status: dados.resultado === 'FAILED' ? 'Erro' : 'Concluído',
        outcome: dados.resultado || 'SUCCESS',
        module: 'CONTROLE_DE_PRODUCAO',
        screen: 'Check-list Fechamento - Envio',
        company: 'CIAFAL',
        reason: dados.descricao,
        justification: dados.descricao,
        details: {
          competencia: dados.competencia,
          ...dados.detalhes,
        },
      })
    } catch (err) {
      console.warn('Falha silenciosa ao registrar auditoria de envio:', err)
    }
  }

  /**
   * Lista comunicações enviadas para uma competência
   */
  async listarComunicacoes(execucaoId: string): Promise<FechamentoComunicacao[]> {
    try {
      const records = await pb.collection('fechamento_comunicacoes').getFullList({
        filter: `execucao_id = "${execucaoId}"`,
        sort: '-created',
      })
      return records.map((r: any) => ({
        id: r.id,
        execucao_id: r.execucao_id,
        competencia: r.competencia,
        assunto: r.assunto,
        corpo_mensagem: r.corpo_mensagem,
        destinatarios_json: r.destinatarios_json || [],
        grupo_destinatario: r.grupo_destinatario || '',
        data_envio: r.data_envio || r.created,
        enviado_por: r.enviado_por,
        remetente_email: r.remetente_email || '',
        status: r.status,
        sucesso: r.sucesso ?? r.status === 'Enviado',
        erro_detalhe: r.erro_detalhe || '',
        eh_reenvio: r.eh_reenvio ?? false,
        comunicacao_original_id: r.comunicacao_original_id || '',
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.warn('Erro ao listar comunicações de fechamento:', err)
      return []
    }
  }

  /**
   * Dispara o envio do formulário de fechamento para um grupo específico
   * (Grupo 1: Contabilidade, Grupo 2: Produção).
   *
   * Utiliza a integração corporativa de e-mail existente no HUB (/backend/v1/pcp/summaries/send-email).
   * Se o servidor não tiver credenciais SMTP externas, registra a falha de forma graciosa e auditada.
   */
  async enviarFechamentoGrupo(params: {
    execucao: ChecklistFechamentoExecucao
    grupo: DestinatarioGrupo
    assuntoCustomizado?: string
    corpoMensagem: string
    destinatariosSelecionados?: FechamentoDestinatario[]
    ehReenvio?: boolean
    comunicacaoOriginalId?: string
  }): Promise<{ sucesso: boolean; mensagem: string; comunicacao: FechamentoComunicacao }> {
    const user = pb.authStore.record
    const remetenteEmail = user?.email || 'pcp@ciafal.com.br'
    const remetenteNome = user?.name || user?.email || 'Controle de Produção CIAFAL'

    // 1. Obter destinatários ativos do grupo se não passados
    const destinatarios =
      params.destinatariosSelecionados && params.destinatariosSelecionados.length > 0
        ? params.destinatariosSelecionados
        : await fechamentoDestinatariosService.listarAtivosPorGrupo(params.grupo)

    if (destinatarios.length === 0) {
      throw new Error(
        `Nenhum destinatário ativo cadastrado para o Grupo "${params.grupo}". Cadastre destinatários antes de enviar.`,
      )
    }

    const destinatariosJson = destinatarios.map((d) => ({
      nome: d.nome,
      email: d.email,
      grupo: d.grupo,
    }))

    const assuntoPadrao =
      params.grupo === 'Contabilidade'
        ? `[FECHAMENTO CONTROLE DE PRODUÇÃO] Conclusão Competência ${params.execucao.competencia} - CIAFAL`
        : `[AVISO PRODUÇÃO] Período Fechado - Competência ${params.execucao.competencia} - CIAFAL (Ajustes Bloqueados)`

    const assuntoFinal = params.assuntoCustomizado?.trim() || assuntoPadrao

    let statusEnvio: 'Enviado' | 'Erro' = 'Erro'
    let erroDetalhe: string = ''
    let sucessoEnvio = false

    // 2. Chamar o mecanismo corporativo de envio do HUB
    try {
      const response = await pb.send('/backend/v1/pcp/summaries/send-email', {
        method: 'POST',
        body: {
          summary_code: `FECH-${params.execucao.competencia}-${params.grupo}`,
          recipients: destinatarios.map((d) => d.email),
          groups: [params.grupo],
          subject: assuntoFinal,
          message: params.corpoMensagem,
        },
      })

      if (response && (response.success || response.status === 'enviado')) {
        statusEnvio = 'Enviado'
        sucessoEnvio = true
      } else {
        statusEnvio = 'Erro'
        erroDetalhe = response?.message || 'Falha no retorno do serviço de e-mail corporativo'
      }
    } catch (err: any) {
      // Registrar falha de forma graciosa sem quebrar a aplicação
      statusEnvio = 'Erro'
      erroDetalhe =
        err?.data?.message ||
        err?.message ||
        'Integração corporativa de e-mail não configurada no servidor (SMTP ausente).'
    }

    // 3. Gravar na collection fechamento_comunicacoes
    const payloadComunicacao = {
      execucao_id: params.execucao.id,
      competencia: params.execucao.competencia,
      assunto: assuntoFinal,
      corpo_mensagem: params.corpoMensagem,
      destinatarios_json: destinatariosJson,
      grupo_destinatario: params.grupo,
      data_envio: new Date().toISOString(),
      enviado_por: remetenteNome,
      remetente_email: remetenteEmail,
      status: statusEnvio,
      sucesso: sucessoEnvio,
      erro_detalhe: erroDetalhe,
      eh_reenvio: params.ehReenvio ?? false,
      comunicacao_original_id: params.comunicacaoOriginalId || '',
    }

    const commRecord = await pb.collection('fechamento_comunicacoes').create(payloadComunicacao)

    // 4. Auditoria imutável em pcp_audit_logs
    await this.logAuditoria({
      acao: params.ehReenvio ? 'REENVIAR_FECHAMENTO' : 'ENVIAR_FECHAMENTO',
      descricao: `Envio do fechamento ${params.execucao.competencia} para o Grupo ${params.grupo} (${destinatarios.length} destinatários). Resultado: ${sucessoEnvio ? 'Sucesso' : 'Falha (' + erroDetalhe + ')'}`,
      competencia: params.execucao.competencia,
      resultado: sucessoEnvio ? 'SUCCESS' : 'FAILED',
      detalhes: {
        comunicacao_id: commRecord.id,
        grupo: params.grupo,
        destinatarios: destinatarios.map((d) => d.email),
        assunto: assuntoFinal,
        eh_reenvio: params.ehReenvio,
        erro: erroDetalhe,
      },
    })

    const comunicacao: FechamentoComunicacao = {
      id: commRecord.id,
      execucao_id: commRecord.execucao_id,
      competencia: commRecord.competencia,
      assunto: commRecord.assunto,
      corpo_mensagem: commRecord.corpo_mensagem,
      destinatarios_json: commRecord.destinatarios_json,
      grupo_destinatario: commRecord.grupo_destinatario,
      data_envio: commRecord.data_envio,
      enviado_por: commRecord.enviado_por,
      remetente_email: commRecord.remetente_email,
      status: commRecord.status,
      sucesso: commRecord.sucesso,
      erro_detalhe: commRecord.erro_detalhe,
      eh_reenvio: commRecord.eh_reenvio,
      comunicacao_original_id: commRecord.comunicacao_original_id,
      created: commRecord.created,
      updated: commRecord.updated,
    }

    return {
      sucesso: sucessoEnvio,
      mensagem: sucessoEnvio
        ? `Fechamento enviado com sucesso para o Grupo ${params.grupo}!`
        : `Registro de comunicação gravado com status de falha técnica (${erroDetalhe}).`,
      comunicacao,
    }
  }

  /**
   * Reenvia uma comunicação já existente
   */
  async reenviarComunicacao(
    comunicacaoOriginal: FechamentoComunicacao,
    execucao: ChecklistFechamentoExecucao,
  ): Promise<{ sucesso: boolean; mensagem: string; comunicacao: FechamentoComunicacao }> {
    const grupo = (comunicacaoOriginal.grupo_destinatario || 'Contabilidade') as DestinatarioGrupo
    return this.enviarFechamentoGrupo({
      execucao,
      grupo,
      assuntoCustomizado: `[REENVIO] ${comunicacaoOriginal.assunto.replace('[REENVIO] ', '')}`,
      corpoMensagem: comunicacaoOriginal.corpo_mensagem,
      ehReenvio: true,
      comunicacaoOriginalId: comunicacaoOriginal.id,
    })
  }
}

export const fechamentoEnvioService = new FechamentoEnvioService()
export default fechamentoEnvioService
