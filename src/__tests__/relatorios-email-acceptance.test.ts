import { describe, it, expect, vi, beforeEach } from 'vitest'
import pbNamed, { pb as pbDefault } from '@/lib/pocketbase/client'
import { officialNavGroups } from '@/components/layout/PCPNavigation'
import {
  industrializerReportSendingsService,
  formatDateTimePtBr,
  normalizeScreenKey,
  type ReportSendingRecord,
} from '@/services/industrializer-report-sendings-service'

describe('Critérios de Aceitação — Relatórios de E-mail (Histórico de Envios)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Critério 5: Export duplo estrito do pb em client.ts preservado intacto
  it('Critério 5: Preserva o export duplo estrito (named e default) em src/lib/pocketbase/client.ts', () => {
    expect(pbNamed).toBeDefined()
    expect(pbDefault).toBeDefined()
    expect(pbNamed).toBe(pbDefault)
    expect(typeof pbNamed.collection).toBe('function')
  })

  // Critério 1 & Menu: Tela registrada no menu lateral e rota acessível
  it('Critério 1: Menu oficial contém o item "5. Relatórios de E-mail" na Gestão Industrializador', () => {
    const group = officialNavGroups.find((g) => g.groupTitle === 'GESTÃO INDUSTRIALIZADOR')
    expect(group).toBeDefined()

    const item = group?.items.find(
      (i) => i.href === '/pcp/gestao-industrializador/relatorios-email',
    )
    expect(item).toBeDefined()
    expect(item?.title).toBe('5. Relatórios de E-mail')
    expect(item?.permission).toBe('pcp.view')
  })

  // Critério 1: Normalização e leitura do histórico de envios reais
  it('Critério 1: Serviço normaliza telas de origem e formata datas para padrão brasileiro', () => {
    expect(normalizeScreenKey('gestao_mp')).toBe('gestao_mp')
    expect(normalizeScreenKey('1. Gestão de MP')).toBe('gestao_mp')
    expect(normalizeScreenKey('analise_carteira')).toBe('analise_carteira')
    expect(normalizeScreenKey('sequenciamento_pxr')).toBe('sequenciamento_pxr')
    expect(normalizeScreenKey('P x R')).toBe('sequenciamento_pxr')

    const formatted = formatDateTimePtBr('2026-11-10T14:30:00.000Z')
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)
  })

  // Critério 2: Filtros funcionais (tela, canal/tipo, status, período e busca)
  it('Critério 2: Filtra histórico por tela de origem, canal, período e destinatário/assunto', () => {
    const sampleRecords: ReportSendingRecord[] = [
      {
        id: 'rec-1',
        sending_code: 'SEND-EMAIL-1',
        channel: 'EMAIL',
        screen_key: 'gestao_mp',
        screen_name: 'Gestão de MP',
        subject: 'Relatório Semanal de Matéria-Prima',
        body_content: 'Resumo dos estoques e trânsito',
        recipients: ['diretoria@ciafal.com.br', 'pcp@ciafal.com.br'],
        recipients_text: 'diretoria@ciafal.com.br, pcp@ciafal.com.br',
        status: 'SUCESSO',
        sender_user_name: 'Carlos PCP',
        sender_user_email: 'carlos@ciafal.com.br',
        sent_at: '2026-11-10T10:00:00.000Z',
        sent_at_formatted: '10/11/2026 10:00',
        source_collection: 'pcp_report_sendings',
      },
      {
        id: 'rec-2',
        sending_code: 'SEND-HUB-2',
        channel: 'HUB',
        screen_key: 'analise_carteira',
        screen_name: 'Análise de Carteira',
        subject: 'Comunicado de Aderência da Carteira',
        body_content: 'Pedidos críticos para L1 e L2',
        recipients: ['comercial@ciafal.com.br'],
        recipients_text: 'comercial@ciafal.com.br',
        status: 'SUCESSO',
        sender_user_name: 'Ana PCP',
        sender_user_email: 'ana@ciafal.com.br',
        sent_at: '2026-11-09T15:30:00.000Z',
        sent_at_formatted: '09/11/2026 15:30',
        source_collection: 'pcp_report_sendings',
      },
      {
        id: 'rec-3',
        sending_code: 'SEND-EMAIL-ERR-3',
        channel: 'EMAIL',
        screen_key: 'sequenciamento_pxr',
        screen_name: 'Sequenciamento P x R',
        subject: 'Alerta de Atraso no Sequenciamento',
        body_content: 'Falha na conexão do serviço corporativo',
        recipients: ['operacao@industrializador.com.br'],
        recipients_text: 'operacao@industrializador.com.br',
        status: 'FALHA',
        sender_user_name: 'Carlos PCP',
        sender_user_email: 'carlos@ciafal.com.br',
        sent_at: '2026-11-08T08:15:00.000Z',
        sent_at_formatted: '08/11/2026 08:15',
        source_collection: 'pcp_report_sendings',
      },
    ]

    // Filtro por Canal = EMAIL
    const emailOnly = industrializerReportSendingsService.applyFilters(sampleRecords, {
      channel: 'EMAIL',
    })
    expect(emailOnly.length).toBe(2)
    expect(emailOnly.every((r) => r.channel === 'EMAIL')).toBe(true)

    // Filtro por Canal = HUB
    const hubOnly = industrializerReportSendingsService.applyFilters(sampleRecords, {
      channel: 'HUB',
    })
    expect(hubOnly.length).toBe(1)
    expect(hubOnly[0].id).toBe('rec-2')

    // Filtro por Tela de Origem = gestao_mp
    const mpOnly = industrializerReportSendingsService.applyFilters(sampleRecords, {
      screenKey: 'gestao_mp',
    })
    expect(mpOnly.length).toBe(1)
    expect(mpOnly[0].screen_key).toBe('gestao_mp')

    // Filtro por Status = FALHA
    const failOnly = industrializerReportSendingsService.applyFilters(sampleRecords, {
      status: 'FALHA',
    })
    expect(failOnly.length).toBe(1)
    expect(failOnly[0].status).toBe('FALHA')

    // Filtro por Busca de Destinatário = comercial
    const searchDest = industrializerReportSendingsService.applyFilters(sampleRecords, {
      search: 'comercial',
    })
    expect(searchDest.length).toBe(1)
    expect(searchDest[0].recipients_text).toContain('comercial@ciafal.com.br')

    // Filtro por Período
    const dateFiltered = industrializerReportSendingsService.applyFilters(sampleRecords, {
      dateFrom: '2026-11-10',
      dateTo: '2026-11-10',
    })
    expect(dateFiltered.length).toBe(1)
    expect(dateFiltered[0].id).toBe('rec-1')
  })

  // Critério 3: Métricas/KPIs calculados corretamente
  it('Critério 3: Calcula KPIs com total, canal e taxa de sucesso', () => {
    const sampleRecords: ReportSendingRecord[] = [
      {
        id: '1',
        sending_code: 'A',
        channel: 'EMAIL',
        screen_key: 'gestao_mp',
        screen_name: 'Gestão de MP',
        subject: 'Subj A',
        body_content: 'Body A',
        recipients: ['a@a.com'],
        recipients_text: 'a@a.com',
        status: 'SUCESSO',
        sender_user_name: 'U1',
        sender_user_email: 'u1@a.com',
        sent_at: '2026-11-10T10:00:00Z',
        sent_at_formatted: '10/11/2026 10:00',
        source_collection: 'pcp_report_sendings',
      },
      {
        id: '2',
        sending_code: 'B',
        channel: 'HUB',
        screen_key: 'gestao_mp',
        screen_name: 'Gestão de MP',
        subject: 'Subj B',
        body_content: 'Body B',
        recipients: ['b@b.com'],
        recipients_text: 'b@b.com',
        status: 'FALHA',
        sender_user_name: 'U2',
        sender_user_email: 'u2@b.com',
        sent_at: '2026-11-10T11:00:00Z',
        sent_at_formatted: '10/11/2026 11:00',
        source_collection: 'pcp_report_sendings',
      },
    ]

    const kpis = industrializerReportSendingsService.calculateKpis(sampleRecords)
    expect(kpis.total).toBe(2)
    expect(kpis.emails).toBe(1)
    expect(kpis.hub).toBe(1)
    expect(kpis.success).toBe(1)
    expect(kpis.failed).toBe(1)
    expect(kpis.successRatePct).toBe(50)
  })

  // Critério 4: Tolerância a falhas e estado vazio amigável
  it('Critério 4: Retorna lista vazia sem quebrar em caso de ausência de registros ou exceções no backend', async () => {
    // Simula PocketBase retornando vazio ou erro 404 sem derrubar o serviço
    const mockCollection = vi.fn().mockReturnValue({
      getFullList: vi.fn().mockRejectedValue(new Error('Collection not found')),
    })
    const originalCollection = pbNamed.collection
    pbNamed.collection = mockCollection as any

    try {
      const records = await industrializerReportSendingsService.getSendings()
      expect(Array.isArray(records)).toBe(true)
      expect(records.length).toBe(0)
    } finally {
      pbNamed.collection = originalCollection
    }
  })
})
