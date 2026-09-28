import React, { useState, useMemo } from 'react'
import { CenterEfficiencyRow, CenterOrderDetail } from '@/services/efficiency-center-service'
import { getStatusVisual, CenterOperationalStatus } from '@/lib/pcp/efficiency-status-rules'
import {
  formatTonsPtBr,
  formatPercentPtBr,
  formatDateTimePTBR,
  formatDatePTBR,
} from '@/lib/formatters-ptbr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Search,
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  RotateCcw,
} from 'lucide-react'

interface EfficiencyCenterTableProps {
  rows: CenterEfficiencyRow[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  activeProgramacaoId?: string | null
  activeProgramacaoVersion?: number | null
}

type SortField =
  | 'centerCode'
  | 'lineCode'
  | 'plannedProductName'
  | 'plannedQuantityTons'
  | 'realizedQuantityTons'
  | 'differenceTons'
  | 'adherencePct'
  | 'status'

export const EfficiencyCenterTable: React.FC<EfficiencyCenterTableProps> = ({
  rows,
  loading = false,
  error = null,
  onRetry,
  activeProgramacaoId,
  activeProgramacaoVersion,
}) => {
  const [expandedCenter, setExpandedCenter] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('lineCode')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const toggleExpand = (centerKey: string) => {
    setExpandedCenter((prev) => (prev === centerKey ? null : centerKey))
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filtragem interna rápida de busca
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows
    const q = searchTerm.toLowerCase()
    return rows.filter((r) => {
      return (
        r.centerCode.toLowerCase().includes(q) ||
        r.centerName.toLowerCase().includes(q) ||
        r.lineCode.toLowerCase().includes(q) ||
        (r.plannedProductName && r.plannedProductName.toLowerCase().includes(q)) ||
        (r.plannedProductCode && r.plannedProductCode.toLowerCase().includes(q))
      )
    })
  }, [rows, searchTerm])

