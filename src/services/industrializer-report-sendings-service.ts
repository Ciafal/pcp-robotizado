/**
 * Serviço de histórico e relatórios de envios (E-mail e HUB)
 * Módulo: Gestão Industrializador — PCP Robotizado (HUB CIAFAL)
 *
 * Lê primordialmente da collection `pcp_report_sendings` e complementa
 * com `comercial_comunicados` onde aplicável.
 */

import pb from '@/lib/pocketbase/client'

export type ReportChannel = 'EMAIL' | 'HUB' | 'TODOS'
export type ReportStatus = 'SUCESSO' | 'FALHA' | 'ENVIADO' | 'TODOS'
export type ScreenOriginKey = 'gestao_mp' | 'analise_carteira' | 'sequenciamento_pxr' | 'TODAS'

export interface ReportSendingRecord {
  id: string
  sending_code: string
  channel: 'EMAIL' | 'HUB'
  screen_key: 'gestao_mp' | 'analise_carteira' | 'sequenciamento_pxr' | string
  screen_name: string
  subject: string
  body_content: string
  recipients: string[]
  recipients_text: string
  status: 'SUCESSO' | 'FALHA'
  sender_user_name: string
  sender_user_email: string
  sent_at: string
  sent_at_formatted: string
  line_code?: string
  period_ref?: string
  filters_applied?: Record<string, any>
  metadata?: Record<string, any>
  source_collection: 'pcp_report_sendings' | 'comercial_comunicados'
}

export interface ReportSendingsFilter {
  channel?: ReportChannel
  screenKey?: ScreenOriginKey
  status?: ReportStatus
  search?: string
  dateFrom?: string
  dateTo?: string
}

export const SCREEN_NAME_MAP: Record<string, string> = {
  gestao_mp: 'Gestão de MP',
  analise_carteira: 'Análise de Carteira',
  sequenciamento_pxr: 'Sequenciamento P x R',
  sequenciamento: 'Sequenciamento P x R',
  carteira: 'Análise de Carteira',
  mp: 'Gestão de MP',
}

export function normalizeScreenKey(rawKey?: string): string {
  if (!rawKey) return 'gestao_mp'
  const clean = rawKey.toLowerCase().trim()
  if (clean.includes('mp')) return 'gestao_mp'
  if (clean.includes('carteira')) return 'analise_carteira'
  if (clean.includes('sequenciamento') || clean.includes('pxr') || clean.includes('p_x_r')) {
    return 'sequenciamento_pxr'
  }
  return clean
}

export function formatDateTimePtBr(isoString?: string): string {
  if (!isoString) return '--/--/---- --:--'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return '--/--/---- --:--'
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch {
    return '--/--/---- --:--'
  }
}

export class IndustrializerReportSendingsService {
  /**
   * Busca registros de envios reais das collections do PocketBase
   */
  async getSendings(filters: ReportSendingsFilter = {}): Promise<ReportSendingRecord[]> {
    const recordsMap = new Map<string, ReportSendingRecord>()

    // 1. Tentar ler de pcp_report_sendings
    try {
      const sendingsList = await pb.collection('pcp_report_sendings').getFullList({
        sort: '-created',
        requestKey: null,
      })

      sendingsList.forEach((item: any) => {
        const rawScreen = item.screen_ref || item.metadata?.screen_key || 'gestao_mp'
        const normalizedScreen = normalizeScreenKey(rawScreen)
        const screenName =
          item.metadata?.screen_name ||
          SCREEN_NAME_MAP[normalizedScreen] ||
          'Gestão Industrializador'

        const recipients = Array.isArray(item.recipients)
          ? item.recipients.map((r: any) =>
              typeof r === 'string' ? r : r.email || r.name || String(r),
            )
          : []

        const rawStatus = (item.status || 'ENVIADO').toUpperCase()
        const normalizedStatus: 'SUCESSO' | 'FALHA' =
          rawStatus === 'FALHA' || rawStatus === 'ERRO' || rawStatus === 'ERROR'
            ? 'FALHA'
            : 'SUCESSO'

        const channel: 'EMAIL' | 'HUB' =
          (item.channel || '').toUpperCase() === 'EMAIL' ? 'EMAIL' : 'HUB'

        const dateIso = item.created || item.updated || new Date().toISOString()

        const record: ReportSendingRecord = {
          id: item.id,
          sending_code: item.sending_code || item.id,
          channel,
          screen_key: normalizedScreen,
          screen_name: screenName,
          subject: item.subject || `Relatório Gestão Industrializador — ${screenName}`,
          body_content: item.body_content || '',
          recipients,
          recipients_text: recipients.join(', ') || 'Nenhum informado',
          status: normalizedStatus,
          sender_user_name: item.sender_user_name || 'Usuário PCP',
          sender_user_email: item.sender_user_email || 'usuario@ciafal.com.br',
          sent_at: dateIso,
          sent_at_formatted: formatDateTimePtBr(dateIso),
          line_code: item.line_code,
          period_ref: item.period_ref,
          filters_applied: item.filters_applied,
          metadata: item.metadata,
          source_collection: 'pcp_report_sendings',
        }

        recordsMap.set(record.id, record)
      })
    } catch (err: any) {
      console.warn('Coleção pcp_report_sendings não acessível ou vazia:', err?.message || err)
    }

    // 2. Tentar complementar com comercial_comunicados filtrando pela origem de Gestão Industrializador
    try {
      const comunicadosList = await pb.collection('comercial_comunicados').getFullList({
        sort: '-created',
        requestKey: null,
      })

      comunicadosList.forEach((item: any) => {
        const origemStr = (item.origem || '').toLowerCase()
        const meta = item.metadata_json || {}
        const isIndustrializer =
          origemStr.includes('industrializador') ||
          origemStr.includes('gestão industrializador') ||
          meta.screen_key === 'gestao_mp' ||
          meta.screen_key === 'analise_carteira' ||
          meta.screen_key === 'sequenciamento_pxr'

        if (!isIndustrializer) return

        // Evitar duplicar se já temos o id ou mesmo protocolo em sending_code
        const protocol = item.protocolo || item.id
        const alreadyExists = Array.from(recordsMap.values()).some(
          (r) => r.sending_code === protocol || r.id === item.id,
        )
        if (alreadyExists) return

        const normalizedScreen = normalizeScreenKey(meta.screen_key || item.origem)
        const screenName =
          meta.screen_name || SCREEN_NAME_MAP[normalizedScreen] || 'Gestão Industrializador'

        let recipients: string[] = []
        if (Array.isArray(item.destinatarios_json)) {
          recipients = item.destinatarios_json.map((r: any) =>
            typeof r === 'string' ? r : r.email || r.name || String(r),
          )
        } else if (item.destinatarios_texto) {
          recipients = String(item.destinatarios_texto)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        }

        const dateIso = item.data_envio || item.created || new Date().toISOString()
        const record: ReportSendingRecord = {
          id: item.id,
          sending_code: protocol,
          channel: 'HUB',
          screen_key: normalizedScreen,
          screen_name: screenName,
          subject: item.titulo || `Comunicado HUB — ${screenName}`,
          body_content: item.mensagem || '',
          recipients,
          recipients_text: recipients.join(', ') || item.destinatarios_texto || 'Equipe HUB',
          status: 'SUCESSO',
          sender_user_name: item.criado_por_nome || 'Usuário PCP',
          sender_user_email: item.criado_por_email || 'usuario@ciafal.com.br',
          sent_at: dateIso,
          sent_at_formatted: formatDateTimePtBr(dateIso),
          line_code: item.linha,
          period_ref: 'VIGENTE',
          filters_applied: meta.filters,
          metadata: meta,
          source_collection: 'comercial_comunicados',
        }

        recordsMap.set(record.id, record)
      })
    } catch (err: any) {
      console.warn('Coleção comercial_comunicados não acessível:', err?.message || err)
    }

    const allRecords = Array.from(recordsMap.values()).sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
    )

