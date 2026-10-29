import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Filter,
  X,
  Building2,
  Layers,
  Calendar,
  User,
  ShieldCheck,
  Eye,
  FileText,
  GitBranch,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
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
import {
  mpMultipleCuttingPlansService,
  MPMultipleCuttingPlanRecord,
} from '@/services/mp-dimensional-notes-service'
import { MPCuttingPlanViewerModal } from './MPCuttingPlanViewerModal'

interface MPCuttingPlansHistoryTabProps {
  onSelectPlanToEdit?: (plan: MPMultipleCuttingPlanRecord) => void
}

export const MPCuttingPlansHistoryTab: React.FC<MPCuttingPlansHistoryTabProps> = ({
  onSelectPlanToEdit,
}) => {
  const [plans, setPlans] = useState<MPMultipleCuttingPlanRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlanForModal, setSelectedPlanForModal] =
    useState<MPMultipleCuttingPlanRecord | null>(null)
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [centerFilter, setCenterFilter] = useState('ALL')
  const [lineFilter, setLineFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [steelGradeFilter, setSteelGradeFilter] = useState('ALL')
  const [periodFilter, setPeriodFilter] = useState<'ALL' | '7D' | '30D' | '90D'>('ALL')

  // Paginação e Ordenação
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<keyof MPMultipleCuttingPlanRecord>('created')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const fetchPlans = async () => {
    setIsLoading(true)
    try {
      const data = await mpMultipleCuttingPlansService.listPlans()
      setPlans(data || [])
    } catch (err) {
      console.error('[MPCuttingPlansHistoryTab] Erro ao carregar histórico:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  // Opções para comboboxes baseadas nos dados
  const availableCenters = useMemo(() => {
    const s = new Set<string>()
    plans.forEach((p) => p.center_code && s.add(p.center_code))
    return Array.from(s).sort()
  }, [plans])

  const availableLines = useMemo(() => {
    const s = new Set<string>()
    plans.forEach((p) => p.line_code && s.add(p.line_code))
    return Array.from(s).sort()
  }, [plans])

  const availableSteels = useMemo(() => {
    const s = new Set<string>()
    plans.forEach((p) => p.steel_grade && s.add(p.steel_grade))
    return Array.from(s).sort()
  }, [plans])

  // Filtragem
  const filteredPlans = useMemo(() => {
    const now = Date.now()
    return plans.filter((p) => {
      if (centerFilter !== 'ALL' && p.center_code !== centerFilter) return false
      if (lineFilter !== 'ALL' && p.line_code !== lineFilter) return false
      if (statusFilter !== 'ALL') {
        const normStatus = (p.status || 'RASCUNHO').toUpperCase()
        if (normStatus !== statusFilter) return false
      }
      if (typeFilter !== 'ALL') {
        const normType = (p.plan_type || 'multiplo').toLowerCase()
        const targetType = typeFilter.toLowerCase()
        if (normType !== targetType) return false
      }
      if (steelGradeFilter !== 'ALL' && p.steel_grade !== steelGradeFilter) return false

      if (periodFilter !== 'ALL' && p.created) {
        const createdMs = new Date(p.created).getTime()
        const diffDays = (now - createdMs) / (1000 * 60 * 60 * 24)
        if (periodFilter === '7D' && diffDays > 7) return false
        if (periodFilter === '30D' && diffDays > 30) return false
        if (periodFilter === '90D' && diffDays > 90) return false
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchCode = (p.plan_code || '').toLowerCase().includes(q)
        const matchMat = (p.material_code || '').toLowerCase().includes(q)
        const matchDesc = (p.material_description || '').toLowerCase().includes(q)
        const matchLot = (p.batch_number || '').toLowerCase().includes(q)
        const matchHeat = (p.heat_number || '').toLowerCase().includes(q)
        const matchResp = (p.responsible_user_name || p.created_by_user_name || '')
          .toLowerCase()
          .includes(q)
        if (!matchCode && !matchMat && !matchDesc && !matchLot && !matchHeat && !matchResp) {
          return false
        }
      }

      return true
    })
  }, [
    plans,
    searchTerm,
    centerFilter,
    lineFilter,
    statusFilter,
    typeFilter,
    steelGradeFilter,
    periodFilter,
  ])

  // Ordenação
  const sortedPlans = useMemo(() => {
    const sorted = [...filteredPlans]
    sorted.sort((a, b) => {
      let valA: any = a[sortField]
      let valB: any = b[sortField]

      if (valA === undefined || valA === null) valA = ''
      if (valB === undefined || valB === null) valB = ''

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(String(valB))
        return sortDirection === 'asc' ? cmp : -cmp
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA
    })
    return sorted
  }, [filteredPlans, sortField, sortDirection])

  // Paginação
  const totalItems = sortedPlans.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedPlans.slice(start, start + pageSize)
  }, [sortedPlans, currentPage, pageSize])

  const handleSort = (field: keyof MPMultipleCuttingPlanRecord) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setCenterFilter('ALL')
    setLineFilter('ALL')
    setStatusFilter('ALL')
    setTypeFilter('ALL')
    setSteelGradeFilter('ALL')
    setPeriodFilter('ALL')
    setCurrentPage(1)
  }

  const handleOpenViewer = (plan: MPMultipleCuttingPlanRecord) => {
    setSelectedPlanForModal(plan)
    setIsViewerModalOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* BARRA DE FILTROS NO PADRÃO CIAFAL */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Pesquisar por Código, Material, Lote, Corrida ou Responsável..."
              className="pl-9 pr-8 h-9 text-xs bg-white border-slate-300 focus-visible:ring-[#004C97]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <strong className="text-slate-900 font-bold">{totalItems}</strong>
              <span className="text-slate-400">/{plans.length}</span> registros
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchPlans}
              disabled={isLoading}
              className="h-8 text-xs font-semibold gap-1 text-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            {(searchTerm ||
              centerFilter !== 'ALL' ||
              lineFilter !== 'ALL' ||
              statusFilter !== 'ALL' ||
              typeFilter !== 'ALL' ||
              periodFilter !== 'ALL' ||
              steelGradeFilter !== 'ALL') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* COMBOS DE FILTRO */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-slate-100">
          <div>
            <Select
              value={periodFilter}
              onValueChange={(val: any) => {
                setPeriodFilter(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-8 text-xs border-slate-300 bg-white">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todo Período</SelectItem>
                <SelectItem value="7D">Últimos 7 dias</SelectItem>
                <SelectItem value="30D">Últimos 30 dias</SelectItem>
                <SelectItem value="90D">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={typeFilter}
              onValueChange={(val) => {
                setTypeFilter(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-8 text-xs border-slate-300 bg-white">
                <SelectValue placeholder="Tipo de Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Tipos</SelectItem>
                <SelectItem value="multiplo">Plano Múltiplo</SelectItem>
                <SelectItem value="blocos">Plano Blocos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-8 text-xs border-slate-300 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Status</SelectItem>
                <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                <SelectItem value="EM_REVISAO">Em Revisão</SelectItem>
                <SelectItem value="APROVADO">Aprovado</SelectItem>
                <SelectItem value="LIBERADO">Liberado</SelectItem>
                <SelectItem value="EXECUTADO">Executado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={centerFilter}
              onValueChange={(val) => {
                setCenterFilter(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-8 text-xs border-slate-300 bg-white">
                <SelectValue placeholder="Centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Centros</SelectItem>
                {availableCenters.map((c) => (
                  <SelectItem key={c} value={c}>
                    Centro {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={lineFilter}
              onValueChange={(val) => {
                setLineFilter(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-8 text-xs border-slate-300 bg-white">
                <SelectValue placeholder="Linha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Linhas</SelectItem>
                {availableLines.map((l) => (
                  <SelectItem key={l} value={l}>
                    Linha {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={steelGradeFilter}
              onValueChange={(val) => {
                setSteelGradeFilter(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-8 text-xs border-slate-300 bg-white">
                <SelectValue placeholder="Tipo de Aço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Aços</SelectItem>
                {availableSteels.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* TABELA DE HISTÓRICO DE PLANOS */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-[10px] select-none">
              <tr>
                <th
                  onClick={() => handleSort('plan_code')}
                  className="p-3 cursor-pointer hover:bg-slate-100 font-bold"
                >
                  <div className="flex items-center gap-1">
                    Código <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('plan_type')}
                  className="p-3 cursor-pointer hover:bg-slate-100"
                >
                  Tipo
                </th>
                <th
                  onClick={() => handleSort('created')}
                  className="p-3 cursor-pointer hover:bg-slate-100"
                >
                  Criação
                </th>
                <th className="p-3">Centro/Linha</th>
                <th className="p-3">Material</th>
                <th className="p-3">Lote/Corrida</th>
                <th
                  onClick={() => handleSort('block_weight_tons')}
                  className="p-3 text-right cursor-pointer hover:bg-slate-100"
                >
                  Peso Plan. (t)
                </th>
                <th className="p-3 text-center">Peças</th>
                <th
                  onClick={() => handleSort('cutting_yield_pct')}
                  className="p-3 text-right cursor-pointer hover:bg-slate-100 font-bold text-emerald-800"
                >
                  Rendimento (%)
                </th>
                <th className="p-3 text-center">Versão</th>
                <th className="p-3">Status</th>
                <th className="p-3">Responsável</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-500 font-mono text-xs">
                    Carregando histórico de planos de corte...
                  </td>
                </tr>
              ) : paginatedPlans.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-500 text-xs">
                    Nenhum plano de corte encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedPlans.map((plan) => {
                  const createdDate = plan.created
                    ? new Date(plan.created).toLocaleDateString('pt-BR')
                    : '-'
                  const isLatest = plan.is_latest !== false

                  return (
                    <tr
                      key={plan.id}
                      className={`hover:bg-blue-50/40 transition-colors ${!isLatest ? 'opacity-70 bg-slate-50/50' : ''}`}
                    >
                      <td className="p-3 font-mono font-bold text-[#004C97] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{plan.plan_code}</span>
                          {isLatest && (
                            <span
                              className="w-2 h-2 rounded-full bg-emerald-500"
                              title="Versão mais recente"
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold border-slate-300"
                        >
                          {plan.plan_type || 'MÚLTIPLO'}
                        </Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600 font-mono">
                        {createdDate}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-700">
                        {plan.center_code || '1020'} {plan.line_code ? `/ ${plan.line_code}` : ''}
                      </td>
                      <td className="p-3 max-w-[200px] truncate" title={plan.material_description}>
                        <div className="font-mono font-bold text-slate-900">
                          {plan.material_code}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {plan.material_description || plan.steel_grade || '-'}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        <div>LT: {plan.batch_number || '-'}</div>
                        <div>CR: {plan.heat_number || '-'}</div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatNumberPtBr(plan.block_weight_tons || 0, 3)} t
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">
                        {plan.pieces_count || 0}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                        {formatNumberPtBr(plan.cutting_yield_pct || 0, 2)}%
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <Badge className="bg-blue-50 text-[#004C97] border-blue-200 font-mono text-[10px]">
                          v0{plan.version || 1}
                        </Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            plan.status === 'APROVADO'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : plan.status === 'EM_REVISAO'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {plan.status || 'RASCUNHO'}
                        </Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600 text-[11px]">
                        {plan.responsible_user_name || plan.created_by_user_name || '-'}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenViewer(plan)}
                            className="h-7 px-2 text-xs text-[#004C97] hover:bg-blue-50 font-bold gap-1"
                            title="Visualizar Detalhes do Plano"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Visualizar
                          </Button>
                          {onSelectPlanToEdit && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onSelectPlanToEdit(plan)}
                              className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-100"
                              title="Carregar para Edição"
                            >
                              Editar
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

        {/* PAGINAÇÃO */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Linhas por página:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs bg-white border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-slate-400">|</span>
            <span>
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 p-0 bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 w-7 p-0 bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* POPUP AMPLO E RESPONSIVO DE VISUALIZAÇÃO COM VERSÕES E PDF */}
      {selectedPlanForModal && (
        <MPCuttingPlanViewerModal
          isOpen={isViewerModalOpen}
          onClose={() => setIsViewerModalOpen(false)}
          plan={selectedPlanForModal}
          onSelectVersion={(v) => setSelectedPlanForModal(v)}
        />
      )}
    </div>
  )
}
