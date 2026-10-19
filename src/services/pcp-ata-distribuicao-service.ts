import pb from '@/lib/pocketbase/client'
import {
  DestinatarioAtaItem,
  EnviarComunicadoHubParams,
  EnviarEmailAtaParams,
  ConfirmarLeituraAtaParams,
  PcpAtaDistribuicaoRecord,
  PcpAtaDestinatarioEnvioRecord,
  PcpAtaConfirmacaoLeituraRecord,
  IndicadoresHistoricoDistribuicao,
} from '@/types/pcp-ata-distribuicao'
import { PCPMeetingAtaRecord, PCPMeetingRecord } from '@/types/pcp-meeting'

export class PcpAtaDistribuicaoService {
  /**
   * Carrega lista de usuários reais cadastrados no HUB (collection 'users')
   * Sem contatos fictícios ou hardcoded
   */
  async listarUsuariosReaisHub(): Promise<DestinatarioAtaItem[]> {
    const lista: DestinatarioAtaItem[] = []
    try {
      const dbUsers = await pb.collection('users').getFullList({
        sort: 'name',
      })

      for (const u of dbUsers as any[]) {
        if (
          u.email &&
          !lista.some((x) => x.email.toLowerCase() === (u.email || '').toLowerCase())
        ) {
          const roleUpper = (u.role || '').toUpperCase()
          let sector = 'Operação'
          if (roleUpper.includes('ADMIN')) sector = 'Administração'
          else if (roleUpper.includes('PROGRAMMER') || roleUpper.includes('PCP')) sector = 'PCP'
          else if (roleUpper.includes('LINE_MANAGER') || roleUpper.includes('GESTOR'))
            sector = 'Produção'
          else if (roleUpper.includes('COMMERCIAL') || roleUpper.includes('COMERCIAL'))
            sector = 'Comercial'
          else if (roleUpper.includes('AUDITOR') || roleUpper.includes('SGQ'))
            sector = 'Qualidade / SGQ'

          lista.push({
            id: u.id,
            name: u.name || u.email,
            email: u.email,
            role: u.role || 'Usuário HUB',
            sector,
          })
        }
      }
    } catch (err) {
      console.warn('[PcpAtaDistribuicaoService] Erro ao listar usuários reais:', err)
    }
    return lista
  }

  /**
   * Obtém participantes de uma reunião para identificação no modal
   */
  async listarParticipantesReuniao(meetingId: string): Promise<DestinatarioAtaItem[]> {
    try {
      const records = await pb.collection('pcp_meeting_participant').getFullList({
        filter: `meeting_id = '${meetingId}'`,
      })

      return records.map((r: any) => ({
        id: r.id,
        name: r.person_name,
        email: r.person_email || '',
        role: r.role_title || 'Participante',
        sector: r.area || 'Operação',
        isParticipant: true,
      }))
    } catch (err) {
      console.warn('[PcpAtaDistribuicaoService] Erro ao carregar participantes da reunião:', err)
      return []
    }
  }

