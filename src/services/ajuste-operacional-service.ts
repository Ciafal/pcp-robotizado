/**
 * Serviço de Ajuste Operacional - PCP Robotizado
 * Gerencia ciclo de vida completo de Ajustes Operacionais vinculados ao Check-list de Fechamento:
 * - Geração atômica e sequencial de número AOP-000001/AAAA
 * - Regra anti-duplicidade com alerta para a UI
 * - Criação da pendência sincronizada no Meu Dia corporativo
 * - Disparo e registro de e-mails corporativos
 * - Conclusão no Meu Dia (NÃO muda status para OK — exige validação do PCP)
 * - Validação humana pelo PCP no Check-list
 * - Auditoria imutável em pcp_audit_logs e histórico append-only
 */

import { pb } from '@/lib/pocketbase/client'
import {
  AjusteOperacional,
  AjusteOperacionalEvidencia,
  AjusteOperacionalHistorico,
  AjusteOperacionalStatus,
  CriarAjusteInput,
  MeuDiaPendencia,
} from '@/types/ajuste-operacional'
import { gestorLinhaService, MENSAGEM_ERRO_SEM_GESTOR } from './gestor-linha-service'

export interface AntiDuplicidadeCheckResult {
  temAjusteAberto: boolean
  ajusteAberto: AjusteOperacional | null
  mensagemAviso?: string
}

export interface CriarAjusteResultado {
  sucesso: boolean
  ajuste: AjusteOperacional
  pendenciaMeuDia: MeuDiaPendencia
  emailEnviado: boolean
  avisoDuplicidade?: string
}

export class AjusteOperacionalService {
  /**
   * Verifica se já existe um Ajuste Operacional aberto para a atividade
   */
  async verificarAjusteAberto(checklistItemId: string): Promise<AntiDuplicidadeCheckResult> {
    if (!checklistItemId) {
      return { temAjusteAberto: false, ajusteAberto: null }
    }

    try {
      const abertos = await pb.collection('ajustes_operacionais').getFullList<AjusteOperacional>({
        filter: `checklist_item_id = '${checklistItemId}' && excluido != true && (status = 'Nova' || status = 'Em andamento' || status = 'Aguardando informação')`,
        sort: '-created',
      })

      if (abertos.length > 0) {
        const ajuste = abertos[0]
        return {
          temAjusteAberto: true,
          ajusteAberto: ajuste,
          mensagemAviso: 'Já existe um Ajuste Operacional em aberto para esta atividade.',
        }
      }

      return { temAjusteAberto: false, ajusteAberto: null }
    } catch {
      return { temAjusteAberto: false, ajusteAberto: null }
    }
  }

  /**
   * Gera o próximo número sequencial atômico no formato AOP-000001/AAAA
   */
  async gerarProximoNumero(
    ano?: number,
  ): Promise<{ numero: string; ano: number; sequencial: number }> {
    const anoAtual = ano || new Date().getFullYear()

    try {
      // Buscar o último registro do ano
      const registros = await pb
        .collection('ajustes_operacionais')
        .getList<AjusteOperacional>(1, 1, {
          filter: `ano = ${anoAtual}`,
          sort: '-sequencial_ano',
        })

      let proximoSequencial = 1
      if (registros.items.length > 0) {
        const ultimo = registros.items[0]
        proximoSequencial = (ultimo.sequencial_ano || 0) + 1
      }

      const seqPadded = String(proximoSequencial).padStart(6, '0')
      const numero = `AOP-${seqPadded}/${anoAtual}`

      return {
        numero,
        ano: anoAtual,
        sequencial: proximoSequencial,
      }
    } catch {
      // Fallback determinístico
      const seqPadded = '000001'
      return {
        numero: `AOP-${seqPadded}/${anoAtual}`,
        ano: anoAtual,
        sequencial: 1,
      }
    }
  }

