import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import {
  AlertOctagon,
  Layers,
  Sparkles,
  ArrowDown,
  Clock,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const BottleneckBufferBoard: React.FC = () => {
  const { filteredBottlenecks, buffers, setIsAIPanelOpen, setSelectedOrder, orders } =
    useControlTower()

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-400" />
          <span className="font-bold text-white uppercase tracking-wider">
            Monitor de Gargalos & Buffers de Acoplamento Produtivo
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAIPanelOpen(true)}
          className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs h-7 gap-1 font-bold shadow"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" /> Analisar Gargalos com IA
        </Button>
      </div>

      {/* Grid: Ranking de Gargalos & Buffers entre Processos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Ranking de Gargalos Estruturais */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              Ranking de Restrições Críticas (Teoria das Restrições)
            </span>
            <Badge className="bg-rose-950 text-rose-300 border-rose-700 text-[10px]">
              {filteredBottlenecks.length} restrições
            </Badge>
          </div>

          <div className="space-y-3">
            {filteredBottlenecks.map((bot) => (
              <Card
                key={bot.id}
                className="bg-slate-950 border-slate-800 text-slate-100 hover:border-slate-700 transition-all shadow-sm"
              >
                <CardHeader className="p-3 pb-2 border-b border-slate-900 flex flex-row items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-rose-950 border border-rose-700 text-rose-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {bot.rank}
                    </span>
                    <div>
                      <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{bot.processName}</span>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono border-slate-700 text-cyan-300"
                        >
                          {bot.processCode}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-400">
                        Classificação: <strong>{bot.classification}</strong> &bull; Cobertura:{' '}
                        <strong>{bot.coverageHours}h</strong>
                      </CardDescription>
                    </div>
                  </div>

                  <Badge
                    className={`text-[9px] font-bold uppercase ${
                      bot.criticality === 'ALTA'
                        ? 'bg-rose-950 text-rose-400 border-rose-700'
                        : 'bg-amber-950 text-amber-400 border-amber-700'
                    }`}
                  >
                    Criticidade: {bot.criticality}
                  </Badge>
                </CardHeader>

                <CardContent className="p-3 space-y-2.5 text-xs">
                  <p className="text-slate-300 text-[11px] leading-relaxed">{bot.description}</p>

                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-850 space-y-1 text-[11px]">
                    <div className="text-slate-400">
                      Impacto de Volume: <strong className="text-white">{bot.impactTons} t</strong>{' '}
                      &bull; Pedidos Afetados:{' '}
                      <strong className="text-rose-400">{bot.impactOrdersCount} pedidos</strong>
                    </div>
                    <div className="text-slate-400 truncate">
                      Clientes em Risco:{' '}
                      <strong className="text-slate-300">{bot.affectedCustomers.join(', ')}</strong>
                    </div>
                  </div>

                  {/* Recomendação de IA */}
                  <div className="bg-[#004C97]/20 border border-blue-800/60 rounded-lg p-2 text-[11px] text-blue-200">
                    <span className="font-bold flex items-center gap-1 text-cyan-300 mb-0.5">
                      <Sparkles className="w-3 h-3" /> Recomendação do Sequenciamento IA:
                    </span>
                    <p className="leading-snug">{bot.aiRecommendation}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Coluna 2: Buffers Intermediários & Fila Produtiva */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              Buffers entre Processos & Estoque em Processo (WIP)
            </span>
            <Badge className="bg-cyan-950 text-cyan-300 border-cyan-700 text-[10px]">
              {buffers.length} acoplamentos
            </Badge>
          </div>

          <div className="space-y-3">
            {buffers.map((buf) => {
              const isWarning = buf.status === 'WARNING_LOW' || buf.status === 'RUPTURE_RISK'
              const fillPct = Math.round((buf.currentStockTons / buf.maxStockTons) * 100)

              return (
                <Card
                  key={buf.id}
                  className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm"
                >
                  <CardHeader className="p-3 pb-2 border-b border-slate-900 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="font-mono text-cyan-400">{buf.upstreamCode}</span>
                        <ArrowDown className="w-3 h-3 text-slate-500" />
                        <span className="font-mono text-cyan-400">{buf.downstreamCode}</span>
                        <span className="text-slate-300 font-normal ml-1">({buf.name})</span>
                      </CardTitle>
                    </div>

                    <Badge
                      className={`text-[9px] uppercase font-mono ${
                        buf.status === 'RUPTURE_RISK'
                          ? 'bg-rose-950 text-rose-300 border-rose-700'
                          : buf.status === 'WARNING_LOW'
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      }`}
                    >
                      {buf.status}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-3 space-y-3 text-xs">
                    {/* Barra de Estoque do Buffer */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          Estoque Atual:{' '}
                          <strong className="text-white">{buf.currentStockTons} t</strong>
                        </span>
                        <span className="font-mono text-slate-400">
                          Min: {buf.minStockTons} t / Max: {buf.maxStockTons} t
                        </span>
                      </div>

                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                        <div
                          className={`h-full ${
                            buf.status === 'RUPTURE_RISK'
                              ? 'bg-rose-500'
                              : buf.status === 'WARNING_LOW'
                                ? 'bg-amber-500'
                                : 'bg-[#004C97]'
                          }`}
                          style={{ width: `${Math.min(100, fillPct)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2 rounded-lg border border-slate-850">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Taxa de Consumo</span>
                        <span className="font-mono font-bold text-white">
                          {buf.consumptionRateTonsPerHour} t/h
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Cobertura Térmica</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {buf.coverageHours} horas
                        </span>
                      </div>
                    </div>

                    {/* Fila Produtiva no Buffer */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-900">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Fila de OPs em Espera ({buf.ordersInQueue.length}):
                      </span>

                      <div className="space-y-1">
                        {buf.ordersInQueue.map((q) => (
                          <div
                            key={q.orderNumber}
                            onClick={() => {
                              const found = orders.find((o) => o.orderNumber === q.orderNumber)
                              if (found) setSelectedOrder(found)
                            }}
                            className="bg-slate-900/80 hover:bg-slate-900 p-1.5 rounded border border-slate-850 flex items-center justify-between text-[11px] cursor-pointer transition-all"
                          >
                            <span className="font-mono font-bold text-cyan-300">
                              {q.orderNumber}
                            </span>
                            <span className="text-slate-300">{q.tons} ton</span>
                            <span className="text-slate-400 font-mono">~{q.durationHours}h</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
