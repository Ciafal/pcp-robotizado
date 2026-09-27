import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import {
  InventoryAuditEvent,
  InventoryDemand,
  InventoryAuditEventType,
} from '@/types/pcp-inventory-demands'
import {
  History,
  Search,
  RotateCcw,
  ShieldCheck,
  Calendar,
  User,
  Hash,
  Activity,
  Layers,
} from 'lucide-react'

interface HistoricoRastreabilidadeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDemand?: InventoryDemand | null
  demands: InventoryDemand[]
}

export const HistoricoRastreabilidadeModal: React.FC<HistoricoRastreabilidadeModalProps> = ({
  open,
  onOpenChange,
  selectedDemand,
  demands,
}) => {
  const [activeDemandId, setActiveDemandId] = useState<string>('')
  const [events, setEvents] = useState<InventoryAuditEvent[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  // Filtros de busca no histórico
  const [filterControl, setFilterControl] = useState('')
  const [filterMaterial, setFilterMaterial] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterRun, setFilterRun] = useState('')
  const [filterEventType, setFilterEventType] = useState('TODOS')

  const loadEvents = useCallback(async (demandId?: string) => {
    setLoading(true)
    try {
      if (demandId && demandId !== 'ALL') {
        const data = await pcpInventoryDemandsService.listAuditEventsByDemand(demandId)
        setEvents(data)
      } else {
        const data = await pcpInventoryDemandsService.listAllAuditEvents()
        setEvents(data)
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      const initialId = selectedDemand?.id || 'ALL'
      setActiveDemandId(initialId)
      loadEvents(initialId)
    }
  }, [open, selectedDemand?.id, loadEvents])

  const handleSelectDemand = (id: string) => {
    setActiveDemandId(id)
    loadEvents(id)
  }

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterControl && !ev.control_number.toLowerCase().includes(filterControl.toLowerCase())) {
        return false
      }
      if (filterUser && !ev.user_name?.toLowerCase().includes(filterUser.toLowerCase())) {
        return false
      }
      if (filterRun && !ev.run_number?.toLowerCase().includes(filterRun.toLowerCase())) {
        return false
      }
      if (filterEventType !== 'TODOS' && ev.event_type !== filterEventType) {
        return false
      }
      if (filterMaterial) {
        const matchedDemand = demands.find(
          (d) => d.id === ev.demand_id || d.control_number === ev.control_number,
        )
        if (
          matchedDemand &&
          !matchedDemand.material_code.toLowerCase().includes(filterMaterial.toLowerCase()) &&
          !matchedDemand.material_description?.toLowerCase().includes(filterMaterial.toLowerCase())
        ) {
          return false
        }
      }
      return true
    })
  }, [events, filterControl, filterMaterial, filterUser, filterRun, filterEventType, demands])

  const getEventBadge = (type: InventoryAuditEventType) => {
    switch (type) {
      case 'DEMANDA_GERADA':
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-200">Geração de Demanda</Badge>
        )
      case 'INVENTARIO_INICIADO':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-200">
            Início de Inventário
          </Badge>
        )
      case 'LANCAMENTO_ADICIONADO':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
            Contagem Física
          </Badge>
        )
      case 'SALVAMENTO_PARCIAL':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
            Salvamento Parcial
          </Badge>
        )
      case 'INVENTARIO_CONCLUIDO':
        return (
          <Badge className="bg-teal-100 text-teal-800 border-teal-200 font-bold">Conclusão</Badge>
        )
      case 'DEMANDA_CANCELADA':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Cancelamento</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900">
                Histórico e Rastreabilidade — Demandas de Matéria-Prima
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Timeline cronológica e imutável (append-only) com trilha de auditoria de cada
                lançamento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de Seleção da Demanda e Filtros */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Visualizando Demanda:</span>
              <select
                value={activeDemandId}
                onChange={(e) => handleSelectDemand(e.target.value)}
                className="text-xs font-semibold h-8 px-2.5 rounded-md border border-slate-300 bg-white"
              >
                <option value="ALL">Todas as Demandas (Global)</option>
                {demands.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.control_number} — {d.material_code} ({d.center} / {d.storage_deposit}) [
                    {d.status}]
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => loadEvents(activeDemandId)}
              className="text-xs h-7 text-slate-600 gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              Recarregar Trilha
            </Button>
          </div>

          {/* Filtros da busca */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nº Controle</label>
              <Input
                value={filterControl}
                onChange={(e) => setFilterControl(e.target.value)}
                placeholder="INV-..."
                className="text-xs h-7 font-mono mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Material</label>
              <Input
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
                placeholder="Código ou desc."
                className="text-xs h-7 mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Corrida</label>
              <Input
                value={filterRun}
                onChange={(e) => setFilterRun(e.target.value)}
                placeholder="Ex.: 458921"
                className="text-xs h-7 font-mono mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Usuário</label>
              <Input
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                placeholder="Nome do usuário"
                className="text-xs h-7 mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Ação</label>
              <select
                value={filterEventType}
                onChange={(e) => setFilterEventType(e.target.value)}
                className="w-full text-xs h-7 px-2 rounded-md border border-slate-300 bg-white mt-0.5 font-medium"
              >
                <option value="TODOS">Todos os Tipos</option>
                <option value="DEMANDA_GERADA">Demanda Gerada</option>
                <option value="INVENTARIO_INICIADO">Inventário Iniciado</option>
                <option value="LANCAMENTO_ADICIONADO">Contagem Adicionada</option>
                <option value="SALVAMENTO_PARCIAL">Salvamento Parcial</option>
                <option value="INVENTARIO_CONCLUIDO">Inventário Concluído</option>
                <option value="DEMANDA_CANCELADA">Demanda Cancelada</option>
              </select>
            </div>
          </div>
        </div>

        {/* Timeline Cronológica Real (Append-Only) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Eventos de Auditoria Persistidos ({filteredEvents.length})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Registros imutáveis gravados no banco
            </span>
          </div>

          {loading ? (
            <div className="text-center py-10 text-xs text-slate-500">
              Carregando timeline de auditoria...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              Nenhum evento de auditoria encontrado com os filtros selecionados.
            </div>
          ) : (
            <div className="relative border-l-2 border-[#004C97]/30 ml-3 space-y-4 py-2">
              {filteredEvents.map((ev) => (
                <div key={ev.id} className="relative pl-6">
                  {/* Ponto indicador */}
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-[#004C97] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#004C97]" />
                  </div>

                  <div className="bg-slate-50 hover:bg-slate-100/80 p-3 rounded-lg border border-slate-200 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-2">
                        {getEventBadge(ev.event_type)}
                        <span className="font-mono text-xs font-bold text-[#004C97]">
                          {ev.control_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{ev.event_timestamp_formatted || ev.created?.slice(0, 16)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
                      {ev.event_description}
                    </p>

                    {/* Metadados do Registro */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-200/60">
                      {ev.user_name && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>
                            Usuário: <strong className="text-slate-700">{ev.user_name}</strong>
                          </span>
                        </div>
                      )}
                      {ev.run_number && (
                        <div className="flex items-center gap-1 font-mono">
                          <Hash className="w-3 h-3 text-slate-400" />
                          <span>
                            Corrida: <strong className="text-slate-700">{ev.run_number}</strong>
                          </span>
                        </div>
                      )}
                      {ev.location_wms && (
                        <div className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" />
                          <span>
                            Local: <strong className="text-slate-700">{ev.location_wms}</strong>
                          </span>
                        </div>
                      )}
                      {ev.pieces_count !== undefined && ev.pieces_count !== null && (
                        <div className="flex items-center gap-1 font-mono">
                          <Activity className="w-3 h-3 text-slate-400" />
                          <span>
                            Qtd: <strong className="text-[#004C97]">{ev.pieces_count} pçs</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100">
          <Button size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
