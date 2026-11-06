import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Download, FileText } from 'lucide-react'
import { PCPMonthlySummaryRecord } from '@/services/pcp-monthly-summaries'
import { SummaryPdfTable } from './SummaryPdfTable'

interface SummaryPdfModalProps {
  isOpen: boolean
  onClose: () => void
  summary: PCPMonthlySummaryRecord
  isExecutiveMode?: boolean
}

const ND = 'Dado não disponível'

/* Dimensões da folha A4 em px @96dpi (para a escala visual da prévia). */
const A4_W_PX = 794
const A4_H_PX = 1123

/* ------------------------------------------------------------------ */
/* CSS: layout de impressão PRÓPRIO, separado das regras responsivas   */
/* da tela. As MESMAS regras valem para a pré-visualização e para o    */
/* window.print(): a prévia usa apenas zoom VISUAL (transform nos      */
/* wrappers), que é zerado no @media print — nunca afeta o PDF salvo.  */
/* ------------------------------------------------------------------ */
const PRINT_CSS = `
@page { size: A4 portrait; margin: 14mm 13mm; }
@media print {
  html, body {
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    overflow: visible !important;
  }
  body * { visibility: hidden !important; }
  .ciafal-print-root, .ciafal-print-root * { visibility: visible !important; }
  .ciafal-print-root {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    display: block !important;
    width: auto !important;
    max-width: none !important;
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  /* Na prévia cada folha é uma folha branca com moldura; no papel a
     moldura/sombra/escala somem e o @page (margem 14/13 mm) manda. */
  .ciafal-sheet-wrap {
    width: auto !important;
    height: auto !important;
    margin: 0 !important;
    transform: none !important;
  }
  .ciafal-sheet {
    display: block !important;
    width: auto !important;
    min-height: 0 !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    outline: none !important;
    border: none !important;
    border-radius: 0 !important;
    background: #ffffff !important;
    transform: none !important;
    break-after: page;
    page-break-after: always;
  }
  .ciafal-sheet:last-child { break-after: auto; page-break-after: auto; }
  .ciafal-sheet-body {
    display: block !important;
    width: auto !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .ciafal-avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
  .ciafal-keep-title { break-after: avoid !important; page-break-after: avoid !important; }
  .ciafal-screen-only { display: none !important; }
  .ciafal-print-color { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  table { border-collapse: collapse !important; }
  tr, td, th { break-inside: avoid !important; page-break-inside: avoid !important; }
  thead { display: table-header-group; }
}
@media screen {
  .ciafal-print-root { display: block; }
}
`

/* ------------------------------------------------------------------ */
/* Paginação determinística: cada bloco tem peso em "linhas de         */
/* conteúdo" (~6 mm cada); a página comporta CAPACIDADE linhas.        */
/* Blocos indivisíveis (título+conteúdo, grade de cards, assinaturas)  */
/* quebram ANTES quando não couberem; tabelas grandes quebram POR      */
/* LINHA em fragmentos com cabeçalho repetido e numeração contínua.    */
/* A MESMA estrutura paginada é renderizada na prévia e impressa.      */
/* ------------------------------------------------------------------ */
const CAPACIDADE_LINHAS = 44 // ~269 mm úteis / ~6 mm por linha (9.5–10.5 pt)

type PdfBlock =
  | { kind: 'atomic'; key: string; weight: number; node: React.ReactNode }
  | { kind: 'table'; key: string; title: string; table: any; rowsPerPage: number }

interface TableFragment {
  key: string
  title: string
  table: any
  rows: any[]
  startIndex: number
  showTotalizer: boolean
  /** TODAS as linhas da tabela — o totalizador soma sobre a tabela inteira */
  totalSourceRows: any[]
}

interface Sheet {
  key: string
  atomicNodes: React.ReactNode[]
  tableFragments: TableFragment[]
}

/* ---------------------------- primitivas visuais --------------------------- */

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="ciafal-keep-title mb-1.5 border-b border-[#004C97]/30 pb-1 text-[12.5pt] font-black uppercase leading-tight text-[#004C97]">
    {children}
  </h3>
)

