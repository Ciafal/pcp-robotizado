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
import { SummaryTableRenderer } from './SummaryTableRenderer'

interface SummaryPdfModalProps {
  isOpen: boolean
  onClose: () => void
  summary: PCPMonthlySummaryRecord
  isExecutiveMode?: boolean
}

const ND = 'Dado não disponível'

const PRINT_CSS = `
@page { size: A4 portrait; margin: 13mm; }
@media print {
  body * { visibility: hidden !important; }
  .ciafal-print-root, .ciafal-print-root * { visibility: visible !important; }
  .ciafal-print-root {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    background: #ffffff !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .ciafal-sheet {
    width: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
    break-after: page;
    page-break-after: always;
  }
  .ciafal-sheet:last-child { break-after: auto; page-break-after: auto; }
  .ciafal-avoid-break { break-inside: avoid; page-break-inside: avoid; }
  .ciafal-keep-title { break-after: avoid; page-break-after: avoid; }
  .ciafal-screen-only { display: none !important; }
}
@media screen {
  .ciafal-print-root { display: block; }
}
`

type PdfBlock = {
  key: string
  weight: number
  avoidBreak: boolean
  node: React.ReactNode
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="ciafal-keep-title text-[12pt] font-black uppercase text-[#004C97] border-b border-[#004C97]/30 pb-1 mb-2">
    {children}
  </h3>
)

const KpiBox: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({
  label,
  value,
  tone = 'text-slate-900',
}) => (
  <div className="ciafal-avoid-break border border-slate-300 rounded-sm p-2 bg-slate-50">
    <span className="block text-[8.5pt] uppercase font-semibold text-slate-500 leading-tight">
      {label}
    </span>
    <span className={`block font-bold font-mono text-[10.5pt] ${tone}`}>{value}</span>
  </div>
)

function chunkBlocks(blocks: PdfBlock[], capacity: number): PdfBlock[][] {
  const pages: PdfBlock[][] = []
  let current: PdfBlock[] = []
  let used = 0
  blocks.forEach((b) => {
    const w = Math.min(b.weight, capacity)
    if (current.length > 0 && used + w > capacity) {
      pages.push(current)
      current = []
      used = 0
    }
    current.push(b)
    used += w
  })
  if (current.length > 0) pages.push(current)
  return pages
}

