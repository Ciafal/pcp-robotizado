import React from 'react'
import {
  Sparkles,
  Layers,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Clock,
  Boxes,
  CheckCircle2,
  TrendingUp,
  Flame,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'

interface SelectedItemDetailPanelProps {
  item: WeeklyScheduleItem | null
  sequenceIndex: number
  previousItem?: WeeklyScheduleItem | null
  nextItem?: WeeklyScheduleItem | null
  sequenceScore?: number
  onAiAnalyze?: () => void
  onOpenSetupDetail?: (item: WeeklyScheduleItem) => void
}

export const SelectedItemDetailPanel: React.FC<SelectedItemDetailPanelProps> = ({
  item,
  sequenceIndex,
  previousItem,
  nextItem,
  sequenceScore = 72,
  onAiAnalyze,
  onOpenSetupDetail,
}) => {
  if (!item) {
    return (
      <div className="w-[300px] xl:w-[320px] bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col items-center justify-center text-center shrink-0 min-h-[480px]">
        <Layers className="w-8 h-8 text-slate-300 mb-2" />
        <h4 className="text-xs font-bold text-slate-700">Nenhum item selecionado</h4>
        <p className="text-[11px] text-slate-500 mt-1">
          Clique em qualquer barra ou linha de produto na grade para inspecionar os detalhes
          operacionais em tempo real.
        </p>
      </div>
    )
  }

  const isMto = item.order_type === 'MTO'
  const isAwaiting =
    item.status === 'AGUARDANDO_OBSERVACOES' || item.awaiting_observations?.is_awaiting
  const isCoolingViolated = item.cooling_validation?.hasViolation
  const coolingHours = item.cooling_validation?.requiredHours || 24
  const startHour = item.start_datetime ? item.start_datetime.split(' ')[1] || '18:30' : '18:30'
  const endHour = item.end_datetime ? item.end_datetime.split(' ')[1] || '21:45' : '21:45'

  // Dados da Matriz de Matéria-Prima
  const necessityTons = item.raw_material_req_tons || 73.5
  const stockSap = item.raw_material_calc?.currentSapStockTons ?? 42.0
  const poTons = item.raw_material_calc?.confirmedPoTons ?? 20.0
  const upstreamTons = item.raw_material_calc?.upstreamProductionTons ?? 20.0
  const otherConsumed = -(item.raw_material_calc?.otherSchedulesCommittedTons ?? 15.0)
  const projectedBalance = item.raw_material_calc?.projectedBalanceTons ?? 87.0
  const mpStatus = item.raw_material_calc?.status || (projectedBalance < 0 ? 'RED' : 'GREEN')

  // Produtividade & Horas
  const plannedTons = item.planned_quantity_tons || 70.0
  const prodRate = item.productivity_rate_th || 5.82
  const prodHours = item.production_hours || 3.25
  const setupMin = item.setup_duration_minutes || 5

  const scoreLabel =
    sequenceScore >= 85 ? 'Otimizada' : sequenceScore >= 60 ? 'Melhorável' : 'Crítica'

  return (
    <TooltipProvider delayDuration={150}>
      <div className="w-[300px] xl:w-[320px] bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col shrink-0 text-xs overflow-hidden">
        {/* TOPO: Título e Identificação do Item */}
        <div className="p-3 bg-slate-50/90 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Item Selecionado: Seq. {sequenceIndex}
            </span>
            <div className="flex items-center gap-1">
              {isMto ? (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-bold">
                  MTO
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[9px] font-bold">
                  MTS
                </Badge>
              )}
              {isAwaiting && (
                <Badge className="bg-amber-400 text-slate-950 font-black text-[9px]">
                  Aguard. Obs
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-1.5">
            <h3 className="font-mono font-bold text-sm text-slate-950 flex items-center gap-1.5">
              {item.material_code || 'TR-60x30x2.0'}
            </h3>
            <p className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
              {item.material_description || 'Tubo Retangular 60x30x2.0mm'}
            </p>
          </div>

          {/* Pedido, Item e Cliente */}
          <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-3 gap-1 text-[10px] font-mono">
            <div>
              <span className="text-slate-400 block font-sans">Pedido:</span>
              <span className="font-bold text-slate-800">
                {item.sales_order_mto || item.production_order || '45871'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans">Item:</span>
              <span className="font-bold text-slate-800">10</span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans">Cliente:</span>
              <span className="font-bold text-slate-800 truncate block">
                {item.customer_name || 'ABC Ltda.'}
              </span>
            </div>
          </div>
        </div>

        {/* CORPO ROLÁVEL COMPACTO */}
        <div className="p-3 space-y-3 flex-1 overflow-y-auto no-scrollbar">
          {/* 1. SEÇÃO PRODUÇÃO (Grid Compacto 2x3) */}
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1.5 flex items-center justify-between">
              <span>Produção</span>
              <Clock className="w-3 h-3 text-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-md border border-slate-200 text-[11px]">
              <div>
                <span className="text-[10px] text-slate-500 block">Quantidade:</span>
                <span className="font-mono font-bold text-slate-900">
                  {plannedTons.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Produtividade:</span>
                <span className="font-mono font-bold text-slate-900">
                  {prodRate.toFixed(2)} t/h
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Horas Previstas:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {prodHours.toFixed(2)} h
                </span>
              </div>
              <div
                className="cursor-pointer hover:bg-amber-100/60 p-0.5 rounded transition-colors"
                onClick={() => onOpenSetupDetail && onOpenSetupDetail(item)}
                title="Clique para abrir detalhes de Troca x Acerto"
              >
                <span className="text-[10px] text-slate-500 block underline flex items-center gap-0.5">
                  Setup Previsto:
                </span>
                <span className="font-mono font-bold text-[#004C97]">
                  {item.setup_breakdown
                    ? `${item.setup_breakdown.planned_change_minutes}m + ${item.setup_breakdown.planned_tuning_minutes}m`
                    : `${setupMin} min`}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Início Previsto:</span>
                <span className="font-mono font-bold text-[#004C97]">{startHour}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Fim Previsto:</span>
                <span className="font-mono font-bold text-slate-800">{endHour}</span>
              </div>
            </div>
          </div>

          {/* 2. SEÇÃO SEQUÊNCIA */}
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1.5 flex items-center justify-between">
              <span>Sequência</span>
              <span
                className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                  sequenceScore >= 85
                    ? 'bg-emerald-100 text-emerald-800'
                    : sequenceScore >= 60
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-rose-100 text-rose-900'
                }`}
              >
                Score {sequenceScore}/100 • {scoreLabel}
              </span>
            </div>
            <div className="space-y-1 bg-slate-50 p-2 rounded-md border border-slate-200 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Anterior:</span>
                <span className="font-mono font-bold text-slate-800">
                  {previousItem?.material_code || 'CANT. 2 × 1/4'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Próximo:</span>
                <span className="font-mono font-bold text-slate-800">
                  {nextItem?.material_code || 'RED. 2.1/2'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Troca Prevista:</span>
                <span className="font-mono font-bold text-amber-800">10 min</span>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={onAiAnalyze}
                className="w-full mt-1.5 h-6 text-[10px] font-bold text-indigo-700 bg-indigo-50/70 border-indigo-200 hover:bg-indigo-100 flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Ver análise da IA
              </Button>
            </div>
          </div>

          {/* 3. SEÇÃO MATÉRIA-PRIMA */}
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1.5 flex items-center justify-between">
              <span>Matéria-Prima</span>
              {mpStatus === 'GREEN' ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-black">
                  🟢 GARANTIDA
                </Badge>
              ) : mpStatus === 'YELLOW' ? (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-black">
                  🟡 COM RISCO
                </Badge>
              ) : (
                <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[9px] font-black">
                  🔴 INSUFICIENTE
                </Badge>
              )}
            </div>

            <div className="space-y-1.5 bg-slate-50 p-2 rounded-md border border-slate-200 text-[11px]">
              <div>
                <span className="text-[10px] text-slate-500 block">MP Padrão:</span>
                <span className="font-mono font-bold text-slate-900 text-[10px]">
                  {item.raw_material_type || 'Tarugo 1020 - 80x40x2.5mm'}
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Aço:</span>
                <span className="font-mono font-bold text-slate-800">
                  {item.steel_grade || 'SAE 1020'}
                </span>
              </div>

              {/* Matriz Completa de MP */}
              <div className="mt-1 pt-1 border-t border-slate-200 space-y-0.5 text-[10px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Necessidade:</span>
                  <span className="font-bold text-indigo-950">
                    {necessityTons.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Estoque Atual:</span>
                  <span className="font-bold text-slate-800">
                    {stockSap.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Entradas Confirmadas:</span>
                  <span className="font-bold text-emerald-700">
                    +{poTons.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Produção Upstream (L2):</span>
                  <span className="font-bold text-emerald-700">
                    +{upstreamTons.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Consumido Outras Linhas:</span>
                  <span className="font-bold text-amber-700">
                    {otherConsumed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                  <span className="text-slate-700 font-sans">Saldo Projetado:</span>
                  <span className={projectedBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {projectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. SEÇÃO REQUISITOS (Horizontal) */}
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1.5 flex items-center justify-between">
              <span>Requisitos</span>
              <a
                href="/pcp/ficha-mestre"
                className="text-[10px] text-[#004C97] hover:underline font-bold flex items-center gap-0.5"
              >
                Ver Ficha Mestre Completa &rarr;
              </a>
            </div>

            <div className="bg-slate-50 p-2 rounded-md border border-slate-200 space-y-1.5 text-[11px]">
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  <span className="font-sans text-slate-500">Rastreado:</span>
                  <strong className="text-emerald-700">SIM</strong>
                </span>
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  <span className="font-sans text-slate-500">US:</span>
                  <strong className="text-emerald-700">SIM</strong>
                </span>
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  <span className="font-sans text-slate-500">Ensaios Mec.:</span>
                  <strong className="text-emerald-700">SIM</strong>
                </span>
                <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-900 font-bold">
                  Obs: Urgente
                </span>
              </div>

              {/* Informações Condicionais de Resfriamento / Aguardando Observações */}
              {isCoolingViolated && (
                <div className="p-1.5 bg-rose-50 border border-rose-200 rounded text-[10px] text-rose-900 flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>TEMPO DE RESFRIAMENTO NÃO ATENDIDO:</strong> Exige {coolingHours} h.
                  </div>
                </div>
              )}

              {!isCoolingViolated && (
                <div className="text-[10px] text-slate-600 font-mono flex items-center gap-1">
                  <span>❄ Resfriamento: {coolingHours} h</span>
                  <span className="text-emerald-700 font-bold">• Atendido</span>
                </div>
              )}

              {isAwaiting && (
                <div className="p-1.5 bg-amber-100 border border-amber-300 rounded text-[10px] text-amber-950 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                  <span>
                    Aguardando observações:{' '}
                    {item.awaiting_observations?.reason || 'Validação Comercial'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
