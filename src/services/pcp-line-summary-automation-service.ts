import { pb } from '@/lib/pocketbase/client'
import type { MonthlySummaryTemplate } from './pcp-monthly-summaries'

export type { MonthlySummaryTemplate } from './pcp-monthly-summaries'

export type LineSummaryConfigStatus = 'ATIVO' | 'INATIVO' | 'SUSPENSO'
export type SummaryPeriodicity =
  | 'diaria'
  | 'semanal'
  | 'quinzenal'
  | 'mensal'
  | 'trimestral'
  | 'sob_demanda'
  | 'personalizada'

export type SummaryRunStatus =
  | 'PENDENTE'
  | 'EM_EXECUCAO'
  | 'SUCESSO'
  | 'FALHA'
  | 'REPROCESSADO'
  | 'CANCELADO'

export type SummaryRunOrigin = 'manual' | 'automatica' | 'reprocessamento'

export interface CustomPeriodicityParams {
  intervalo_dias?: number
  dias_da_semana?: number[] // 1=segunda ... 7=domingo
  dia_do_mes?: number
  horario?: string // HH:mm
  data_inicio?: string // yyyy-mm-dd
  data_fim?: string // yyyy-mm-dd
}

export interface LineSummaryConfig {
  id: string
  empresa_code: string
  linha_id?: string
  linha_code: string
  linha_nome?: string
  centro_code?: string
  centro_nome?: string
  template_id?: string
  template_code?: string
  template_nome?: string
  tipo_resumo: string
  responsavel_geracao_id?: string
  responsavel_geracao_nome?: string
  programador_pcp_id?: string
  programador_pcp_nome?: string
  programador_substituto_id?: string
  programador_substituto_nome?: string
  supervisor_pcp_id?: string
  supervisor_pcp_nome?: string
  geracao_automatica: boolean
  exigir_aprovacao: boolean
  envio_automatico_apos_aprovacao: boolean
  periodicidade: SummaryPeriodicity
  parametros_personalizados?: CustomPeriodicityParams
  data_referencia_str?: string
  data_ultima_geracao?: string
  data_ultimo_envio?: string
  proxima_execucao?: string
  status: LineSummaryConfigStatus
  observacoes?: string
  finalidade?: string
  created?: string
  updated?: string
}

export interface SummaryScheduleRun {
  id: string
  config_id: string
  config_dedup_key: string
  periodo: string
  linha_code: string
  linha_nome?: string
  centro_code?: string
  template_id_usado?: string
  template_codigo_usado?: string
  template_versao_usada?: string
  resumo_gerado_id?: string
  resumo_codigo?: string
  tentativas: number
  erro?: string
  origem: SummaryRunOrigin
  status: SummaryRunStatus
  iniciado_em?: string
  finalizado_em?: string
  tempo_execucao_ms?: number
  detalhes_execucao?: Record<string, any>
  created?: string
  updated?: string
}

export interface SummaryRecipientsConfig {
  id: string
  config_id?: string
  linha_code?: string
  template_code?: string
  tipo_resumo?: string
  usuarios_ids?: string[]
  grupos?: string[]
  setores?: string[]
  emails_autorizados?: string[]
  assunto_template?: string
  corpo_template?: string
  anexar_pdf?: boolean
  anexar_pdf_executivo?: boolean
  exigir_confirmacao_leitura?: boolean
  enviar_lembrete?: boolean
  prazo_leitura_dias?: number
  exigir_aprovacao_previa?: boolean
  canais?: string[]
  status: 'ATIVO' | 'INATIVO'
  created?: string
  updated?: string
}

export interface RealProductionLine {
  id: string
  code: string
  name: string
  sap_work_center?: string
  plant_id?: string
  is_active: boolean
}

export interface HubUser {
  id: string
  name: string
  email: string
  role?: string
}

export const PERIODICITY_LABELS: Record<SummaryPeriodicity, string> = {
  diaria: 'Diária',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  sob_demanda: 'Sob Demanda',
  personalizada: 'Personalizada',
}

export const SUMMARY_TYPES = [
  'Resumo Mensal PCP',
  'Resumo Semanal PCP',
  'Resumo Diário PCP',
  'Resumo Quinzenal PCP',
  'Resumo Executivo',
  'Resumo Operacional',
]

/**
 * Service de Automação de Resumos por Linha
 */
