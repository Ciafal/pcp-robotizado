import React, { useState, useMemo } from 'react'
import {
  InventoryDemand,
  InventoryDemandStatus,
  InventoryDemandPriority,
} from '@/types/pcp-inventory-demands'
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
  Sparkles,
  AlertTriangle,
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

interface DemandasInventarioTableProps {
  demands: InventoryDemand[]
  loading?: boolean
  onVisualizar: (demand: InventoryDemand) => void
  onLancar: (demand: InventoryDemand) => void
  onHistorico: (demand: InventoryDemand) => void
  onCancelar: (demand: InventoryDemand, motivo: string) => Promise<void>
  onRefresh: () => void
}

type QuickFilterType = 'TODAS' | 'HOJE' | 'PENDENTES' | 'EM_INVENTARIO' | 'CONCLUIDAS' | 'URGENTES'

export const DemandasInventarioTable: React.FC<DemandasInventarioTableProps> = ({
  demands,
  loading,
  onVisualizar,
  onLancar,
  onHistorico,
  onCancelar,
  onRefresh,
}) => {
  // Filtros rápidos
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('TODAS')

  // Filtros detalhados
  const [filterControl, setFilterControl] = useState('')
  const [filterCenter, setFilterCenter] = useState('')
  const [filterDeposit, setFilterDeposit] = useState('')
  const [filterMaterial, setFilterMaterial] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('TODAS')
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  // Modal Cancelar
  const [cancelModalDemand, setCancelModalDemand] = useState<InventoryDemand | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  // Modal Visualizar Demanda
  const [viewDemand, setViewDemand] = useState<InventoryDemand | null>(null)

  const handleClearFilters = () => {
    setQuickFilter('TODAS')
    setFilterControl('')
    setFilterCenter('')
    setFilterDeposit('')
    setFilterMaterial('')
    setFilterPriority('TODAS')
    setFilterStatus('TODOS')
    setFilterStartDate('')
    setFilterEndDate('')
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
        if (d.status !== 'Gerada' && d.status !== 'Inventário parcial') return false
      } else if (quickFilter === 'EM_INVENTARIO') {
        if (d.status !== 'Em inventário' && d.status !== 'Inventário parcial') return false
      } else if (quickFilter === 'CONCLUIDAS') {
        if (d.status !== 'Inventário concluído') return false
      } else if (quickFilter === 'URGENTES') {
        if (d.priority !== 'Urgente' && d.priority !== 'Alta') return false
      }

      // 2. Filtros detalhados
      if (filterControl && !d.control_number.toLowerCase().includes(filterControl.toLowerCase())) {
        return false
      }
      if (filterCenter && !d.center.toLowerCase().includes(filterCenter.toLowerCase())) {
        return false
      }
      if (filterDeposit && !d.storage_deposit.toLowerCase().includes(filterDeposit.toLowerCase())) {
        return false
      }
      if (
        filterMaterial &&
        !d.material_code.toLowerCase().includes(filterMaterial.toLowerCase()) &&
        !d.material_description?.toLowerCase().includes(filterMaterial.toLowerCase())
      ) {
        return false
      }
      if (filterPriority !== 'TODAS' && d.priority !== filterPriority) {
        return false
      }
      if (filterStatus !== 'TODOS' && d.status !== filterStatus) {
        return false
      }

      return true
    })
  }, [
    demands,
    quickFilter,
    filterControl,
    filterCenter,
    filterDeposit,
    filterMaterial,
    filterPriority,
    filterStatus,
    filterStartDate,
    filterEndDate,
  ])

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

  const renderStatusBadge = (status: InventoryDemandStatus) => {
    switch (status) {
      case 'Gerada':
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-300 font-semibold text-[10px]">
            Gerada
          </Badge>
        )
      case 'Em inventário':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]">
            Em inventário
          </Badge>
        )
      case 'Inventário parcial':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-medium text-[10px]">
            Inventário parcial
          </Badge>
        )
      case 'Inventário concluído':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
            Inventário concluído
          </Badge>
        )
      case 'Cancelada':
        return (
          <Badge className="bg-slate-100 text-slate-500 border-slate-300 line-through text-[10px]">
            Cancelada
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
            Painel consolidado das solicitações de inventário, status físico e ações autorizadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Filtros Detalhados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs bg-slate-50/60 p-3 rounded-lg border border-slate-200/80">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nº Controle</label>
          <div className="relative mt-0.5">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
            <Input
              value={filterControl}
              onChange={(e) => setFilterControl(e.target.value)}
              placeholder="INV-2026-..."
              className="text-xs h-7 pl-6 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Centro</label>
          <Input
            value={filterCenter}
            onChange={(e) => setFilterCenter(e.target.value)}
            placeholder="FORNOL1"
            className="text-xs h-7 mt-0.5"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Depósito</label>
          <Input
            value={filterDeposit}
            onChange={(e) => setFilterDeposit(e.target.value)}
            placeholder="DP07"
            className="text-xs h-7 mt-0.5"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Material</label>
          <Input
            value={filterMaterial}
            onChange={(e) => setFilterMaterial(e.target.value)}
            placeholder="Código ou descrição"
            className="text-xs h-7 mt-0.5"
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
            <option value="Inventário parcial">Inventário parcial</option>
            <option value="Inventário concluído">Inventário concluído</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Tabela de Demandas */}
      <div className="rounded-lg border border-slate-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 text-[11px] font-bold">
              <TableHead className="w-[140px]">Nº Controle</TableHead>
              <TableHead className="w-[130px]">Data/Hora</TableHead>
              <TableHead className="w-[90px]">Prioridade</TableHead>
              <TableHead className="w-[90px]">Centro</TableHead>
              <TableHead className="w-[80px]">Depósito</TableHead>
              <TableHead className="w-[120px]">Material</TableHead>
              <TableHead className="min-w-[180px]">Descrição</TableHead>
              <TableHead className="w-[110px] text-right">Qtd. Prevista</TableHead>
              <TableHead className="w-[110px] text-right">Qtd. Apurada</TableHead>
              <TableHead className="w-[120px] text-center">Status</TableHead>
              <TableHead className="w-[140px]">Solicitante</TableHead>
              <TableHead className="w-[180px] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-xs text-slate-500">
                  Carregando demandas de inventário...
                </TableCell>
              </TableRow>
            ) : filteredDemands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-xs text-slate-500">
                  Nenhuma demanda de inventário encontrada com os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredDemands.map((demand) => (
                <TableRow key={demand.id} className="text-xs hover:bg-slate-50/70">
                  <TableCell className="font-mono font-bold text-[#004C97]">
                    {demand.control_number}
                  </TableCell>
                  <TableCell className="text-slate-600 font-mono text-[11px]">
                    {demand.generation_date_formatted || '—'}
                  </TableCell>
                  <TableCell>{renderPriorityBadge(demand.priority)}</TableCell>
                  <TableCell className="font-semibold">{demand.center}</TableCell>
                  <TableCell className="font-semibold">{demand.storage_deposit}</TableCell>
                  <TableCell className="font-mono font-semibold">{demand.material_code}</TableCell>
                  <TableCell
                    className="text-slate-700 truncate max-w-[200px]"
                    title={demand.material_description}
                  >
                    {demand.material_description || '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {demand.total_pieces_required || 0} pçs
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-[#004C97]">
                    {demand.total_pieces_inventoried ?? 0} pçs
                  </TableCell>
                  <TableCell className="text-center">{renderStatusBadge(demand.status)}</TableCell>
                  <TableCell
                    className="text-slate-600 truncate max-w-[140px]"
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
                          setViewDemand(demand)
                          onVisualizar(demand)
                        }}
                        title="Visualizar Detalhes"
                        className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>

                      {/* Lançar Inventário (apenas se não cancelada e não concluída) */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onLancar(demand)}
                        disabled={
                          demand.status === 'Cancelada' || demand.status === 'Inventário concluído'
                        }
                        title="Lançar Inventário"
                        className="h-7 w-7 p-0 text-[#004C97] hover:text-[#003B75] hover:bg-blue-50 disabled:opacity-30"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
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

                      {/* Cancelar (apenas se não concluída e não cancelada) */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCancelModalDemand(demand)
                          setCancelReason('')
                        }}
                        disabled={
                          demand.status === 'Cancelada' || demand.status === 'Inventário concluído'
                        }
                        title="Cancelar Demanda"
                        className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50 disabled:opacity-30"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Visualizar Demanda */}
      {viewDemand && (
        <Dialog open={Boolean(viewDemand)} onOpenChange={() => setViewDemand(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Demanda de Inventário {viewDemand.control_number}</span>
                {renderStatusBadge(viewDemand.status)}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Informações completas do cadastro da demanda de matéria-prima.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs py-2">
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Empresa
                </span>
                <span className="font-semibold text-slate-800">{viewDemand.company}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Linha</span>
                <span className="font-semibold text-slate-800">{viewDemand.line}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Centro</span>
                <span className="font-semibold text-slate-800">{viewDemand.center}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Depósito
                </span>
                <span className="font-semibold text-slate-800">{viewDemand.storage_deposit}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Código MP
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {viewDemand.material_code}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Prioridade
                </span>
                <span>{renderPriorityBadge(viewDemand.priority)}</span>
              </div>
              <div className="col-span-2 sm:col-span-3 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Descrição MP
                </span>
                <span className="text-slate-800">{viewDemand.material_description || '—'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Qtd. Prevista
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {viewDemand.total_pieces_required || 0} pçs
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Qtd. Apurada
                </span>
                <span className="font-mono font-bold text-[#004C97]">
                  {viewDemand.total_pieces_inventoried || 0} pçs
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Divergência
                </span>
                <span className="font-mono font-bold text-amber-700">
                  {viewDemand.divergence_pieces || 0} pçs (
                  {viewDemand.divergence_pct
                    ? `${String(viewDemand.divergence_pct).replace('.', ',')}%`
                    : '0%'}
                  )
                </span>
              </div>
              {viewDemand.observation && (
                <div className="col-span-2 sm:col-span-3 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Observação
                  </span>
                  <span className="text-slate-800">{viewDemand.observation}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button size="sm" onClick={() => setViewDemand(null)} className="text-xs">
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
                    Cancelar Demanda {cancelModalDemand.control_number}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Informe a justificativa do cancelamento. Esta ação será auditada na timeline.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Motivo do Cancelamento *
                </Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex.: Necessidade de inventário reavaliada pelo PCP, lote alocado para outra linha..."
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
