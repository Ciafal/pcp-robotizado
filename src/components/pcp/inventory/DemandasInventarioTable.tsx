import React, { useState, useMemo, useCallback } from 'react'
import {
  InventoryDemand,
  InventoryDemandStatus,
  InventoryDemandPriority,
} from '@/types/pcp-inventory-demands'
import { pcpStorageDepositsService } from '@/services/pcp-storage-deposits-service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Eye,
  ClipboardCheck,
  History,
  Ban,
  Filter,
  Search,
  RotateCcw,
  Boxes,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  pcpInventoryDemandsService,
  DemandMaterialItem,
} from '@/services/pcp-inventory-demands-service'
import { useToast } from '@/hooks/use-toast'
import { formatPtBrNumber } from '@/lib/number-format'

interface DemandasInventarioTableProps {
  demands: InventoryDemand[]
  loading?: boolean
  onVisualizar: (demand: InventoryDemand) => void
  onLancar: (demand: InventoryDemand) => void
  onHistorico: (demand: InventoryDemand) => void
  onCancelar: (demand: InventoryDemand, motivo: string) => Promise<void>
  onRefresh: () => void
  externalViewDemand?: InventoryDemand | null
  onClearExternalViewDemand?: () => void
  lastCreatedDemand?: InventoryDemand | null
}

type QuickFilterType = 'TODAS' | 'HOJE' | 'PENDENTES' | 'EM_INVENTARIO' | 'CONCLUIDAS' | 'URGENTES'

