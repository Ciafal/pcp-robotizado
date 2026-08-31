import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeftRight,
  Check,
  AlertCircle,
  Sparkles,
  Layers,
  Building,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react'
import { ScheduleItemDiff } from '@/types/schedule-versioning'

interface VersionComparisonDiffModalProps {
  isOpen: boolean
  onClose: () => void
  versionA: string // ex: "V02"
  versionB: string // ex: "V03"
  diffs: ScheduleItemDiff[]
  lineCode: string
  weekDisplay: string
  associatedReasonCode?: string
  associatedReasonName?: string
  associatedFamilyName?: string
  evidenceStatus?: string
}

export const VersionComparisonDiffModal: React.FC<VersionComparisonDiffModalProps> = ({
  isOpen,
  onClose,
  versionA,
  versionB,
  diffs,
  lineCode,
  weekDisplay,
  associatedReasonCode,
  associatedReasonName,
  associatedFamilyName,
  evidenceStatus,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'INCLUIDO' | 'ALTERADO' | 'REMOVIDO'>('ALL')
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Resumo inteligente das causas estruturado (Seção 14)
  const causeBreakdown = useMemo(() => {
    const total = diffs.length
    let mpCount = 0
    let setCount = 0
    let comCount = 0
    let prdCount = 0

    diffs.forEach((d) => {
      const isQty = d.fieldDiffs.some((f) => f.field === 'QUANTIDADE')
      const isSeq = d.fieldDiffs.some((f) => f.field === 'SEQUENCIA')
      const isCust = Boolean(d.customerAffected || d.salesOrder)

      if (isQty) mpCount++
      else if (isSeq) setCount++
      else if (isCust) comCount++
      else prdCount++
    })

    return { total, mpCount, setCount, comCount, prdCount }
  }, [diffs])

  const filteredDiffs = useMemo(() => {
    if (filterType === 'ALL') return diffs
    return diffs.filter((d) => d.changeType === filterType)
  }, [diffs, filterType])

  const addedCount = diffs.filter((d) => d.changeType === 'INCLUIDO').length
  const modifiedCount = diffs.filter((d) => d.changeType === 'ALTERADO').length
  const removedCount = diffs.filter((d) => d.changeType === 'REMOVIDO').length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white border-slate-200 text-slate-800 p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-[#004C97] rounded-lg">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Comparador Formal de Versões: {versionA} &harr; {versionB}
                </DialogTitle>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" /> Linha {lineCode}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {weekDisplay}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <Badge variant="outline" className="bg-slate-50 border-slate-300">
                Origem: {versionA}
              </Badge>
              <span>&rarr;</span>
              <Badge className="bg-[#004C97] text-white">Destino: {versionB}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* CARDS DE RESUMO OPERACIONAL */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Total Alterações
              </span>
              <span className="text-lg font-bold text-slate-800">{diffs.length}</span>
            </div>
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
              <span className="text-[10px] text-emerald-700 uppercase block font-semibold">
                Itens Adicionados
              </span>
              <span className="text-lg font-bold text-emerald-700">{addedCount}</span>
            </div>
            <div className="p-2 bg-amber-50 border border-amber-200 rounded">
              <span className="text-[10px] text-amber-700 uppercase block font-semibold">
                Itens Modificados
              </span>
              <span className="text-lg font-bold text-amber-700">{modifiedCount}</span>
            </div>
            <div className="p-2 bg-rose-50 border border-rose-200 rounded">
              <span className="text-[10px] text-rose-700 uppercase block font-semibold">
                Itens Removidos
              </span>
              <span className="text-lg font-bold text-rose-700">{removedCount}</span>
            </div>
          </div>

          {/* RESUMO INTELIGENTE DA REPROGRAMAÇÃO DERIVADO DOS DADOS REAIS (SEÇÃO 14) */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1.5">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-[#004C97]">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Resumo Inteligente das Causas (Version Diff):
              </span>
              {associatedReasonCode && (
                <Badge className="bg-[#004C97] text-white text-[10px]">
                  {associatedReasonCode} — {associatedReasonName}
                </Badge>
              )}
            </div>
            <p className="text-slate-700 leading-relaxed text-[11.5px]">
              {diffs.length > 0 ? (
                <>
                  Identificadas <strong>{diffs.length} alterações</strong> entre {versionA} e{' '}
                  {versionB}:{' '}
                  {causeBreakdown.mpCount > 0 &&
                    `${causeBreakdown.mpCount} com impacto em Matéria-prima (saldo/lote); `}
                  {causeBreakdown.setCount > 0 &&
                    `${causeBreakdown.setCount} por alteração de Setup ou Sequenciamento; `}
                  {causeBreakdown.comCount > 0 &&
                    `${causeBreakdown.comCount} por Demanda Comercial / CRM; `}
                  {causeBreakdown.prdCount > 0 &&
                    `${causeBreakdown.prdCount} por Parada/Capacidade Operacional. `}
                  {evidenceStatus === 'HUMAN_ONLY' && (
                    <span className="text-amber-700 font-semibold">
                      (Registro exclusivamente humano sem evidência sistêmica vinculada).
                    </span>
                  )}
                </>
              ) : (
                'Nenhuma alteração de grade detectada entre estas duas versões.'
              )}
            </p>
          </div>

          {/* FILTRO DE TIPOS */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Detalhamento dos Itens ({filteredDiffs.length})
            </span>
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  filterType === 'ALL'
                    ? 'bg-[#004C97] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({diffs.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('ALTERADO')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  filterType === 'ALTERADO'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Modificados ({modifiedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('INCLUIDO')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  filterType === 'INCLUIDO'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Inclusões ({addedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('REMOVIDO')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  filterType === 'REMOVIDO'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Remoções ({removedCount})
              </button>
            </div>
          </div>

          {/* LISTA TABULAR ESTRUTURADA DE ALTERAÇÕES (SEÇÃO 7 e 14) */}
          {filteredDiffs.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded text-xs text-slate-500">
              Nenhuma alteração para o filtro selecionado.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDiffs.map((d) => {
                const isExp = expandedItems[d.itemId] || false
                return (
                  <div
                    key={d.itemId}
                    className="p-3 border border-slate-200 rounded-lg bg-white shadow-2xs hover:border-slate-300 transition"
                  >
                    {/* Cabeçalho do item */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-[10px] font-bold ${
                            d.changeType === 'INCLUIDO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.changeType === 'REMOVIDO'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {d.changeType}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-slate-900">
                          {d.materialCode}
                        </span>
                        {d.materialDescription && (
                          <span className="text-xs text-slate-600 font-medium">
                            ({d.materialDescription})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {d.relevance === 'ALTA' && (
                          <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px]">
                            Alta Relevância
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(d.itemId)}
                          className="h-6 text-[11px] text-slate-500 px-1.5"
                        >
                          {isExp ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Tabela de Campos: | Campo | Versão Anterior | Versão Atual | Alteração | */}
                    <div className="mt-2.5 overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse font-mono">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] uppercase">
                            <th className="p-1.5 font-semibold">Campo</th>
                            <th className="p-1.5 font-semibold">{versionA} (Antes)</th>
                            <th className="p-1.5 font-semibold">{versionB} (Depois)</th>
                            <th className="p-1.5 font-semibold text-right">Variação / Delta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.fieldDiffs.map((fd, fIdx) => (
                            <tr
                              key={fIdx}
                              className="border-b border-slate-100 hover:bg-slate-50/50"
                            >
                              <td className="p-1.5 font-bold text-slate-700">{fd.fieldNamePt}</td>
                              <td className="p-1.5 text-slate-500 line-through">
                                {fd.previousValue}
                              </td>
                              <td className="p-1.5 font-bold text-slate-800">{fd.newValue}</td>
                              <td className="p-1.5 text-right font-bold">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    fd.highlightColor === 'green'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : fd.highlightColor === 'red'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {fd.previousValue} &rarr; {fd.newValue}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Detalhes de Cliente / PV */}
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {d.customerAffected
                          ? `Cliente: ${d.customerAffected}`
                          : 'Ordem MTS de Estoque'}
                      </span>
                      {d.salesOrder && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          PV: {d.salesOrder}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Comparação formal auditada pelo Motor de Versionamento PCP CIAFAL.
          </span>
          <Button
            onClick={onClose}
            size="sm"
            className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs"
          >
            Fechar Comparador
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