    // Aplicar filtros em memória
    return this.applyFilters(allRecords, filters)
  }

  /**
   * Filtra registros conforme parâmetros da tela
   */
  applyFilters(
    records: ReportSendingRecord[],
    filters: ReportSendingsFilter,
  ): ReportSendingRecord[] {
    return records.filter((rec) => {
      // 1. Canal (E-mail / Hub / Todos)
      if (filters.channel && filters.channel !== 'TODOS') {
        if (rec.channel !== filters.channel) return false
      }

      // 2. Tela de origem (Gestão de MP / Análise de Carteira / Sequenciamento P x R / Todas)
      if (filters.screenKey && filters.screenKey !== 'TODAS') {
        const normFilter = normalizeScreenKey(filters.screenKey)
        const normRec = normalizeScreenKey(rec.screen_key)
        if (normFilter !== normRec) return false
      }

      // 3. Status (Sucesso / Falha / Todos)
      if (filters.status && filters.status !== 'TODOS') {
        if (filters.status === 'SUCESSO' && rec.status !== 'SUCESSO') return false
        if (filters.status === 'FALHA' && rec.status !== 'FALHA') return false
      }

      // 4. Busca textual (destinatário, assunto, usuário, código)
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim()
        const matchesSubject = rec.subject.toLowerCase().includes(q)
        const matchesRecipients = rec.recipients_text.toLowerCase().includes(q)
        const matchesSender =
          rec.sender_user_name.toLowerCase().includes(q) ||
          rec.sender_user_email.toLowerCase().includes(q)
        const matchesCode = rec.sending_code.toLowerCase().includes(q)
        const matchesBody = rec.body_content.toLowerCase().includes(q)

        if (
          !matchesSubject &&
          !matchesRecipients &&
          !matchesSender &&
          !matchesCode &&
          !matchesBody
        ) {
          return false
        }
      }

      // 5. Período: De
      if (filters.dateFrom) {
        const fromDate = new Date(`${filters.dateFrom}T00:00:00`)
        const recDate = new Date(rec.sent_at)
        if (recDate < fromDate) return false
      }

      // 6. Período: Até
      if (filters.dateTo) {
        const toDate = new Date(`${filters.dateTo}T23:59:59.999`)
        const recDate = new Date(rec.sent_at)
        if (recDate > toDate) return false
      }

      return true
    })
  }

  /**
   * Calcula resumo/kpis dos envios para cards informativos
   */
  calculateKpis(records: ReportSendingRecord[]) {
    const total = records.length
    const emails = records.filter((r) => r.channel === 'EMAIL').length
    const hub = records.filter((r) => r.channel === 'HUB').length
    const success = records.filter((r) => r.status === 'SUCESSO').length
    const failed = records.filter((r) => r.status === 'FALHA').length

    return {
      total,
      emails,
      hub,
      success,
      failed,
      successRatePct: total > 0 ? Math.round((success / total) * 100) : 100,
    }
  }
}

export const industrializerReportSendingsService = new IndustrializerReportSendingsService()
export default industrializerReportSendingsService