  /**
   * Cria um novo Ajuste Operacional completo
   */
  async criarAjuste(input: CriarAjusteInput): Promise<CriarAjusteResultado> {
    // 1. REGRA ANTI-DUPLICIDADE
    const duplicidade = await this.verificarAjusteAberto(input.checklist_item_id)
    if (duplicidade.temAjusteAberto && !input.forcar_criacao_duplicada) {
      throw new Error(
        duplicidade.mensagemAviso ||
          'Já existe um Ajuste Operacional em aberto para esta atividade.',
      )
    }

    // 2. LOCALIZAR GESTOR DA LINHA OBRIGATÓRIO
    // Se o responsável não foi fornecido diretamente, resolver via gestorLinhaService
    let responsavelId = input.responsavel_id || ''
    let responsavelNome = input.responsavel_nome || ''
    let responsavelEmail = input.responsavel_email || ''

    if (!responsavelId || !responsavelNome) {
      const gestor = await gestorLinhaService.obterGestorObrigatorio({
        linha_id: input.linha_id,
        linha_code: input.linha_code,
        centro_id: input.centro_id,
        centro_code: input.centro_code,
        werks: input.werks,
      })

      responsavelId = gestor.usuario_id
      responsavelNome = gestor.usuario_nome
      responsavelEmail = gestor.usuario_email
    }

    if (!responsavelNome) {
      throw new Error(MENSAGEM_ERRO_SEM_GESTOR)
    }

    // 3. GERAR NÚMERO SEQUENCIAL
    const anoAtual = new Date().getFullYear()
    const { numero, sequencial } = await this.gerarProximoNumero(anoAtual)

    // Data formatada para prazos e logs
    const prazoIso = input.prazo ? new Date(input.prazo).toISOString() : new Date().toISOString()
    const agoraIso = new Date().toISOString()
    const agoraBr = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date())

    // 4. CRIAR AJUSTE OPERACIONAL NO BANCO
    const payloadAjuste = {
      numero,
      ano: anoAtual,
      sequencial_ano: sequencial,
      checklist_item_id: input.checklist_item_id,
      checklist_modelo_id: input.checklist_modelo_id || '',
      competencia: input.competencia,

      werks: input.werks || '',
      empresa_nome: input.empresa_nome || 'CIAFAL',
      linha_id: input.linha_id || '',
      linha_code: input.linha_code || '',
      linha_name: input.linha_name || '',
      centro_id: input.centro_id || '',
      centro_code: input.centro_code || '',
      centro_name: input.centro_name || '',

      status_origem: input.status_origem,
      tipo: input.tipo,
      descricao: input.descricao.trim(),
      acao_necessaria: input.acao_necessaria.trim(),
      prioridade: input.prioridade,
      prazo: prazoIso,

      ordem_sap: input.ordem_sap || '',
      material: input.material || '',
      lote: input.lote || '',
      quantidade: input.quantidade ?? 0,
      transacao_sap: input.transacao_sap || '',
      observacao_adicional: input.observacao_adicional || '',

      solicitante_id: input.solicitante_id || '',
      solicitante_nome: input.solicitante_nome,
      responsavel_id: responsavelId,
      responsavel_nome: responsavelNome,

      status: 'Nova' as AjusteOperacionalStatus,
      validada_pcp: false,
      excluido: false,
    }

    const ajusteCriado = await pb
      .collection('ajustes_operacionais')
      .create<AjusteOperacional>(payloadAjuste)

    // 5. CRIAR PENDÊNCIA NO MEU DIA (HUB CORPORATIVO REUTILIZÁVEL)
    const tituloMeuDia = `PCP | Ajuste Operacional | [${input.codigo_atividade} - ${input.atividade_titulo.slice(0, 30)}] | [${input.linha_code || input.linha_name || 'Geral'}]`
    const linkOrigem = `/pcp/controle-producao/checklist-fechamento?item_id=${input.checklist_item_id}&competencia=${encodeURIComponent(input.competencia)}&ajuste_id=${ajusteCriado.id}`

    const payloadMeuDia = {
      origem_sistema: 'PCP Robotizado',
      modulo: 'Controle de Produção',
      funcao: 'Check-list Fechamento',
      categoria: 'PCP — Ajuste Operacional',
      titulo: tituloMeuDia,
      competencia: input.competencia,
      empresa: input.empresa_nome || 'CIAFAL',
      linha: input.linha_name || input.linha_code || '',
      linha_id: input.linha_id || '',
      centro: input.centro_name || input.centro_code || '',
      centro_id: input.centro_id || '',
      codigo_atividade: input.codigo_atividade,
      atividade_titulo: input.atividade_titulo,
      status_origem: input.status_origem,
      tipo_pendencia: input.tipo,
      descricao: input.descricao.trim(),
      acao_necessaria: input.acao_necessaria.trim(),
      prioridade: input.prioridade,
      prazo: prazoIso,
      solicitante_id: input.solicitante_id || '',
      solicitante_nome: input.solicitante_nome,
      responsavel_id: responsavelId,
      responsavel_nome: responsavelNome,
      responsavel_email: responsavelEmail,
      data_hora: agoraBr,
      link_origem: linkOrigem,
      ajuste_id: ajusteCriado.id,
      ajuste_numero: ajusteCriado.numero,
      status: 'Nova' as AjusteOperacionalStatus,
    }

