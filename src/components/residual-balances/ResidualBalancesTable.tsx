import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { ResidualBalanceItem } from '../../types/pcp-residual-balances'
import { formatNumberPTBR } from '../../lib/number-format'
import {
  Eye,
  PlayCircle,
  FileEdit,
  CheckCircle2,
  History,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'

interface ResidualBalancesTableProps {
  items: ResidualBalanceItem[]
  loading?: boolean
  selectedItems?: ResidualBalanceItem[]
  onSelectionChange?: (items: ResidualBalanceItem[]) => void
  onOpenMassRegularize?: () => void
  onViewDetail: (item: ResidualBalanceItem) => void
  onStartTreatment: (item: ResidualBalanceItem) => void
  onRegisterAction: (item: ResidualBalanceItem) => void
  onRegularize: (item: ResidualBalanceItem) => void
  onViewHistory: (item: ResidualBalanceItem) => void
}

type SortField =
  | 'deposito'
  | 'material_codigo'
  | 'lote'
  | 'quantidade_atual'
  | 'limite_parametrizado'
  | 'diferenca'
  | 'data_identificacao'
  | 'status'
type SortOrder = 'asc' | 'desc'

const ITEMS_PER_PAGE = 50

export const ResidualBalancesTable: React.FC<ResidualBalancesTableProps> = ({
  items,
  loading = false,
  selectedItems = [],
  onSelectionChange,
  onOpenMassRegularize,
  onViewDetail,
  onStartTreatment,
  onRegisterAction,
  onRegularize,
  onViewHistory,
}) => {
  // Ordenação
  const [sortField, setSortField] = useState<SortField>('deposito')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Paginação (quando houver mais de 50 registros)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Mensagem contextual de seleção de página vs total
  const [pageSelectionNotification, setPageSelectionNotification] = useState<string | null>(null)

  // Gerar chave única para identificar cada saldo residual de forma confiável
  const getItemKey = (it: ResidualBalanceItem) => `${it.deposito}_${it.lote}_${it.material_codigo}`

  // Itens ordenados
  const sortedItems = useMemo(() => {
    const sorted = [...items]
    sorted.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal || '').toLowerCase()
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      if (typeof aVal === 'number') {
        return sortOrder === 'asc' ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0)
      }

      return 0
    })
    return sorted
  }, [items, sortField, sortOrder])

  // Itens da página atual
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / ITEMS_PER_PAGE))
  const paginatedItems = useMemo(() => {
    if (sortedItems.length <= ITEMS_PER_PAGE) return sortedItems
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedItems.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedItems, currentPage])

  // Set de chaves selecionadas para checagem rápida O(1)
  const selectedKeySet = useMemo(() => {
    return new Set(selectedItems.map(getItemKey))
  }, [selectedItems])

  // Todos os registros visíveis na página atual estão selecionados?
  const isAllCurrentPageSelected = useMemo(() => {
    if (paginatedItems.length === 0) return false
    return paginatedItems.every((it) => selectedKeySet.has(getItemKey(it)))
  }, [paginatedItems, selectedKeySet])

  // Algum (mas não todos) da página atual selecionado? (indeterminado)
  const isSomeCurrentPageSelected = useMemo(() => {
    if (paginatedItems.length === 0) return false
    return (
      paginatedItems.some((it) => selectedKeySet.has(getItemKey(it))) && !isAllCurrentPageSelected
    )
  }, [paginatedItems, selectedKeySet, isAllCurrentPageSelected])

  // Alternar ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Alternar seleção de linha individual (sobrevive a paginação/ordenação)
  const handleToggleRow = (item: ResidualBalanceItem) => {
    if (!onSelectionChange) return
    const key = getItemKey(item)
    if (selectedKeySet.has(key)) {
      onSelectionChange(selectedItems.filter((it) => getItemKey(it) !== key))
    } else {
      onSelectionChange([...selectedItems, item])
    }
    setPageSelectionNotification(null)
  }

  // Alternar checkbox do cabeçalho ("Selecionar todos os registros visíveis")
  const handleToggleHeader = () => {
    if (!onSelectionChange) return

    if (isAllCurrentPageSelected) {
      // Desmarca os itens visíveis da página atual
      const currentPageKeySet = new Set(paginatedItems.map(getItemKey))
      const remaining = selectedItems.filter((it) => !currentPageKeySet.has(getItemKey(it)))
      onSelectionChange(remaining)
      setPageSelectionNotification(null)
    } else {
      // Primeiro seleciona a página atual e informa
      const newItemsMap = new Map<string, ResidualBalanceItem>()
      selectedItems.forEach((it) => newItemsMap.set(getItemKey(it), it))
      paginatedItems.forEach((it) => newItemsMap.set(getItemKey(it), it))
      const nextSelection = Array.from(newItemsMap.values())
      onSelectionChange(nextSelection)

      if (sortedItems.length > paginatedItems.length) {
        setPageSelectionNotification(
          `Todos os ${paginatedItems.length} registros desta página foram selecionados.`,
        )
      }
    }
  }

  // Ação explícita de selecionar todo o resultado dos filtros
  const handleSelectAllFound = () => {
    if (!onSelectionChange) return
    onSelectionChange([...sortedItems])
    setPageSelectionNotification(null)
  }

  // Limpar toda a seleção
  const handleClearSelection = () => {
    if (onSelectionChange) {
      onSelectionChange([])
    }
    setPageSelectionNotification(null)
  }

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-6 space-y-3">
          <div className="text-center py-4 text-slate-500 text-xs flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 animate-spin text-blue-700" />
            Carregando saldos residuais...
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const renderStatusBadge = (status: ResidualBalanceItem['status']) => {
    switch (status) {
      case 'ACAO_NECESSARIA':
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 font-semibold flex items-center gap-1 text-[11px]"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            Ação Necessária
          </Badge>
        )
      case 'SALDO_RESIDUAL_IDENTIFICADO':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-300 font-semibold flex items-center gap-1 text-[11px]"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Residual Identificado
          </Badge>
        )
      case 'EM_TRATAMENTO':
        return (
          <Badge
            variant="outline"
            className="bg-sky-50 text-sky-700 border-sky-300 font-semibold flex items-center gap-1 text-[11px]"
          >
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Em Tratamento
          </Badge>
        )
      case 'REGULARIZADO':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold flex items-center gap-1 text-[11px]"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Regularizado
          </Badge>
        )
      case 'REGULARIZADO_AUTOMATICO':
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-300 font-semibold flex items-center gap-1 text-[11px]"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
            Regul. Automático
          </Badge>
        )
      case 'DENTRO_PARAMETRO':
      default:
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]"
          >
            Dentro do Parâmetro
          </Badge>
        )
    }
  }

  const formatDateTimeBR = (iso?: string) => {
    if (!iso) return '-'
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return '-'
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (_) {
      return '-'
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
      {/* 2. BARRA DE AÇÕES EM MASSA (quando houver >= 1 linha selecionada) */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50/90 border-b border-blue-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-700 animate-pulse" />
              <span className="font-bold text-blue-950">
                {selectedItems.length}{' '}
                {selectedItems.length === 1 ? 'saldo selecionado' : 'saldos selecionados'}
              </span>
            </div>
            <span className="text-blue-300">|</span>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-blue-700 hover:text-blue-900 underline font-medium cursor-pointer"
            >
              Limpar seleção
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onOpenMassRegularize}
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold h-8 px-4 shadow-sm flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              REGULARIZAR SALDOS
            </Button>
          </div>
        </div>
      )}

      {/* Banner de seleção total se exceder a página atual */}
      {pageSelectionNotification && sortedItems.length > paginatedItems.length && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <span>{pageSelectionNotification}</span>
          <button
            type="button"
            onClick={handleSelectAllFound}
            className="font-bold text-blue-700 hover:text-blue-900 underline ml-2 cursor-pointer"
          >
            Selecionar todos os {sortedItems.length} registros encontrados?
          </button>
        </div>
      )}

      <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-bold text-slate-800">
            Relação Detalhada dos Saldos ({items.length})
          </CardTitle>
          {selectedItems.length > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[11px]">
              {selectedItems.length} selecionado{selectedItems.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <span className="text-xs text-slate-500">
          Monitoramento contínuo por lote e depósito | HUB CIAFAL
        </span>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 select-none whitespace-nowrap">
            <tr>
              {/* Coluna 1: Checkbox Seleção Múltipla */}
              <th className="py-2.5 px-3 w-10 text-center">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={
                      isAllCurrentPageSelected
                        ? true
                        : isSomeCurrentPageSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={handleToggleHeader}
                    aria-label="Selecionar todos os registros visíveis"
                    className="border-slate-400"
                  />
                </div>
              </th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60"
                onClick={() => handleSort('deposito')}
              >
                <div className="flex items-center gap-1">
                  Depósito
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60"
                onClick={() => handleSort('material_codigo')}
              >
                <div className="flex items-center gap-1">
                  Material
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60"
                onClick={() => handleSort('lote')}
              >
                <div className="flex items-center gap-1">
                  Lote
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60"
                onClick={() => handleSort('quantidade_atual')}
              >
                <div className="flex items-center justify-end gap-1">
                  Qtd Atual
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60"
                onClick={() => handleSort('limite_parametrizado')}
              >
                <div className="flex items-center justify-end gap-1">
                  Limite
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60"
                onClick={() => handleSort('diferenca')}
              >
                <div className="flex items-center justify-end gap-1">
                  Diferença
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60"
                onClick={() => handleSort('data_identificacao')}
              >
                <div className="flex items-center gap-1">
                  Identificação
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3">Tempo Residual</th>
              <th className="py-2.5 px-3">Regra Aplicada</th>
              <th className="py-2.5 px-3">Ação Recomendada</th>
              <th className="py-2.5 px-3">Responsável</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3">Última Atualização</th>
              <th className="py-2.5 px-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-8 text-center text-slate-400">
                  Nenhum saldo residual encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              paginatedItems.map((it, idx) => {
                const isRegularized =
                  it.status === 'REGULARIZADO' || it.status === 'REGULARIZADO_AUTOMATICO'
                const itemKey = getItemKey(it)
                const isSelected = selectedKeySet.has(itemKey)

                return (
                  <tr
                    key={itemKey || idx}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-blue-50/70 hover:bg-blue-100/60'
                        : it.status === 'ACAO_NECESSARIA'
                          ? 'bg-red-50/20 hover:bg-red-50/40'
                          : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Checkbox Individual */}
                    <td className="py-2 px-3 text-center w-10">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleRow(it)}
                          aria-label={`Selecionar lote ${it.lote}`}
                        />
                      </div>
                    </td>

                    {/* Depósito */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{it.deposito}</span>
                      {it.deposito_nome && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {it.deposito_nome}
                        </div>
                      )}
                    </td>

                    {/* Material */}
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900">{it.material_codigo}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {it.material_descricao}
                      </div>
                    </td>

                    {/* Lote */}
                    <td className="py-2 px-3 font-mono font-medium whitespace-nowrap text-slate-800">
                      {it.lote}
                    </td>

                    {/* Quantidade Atual */}
                    <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatNumberPTBR(it.quantidade_atual, 0, 3)} {it.unidade_medida}
                    </td>

                    {/* Limite Parametrizado */}
                    <td className="py-2 px-3 text-right text-slate-600 whitespace-nowrap">
                      {it.limite_parametrizado != null
                        ? `${formatNumberPTBR(it.limite_parametrizado, 0, 2)} ${it.unidade_medida}`
                        : '-'}
                    </td>

                    {/* Diferença */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {it.diferenca != null ? (
                        <span
                          className={`font-semibold ${
                            it.diferenca > 0 ? 'text-red-700' : 'text-slate-700'
                          }`}
                        >
                          {it.diferenca > 0 ? '-' : '+'}
                          {formatNumberPTBR(Math.abs(it.diferenca), 0, 2)} {it.unidade_medida}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Data Identificação */}
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      {formatDateTimeBR(it.data_identificacao)}
                    </td>

                    {/* Tempo como Saldo Residual */}
                    <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-700">
                      {it.tempo_como_residual_display || '-'}
                    </td>

                    {/* Regra Aplicada */}
                    <td className="py-2 px-3 max-w-[180px] truncate text-slate-700">
                      {it.regra_aplicada_descricao ? (
                        <span title={it.regra_aplicada_descricao}>
                          {it.regra_aplicada_descricao}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Ação Recomendada */}
                    <td className="py-2 px-3 max-w-[180px] truncate text-slate-800 font-medium">
                      {it.acao_recomendada ? (
                        <span title={it.acao_recomendada}>{it.acao_recomendada}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Responsável */}
                    <td className="py-2 px-3 whitespace-nowrap text-slate-700">
                      {it.responsavel_acao || '-'}
                    </td>

                    {/* Status */}
                    <td className="py-2 px-3 whitespace-nowrap">{renderStatusBadge(it.status)}</td>

                    {/* Última Atualização */}
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {formatDateTimeBR(it.ultima_atualizacao)}
                    </td>

                    {/* Coluna Ações (Individuais preservadas) */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* Visualizar */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetail(it)}
                          title="Visualizar Detalhes"
                          className="h-7 w-7 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* Iniciar Tratamento */}
                        {!isRegularized && it.status !== 'EM_TRATAMENTO' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onStartTreatment(it)}
                            title="Iniciar Tratamento"
                            className="h-7 w-7 p-0 text-sky-600 hover:text-sky-800 hover:bg-sky-50"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Registrar Ação */}
                        {!isRegularized && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRegisterAction(it)}
                            title="Registrar Ação"
                            className="h-7 w-7 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Regularizar Individual */}
                        {!isRegularized && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRegularize(it)}
                            title="Regularizar Saldo Residual"
                            className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Histórico */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewHistory(it)}
                          title="Histórico de Ações"
                          className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação se houver mais de 50 registros */}
      {totalPages > 1 && (
        <div className="py-2.5 px-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Mostrando registros {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, sortedItems.length)} de {sortedItems.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Anterior
            </Button>
            <span className="font-medium text-slate-800">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2 text-xs"
            >
              Próxima
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