const KpiBox: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({
  label,
  value,
  tone = 'text-slate-900',
}) => (
  <div className="ciafal-avoid-break ciafal-print-color border border-slate-300 bg-slate-50 p-1.5">
    <span className="block break-words text-[8pt] font-semibold uppercase leading-tight text-slate-500">
      {label}
    </span>
    <span className={`block break-words font-mono text-[10pt] font-bold ${tone}`}>{value}</span>
  </div>
)

/** Grade própria do PDF para cards de indicadores — largura 100% imprimível. */
const KpiGrid: React.FC<{ children: React.ReactNode; cols: number }> = ({ children, cols }) => (
  <div
    className="ciafal-avoid-break grid gap-1.5"
    style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
  >
    {children}
  </div>
)

/* ------------------------------ coleta de tabelas -------------------------- */

function collectTables(summary: PCPMonthlySummaryRecord): { title: string; table: any }[] {
  const all: { title: string; table: any }[] = []
  const snapshot = summary.template_snapshot
  if (snapshot?.sections_config && Array.isArray(snapshot.sections_config)) {
    snapshot.sections_config.forEach((s: any) => {
      if (Array.isArray(s.custom_tables)) {
        s.custom_tables.forEach((t: any) =>
          all.push({ title: s.title || `Seção ${s.order || s.number || ''}`, table: t }),
        )
      }
      if (Array.isArray(s.components)) {
        s.components.forEach((c: any) => {
          if (c.type === 'TABLE' && c.tableConfig) {
            all.push({
              title: s.title || `Seção ${s.order || s.number || ''}`,
              table: c.tableConfig,
            })
          }
        })
      }
    })
  }
  const sec = (summary.sections_data || {}) as any
  Object.entries(sec).forEach(([key, val]: [string, any]) => {
    if (val?.custom_tables && Array.isArray(val.custom_tables)) {
      val.custom_tables.forEach((t: any) => {
        if (!all.some((item) => item.table?.id === t.id)) {
          all.push({ title: val.title || key, table: t })
        }
      })
    }
  })
  return all
}

/* --------------------------------- componente ------------------------------ */

