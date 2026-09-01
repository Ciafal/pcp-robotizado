import React, { useState } from 'react'
import {
  X,
  Gauge,
  Sparkles,
  Info,
  Clock,
  Activity,
  Layers,
  FileSpreadsheet,
  History,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Database,
  Calendar,
  Zap,
} from 'lucide-react'
import { useOeeDrilldown } from '@/contexts/OeeDrilldownContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export const OeeDrilldownModal: React.FC = () => {
  const { isOpen, closeDrilldown, oeeData, updateContext } = useOeeDrilldown()
  const [activeTab, setActiveTab] = useState<
    'RESUMO' | 'DISPONIBILIDADE' | 'PERFORMANCE' | 'QUALIDADE' | 'PARADAS' | 'HISTORICO'
  >('RESUMO')
  const [paretoFilter, setParetoFilter] = useState<
    'ALL' | 'AVAILABILITY' | 'PERFORMANCE' | 'QUALITY'
  >('ALL')
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [isAiLoading, setIsAiLoading] = useState(false)

  if (!isOpen || !oeeData) return null

  const {
    context,
    dataSources,
    overallOeePct,
    targetOeePct,
    gapOeePct,
    availability,
    performance,
    quality,
    plannedVsRealized,
    funnelStages,
    paretoLosses,
    history,
    aiAnalysis,
  } = oeeData

  const handleRunAiAnalysis = () => {
    setIsAiLoading(true)
    setIsAiModalOpen(true)
    setTimeout(() => {
      setIsAiLoading(false)
    }, 450)
  }

  const filteredPareto = paretoLosses.filter((item) => {
    if (paretoFilter === 'ALL') return true
    return item.category === paretoFilter
  })

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeDrilldown()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl p-0 bg-slate-950 text-slate-100 border-l border-slate-800 flex flex-col shadow-2xl overflow-hidden focus:outline-none"
      >
        {/* =========================================================================
            1. CABEÇALHO DO PAINEL DE ANÁLISE OEE
        ========================================================================= */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-md flex items-center justify-center">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                  ANÁLISE OEE — {context.lineCode || 'L1'}
                </span>
                <Badge className="bg-blue-950 text-sky-300 border-blue-800 text-[10px] font-mono">
                  {context.companyCode || 'CIAFAL'} &bull; {context.equipmentCode || 'L1_LAM'}
                </Badge>
                {dataSources.aomIba === 'CONNECTED' ? (
                  <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[9px] font-mono">
                    IBA/AOM Conectado
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-slate-700 text-slate-400 text-[9px] font-mono"
                  >
                    AOM: Não disponível
                  </Badge>
                )}
              </div>
              <h2 className="text-base font-black text-white flex items-center gap-2 mt-0.5">
                <span>{context.date}</span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-amber-400">
                  {context.shiftCode || 'T1'} ({context.shiftName || 'Turno 1'})
                </span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-slate-300">{context.crewCode || 'Turma C'}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleRunAiAnalysis}
              className="h-8 text-xs bg-gradient-to-r from-[#004C97] to-indigo-700 hover:from-[#003d7a] hover:to-indigo-800 text-white font-bold gap-1.5 shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              Analisar OEE com IA
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeDrilldown}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* =========================================================================
            2. BARRA DE FILTROS RÁPIDOS NO TOPO DO PAINEL (Sem sair do modal)
        ========================================================================= */}
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
              <Filter className="w-3 h-3 text-sky-400" />
              <span>Filtros do Painel:</span>
            </div>

            {/* Linha */}
            <select
              value={context.lineCode || 'L1'}
              onChange={(e) =>
                updateContext({ lineCode: e.target.value, equipmentCode: `${e.target.value}_LAM` })
              }
              className="bg-slate-950 border border-slate-700 text-sky-300 text-[11px] rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            >
              <option value="L1">Linha L1 (Laminação)</option>
              <option value="L2">Linha L2 (Perfis Médios)</option>
              <option value="L3">Linha L3 (Trefilação)</option>
              <option value="L4">Linha L4 (Corte & Dobra)</option>
              <option value="L5">Linha L5 (Tratamento)</option>
              <option value="L6">Linha L6 (Acabamento)</option>
            </select>

            {/* Turno */}
            <select
              value={context.shiftCode || 'T1'}
              onChange={(e) =>
                updateContext({
                  shiftCode: e.target.value,
                  shiftName:
                    e.target.value === 'T1'
                      ? 'Turno 1 (06:00 - 14:00)'
                      : e.target.value === 'T2'
                        ? 'Turno 2 (14:00 - 22:00)'
                        : 'Turno 3 (22:00 - 06:00)',
                  period: 'SHIFT',
                })
              }
              className="bg-slate-950 border border-slate-700 text-amber-300 text-[11px] rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            >
              <option value="T1">Turno 1 (06h-14h)</option>
              <option value="T2">Turno 2 (14h-22h)</option>
              <option value="T3">Turno 3 (22h-06h)</option>
            </select>

            {/* Turma */}
            <select
              value={context.crewCode || 'Turma C'}
              onChange={(e) => updateContext({ crewCode: e.target.value })}
              className="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            >
              <option value="Turma A">Turma A</option>
              <option value="Turma B">Turma B</option>
              <option value="Turma C">Turma C</option>
              <option value="Turma D">Turma D</option>
            </select>

            {/* Período */}
            <select
              value={context.period || 'SHIFT'}
              onChange={(e) => updateContext({ period: e.target.value as any })}
              className="bg-slate-950 border border-slate-700 text-emerald-300 text-[11px] rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            >
              <option value="SHIFT">Por Turno (8h)</option>
              <option value="DAY">Diário (24h)</option>
              <option value="WEEK">Semanal (Acumulado)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>
              OP:{' '}
              <strong className="text-white">{context.productionOrder || 'OP-2026-8801'}</strong>
            </span>
            <span>&bull;</span>
            <span className="truncate max-w-[180px]" title={context.productName}>
              Prod:{' '}
              <strong className="text-sky-300">{context.productCode || 'PERFIL-50X50'}</strong>
            </span>
          </div>
        </div>

        {/* =========================================================================
            3. BLOCO SUPERIOR: OEE GERAL & FÓRMULA OBRIGATÓRIA (A × P × Q = OEE)
        ========================================================================= */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
          {/* Card OEE Geral */}
          <div className="p-3.5 bg-gradient-to-br from-slate-900 to-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                OEE Global Realizado
              </span>
              <Badge
                className={cn(
                  'text-[10px] font-mono font-bold',
                  overallOeePct >= targetOeePct
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : overallOeePct >= targetOeePct - 3
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-rose-950 text-rose-300 border-rose-800',
                )}
              >
                Meta: {targetOeePct.toFixed(1)}%
              </Badge>
            </div>
            <div className="my-1.5 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {overallOeePct.toFixed(1)}%
              </span>
              <span
                className={cn(
                  'text-xs font-mono font-bold',
                  gapOeePct >= 0 ? 'text-emerald-400' : 'text-rose-400',
                )}
              >
                {gapOeePct >= 0 ? `+${gapOeePct.toFixed(1)}` : gapOeePct.toFixed(1)}% gap
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800/80 pt-1">
              <span>Eficiência Consolidada</span>
              <span className="text-sky-400 font-semibold">{context.lineCode}</span>
            </div>
          </div>

          {/* Card Disponibilidade (A) */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                Disponibilidade (A)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Meta: {availability.targetAvailabilityPct.toFixed(1)}%
              </span>
            </div>
            <div className="my-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-sky-400">
                {availability.availabilityPct.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ({availability.realProductionHours}h / {availability.availableProductionHours}h)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800/80 pt-1">
              <span>Paradas Não Prog:</span>
              <span className="text-rose-400 font-bold">
                {availability.unplannedStopsHours}h ({availability.unplannedStopsCount}x)
              </span>
            </div>
          </div>

          {/* Card Performance (P) */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Performance (P)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Meta: {performance.targetPerformancePct.toFixed(1)}%
              </span>
            </div>
            <div className="my-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-amber-400">
                {performance.performancePct.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ({performance.realRatePerHour} / {performance.theoreticalRatePerHour} t/h)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800/80 pt-1">
              <span>Perda de Ritmo:</span>
              <span className="text-amber-400 font-bold">-{performance.rhythmSpeedLossTons} t</span>
            </div>
          </div>

          {/* Card Qualidade (Q) */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Qualidade & Rendimento
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Meta: {quality.targetQualityPct.toFixed(1)}%
              </span>
            </div>
            <div className="my-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-emerald-400">
                {quality.qualityPct.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                (Rend: {quality.metallicYieldPct.toFixed(1)}%)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800/80 pt-1">
              <span>Produção Boa:</span>
              <span className="text-emerald-400 font-bold">{quality.goodProductionTons} t</span>
            </div>
          </div>

          {/* Faixa com Fórmula Obrigatória */}
          <div className="md:col-span-4 bg-slate-900/50 border border-slate-800/80 px-3.5 py-1.5 rounded-lg flex flex-wrap items-center justify-between text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px] uppercase font-bold">
                Fórmula Industrial:
              </span>
              <span className="font-bold text-sky-400">
                Disponibilidade ({availability.availabilityPct.toFixed(1)}%)
              </span>
              <span className="text-slate-500">&times;</span>
              <span className="font-bold text-amber-400">
                Performance ({performance.performancePct.toFixed(1)}%)
              </span>
              <span className="text-slate-500">&times;</span>
              <span className="font-bold text-emerald-400">
                Qualidade ({quality.qualityPct.toFixed(1)}%)
              </span>
              <span className="text-slate-500">=</span>
              <span className="font-black text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                OEE {overallOeePct.toFixed(1)}%
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Cálculo em conformidade com a Norma ISO 22400 &bull; Regra Operacional CIAFAL
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. ABAS INTERNAS COMPACTAS
            [ Resumo (Funil) ] [ Disponibilidade ] [ Performance ] [ Qualidade ] [ Paradas ] [ Histórico ]
        ========================================================================= */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-4 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0">
            <TabsList className="bg-slate-950 border border-slate-800 p-0.5 h-8">
              <TabsTrigger
                value="RESUMO"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-sm px-3 py-1"
              >
                Funil de Tempo (Resumo)
              </TabsTrigger>
              <TabsTrigger
                value="DISPONIBILIDADE"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-sm px-3 py-1"
              >
                Disponibilidade
              </TabsTrigger>
              <TabsTrigger
                value="PERFORMANCE"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-sm px-3 py-1"
              >
                Performance
              </TabsTrigger>
              <TabsTrigger
                value="QUALIDADE"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-sm px-3 py-1"
              >
                Qualidade & Rendimento
              </TabsTrigger>
              <TabsTrigger
                value="PARADAS"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-sm px-3 py-1"
              >
                Detalhamento de Paradas
              </TabsTrigger>
              <TabsTrigger
                value="HISTORICO"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-sm px-3 py-1"
              >
                Previsto x Realizado & Histórico
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* =========================================================================
                ABA 1: FUNIL DE TEMPO & PARETO DE PERDAS
            ========================================================================= */}
            <TabsContent value="RESUMO" className="m-0 space-y-4">
              {/* Modelo Visual do Funil de Tempo (Referência Conceitual CIAFAL) */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="p-3.5 pb-2 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-sky-400" />
                        Funil de Tempo e Decomposição de Perdas Industriais
                      </CardTitle>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Rastreamento da capacidade desde o Tempo Total Disponível até a Produção Boa
                        aprovada.
                      </p>
                    </div>
                    <Badge className="bg-slate-800 text-slate-300 text-[10px] font-mono">
                      Janela: {context.periodLabel || 'Turno 8.0h'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {funnelStages.map((stage, idx) => (
                    <div key={stage.id} className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-white">{stage.label}</span>
                          <span className="text-sky-300 font-bold">
                            {stage.hours.toFixed(2)}h{' '}
                            {stage.tons ? `(${stage.tons.toLocaleString('pt-BR')} t)` : ''}
                          </span>
                        </div>

                        {stage.lossLabel && (
                          <div className="flex items-center gap-1.5 text-[11px] text-rose-400">
                            <span>&minus; {stage.lossLabel}:</span>
                            <strong className="bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-900 text-rose-300">
                              {stage.lossHours ? `${stage.lossHours.toFixed(2)}h` : ''}
                              {stage.lossTons ? ` (${stage.lossTons.toFixed(1)} t)` : ''}
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Barra de Proporção */}
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            stage.barColor,
                          )}
                          style={{ width: `${Math.max(5, stage.percentageOfTotal)}%` }}
                          title={`${stage.label}: ${stage.percentageOfTotal}%`}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Pareto de Perdas no Drill-down */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="p-3.5 pb-2 border-b border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      Pareto de Perdas de Eficiência
                    </CardTitle>

                    {/* Filtros de Categoria do Pareto */}
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => setParetoFilter('ALL')}
                        className={cn(
                          'px-2 py-0.5 rounded transition-colors',
                          paretoFilter === 'ALL'
                            ? 'bg-[#004C97] text-white font-bold'
                            : 'text-slate-400 hover:text-white',
                        )}
                      >
                        Todas as Perdas
                      </button>
                      <button
                        type="button"
                        onClick={() => setParetoFilter('AVAILABILITY')}
                        className={cn(
                          'px-2 py-0.5 rounded transition-colors',
                          paretoFilter === 'AVAILABILITY'
                            ? 'bg-sky-700 text-white font-bold'
                            : 'text-slate-400 hover:text-white',
                        )}
                      >
                        Disponibilidade
                      </button>
                      <button
                        type="button"
                        onClick={() => setParetoFilter('PERFORMANCE')}
                        className={cn(
                          'px-2 py-0.5 rounded transition-colors',
                          paretoFilter === 'PERFORMANCE'
                            ? 'bg-amber-700 text-white font-bold'
                            : 'text-slate-400 hover:text-white',
                        )}
                      >
                        Performance
                      </button>
                      <button
                        type="button"
                        onClick={() => setParetoFilter('QUALITY')}
                        className={cn(
                          'px-2 py-0.5 rounded transition-colors',
                          paretoFilter === 'QUALITY'
                            ? 'bg-emerald-700 text-white font-bold'
                            : 'text-slate-400 hover:text-white',
                        )}
                      >
                        Qualidade
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-2.5"># Rank</th>
                        <th className="p-2.5">Componente</th>
                        <th className="p-2.5">Motivo / Causa da Perda</th>
                        <th className="p-2.5 text-right">Duração (min)</th>
                        <th className="p-2.5 text-right">Impacto (t)</th>
                        <th className="p-2.5 text-right">% Perda</th>
                        <th className="p-2.5 text-right">% Acumulado</th>
                        <th className="p-2.5 text-center">Origem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filteredPareto.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-2.5 font-bold text-white">#{p.rank}</td>
                          <td className="p-2.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px] font-mono',
                                p.category === 'AVAILABILITY'
                                  ? 'border-sky-800 text-sky-300 bg-sky-950/40'
                                  : p.category === 'PERFORMANCE'
                                    ? 'border-amber-800 text-amber-300 bg-amber-950/40'
                                    : 'border-emerald-800 text-emerald-300 bg-emerald-950/40',
                              )}
                            >
                              {p.category === 'AVAILABILITY'
                                ? 'Disponibilidade'
                                : p.category === 'PERFORMANCE'
                                  ? 'Performance'
                                  : 'Qualidade'}
                            </Badge>
                          </td>
                          <td className="p-2.5 font-sans font-medium text-white">{p.lossName}</td>
                          <td className="p-2.5 text-right text-slate-300">
                            {p.durationMinutes > 0 ? `${p.durationMinutes} min` : '—'}
                          </td>
                          <td className="p-2.5 text-right text-rose-400 font-bold">
                            {p.impactTons > 0 ? `-${p.impactTons.toFixed(1)} t` : '—'}
                          </td>
                          <td className="p-2.5 text-right text-slate-200">
                            {p.percentageOfTotalLoss.toFixed(1)}%
                          </td>
                          <td className="p-2.5 text-right text-sky-400 font-bold">
                            {p.accumulatedPercentage.toFixed(1)}%
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">
                              {p.source}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* =========================================================================
                ABA 2: DISPONIBILIDADE (TEMPOS E PARADAS)
            ========================================================================= */}
            <TabsContent value="DISPONIBILIDADE" className="m-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="bg-slate-900 border-slate-800 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Tempo Total Disponível
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-white">
                      {availability.totalAvailableHours.toFixed(2)}h
                    </span>
                    <span className="text-xs text-slate-400">
                      ({context.period === 'SHIFT' ? '1 Turno' : '24h Diário'})
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Janela nominal cadastrada no calendário operacional CIAFAL.
                  </p>
                </Card>

                <Card className="bg-slate-900 border-slate-800 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-sky-400 block">
                    Tempo Disponível para Produção
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-sky-400">
                      {availability.availableProductionHours.toFixed(2)}h
                    </span>
                    <span className="text-xs text-slate-400">
                      (&minus;{availability.plannedStopsHours.toFixed(2)}h programadas)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tempo Total Disponível menos paradas programadas de Ficha Mestre.
                  </p>
                </Card>

                <Card className="bg-slate-900 border-slate-800 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                    Tempo Real de Produção
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-emerald-400">
                      {availability.realProductionHours.toFixed(2)}h
                    </span>
                    <span className="text-xs text-rose-400 font-bold">
                      (&minus;{availability.unplannedStopsHours.toFixed(2)}h não prog.)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tempo efetivo em que a linha esteve rodando em laminação.
                  </p>
                </Card>
              </div>

              {/* Tabela de Paradas Programadas Previsto x Realizado */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="p-3.5 pb-2 border-b border-slate-800">
                  <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-400" />
                      Paradas Programadas (PCP &bull; PCM &bull; MES)
                    </span>
                    <Badge className="bg-sky-950 text-sky-300 border-sky-800 text-[10px] font-mono">
                      Previsto: {availability.plannedStopsPlannedHours.toFixed(2)}h | Realizado:{' '}
                      {availability.plannedStopsHours.toFixed(2)}h
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Motivo / Tipo</th>
                        <th className="p-2.5">Origem</th>
                        <th className="p-2.5">Início Prev.</th>
                        <th className="p-2.5">Fim Prev.</th>
                        <th className="p-2.5 text-right">Dur. Prev.</th>
                        <th className="p-2.5">Início Real</th>
                        <th className="p-2.5">Fim Real</th>
                        <th className="p-2.5 text-right">Dur. Real</th>
                        <th className="p-2.5 text-right">Desvio</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {availability.stopsBreakdown.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-2.5">
                            <div className="font-sans font-bold text-white">{s.reason}</div>
                            <div className="text-[10px] text-slate-500">{s.orderOrEquipment}</div>
                          </td>
                          <td className="p-2.5">
                            <Badge className="bg-slate-950 text-sky-300 border-slate-700 text-[9px] font-mono">
                              {s.source}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-slate-400">{s.plannedStart}</td>
                          <td className="p-2.5 text-slate-400">{s.plannedEnd}</td>
                          <td className="p-2.5 text-right text-slate-300">
                            {s.plannedDurationHours.toFixed(2)}h
                          </td>
                          <td className="p-2.5 text-slate-300">{s.realizedStart || '—'}</td>
                          <td className="p-2.5 text-slate-300">{s.realizedEnd || '—'}</td>
                          <td className="p-2.5 text-right font-bold text-white">
                            {s.realizedDurationHours !== undefined &&
                            s.realizedDurationHours !== null
                              ? `${s.realizedDurationHours.toFixed(2)}h`
                              : '—'}
                          </td>
                          <td className="p-2.5 text-right font-bold">
                            {(s.deviationHours || 0) <= 0 ? (
                              <span className="text-emerald-400">
                                {s.deviationHours?.toFixed(2)}h
                              </span>
                            ) : (
                              <span className="text-rose-400">
                                +{s.deviationHours?.toFixed(2)}h
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[9px]">
                              {s.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* =========================================================================
                ABA 3: PERFORMANCE (TEÓRICA X REAL & AOM/IBA)
            ========================================================================= */}
            <TabsContent value="PERFORMANCE" className="m-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="bg-slate-900 border-slate-800 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Cadência Nominal (Ficha Mestre)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-white">
                      {performance.theoreticalRatePerHour}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">t/h</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Velocidade teórica padrão para {context.productCode}.
                  </p>
                </Card>

                <Card className="bg-slate-900 border-slate-800 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">
                    Cadência Realizada (MES)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-amber-400">
                      {performance.realRatePerHour}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">t/h</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Taxa média de vazão apurada durante as {performance.realProductionHours}h
                    produtivas.
                  </p>
                </Card>

                <Card className="bg-slate-900 border-slate-800 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-rose-400 block">
                    Perda de Ritmo / Velocidade
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-rose-400">
                      {performance.rhythmSpeedLossTons}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">t</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({performance.rhythmSpeedLossHours}h equiv.)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Produção Teórica ({performance.theoreticalProductionTons} t) &minus; Real (
                    {performance.realProductionTons} t).
                  </p>
                </Card>
              </div>

              {/* Módulo AOM / IBA (Telemetria Avançada do Processo) */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="p-3.5 pb-2 border-b border-slate-800 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-sky-400" />
                      Diagnóstico de Processo & Telemetria AOM / IBA
                    </CardTitle>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Parâmetros térmicos, velocidade de laminação e microparadas para explicar
                      desvios de Performance.
                    </p>
                  </div>

                  {performance.aomProcessVariables?.isAvailable ? (
                    <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px] font-mono">
                      Sensores IBA Operantes
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-slate-700 text-slate-400 text-[10px] font-mono"
                    >
                      AOM/IBA: Não disponível nesta linha
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="p-4">
                  {performance.aomProcessVariables?.isAvailable ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">
                          Velocidade de Laminação
                        </span>
                        <div className="text-base font-black text-sky-400 mt-0.5">
                          {performance.aomProcessVariables.avgSpeedMetersPerSec} m/s
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Meta nominal: {performance.aomProcessVariables.targetSpeedMetersPerSec}{' '}
                          m/s
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">
                          Temperatura Forno / Tarugo
                        </span>
                        <div className="text-base font-black text-amber-400 mt-0.5">
                          {performance.aomProcessVariables.avgFurnaceTempCelsius} &deg;C
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Meta Ficha Mestre:{' '}
                          {performance.aomProcessVariables.targetFurnaceTempCelsius} &deg;C
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">
                          Microparadas (&lt; 3 min)
                        </span>
                        <div className="text-base font-black text-rose-400 mt-0.5">
                          {performance.aomProcessVariables.microStopsCount} eventos
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Tempo total perdido: ~
                          {Math.round((performance.microStopsLossHours || 0.15) * 60)} min
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">
                          Desvios de Parâmetros
                        </span>
                        <div className="text-base font-black text-white mt-0.5">
                          {performance.aomProcessVariables.processDeviationsCount} desvios
                        </div>
                        <span className="text-[10px] text-emerald-400">
                          Classificação AOM: Estável
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-950 rounded-lg border border-slate-800 text-center text-slate-400 text-xs">
                      <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-slate-300">
                        Integração IBA / AOM não parametrizada para a Linha {context.lineCode}
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                        Conforme governança CIAFAL, valores não foram inventados. O sistema utiliza
                        apontamento MES de velocidade e paradas.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* =========================================================================
                ABA 4: QUALIDADE & RENDIMENTO METÁLICO (REGRA CIAFAL)
            ========================================================================= */}
            <TabsContent value="QUALIDADE" className="m-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card className="bg-slate-900 border-slate-800 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Produção Desenfornada
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-white">
                      {quality.dischargedTons.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">t</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tarugos brutos que saíram do forno de reaquecimento.
                  </p>
                </Card>

                <Card className="bg-slate-900 border-slate-800 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-sky-400 block">
                    Produção Laminada
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-sky-400">
                      {quality.rolledTons.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">t</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Produção real bruta medida na tesoura voadora.
                  </p>
                </Card>

                <Card className="bg-slate-900 border-slate-800 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                    Produção Boa Aprovada
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-emerald-400">
                      {quality.goodProductionTons.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">t</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Material em conformidade dimensional liberado para expedição.
                  </p>
                </Card>

                <Card className="bg-slate-900 border-slate-800 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-rose-400 block">
                    Refugo & Perda Metálica
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-rose-400">
                      {quality.metallicLossTons.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">t</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Perda por carepa, ponta e sucata ({quality.scrapTons} t).
                  </p>
                </Card>
              </div>

              {/* Bloco de Governança de Rendimento Metálico CIAFAL */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="p-3.5 pb-2 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Rendimento Metálico & Formulação Governada
                    </CardTitle>
                    <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px] font-mono">
                      Rendimento: {quality.metallicYieldPct.toFixed(2)}% (Meta:{' '}
                      {quality.targetMetallicYieldPct.toFixed(2)}%)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 font-mono">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <span className="text-slate-400">Regra de Rendimento Metálico:</span>
                      <span className="text-sky-300 font-bold">
                        Rendimento Metálico = Produção Boa / Produção Desenfornada
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-500 block">Fonte Parametrizada:</span>
                        <strong className="text-white">{quality.metallicYieldRuleSource}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cálculo no Período:</span>
                        <strong className="text-emerald-400 font-mono">
                          {quality.goodProductionTons.toFixed(2)} t /{' '}
                          {quality.dischargedTons.toFixed(2)} t ={' '}
                          {quality.metallicYieldPct.toFixed(2)}%
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Índice de Qualidade (Q):</span>
                        <strong className="text-white font-mono">
                          {quality.goodProductionTons.toFixed(2)} t /{' '}
                          {quality.rolledTons.toFixed(2)} t = {quality.qualityPct.toFixed(2)}%
                        </strong>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* =========================================================================
                ABA 5: PARADAS (PROGRAMADAS X NÃO PROGRAMADAS EVENTO POR EVENTO)
            ========================================================================= */}
            <TabsContent value="PARADAS" className="m-0 space-y-4">
              {/* Paradas Não Programadas */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="p-3.5 pb-2 border-b border-slate-800 flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Paradas Não Programadas (Impacto Direto na Disponibilidade)
                  </CardTitle>
                  <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[10px] font-mono">
                    Total: {availability.unplannedStopsHours.toFixed(2)}h (
                    {availability.unplannedStopsCount} eventos)
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Código / Equipamento</th>
                        <th className="p-2.5">Causa / Descrição</th>
                        <th className="p-2.5">Classificação</th>
                        <th className="p-2.5">Início</th>
                        <th className="p-2.5">Fim</th>
                        <th className="p-2.5 text-right">Duração (h)</th>
                        <th className="p-2.5">Ordem de Produção</th>
                        <th className="p-2.5 text-center">Origem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {availability.unscheduledStopsBreakdown.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-2.5 font-bold text-white">{u.equipmentCode}</td>
                          <td className="p-2.5">
                            <div className="font-sans font-medium text-white">{u.reason}</div>
                            {u.notes && (
                              <div className="text-[10px] text-slate-400 italic">{u.notes}</div>
                            )}
                          </td>
                          <td className="p-2.5">
                            <Badge
                              variant="outline"
                              className="text-[9px] border-slate-700 text-slate-300"
                            >
                              {u.classification}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-slate-300">{u.realizedStart}</td>
                          <td className="p-2.5 text-slate-300">{u.realizedEnd}</td>
                          <td className="p-2.5 text-right font-bold text-rose-400">
                            {u.realizedDurationHours.toFixed(2)}h
                          </td>
                          <td className="p-2.5 text-sky-300">{u.orderNumber || '—'}</td>
                          <td className="p-2.5 text-center">
                            <Badge className="bg-slate-950 text-slate-300 border-slate-700 text-[9px]">
                              {u.source}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* =========================================================================
                ABA 6: PREVISTO X REALIZADO & HISTÓRICO
            ========================================================================= */}
            <TabsContent value="HISTORICO" className="m-0 space-y-4">
              {/* Cards de Comparação Histórica */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">OEE Atual</span>
                  <div className="text-lg font-black text-white mt-0.5">
                    {history.currentOee.toFixed(1)}%
                  </div>
                  <span className="text-[9px] text-slate-500">Período ativo</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">Turno Anterior</span>
                  <div className="text-lg font-black text-sky-400 mt-0.5">
                    {history.previousShiftOee ? `${history.previousShiftOee.toFixed(1)}%` : '—'}
                  </div>
                  <span className="text-[9px] text-slate-500">Turno 3 anterior</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">Dia Anterior</span>
                  <div className="text-lg font-black text-slate-300 mt-0.5">
                    {history.previousDayOee ? `${history.previousDayOee.toFixed(1)}%` : '—'}
                  </div>
                  <span className="text-[9px] text-slate-500">Média 24h</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">Média 7 Dias</span>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">
                    {history.avg7DaysOee.toFixed(1)}%
                  </div>
                  <span className="text-[9px] text-slate-500">Últimos 7 dias</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">Média 30 Dias</span>
                  <div className="text-lg font-black text-indigo-400 mt-0.5">
                    {history.avg30DaysOee.toFixed(1)}%
                  </div>
                  <span className="text-[9px] text-slate-500">Mês móvel</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">
                    Meta Parametrizada
                  </span>
                  <div className="text-lg font-black text-amber-400 mt-0.5">
                    {history.targetOee.toFixed(1)}%
                  </div>
                  <span className="text-[9px] text-slate-500">Linha {context.lineCode}</span>
                </div>
              </div>

              {/* Tabela Completa Previsto x Realizado */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="p-3.5 pb-2 border-b border-slate-800">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                    Comparativo Completo Previsto &times; Realizado
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Indicador / Métrica</th>
                        <th className="p-2.5 text-center">Unid.</th>
                        <th className="p-2.5 text-right">Previsto</th>
                        <th className="p-2.5 text-right">Realizado</th>
                        <th className="p-2.5 text-right">Desvio Absoluto</th>
                        <th className="p-2.5 text-right">Desvio %</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-center">Módulo Origem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {plannedVsRealized.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-2.5 font-sans font-medium text-white">{item.metric}</td>
                          <td className="p-2.5 text-center text-slate-400">{item.unit}</td>
                          <td className="p-2.5 text-right text-slate-300">
                            {item.planned.toLocaleString('pt-BR')}
                          </td>
                          <td className="p-2.5 text-right font-bold text-white">
                            {item.realized.toLocaleString('pt-BR')}
                          </td>
                          <td className="p-2.5 text-right font-bold">
                            {item.deviationAbs > 0 ? (
                              <span
                                className={
                                  item.status === 'RED' ? 'text-rose-400' : 'text-emerald-400'
                                }
                              >
                                +{item.deviationAbs.toLocaleString('pt-BR')}
                              </span>
                            ) : item.deviationAbs < 0 ? (
                              <span
                                className={
                                  item.status === 'RED' ? 'text-rose-400' : 'text-emerald-400'
                                }
                              >
                                {item.deviationAbs.toLocaleString('pt-BR')}
                              </span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right text-slate-300">
                            {item.deviationPct.toFixed(1)}%
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={cn(
                                'w-2.5 h-2.5 rounded-full inline-block',
                                item.status === 'GREEN'
                                  ? 'bg-emerald-500'
                                  : item.status === 'YELLOW'
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500',
                              )}
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <Badge className="bg-slate-950 text-slate-300 border-slate-700 text-[9px] font-mono">
                              {item.sourceModule}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* =========================================================================
            5. MODAL IA DE ANÁLISE DO OEE
            Classificação rigorosa: EVIDÊNCIA CONFIRMADA vs HIPÓTESE
        ========================================================================= */}
        <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
          <DialogContent className="max-w-3xl bg-slate-950 border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                <span>Análise de OEE com IA &bull; Hub Industrial CIAFAL</span>
              </div>
              <DialogTitle className="text-base font-bold text-white mt-1">
                Diagnóstico Causal de Eficiência &bull; Linha {context.lineCode}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Cruzamento determinístico de dados reais (PCP, MES, PCM e AOM/IBA) com classificação
                de evidências.
              </DialogDescription>
            </DialogHeader>

            {isAiLoading ? (
              <div className="p-10 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono text-slate-400">
                  Cruzando variáveis operacionais e classificando evidências causais...
                </p>
              </div>
            ) : (
              aiAnalysis && (
                <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                  {/* Driver Principal */}
                  <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950/60 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-sky-400 font-mono">
                        Componente Mais Crítico (Maior Redutor)
                      </span>
                      <Badge className="bg-sky-950 text-sky-300 border-sky-800 text-[10px] font-mono">
                        Confiança: {aiAnalysis.confidenceScorePct}%
                      </Badge>
                    </div>
                    <p className="text-slate-200 font-medium leading-relaxed">
                      {aiAnalysis.primaryDriverDescription}
                    </p>
                  </div>

                  {/* Lista de Achados (Classificação Rigorosa) */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-400 block">
                      Decomposição de Causas e Hipóteses Identificadas:
                    </span>

                    {aiAnalysis.findings.map((f) => (
                      <div
                        key={f.id}
                        className={cn(
                          'p-3 rounded-lg border space-y-1.5',
                          f.type === 'CONFIRMED_EVIDENCE'
                            ? 'bg-slate-900/90 border-slate-800'
                            : 'bg-amber-950/20 border-amber-900/50',
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                          <div className="flex items-center gap-2">
                            {f.type === 'CONFIRMED_EVIDENCE' ? (
                              <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[9px] font-mono font-bold">
                                EVIDÊNCIA CONFIRMADA
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[9px] font-mono font-bold">
                                HIPÓTESE A VALIDAR
                              </Badge>
                            )}
                            <span className="font-bold text-white">{f.title}</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-rose-400">
                            {f.impactText}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                          {f.evidenceDescription}
                        </p>

                        <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 text-[11px] text-sky-300 flex items-start gap-1.5 font-sans">
                          <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>Ação Recomendada:</strong> {f.recommendation}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Ações Prescritivas */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-300 block">
                      Ações Imediatas para o Próximo Turno:
                    </span>
                    <div className="space-y-1.5">
                      {aiAnalysis.prescriptiveActions.map((act, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] font-mono bg-slate-950 p-2 rounded border border-slate-800/80"
                        >
                          <span className="text-white font-sans">{act.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">
                              Resp: <strong className="text-slate-200">{act.responsible}</strong>
                            </span>
                            <Badge className="bg-blue-950 text-sky-300 border-blue-800 text-[9px]">
                              {act.deadlineHours}h
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}

            <DialogFooter className="p-3 bg-slate-900 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAiModalOpen(false)}
                className="border-slate-700 bg-slate-900 text-slate-300 text-xs"
              >
                Fechar Diagnóstico
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  )
}

export default OeeDrilldownModal