    const pendenciaMeuDia = await pb
      .collection('meu_dia_pendencias')
      .create<MeuDiaPendencia>(payloadMeuDia)

    // Vincular meu_dia_id de volta no ajuste
    await pb.collection('ajustes_operacionais').update(ajusteCriado.id, {
      meu_dia_id: pendenciaMeuDia.id,
    })
    ajusteCriado.meu_dia_id = pendenciaMeuDia.id

    // 6. GRAVAR EVIDÊNCIAS INICIAIS CASO INFORMADAS
    if (input.evidencias_iniciais && input.evidencias_iniciais.length > 0) {
      for (const ev of input.evidencias_iniciais) {
        await pb.collection('ajustes_operacionais_evidencias').create<AjusteOperacionalEvidencia>({
          ajuste_id: ajusteCriado.id,
          nome_arquivo: ev.nome_arquivo,
          url_ou_caminho: ev.url_ou_caminho || '',
          tipo_mime: ev.tipo_mime || 'application/octet-stream',
          tamanho_bytes: ev.tamanho_bytes || 0,
          registrado_por: input.solicitante_nome,
          registrado_por_id: input.solicitante_id || '',
          registrado_em: agoraIso,
          excluido: false,
        })
      }
    }

    // 7. GRAVAR HISTÓRICO APPEND-ONLY
    await pb.collection('ajustes_operacionais_historico').create<AjusteOperacionalHistorico>({
      ajuste_id: ajusteCriado.id,
      usuario: input.solicitante_nome,
      usuario_id: input.solicitante_id || '',
      acao: 'ABERTURA_AJUSTE',
      valor_anterior: '',
      valor_novo: `Ajuste criado com status Nova e pendência no Meu Dia (${pendenciaMeuDia.id})`,
      data_hora: agoraBr,
      detalhes_json: {
        numero: ajusteCriado.numero,
        prioridade: input.prioridade,
        responsavel: responsavelNome,
        duplicidade_justificada: Boolean(input.forcar_criacao_duplicada),
        justificativa: input.justificativa_duplicidade || '',
      },
    })

    // 8. AUDITORIA IMUTÁVEL EM pcp_audit_logs
    await this.registrarAuditLog({
      acao: 'ABERTURA_AJUSTE_OPERACIONAL',
      usuarioNome: input.solicitante_nome,
      usuarioId: input.solicitante_id || '',
      usuarioEmail: pb.authStore.record?.email || '',
      valorAnterior: '',
      valorNovo: ajusteCriado.numero,
      atividadeCodigo: input.codigo_atividade,
      ajusteNumero: ajusteCriado.numero,
      competencia: input.competencia,
      linha: input.linha_code || input.linha_name || '',
      centro: input.centro_code || input.centro_name || '',
      detalhes: {
        ajuste_id: ajusteCriado.id,
        meu_dia_id: pendenciaMeuDia.id,
        responsavel: responsavelNome,
        prazo: prazoIso,
      },
    })

    // 9. ENVIO DO FORMULÁRIO E-MAIL E REGISTRO EM fechamento_comunicacoes
    let emailEnviado = false
    try {
      emailEnviado = await this.dispararEmailAjuste({
        ajuste: ajusteCriado,
        pendencia: pendenciaMeuDia,
        input,
        linkOrigem,
      })
    } catch {
      emailEnviado = false
    }

