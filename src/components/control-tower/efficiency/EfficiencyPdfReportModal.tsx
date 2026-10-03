import React from 'react'
import {
  Printer,
  X,
  FileText,
  Send,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'
import type { DrilldownOrderRecord } from './EfficiencyDrilldownModal'
import type { ConsolidatedAiAnalysis } from '@/services/efficiency-drilldown-ai-service'

export interface EfficiencyPdfReportModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenSendModal: () => void
  headerData: {
    title: string
    code: string
    breadcrumb: string[]
    companyName: string
    plantName: string
    lineName: string
    centerOrProduct?: string
    periodFiltered: string
    statusSelected: string
    generatedAt: string
    responsibleUser: string
  }
  orders: DrilldownOrderRecord[]
  aiAnalysis?: ConsolidatedAiAnalysis | null
}

export const EfficiencyPdfReportModal: React.FC<EfficiencyPdfReportModalProps> = ({
  isOpen,
  onClose,
  onOpenSendModal,
  headerData,
  orders,
  aiAnalysis,
}) => {
  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  // Totais do relatório para conferência contábil / operacional
  const totalPlanned = orders.reduce((acc, o) => acc + (o.plannedTons || 0), 0)
  const totalRealized = orders.reduce((acc, o) => acc + (o.realizedTons || 0), 0)
  const totalGood = orders.reduce((acc, o) => acc + (o.goodTons || 0), 0)
  const totalRework = orders.reduce((acc, o) => acc + (o.reworkTons || 0), 0)
  const totalLoss = orders.reduce((acc, o) => acc + (o.lossTons || 0), 0)
  const overallDiff = totalRealized - totalPlanned
  const overallAdherence =
    totalPlanned > 0 ? Number(((totalRealized / totalPlanned) * 100).toFixed(1)) : null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[94vw] h-[92vh] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-2xl">
        {/* Barra Superior de Ações (não sai na impressão) */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Visualização do Relatório PDF &bull; Detalhamento Operacional de Ordens
              </h3>
              <p className="text-[11px] text-slate-500 font-sans">
                {headerData.breadcrumb.join(' / ')} &bull; {orders.length} OPs no escopo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 text-slate-700 font-semibold gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Imprimir / Salvar PDF
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onOpenSendModal}
              className="text-xs h-8 bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar PDF por E-mail
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Documento PDF / Impressão */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white text-slate-900 font-sans">
          {/* Cabeçalho Oficial CIAFAL */}
          <div className="border-b-2 border-[#004C97] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-widest text-[#004C97] uppercase">
                  HUB INDUSTRIAL CIAFAL &bull; PCP ROBOTIZADO
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-[#004C97] font-mono font-bold border border-blue-200">
                  RELATÓRIO OFICIAL DE EFICIÊNCIA
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                Detalhamento Operacional de Ordens
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Rastreabilidade de apontamentos físicos, conformidade SAP e diagnóstico de
                eficiência
              </p>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5 font-mono">
              <div>
                <span className="text-slate-400">Data/Hora: </span>
                <strong className="text-slate-800">{headerData.generatedAt}</strong>
              </div>
              <div>
                <span className="text-slate-400">Responsável: </span>
                <strong className="text-slate-800">{headerData.responsibleUser}</strong>
              </div>
              <div>
                <span className="text-slate-400">Status filtro: </span>
                <span className="font-sans font-semibold text-slate-700">
                  {headerData.statusSelected}
                </span>
              </div>
            </div>
          </div>

          {/* Bloco de Contexto Operacional */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Empresa / Planta
              </span>
              <strong className="text-slate-900 font-mono">
                {headerData.companyName} &bull; {headerData.plantName}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Linha Produtiva
              </span>
              <strong className="text-slate-900 font-mono">{headerData.lineName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Centro / Produto
              </span>
              <strong className="text-slate-900 font-mono">
                {headerData.centerOrProduct || 'Consolidado da Linha'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Período Filtrado
              </span>
              <strong className="text-slate-900 font-mono">{headerData.periodFiltered}</strong>
            </div>
          </div>

          {/* Cards de Métricas Consolidadas do Relatório */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Total Previsto
              </span>
              <span className="text-base font-extrabold font-mono text-slate-900 block mt-1">
                {formatTonsPtBr(totalPlanned, 1)}
              </span>
              <span className="text-[10px] text-slate-500">{orders.length} ordens programadas</span>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Total Realizado
              </span>
              <span className="text-base font-extrabold font-mono text-slate-900 block mt-1">
                {totalRealized > 0 ? formatTonsPtBr(totalRealized, 1) : 'Sem apontamento'}
              </span>
              <span className="text-[10px] text-slate-500">Apontamentos MES 4.0</span>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Diferença / Aderência
              </span>
              <span
                className={`text-base font-extrabold font-mono block mt-1 ${
                  overallDiff >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {overallDiff > 0
                  ? `+${formatTonsPtBr(overallDiff, 1)}`
                  : formatTonsPtBr(overallDiff, 1)}
              </span>
              <span className="text-[10px] text-slate-500">
                {overallAdherence !== null
                  ? `Aderência: ${formatPercentPtBr(overallAdherence, 1)}`
                  : '—'}
              </span>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl bg-emerald-50/40 border-emerald-200">
              <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                Produção Boa
              </span>
              <span className="text-base font-extrabold font-mono text-emerald-900 block mt-1">
                {formatTonsPtBr(totalGood, 1)}
              </span>
              <span className="text-[10px] text-emerald-700">Aprovada sem restrição</span>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl bg-amber-50/40 border-amber-200">
              <span className="text-[10px] text-amber-800 uppercase font-bold block">
                Retrabalho / Perdas
              </span>
              <span className="text-base font-extrabold font-mono text-amber-900 block mt-1">
                {formatTonsPtBr(totalRework, 1)} / {formatTonsPtBr(totalLoss, 1)}
              </span>
              <span className="text-[10px] text-amber-700">Causas registradas</span>
            </div>
          </div>

          {/* Diagnóstico da Análise IA Consolidada (quando disponível) */}
          {aiAnalysis && (
            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30 text-xs space-y-3">
              <div className="flex items-center gap-2 text-[#004C97] font-bold uppercase tracking-wider text-[11px]">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Diagnóstico Gerencial de Eficiência com IA
              </div>

              <p className="text-slate-800 leading-relaxed font-medium">{aiAnalysis.resumo}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 block text-[11px]">
                    Principais Desvios Identificados:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                    {aiAnalysis.principaisDesvios.map((desvio, idx) => (
                      <li key={idx}>{desvio}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-800 block text-[11px]">
                    Recomendações e Próximas Verificações:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                    {aiAnalysis.proximasVerificacoes.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Tabela Oficial de Ordens de Produção */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#004C97]" />
              Detalhamento por Ordem de Produção ({orders.length} ordens)
            </h2>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-sans font-bold text-slate-700">
                  <tr>
                    <th className="py-2.5 px-2">OP</th>
                    <th className="py-2.5 px-2">Material</th>
                    <th className="py-2.5 px-2 min-w-[140px]">Descrição</th>
                    <th className="py-2.5 px-2 text-right">Previsto</th>
                    <th className="py-2.5 px-2 text-right">Realizado</th>
                    <th className="py-2.5 px-2 text-right">P x R</th>
                    <th className="py-2.5 px-2 text-right">RM (%)</th>
                    <th className="py-2.5 px-2 text-right text-emerald-800">Boa (t)</th>
                    <th className="py-2.5 px-2 text-right text-amber-800">Retr (t)</th>
                    <th className="py-2.5 px-2 text-right text-rose-800">Perd (t)</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                    <th className="py-2.5 px-2 font-sans min-w-[200px]">Resumo IA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-bold text-slate-900 whitespace-nowrap">
                        {ord.opNumber}
                      </td>
                      <td className="py-2 px-2 text-slate-700 whitespace-nowrap">
                        {ord.materialCode}
                      </td>
                      <td
                        className="py-2 px-2 font-sans text-slate-600 max-w-[150px] truncate"
                        title={ord.materialDescription}
                      >
                        {ord.materialDescription}
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap font-medium text-slate-800">
                        {formatTonsPtBr(ord.plannedTons, 1)}
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap font-bold text-slate-900">
                        {ord.realizedTons !== null
                          ? formatTonsPtBr(ord.realizedTons, 1)
                          : 'Sem apontamento'}
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        {ord.realizedTons !== null ? (
                          <span
                            className={`font-semibold ${
                              ord.differenceTons >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {ord.differenceTons > 0
                              ? `+${formatTonsPtBr(ord.differenceTons, 1)}`
                              : formatTonsPtBr(ord.differenceTons, 1)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        {ord.rmPct !== null ? formatPercentPtBr(ord.rmPct, 1) : 'Não calculado'}
                      </td>
                      <td className="py-2 px-2 text-right text-emerald-700 whitespace-nowrap">
                        {ord.goodTons !== null ? formatTonsPtBr(ord.goodTons, 1) : '—'}
                      </td>
                      <td className="py-2 px-2 text-right text-amber-700 whitespace-nowrap">
                        {ord.reworkTons !== null ? formatTonsPtBr(ord.reworkTons, 1) : '—'}
                      </td>
                      <td className="py-2 px-2 text-right text-rose-700 whitespace-nowrap">
                        {ord.lossTons !== null ? formatTonsPtBr(ord.lossTons, 1) : '—'}
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap font-sans">
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-slate-50 text-slate-700 border-slate-200"
                        >
                          {ord.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 font-sans text-[11px] text-slate-700 leading-snug">
                        {ord.aiSummary || 'Dados insuficientes para análise.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rodapé Corporativo e Governança */}
          <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              Fonte dos dados: Snapshots MES 4.0, Apontamentos ZPPT010 e Confirmações SAP ECC.
            </div>
            <div className="font-semibold text-slate-700">
              HUB INDUSTRIAL CIAFAL &bull; PCP ROBOTIZADO &bull; Emissão Auditada
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