export const SummaryPdfModal: React.FC<SummaryPdfModalProps> = ({
  isOpen,
  onClose,
  summary,
  isExecutiveMode = false,
}) => {
  const sec = (summary.sections_data || {}) as any
  const emitidoEm = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const pendencias = Array.isArray(sec.pendenciasPorArea?.tabela)
    ? sec.pendenciasPorArea.tabela
    : []
  const tabelas = React.useMemo(() => collectTables(summary), [summary])

  /* ------------------------- construção dos blocos ------------------------- */
  const blocks: PdfBlock[] = React.useMemo(() => {
    const b: PdfBlock[] = []

    // Cabeçalho institucional + identificação do período (atomic)
    b.push({
      kind: 'atomic',
      key: 'identificacao',
      weight: 10,
      node: (
        <div>
          <div className="flex items-end justify-between gap-4 border-b-2 border-[#004C97] pb-2">
            <div>
              <div className="text-[18pt] font-black uppercase leading-tight tracking-tight text-[#004C97]">
                CIAFAL &bull; PCP ROBOTIZADO
              </div>
              <div className="text-[13pt] font-bold uppercase tracking-wide text-slate-800">
                RESUMO MENSAL DE ENTREGAS PCP
              </div>
              <div className="mt-0.5 font-mono text-[8.5pt] text-slate-500">
                {isExecutiveMode ? 'PDF Executivo CIAFAL' : 'Relatório Completo CIAFAL'}
              </div>
            </div>
            <div className="shrink-0 space-y-0.5 text-right text-[9pt] leading-snug text-slate-600">
              <div>
                Período: <strong>{summary.mes_ano || ND}</strong>
              </div>
              <div>
                Empresa: <strong>{summary.empresa_code || ND}</strong>
              </div>
              <div>
                Linha: <strong>{summary.linha_nome || summary.linha_code || ND}</strong>
              </div>
              <div>
                Centro: <strong>{summary.centro_code || ND}</strong>
              </div>
              <div>
                Versão: <strong>{summary.version_tag || ND}</strong>
              </div>
              <div>Emissão: {emitidoEm}</div>
            </div>
          </div>
          <KpiGrid cols={3}>
            <KpiBox label="Responsável PCP" value={summary.responsavel_pcp_nome || ND} />
            <KpiBox label="Status do Resumo" value={summary.status} tone="text-[#004C97]" />
            <KpiBox label="Entrega" value={summary.data_entrega || ND} />
          </KpiGrid>
          {/* Vínculo de template (honesto: nunca inventa versão/nome) */}
          {(() => {
            const temTemplate = Boolean(
              summary.template_code || summary.template_version || summary.template_snapshot,
            )
            const tmplCode = summary.template_code || summary.template_snapshot?.code || null
            const tmplVer = summary.template_version || summary.template_snapshot?.version || null
            return (
              <div className="mt-2 text-[9pt] text-slate-600">
                Template:{' '}
                <strong>{tmplCode || 'Sem vínculo de template (anterior ao versionamento)'}</strong>
                {tmplVer ? <span className="font-mono"> ({tmplVer})</span> : null}
                {!temTemplate && (
                  <p className="mt-0.5 text-[8.5pt] italic text-slate-500">
                    Este resumo foi gerado antes do versionamento de templates — não possui tabelas
                    parametrizadas vinculadas.
                  </p>
                )}
              </div>
            )
          })()}
        </div>
      ),
    })

    // 1. Resumo Executivo
    const bullets = Array.isArray(sec.sumarioExecutivo?.bullets) ? sec.sumarioExecutivo.bullets : []
    b.push({
      kind: 'atomic',
      key: 'sumario',
      weight: 3 + Math.min(bullets.length, 10) * 1.4,
      node: (
        <div>
          <SectionTitle>1. Resumo Executivo</SectionTitle>
          {bullets.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-5 text-[10pt] leading-relaxed text-slate-700">
              {bullets.map((bl: string, idx: number) => (
                <li key={idx} className="ciafal-avoid-break">
                  {bl}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[10pt] italic text-slate-500">{ND}</p>
          )}
        </div>
      ),
    })

    // 2. Análise de Carteira e Atendimento (indicadores alinhados com unidade)
    b.push({
      kind: 'atomic',
      key: 'carteira',
      weight: 9,
      node: (
        <div>
          <SectionTitle>2. Análise de Carteira e Atendimento</SectionTitle>
          <KpiGrid cols={4}>
            <KpiBox
              label="Volume Total"
              value={sec.analiseCarteira?.totalTons?.formattedText || ND}
            />
            <KpiBox
              label="Carteira MTO"
              value={sec.analiseCarteira?.carteiraMTOTons?.formattedText || ND}
            />
            <KpiBox
              label="Cobertura Média"
              tone="text-emerald-700"
              value={
                sec.analiseCarteira?.coberturaDias !== undefined &&
                sec.analiseCarteira?.coberturaDias !== null
                  ? `${sec.analiseCarteira.coberturaDias} dias`
                  : ND
              }
            />
            <KpiBox
              label="Rupturas Identificadas"
              value={
                sec.analiseCarteira?.rupturasIdentificadas !== undefined &&
                sec.analiseCarteira?.rupturasIdentificadas !== null
                  ? `${sec.analiseCarteira.rupturasIdentificadas} itens`
                  : ND
              }
            />
          </KpiGrid>
        </div>
      ),
    })

    // 3. Matéria-Prima e Saldo de Pátio
    b.push({
      kind: 'atomic',
      key: 'mp',
      weight: 8,
      node: (
        <div>
          <SectionTitle>3. Matéria-Prima e Saldo de Pátio</SectionTitle>
          <KpiGrid cols={4}>
            <KpiBox
              label="Estoque Atual"
              value={sec.materiaPrima?.estoqueAtualTons?.formattedText || ND}
            />
            <KpiBox
              label="Necessidade Total"
              value={sec.materiaPrima?.necessidadeTotalTons?.formattedText || ND}
            />
            <KpiBox
              label="Saldo Projetado"
              value={sec.materiaPrima?.saldoProjetadoTons?.formattedText || ND}
            />
            <KpiBox
              label="Risco de Ruptura"
              tone="text-emerald-700"
              value={sec.materiaPrima?.riscoRupturaNivel || ND}
            />
          </KpiGrid>
        </div>
      ),
    })

    // 4. Restrições (apenas modo completo)
    if (!isExecutiveMode) {
      b.push({
        kind: 'atomic',
        key: 'restricoes',
        weight: 8,
        node: (
          <div>
            <SectionTitle>4. Restrições Industriais e Produtividade Realizada</SectionTitle>
            <KpiGrid cols={3}>
              <KpiBox
                label="Produtividade Média"
                value={sec.restricoesProblemas?.produtividadeRealizadaTph?.formattedText || ND}
              />
              <KpiBox
                label="Tempo Setup Médio"
                value={
                  sec.restricoesProblemas?.tempoSetupMedioMin !== undefined &&
                  sec.restricoesProblemas?.tempoSetupMedioMin !== null
                    ? `${sec.restricoesProblemas.tempoSetupMedioMin} min`
                    : ND
                }
              />
              <KpiBox
                label="Paradas Programadas"
                value={
                  sec.restricoesProblemas?.paradasProgramadasHoras !== undefined &&
                  sec.restricoesProblemas?.paradasProgramadasHoras !== null
                    ? `${sec.restricoesProblemas.paradasProgramadasHoras} h`
                    : ND
                }
              />
            </KpiGrid>
          </div>
        ),
      })
    }

    // Tabelas parametrizadas (quebram por linha, com cabeçalho repetido)
    tabelas.forEach((item, idx) => {
      b.push({
        kind: 'table',
        key: `tabela_${idx}`,
        title: item.title || `Tabela Parametrizada ${idx + 1}`,
        table: item.table,
        rowsPerPage: 8,
      })
    })

    // Pendências por Área (modo completo) — quebra por linha
    if (!isExecutiveMode && pendencias.length > 0) {
      b.push({
        kind: 'table',
        key: 'pendencias',
        title: 'Pendências e Planos de Ação por Área',
        table: {
          id: 'pdf_pendencias',
          columns: [
            { id: 'area', name: 'Área', order: 1, field_type: 'TEXTO' },
            { id: 'acao', name: 'Ação Acordada', order: 2, field_type: 'TEXTO' },
            { id: 'responsavel', name: 'Responsável', order: 3, field_type: 'TEXTO' },
            { id: 'prazo', name: 'Prazo', order: 4, field_type: 'DATA' },
            { id: 'status', name: 'Status', order: 5, field_type: 'TEXTO' },
          ],
          rows: pendencias,
          show_title: false,
        },
        rowsPerPage: 10,
      })
    }

    // Parecer Técnico e Aprovação PCP
    b.push({
      kind: 'atomic',
      key: 'parecer',
      weight: 6,
      node: (
        <div>
          <SectionTitle>Parecer Técnico e Aprovação PCP</SectionTitle>
          <p className="border border-slate-300 bg-slate-50 p-2.5 text-[10pt] italic leading-relaxed text-slate-700">
            {sec.conclusaoIA?.parecerGeral ? `"${sec.conclusaoIA.parecerGeral}"` : ND}
          </p>
        </div>
      ),
    })

    // Assinaturas — bloco INTEGRAL, nunca dividido entre páginas
    b.push({
      kind: 'atomic',
      key: 'assinaturas',
      weight: 9,
      node: (
        <div className="grid grid-cols-2 gap-10 pt-8 text-center">
          <div className="border-t border-slate-500 pt-1">
            <div className="text-[10pt] font-bold text-slate-900">
              {summary.responsavel_pcp_nome || ND}
            </div>
            <div className="text-[8.5pt] text-slate-500">Programador PCP / Homologador</div>
          </div>
          <div className="border-t border-slate-500 pt-1">
            <div className="text-[10pt] font-bold text-slate-900">Gerência Industrial CIAFAL</div>
            <div className="text-[8.5pt] text-slate-500">Validação Operacional &amp; SLA</div>
          </div>
        </div>
      ),
    })

    return b
  }, [summary, isExecutiveMode, emitidoEm, pendencias.length, tabelas])

  /* ----------------------- paginação determinística ----------------------- */
  const sheets: Sheet[] = React.useMemo(() => {
    const pages: Sheet[] = []
    const totalRowsByTable = new Map<string, number>()
    blocks.forEach((bl) => {
      if (bl.kind === 'table') {
        totalRowsByTable.set(bl.key, Array.isArray(bl.table?.rows) ? bl.table.rows.length : 0)
      }
    })

    // Passo 1: distribuir blocos por página (atomic inteiros; tabela em fragmentos)
    const pageLayout: Array<{ block: PdfBlock; from: number; to: number }[]> = []
    let current: { block: PdfBlock; from: number; to: number }[] = []
    let used = 0

    const pushPage = () => {
      if (current.length > 0) pageLayout.push(current)
      current = []
      used = 0
    }

    blocks.forEach((bl) => {
      if (bl.kind === 'atomic') {
        const w = Math.min(bl.weight, CAPACIDADE_LINHAS)
        if (used + w > CAPACIDADE_LINHAS && current.length > 0) pushPage()
        current.push({ block: bl, from: 0, to: 0 })
        used += w
      } else {
        const totalRows = totalRowsByTable.get(bl.key) || 0
        const headerWeight = 3
        if (used + headerWeight + 1 > CAPACIDADE_LINHAS && current.length > 0) pushPage()
        let from = 0
        let first = true
        while (from < totalRows) {
          const cap = Math.max(1, CAPACIDADE_LINHAS - (first ? used + headerWeight : headerWeight))
          const to = Math.min(from + Math.min(cap, bl.rowsPerPage), totalRows)
          current.push({ block: bl, from, to })
          if (to < totalRows) pushPage()
          from = to
          first = false
        }
        if (totalRows === 0) current.push({ block: bl, from: 0, to: 0 })
      }
    })
    pushPage()

    // Passo 2: montar os nós de cada folha
    pageLayout.forEach((layout) => {
      const atomicNodes: React.ReactNode[] = []
      const tableFragments: TableFragment[] = []
      layout.forEach((entry) => {
        if (entry.block.kind === 'atomic') {
          atomicNodes.push(
            <div key={entry.block.key} className="ciafal-avoid-break">
              {entry.block.node}
            </div>,
          )
        } else {
          const bl = entry.block
          const allRows = Array.isArray(bl.table?.rows) ? bl.table.rows : []
          tableFragments.push({
            key: `${bl.key}_${entry.from}`,
            title: bl.title,
            table: bl.table,
            rows: allRows.slice(entry.from, entry.to),
            startIndex: entry.from,
            showTotalizer: entry.to >= (totalRowsByTable.get(bl.key) || 0),
            totalSourceRows: allRows,
          })
        }
      })
      pages.push({ key: `sheet_${pages.length}`, atomicNodes, tableFragments })
    })

    if (pages.length === 0) {
      pages.push({ key: 'sheet_0', atomicNodes: [], tableFragments: [] })
    }
    return pages
  }, [blocks])

  const totalPaginas = sheets.length

  /* -------- escala VISUAL da prévia (responsivo; nunca afeta o print) ------ */
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const [escala, setEscala] = React.useState(1)

  React.useEffect(() => {
    if (!isOpen) return
    const el = viewportRef.current
    if (!el) return
    const calcular = () => {
      const largura = el.clientWidth - 48 // padding interno do container
      setEscala(Math.min(1, Math.max(0.32, largura / A4_W_PX)))
    }
    calcular()
    const ro = new ResizeObserver(calcular)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isOpen])

  const handlePrint = () => window.print()

  /* --------------------------------- render -------------------------------- */
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <style>{PRINT_CSS}</style>
      <DialogContent className="flex max-h-[95vh] w-[min(96vw,1100px)] max-w-[min(96vw,1100px)] flex-col overflow-hidden bg-slate-300 p-0">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <div className="rounded bg-[#004C97] p-1.5 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">
                Visualização de Impressão:{' '}
                {isExecutiveMode ? 'PDF Executivo CIAFAL' : 'Relatório Completo CIAFAL'}
              </DialogTitle>
              <div className="text-[11px] text-slate-500">
                {summary.summary_code} &bull; {summary.linha_nome || summary.linha_code} &bull;{' '}
                {summary.version_tag} &bull; A4 (210×297&nbsp;mm) &bull; {totalPaginas}{' '}
                {totalPaginas === 1 ? 'página' : 'páginas'}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 gap-1.5 border-slate-300 bg-white text-xs text-slate-700"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir / Salvar PDF</span>
          </Button>
        </DialogHeader>

        {/* Pré-visualização: TODAS as folhas A4 como folhas brancas independentes,
            com espaço visível entre elas. A escala é apenas VISUAL (transform nos
            wrappers) e é zerada no @media print — o PDF sai idêntico à prévia. */}
        <div ref={viewportRef} className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          <div className="ciafal-print-root mx-auto flex flex-col items-center gap-10">
            {sheets.map((sheet, idx) => (
              <div
                key={sheet.key}
                className="ciafal-sheet-wrap"
                style={{ width: A4_W_PX * escala, height: A4_H_PX * escala }}
              >
                <div
                  className="ciafal-sheet flex flex-col bg-white shadow-lg outline outline-1 outline-slate-300"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    padding: '14mm 13mm',
                    transform: `scale(${escala})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <div className="ciafal-sheet-body flex flex-col" style={{ width: '184mm' }}>
                    {sheet.atomicNodes.map((node, nIdx) => (
                      <div key={`at_${nIdx}`} className={nIdx === 0 ? '' : 'mt-4'}>
                        {node}
                      </div>
                    ))}
                    {sheet.tableFragments.map((frag, fIdx) => (
                      <div
                        key={frag.key}
                        className={`ciafal-avoid-break ${sheet.atomicNodes.length + fIdx > 0 ? 'mt-4' : ''}`}
                      >
                        <SectionTitle>{frag.title}</SectionTitle>
                        {frag.table?.show_title !== false &&
                          frag.table?.id !== 'pdf_pendencias' &&
                          (frag.table?.display_title || frag.table?.name) && (
                            <div className="mb-1 text-[9pt] font-bold uppercase text-slate-600">
                              {frag.table.display_title || frag.table.name}
                            </div>
                          )}
                        <SummaryPdfTable
                          table={frag.table}
                          rows={frag.rows}
                          startIndex={frag.startIndex}
                          showTotalizer={frag.showTotalizer}
                          totalSourceRows={frag.totalSourceRows}
                        />
                        {!frag.showTotalizer && frag.rows.length > 0 && (
                          <div className="mt-1 text-right text-[8pt] italic text-slate-400">
                            continua na próxima página
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Rodapé por página: autenticação + versão + emissão + Página X de Y */}
                  <div className="ciafal-avoid-break mt-auto flex items-center justify-between border-t border-slate-300 pt-1.5 font-mono text-[8pt] text-slate-500">
                    <span>
                      CIAFAL PCP Robotizado &bull; Documento Autenticado &bull; Versão{' '}
                      {summary.version_tag || '-'} &bull; Emitido em {emitidoEm}
                    </span>
                    <span>
                      Página {idx + 1} de {totalPaginas}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-slate-300 text-xs"
          >
            Fechar
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 bg-[#004C97] text-xs font-bold text-white hover:bg-[#003870]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar / Imprimir</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default SummaryPdfModal
