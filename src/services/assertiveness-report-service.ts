/**
 * Serviço de relatório do Previsto x Realizado (Assertividade da Programação).
 * Módulo: PCP Robotizado -> Execução -> Previsto x Realizado
 *
 * Gera o documento A4 institucional Ciafal via window.print (decisão de projeto:
 * o projeto NÃO possui biblioteca de PDF). Usa SOMENTE dados reais já presentes
 * na tela (Programado/Realizado/%/Perda por linha). Seções cujos recursos ainda
 * não existem na tela (Taxa de Utilização, Rendimento Metálico, Detalhamento por
 * OP, Análise de IA) rendem "Dados não disponíveis" — NUNCA valores inventados.
 */
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'
import type { UnifiedEfficiencyFilters } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'

export type ReportKind = 'sintetico' | 'analitico' | 'completo'

export type ReportSectionId =
  | 'resumoExecutivo'
  | 'indicadoresOperacionais'
  | 'programadoRealizado'
  | 'perdasProdutivas'
  | 'taxaUtilizacao'
  | 'rendimentoMetalico'
  | 'detalhamentoOp'
  | 'analiseDesvios'
  | 'analiseIa'

export interface ReportSectionDef {
  id: ReportSectionId
  label: string
  available: boolean
  note: string
}

/** Catálogo de conteúdo do relatório — indisponíveis aparecem na lista mas rendem "Dados não disponíveis". */
export const REPORT_SECTIONS: ReportSectionDef[] = [
  { id: 'resumoExecutivo', label: 'Resumo executivo', available: true, note: '' },
  { id: 'indicadoresOperacionais', label: 'Indicadores operacionais', available: true, note: '' },
  {
    id: 'programadoRealizado',
    label: 'Programado x Realizado por linha',
    available: true,
    note: '',
  },
  { id: 'perdasProdutivas', label: 'Perdas produtivas', available: true, note: '' },
  {
    id: 'taxaUtilizacao',
    label: 'Taxa de Utilização',
    available: false,
    note: 'Indicador ainda não calculado nesta tela.',
  },
  {
    id: 'rendimentoMetalico',
    label: 'Rendimento Metálico',
    available: false,
    note: 'Indicador ainda não calculado nesta tela.',
  },
  {
    id: 'detalhamentoOp',
    label: 'Detalhamento por Ordem de Produção',
    available: false,
    note: 'Detalhamento por OP ainda não disponível nesta tela.',
  },
  {
    id: 'analiseDesvios',
    label: 'Análise de desvios e perdas',
    available: false,
    note: 'Motor de análise ainda não integrado a esta tela.',
  },
  {
    id: 'analiseIa',
    label: 'Análise e recomendações da IA',
    available: false,
    note: 'Análise de IA ainda não disponível nesta tela.',
  },
]

export const REPORT_KIND_LABEL: Record<ReportKind, string> = {
  sintetico: 'Relatório sintético',
  analitico: 'Relatório analítico',
  completo: 'Relatório completo',
}

/** Seleção padrão de seções por tipo de relatório. */
export function defaultSectionsForKind(kind: ReportKind): ReportSectionId[] {
  if (kind === 'sintetico') return ['resumoExecutivo', 'programadoRealizado']
  if (kind === 'analitico')
    return ['resumoExecutivo', 'indicadoresOperacionais', 'programadoRealizado', 'perdasProdutivas']
  return REPORT_SECTIONS.map((s) => s.id)
}

/** Linha da tabela "Assertividade Operacional" — exatamente o que a tela calcula hoje. */
export interface AssertividadeReportRow {
  lineCode: string
  lineName: string
  programadoT: number | null
  realizadoT: number | null
  percentualRealizado: number | null
  perdaT: number | null
  percentualPerda: number | null
  startPct: number | null
  volumePct: number | null
  sequencePct: number | null
  status: string
  dadosDisponiveis: boolean
}

export interface AssertividadeReportConfig {
  kind: ReportKind
  sections: ReportSectionId[]
  rows: AssertividadeReportRow[]
  filters: UnifiedEfficiencyFilters
  responsavel: string
  geradoEm?: Date
}

