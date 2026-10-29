import React, { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Scale,
  Layers,
  Boxes,
  Lock,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatNumberPtBr } from '@/lib/number-format'
import { MPDimensionalItem } from '@/types/mp-optimization'
import { MPDimensionalDetailModal } from '@/components/mp-optimization/MPDimensionalDetailModal'

export interface MPDimensionalOperationalGridProps {
  items: MPDimensionalItem[]
  isLoading?: boolean
  lastSyncTime?: string | null
  syncError?: string | null
  onRefresh?: () => void
  onSelectForCuttingPlan?: (item: MPDimensionalItem) => void
  onSelectForMultiplePlan?: (item: MPDimensionalItem) => void
}

export const MPDimensionalOperationalGrid: React.FC<MPDimensionalOperationalGridProps> = ({
  items,
  isLoading = false,
  lastSyncTime,
  syncError,
  onRefresh,
  onSelectForCuttingPlan,
  onSelectForMultiplePlan,
}) => {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCenter, setFilterCenter] = useState('ALL')
  const [filterDepot, setFilterDepot] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [filterSteel, setFilterSteel] = useState('ALL')
  const [filterReservation, setFilterReservation] = useState('ALL')

  // Ordenação
  const [sortField, setSortField] = useState<keyof MPDimensionalItem>('created')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Paginação
  const [page, setPage] = useState(1)
  const pageSize = 15

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})

  // Modal de detalhamento da linha
  const [detailItem, setDetailItem] = useState<MPDimensionalItem | null>(null)

  // Opções únicas para filtros
  const centers = useMemo(
    () => Array.from(new Set(items.map((i) => i.center_code).filter(Boolean))),
    [items],
  )
  const depots = useMemo(
    () => Array.from(new Set(items.map((i) => i.storage_location).filter(Boolean))) as string[],
    [items],
  )
  const steels = useMemo(
    () => Array.from(new Set(items.map((i) => i.steel_grade).filter(Boolean))) as string[],
    [items],
  )
  const types = useMemo(
    () => Array.from(new Set(items.map((i) => i.item_type).filter(Boolean))),
    [items],
  )

  // Filtragem dos itens respeitando todos os critérios
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterCenter !== 'ALL' && item.center_code !== filterCenter) return false
      if (filterDepot !== 'ALL' && item.storage_location !== filterDepot) return false
      if (filterType !== 'ALL' && item.item_type !== filterType) return false
      if (filterSteel !== 'ALL' && item.steel_grade !== filterSteel) return false
      if (filterReservation !== 'ALL' && item.reservation_status !== filterReservation) return false

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchCode = item.material_code?.toLowerCase().includes(q)
        const matchDesc = item.material_description?.toLowerCase().includes(q)
        const matchBatch = item.batch_number?.toLowerCase().includes(q)
        const matchHeat = item.heat_number?.toLowerCase().includes(q)
        const matchBlock = item.block_number?.toLowerCase().includes(q)
        const matchSupp = item.supplier_name?.toLowerCase().includes(q)
        if (!matchCode && !matchDesc && !matchBatch && !matchHeat && !matchBlock && !matchSupp) {
          return false
        }
      }

      return true
    })
  }, [items, filterCenter, filterDepot, filterType, filterSteel, filterReservation, searchTerm])

  // Ordenação
  const sortedItems = useMemo(() => {
    const list = [...filteredItems]
    list.sort((a: any, b: any) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (valA === undefined || valA === null) valA = ''
      if (valB === undefined || valB === null) valB = ''

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA
      }

      const strA = String(valA).toLowerCase()
      const strB = String(valB).toLowerCase()
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [filteredItems, sortField, sortDirection])

  // Paginação
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize))
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedItems.slice(start, start + pageSize)
  }, [sortedItems, page, pageSize])

  // Cálculos de Dias em Estoque
  const calculateDaysInStock = (dateStr?: string) => {
    if (!dateStr) return null
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return null
      const diffMs = Date.now() - d.getTime()
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    } catch {
      return null
    }
  }

  // Cards compactos superiores (respeitando os filtros, sem contar duas vezes o mesmo material físico)
  const metrics = useMemo(() => {
    let totalAvailableWeightKg = 0
    let platesCount = 0
    let blocksCount = 0
    let piecesCount = 0
    let reusableLeftoversCount = 0
    let blockedCount = 0
    let maxDaysInStock = 0

    filteredItems.forEach((it) => {
      const wKg = it.weight_kg || 0
      if (it.reservation_status === 'LIVRE' || it.reservation_status === 'SUGESTAO_RESERVA') {
        totalAvailableWeightKg += wKg
      }
      if (it.reservation_status === 'BLOQUEADA') {
        blockedCount += 1
      }
      if (it.item_type === 'PLACA') platesCount += 1
      else if (it.item_type === 'BLOCO') blocksCount += 1
      else if (it.item_type === 'PECA') piecesCount += 1
      else if (it.item_type === 'SOBRA_REUTILIZAVEL') reusableLeftoversCount += 1

      const days = calculateDaysInStock(it.reception_date)
      if (days !== null && days > maxDaysInStock) {
        maxDaysInStock = days
      }
    })

    return {
      totalAvailableWeightTons: totalAvailableWeightKg / 1000,
      totalCount: filteredItems.length,
      platesCount,
      blocksCount,
      piecesCount,
      reusableLeftoversCount,
      blockedCount,
      maxDaysInStock,
    }
  }, [filteredItems])

  const toggleSort = (field: keyof MPDimensionalItem) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleSelectAll = () => {
    const allSelected = paginatedItems.every((it) => selectedIds[it.id])
    const updated = { ...selectedIds }
    paginatedItems.forEach((it) => {
      updated[it.id] = !allSelected
    })
    setSelectedIds(updated)
  }

  return (
    <div className="space-y-4">
      {/* TÍTULO E AÇÕES */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-[#004C97] rounded-lg">
              <Boxes className="w-4 h-4" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Estoque Dimensional Rastreável — Placas, Blocos, Peças e Sobras
            </h2>
            <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px]">
              SAP ECC (MB52 / MMBE / MCHB)
            </Badge>
          </div>
          <p className="text-xs text-slate-600">
            Rastreabilidade individual de itens com dimensões reais, peso oficial em toneladas (3
            casas) e situação de reserva no pátio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="text-xs font-semibold gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#004C97] ${isLoading ? 'animate-spin' : ''}`}
              />
              Verificar Atualização SAP
            </Button>
          )}
        </div>
      </div>

      {/* CARDS COMPACTOS SUPERIORES (8 cards executivos e operacionais) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Peso Disponível
          </span>
          <div className="text-base font-black font-mono text-[#004C97] mt-0.5">
            {formatNumberPtBr(metrics.totalAvailableWeightTons, 3)} t
          </div>
          <span className="text-[10px] text-emerald-700">Livre para Corte</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Itens</span>
          <div className="text-base font-black font-mono text-slate-900 mt-0.5">
            {metrics.totalCount} un
          </div>
          <span className="text-[10px] text-slate-400">Filtrados</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Placas</span>
          <div className="text-base font-black font-mono text-slate-900 mt-0.5">
            {metrics.platesCount} un
          </div>
          <span className="text-[10px] text-slate-400">Pátio Matriz</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Blocos</span>
          <div className="text-base font-black font-mono text-slate-900 mt-0.5">
            {metrics.blocksCount} un
          </div>
          <span className="text-[10px] text-slate-400">Produção</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Peças</span>
          <div className="text-base font-black font-mono text-slate-900 mt-0.5">
            {metrics.piecesCount} un
          </div>
          <span className="text-[10px] text-slate-400">Cortadas</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Sobras Aprov.
          </span>
          <div className="text-base font-black font-mono text-emerald-800 mt-0.5">
            {metrics.reusableLeftoversCount} un
          </div>
          <span className="text-[10px] text-emerald-700">Reaproveitáveis</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Bloqueados</span>
          <div className="text-base font-black font-mono text-rose-800 mt-0.5">
            {metrics.blockedCount} un
          </div>
          <span className="text-[10px] text-rose-600">Qualidade/SAP</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Maior Permanência
          </span>
          <div className="text-base font-black font-mono text-amber-900 mt-0.5">
            {metrics.maxDaysInStock} d
          </div>
          <span className="text-[10px] text-amber-700">Giro Lento</span>
        </div>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por Código SAP, Descrição, Lote, Corrida, Fornecedor ou Bloco..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Centro */}
            <Select value={filterCenter} onValueChange={setFilterCenter}>
              <SelectTrigger className="h-8 text-xs w-[120px]">
                <SelectValue placeholder="Centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Centros</SelectItem>
                {centers.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro Depósito */}
            <Select value={filterDepot} onValueChange={setFilterDepot}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Depósito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Depósitos</SelectItem>
                {depots.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro Tipo */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-xs w-[120px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Tipos</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro Aço */}
            <Select value={filterSteel} onValueChange={setFilterSteel}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Aço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Aços</SelectItem>
                {steels.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro Reserva */}
            <Select value={filterReservation} onValueChange={setFilterReservation}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Disponibilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas Situações</SelectItem>
                <SelectItem value="LIVRE">Livre</SelectItem>
                <SelectItem value="RESERVADA">Reservada</SelectItem>
                <SelectItem value="BLOQUEADA">Bloqueada</SelectItem>
                <SelectItem value="EM_PLANO_DE_CORTE">Em Plano</SelectItem>
                <SelectItem value="CORTE_APROVADO">Aprovado</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm ||
              filterCenter !== 'ALL' ||
              filterDepot !== 'ALL' ||
              filterType !== 'ALL' ||
              filterSteel !== 'ALL' ||
              filterReservation !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setFilterCenter('ALL')
                  setFilterDepot('ALL')
                  setFilterType('ALL')
                  setFilterSteel('ALL')
                  setFilterReservation('ALL')
                }}
                className="h-8 text-xs text-slate-500 hover:text-slate-800"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* GRADE OPERACIONAL COMPLETA */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Tabela com cabeçalhos sempre visíveis */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedItems.length > 0 && paginatedItems.every((it) => selectedIds[it.id])
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                  />
                </th>
                <th
                  className="p-2.5 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort('material_code')}
                >
                  <div className="flex items-center gap-1">
                    <span>Código SAP</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="p-2.5 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort('material_description')}
                >
                  <div className="flex items-center gap-1">
                    <span>Descrição</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-2.5">Tipo</th>
                <th className="p-2.5">Fornecedor</th>
                <th className="p-2.5">Centro/Dep</th>
                <th className="p-2.5">Lote / Corrida</th>
                <th className="p-2.5">Aço</th>
                <th
                  className="p-2.5 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort('weight_kg')}
                >
                  <div className="flex items-center gap-1">
                    <span>Peso Total (t)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-2.5">Dimensões (mm)</th>
                <th
                  className="p-2.5 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort('reception_date')}
                >
                  <div className="flex items-center gap-1">
                    <span>Recebimento</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-2.5">Dias Estoque</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-500 font-sans">
                    <div className="max-w-md mx-auto space-y-2">
                      <Info className="w-6 h-6 text-slate-400 mx-auto" />
                      <div className="text-sm font-bold text-slate-800">
                        {items.length === 0
                          ? 'Aguardando sincronização com depósitos SAP.'
                          : 'Nenhum registro encontrado para os filtros selecionados.'}
                      </div>
                      <p className="text-xs text-slate-500">
                        {items.length === 0
                          ? 'Informação não disponível na integração SAP no momento.'
                          : 'Tente alterar os termos da busca ou limpar os filtros de centro/depósito.'}
                      </p>
                      {lastSyncTime && (
                        <div className="text-[11px] text-slate-400">
                          Última tentativa de sincronização: {lastSyncTime}
                        </div>
                      )}
                      {syncError && (
                        <div className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                          Erro na interface SAP RFC: {syncError}
                        </div>
                      )}
                      {onRefresh && items.length === 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onRefresh}
                          className="mt-2 text-xs font-semibold"
                        >
                          Verificar Atualização SAP
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((it) => {
                  const days = calculateDaysInStock(it.reception_date)
                  const isChecked = selectedIds[it.id] ?? false

                  return (
                    <tr
                      key={it.id}
                      onClick={() => setDetailItem(it)}
                      className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-50/70' : ''
                      }`}
                    >
                      <td
                        className="p-2.5 text-center"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedIds((prev) => ({ ...prev, [it.id]: !isChecked }))
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                        />
                      </td>

                      <td className="p-2.5 font-bold text-slate-900">{it.material_code}</td>

                      <td className="p-2.5 font-sans font-medium text-slate-800 max-w-[200px] truncate">
                        {it.material_description || 'Material Sem Descrição'}
                      </td>

                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[9px] bg-slate-50">
                          {it.item_type || 'BLOCO'}
                        </Badge>
                      </td>

                      <td className="p-2.5 font-sans text-slate-700 max-w-[140px] truncate">
                        {it.supplier_name || it.supplier_code || 'Gerdau'}
                      </td>

                      <td className="p-2.5 text-slate-800">
                        {it.center_code} / {it.storage_location || 'DP04'}
                      </td>

                      <td className="p-2.5 text-slate-700">
                        {it.batch_number || it.block_number || '-'}
                        {it.heat_number ? ` • ${it.heat_number}` : ''}
                      </td>

                      <td className="p-2.5 text-[#004C97] font-bold">{it.steel_grade || '-'}</td>

                      <td className="p-2.5 font-bold text-emerald-800">
                        {formatNumberPtBr((it.weight_kg || 0) / 1000, 3)} t
                      </td>

                      <td className="p-2.5 text-slate-700">
                        {it.thickness_mm} × {it.width_mm} × {it.length_mm}
                      </td>

                      <td className="p-2.5 text-slate-600">
                        {it.reception_date
                          ? new Date(it.reception_date).toLocaleDateString('pt-BR')
                          : 'Informação não disponível na integração SAP.'}
                      </td>

                      <td className="p-2.5 font-bold text-amber-900">
                        {days !== null ? `${days} d` : '-'}
                      </td>

                      <td className="p-2.5 font-sans">
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            it.reservation_status === 'LIVRE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : it.reservation_status === 'BLOQUEADA'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {it.reservation_status}
                        </Badge>
                      </td>

                      <td
                        className="p-2.5 text-right font-sans"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailItem(it)}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                            title="Ver Detalhes do Material"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {onSelectForCuttingPlan && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onSelectForCuttingPlan(it)}
                              className="h-6 text-[10px] font-bold text-[#004C97] border-blue-200 hover:bg-blue-50"
                            >
                              Plano Corte
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BARRA DE PAGINAÇÃO E TOTALIZADORES */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-600">
            Exibindo <strong>{paginatedItems.length}</strong> de{' '}
            <strong>{sortedItems.length}</strong> registros &bull; Total filtrado:{' '}
            <strong className="font-mono text-emerald-800">
              {formatNumberPtBr(
                sortedItems.reduce((acc, i) => acc + (i.weight_kg || 0), 0) / 1000,
                3,
              )}{' '}
              t
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* POPUP DE DETALHAMENTO DO ESTOQUE DIMENSIONAL */}
      <MPDimensionalDetailModal
        isOpen={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        item={detailItem}
        onSelectForCuttingPlan={onSelectForCuttingPlan}
        onSelectForMultiplePlan={onSelectForMultiplePlan}
      />
    </div>
  )
}
