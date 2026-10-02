import { pb } from '@/lib/pocketbase/client'
import { FechamentoDestinatario, DestinatarioGrupo } from '@/types/checklist-fechamento'

class FechamentoDestinatariosService {
  /**
   * Registra log de auditoria imutável em pcp_audit_logs
   */
  private async logAuditoria(dados: {
    acao: string
    descricao: string
    valor_anterior?: string
    valor_novo?: string
    detalhes?: Record<string, any>
  }): Promise<void> {
    try {
      const user = pb.authStore.record
      await pb.collection('pcp_audit_logs').create({
        user_id: user?.id || 'admin-user',
        user_name: user?.name || user?.email || 'Controle de Produção',
        user_email: user?.email || 'pcp@ciafal.com.br',
        user_role: (user?.role as string) || 'PCP_ADMIN',
        event_type: 'SECURITY_ACTION',
        action: dados.acao,
        resource: 'FECHAMENTO_DESTINATARIOS',
        record_id: 'fechamento_destinatarios',
        status: 'Concluído',
        outcome: 'SUCCESS',
        module: 'CONTROLE_DE_PRODUCAO',
        screen: 'Check-list Fechamento - Destinatários',
        company: 'CIAFAL',
        reason: dados.descricao,
        justification: dados.descricao,
        details: {
          valor_anterior: dados.valor_anterior,
          valor_novo: dados.valor_novo,
          ...dados.detalhes,
        },
      })
    } catch (err) {
      console.warn('Falha silenciosa ao registrar auditoria de destinatários:', err)
    }
  }

  /**
   * Lista todos os destinatários cadastrados (ativos e inativos)
   */
  async listarDestinatarios(grupo?: DestinatarioGrupo): Promise<FechamentoDestinatario[]> {
    try {
      const filter = grupo ? `grupo = "${grupo}"` : ''
      const records = await pb.collection('fechamento_destinatarios').getFullList({
        filter,
        sort: 'grupo,nome',
      })
      return records.map((r: any) => ({
        id: r.id,
        grupo: r.grupo,
        nome: r.nome,
        usuario: r.usuario,
        email: r.email,
        ativo: r.ativo,
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.warn('Erro ao listar destinatários do fechamento:', err)
      return []
    }
  }

  /**
   * Lista apenas destinatários ativos de um grupo
   */
  async listarAtivosPorGrupo(grupo: DestinatarioGrupo): Promise<FechamentoDestinatario[]> {
    try {
      const records = await pb.collection('fechamento_destinatarios').getFullList({
        filter: `grupo = "${grupo}" && ativo = true`,
        sort: 'nome',
      })
      return records.map((r: any) => ({
        id: r.id,
        grupo: r.grupo,
        nome: r.nome,
        usuario: r.usuario,
        email: r.email,
        ativo: r.ativo,
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.warn(`Erro ao listar destinatários ativos do grupo ${grupo}:`, err)
      return []
    }
  }

  /**
   * Cria novo destinatário (somente administradores / gerentes)
   */
  async criarDestinatario(
    dados: Omit<FechamentoDestinatario, 'id' | 'created' | 'updated'>,
  ): Promise<FechamentoDestinatario> {
    const payload = {
      grupo: dados.grupo,
      nome: dados.nome.trim(),
      usuario: (dados.usuario || dados.email.split('@')[0]).trim(),
      email: dados.email.trim().toLowerCase(),
      ativo: dados.ativo ?? true,
    }

    const record = await pb.collection('fechamento_destinatarios').create(payload)

    await this.logAuditoria({
      acao: 'CRIAR_DESTINATARIO_FECHAMENTO',
      descricao: `Novo destinatário cadastrado: ${record.nome} (${record.email}) - Grupo ${record.grupo}`,
      valor_novo: JSON.stringify(record),
      detalhes: { destinatario_id: record.id, email: record.email, grupo: record.grupo },
    })

    return {
      id: record.id,
      grupo: record.grupo,
      nome: record.nome,
      usuario: record.usuario,
      email: record.email,
      ativo: record.ativo,
      created: record.created,
      updated: record.updated,
    }
  }

  /**
   * Atualiza destinatário existente
   */
  async atualizarDestinatario(
    id: string,
    dados: Partial<Omit<FechamentoDestinatario, 'id' | 'created' | 'updated'>>,
  ): Promise<FechamentoDestinatario> {
    const anterior = await pb.collection('fechamento_destinatarios').getOne(id)
    const payload: any = {}
    if (dados.grupo) payload.grupo = dados.grupo
    if (dados.nome) payload.nome = dados.nome.trim()
    if (dados.usuario !== undefined) payload.usuario = dados.usuario.trim()
    if (dados.email) payload.email = dados.email.trim().toLowerCase()
    if (dados.ativo !== undefined) payload.ativo = dados.ativo

    const record = await pb.collection('fechamento_destinatarios').update(id, payload)

    await this.logAuditoria({
      acao: 'ATUALIZAR_DESTINATARIO_FECHAMENTO',
      descricao: `Destinatário atualizado: ${record.nome} (${record.email})`,
      valor_anterior: JSON.stringify(anterior),
      valor_novo: JSON.stringify(record),
      detalhes: { destinatario_id: id, mudancas: payload },
    })

    return {
      id: record.id,
      grupo: record.grupo,
      nome: record.nome,
      usuario: record.usuario,
      email: record.email,
      ativo: record.ativo,
      created: record.created,
      updated: record.updated,
    }
  }

  /**
   * Alterna status ativo/inativo de um destinatário
   */
  async alternarStatus(id: string, ativo: boolean): Promise<FechamentoDestinatario> {
    return this.atualizarDestinatario(id, { ativo })
  }
}

export const fechamentoDestinatariosService = new FechamentoDestinatariosService()
export default fechamentoDestinatariosService