// Formata data brasileira padrão dd/mm/aaaa, HH:mm
const formatPtBrDate = (dateVal?: string): string => {
  if (!dateVal) return '—'
  if (dateVal.includes('/') && dateVal.includes(':')) {
    return dateVal
  }
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return dateVal
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year}, ${hours}:${mins}`
  } catch {
    return dateVal
  }
}

// Formatação com vírgula decimal
const formatBrNumber = (num?: number | null, decimals = 3): string => {
  if (num == null || isNaN(num)) return '0,000'
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export const DemandasInventarioTable: React.FC<DemandasInventarioTableProps> = ({
  demands,
  loading,
  onVisualizar,
  onLancar,
  onHistorico,
  onCancelar,
  onRefresh,
  externalViewDemand,
  onClearExternalViewDemand,
  lastCreatedDemand,
}) => {
  const { toast } = useToast()
  const [reopeningId, setReopeningId] = useState<string | null>(null)

  const handleReopenDemand = async (demand: InventoryDemand) => {
    if (!demand.id || reopeningId) return
    setReopeningId(demand.id)
    try {
      const reaberta = await pcpInventoryDemandsService.reopenDemand(demand.id)
      toast({
        title: 'Demanda Reaberta',
        description: `Demanda ${reaberta.control_number} reaberta com sucesso no Ciclo ${reaberta.cycle_count || 2}.`,
      })
      onRefresh()
      onLancar(reaberta)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao reabrir demanda',
        description: err?.message || 'Falha ao reabrir demanda cancelada.',
      })
    } finally {
      setReopeningId(null)
    }
  }
  // Filtros rápidos
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('TODAS')

  // Filtros detalhados
  const [filterControl, setFilterControl] = useState('')
  const [filterOrder, setFilterOrder] = useState('')
  const [filterCenter, setFilterCenter] = useState('')
  const [filterDeposit, setFilterDeposit] = useState('')
  const [filterMaterial, setFilterMaterial] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('TODAS')
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')

  // Modal Cancelar
  const [cancelModalDemand, setCancelModalDemand] = useState<InventoryDemand | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  // Modal Visualizar Demanda
  const [viewDemand, setViewDemand] = useState<InventoryDemand | null>(null)
  const [viewItems, setViewItems] = useState<DemandMaterialItem[]>([])
  const [loadingViewData, setLoadingViewData] = useState<boolean>(false)

  // Identifica demanda recém-criada para destacar aviso discreto quando não atender aos filtros ativos
  const [justCreatedDemand, setJustCreatedDemand] = useState<InventoryDemand | null>(null)

  React.useEffect(() => {
    if (lastCreatedDemand) {
      setJustCreatedDemand(lastCreatedDemand)
    }
  }, [lastCreatedDemand])

  const openVisualizarFresh = useCallback(async (baseDemand: InventoryDemand) => {
    setViewDemand(baseDemand)
    setLoadingViewData(true)
    try {
      // Reconsulta o backend por id/control_number para garantir a fonte única da verdade
      const [freshDemand, items] = await Promise.all([
        baseDemand.id ? pcpInventoryDemandsService.getDemandById(baseDemand.id) : null,
        pcpInventoryDemandsService.listItemsByDemand(baseDemand.id, baseDemand.control_number),
      ])

      if (freshDemand) {
        setViewDemand(freshDemand)
      }
      setViewItems(items)
    } catch (err) {
      console.warn('Erro ao carregar dados frescos para visualização:', err)
      setViewItems([])
    } finally {
      setLoadingViewData(false)
    }
  }, [])

  // Sincroniza abertura externa de visualização (ex.: acionada via popup de sucesso)
  React.useEffect(() => {
    if (externalViewDemand) {
      openVisualizarFresh(externalViewDemand)
      setJustCreatedDemand(externalViewDemand)
    }
  }, [externalViewDemand, openVisualizarFresh])

  const handleCloseViewDemand = () => {
    setViewDemand(null)
    setViewItems([])
    if (onClearExternalViewDemand) {
      onClearExternalViewDemand()
    }
  }

  const handleClearFilters = () => {
    setQuickFilter('TODAS')
    setFilterControl('')
    setFilterOrder('')
    setFilterCenter('')
    setFilterDeposit('')
    setFilterMaterial('')
    setFilterPriority('TODAS')
    setFilterStatus('TODOS')
  }

  const handleConfirmCancel = async () => {
    if (!cancelModalDemand || !cancelReason.trim()) return
    setCancelLoading(true)
    try {
      await onCancelar(cancelModalDemand, cancelReason.trim())
      setCancelModalDemand(null)
      setCancelReason('')
    } finally {
      setCancelLoading(false)
    }
  }

  const filteredDemands = useMemo(() => {
    const today = new Date()
    const todayDay = String(today.getDate()).padStart(2, '0')
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0')
    const todayYear = today.getFullYear()
    const todayStrPt = `${todayDay}/${todayMonth}/${todayYear}`

    return demands.filter((d) => {
      // 1. Filtros rápidos
      if (quickFilter === 'HOJE') {
        if (!d.generation_date_formatted?.startsWith(todayStrPt)) return false
      } else if (quickFilter === 'PENDENTES') {
        if (isCancelledStatus(d.status) || isConcludedStatus(d.status)) return false
      } else if (quickFilter === 'EM_INVENTARIO') {
        if (d.status !== 'Em inventário' && !isPartialStatus(d.status)) return false
      } else if (quickFilter === 'CONCLUIDAS') {
        if (!isConcludedStatus(d.status)) return false
      } else if (quickFilter === 'URGENTES') {
        if (d.priority !== 'Urgente' && d.priority !== 'Alta') return false
      }

      // 2. Filtros detalhados
      if (filterControl && !d.control_number.toLowerCase().includes(filterControl.toLowerCase())) {
        return false
      }
      if (
        filterOrder &&
        (!d.production_order ||
          !d.production_order.toLowerCase().includes(filterOrder.toLowerCase()))
      ) {
        return false
      }
      if (filterCenter && !d.center.toLowerCase().includes(filterCenter.toLowerCase())) {
        return false
      }
      if (filterDeposit && !d.storage_deposit.toLowerCase().includes(filterDeposit.toLowerCase())) {
        return false
      }
      if (filterMaterial) {
        const matTerm = filterMaterial.toLowerCase()
        const matchMain =
          d.material_code.toLowerCase().includes(matTerm) ||
          d.material_description?.toLowerCase().includes(matTerm)
        const matchItems = d.materials_summary?.some(
          (m) =>
            m.material_code.toLowerCase().includes(matTerm) ||
            m.material_description?.toLowerCase().includes(matTerm),
        )
        if (!matchMain && !matchItems) return false
      }
      if (filterPriority !== 'TODAS' && d.priority !== filterPriority) {
        return false
      }
      if (filterStatus !== 'TODOS') {
        if (filterStatus === 'Cancelado') {
          if (!isCancelledStatus(d.status)) return false
        } else if (filterStatus === 'Concluído') {
          if (!isConcludedStatus(d.status)) return false
        } else if (filterStatus === 'Parcial') {
          if (!isPartialStatus(d.status)) return false
        } else if (d.status !== filterStatus) {
          return false
        }
      }

      return true
    })
  }, [
    demands,
    quickFilter,
    filterControl,
    filterOrder,
    filterCenter,
    filterDeposit,
    filterMaterial,
    filterPriority,
    filterStatus,
  ])

  // Checa se a demanda criada atende ou não aos filtros ativos
  const demandHiddenByFilter = useMemo(() => {
    if (!justCreatedDemand) return false
    // Se a demanda recém-criada existe no array de demands mas NÃO está presente em filteredDemands:
    const existsInAll = demands.some(
      (d) => d.id === justCreatedDemand.id || d.control_number === justCreatedDemand.control_number,
    )
    const existsInFiltered = filteredDemands.some(
      (d) => d.id === justCreatedDemand.id || d.control_number === justCreatedDemand.control_number,
    )
    return existsInAll && !existsInFiltered
  }, [justCreatedDemand, demands, filteredDemands])

  const renderPriorityBadge = (priority: InventoryDemandPriority) => {
    switch (priority) {
      case 'Urgente':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">
            Urgente
          </Badge>
        )
      case 'Alta':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-[10px]">
            Alta
          </Badge>
        )
      case 'Normal':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-[10px]">
            Normal
          </Badge>
        )
      case 'Baixa':
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-normal text-[10px]">
            Baixa
          </Badge>
        )
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const isCancelledStatus = (st?: string) => {
    if (!st) return false
    const s = st.trim().toLowerCase()
    return s === 'cancelado' || s === 'cancelada'
  }

  const isConcludedStatus = (st?: string) => {
    if (!st) return false
    const s = st.trim().toLowerCase()
    return (
      s === 'concluído' ||
      s === 'concluido' ||
      s === 'inventário concluído' ||
      s === 'inventario concluido'
    )
  }

  const isPartialStatus = (st?: string) => {
    if (!st) return false
    const s = st.trim().toLowerCase()
    return s === 'parcial' || s === 'inventário parcial' || s === 'inventario parcial'
  }

  const renderStatusBadge = (status: InventoryDemandStatus | string) => {
    if (isCancelledStatus(status)) {
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">
          {status === 'Cancelado' ? 'Cancelado' : status}
        </Badge>
      )
    }
    if (isConcludedStatus(status)) {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
          {status === 'Concluído' ? 'Concluído' : status}
        </Badge>
      )
    }
    if (isPartialStatus(status)) {
      return (
        <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]">
          {status === 'Parcial' ? 'Parcial' : status}
        </Badge>
      )
    }
    switch (status) {
      case 'Gerada':
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-300 font-semibold text-[10px]">
            Gerada
          </Badge>
        )
      case 'Em inventário':
        return (
          <Badge className="bg-sky-100 text-sky-900 border-sky-300 font-bold text-[10px]">
            Em inventário
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
      {/* Título da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#004C97]" />
            Demandas de Inventário de Matéria-Prima
          </h2>
          <p className="text-xs text-slate-500">
            Painel consolidado das solicitações de inventário, Ordem de Produção e status físico.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearFilters}
            className="text-xs h-7 text-slate-600 gap-1"
          >
            Limpar Filtros
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="text-xs h-7 text-slate-600 gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            Atualizar Lista
          </Button>
        </div>
      </div>

      {/* Filtros Rápidos */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3 text-[#004C97]" />
          Filtros Rápidos:
        </span>
        {(
          [
            { id: 'TODAS', label: 'Todas' },
            { id: 'HOJE', label: 'Hoje' },
            { id: 'PENDENTES', label: 'Pendentes' },
            { id: 'EM_INVENTARIO', label: 'Em Inventário' },
            { id: 'CONCLUIDAS', label: 'Concluídas' },
            { id: 'URGENTES', label: 'Urgentes' },
          ] as const
        ).map((f) => {
          const active = quickFilter === f.id
          return (
            <Button
              key={f.id}
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => setQuickFilter(f.id)}
              className={`h-7 px-2.5 text-xs font-semibold ${
                active
                  ? 'bg-[#004C97] text-white hover:bg-[#003B75]'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </Button>
          )
        })}
      </div>

      {/* Alerta discreto quando a demanda recém-gerada não aparece nos filtros atuais */}
      {demandHiddenByFilter && (
        <div className="p-2.5 rounded-lg bg-blue-50/90 border border-blue-200 text-blue-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              Demanda gerada com sucesso. O registro não aparece no filtro atual.
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearFilters}
            className="text-xs h-6 px-2 text-[#004C97] hover:bg-blue-100 font-bold"
          >
            Exibir todos os registros
          </Button>
        </div>
      )}

      {/* Filtros Detalhados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs bg-slate-50/60 p-3 rounded-lg border border-slate-200/80">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nº Controle</label>
          <div className="relative mt-0.5">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
            <Input
              value={filterControl}
              onChange={(e) => setFilterControl(e.target.value)}
              placeholder="INV-..."
              className="text-xs h-7 pl-6 font-mono bg-white"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">
            Ordem de Produção
          </label>
          <div className="relative mt-0.5">
            <FileSpreadsheet className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
            <Input
              value={filterOrder}
              onChange={(e) => setFilterOrder(e.target.value)}
              placeholder="OP / Nº Ordem..."
              className="text-xs h-7 pl-6 font-mono bg-white"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Centro</label>
          <Input
            value={filterCenter}
            onChange={(e) => setFilterCenter(e.target.value)}
            placeholder="Centro..."
            className="text-xs h-7 mt-0.5 bg-white"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Depósito</label>
          <Input
            value={filterDeposit}
            onChange={(e) => setFilterDeposit(e.target.value)}
            placeholder="Depósito..."
            className="text-xs h-7 mt-0.5 bg-white"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Material / MP</label>
          <Input
            value={filterMaterial}
            onChange={(e) => setFilterMaterial(e.target.value)}
            placeholder="Código ou descrição"
            className="text-xs h-7 mt-0.5 bg-white"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Prioridade</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-full text-xs h-7 px-2 rounded-md border border-slate-300 bg-white mt-0.5 font-medium"
          >
            <option value="TODAS">Todas</option>
            <option value="Baixa">Baixa</option>
            <option value="Normal">Normal</option>
            <option value="Alta">Alta</option>
            <option value="Urgente">Urgente</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full text-xs h-7 px-2 rounded-md border border-slate-300 bg-white mt-0.5 font-medium"
          >
            <option value="TODOS">Todos</option>
            <option value="Gerada">Gerada</option>
            <option value="Em inventário">Em inventário</option>
            <option value="Parcial">Parcial</option>
            <option value="Inventário parcial">Inventário parcial</option>
            <option value="Concluído">Concluído</option>
            <option value="Inventário concluído">Inventário concluído</option>
            <option value="Cancelado">Cancelado</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Tabela de Demandas com rolagem interna */}
      <div className="rounded-lg border border-slate-200 overflow-x-auto max-w-full">
        <Table className="min-w-[1100px]">
          <TableHeader>
            <TableRow className="bg-slate-50 text-[11px] font-bold">
              <TableHead className="w-[140px]">Nº Controle</TableHead>
              <TableHead className="w-[120px]">Ordem Produção</TableHead>
              <TableHead className="w-[130px]">Data/Hora</TableHead>
              <TableHead className="w-[85px]">Prioridade</TableHead>
              <TableHead className="w-[80px]">Centro</TableHead>
              <TableHead className="w-[80px]">Depósito</TableHead>
              <TableHead className="w-[150px]">Matérias-Primas</TableHead>
              <TableHead className="min-w-[180px]">Descrição / Corridas</TableHead>
              <TableHead className="w-[110px] text-right">Qtd. Prevista</TableHead>
              <TableHead className="w-[110px] text-right">Qtd. Apurada</TableHead>
              <TableHead className="w-[120px] text-center">Status</TableHead>
              <TableHead className="w-[130px]">Solicitante</TableHead>
              <TableHead className="w-[150px] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-xs text-slate-500">
                  Carregando demandas de inventário...
                </TableCell>
              </TableRow>
            ) : filteredDemands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-xs text-slate-500">
                  Nenhuma demanda de inventário encontrada com os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredDemands.map((demand) => {
                const multiCount = demand.materials_summary?.length || 1
                return (
                  <TableRow key={demand.id} className="text-xs hover:bg-slate-50/70">
                    <TableCell className="font-mono font-bold text-[#004C97] whitespace-nowrap">
                      {demand.control_number}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {demand.production_order ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {demand.production_order}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {formatPtBrDate(demand.generation_date_formatted || demand.created)}
                    </TableCell>
                    <TableCell>{renderPriorityBadge(demand.priority)}</TableCell>
                    <TableCell className="font-semibold">{demand.center || '—'}</TableCell>
                    <TableCell
                      className="font-semibold text-slate-800"
                      title={pcpStorageDepositsService.formatDepositLabel(demand.storage_deposit)}
                    >
                      {demand.storage_deposit ? (
                        <span>
                          <span className="font-mono">{demand.storage_deposit}</span>
                          {pcpStorageDepositsService.getDepositDescription(
                            demand.storage_deposit,
                          ) && (
                            <span className="text-[11px] text-slate-500 font-normal ml-1">
                              —{' '}
                              {pcpStorageDepositsService.getDepositDescription(
                                demand.storage_deposit,
                              )}
                            </span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {multiCount > 1 ? (
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-sky-50 text-[#004C97] border-[#004C97]/30 font-bold"
                          >
                            <Boxes className="w-2.5 h-2.5 mr-1" />
                            {multiCount} MPs
                          </Badge>
                          <span className="font-mono text-[11px] text-slate-600 truncate max-w-[80px]">
                            {demand.material_code}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono font-semibold">
                          {demand.material_code || '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-700 max-w-[220px]">
                      {demand.materials_summary && demand.materials_summary.length > 0 ? (
                        <div className="space-y-0.5 text-[11px]">
                          {demand.materials_summary.map((m, idx) => (
                            <div
                              key={idx}
                              className="truncate"
                              title={`${m.material_code} - Corrida: ${m.heat_number} (${formatBrNumber(m.quantity_tons, 3)} t / ${m.calculated_pieces} pç)`}
                            >
                              <span className="font-mono font-semibold text-[#004C97]">
                                {m.material_code}
                              </span>
                              : Corrida <span className="font-mono">{m.heat_number}</span> (
                              {formatBrNumber(m.quantity_tons, 3)} t / {m.calculated_pieces} pç)
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="truncate block" title={demand.material_description}>
                          {demand.material_description || '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold whitespace-nowrap">
                      {demand.total_pieces_required || 0} pç
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-[#004C97] whitespace-nowrap">
                      {demand.total_pieces_inventoried ?? 0} pç
                    </TableCell>
                    <TableCell className="text-center">
                      {renderStatusBadge(demand.status)}
                    </TableCell>
                    <TableCell
                      className="text-slate-600 truncate max-w-[130px]"
                      title={demand.requester_name}
                    >
                      {demand.requester_name || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {/* Visualizar */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            openVisualizarFresh(demand)
                            onVisualizar(demand)
                          }}
                          title="Visualizar Detalhes"
                          className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* Lançar Inventário / Reabrir Ciclo */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (isCancelledStatus(demand.status)) {
                              handleReopenDemand(demand)
                            } else {
                              onLancar(demand)
                            }
                          }}
                          disabled={isConcludedStatus(demand.status) || reopeningId === demand.id}
                          title={
                            isConcludedStatus(demand.status)
                              ? 'Inventário concluído — somente leitura. Lançamento não permitido.'
                              : isCancelledStatus(demand.status)
                                ? `Demanda cancelada: clique para reabrir novo ciclo (Ciclo ${(demand.cycle_count || 1) + 1}) e lançar.`
                                : 'Lançar Inventário'
                          }
                          className={`h-7 w-7 p-0 disabled:opacity-30 ${
                            isCancelledStatus(demand.status)
                              ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                              : 'text-[#004C97] hover:text-[#003B75] hover:bg-blue-50'
                          }`}
                        >
                          {reopeningId === demand.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isCancelledStatus(demand.status) ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : (
                            <ClipboardCheck className="w-3.5 h-3.5" />
                          )}
                        </Button>

                        {/* Histórico e Rastreabilidade */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onHistorico(demand)}
                          title="Histórico e Rastreabilidade"
                          className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>

                        {/* Cancelar */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setCancelModalDemand(demand)
                            setCancelReason('')
                          }}
                          disabled={
                            isCancelledStatus(demand.status) || isConcludedStatus(demand.status)
                          }
                          title={
                            isCancelledStatus(demand.status)
                              ? 'Demanda já cancelada'
                              : isConcludedStatus(demand.status)
                                ? 'Demanda já concluída'
                                : 'Cancelar Demanda'
                          }
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50 disabled:opacity-30"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Visualizar Demanda com todas as MPs */}
      {viewDemand && (
        <Dialog open={Boolean(viewDemand)} onOpenChange={(v) => !v && handleCloseViewDemand()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span>Demanda de Inventário {viewDemand.control_number}</span>
                {renderStatusBadge(viewDemand.status)}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Informações consolidadas da demanda, Ordem de Produção e matérias-primas por
                corrida.
              </DialogDescription>
            </DialogHeader>

            {loadingViewData ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-[#004C97]" />
                <span>Consultando dados atualizados no backend...</span>
              </div>
            ) : (
              <div className="space-y-4 py-2 text-xs">
                {/* Metadados gerais */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Ordem de Produção
                    </span>
                    <span className="font-mono font-bold text-[#004C97]">
                      {viewDemand.production_order || 'Dado não disponível'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Empresa / Linha
                    </span>
                    <span className="font-semibold text-slate-800">
                      {viewDemand.company || 'Dado não disponível'} /{' '}
                      {viewDemand.line || 'Dado não disponível'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Centro / Depósito
                    </span>
                    <span className="font-semibold text-slate-800">
                      {viewDemand.center || 'Dado não disponível'} /{' '}
                      <span className="font-mono">
                        {pcpStorageDepositsService.formatDepositLabel(viewDemand.storage_deposit) ||
                          'Dado não disponível'}
                      </span>
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Prioridade
                    </span>
                    <span>{renderPriorityBadge(viewDemand.priority)}</span>
                  </div>
                </div>

                {/* Motivo do Cancelamento (se aplicável) */}
                {isCancelledStatus(viewDemand.status) && viewDemand.cancellation_reason && (
                  <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-rose-900 text-xs">
                    <span className="text-[10px] uppercase font-bold text-rose-700 block mb-0.5">
                      Motivo do Cancelamento
                    </span>
                    <span className="font-semibold">{viewDemand.cancellation_reason}</span>
                    <div className="text-[10px] text-rose-600 mt-1">
                      Cancelado por: <strong>{viewDemand.cancelled_by || 'Responsável PCP'}</strong>
                      {viewDemand.cancelled_at && ` em ${viewDemand.cancelled_at}`}
                    </div>
                  </div>
                )}

                {/* Bloco de Responsabilidade e Rastreabilidade (Solicitante / Contagem / Conclusão) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Solicitante (Criou a Demanda)
                    </span>
                    <span className="font-semibold text-slate-800 block text-xs">
                      {viewDemand.requester_name || 'Programador PCP'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {viewDemand.generation_date_formatted ||
                        (viewDemand.created
                          ? new Date(viewDemand.created).toLocaleString('pt-BR')
                          : '—')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Usuário da Contagem
                    </span>
                    <span className="font-semibold text-slate-800 block text-xs">
                      {viewDemand.total_pieces_inventoried &&
                      viewDemand.total_pieces_inventoried > 0
                        ? 'Contagem registrada'
                        : isConcludedStatus(viewDemand.status)
                          ? viewDemand.concluded_by || 'Operador de Estoque'
                          : 'Aguardando contagem'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {viewDemand.total_pieces_inventoried
                        ? `${viewDemand.total_pieces_inventoried} peças contadas`
                        : 'Sem contagem ativa'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Usuário da Conclusão
                    </span>
                    <span className="font-semibold text-slate-800 block text-xs">
                      {isConcludedStatus(viewDemand.status)
                        ? viewDemand.concluded_by || 'Programador PCP'
                        : isCancelledStatus(viewDemand.status)
                          ? 'Cancelado'
                          : 'Demanda aberta'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {viewDemand.concluded_at
                        ? new Date(viewDemand.concluded_at).toLocaleString('pt-BR')
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Bitola e Aplicação */}
                {(viewDemand.gauge || viewDemand.application) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Bitola
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {viewDemand.gauge || 'Dado não disponível'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Aplicação
                      </span>
                      <span className="font-semibold text-slate-800">
                        {viewDemand.application || 'Dado não disponível'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Tabela de Matérias-Primas (1..N) - Fonte única da verdade */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Matérias-Primas Vinculadas
                  </span>
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 text-[10px]">
                        <TableRow>
                          <TableHead>Código MP</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Bitola</TableHead>
                          <TableHead>Aplicação</TableHead>
                          <TableHead>Corrida</TableHead>
                          <TableHead className="text-right">Qtd. (t)</TableHead>
                          <TableHead className="text-right">Peças Calculadas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {viewItems && viewItems.length > 0 ? (
                          viewItems.map((item, i) => (
                            <TableRow key={item.id || i}>
                              <TableCell className="font-mono font-bold text-[#004C97]">
                                {item.material_code || 'Dado não disponível'}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {item.material_description || 'Dado não disponível'}
                              </TableCell>
                              <TableCell className="font-mono text-slate-700">
                                {viewDemand.gauge || 'Não aplicável'}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {viewDemand.application || 'Não aplicável'}
                              </TableCell>
                              <TableCell className="font-mono font-semibold">
                                {item.heat_number ? item.heat_number : 'Sem corrida'}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatPtBrNumber(item.quantity_tons, 3, 3)} t
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                {formatPtBrNumber(item.calculated_pieces, 0, 0)} pç
                              </TableCell>
                            </TableRow>
                          ))
                        ) : viewDemand.materials_summary &&
                          viewDemand.materials_summary.length > 0 ? (
                          viewDemand.materials_summary.map((m, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono font-bold text-[#004C97]">
                                {m.material_code || 'Dado não disponível'}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {m.material_description || 'Dado não disponível'}
                              </TableCell>
                              <TableCell className="font-mono text-slate-700">
                                {viewDemand.gauge || 'Não aplicável'}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {viewDemand.application || 'Não aplicável'}
                              </TableCell>
                              <TableCell className="font-mono font-semibold">
                                {m.heat_number ? m.heat_number : 'Sem corrida'}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatPtBrNumber(m.quantity_tons, 3, 3)} t
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                {formatPtBrNumber(m.calculated_pieces, 0, 0)} pç
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="py-4 text-center text-rose-600 bg-rose-50/40"
                            >
                              <div className="flex items-center justify-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-500" />
                                <span>
                                  Nenhuma matéria-prima vinculada a esta demanda (Inconsistência de
                                  relacionamento).
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totais de Peças e Divergência */}
                {(() => {
                  const itemsPieces =
                    viewItems && viewItems.length > 0
                      ? viewItems.reduce((acc, it) => acc + (Number(it.calculated_pieces) || 0), 0)
                      : viewDemand.materials_summary && viewDemand.materials_summary.length > 0
                        ? viewDemand.materials_summary.reduce(
                            (acc, m) => acc + (Number(m.calculated_pieces) || 0),
                            0,
                          )
                        : Number(viewDemand.total_pieces_required) || 0

                  const totalPrevisto =
                    itemsPieces > 0 ? itemsPieces : Number(viewDemand.total_pieces_required) || 0
                  const totalApurado = Number(viewDemand.total_pieces_inventoried) || 0
                  const divergencia = totalApurado - totalPrevisto
                  const divPct = totalPrevisto > 0 ? (divergencia / totalPrevisto) * 100 : 0

                  return (
                    <div className="grid grid-cols-3 gap-2.5 bg-sky-50/60 p-3 rounded-lg border border-sky-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Qtd. Prevista Total
                        </span>
                        <span className="text-sm font-mono font-bold text-slate-900">
                          {formatPtBrNumber(totalPrevisto, 0, 0)} pç
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Qtd. Apurada
                        </span>
                        <span className="text-sm font-mono font-bold text-[#004C97]">
                          {formatPtBrNumber(totalApurado, 0, 0)} pç
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Divergência
                        </span>
                        <span
                          className={`text-sm font-mono font-bold ${divergencia < 0 ? 'text-amber-700' : divergencia > 0 ? 'text-blue-700' : 'text-emerald-700'}`}
                        >
                          {formatPtBrNumber(divergencia, 0, 0)} pç ({formatPtBrNumber(divPct, 2, 2)}
                          %)
                        </span>
                      </div>
                    </div>
                  )
                })()}

                {viewDemand.observation && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Observação / Justificativa
                    </span>
                    <span className="text-slate-800">{viewDemand.observation}</span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button size="sm" onClick={handleCloseViewDemand} className="text-xs">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Cancelar Demanda */}
      {cancelModalDemand && (
        <Dialog open={Boolean(cancelModalDemand)} onOpenChange={() => setCancelModalDemand(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-slate-900">
                    Cancelar inventário?
                  </DialogTitle>
                  <div className="text-xs text-slate-600 mt-1">
                    Demanda:{' '}
                    <span className="font-mono font-bold text-slate-900">
                      {cancelModalDemand.control_number}
                    </span>
                  </div>
                  <DialogDescription className="text-xs text-slate-500 mt-1">
                    O inventário será cancelado e não aceitará novas contagens. Esta ação ficará
                    registrada no histórico.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Motivo do cancelamento *
                </Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Informe o motivo do cancelamento obrigatoriamente..."
                  rows={3}
                  className="text-xs resize-none mt-1"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelModalDemand(null)}
                disabled={cancelLoading}
                className="text-xs"
              >
                Voltar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirmCancel}
                disabled={cancelLoading || !cancelReason.trim()}
                className="text-xs font-bold"
              >
                {cancelLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