  // Ordenação
  const sortedRows = useMemo(() => {
    const list = [...filteredRows]
    list.sort((a, b) => {
      let valA: any = a[sortField]
      let valB: any = b[sortField]

      if (valA === null || valA === undefined) valA = -Infinity
      if (valB === null || valB === undefined) valB = -Infinity

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB)
        return sortDirection === 'asc' ? cmp : -cmp
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA
    })
    return list
  }, [filteredRows, sortField, sortDirection])

  // Paginação
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [sortedRows, page, pageSize])

  // Formatação segura de datas (ISO -> DD/MM/AAAA HH:mm ou Dado não disponível)
  const formatDateTimeSafe = (dt: string | null | undefined) => {
    if (!dt) return 'Dado não disponível'
    if (dt.includes('T') || dt.includes('-')) {
      const formatted = formatDateTimePTBR(dt)
      return formatted !== '-' ? formatted : dt
    }
    return dt
  }

  // Estado de Erro
  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-rose-900">
            Não foi possível carregar a eficiência dos centros
          </h4>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
        </div>
        {onRetry && (
          <Button
            size="sm"
            onClick={onRetry}
            className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tentar novamente
          </Button>
        )}
      </div>
    )
  }

  // Estado de Carregando (Skeleton)
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
        <div className="h-9 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
      {/* Header da Tabela com busca e identificação da fonte de Programação */}
      <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">
              Previsto x Realizado por Centro de Trabalho
            </h3>
            {activeProgramacaoId && (
              <Badge
                variant="outline"
                className="text-[10px] font-mono text-[#004C97] border-[#004C97]/30 bg-[#004C97]/5"
              >
                Programação Oficial: {activeProgramacaoId} (v{activeProgramacaoVersion || 1})
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Comparativo oficial entre Montagem Semanal e telemetria de apontamentos do MES 4.0.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Pesquisar centro, linha, produto..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(1)
            }}
            className="pl-8 h-8 text-xs bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Tabela com scroll interno horizontal garantido */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[980px]">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 text-[11px] font-semibold">
              <th className="py-2.5 px-3 w-8"></th>
              <th
                onClick={() => handleSort('centerCode')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Centro</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('lineCode')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Linha</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('plannedProductName')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Produto Previsto</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('plannedQuantityTons')}
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Qtd. Prevista</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('realizedQuantityTons')}
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Qtd. Realizada</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3">Início Previsto</th>
              <th className="py-2.5 px-3">Início Real</th>
              <th
                onClick={() => handleSort('differenceTons')}
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Diferença</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('adherencePct')}
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Aderência</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200/60 select-none"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Building2 className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-medium">
                      Nenhum dado encontrado para os filtros selecionados.
                    </p>
                    <p className="text-xs text-slate-400">
                      Tente alterar ou limpar os filtros de empresa, linha, centro ou período.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const rowKey = `${row.lineCode}__${row.centerCode}`
                const isExpanded = expandedCenter === rowKey
                const statusVisual = getStatusVisual(row.status)

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isExpanded ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {/* Botão de expansão */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleExpand(rowKey)}
                          className="w-5 h-5 rounded hover:bg-slate-200/80 flex items-center justify-center text-slate-500 transition-colors"
                          title={
                            isExpanded ? 'Recolher detalhes' : 'Expandir detalhes operacionais'
                          }
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>

                      {/* Centro */}
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        <div className="flex flex-col">
                          <span className="font-semibold">{row.centerName}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {row.centerCode}
                          </span>
                        </div>
                      </td>

                      {/* Linha */}
                      <td className="py-2.5 px-3 text-slate-700">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-slate-300 bg-slate-50 text-slate-700"
                        >
                          {row.lineCode}
                        </Badge>
                      </td>

                      {/* Produto Previsto */}
                      <td className="py-2.5 px-3 text-slate-800 max-w-[200px] truncate">
                        {row.plannedProductName ? (
                          <div className="truncate" title={row.plannedProductName}>
                            <span className="font-medium text-slate-800">
                              {row.plannedProductName}
                            </span>
                            {row.plannedProductCode && (
                              <span className="block text-[10px] font-mono text-slate-400">
                                {row.plannedProductCode}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Dado não disponível</span>
                        )}
                      </td>

                      {/* Qtd. Prevista */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                        {formatTonsPtBr(row.plannedQuantityTons, 2)}
                      </td>

                      {/* Qtd. Realizada */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {row.realizedQuantityTons !== null ? (
                          <span className="text-slate-900">
                            {formatTonsPtBr(row.realizedQuantityTons, 2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Dado não disponível
                          </span>
                        )}
                      </td>

                      {/* Início Previsto */}
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                        {formatDateTimeSafe(row.plannedStart)}
                      </td>

                      {/* Início Real */}
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                        {row.realStart ? (
                          <span>{formatDateTimeSafe(row.realStart)}</span>
                        ) : (
                          <span className="text-slate-400 italic">Dado não disponível</span>
                        )}
                      </td>

                      {/* Diferença */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        {row.differenceTons !== null ? (
                          <span
                            className={
                              row.differenceTons < 0
                                ? 'text-rose-600'
                                : row.differenceTons > 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-700'
                            }
                          >
                            {row.differenceTons > 0 ? '+' : ''}
                            {formatTonsPtBr(row.differenceTons, 2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Aderência */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {row.adherencePct !== null ? (
                          <span
                            className={
                              row.adherencePct >= 95
                                ? 'text-emerald-700'
                                : row.adherencePct >= 85
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                            }
                          >
                            {formatPercentPtBr(row.adherencePct, 1)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Dado não disponível
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusVisual.badgeBg} ${statusVisual.badgeText} ${statusVisual.badgeBorder}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusVisual.dotColor}`} />
                          {statusVisual.label}
                        </span>
                      </td>
                    </tr>

                    {/* Linha expansível com detalhes operacionais */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <td colSpan={11} className="p-4 pl-10 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">
                                Detalhamento Operacional: {row.centerName} ({row.centerCode})
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] text-slate-600 bg-white"
                              >
                                {row.details.length} ordens/sequências mapeadas
                              </Badge>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              Fonte Previsto: Montagem Semanal &bull; Fonte Realizado: Apontamentos
                              MES 4.0
                            </span>
                          </div>

                          {row.details.length === 0 ? (
                            <div className="text-xs text-slate-400 italic py-2">
                              Dado não disponível para as ordens deste centro de trabalho.
                            </div>
                          ) : (
                            <div className="w-full overflow-x-auto">
                              <table className="w-full text-left text-xs bg-white rounded border border-slate-200 shadow-2xs">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-600 text-[10px] font-semibold border-b border-slate-200">
                                    <th className="py-2 px-3">Ordem / OP</th>
                                    <th className="py-2 px-3">Produto</th>
                                    <th className="py-2 px-3 text-center">Seq.</th>
                                    <th className="py-2 px-3 text-right">Qtd. Prevista</th>
                                    <th className="py-2 px-3 text-right">Qtd. Realizada</th>
                                    <th className="py-2 px-3">Horário Previsto</th>
                                    <th className="py-2 px-3">Horário Real</th>
                                    <th className="py-2 px-3 text-center">Paradas</th>
                                    <th className="py-2 px-3">Desvios & Justificativa</th>
                                    <th className="py-2 px-3">Impacto Operacional</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {row.details.map((detail, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 text-[11px]">
                                      <td className="py-2 px-3 font-mono font-semibold text-[#004C97]">
                                        {detail.orderNumber}
                                      </td>
                                      <td className="py-2 px-3">
                                        <div className="font-medium text-slate-800">
                                          {detail.productDescription}
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400">
                                          {detail.productCode}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono">
                                        {detail.scheduledSequence}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono">
                                        {formatTonsPtBr(detail.plannedQuantityTons, 2)}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-medium">
                                        {detail.realizedQuantityTons !== null ? (
                                          formatTonsPtBr(detail.realizedQuantityTons, 2)
                                        ) : (
                                          <span className="text-slate-400 italic">
                                            Dado não disponível
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                        {formatDateTimeSafe(detail.plannedStart)}
                                      </td>
                                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                        {detail.realStart ? (
                                          formatDateTimeSafe(detail.realStart)
                                        ) : (
                                          <span className="text-slate-400 italic">
                                            Dado não disponível
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        {detail.stopsCount > 0 ? (
                                          <span className="text-amber-700 font-mono font-medium">
                                            {detail.stopsCount} ({detail.stopsDurationMinutes} min)
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">0</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 max-w-[180px] truncate">
                                        {detail.deviationReason ? (
                                          <span
                                            className="text-rose-700 font-medium truncate block"
                                            title={detail.deviationReason}
                                          >
                                            {detail.deviationReason}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 italic">Sem desvios</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 max-w-[180px] truncate">
                                        {detail.operationalImpact ? (
                                          <span
                                            className="text-slate-700 truncate block"
                                            title={detail.operationalImpact}
                                          >
                                            {detail.operationalImpact}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 italic">
                                            Dado não disponível
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {sortedRows.length > 0 && (
        <div className="p-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50/40">
          <div>
            Exibindo{' '}
            <span className="font-semibold text-slate-800">
              {Math.min((page - 1) * pageSize + 1, sortedRows.length)}
            </span>{' '}
            a{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(page * pageSize, sortedRows.length)}
            </span>{' '}
            de <span className="font-semibold text-slate-800">{sortedRows.length}</span> centros
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs px-2.5"
            >
              Anterior
            </Button>
            <span className="text-[11px] font-medium px-2">
              Página {page} de {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 text-xs px-2.5"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