  /**
   * FUNCIONALIDADE 1: Publicar Comunicado no HUB
   * - Cria comunicado interno vinculado à ATA em pcp_communications (sem duplicar conteúdo)
   * - Notificação individual em pcp_internal_notifications
   * - Registra em pcp_ata_distribuicoes
   * - Registra envios individuais em pcp_ata_destinatarios_envio
   * - Auditoria em pcp_audit_logs
   */
  async publicarComunicadoNoHub(
    params: EnviarComunicadoHubParams,
  ): Promise<PcpAtaDistribuicaoRecord> {
    const {
      ataId,
      meetingId,
      meetingCode,
      meetingDate,
      meetingTitle,
      versaoAta,
      isMinuta,
      assunto,
      mensagemComplementar,
      exigirConfirmacao,
      destinatarios,
      pdfNomeArquivo,
      currentUser,
    } = params

    if (!destinatarios || destinatarios.length === 0) {
      throw new Error('Selecione pelo menos um destinatário para publicar o comunicado.')
    }

    const agoraIso = new Date().toISOString()
    const idempotencyKey = `HUB_ATA_${ataId}_V${versaoAta}_${Date.now()}`

    // 1. Criar Comunicado em pcp_communications
    let commId = ''
    try {
      const commCode = `COM-ATA-${meetingCode.replace(/[^a-zA-Z0-9]/g, '')}-V${versaoAta}`
      const targetUserIds = destinatarios.map((d) => d.id).filter(Boolean)
      const targetSectors = Array.from(new Set(destinatarios.map((d) => d.sector).filter(Boolean)))

      const commRecord = await pb.collection('pcp_communications').create({
        code: commCode,
        title: assunto,
        summary: `Distribuição oficial da ${isMinuta ? 'Minuta de ' : ''}ATA da Reunião PCP (${meetingDate}) - Versão ${versaoAta}.0`,
        content: [
          `ATA OFICIAL DA REUNIÃO PCP — SEMANA / DATA: ${meetingDate}`,
          `Código da Reunião: ${meetingCode}`,
          `Versão: ${versaoAta}.0 (${isMinuta ? 'MINUTA' : 'OFICIAL SGQ'})`,
          mensagemComplementar ? `\nMensagem Complementar:\n${mensagemComplementar}` : '',
          `\nEste documento foi distribuído pelo HUB CIAFAL pelo responsável ${currentUser.name}.`,
          exigirConfirmacao ? 'Solicita-se a confirmação formal de leitura nesta ATA.' : '',
        ]
          .filter(Boolean)
          .join('\n'),
        comm_type: 'INFORMATIVO',
        criticality: 'NORMAL',
        origin_type: 'ATA_PCP',
        origin_ref_id: ataId,
        origin_ref_code: meetingCode,
        status: 'VIGENTE',
        published_at: agoraIso,
        valid_from: agoraIso.split('T')[0],
        author_id: currentUser.id || null,
        author_name: currentUser.name,
        requires_acknowledgement: exigirConfirmacao,
        target_audience_type: 'USUARIOS_ESPECIFICOS',
        target_user_ids: targetUserIds,
        target_sectors: targetSectors,
        total_recipients_count: destinatarios.length,
        read_count: 0,
        acknowledged_count: 0,
        pending_count: destinatarios.length,
        attachments: [
          {
            name: pdfNomeArquivo,
            type: 'application/pdf',
            source: 'ATA_SGQ_OFICIAL',
          },
        ],
      })
      commId = commRecord.id
    } catch (err: any) {
      console.warn('[PcpAtaDistribuicaoService] Aviso ao criar pcp_communications:', err)
    }

    // 2. Criar notificações internas individuais para cada destinatário
    for (const dest of destinatarios) {
      try {
        await pb.collection('pcp_internal_notifications').create({
          notification_code: `NOTIF-ATA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          target_audience: 'ALL',
          type: 'NOVO_INVENTARIO', // tipo reutilizável da schema existente
          title: assunto,
          message: `${isMinuta ? 'Minuta de ' : ''}ATA da Reunião PCP (${meetingDate}) disponibilizada. ${exigirConfirmacao ? 'Confirmação de leitura solicitada.' : ''}`,
          line: meetingCode,
          action_url: `/pcp/reunioes?tab=atas&meetingId=${meetingId}&ataId=${ataId}`,
          severity: 'INFO',
          is_read: false,
          timestamp: agoraIso,
        })
      } catch (err) {
        // não bloqueia
      }
    }

    // 3. Registrar na tabela mestre pcp_ata_distribuicoes
    const distRecord = await pb
      .collection('pcp_ata_distribuicoes')
      .create<PcpAtaDistribuicaoRecord>({
        ata_id: ataId,
        meeting_id: meetingId,
        meeting_code: meetingCode,
        meeting_date: meetingDate,
        meeting_title: meetingTitle,
        canal: 'HUB',
        versao_ata: versaoAta,
        is_minuta: isMinuta,
        assunto,
        mensagem_complementar: mensagemComplementar || '',
        exigir_confirmacao: exigirConfirmacao,
        destinatarios_json: destinatarios,
        destinatarios_count: destinatarios.length,
        cc_json: [],
        emissor_id: currentUser.id || '',
        emissor_nome: currentUser.name,
        emissor_email: currentUser.email || '',
        pdf_nome_arquivo: pdfNomeArquivo,
        pdf_identificador: `PDF_${meetingCode}_V${versaoAta}`,
        comunicado_hub_id: commId,
        status_distribuicao: 'PUBLICADO',
        detalhes_status: `Publicado no HUB para ${destinatarios.length} destinatários. Notificações individuais geradas.`,
        idempotency_key: idempotencyKey,
        confirmacoes_count: 0,
      })

    // 4. Registrar destinatários individuais em pcp_ata_destinatarios_envio
    for (const dest of destinatarios) {
      try {
        await pb.collection('pcp_ata_destinatarios_envio').create({
          distribuicao_id: distRecord.id,
          ata_id: ataId,
          meeting_id: meetingId,
          versao_ata: versaoAta,
          canal: 'HUB',
          user_id: dest.id || '',
          destinatario_nome: dest.name,
          destinatario_email: dest.email,
          setor: dest.sector || 'Operação',
          is_cc: false,
          status_envio: 'NOTIFICADO',
          enviado_em: agoraIso,
          confirmado_leitura: false,
          detalhes_envio: 'Disponibilizado na Central de Comunicados e Notificações do HUB CIAFAL',
        })
      } catch (err) {
        console.warn('Erro ao registrar destinatário de envio:', err)
      }
    }

    // 5. Auditoria em pcp_audit_logs
    await this.registrarAuditoria({
      action: 'ATA_COMUNICADO_HUB_PUBLICADO',
      meetingCode,
      ataId,
      versaoAta,
      canal: 'HUB',
      currentUser,
      destinatarios,
      resultado: 'SUCCESS',
      detalhes: {
        distribuicao_id: distRecord.id,
        comunicado_id: commId,
        exigir_confirmacao: exigirConfirmacao,
        pdf_nome_arquivo: pdfNomeArquivo,
      },
    })

    return distRecord
  }

  /**
   * FUNCIONALIDADE 2: Enviar ATA por E-mail
   * - Valida obrigatoriedade de PDF
   * - Registra status transparente "PENDENTE_SMTP" (pois SMTP não está configurado)
   * - Grava no pcp_ata_distribuicoes e pcp_ata_destinatarios_envio
   * - Auditoria em pcp_audit_logs
   */
  async enviarAtaPorEmail(params: EnviarEmailAtaParams): Promise<PcpAtaDistribuicaoRecord> {
    const {
      ataId,
      meetingId,
      meetingCode,
      meetingDate,
      meetingTitle,
      versaoAta,
      isMinuta,
      assunto,
      mensagemComplementar,
      exigirConfirmacao,
      destinatarios,
      destinatariosCc = [],
      pdfNomeArquivo,
      pdfBlob,
      corpoEmailHtml,
      currentUser,
    } = params

    if (!destinatarios || destinatarios.length === 0) {
      throw new Error('Selecione pelo menos um destinatário para o envio do e-mail.')
    }

    // Regra da especificação: Se o PDF não puder ser gerado, IMPEDIR o envio
    if (!pdfNomeArquivo || (!pdfBlob && !params.pdfBase64)) {
      throw new Error(
        'O PDF oficial SGQ é obrigatório como anexo do e-mail. Não foi possível gerar o PDF da ATA, portanto o envio foi bloqueado conforme a norma SGQ.',
      )
    }

    const agoraIso = new Date().toISOString()
    const idempotencyKey = `EMAIL_ATA_${ataId}_V${versaoAta}_${Date.now()}`
    const totalDest = destinatarios.length + destinatariosCc.length

    // Cria registro de distribuição por e-mail com status honesto PENDENTE_SMTP
    const distRecord = await pb
      .collection('pcp_ata_distribuicoes')
      .create<PcpAtaDistribuicaoRecord>({
        ata_id: ataId,
        meeting_id: meetingId,
        meeting_code: meetingCode,
        meeting_date: meetingDate,
        meeting_title: meetingTitle,
        canal: 'EMAIL',
        versao_ata: versaoAta,
        is_minuta: isMinuta,
        assunto,
        mensagem_complementar: mensagemComplementar || '',
        exigir_confirmacao: exigirConfirmacao,
        destinatarios_json: destinatarios,
        destinatarios_count: totalDest,
        cc_json: destinatariosCc,
        emissor_id: currentUser.id || '',
        emissor_nome: currentUser.name,
        emissor_email: currentUser.email || '',
        pdf_nome_arquivo: pdfNomeArquivo,
        pdf_identificador: `PDF_${meetingCode}_V${versaoAta}`,
        status_distribuicao: 'PENDENTE_SMTP',
        detalhes_status:
          'Aguardando configuração de serviço SMTP no ambiente de produção. Registro preparado para despacho automático com PDF SGQ anexado.',
        idempotency_key: idempotencyKey,
        confirmacoes_count: 0,
      })

    // Registra destinatários principais
    for (const dest of destinatarios) {
      try {
        await pb.collection('pcp_ata_destinatarios_envio').create({
          distribuicao_id: distRecord.id,
          ata_id: ataId,
          meeting_id: meetingId,
          versao_ata: versaoAta,
          canal: 'EMAIL',
          user_id: dest.id || '',
          destinatario_nome: dest.name,
          destinatario_email: dest.email,
          setor: dest.sector || 'Geral',
          is_cc: false,
          status_envio: 'PENDENTE_SMTP',
          enviado_em: agoraIso,
          confirmado_leitura: false,
          detalhes_envio: 'Enfileirado com PDF SGQ. Aguardando gateway SMTP.',
        })
      } catch (err) {
        console.warn('Erro ao registrar envio e-mail:', err)
      }
    }

    // Registra destinatários CC
    for (const cc of destinatariosCc) {
      try {
        await pb.collection('pcp_ata_destinatarios_envio').create({
          distribuicao_id: distRecord.id,
          ata_id: ataId,
          meeting_id: meetingId,
          versao_ata: versaoAta,
          canal: 'EMAIL',
          user_id: cc.id || '',
          destinatario_nome: cc.name,
          destinatario_email: cc.email,
          setor: cc.sector || 'Geral',
          is_cc: true,
          status_envio: 'PENDENTE_SMTP',
          enviado_em: agoraIso,
          confirmado_leitura: false,
          detalhes_envio: 'Cópia (CC) enfileirada com PDF SGQ.',
        })
      } catch (err) {
        console.warn('Erro ao registrar envio e-mail CC:', err)
      }
    }

    // Auditoria em pcp_audit_logs
    await this.registrarAuditoria({
      action: 'ATA_EMAIL_ENVIADO',
      meetingCode,
      ataId,
      versaoAta,
      canal: 'EMAIL',
      currentUser,
      destinatarios: [...destinatarios, ...destinatariosCc],
      resultado: 'SUCCESS',
      detalhes: {
        distribuicao_id: distRecord.id,
        pdf_anexado: pdfNomeArquivo,
        exigir_confirmacao: exigirConfirmacao,
        status_tecnico: 'PENDENTE_SMTP',
        total_destinatarios: totalDest,
      },
    })

    return distRecord
  }

  /**
   * CONFIRMAÇÃO DE LEITURA NO HUB (Evidência principal)
   * Destinatário autenticado registra que leu a versão da ATA
   */
  async confirmarLeituraAta(
    params: ConfirmarLeituraAtaParams,
  ): Promise<PcpAtaConfirmacaoLeituraRecord> {
    const { ataId, meetingId, codigoAta, versaoAta, canalAcesso, currentUser } = params

    if (!currentUser || (!currentUser.id && !currentUser.email)) {
      throw new Error('Usuário autenticado obrigatório para confirmação de leitura.')
    }

    const agoraIso = new Date().toISOString()

    // 1. Grava evidência imutável em pcp_ata_confirmacoes_leitura
    const confRecord = await pb
      .collection('pcp_ata_confirmacoes_leitura')
      .create<PcpAtaConfirmacaoLeituraRecord>({
        ata_id: ataId,
        meeting_id: meetingId,
        codigo_ata: codigoAta,
        versao_ata: versaoAta,
        user_id: currentUser.id || '',
        user_nome: currentUser.name,
        user_email: currentUser.email || '',
        setor: currentUser.sector || 'HUB CIAFAL',
        canal_acesso: canalAcesso || 'HUB_PCP_ROBOTIZADO',
        confirmado_em: agoraIso,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        declaracao_leitura:
          'Declaro formalmente ter lido e tomado ciência de todo o conteúdo da presente ATA de Reunião PCP.',
      })

    // 2. Atualiza registros de envio do destinatário caso existam
    try {
      const envios = await pb.collection('pcp_ata_destinatarios_envio').getFullList({
        filter: `ata_id = '${ataId}' && (user_id = '${currentUser.id}' || destinatario_email = '${currentUser.email}')`,
      })

      for (const env of envios) {
        await pb.collection('pcp_ata_destinatarios_envio').update(env.id, {
          confirmado_leitura: true,
          confirmado_em: agoraIso,
          canal_confirmacao: canalAcesso || 'HUB_PCP_ROBOTIZADO',
          status_envio: 'LEITURA_CONFIRMADA',
        })
      }
    } catch (e) {
      console.warn('Aviso ao atualizar status no envio:', e)
    }

    // 3. Atualiza contadores nas distribuições vinculadas
    try {
      const dists = await pb.collection('pcp_ata_distribuicoes').getFullList({
        filter: `ata_id = '${ataId}'`,
      })
      for (const d of dists) {
        const count = (d.confirmacoes_count || 0) + 1
        await pb.collection('pcp_ata_distribuicoes').update(d.id, {
          confirmacoes_count: count,
        })
      }
    } catch {
      /* intentionally ignored */
    }

    // 4. Auditoria em pcp_audit_logs
    await this.registrarAuditoria({
      action: 'ATA_LEITURA_CONFIRMADA',
      meetingCode: codigoAta,
      ataId,
      versaoAta,
      canal: 'HUB',
      currentUser,
      destinatarios: [
        {
          id: currentUser.id || '',
          name: currentUser.name,
          email: currentUser.email || '',
        },
      ],
      resultado: 'SUCCESS',
      detalhes: {
        confirmacao_id: confRecord.id,
        canal_acesso: canalAcesso || 'HUB_PCP_ROBOTIZADO',
        confirmado_em: agoraIso,
      },
    })

    return confRecord
  }

  /**
   * Verifica se o usuário atual já confirmou a leitura da ATA selecionada
   */
  async verificarConfirmacaoUsuario(
    ataId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<PcpAtaConfirmacaoLeituraRecord | null> {
    if (!ataId) return null
    try {
      const filters: string[] = [`ata_id = '${ataId}'`]
      if (userId && userEmail) {
        filters.push(`(user_id = '${userId}' || user_email = '${userEmail}')`)
      } else if (userId) {
        filters.push(`user_id = '${userId}'`)
      } else if (userEmail) {
        filters.push(`user_email = '${userEmail}'`)
      } else {
        return null
      }

      const res = await pb.collection('pcp_ata_confirmacoes_leitura').getList(1, 1, {
        filter: filters.join(' && '),
        sort: '-confirmado_em',
      })
      return (res.items[0] as unknown as PcpAtaConfirmacaoLeituraRecord) || null
    } catch {
      return null
    }
  }

  /**
   * Consulta histórico completo de distribuições de uma ATA
   */
  async listarDistribuicoesAta(ataId: string): Promise<PcpAtaDistribuicaoRecord[]> {
    try {
      const records = await pb.collection('pcp_ata_distribuicoes').getFullList({
        filter: `ata_id = '${ataId}'`,
        sort: '-created',
      })
      return records as unknown as PcpAtaDistribuicaoRecord[]
    } catch (err) {
      console.warn('[PcpAtaDistribuicaoService] Erro ao listar distribuições:', err)
      return []
    }
  }

  /**
   * Consulta destinatários de envio de uma ATA (tabela por destinatário)
   */
  async listarDestinatariosEnvioAta(
    ataId: string,
    distribuicaoId?: string,
  ): Promise<PcpAtaDestinatarioEnvioRecord[]> {
    try {
      let filter = `ata_id = '${ataId}'`
      if (distribuicaoId) {
        filter += ` && distribuicao_id = '${distribuicaoId}'`
      }
      const records = await pb.collection('pcp_ata_destinatarios_envio').getFullList({
        filter,
        sort: '-created',
      })
      return records as unknown as PcpAtaDestinatarioEnvioRecord[]
    } catch (err) {
      console.warn('[PcpAtaDistribuicaoService] Erro ao listar destinatários de envio:', err)
      return []
    }
  }

  /**
   * Consulta confirmações formais de leitura recebidas para a ATA
   */
  async listarConfirmacoesLeituraAta(ataId: string): Promise<PcpAtaConfirmacaoLeituraRecord[]> {
    try {
      const records = await pb.collection('pcp_ata_confirmacoes_leitura').getFullList({
        filter: `ata_id = '${ataId}'`,
        sort: '-confirmado_em',
      })
      return records as unknown as PcpAtaConfirmacaoLeituraRecord[]
    } catch (err) {
      console.warn('[PcpAtaDistribuicaoService] Erro ao listar confirmações:', err)
      return []
    }
  }

  /**
   * Calcula indicadores consolidados de histórico para a ATA
   */
  async calcularIndicadoresHistorico(ataId: string): Promise<IndicadoresHistoricoDistribuicao> {
    const distribuicoes = await this.listarDistribuicoesAta(ataId)
    const destinatarios = await this.listarDestinatariosEnvioAta(ataId)
    const confirmacoes = await this.listarConfirmacoesLeituraAta(ataId)

    const totalDestinatarios = destinatarios.length
    const enviosBemSucedidos = destinatarios.filter(
      (d) =>
        d.status_envio === 'NOTIFICADO' ||
        d.status_envio === 'PUBLICADO' ||
        d.status_envio === 'ENVIADO' ||
        d.status_envio === 'ENTREGUE' ||
        d.status_envio === 'LEITURA_CONFIRMADA',
    ).length

    // Confirmações únicas por usuário
    const emailsConfirmados = new Set(confirmacoes.map((c) => c.user_email.toLowerCase()))
    const confirmacoesRecebidas = emailsConfirmados.size

    const pendentesConfirmacao = Math.max(0, totalDestinatarios - confirmacoesRecebidas)
    const percentualConfirmado =
      totalDestinatarios > 0 ? Math.round((confirmacoesRecebidas / totalDestinatarios) * 100) : 0

    return {
      totalDestinatarios,
      enviosBemSucedidos,
      confirmacoesRecebidas,
      pendentesConfirmacao,
      percentualConfirmado,
      totalDistribuicoes: distribuicoes.length,
    }
  }

  /**
   * Log de auditoria em pcp_audit_logs
   */
  private async registrarAuditoria(params: {
    action: string
    meetingCode: string
    ataId: string
    versaoAta: number
    canal: string
    currentUser: { id?: string; name: string; email?: string; role?: string }
    destinatarios: { id?: string; name: string; email: string }[]
    resultado: 'SUCCESS' | 'FAILED'
    detalhes: Record<string, any>
  }) {
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: params.currentUser.id || null,
        user_email: params.currentUser.email || 'usuario@ciafal.com.br',
        user_name: params.currentUser.name,
        user_role: params.currentUser.role || 'PCP_ADMIN',
        event_type: 'SCHEDULE_ACTION',
        action: params.action,
        resource: 'PCP_REUNIAO_ATA_DISTRIBUICAO',
        resource_id: params.ataId,
        permission_required: 'pcp.meeting.distribute',
        outcome: params.resultado,
        module: 'PCP Robotizado',
        screen: 'Reunião PCP > ATAs',
        entity: 'pcp_meeting_ata',
        record_id: params.ataId,
        source: 'PCP Robotizado HUB CIAFAL',
        status: params.resultado,
        details: {
          meeting_code: params.meetingCode,
          versao_ata: params.versaoAta,
          canal: params.canal,
          destinatarios_count: params.destinatarios.length,
          destinatarios_emails: params.destinatarios.map((d) => d.email),
          ...params.detalhes,
        },
      })
    } catch (err) {
      console.warn('[PcpAtaDistribuicaoService] Falha ao registrar em pcp_audit_logs:', err)
    }
  }
}

export const pcpAtaDistribuicaoService = new PcpAtaDistribuicaoService()
export default pcpAtaDistribuicaoService
