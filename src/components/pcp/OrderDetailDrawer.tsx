import React from 'react'
import {
  Clock,
  Layers,
  MapPin,
  ClipboardList,
  History,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { MPInventoryItem, MPInventoryTimelineEntry } from '@/types/pcp-mp-inventory'
import { FieldSituationResolver } from '@/services/pcp-adapters-service'

interface OrderDetailDrawerProps {
  item: MPInventoryItem | null
  timeline: MPInventoryTimelineEntry[]
  open: boolean
  onClose: () => void
  onSaveRequested?: (item: MPInventoryItem) => void
}

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  item,
  timeline,
  open,
  onClose,
}) => {
  if (!item) return null

  // Situações individuais por campo
  const sapOrderSit = FieldSituationResolver.resolve('production_order', item)
  const sapHeatSit = FieldSituationResolver.resolve('heat_number', item)
  const sapStockSit = FieldSituationResolver.resolve('sap_stock_tons', item)
  const wmsLocSit = FieldSituationResolver.resolve('wms_physical_location', item)
  const dp07PiecesSit = FieldSituationResolver.resolve('dp07_inventoried_pieces', item)

  // Cálculo de atendimento
  const piecesNeeded = item.sap_pieces_count || 1
  const piecesFound = item.dp07_inventoried_pieces || 0
  const attendancePct = Math.min(100, Number(((piecesFound / piecesNeeded) * 100).toFixed(1)))
  const divergence = item.pieces_divergence ?? piecesFound - piecesNeeded

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Cabeçalho do Drawer */}
        <div className="bg-slate-900 text-white p-4 sticky top-0 z-10 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-blue-400">
                  {item.production_order}
                </span>
                <Badge className="bg-blue-600 text-white font-bold text-[10px]">
                  Seq. PCP #{item.pcp_planned_sequence}
                </Badge>
                {item.dp07_enfornamento_sequence &&
                  item.dp07_enfornamento_sequence !== item.pcp_planned_sequence && (
                    <Badge className="bg-amber-500 text-slate-950 font-black text-[10px]">
                      Seq. DP07 #{item.dp07_enfornamento_sequence}
                    </Badge>
                  )}
              </div>
              <h2 className="text-base font-bold text-slate-100 mt-1">
                {item.raw_material_code} — {item.raw_material_description}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Status Operacional
              </span>
              <span className="text-xs font-bold text-emerald-400 font-mono">{item.status}</span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 text-xs text-slate-700">
          {/* BLOCO 1: PROGRAMAÇÃO (PCP) */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#004C97]" />
                1. Bloco Programação (Origem: PCP Robotizado)
              </span>
              <span className="text-[10px] font-mono text-slate-400">{sapOrderSit.label}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Ordem
                </span>
                <span className="font-mono font-bold text-slate-900">{item.production_order}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Produto / Bitola
                </span>
                <span className="font-semibold text-slate-800">{item.produced_gauge_product}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Horário Previsto
                </span>
                <span className="font-mono font-bold text-slate-900 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {item.expected_enfornamento_time}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Tipo Enfornamento
                </span>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">
                  {item.enfornamento_type}
                </Badge>
              </div>
            </div>
          </div>

          {/* BLOCO 2: MATÉRIA-PRIMA (SAP & WMS) */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                2. Bloco Matéria-Prima (Origem: SAP & WMS)
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <span
                  className={
                    sapHeatSit.is_unavailable ? 'text-rose-600 font-bold' : 'text-slate-400'
                  }
                >
                  {sapHeatSit.label}
                </span>
                <span>•</span>
                <span
                  className={
                    wmsLocSit.is_unavailable ? 'text-rose-600 font-bold' : 'text-slate-400'
                  }
                >
                  {wmsLocSit.label}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Corrida / Lote (SAP)
                </span>
                <span className="font-mono font-bold text-slate-900">{item.heat_number}</span>
                {sapHeatSit.sublabel && (
                  <span className="text-[9px] text-slate-400 block">{sapHeatSit.sublabel}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Estoque SAP
                </span>
                <span className="font-mono font-bold text-slate-900">{item.sap_stock_tons} t</span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  ({item.sap_pieces_count} peças)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Localização WMS
                </span>
                <span className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 block truncate">
                  {item.wms_physical_location}
                </span>
                {wmsLocSit.sublabel && (
                  <span className="text-[9px] text-slate-400 block">{wmsLocSit.sublabel}</span>
                )}
              </div>
            </div>
          </div>

          {/* BLOCO 3: INVENTÁRIO (DP07 PREPARAÇÃO) */}
          <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/40 space-y-2">
            <div className="flex items-center justify-between border-b border-blue-200 pb-1.5">
              <span className="font-bold text-[#004C97] uppercase text-[11px] flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-[#004C97]" />
                3. Bloco Inventário Físico (Origem: DP07)
              </span>
              <Badge className="bg-blue-600 text-white text-[9px] font-bold">
                {dp07PiecesSit.label}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Necessárias (PCP/SAP)
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {item.sap_pieces_count} peças
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Peças Inventariadas
                </span>
                <span className="font-mono font-black text-blue-900 text-sm">
                  {item.dp07_inventoried_pieces ?? 'Pendente'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Diferença
                </span>
                <span
                  className={`font-mono font-bold text-sm ${
                    divergence === 0
                      ? 'text-emerald-700'
                      : divergence > 0
                        ? 'text-blue-700'
                        : 'text-rose-700'
                  }`}
                >
                  {divergence > 0 ? `+${divergence}` : divergence} peças
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Atendimento
                </span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {attendancePct}%
                </span>
              </div>
            </div>
            {item.dp07_observation && (
              <div className="mt-2 pt-2 border-t border-blue-100 text-[11px]">
                <strong className="text-slate-700">Observação DP07:</strong>{' '}
                <span className="text-slate-600 italic">"{item.dp07_observation}"</span>
              </div>
            )}
          </div>

          {/* BLOCO 4: TIMELINE HISTÓRICA POR ORDEM */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-600" />
                4. Bloco Histórico & Timeline Operacional da Ordem
              </span>
              <span className="text-[10px] font-mono text-slate-400">Trilha Auditável</span>
            </div>

            <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timeline.map((entry, idx) => (
                <div key={idx} className="relative flex items-start gap-2">
                  <div
                    className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                      entry.type === 'SUCCESS'
                        ? 'bg-emerald-500 text-white'
                        : entry.type === 'WARNING'
                          ? 'bg-amber-500 text-white'
                          : entry.type === 'ALERT'
                            ? 'bg-rose-500 text-white'
                            : 'bg-[#004C97] text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800 text-[11px]">
                        {entry.time_display}
                      </span>
                      <span className="text-slate-400 font-semibold">•</span>
                      <span className="font-bold text-slate-800 text-[11px]">{entry.title}</span>
                      <Badge className="bg-slate-100 text-slate-600 text-[9px] font-semibold py-0">
                        {entry.actor}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-600">{entry.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200">
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="h-8 text-xs font-semibold"
          >
            Fechar Painel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