export const lineSummaryAutomationService = {
  /**
   * Buscar linhas produtivas REAIS da coleção production_lines (L1, L2, SDC e todas as cadastradas)
   */
  async getRealProductionLines(): Promise<RealProductionLine[]> {
    try {
      const records = await pb.collection('production_lines').getFullList({
        sort: 'code',
      })
      return records.map((r: any) => ({
        id: r.id,
        code: r.code || '',
        name: r.name || r.code || '',
        sap_work_center: r.sap_work_center || '',
        plant_id: r.plant_id || '',
        is_active: r.is_active !== false,
      }))
    } catch (err) {
      console.warn('Erro ao carregar production_lines do banco:', err)
      return []
    }
  },

  /**
   * Buscar usuários reais do HUB CIAFAL
   */
  async getHubUsers(): Promise<HubUser[]> {
    try {
      const records = await pb.collection('users').getFullList({
        sort: 'name',
      })
      return records.map((u: any) => ({
        id: u.id,
        name: u.name || u.email || 'Usuário HUB',
        email: u.email || '',
        role: u.role || 'PCP_PROGRAMMER',
      }))
    } catch (err) {
      console.warn('Erro ao carregar usuários:', err)
      return []
    }
  },

  /**
   * Listar todas as configurações por linha
   */
  async listLineConfigs(filter?: string): Promise<LineSummaryConfig[]> {
    try {
      const records = await pb.collection('pcp_line_summary_configs').getFullList({
        filter: filter || '',
        sort: 'linha_code,-created',
      })
      return records.map(this.mapConfigRecord)
    } catch (err) {
      console.warn('Erro ao buscar pcp_line_summary_configs:', err)
      return []
    }
  },

  /**
   * Buscar configuração por ID
   */
  async getLineConfigById(id: string): Promise<LineSummaryConfig | null> {
    try {
      const record = await pb.collection('pcp_line_summary_configs').getOne(id)
      return this.mapConfigRecord(record)
    } catch (err) {
      return null
    }
  },

  /**
   * Criar ou atualizar configuração por linha
   */
  async saveLineConfig(config: Partial<LineSummaryConfig>): Promise<LineSummaryConfig> {
    const payload: any = {
      empresa_code: config.empresa_code || 'CIAFAL',
      linha_id: config.linha_id || '',
      linha_code: config.linha_code || '',
      linha_nome: config.linha_nome || '',
      centro_code: config.centro_code || '',
      centro_nome: config.centro_nome || '',
      template_id: config.template_id || '',
      template_code: config.template_code || '',
      template_nome: config.template_nome || '',
      tipo_resumo: config.tipo_resumo || 'Resumo Mensal PCP',
      responsavel_geracao_id: config.responsavel_geracao_id || '',
      responsavel_geracao_nome: config.responsavel_geracao_nome || '',
      programador_pcp_id: config.programador_pcp_id || '',
      programador_pcp_nome: config.programador_pcp_nome || '',
      programador_substituto_id: config.programador_substituto_id || '',
      programador_substituto_nome: config.programador_substituto_nome || '',
      supervisor_pcp_id: config.supervisor_pcp_id || '',
      supervisor_pcp_nome: config.supervisor_pcp_nome || '',
      geracao_automatica: Boolean(config.geracao_automatica),
      exigir_aprovacao: Boolean(config.exigir_aprovacao),
      envio_automatico_apos_aprovacao: Boolean(config.envio_automatico_apos_aprovacao),
      periodicidade: config.periodicidade || 'mensal',
      parametros_personalizados: config.parametros_personalizados || {},
      data_referencia_str: config.data_referencia_str || '',
      proxima_execucao:
        config.proxima_execucao ||
        this.calculateNextExecution(
          config.periodicidade || 'mensal',
          config.parametros_personalizados,
        ),
      status: config.status || 'ATIVO',
      observacoes: config.observacoes || '',
      finalidade: config.finalidade || '',
    }

    let record: any
    if (config.id) {
      record = await pb.collection('pcp_line_summary_configs').update(config.id, payload)
    } else {
      record = await pb.collection('pcp_line_summary_configs').create(payload)
    }

    // Registrar auditoria
    await this.logAudit(
      config.id ? 'PCP_LINE_CONFIG_UPDATE' : 'PCP_LINE_CONFIG_CREATE',
      `Configuração por linha ${payload.linha_code} (${payload.tipo_resumo})`,
      { config_id: record.id, linha: payload.linha_code, periodicidade: payload.periodicidade },
      payload.linha_code,
    )

    return this.mapConfigRecord(record)
  },

  /**
   * Suspender configuração
   */
  async suspendConfig(id: string): Promise<LineSummaryConfig> {
    const updated = await pb.collection('pcp_line_summary_configs').update(id, {
      status: 'SUSPENSO',
    })
    await this.logAudit('PCP_LINE_CONFIG_SUSPEND', `Configuração suspensa: ${id}`, {
      config_id: id,
    })
    return this.mapConfigRecord(updated)
  },

  /**
   * Reativar configuração
   */
  async reactivateConfig(id: string): Promise<LineSummaryConfig> {
    const existing = await pb.collection('pcp_line_summary_configs').getOne(id)
    const proxima = this.calculateNextExecution(
      existing.periodicidade,
      existing.parametros_personalizados,
    )
    const updated = await pb.collection('pcp_line_summary_configs').update(id, {
      status: 'ATIVO',
      proxima_execucao: proxima,
    })
    await this.logAudit('PCP_LINE_CONFIG_REACTIVATE', `Configuração reativada: ${id}`, {
      config_id: id,
      proxima_execucao: proxima,
    })
    return this.mapConfigRecord(updated)
  },

  /**
   * Excluir configuração
   */
  async deleteConfig(id: string): Promise<boolean> {
    try {
      await pb.collection('pcp_line_summary_configs').delete(id)
      await this.logAudit('PCP_LINE_CONFIG_DELETE', `Configuração removida: ${id}`, {
        config_id: id,
      })
      return true
    } catch (err) {
      console.warn('Erro ao excluir config:', err)
      return false
    }
  },

  /**
   * Listar execuções de agendamento (runs)
   */
  async listRuns(filter?: string, limit = 50): Promise<SummaryScheduleRun[]> {
    try {
      const records = await pb.collection('pcp_summary_schedule_runs').getList(1, limit, {
        filter: filter || '',
        sort: '-created',
      })
      return records.items.map(this.mapRunRecord)
    } catch (err) {
      console.warn('Erro ao buscar pcp_summary_schedule_runs:', err)
      return []
    }
  },

  /**
   * Disparo manual de geração por linha (única ou múltipla independente)
   */
  async generateSummariesByLine(params: {
    config_ids?: string[]
    line_codes?: string[]
    empresa_code?: string
    centro_code?: string
    centro_nome?: string
    template_id?: string
    periodo?: string
    with_ai?: boolean
    force_recreate?: boolean
  }): Promise<{ success: boolean; periodo: string; processed_count: number; results: any[] }> {
    const res = await pb.send('/backend/v1/pcp/line-summaries/generate', {
      method: 'POST',
      body: params,
    })
    return res
  },

  /**
   * Reprocessar uma execução que falhou
   */
  async reprocessRun(runId: string): Promise<{ success: boolean; message: string; result: any }> {
    const res = await pb.send('/backend/v1/pcp/line-summaries/reprocess-run', {
      method: 'POST',
      body: { run_id: runId },
    })
    return res
  },

  /**
   * Disparar envio de resumo aos destinatários configurados (bloqueado se aprovação pendente)
   */
  async sendSummary(
    summaryId: string,
    summaryCode?: string,
  ): Promise<{ success: boolean; status: string; message: string; recipients_count?: number }> {
    const res = await pb.send('/backend/v1/pcp/line-summaries/send-summary', {
      method: 'POST',
      body: { summary_id: summaryId, summary_code: summaryCode },
    })
    return res
  },

  /**
   * Salvar destinatários
   */
  async saveRecipients(
    recipient: Partial<SummaryRecipientsConfig>,
  ): Promise<SummaryRecipientsConfig> {
    const payload: any = {
      config_id: recipient.config_id || '',
      linha_code: recipient.linha_code || '',
      template_code: recipient.template_code || '',
      tipo_resumo: recipient.tipo_resumo || 'Resumo Mensal PCP',
      usuarios_ids: recipient.usuarios_ids || [],
      grupos: recipient.grupos || [],
      setores: recipient.setores || [],
      emails_autorizados: recipient.emails_autorizados || [],
      assunto_template:
        recipient.assunto_template || 'Resumo Mensal de Entregas PCP - {linha} ({periodo})',
      corpo_template:
        recipient.corpo_template ||
        'Segue em anexo o resumo operacional e executivo da Linha {linha} referente a {mes}/{ano}. Versão: {versao}. Responsável: {responsavel}.',
      anexar_pdf: recipient.anexar_pdf ?? true,
      anexar_pdf_executivo: recipient.anexar_pdf_executivo ?? false,
      exigir_confirmacao_leitura: recipient.exigir_confirmacao_leitura ?? false,
      enviar_lembrete: recipient.enviar_lembrete ?? false,
      prazo_leitura_dias: recipient.prazo_leitura_dias || 3,
      exigir_aprovacao_previa: recipient.exigir_aprovacao_previa ?? true,
      canais: recipient.canais || ['email'],
      status: recipient.status || 'ATIVO',
    }

    let record: any
    if (recipient.id) {
      record = await pb.collection('pcp_summary_recipients').update(recipient.id, payload)
    } else {
      record = await pb.collection('pcp_summary_recipients').create(payload)
    }

    await this.logAudit(
      'PCP_SUMMARY_RECIPIENTS_SAVE',
      `Destinatários configurados para linha ${payload.linha_code}`,
      { recipient_id: record.id, linha: payload.linha_code, emails: payload.emails_autorizados },
      payload.linha_code,
    )

    return this.mapRecipientRecord(record)
  },

  /**
   * Buscar destinatários configurados por linha ou config_id
   */
  async getRecipients(
    linhaCode?: string,
    configId?: string,
  ): Promise<SummaryRecipientsConfig | null> {
    try {
      let filter = ''
      if (configId) filter = `config_id = '${configId}'`
      else if (linhaCode) filter = `linha_code = '${linhaCode}'`

      const list = await pb.collection('pcp_summary_recipients').getList(1, 1, {
        filter,
        sort: '-created',
      })
      if (list.items.length > 0) {
        return this.mapRecipientRecord(list.items[0])
      }
      return null
    } catch (_) {
      return null
    }
  },

  /**
   * Interpola variáveis dinâmicas no assunto/corpo
   */
  interpolateEmailVariables(
    text: string,
    variables: {
      empresa?: string
      linha?: string
      centro?: string
      mes?: string | number
      ano?: string | number
      periodo?: string
      versao?: string
      responsavel?: string
    },
  ): string {
    return text
      .replace(/{empresa}/gi, variables.empresa || 'CIAFAL')
      .replace(/{linha}/gi, variables.linha || '')
      .replace(/{centro}/gi, variables.centro || '')
      .replace(/{mes}/gi, String(variables.mes || ''))
      .replace(/{ano}/gi, String(variables.ano || ''))
      .replace(/{periodo}/gi, variables.periodo || '')
      .replace(/{versao}/gi, variables.versao || 'V01')
      .replace(/{responsavel}/gi, variables.responsavel || 'PCP')
  },

  /**
   * Resolver template respeitando hierarquia canônica:
   * 1. Vínculo explícito da configuração da linha (template_id ou template_code)
   * 2. Centro fabril da linha
   * 3. Linha produtiva específica
   * 4. Empresa (CIAFAL)
   * 5. Geral institucional homologado
   */
  resolveTemplateForLine(
    config: {
      template_id?: string
      template_code?: string
      centro_code?: string
      linha_code?: string
      empresa_code?: string
    },
    templates: MonthlySummaryTemplate[],
  ): MonthlySummaryTemplate | null {
    if (!templates || templates.length === 0) return null

    // 1. Vínculo explícito da configuração
    if (config.template_id) {
      const explicit = templates.find((t) => t.id === config.template_id && t.status === 'ATIVO')
      if (explicit) return explicit
    }
    if (config.template_code) {
      const explicitCode = templates.find(
        (t) => t.template_code === config.template_code && t.status === 'ATIVO',
      )
      if (explicitCode) return explicitCode
    }

    // 2. Centro fabril da linha
    if (config.centro_code && config.centro_code !== 'ALL') {
      const centerTpl = templates.find(
        (t) =>
          t.status === 'ATIVO' && t.aplicacao === 'CENTRO' && t.centro_code === config.centro_code,
      )
      if (centerTpl) return centerTpl
    }

    // 3. Linha produtiva
    if (config.linha_code && config.linha_code !== 'ALL') {
      const lineTpl = templates.find(
        (t) =>
          t.status === 'ATIVO' && t.aplicacao === 'LINHA' && t.linha_code === config.linha_code,
      )
      if (lineTpl) return lineTpl
    }

    // 4. Empresa (CIAFAL)
    if (config.empresa_code && config.empresa_code !== 'ALL') {
      const companyTpl = templates.find(
        (t) =>
          t.status === 'ATIVO' &&
          t.aplicacao === 'EMPRESA' &&
          (t.empresa_code === config.empresa_code || t.empresa_code === 'CIAFAL'),
      )
      if (companyTpl) return companyTpl
    }

    // 5. Geral (default ou primeiro ativo)
    const defaultGeral = templates.find((t) => t.status === 'ATIVO' && t.is_default)
    if (defaultGeral) return defaultGeral

    const firstActive = templates.find((t) => t.status === 'ATIVO')
    return firstActive || null
  },

  /**
   * Cálculo determinístico de próxima execução
   * Fuso horário de referência: America/Sao_Paulo (-03:00)
   * Suporta: diária, semanal, quinzenal, mensal (com dia_do_mes), trimestral e personalizada (dias_da_semana e intervalo_dias)
   */
  calculateNextExecution(
    periodicidade: SummaryPeriodicity,
    params?: CustomPeriodicityParams,
    fromDate?: Date,
  ): string {
    if (periodicidade === 'sob_demanda') return ''

    const d = fromDate ? new Date(fromDate) : new Date()

    const horario = params?.horario || '08:00'
    const [hStr, mStr] = horario.split(':')
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    const hour = isNaN(h) ? 8 : Math.min(23, Math.max(0, h))
    const minute = isNaN(m) ? 0 : Math.min(59, Math.max(0, m))

    if (periodicidade === 'diaria') {
      d.setDate(d.getDate() + 1)
      d.setHours(hour, minute, 0, 0)
    } else if (periodicidade === 'semanal') {
      d.setDate(d.getDate() + 7)
      d.setHours(hour, minute, 0, 0)
    } else if (periodicidade === 'quinzenal') {
      d.setDate(d.getDate() + 15)
      d.setHours(hour, minute, 0, 0)
    } else if (periodicidade === 'mensal') {
      const targetDay =
        params?.dia_do_mes && params.dia_do_mes >= 1 && params.dia_do_mes <= 31
          ? params.dia_do_mes
          : d.getDate()
      d.setMonth(d.getMonth() + 1)
      const maxDaysInNextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(targetDay, maxDaysInNextMonth))
      d.setHours(hour, minute, 0, 0)
    } else if (periodicidade === 'trimestral') {
      const targetDay =
        params?.dia_do_mes && params.dia_do_mes >= 1 && params.dia_do_mes <= 31
          ? params.dia_do_mes
          : d.getDate()
      d.setMonth(d.getMonth() + 3)
      const maxDaysInNextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(targetDay, maxDaysInNextMonth))
      d.setHours(hour, minute, 0, 0)
    } else if (periodicidade === 'personalizada') {
      // Se tiver dias da semana especificados (1=segunda ... 7=domingo)
      if (
        params?.dias_da_semana &&
        Array.isArray(params.dias_da_semana) &&
        params.dias_da_semana.length > 0
      ) {
        // Encontrar o próximo dia da semana
        let nextDayFound = false
        for (let i = 1; i <= 7; i++) {
          const testDate = new Date(d)
          testDate.setDate(d.getDate() + i)
          // Em JS: 0=domingo, 1=segunda ... 6=sábado. Mapear para 1=segunda..7=domingo
          const jsDay = testDate.getDay()
          const mappedDay = jsDay === 0 ? 7 : jsDay
          if (params.dias_da_semana.includes(mappedDay)) {
            d.setDate(d.getDate() + i)
            nextDayFound = true
            break
          }
        }
        if (!nextDayFound) {
          d.setDate(d.getDate() + 1)
        }
        d.setHours(hour, minute, 0, 0)
      } else {
        const interval = params?.intervalo_dias ? Number(params.intervalo_dias) : 1
        d.setDate(d.getDate() + (interval > 0 ? interval : 1))
        d.setHours(hour, minute, 0, 0)
      }
    }

    return d.toISOString()
  },

  /**
   * Trilha de auditoria em pcp_audit_logs
   */
  async logAudit(action: string, description: string, details?: any, line?: string) {
    try {
      const user = pb.authStore.record
      await pb.collection('pcp_audit_logs').create({
        user_id: user?.id || 'CLIENT',
        user_email: user?.email || '',
        user_name: user?.name || user?.email || 'PCP Programador',
        user_role: user?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action,
        resource: 'PCP_LINE_SUMMARY_CONFIG',
        permission_required: 'pcp.templates.manage',
        outcome: 'SUCCESS',
        line: line || '',
        module: 'ENTREGAS_PCP',
        screen: 'RESUMO_MENSAL',
        details: { description, ...(details || {}) },
      })
    } catch (err) {
      console.warn('Erro ao gravar log de auditoria:', err)
    }
  },

  mapConfigRecord(r: any): LineSummaryConfig {
    return {
      id: r.id,
      empresa_code: r.empresa_code || 'CIAFAL',
      linha_id: r.linha_id || '',
      linha_code: r.linha_code || '',
      linha_nome: r.linha_nome || r.linha_code || '',
      centro_code: r.centro_code || '',
      centro_nome: r.centro_nome || '',
      template_id: r.template_id || '',
      template_code: r.template_code || '',
      template_nome: r.template_nome || '',
      tipo_resumo: r.tipo_resumo || 'Resumo Mensal PCP',
      responsavel_geracao_id: r.responsavel_geracao_id || '',
      responsavel_geracao_nome: r.responsavel_geracao_nome || '',
      programador_pcp_id: r.programador_pcp_id || '',
      programador_pcp_nome: r.programador_pcp_nome || '',
      programador_substituto_id: r.programador_substituto_id || '',
      programador_substituto_nome: r.programador_substituto_nome || '',
      supervisor_pcp_id: r.supervisor_pcp_id || '',
      supervisor_pcp_nome: r.supervisor_pcp_nome || '',
      geracao_automatica: Boolean(r.geracao_automatica),
      exigir_aprovacao: Boolean(r.exigir_aprovacao),
      envio_automatico_apos_aprovacao: Boolean(r.envio_automatico_apos_aprovacao),
      periodicidade: (r.periodicidade as SummaryPeriodicity) || 'mensal',
      parametros_personalizados: r.parametros_personalizados || {},
      data_referencia_str: r.data_referencia_str || '',
      data_ultima_geracao: r.data_ultima_geracao || '',
      data_ultimo_envio: r.data_ultimo_envio || '',
      proxima_execucao: r.proxima_execucao || '',
      status: (r.status as LineSummaryConfigStatus) || 'ATIVO',
      observacoes: r.observacoes || '',
      finalidade: r.finalidade || '',
      created: r.created,
      updated: r.updated,
    }
  },

  mapRunRecord(r: any): SummaryScheduleRun {
    return {
      id: r.id,
      config_id: r.config_id || '',
      config_dedup_key: r.config_dedup_key || '',
      periodo: r.periodo || '',
      linha_code: r.linha_code || '',
      linha_nome: r.linha_nome || '',
      centro_code: r.centro_code || '',
      template_id_usado: r.template_id_usado || '',
      template_codigo_usado: r.template_codigo_usado || '',
      template_versao_usada: r.template_versao_usada || '',
      resumo_gerado_id: r.resumo_gerado_id || '',
      resumo_codigo: r.resumo_codigo || '',
      tentativas: r.tentativas || 0,
      erro: r.erro || '',
      origem: (r.origem as SummaryRunOrigin) || 'manual',
      status: (r.status as SummaryRunStatus) || 'PENDENTE',
      iniciado_em: r.iniciado_em || '',
      finalizado_em: r.finalizado_em || '',
      tempo_execucao_ms: r.tempo_execucao_ms || 0,
      detalhes_execucao: r.detalhes_execucao || {},
      created: r.created,
      updated: r.updated,
    }
  },

  mapRecipientRecord(r: any): SummaryRecipientsConfig {
    return {
      id: r.id,
      config_id: r.config_id || '',
      linha_code: r.linha_code || '',
      template_code: r.template_code || '',
      tipo_resumo: r.tipo_resumo || 'Resumo Mensal PCP',
      usuarios_ids: r.usuarios_ids || [],
      grupos: r.grupos || [],
      setores: r.setores || [],
      emails_autorizados: r.emails_autorizados || [],
      assunto_template: r.assunto_template || '',
      corpo_template: r.corpo_template || '',
      anexar_pdf: Boolean(r.anexar_pdf),
      anexar_pdf_executivo: Boolean(r.anexar_pdf_executivo),
      exigir_confirmacao_leitura: Boolean(r.exigir_confirmacao_leitura),
      enviar_lembrete: Boolean(r.enviar_lembrete),
      prazo_leitura_dias: r.prazo_leitura_dias || 3,
      exigir_aprovacao_previa: Boolean(r.exigir_aprovacao_previa),
      canais: r.canais || ['email'],
      status: r.status || 'ATIVO',
      created: r.created,
      updated: r.updated,
    }
  },
}