export const SummaryPdfModal: React.FC<SummaryPdfModalProps> = ({
  isOpen,
  onClose,
  summary,
  isExecutiveMode = false,
}) => {
  const sec = summary.sections_data || {}
  const emitidoEm = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const handlePrint = () => {
    window.print()
  }

  const collectTables = (): { title: string; table: any }[] => {
    const allTables: { title: string; table: any }[] = []
    const snapshot = summary.template_snapshot
    if (snapshot?.sections_config && Array.isArray(snapshot.sections_config)) {
      snapshot.sections_config.forEach((s: any) => {
        if (Array.isArray(s.custom_tables)) {
          s.custom_tables.forEach((t: any) =>
            allTables.push({ title: s.title || `Seção ${s.order || s.number || ''}`, table: t }),
          )
        }
        if (Array.isArray(s.components)) {
          s.components.forEach((c: any) => {
            if (c.type === 'TABLE' && c.tableConfig) {
              allTables.push({
                title: s.title || `Seção ${s.order || s.number || ''}`,
                table: c.tableConfig,
              })
            }
          })
        }
      })
    }
    if (summary.sections_data) {
      Object.entries(summary.sections_data).forEach(([key, val]: [string, any]) => {
        if (val?.custom_tables && Array.isArray(val.custom_tables)) {
          val.custom_tables.forEach((t: any) => {
            if (!allTables.some((item) => item.table.id === t.id)) {
              allTables.push({ title: val.title || key, table: t })
            }
          })
        }
      })
    }
    return allTables
  }

  const blocks: PdfBlock[] = []

  blocks.push({
    key: 'identificacao',
    weight: 6,
    avoidBreak: true,
    node: (
      <div>
        <div className="border-b-2 border-[#004C97] pb-3 flex items-end justify-between">
          <div>
            <div className="text-[17pt] font-black tracking-tight text-[#004C97] uppercase leading-tight">
              CIAFAL &bull; PCP ROBOTIZADO
            </div>
            <div className="text-[13pt] font-bold text-slate-800 uppercase tracking-wide">
              RESUMO MENSAL DE ENTREGAS PCP
            </div>
            <div className="text-[9pt] text-slate-500 font-mono mt-0.5">
              Divinópolis &bull; Contagem &bull; Filial Sidercentro
            </div>
          </div>
          <div className="text-right text-[9pt] text-slate-600 space-y-0.5">
            <div>
              Período: <strong>{summary.mes_ano}</strong>
            </div>
            <div>
              Empresa: <strong>{summary.empresa_code || ND}</strong>
            </div>
            <div>
              Linha: <strong>{summary.linha_nome || summary.linha_code}</strong>
            </div>
            <div>
              Centro: <strong>{summary.centro_code || ND}</strong>
            </div>
            <div>
              Versão: <strong>{summary.version_tag}</strong>
            </div>
            <div>Emissão: {emitidoEm}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <KpiBox label="Responsável PCP" value={summary.responsavel_pcp_nome || ND} />
          <KpiBox label="Status do Resumo" value={summary.status} tone="text-[#004C97]" />
          <KpiBox label="Entrega" value={summary.data_entrega || ND} />
        </div>
      </div>
    ),
  })

  blocks.push({
    key: 'sumario',
    weight: 4,
    avoidBreak: true,
    node: (
      <div>
        <SectionTitle>1. Resumo Executivo</SectionTitle>
        {sec.sumarioExecutivo?.bullets && sec.sumarioExecutivo.bullets.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1 text-[10pt] text-slate-700 leading-relaxed">
            {sec.sumarioExecutivo.bullets.map((b: string, idx: number) => (
              <li key={idx}>{b}</li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 italic text-[10pt]">{ND}</p>
        )}
      </div>
    ),
  })

  blocks.push({
    key: 'carteira',
    weight: 5,
    avoidBreak: true,
    node: (
      <div>
        <SectionTitle>2. Análise de Carteira e Atendimento (SAP ZSD28C)</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          <KpiBox
            label="Volume Total"
            value={sec.analiseCarteira?.totalTons?.formattedText || ND}
          />
          <KpiBox
            label="Ordens MTO"
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
        </div>
      </div>
    ),
  })

  blocks.push({
    key: 'mp',
    weight: 4,
    avoidBreak: true,
    node: (
      <div>
        <SectionTitle>3. Matéria-Prima e Saldo de Pátio</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <KpiBox
            label="Estoque Físico"
            value={sec.materiaPrima?.estoqueAtualTons?.formattedText || ND}
          />
          <KpiBox
            label="Necessidade Prevista"
            value={sec.materiaPrima?.necessidadeTotalTons?.formattedText || ND}
          />
          <KpiBox
            label="Risco Global MP"
            tone="text-emerald-700"
            value={sec.materiaPrima?.riscoRupturaNivel || ND}
          />
        </div>
      </div>
    ),
  })

  collectTables().forEach((item, idx) => {
    blocks.push({
      key: `tabela_${idx}`,
      weight: 8,
      avoidBreak: false,
      node: (
        <div>
          <SectionTitle>{item.title || `Tabela Parametrizada ${idx + 1}`}</SectionTitle>
          <SummaryTableRenderer table={item.table} />
        </div>
      ),
    })
  })

  if (!isExecutiveMode) {
    blocks.push({
      key: 'restricoes',
      weight: 4,
      avoidBreak: true,
      node: (
        <div>
          <SectionTitle>4. Restrições Industriais e Produtividade Realizada</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
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
          </div>
        </div>
      ),
    })

    blocks.push({
      key: 'pendencias',
      weight: 6 + Math.min(8, (sec.pendenciasPorArea?.tabela?.length || 0) / 2),
      avoidBreak: false,
      node: (
        <div>
          <SectionTitle>5. Pendências e Planos de Ação por Área</SectionTitle>
          {sec.pendenciasPorArea?.tabela && sec.pendenciasPorArea.tabela.length > 0 ? (
            <table className="w-full text-[9.5pt] border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="ciafal-avoid-break border border-slate-300 p-1.5 text-left">
                    Área
                  </th>
                  <th className="ciafal-avoid-break border border-slate-300 p-1.5 text-left">
                    Ação Acordada
                  </th>
                  <th className="ciafal-avoid-break border border-slate-300 p-1.5 text-left">
                    Responsável
                  </th>
                  <th className="ciafal-avoid-break border border-slate-300 p-1.5 text-left">
                    Prazo
                  </th>
                  <th className="ciafal-avoid-break border border-slate-300 p-1.5 text-left">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sec.pendenciasPorArea.tabela.map((p: any) => (
                  <tr key={p.id} className="ciafal-avoid-break">
                    <td className="border border-slate-300 p-1.5 font-bold text-slate-800">
                      {p.area}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-slate-700">{p.acao}</td>
                    <td className="border border-slate-300 p-1.5 text-slate-600">
                      {p.responsavel}
                    </td>
                    <td className="border border-slate-300 p-1.5 font-mono">{p.prazo}</td>
                    <td className="border border-slate-300 p-1.5 font-semibold text-slate-800">
                      {p.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-500 italic text-[10pt]">{ND}</p>
          )}
        </div>
      ),
    })
  }

  blocks.push({
    key: 'parecer',
    weight: 4,
    avoidBreak: true,
    node: (
      <div>
        <SectionTitle>Parecer Técnico e Aprovação PCP</SectionTitle>
        <p className="text-[10pt] text-slate-700 leading-relaxed italic bg-slate-50 p-2.5 rounded-sm border border-slate-300">
          {sec.conclusaoIA?.parecerGeral ? `"${sec.conclusaoIA.parecerGeral}"` : ND}
        </p>
      </div>
    ),
  })

  blocks.push({
    key: 'assinaturas',
    weight: 5,
    avoidBreak: true,
    node: (
      <div className="grid grid-cols-2 gap-10 pt-10 text-center">
        <div className="border-t border-slate-500 pt-1">
          <div className="font-bold text-[10pt] text-slate-900">
            {summary.responsavel_pcp_nome || ND}
          </div>
          <div className="text-[8.5pt] text-slate-500">Programador PCP / Homologador</div>
        </div>
        <div className="border-t border-slate-500 pt-1">
          <div className="font-bold text-[10pt] text-slate-900">Gerência Industrial CIAFAL</div>
          <div className="text-[8.5pt] text-slate-500">Validação Operacional &amp; SLA</div>
        </div>
      </div>
    ),
  })

  const pages = chunkBlocks(blocks, 12)
  const total = pages.length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <style>{PRINT_CSS}</style>
      <DialogContent className="w-[min(95vw,1000px)] max-w-[min(95vw,1000px)] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-200">
        <DialogHeader className="p-3.5 border-b border-slate-200 bg-white shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#004C97] text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">
                Visualização de Impressão:{' '}
                {isExecutiveMode ? 'PDF Executivo CIAFAL' : 'Relatório Completo CIAFAL'}
              </DialogTitle>
              <div className="text-[11px] text-slate-500">
                {summary.summary_code} &bull; {summary.linha_nome || summary.linha_code} &bull;{' '}
                {summary.version_tag} &bull; A4 (210×297&nbsp;mm) &bull; {total}{' '}
                {total === 1 ? 'página' : 'páginas'}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs gap-1.5 bg-white border-slate-300 text-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / Salvar PDF</span>
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-8">
          <div className="ciafal-print-root flex flex-col items-center gap-8">
            {pages.map((pageBlocks, pageIdx) => (
              <div
                key={`sheet_${pageIdx}`}
                className="ciafal-sheet w-[210mm] min-h-[297mm] bg-white shadow-lg border border-slate-300 px-[14mm] py-[13mm] flex flex-col"
              >
                <div className="flex-1 space-y-4">
                  {pageBlocks.map((b) => (
                    <div key={b.key} className={b.avoidBreak ? 'ciafal-avoid-break' : undefined}>
                      {b.node}
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-300 pt-1.5 mt-3 text-[8pt] text-slate-500 font-mono flex items-center justify-between">
                  <span>
                    CIAFAL PCP Robotizado &bull; Documento Autenticado &bull; Versão{' '}
                    {summary.version_tag} &bull; Emitido em {emitidoEm}
                  </span>
                  <span>
                    Página {pageIdx + 1} de {total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-slate-300"
          >
            Fechar
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar / Imprimir</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default SummaryPdfModal
