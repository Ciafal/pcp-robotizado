import React, { useState } from 'react'
import {
  CalendarDays,
  Zap,
  GitCommit,
  Building2,
  Factory,
  Cpu,
  ChevronRight,
  ArrowUp,
  AlertTriangle,
} from 'lucide-react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const ProductionGantt: React.FC = () => {
  const {
    filters,
    setCompanyScope,
    setPlantScope,
    setLineScope,
    companies,
    availablePlants,
    availableLines,
    filteredOrders,
    setSelectedOrder,
    simulateOrderMove,
    isCriticalPathVisible,
    setIsCriticalPathVisible,
    activeSimulationDiff,
    cancelSimulation,
    applySimulationToScenario,
    sendScenarioForApproval,
  } = useControlTower()

  const [timeZoom, setTimeZoom] = useState<'1H' | '4H' | 'TURNO' | 'DIA'>('4H')
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null)

  const isCompanyLevel = filters.plantCode === 'ALL' && filters.lineCode === 'ALL'
  const isPlantLevel = filters.plantCode !== 'ALL' && filters.lineCode === 'ALL'
  const isLineLevel = filters.lineCode !== 'ALL'

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
      const [h, m] = (t || '06:00').split(':').map(Number)
      return h + (m || 0) / 60
    }
    const startHour = parseHour(start)
    const endHour = parseHour(end)
    const minHour = 4 // Base 04:00
    const maxHour = 24 // Base 24:00

    const left = Math.max(0, ((startHour - minHour) / (maxHour - minHour)) * 100)
    const width = Math.max(6, ((endHour - startHour) / (maxHour - minHour)) * 100)
    return { left: `${left}%`, width: `${width}%` }
  }

  // Drag & Drop
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
      {/* Barra de Controles e Nível do Gantt */}
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-pantone-2945" />
            <span className="font-bold text-white uppercase tracking-wider">
              {isCompanyLevel
                ? 'Gantt Multinível — Visão Resumida por Planta (Empresa)'
                : isPlantLevel
                  ? `Gantt Integrado da Planta (${filters.plantCode}) — Faixas por Linha`
                  : `Gantt Detalhado de Linha (${filters.lineCode}) — Campanhas e OPs`}
            </span>
          </div>

          <Badge
            variant="outline"
            className="bg-slate-900 border-slate-700 text-[10px] text-cyan-300"
          >
            {isCompanyLevel ? 'Nível Corporativo' : isPlantLevel ? 'Nível Planta' : 'Nível Linha'}
          </Badge>

          {/* Botão de Caminho Crítico */}
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

        {/* Zoom Temporal e Dicas */}
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
            {(['1H', '4H', 'TURNO', 'DIA'] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setTimeZoom(z)}
                className={`px-2 py-0.5 rounded ${
                  timeZoom === z ? 'bg-pantone-2945 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {z}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 hidden md:block">
            💡 Arraste um bloco para <strong>simular</strong> no cenário ativo
          </span>
        </div>
      </div>

      {/* Alerta de Simulação Temporária */}
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
            </div>
          </div>

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
              className="bg-pantone-2945 hover:bg-pantone-2945/90 text-white font-bold text-xs h-7"
            >
              Enviar para Homologação
            </Button>
          </div>
        </div>
      )}

      {/* =========================================================================
          NÍVEL 1: GANTT NÍVEL EMPRESA (Resumo por Planta)
      ========================================================================= */}
      {isCompanyLevel && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-900/80 p-3 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">
                Consolidado Corporativo CIAFAL — Ocupação e Fluxo por Planta
              </span>
              <span className="text-slate-400">
                Clique em uma planta para abrir o Gantt Integrado
              </span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {availablePlants.map((plant) => {
                const plantOrders = filteredOrders.filter((o) => o.plantCode === plant.code)
                const totalTons = plantOrders.reduce((s, o) => s + o.plannedTons, 0)
                const produced = plantOrders.reduce((s, o) => s + o.producedTons, 0)
                const pct = totalTons > 0 ? Math.round((produced / totalTons) * 100) : 85

                return (
                  <div
                    key={plant.code}
                    onClick={() => setPlantScope(plant.code)}
                    className="p-4 hover:bg-slate-900/40 cursor-pointer transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Factory className="w-4 h-4 text-pantone-2945" />
                        <strong className="text-white text-sm">
                          {plant.name} ({plant.code})
                        </strong>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-slate-900 text-slate-300"
                        >
                          {plant.city} - {plant.state}
                        </Badge>
                      </div>
                      <div className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                        <span>Ver Linhas da Planta</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Faixa Gráfica de Ocupação da Planta */}
                    <div className="relative h-10 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex items-center px-3">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-pantone-2945/80 to-cyan-500/80 rounded"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative z-10 flex items-center justify-between w-full text-xs font-mono">
                        <span className="text-white font-bold drop-shadow">
                          {produced.toLocaleString('pt-BR')} t / {totalTons.toLocaleString('pt-BR')}{' '}
                          t ({pct}%)
                        </span>
                        <span className="text-white font-bold drop-shadow">
                          {plant.code === 'DIV'
                            ? '3 Linhas Operando'
                            : '2 Linhas Operando + 1 Manutenção'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          NÍVEL 2 & 3: GANTT PLANTA & LINHA (Faixas por Linha e Detalhe de OPs)
      ========================================================================= */}
      {!isCompanyLevel && (
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

            {/* Linhas de Recursos */}
            <div className="divide-y divide-slate-850">
              {availableLines.map((line) => {
                const lineOrders = filteredOrders.filter((o) => o.lineCode === line.code)

                return (
                  <div
                    key={line.code}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, line.code)}
                    className="grid grid-cols-12 min-h-[58px] hover:bg-slate-900/30 transition-all items-center px-3 group"
                  >
                    {/* Linha / Recurso Header */}
                    <div className="col-span-2 pr-2 py-2">
                      <div className="font-mono font-bold text-white text-xs flex items-center gap-1.5">
                        <span className="text-cyan-400">{line.code}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{line.name}</div>
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
                                        ? 'bg-blue-950/90 border border-pantone-2945'
                                        : ord.status === 'SETUP'
                                          ? 'bg-amber-950/90 border border-amber-600'
                                          : ord.status === 'BLOCKED'
                                            ? 'bg-red-950/90 border border-red-700'
                                            : 'bg-slate-800/90 border border-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-mono font-bold text-white text-[11px] truncate flex items-center gap-1">
                                      {ord.orderNumber}
                                      {ord.productionType === 'MTO' && (
                                        <span className="text-[8px] bg-purple-900 text-purple-200 px-1 rounded font-bold">
                                          MTO
                                        </span>
                                      )}
                                      {ord.requiresUltrasound && (
                                        <span className="text-[8px] bg-blue-900 text-cyan-200 px-1 rounded font-bold">
                                          US
                                        </span>
                                      )}
                                      {ord.requiresMechanical && (
                                        <span className="text-[8px] bg-indigo-900 text-indigo-200 px-1 rounded font-bold">
                                          EM
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-[10px] text-cyan-300 font-mono">
                                      {ord.plannedTons} t
                                    </span>
                                  </div>

                                  <div className="text-[10px] text-slate-300 truncate">
                                    {ord.familyName}
                                  </div>

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
                                    <strong>Classificação:</strong>{' '}
                                    <span className="font-bold text-cyan-300">
                                      {ord.productionType || 'MTS'}
                                    </span>
                                  </div>
                                  <div>
                                    <strong>Qualidade:</strong>{' '}
                                    <span className="text-emerald-400 font-semibold">
                                      {ord.qualityStatus || 'PROGRAMADA'}
                                    </span>{' '}
                                    {ord.requiresUltrasound && '(Exige US)'}{' '}
                                    {ord.requiresMechanical && '(Exige EM)'}
                                  </div>
                                  <div>
                                    <strong>Volume:</strong> {ord.producedTons} t /{' '}
                                    {ord.plannedTons} t ({progressPct}%)
                                  </div>
                                  <div>
                                    <strong>Setup:</strong> {ord.setupMinutes} min
                                  </div>
                                  <div>
                                    <strong>Cliente:</strong> {ord.customerName}
                                  </div>
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
      )}
    </div>
  )
}