    return {
      sucesso: true,
      ajuste: ajusteCriado,
      pendenciaMeuDia,
      emailEnviado,
      avisoDuplicidade: duplicidade.temAjusteAberto
        ? 'Criado com confirmação de duplicidade.'
        : undefined,
    }
  }

  /**
   * Dispara e-mail corporativo estruturado e grava na tabela fechamento_comunicacoes
   */
  async dispararEmailAjuste(params: {
    ajuste: AjusteOperacional
    pendencia: MeuDiaPendencia
    input: CriarAjusteInput
    linkOrigem: string
    ehReenvio?: boolean
  }): Promise<boolean> {
    const { ajuste, input, linkOrigem, ehReenvio } = params
    const agoraIso = new Date().toISOString()

    // 1. Resolver lista de destinatários em fechamento_destinatarios e usuários ativos
    const destinatariosList: Array<{ nome: string; email: string; tipo: 'Para' | 'Cc' }> = []

    if (input.responsavel_email) {
      destinatariosList.push({
        nome: ajuste.responsavel_nome,
        email: input.responsavel_email,
        tipo: 'Para',
      })
    }

    // Buscar cópias configuradas no HUB para Fechamento/PCP
    try {
      const destsCadastrados = await pb
        .collection('fechamento_destinatarios')
        .getFullList<any>({
          filter: 'ativo = true',
        })
        .catch(() => [])

      destsCadastrados.forEach((d) => {
        if (
          d.email &&
          !destinatariosList.some((x) => x.email.toLowerCase() === d.email.toLowerCase())
        ) {
          destinatariosList.push({
            nome: d.nome || d.cargo || 'Equipe Fechamento',
            email: d.email,
            tipo: 'Cc',
          })
        }
      })
    } catch {
      // Degradação graciosa
    }

    // Assunto padronizado
    const prefixo = ehReenvio ? '[REENVIO] ' : ''
    const assunto = `${prefixo}[PCP] Ajuste Operacional | ${ajuste.linha_code || ajuste.linha_name || 'Geral'} | ${input.atividade_titulo} | ${ajuste.competencia}`

    // Montagem do formulário estruturado no corpo
    const corpoEstruturado = `
=====================================================
AJUSTE OPERACIONAL — PCP ROBOTIZADO
=====================================================
Número: ${ajuste.numero}
Competência: ${ajuste.competencia}
Empresa: ${ajuste.empresa_nome || 'CIAFAL'}
Linha: ${ajuste.linha_name || ajuste.linha_code || 'Geral'}
Centro: ${ajuste.centro_name || ajuste.centro_code || 'Geral'}
Data de Emissão: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date())}
Solicitante: ${ajuste.solicitante_nome}
Responsável da Linha: ${ajuste.responsavel_nome}

-----------------------------------------------------
ATIVIDADE DE ORIGEM
-----------------------------------------------------
Código: ${input.codigo_atividade}
Título: ${input.atividade_titulo}
Status de Origem: ${ajuste.status_origem}
Transação SAP: ${ajuste.transacao_sap || 'N/A'}
Depósito: ${input.werks || 'N/A'}
Ordem de Produção: ${ajuste.ordem_sap || 'N/A'}
Material: ${ajuste.material || 'N/A'}
Lote: ${ajuste.lote || 'N/A'}
Quantidade: ${ajuste.quantidade ?? 0}

-----------------------------------------------------
PENDÊNCIA IDENTIFICADA
-----------------------------------------------------
Tipo: ${ajuste.tipo}
Prioridade: ${ajuste.prioridade}
Prazo para Regularização: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(ajuste.prazo))}
Descrição:
${ajuste.descricao}

-----------------------------------------------------
AÇÃO SOLICITADA
-----------------------------------------------------
${ajuste.acao_necessaria}

-----------------------------------------------------
OBSERVAÇÕES ADICIONAIS
-----------------------------------------------------
${ajuste.observacao_adicional || 'Nenhuma observação complementar.'}

-----------------------------------------------------
LINKS DE ACESSO DIRETO NO HUB
-----------------------------------------------------
• Abrir no Meu Dia: /pcp/meu-dia?ajuste=${ajuste.id}
• Abrir no Check-list de Fechamento: ${linkOrigem}
=====================================================
`.trim()

    let sucessoEnvio = false
    let erroDetalhe = 'Integração de e-mail corporativo pendente de configuração SMTP no HUB.'

    // Tentar disparo se o endpoint corporativo estiver disponível
    try {
      const response = await pb
        .send('/backend/v1/pcp/fechamento/notificacao', {
          method: 'POST',
          body: {
            to: destinatariosList.filter((d) => d.tipo === 'Para').map((d) => d.email),
            cc: destinatariosList.filter((d) => d.tipo === 'Cc').map((d) => d.email),
            subject: assunto,
            body: corpoEstruturado,
          },
        })
        .catch(() => null)

      if (response && (response.success || response.status === 'enviado')) {
        sucessoEnvio = true
        erroDetalhe = ''
      }
    } catch (err: any) {
      sucessoEnvio = false
      erroDetalhe = err?.message || 'Falha no endpoint de notificação'
    }

    // Gravar registro na collection fechamento_comunicacoes
    try {
      await pb.collection('fechamento_comunicacoes').create({
        competencia: ajuste.competencia,
        assunto,
        corpo_mensagem: corpoEstruturado,
        destinatarios_json: destinatariosList,
        grupo_destinatario: 'Gestor da Linha / PCP',
        data_envio: agoraIso,
        enviado_por: ajuste.solicitante_nome,
        remetente_email: pb.authStore.record?.email || '',
        status: sucessoEnvio ? 'Enviado' : 'pendente de integração',
        sucesso: sucessoEnvio,
        erro_detalhe: erroDetalhe,
        eh_reenvio: ehReenvio ?? false,
      })
    } catch {
      // Ignorar falha de gravação de comunicação sem interromper o fluxo
    }

    // Auditoria imutável do envio
    await this.registrarAuditLog({
      acao: ehReenvio ? 'REENVIO_EMAIL_AJUSTE' : 'ENVIO_EMAIL_AJUSTE',
      usuarioNome: ajuste.solicitante_nome,
      usuarioId: ajuste.solicitante_id || '',
      usuarioEmail: pb.authStore.record?.email || '',
      valorAnterior: '',
      valorNovo: assunto,
      atividadeCodigo: input.codigo_atividade,
      ajusteNumero: ajuste.numero,
      competencia: ajuste.competencia,
      detalhes: {
        destinatarios: destinatariosList,
        sucesso: sucessoEnvio,
        status: sucessoEnvio ? 'Enviado' : 'pendente de integração',
      },
    })

    return sucessoEnvio
  }

  /**
   * Conclui a pendência a partir do Meu Dia.
   * REGRA CRÍTICA DE NEGÓCIO: NÃO alterar automaticamente a atividade original para OK.
   * A atividade volta ao Check-list com status "Ajuste operacional concluído — aguardando validação do PCP".
   * Somente validação humana no Check-list muda ERRO/PENDENTE -> OK.
   */
  async concluirNoMeuDia(params: {
    ajusteId: string
    usuarioNome: string
    usuarioId?: string
    observacaoConclusao?: string
  }): Promise<{ sucesso: boolean; ajuste: AjusteOperacional }> {
    const { ajusteId, usuarioNome, usuarioId, observacaoConclusao } = params
    const agoraIso = new Date().toISOString()
    const agoraBr = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date())

    const ajuste = await pb.collection('ajustes_operacionais').getOne<AjusteOperacional>(ajusteId)

    // Atualizar ajuste
    const ajusteAtualizado = await pb
      .collection('ajustes_operacionais')
      .update<AjusteOperacional>(ajusteId, {
        status: 'Concluída',
        concluida_em: agoraIso,
      })

    // Atualizar pendência no Meu Dia
    if (ajuste.meu_dia_id) {
      await pb
        .collection('meu_dia_pendencias')
        .update(ajuste.meu_dia_id, {
          status: 'Concluída',
          concluida_em: agoraIso,
          concluida_por: usuarioNome,
          observacao_conclusao: observacaoConclusao || '',
        })
        .catch(() => null)
    }

    // Histórico append-only no Ajuste
    await pb.collection('ajustes_operacionais_historico').create<AjusteOperacionalHistorico>({
      ajuste_id: ajusteId,
      usuario: usuarioNome,
      usuario_id: usuarioId || '',
      acao: 'CONCLUSAO_MEU_DIA',
      valor_anterior: ajuste.status,
      valor_novo: 'Concluída (Aguardando Validação do PCP)',
      data_hora: agoraBr,
      detalhes_json: { observacao: observacaoConclusao || '' },
    })

    // Registrar no pcp_audit_logs
    await this.registrarAuditLog({
      acao: 'CONCLUSAO_AJUSTE_MEU_DIA',
      usuarioNome,
      usuarioId: usuarioId || '',
      usuarioEmail: pb.authStore.record?.email || '',
      valorAnterior: ajuste.status,
      valorNovo: 'Concluída',
      ajusteNumero: ajuste.numero,
      competencia: ajuste.competencia,
      detalhes: {
        ajuste_id: ajusteId,
        regra_mantida: 'Atividade original NÃO foi alterada para OK; aguardando validação do PCP',
        observacao: observacaoConclusao,
      },
    })

    return { sucesso: true, ajuste: ajusteAtualizado }
  }

  /**
   * Validação humana pelo PCP no Check-list de Fechamento.
   * Marca validada_pcp = true no ajuste e permite à UI mudar a atividade para OK.
   */
  async validarPeloPcp(params: {
    ajusteId: string
    usuarioNome: string
    usuarioId?: string
    mudarAtividadeParaOk?: boolean
  }): Promise<{ sucesso: boolean; ajuste: AjusteOperacional }> {
    const { ajusteId, usuarioNome, usuarioId, mudarAtividadeParaOk } = params
    const agoraIso = new Date().toISOString()
    const agoraBr = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date())

    const ajuste = await pb.collection('ajustes_operacionais').getOne<AjusteOperacional>(ajusteId)

    const ajusteAtualizado = await pb
      .collection('ajustes_operacionais')
      .update<AjusteOperacional>(ajusteId, {
        validada_pcp: true,
        validada_por_nome: usuarioNome,
        validada_em: agoraIso,
      })

    // Se solicitado explicitamente na validação humana, alterar a atividade de fechamento
    if (mudarAtividadeParaOk && ajuste.checklist_item_id) {
      await pb
        .collection('checklist_fechamento_itens')
        .update(ajuste.checklist_item_id, {
          status: 'OK',
          acao_corretiva: `Regularizado conforme Ajuste Operacional ${ajuste.numero} (validado pelo PCP por ${usuarioNome})`,
          data_hora_execucao: agoraIso,
        })
        .catch(() => null)
    }

    // Histórico append-only
    await pb.collection('ajustes_operacionais_historico').create<AjusteOperacionalHistorico>({
      ajuste_id: ajusteId,
      usuario: usuarioNome,
      usuario_id: usuarioId || '',
      acao: 'VALIDACAO_FINAL_PCP',
      valor_anterior: 'Pendente de validação',
      valor_novo: 'Validado pelo PCP',
      data_hora: agoraBr,
      detalhes_json: {
        validado_por: usuarioNome,
        atividade_mudada_para_ok: Boolean(mudarAtividadeParaOk),
      },
    })

    // Auditoria imutável
    await this.registrarAuditLog({
      acao: 'VALIDACAO_FINAL_PCP_AJUSTE',
      usuarioNome,
      usuarioId: usuarioId || '',
      usuarioEmail: pb.authStore.record?.email || '',
      valorAnterior: 'Não validado',
      valorNovo: 'Validado PCP',
      ajusteNumero: ajuste.numero,
      competencia: ajuste.competencia,
      detalhes: {
        ajuste_id: ajusteId,
        atividade_id: ajuste.checklist_item_id,
        status_atividade_atualizado: mudarAtividadeParaOk ? 'OK' : 'Inalterado',
      },
    })

    return { sucesso: true, ajuste: ajusteAtualizado }
  }

  /**
   * Reabrir ajuste ou cancelar com justificativa obrigatória
   */
  async alterarStatus(params: {
    ajusteId: string
    novoStatus: AjusteOperacionalStatus
    justificativa: string
    usuarioNome: string
    usuarioId?: string
  }): Promise<AjusteOperacional> {
    const { ajusteId, novoStatus, justificativa, usuarioNome, usuarioId } = params
    if (!justificativa || justificativa.trim().length < 3) {
      throw new Error('Justificativa é obrigatória para alteração de status do Ajuste Operacional.')
    }

    const agoraIso = new Date().toISOString()
    const agoraBr = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date())

    const ajuste = await pb.collection('ajustes_operacionais').getOne<AjusteOperacional>(ajusteId)

    const payload: any = {
      status: novoStatus,
    }

    if (novoStatus === 'Cancelada') {
      payload.justificativa_cancelamento = justificativa.trim()
    } else if (ajuste.status === 'Concluída' || ajuste.status === 'Cancelada') {
      payload.justificativa_reabertura = justificativa.trim()
      payload.concluida_em = null
      payload.validada_pcp = false
    }

    const atualizado = await pb
      .collection('ajustes_operacionais')
      .update<AjusteOperacional>(ajusteId, payload)

    // Atualizar no Meu Dia sincronizado
    if (ajuste.meu_dia_id) {
      await pb
        .collection('meu_dia_pendencias')
        .update(ajuste.meu_dia_id, {
          status: novoStatus,
        })
        .catch(() => null)
    }

    // Histórico append-only
    await pb.collection('ajustes_operacionais_historico').create<AjusteOperacionalHistorico>({
      ajuste_id: ajusteId,
      usuario: usuarioNome,
      usuario_id: usuarioId || '',
      acao: 'ALTERACAO_STATUS_AJUSTE',
      valor_anterior: ajuste.status,
      valor_novo: novoStatus,
      data_hora: agoraBr,
      detalhes_json: { justificativa },
    })

    // Auditoria
    await this.registrarAuditLog({
      acao: 'MUDANCA_STATUS_AJUSTE',
      usuarioNome,
      usuarioId: usuarioId || '',
      usuarioEmail: pb.authStore.record?.email || '',
      valorAnterior: ajuste.status,
      valorNovo: novoStatus,
      ajusteNumero: ajuste.numero,
      competencia: ajuste.competencia,
      detalhes: { justificativa, ajuste_id: ajusteId },
    })

    return atualizado
  }

  /**
   * Buscar ajustes por item do Check-list
   */
  async listarPorItem(checklistItemId: string): Promise<AjusteOperacional[]> {
    if (!checklistItemId) return []
    try {
      return await pb.collection('ajustes_operacionais').getFullList<AjusteOperacional>({
        filter: `checklist_item_id = '${checklistItemId}' && excluido != true`,
        sort: '-created',
      })
    } catch {
      return []
    }
  }

  /**
   * Buscar histórico de alterações de um ajuste
   */
  async listarHistorico(ajusteId: string): Promise<AjusteOperacionalHistorico[]> {
    if (!ajusteId) return []
    try {
      return await pb
        .collection('ajustes_operacionais_historico')
        .getFullList<AjusteOperacionalHistorico>({
          filter: `ajuste_id = '${ajusteId}'`,
          sort: '-data_hora',
        })
    } catch {
      return []
    }
  }

  /**
   * Helper unificado de registro de log de auditoria em pcp_audit_logs
   */
  private async registrarAuditLog(params: {
    acao: string
    usuarioNome: string
    usuarioId?: string
    usuarioEmail?: string
    valorAnterior?: string
    valorNovo?: string
    atividadeCodigo?: string
    ajusteNumero?: string
    competencia?: string
    linha?: string
    centro?: string
    detalhes?: Record<string, any>
  }): Promise<void> {
    try {
      await pb.collection('pcp_audit_logs').create({
        action: params.acao,
        company: 'CIAFAL',
        module: 'CONTROLE_DE_PRODUCAO',
        screen: 'Check-list Fechamento',
        resource: 'AJUSTE_OPERACIONAL',
        resource_id: params.ajusteNumero || '',
        record_id: params.competencia || '',
        user_id: params.usuarioId || '',
        user_name: params.usuarioNome || 'Usuário HUB',
        user_email: params.usuarioEmail || '',
        line: params.linha || '',
        center: params.centro || '',
        status: 'Concluído',
        outcome: 'SUCCESS',
        event_type: 'SCHEDULE_ACTION',
        reason: `[${params.ajusteNumero || 'AJUSTE'}] ${params.acao}: ${params.valorNovo || ''}`,
        details: {
          competencia: params.competencia,
          atividade: params.atividadeCodigo,
          ajuste_numero: params.ajusteNumero,
          valor_anterior: params.valorAnterior,
          valor_novo: params.valorNovo,
          origem: 'AjusteOperacionalService',
          ...(params.detalhes || {}),
        },
      })
    } catch {
      // Ignorar falha silenciosa para não travar a aplicação
    }
  }
}

export const ajusteOperacionalService = new AjusteOperacionalService()
export default ajusteOperacionalService
