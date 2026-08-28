import React, { useState } from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { ProductOrder } from '@/types/control-tower'
import {
  CalendarDays,
  Clock,
  Zap,
  Sliders,
  AlertTriangle,
  Sparkles,
  GitCommit,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export const ProductionGantt: React.FC = () => {
  const {
    orders,
    filteredOrders,
    setSelectedOrder,
    simulateOrderMove,
    isCriticalPathVisible,
    setIsCriticalPathVisible,
    activeSimulationDiff,
    cancelSimulation,
    applySimulationToScenario,
    sendScenarioForApproval,
    setIsComparisonModalOpen,
  } = useControlTower()

  const [timeZoom, setTimeZoom] = useState<'1H' | '4H' | 'TURNO' | 'DIA'>('4H')
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null)
  const [approvalNote, setApprovalNote] = useState<string>('')

  // Linhas do Gantt
  const lines = ['ENF_L1', 'L1', 'ACAB_L1', 'MPL2', 'L2', 'ACAB_L2', 'ENDIR', 'RETRAB']

  // Horários de escala horizontal (04h às 24h)
  const timeSlots = [
    '04:00',
    '06:00',
    '08:00',
    '10:00',
    '12:00',
    '14:00',
    '16:00',
    '18:00',
    '20:00',
    '22:00',
    '00:00',
  ]

  // Cálculo da posição no grid
  const calculatePosition = (start: string, end: string) => {
    const parseHour = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h + (m || 0) / 60
    }
    const startHour = parseHour(start)
    const endHour = parseHour(end)
    const minHour = 4 // Base 04:00
    const maxHour = 24 // Base 24:00

    const left = Math.max(0, ((startHour - minHour) / (maxHour - minHour)) * 100)
    const width = Math.max(5, ((endHour - startHour) / (maxHour - minHour)) * 100)
    return { left: `${left}%`, width: `${width}%` }
  }

  // Handle Drag & Drop Simulação
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('text/plain', orderId)
    setDraggedOrderId(orderId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetLine: string) => {
    e.preventDefault()
    const orderId = e.dataTransfer.getData('text/plain') || draggedOrderId
    if (orderId) {
      simulateOrderMove(orderId, targetLine, '16:00')
    }
    setDraggedOrderId(null)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Barra de Controles do Gantt */}
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#004C97]" />
            <span className="font-bold text-white uppercase tracking-wider">
              Sequenciamento Temporal de Ordens & Recursos
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <Button
              size="sm"
              variant={isCriticalPathVisible ? 'default' : 'outline'}
              onClick={() => setIsCriticalPathVisible(!isCriticalPathVisible)}
              className={`h-7 text-xs gap-1 ${
                isCriticalPathVisible
                  ? 'bg-rose-900 text-white border-rose-600'
                  : 'border-slate-800 bg-slate-900 text-slate-300'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5 text-rose-400" />
              {isCriticalPathVisible ? 'Ocultar Caminho Crítico' : 'Exibir Caminho Crítico'}
            </Button>
          </div>
        </div>

        {/* Zoom Temporal e Dicas */}
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setTimeZoom('1H')}
              className={`px-2 py-0.5 rounded ${
                timeZoom === '1H' ? 'bg-[#004C97] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              1h
            </button>
            <button
              type="button"
              onClick={() => setTimeZoom('4H')}
              className={`px-2 py-0.5 rounded ${
                timeZoom === '4H' ? 'bg-[#004C97] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              4h
            </button>
            <button
              type="button"
              onClick={() => setTimeZoom('TURNO')}
              className={`px-2 py-0.5 rounded ${
                timeZoom === 'TURNO' ? 'bg-[#004C97] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Turno
            </button>
            <button
              type="button"
              onClick={() => setTimeZoom('DIA')}
              className={`px-2 py-0.5 rounded ${
                timeZoom === 'DIA' ? 'bg-[#004C97] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dia
            </button>
          </div>

          <span className="text-[11px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 hidden md:block">
            💡 Arraste um bloco para <strong>simular</strong> novo horário ou recurso
          </span>
        </div>
      </div>

      {/* Painel de Alerta de Simulação em Andamento (Drag & Drop Result) */}
      {activeSimulationDiff && (
        <div className="bg-amber-950/40 border border-amber-600/80 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-amber-200 shadow-lg animate-in fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-bold text-white text-sm">
                SIMULAÇÃO DE ALTERAÇÃO EM MEMÓRIA ({activeSimulationDiff.orderNumber})
              </span>
              <Badge className="bg-amber-900 text-amber-200 border-amber-600 text-[10px]">
                Ambiente de Simulação
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-amber-300">
              <span>
                De: <strong>{activeSimulationDiff.originalLine}</strong> ➔ Para:{' '}
                <strong>{activeSimulationDiff.newLine}</strong>
              </span>
              <span>
                Novo Início: <strong>{activeSimulationDiff.newStart}</strong>
              </span>
              <span>
                Setup:{' '}
                <strong>
                  {activeSimulationDiff.setupDeltaMinutes > 0
                    ? `+${activeSimulationDiff.setupDeltaMinutes} min`
                    : 'Sem alteração'}
                </strong>
              </span>
              <span>
                Impacto Atraso:{' '}
                <strong
                  className={
                    activeSimulationDiff.delayDeltaHours < 0 ? 'text-emerald-400' : 'text-rose-400'
                  }
                >
                  {activeSimulationDiff.delayDeltaHours > 0
                    ? `+${activeSimulationDiff.delayDeltaHours}h`
                    : `${activeSimulationDiff.delayDeltaHours}h (redução)`}
                </strong>
              </span>
            </div>
          </div>

          {/* Botões de Ação da Simulação */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={cancelSimulation}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs h-7"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={applySimulationToScenario}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs h-7"
            >
              Aplicar no Cenário
            </Button>
            <Button
              size="sm"
              onClick={() => {
                applySimulationToScenario()
                sendScenarioForApproval('Ajuste de sequenciamento simulado no Gantt')
              }}
              className="bg-[#004C97] hover:bg-[#003B75] text-white font-bold text-xs h-7"
            >
              Enviar para Homologação
            </Button>
          </div>
        </div>
      )}

      {/* Grade Central do Gantt */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto shadow-sm">
        <div className="min-w-[900px]">
          {/* Cabeçalho da Escala de Tempo */}
          <div className="grid grid-cols-12 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400 py-2.5 px-3 sticky top-0 z-10">
            <div className="col-span-2 font-bold text-white uppercase text-[10px] tracking-wider">
              Recurso / Linha
            </div>
            <div className="col-span-10 relative flex justify-between pr-4">
              {timeSlots.map((slot) => (
                <span key={slot} className="text-slate-400">
                  {slot}
                </span>
              ))}

              {/* Marcador Vertical: Linha do Tempo "AGORA" (09:28) */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] z-20"
                style={{ left: '27.3%' }}
                title="Horário Atual: 09:28 (Sincronizado SAP)"
              >
                <span className="absolute -top-3 -translate-x-1/2 bg-cyan-500 text-slate-950 text-[9px] font-black px-1 rounded">
                  AGORA
                </span>
              </div>
            </div>
          </div>

          {/* Linhas de Recursos Industriais */}
          <div className="divide-y divide-slate-850">
            {lines.map((lineCode) => {
              const lineOrders = filteredOrders.filter((o) => o.lineCode === lineCode)

              return (
                <div
                  key={lineCode}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, lineCode)}
                  className="grid grid-cols-12 min-h-[58px] hover:bg-slate-900/30 transition-all items-center px-3 group"
                >
                  {/* Linha / Recurso Header */}
                  <div className="col-span-2 pr-2 py-2">
                    <div className="font-mono font-bold text-white text-xs flex items-center gap-1.5">
                      <span className="text-cyan-400">{lineCode}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {lineCode === 'L1'
                        ? 'Laminação & Conformação'
                        : lineCode === 'ENF_L1'
                          ? 'Enfornamento e Forno'
                          : lineCode === 'ACAB_L1'
                            ? 'Acabamento & Corte'
                            : lineCode === 'L2'
                              ? 'Perfis Estruturais'
                              : lineCode === 'ACAB_L2'
                                ? 'Acabamento L2'
                                : lineCode === 'ENDIR'
                                  ? 'Endireitadeira'
                                  : lineCode === 'RETRAB'
                                    ? 'Célula de Retrabalho'
                                    : 'Pátio Bobinas'}
                    </div>
                  </div>

                  {/* Faixa Temporal com Blocos de Ordens */}
                  <div className="col-span-10 relative h-12 bg-slate-950/60 rounded border border-slate-850/60 overflow-hidden my-1">
                    {/* Linhas de grade horárias */}
                    <div className="absolute inset-0 grid grid-cols-10 pointer-events-none opacity-20 divide-x divide-slate-700">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="h-full"></div>
                      ))}
                    </div>

                    {/* Blocos de Ordens */}
                    {lineOrders.map((ord) => {
                      const pos = calculatePosition(ord.plannedStart, ord.projectedEnd)
                      const isCritical = ord.isCriticalPath && isCriticalPathVisible
                      const progressPct =
                        ord.plannedTons > 0
                          ? Math.round((ord.producedTons / ord.plannedTons) * 100)
                          : 0

                      return (
                        <TooltipProvider key={ord.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, ord.id)}
                                onClick={() => setSelectedOrder(ord)}
                                style={{ left: pos.left, width: pos.width }}
                                className={`absolute top-1 bottom-1 rounded-md px-2 py-1 text-xs cursor-grab active:cursor-grabbing select-none transition-all flex flex-col justify-between overflow-hidden shadow-sm ${
                                  isCritical
                                    ? 'bg-rose-950/90 border border-rose-500 shadow-rose-950/50'
                                    : ord.status === 'IN_PRODUCTION'
                                      ? 'bg-blue-950/90 border border-[#004C97]'
                                      : ord.status === 'SETUP'
                                        ? 'bg-amber-950/90 border border-amber-600'
                                        : ord.status === 'BLOCKED'
                                          ? 'bg-red-950/90 border border-red-700'
                                          : 'bg-slate-800/90 border border-slate-600'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono font-bold text-white text-[11px] truncate">
                                    {ord.orderNumber}
                                  </span>
                                  <span className="text-[10px] text-cyan-300 font-mono">
                                    {ord.plannedTons} t
                                  </span>
                                </div>

                                <div className="text-[10px] text-slate-300 truncate">
                                  {ord.familyName}
                                </div>

                                {/* Barra de Progresso Realizado / Restante / Projetado (██████████░░░░░░░) */}
                                <div className="w-full bg-slate-900/90 h-1.5 rounded-full overflow-hidden flex">
                                  <div
                                    className="bg-emerald-400 h-full"
                                    style={{ width: `${progressPct}%` }}
                                  ></div>
                                  <div
                                    className="bg-blue-500/50 h-full"
                                    style={{ width: `${100 - progressPct}%` }}
                                  ></div>
                                </div>
                              </div>
                            </TooltipTrigger>

                            <TooltipContent className="bg-slate-950 border-slate-800 text-slate-200 text-xs p-3 space-y-2 max-w-xs shadow-xl">
                              <div className="font-bold text-white flex items-center justify-between">
                                <span>{ord.orderNumber}</span>
                                <Badge variant="outline" className="text-[9px] border-slate-700">
                                  {ord.status}
                                </Badge>
                              </div>

                              <div className="text-[11px] space-y-1 text-slate-300">
                                <div>
                                  <strong>Material:</strong> {ord.materialName}
                                </div>
                                <div>
                                  <strong>Volume:</strong> {ord.producedTons} t / {ord.plannedTons}{' '}
                                  t ({progressPct}%)
                                </div>
                                <div>
                                  <strong>Ritmo:</strong> {ord.currentRatePerHour} t/h (Meta:{' '}
                                  {ord.targetRatePerHour} t/h)
                                </div>
                                <div>
                                  <strong>Setup:</strong> {ord.setupMinutes} min (
                                  {ord.setupCompleted ? 'Concluído' : 'Pendente'})
                                </div>
                                <div>
                                  <strong>Buffer Downstream:</strong> {ord.downstreamBufferTons} t
                                </div>
                                <div>
                                  <strong>Cliente:</strong> {ord.customerName}
                                </div>
                                {ord.delayMinutes > 0 && (
                                  <div className="text-amber-400 font-semibold">
                                    ⚠ Atraso Projetado: +{ord.delayMinutes} min
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
