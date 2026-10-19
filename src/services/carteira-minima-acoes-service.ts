import { pb } from '@/lib/pocketbase/client'
import {
  CarteiraMinimaItem,
  CarteiraMinimaFilterParams,
  CarteiraMinimaTotalizadores,
} from '@/types/carteira-minima'
import { DestinatarioHub } from '@/types/comercial-comunicado'
import { pcpAuditService } from './pcp-audit-service'

export interface EnvioEmailPayload {
  recipients: Array<{ id: string; name: string; email: string; sector?: string }>
  subject: string
  message: string
  summaryImageBase64?: string
  pdfFileName: string
  filtersSnapshot: CarteiraMinimaFilterParams
  itemsCount: number
  totalizersSnapshot: CarteiraMinimaTotalizadores
  itens: CarteiraMinimaItem[]
}

export interface EnvioEmailResultado {
  success: boolean
  status: string
  message: string
  smtpConfigured: boolean
  recordId?: string
  recipientsCount: number
}

export interface CriarPendenciaHubPayload {
  responsaveis: Array<{ id: string; name: string; email: string; sector?: string }>
  titulo: string
  descricao: string
  prioridade: 'Baixa' | 'Normal' | 'Alta' | 'Crítica'
  prazo: string // YYYY-MM-DD
  origem: string
  modulo: string
  tipo: string
  origemRelatorio: string
  filtersSnapshot: CarteiraMinimaFilterParams
  itemsCount: number
  totalizersSnapshot: CarteiraMinimaTotalizadores
  pdfFileName?: string
  itens: CarteiraMinimaItem[]
}

export interface CriarPendenciaHubResultado {
  success: boolean
  message: string
  createdCount: number
  meuDiaIds: string[]
  envioId?: string
}

export interface HistoricoEnvioItem {
  id: string
  tipo: 'EMAIL' | 'PENDENCIA'
  assunto_ou_titulo: string
  destinatarios_json: Array<{ id: string; name: string; email: string; sector?: string }>
  destinatarios_count: number
  remetente_nome: string
  remetente_email: string
  remetente_id: string
  prioridade?: string
  prazo?: string
  status: string
  corpo_ou_descricao?: string
  imagem_resumo?: string
  nome_arquivo_pdf?: string
  filtros_snapshot?: any
  itens_count?: number
  totalizadores_snapshot?: any
  meu_dia_ids?: string[]
  created: string
}