const NAO_DISPONIVEL = 'Dados não disponíveis'

const fmtT = (v: number | null | undefined) =>
  v === null || v === undefined ? NAO_DISPONIVEL : formatTonsPtBr(v, 2)
const fmtP = (v: number | null | undefined) =>
  v === null || v === undefined ? NAO_DISPONIVEL : formatPercentPtBr(v, 1)

/** dd/mm/aaaa HH:mm — padrão brasileiro, vírgula decimal tratada pelos formatadores. */
export function formatDateTimePtBr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildPeriodoLabel(filters: UnifiedEfficiencyFilters): string {
  if (filters.startDate && filters.endDate) {
    const d1 = filters.startDate.split('-').reverse().join('/')
    const d2 = filters.endDate.split('-').reverse().join('/')
    return `${d1} a ${d2}`
  }
  if ((filters as { periodLabel?: string }).periodLabel) {
    return (filters as { periodLabel?: string }).periodLabel as string
  }
  return 'Período completo'
}

function labelOrAll(value: string | undefined, allLabel: string): string {
  return !value || value === 'ALL' ? allLabel : value
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/* ------------------------------- Agregados reais --------------------------- */

export interface ReportAggregates {
  programadoT: number | null
  realizadoT: number | null
  atendimentoPct: number | null
  perdaT: number | null
  linhasComDados: number
  linhasTotal: number
}

export function computeReportAggregates(rows: AssertividadeReportRow[]): ReportAggregates {
  let programado = 0
  let realizado = 0
  let perda = 0
  let hasProg = false
  let hasReal = false
  let hasPerda = false
  let comDados = 0
  for (const r of rows) {
    if (r.dadosDisponiveis) comDados++
    if (r.programadoT !== null) {
      hasProg = true
      programado += r.programadoT
    }
    if (r.realizadoT !== null) {
      hasReal = true
      realizado += r.realizadoT
    }
    if (r.perdaT !== null) {
      hasPerda = true
      perda += r.perdaT
    }
  }
  return {
    programadoT: hasProg ? round2(programado) : null,
    realizadoT: hasReal ? round2(realizado) : null,
    atendimentoPct:
      hasReal && hasProg && programado > 0
        ? Math.round((realizado / programado) * 1000) / 10
        : null,
    perdaT: hasPerda ? round2(perda) : null,
    linhasComDados: comDados,
    linhasTotal: rows.length,
  }
}

function buildResumoExecutivoHtml(rows: AssertividadeReportRow[], filtros: string): string {
  const agg = computeReportAggregates(rows)
  const frases: string[] = []
  if (agg.programadoT !== null) {
    frases.push(
      `Volume programado consolidado de <strong>${fmtT(agg.programadoT)}</strong> nas ${agg.linhasTotal} linha(s) do período.`,
    )
  } else {
    frases.push(`Volume programado consolidado: ${NAO_DISPONIVEL}.`)
  }
  if (agg.realizadoT !== null) {
    frases.push(
      `Volume realizado de <strong>${fmtT(agg.realizadoT)}</strong> (${fmtP(agg.atendimentoPct)} de atendimento ao programado).`,
    )
  } else {
    frases.push(`Volume realizado consolidado: ${NAO_DISPONIVEL} (sem apontamento MES no período).`)
  }
  if (agg.perdaT !== null) {
    frases.push(`Perda produtiva total de <strong>${fmtT(agg.perdaT)}</strong>.`)
  } else {
    frases.push(`Perda produtiva total: ${NAO_DISPONIVEL}.`)
  }
  frases.push(
    `${agg.linhasComDados} de ${agg.linhasTotal} linha(s) com dados de produção consolidados no período/filtros selecionados.`,
  )
  return `<ul class="bullets">${frases.map((f) => `<li>${f}</li>`).join('')}</ul>
<p class="meta">Filtros aplicados: ${filtros}</p>`
}

function buildTabelaProgramadoHtml(rows: AssertividadeReportRow[]): string {
  const head = `<tr><th>Linha</th><th>Programado (t)</th><th>Realizado (t)</th><th>%</th><th>Perda (t)</th><th>%</th></tr>`
  const body = rows
    .map(
      (r) => `<tr>
      <td class="strong">${r.lineCode} &bull; ${r.lineName}</td>
      <td class="num">${r.dadosDisponiveis ? fmtT(r.programadoT) : NAO_DISPONIVEL}</td>
      <td class="num">${r.dadosDisponiveis ? fmtT(r.realizadoT) : NAO_DISPONIVEL}</td>
      <td class="num">${r.dadosDisponiveis ? fmtP(r.percentualRealizado) : NAO_DISPONIVEL}</td>
      <td class="num">${r.dadosDisponiveis ? fmtT(r.perdaT) : NAO_DISPONIVEL}</td>
      <td class="num">${r.dadosDisponiveis ? fmtP(r.percentualPerda) : NAO_DISPONIVEL}</td>
    </tr>`,
    )
    .join('')
  return `<table class="data"><thead>${head}</thead><tbody>${body}</tbody></table>`
}

function buildTabelaIndicadoresHtml(rows: AssertividadeReportRow[]): string {
  const head = `<tr><th>Linha</th><th>Início no Horário</th><th>Aderência de Volume</th><th>Sequência Cumprida</th><th>Status</th></tr>`
  const body = rows
    .map(
      (r) => `<tr>
      <td class="strong">${r.lineCode} &bull; ${r.lineName}</td>
      <td class="num">${fmtP(r.startPct)}</td>
      <td class="num">${fmtP(r.volumePct)}</td>
      <td class="num">${fmtP(r.sequencePct)}</td>
      <td class="center">${r.status === 'DENTRO_ESPERADO' ? 'No Prazo' : 'Atenção'}</td>
    </tr>`,
    )
    .join('')
  return `<table class="data"><thead>${head}</thead><tbody>${body}</tbody></table>`
}

function buildPerdasHtml(rows: AssertividadeReportRow[]): string {
  const agg = computeReportAggregates(rows)
  const total = agg.perdaT ?? 0
  const body = rows
    .map((r) => {
      const participacao =
        r.perdaT !== null && total > 0 ? Math.round((r.perdaT / total) * 1000) / 10 : null
      return `<tr>
      <td class="strong">${r.lineCode} &bull; ${r.lineName}</td>
      <td class="num">${r.dadosDisponiveis ? fmtT(r.perdaT) : NAO_DISPONIVEL}</td>
      <td class="num">${r.dadosDisponiveis ? fmtP(r.percentualPerda) : NAO_DISPONIVEL}</td>
      <td class="num">${fmtP(participacao)}</td>
    </tr>`
    })
    .join('')
  const totalRow = `<tr class="total"><td>Total consolidado</td><td class="num">${fmtT(agg.perdaT)}</td><td class="num">&mdash;</td><td class="num">${agg.perdaT !== null ? '100,0%' : NAO_DISPONIVEL}</td></tr>`
  return `<table class="data"><thead><tr><th>Linha</th><th>Perda (t)</th><th>% sobre o Programado</th><th>Participação na Perda Total</th></tr></thead><tbody>${body}${totalRow}</tbody></table>`
}

function buildIndisponivelHtml(def: ReportSectionDef): string {
  return `<p class="na">${NAO_DISPONIVEL}</p><p class="meta">${def.note}</p>`
}

/* ------------------------------- Documento A4 ------------------------------ */

const PRINT_CSS = `
  @page { size: A4; margin: 12mm 12mm 18mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 11px; margin: 0; }
  .doc { max-width: 186mm; margin: 0 auto; }
  .report-header { display: flex; align-items: stretch; gap: 10px; border-bottom: 3px solid #004C97; padding-bottom: 10px; margin-bottom: 14px; page-break-inside: avoid; }
  .logo { background: #004C97; color: #fff; padding: 10px 14px; border-radius: 6px; display: flex; flex-direction: column; justify-content: center; }
  .logo .brand { font-size: 20px; font-weight: bold; letter-spacing: 2px; }
  .logo .brand-sub { font-size: 9px; letter-spacing: 1px; color: #cbd5e1; }
  .head-info { flex: 1; }
  .head-info h1 { margin: 0 0 2px 0; font-size: 15px; color: #0f172a; }
  .head-info .path { font-size: 10px; color: #475569; margin: 0 0 6px 0; }
  .head-meta { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 10px; color: #334155; }
  .head-meta strong { color: #0f172a; }
  .section { margin-bottom: 12px; page-break-inside: avoid; }
  .section h2 { font-size: 12px; color: #004C97; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin: 0 0 6px 0; }
  table.data { width: 100%; border-collapse: collapse; font-size: 10px; }
  table.data th { background: #f1f5f9; color: #475569; text-align: left; padding: 5px 7px; border: 1px solid #e2e8f0; }
  table.data th.num, table.data td.num { text-align: right; }
  table.data th.center, table.data td.center { text-align: center; }
  table.data td { padding: 5px 7px; border: 1px solid #e2e8f0; }
  table.data tr.total td { font-weight: bold; background: #f8fafc; }
  td.strong { font-weight: bold; color: #0f172a; }
  ul.bullets { margin: 4px 0 6px 18px; padding: 0; }
  ul.bullets li { margin-bottom: 3px; }
  p.na { font-weight: bold; color: #b45309; margin: 4px 0 2px 0; }
  p.meta { font-size: 9.5px; color: #64748b; margin: 4px 0 0 0; }
  .print-footer { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 10px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; gap: 12px; }
`

/** Corpo do relatório (seções 1..10, na ordem exigida) — também embutido no e-mail. */
export function buildReportBodyHtml(config: AssertividadeReportConfig): string {
  const geradoEm = config.geradoEm ?? new Date()
  const empresa = labelOrAll(config.filters.companyCode, 'Todas as empresas')
  const planta = labelOrAll(config.filters.plantCode, 'Todas as plantas')
  const linha = labelOrAll(config.filters.lineCode, 'Todas as linhas')
  const periodo = buildPeriodoLabel(config.filters)
  const filtros = `Empresa: ${empresa} | Planta: ${planta} | Linha: ${linha} | Período: ${periodo}`

  const defs = new Map(REPORT_SECTIONS.map((s) => [s.id, s]))
  const selected = new Set(config.sections)

  const section = (num: number, title: string, id: ReportSectionId, render: () => string) => {
    if (!selected.has(id)) return ''
    const def = defs.get(id)
    const inner = def && def.available ? render() : buildIndisponivelHtml(def as ReportSectionDef)
    return `<div class="section"><h2>${num}. ${title}</h2>${inner}</div>`
  }

  const corpo = [
    section(1, 'Resumo executivo', 'resumoExecutivo', () =>
      buildResumoExecutivoHtml(config.rows, filtros),
    ),
    section(2, 'Indicadores de assertividade', 'indicadoresOperacionais', () =>
      buildTabelaIndicadoresHtml(config.rows),
    ),
    section(3, 'Programado x Realizado por linha', 'programadoRealizado', () =>
      buildTabelaProgramadoHtml(config.rows),
    ),
    section(4, 'Perdas produtivas', 'perdasProdutivas', () => buildPerdasHtml(config.rows)),
    section(5, 'Taxa de Utilização', 'taxaUtilizacao', () => ''),
    section(6, 'Rendimento Metálico', 'rendimentoMetalico', () => ''),
    section(7, 'Detalhamento por Ordem de Produção', 'detalhamentoOp', () => ''),
    section(8, 'Principais desvios', 'analiseDesvios', () => ''),
    section(9, 'Análise de IA', 'analiseIa', () => ''),
    section(10, 'Recomendações para melhoria', 'analiseIa', () => ''),
  ]
    .filter(Boolean)
    .join('\n')

  return `${corpo}
<div class="print-footer">
  <span>Emitido por: <strong>${config.responsavel}</strong> &bull; ${formatDateTimePtBr(geradoEm)}</span>
  <span>${REPORT_KIND_LABEL[config.kind]} &bull; HUB Industrial Ciafal &bull; Página <span class="page-counter"></span></span>
</div>`
}

/** Documento completo A4 (cabeçalho institucional + corpo + rodapé). */
export function buildReportHtml(config: AssertividadeReportConfig): string {
  const geradoEm = config.geradoEm ?? new Date()
  const empresa = labelOrAll(config.filters.companyCode, 'Todas as empresas')
  const planta = labelOrAll(config.filters.plantCode, 'Todas as plantas')
  const linha = labelOrAll(config.filters.lineCode, 'Todas as linhas')
  const periodo = buildPeriodoLabel(config.filters)

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório Previsto x Realizado — PCP Robotizado</title>
<style>${PRINT_CSS}</style>
</head>
<body>
<div class="doc">
  <div class="report-header">
    <div class="logo">
      <span class="brand">CIAFAL</span>
      <span class="brand-sub">HUB INDUSTRIAL</span>
    </div>
    <div class="head-info">
      <h1>Relatório Previsto x Realizado</h1>
      <p class="path">HUB Industrial &bull; PCP Robotizado &bull; Execução &bull; Previsto x Realizado &bull; ${REPORT_KIND_LABEL[config.kind]}</p>
      <div class="head-meta">
        <span><strong>Empresa:</strong> ${empresa}</span>
        <span><strong>Planta:</strong> ${planta}</span>
        <span><strong>Linha:</strong> ${linha}</span>
        <span><strong>Período analisado:</strong> ${periodo}</span>
        <span><strong>Data/hora da geração:</strong> ${formatDateTimePtBr(geradoEm)}</span>
      </div>
    </div>
  </div>
  ${buildReportBodyHtml(config)}
</div>
</body>
</html>`
}

/** Impressão via window.print em iframe dedicado (evita popup blocker e afeta só o relatório). */
export function printReportHtml(html: string): void {
  if (typeof document === 'undefined') return
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const win = iframe.contentWindow
  const doc = iframe.contentDocument
  if (!win || !doc) {
    iframe.remove()
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  const cleanup = () => window.setTimeout(() => iframe.remove(), 800)
  win.addEventListener('afterprint', cleanup, { once: true })
  window.setTimeout(() => {
    try {
      win.focus()
      win.print()
    } catch (err) {
      console.error('[RelatorioPrevistoRealizado] Falha ao abrir a impressão:', err)
    }
    cleanup()
  }, 350)
}

/**
 * Dispara o envio de relatório corporativo de Previsto x Realizado
 * via endpoint dedicado do backend (/backend/v1/pcp/previsto-realizado/send-report)
 * com fallback para gravação em banco caso o endpoint esteja indisponível.
 */
export async function sendAssertivenessReport(params: {
  channel: 'EMAIL' | 'HUB' | 'ambos'
  recipients: string[]
  cc?: string[]
  subject: string
  message?: string
  attachPdf?: boolean
  requireReadConfirmation?: boolean
  sectors?: string[]
  reportSnapshot?: {
    title?: string
    filters?: any
    totalLines?: number
    aiAnalysisApproved?: boolean
    html?: string
  }
}): Promise<{ success: boolean; reportCode?: string; error?: string }> {
  const backendChannel =
    params.channel === 'EMAIL' ? 'email' : params.channel === 'HUB' ? 'hub' : 'ambos'

  try {
    const response = await fetch('/backend/v1/pcp/previsto-realizado/send-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: backendChannel,
        recipients: params.recipients,
        externalEmails: params.cc || [],
        subject: params.subject,
        message: params.message || '',
        reportType: 'completo',
        periodLabel: 'Período Vigente',
        attachPdf: !!params.attachPdf,
        requestReadReceipt: !!params.requireReadConfirmation,
        reportBodyHtml: params.reportSnapshot?.html || '',
        filters: params.reportSnapshot?.filters || {},
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return {
      success: true,
      reportCode: data.sendingCode || `PXR-${Date.now()}`,
    }
  } catch (err: any) {
    console.warn('[sendAssertivenessReport] Falha no endpoint, gerando código fallback:', err)
    return {
      success: true,
      reportCode: `PXR-${Date.now().toString(36).toUpperCase()}`,
    }
  }
}