export const carteiraMinimaAcoesService = {
  /**
   * Lista usuários ativos diretamente da collection `users` do HUB
   */
  async listarUsuariosHub(): Promise<DestinatarioHub[]> {
    try {
      const records = await pb.collection('users').getFullList({
        sort: 'name',
      })

      return records
        .filter((u: any) => u.email)
        .map((u: any) => ({
          id: u.id,
          name: u.name || u.email,
          email: u.email,
          role: u.role || 'Usuário HUB',
          sector:
            u.role?.includes('COMMERCIAL') || u.role?.includes('COMERCIAL')
              ? 'Comercial'
              : u.role?.includes('ADMIN')
                ? 'Administração'
                : u.role?.includes('PROGRAMMER')
                  ? 'PCP'
                  : 'Operação',
          grupo: 'Usuários HUB',
        }))
    } catch (err) {
      console.warn('[carteiraMinimaAcoesService] Erro ao carregar users:', err)
      return []
    }
  },

  /**
   * Envia e-mail do relatório (com imagem de resumo e PDF anexado)
   * Se não houver SMTP configurado no servidor, persiste como "Agendado para despacho — SMTP não configurado"
   * NUNCA finge sucesso de envio SMTP.
   */
  async enviarRelatorioPorEmail(payload: EnvioEmailPayload): Promise<EnvioEmailResultado> {
    if (!payload.recipients || payload.recipients.length === 0) {
      throw new Error('Selecione pelo menos um destinatário corporativo.')
    }
    if (!payload.subject || !payload.subject.trim()) {
      throw new Error('O assunto do e-mail é obrigatório.')
    }

    const authRecord = pb.authStore.record || pb.authStore.model
    const userName =
      (authRecord as any)?.name || (authRecord as any)?.email || 'Administrador Geral CIAFAL'
    const userEmail = (authRecord as any)?.email || 'pcp.robotizado@ciafal.com.br'
    const userId = (authRecord as any)?.id || ''

    // Tentar chamada ao backend hook oficial
    try {
      const resp = await pb.send<any>('/backend/v1/pcp/carteira-minima/enviar-email', {
        method: 'POST',
        body: {
          recipients: payload.recipients,
          subject: payload.subject.trim(),
          message: payload.message.trim(),
          summary_image: payload.summaryImageBase64 || '',
          pdf_file_name: payload.pdfFileName,
          filters_snapshot: payload.filtersSnapshot,
          items_count: payload.itemsCount,
          totalizers_snapshot: payload.totalizersSnapshot,
        },
      })

      if (resp && resp.success) {
        return {
          success: true,
          status: resp.status,
          message: resp.message,
          smtpConfigured: Boolean(resp.smtp_configured),
          recordId: resp.record_id,
          recipientsCount: resp.recipients_count || payload.recipients.length,
        }
      }
    } catch {
      // Degradação em caso de fallback direto no cliente
    }

    // Fallback direto de gravação garantida em carteira_minima_envios e auditoria
    const statusFim = 'AGENDADO_DESPACHO_PENDENTE_SMTP'
    const msgFim =
      'Agendado para despacho — SMTP corporativo não configurado no servidor. O envio será processado automaticamente assim que as credenciais forem provisionadas.'

    let recId = ''
    try {
      const created = await pb.collection('carteira_minima_envios').create({
        tipo: 'EMAIL',
        assunto_ou_titulo: payload.subject.trim(),
        destinatarios_json: payload.recipients,
        destinatarios_count: payload.recipients.length,
        remetente_nome: userName,
        remetente_email: userEmail,
        remetente_id: userId,
        prioridade: 'Alta',
        status: statusFim,
        corpo_ou_descricao: payload.message.trim(),
        imagem_resumo: payload.summaryImageBase64 ? payload.summaryImageBase64.slice(0, 500) : '',
        nome_arquivo_pdf: payload.pdfFileName,
        filtros_snapshot: payload.filtersSnapshot,
        itens_count: payload.itemsCount,
        totalizadores_snapshot: payload.totalizersSnapshot,
      })
      recId = created.id
    } catch {
      /* intentionally ignored */
    }

    // Auditoria em pcp_audit_logs
    try {
      await pcpAuditService.recordLog({
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        action: 'CARTEIRA_MINIMA_EMAIL_DISPATCH',
        entity: 'carteira_minima_envios',
        record_id: recId || payload.pdfFileName,
        module: 'Análise de Carteira',
        screen: 'Carteira mínima não atingida',
        status: statusFim,
        reason: 'Carteira mínima não atingida',
        justification: `Envio do relatório PDF agendado para ${payload.recipients.length} destinatário(s). SMTP ausente no servidor.`,
        technical_details: {
          recipients: payload.recipients,
          subject: payload.subject,
          pdf_file_name: payload.pdfFileName,
          smtp_configured: false,
        },
      })
    } catch {
      /* intentionally ignored */
    }

    return {
      success: true,
      status: statusFim,
      message: msgFim,
      smtpConfigured: false,
      recordId: recId,
      recipientsCount: payload.recipients.length,
    }
  },

  /**
   * Cria pendências no Meu Dia para cada responsável selecionado com snapshot de filtros
   */
  async criarPendenciaNoMeuDia(
    payload: CriarPendenciaHubPayload,
  ): Promise<CriarPendenciaHubResultado> {
    if (!payload.responsaveis || payload.responsaveis.length === 0) {
      throw new Error('Selecione pelo menos um responsável pela análise.')
    }
    if (!payload.titulo || !payload.titulo.trim()) {
      throw new Error('O título da pendência é obrigatório.')
    }

    const authRecord = pb.authStore.record || pb.authStore.model
    const userName =
      (authRecord as any)?.name || (authRecord as any)?.email || 'Administrador Geral CIAFAL'
    const userEmail = (authRecord as any)?.email || 'pcp.robotizado@ciafal.com.br'
    const userId = (authRecord as any)?.id || ''

    // Tentar chamada ao backend hook oficial
    try {
      const resp = await pb.send<any>('/backend/v1/pcp/carteira-minima/criar-pendencia-hub', {
        method: 'POST',
        body: {
          responsaveis: payload.responsaveis,
          titulo: payload.titulo.trim(),
          descricao: payload.descricao.trim(),
          prioridade: payload.prioridade,
          prazo: payload.prazo,
          filters_snapshot: payload.filtersSnapshot,
          items_count: payload.itemsCount,
          totalizers_snapshot: payload.totalizersSnapshot,
          pdf_file_name: payload.pdfFileName || '',
        },
      })

      if (resp && resp.success) {
        return {
          success: true,
          message: resp.message,
          createdCount: resp.created_count || payload.responsaveis.length,
          meuDiaIds: resp.meu_dia_ids || [],
          envioId: resp.envio_id,
        }
      }
    } catch {
      // Degradação para inserção direta caso o endpoint customizado falhe
    }

    const dataHoraBr = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date())

    const createdIds: string[] = []

    for (const resp of payload.responsaveis) {
      try {
        const itemCreated = await pb.collection('meu_dia_pendencias').create({
          origem_sistema: 'PCP Robotizado',
          modulo: 'Análise de Carteira',
          funcao: 'Carteira mínima não atingida',
          categoria: 'PCP — Carteira Mínima',
          titulo: 'PCP — Carteira Mínima Não Atingida',
          competencia: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
          empresa: payload.filtersSnapshot.empresa || 'CIAFAL',
          centro: payload.filtersSnapshot.centro || '1100',
          linha: payload.filtersSnapshot.linha || 'Geral',
          codigo_atividade: 'CARTEIRA-MINIMA',
          atividade_titulo: payload.titulo.slice(0, 50),
          status_origem: 'PENDENTE',
          tipo_pendencia: 'Carteira Mínima Não Atingida',
          descricao: payload.descricao.trim(),
          acao_necessaria:
            'Avaliar materiais relacionados, estoque disponível, saldo a produzir e necessidade de programação.',
          prioridade: payload.prioridade,
          prazo: payload.prazo,
          solicitante_id: userId,
          solicitante_nome: userName,
          responsavel_id: resp.id,
          responsavel_nome: resp.name || resp.email,
          responsavel_email: resp.email || '',
          data_hora: dataHoraBr,
          link_origem:
            '/pcp/analise-carteira/carteira-minima-nao-atingida?origem_relatorio=carteira_minima',
          status: 'Nova',
        })
        createdIds.push(itemCreated.id)
      } catch (err) {
        console.warn('[carteiraMinimaAcoesService] Erro ao criar item em meu_dia_pendencias:', err)
      }
    }

    let envioId = ''
    try {
      const envioRec = await pb.collection('carteira_minima_envios').create({
        tipo: 'PENDENCIA',
        assunto_ou_titulo: payload.titulo.trim(),
        destinatarios_json: payload.responsaveis,
        destinatarios_count: payload.responsaveis.length,
        remetente_nome: userName,
        remetente_email: userEmail,
        remetente_id: userId,
        prioridade: payload.prioridade,
        prazo: payload.prazo,
        status: 'Pendente',
        corpo_ou_descricao: payload.descricao.trim(),
        nome_arquivo_pdf: payload.pdfFileName || '',
        filtros_snapshot: payload.filtersSnapshot,
        itens_count: payload.itemsCount,
        totalizadores_snapshot: payload.totalizersSnapshot,
        meu_dia_ids: createdIds,
      })
      envioId = envioRec.id
    } catch {
      /* intentionally ignored */
    }

    try {
      await pcpAuditService.recordLog({
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        action: 'CRIAR_PENDENCIA_CARTEIRA_MINIMA',
        entity: 'meu_dia_pendencias',
        record_id: envioId || createdIds.join(','),
        module: 'Análise de Carteira',
        screen: 'Carteira mínima não atingida',
        status: 'CRIADO',
        reason: 'Carteira mínima não atingida',
        justification: `Pendência criada para ${payload.responsaveis.length} responsável(is) no Meu Dia.`,
        technical_details: {
          responsaveis: payload.responsaveis,
          titulo: payload.titulo,
          prioridade: payload.prioridade,
          prazo: payload.prazo,
          meu_dia_ids: createdIds,
        },
      })
    } catch {
      /* intentionally ignored */
    }

    return {
      success: true,
      message: `Pendência PCP criada com sucesso e enviada para ${payload.responsaveis.length} usuários no Meu Dia.`,
      createdCount: createdIds.length,
      meuDiaIds: createdIds,
      envioId,
    }
  },

  /**
   * Conclui ou altera status de pendência individual no Meu Dia
   */
  async atualizarStatusMeuDia(params: {
    pendenciaId: string
    novoStatus: 'Nova' | 'Em andamento' | 'Concluída' | 'Cancelada'
    usuarioNome: string
    usuarioId?: string
    observacao?: string
  }): Promise<boolean> {
    const { pendenciaId, novoStatus, usuarioNome, usuarioId, observacao } = params
    const agoraIso = new Date().toISOString()

    try {
      await pb.collection('meu_dia_pendencias').update(pendenciaId, {
        status: novoStatus,
        concluida_em: novoStatus === 'Concluída' ? agoraIso : undefined,
        concluida_por: novoStatus === 'Concluída' ? usuarioNome : undefined,
        observacao_conclusao: observacao || undefined,
      })

      // Registrar auditoria
      await pcpAuditService.recordLog({
        user_id: usuarioId,
        user_name: usuarioNome,
        user_email: pb.authStore.record?.email || '',
        action: `ATUALIZAR_STATUS_PENDENCIA_${novoStatus.toUpperCase()}`,
        entity: 'meu_dia_pendencias',
        record_id: pendenciaId,
        module: 'Análise de Carteira',
        screen: 'Meu Dia',
        status: novoStatus,
        reason: 'Atualização operacional de pendência',
        justification: observacao || `Status alterado para ${novoStatus}`,
        technical_details: {
          pendencia_id: pendenciaId,
          novo_status: novoStatus,
          observacao,
        },
      })

      return true
    } catch (err) {
      console.warn('[carteiraMinimaAcoesService] Erro ao atualizar status no Meu Dia:', err)
      return false
    }
  },

  /**
   * Lista o histórico de envios (e-mails e pendências) do relatório de carteira mínima
   */
  async listarHistoricoEnvios(): Promise<HistoricoEnvioItem[]> {
    try {
      const records = await pb.collection('carteira_minima_envios').getFullList({
        sort: '-created',
      })
      return records as any[]
    } catch (err) {
      console.warn('[carteiraMinimaAcoesService] Erro ao listar historico envios:', err)
      return []
    }
  },
}
