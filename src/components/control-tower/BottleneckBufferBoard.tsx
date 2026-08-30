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
      <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex items-center justify-between text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-600" />
          <span className="font-bold text-slate-900 uppercase tracking-wider">
            Monitor de Gargalos & Buffers de Acoplamento Produtivo
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAIPanelOpen(true)}
          className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-7 gap-1 font-bold shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5" /> Analisar Gargalos com IA
        </Button>
      </div>
      {/* Grid: Ranking de Gargalos & Buffers entre Processos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Ranking de Gargalos Estruturais */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Ranking de Restrições Críticas (Teoria das Restrições)
            </span>
            <Badge className="bg-rose-50 text-rose-800 border-rose-300 text-[10px] font-bold">
              {filteredBottlenecks.length} restrições
            </Badge>
          </div>

          <div className="space-y-3">
            {filteredBottlenecks.map((bot) => (
              <Card
                key={bot.id}
                className="bg-white border-slate-200 text-slate-900 hover:border-slate-300 transition-all shadow-2xs"
              >
                <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex flex-row items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-rose-100 border border-rose-300 text-rose-800 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {bot.rank}
                    </span>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{bot.processName}</span>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono border-slate-200 text-[#004C97] bg-slate-50"
                        >
                          {bot.processCode}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500">
                        Classificação: <strong>{bot.classification}</strong> &bull; Cobertura:{' '}
                        <strong>{bot.coverageHours} h</strong>
                      </CardDescription>
                    </div>
                  </div>

                  <Badge
                    className={`text-[9px] font-bold uppercase ${
                      bot.criticality === 'ALTA'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    Criticidade: {bot.criticality}
                  </Badge>
                </CardHeader>

                <CardContent className="p-3.5 space-y-2.5 text-xs">
                  <p className="text-slate-700 text-[11px] leading-relaxed">{bot.description}</p>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[11px]">
                    <div className="text-slate-600">
                      Impacto de Volume:{' '}
                      <strong className="text-slate-900">{bot.impactTons} t</strong> &bull; Pedidos
                      Afetados:{' '}
                      <strong className="text-rose-700">{bot.impactOrdersCount} pedidos</strong>
                    </div>
                    <div className="text-slate-600 truncate">
                      Clientes em Risco:{' '}
                      <strong className="text-slate-800">{bot.affectedCustomers.join(', ')}</strong>
                    </div>
                  </div>

                  {/* Recomendação de IA */}
                  <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 text-[11px] text-slate-800">
                    <span className="font-bold flex items-center gap-1 text-[#004C97] mb-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#004C97]" /> Recomendação do
                      Sequenciamento IA:
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
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Buffers entre Processos & Estoque em Processo (WIP)
            </span>
            <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-bold">
              {buffers.length} acoplamentos
            </Badge>
          </div>

          <div className="space-y-3">
            {buffers.map((buf) => {
              const isWarning = buf.status === 'WARNING_LOW' || buf.status === 'RUPTURE_RISK'
              const fillPct = Math.round((buf.currentStockTons / buf.maxStockTons) * 100)

              return (
                <Card key={buf.id} className="bg-white border-slate-200 text-slate-900 shadow-2xs">
                  <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="font-mono text-[#004C97] font-bold">
                          {buf.upstreamCode}
                        </span>
                        <ArrowDown className="w-3 h-3 text-slate-400" />
                        <span className="font-mono text-[#004C97] font-bold">
                          {buf.downstreamCode}
                        </span>
                        <span className="text-slate-600 font-normal ml-1">({buf.name})</span>
                      </CardTitle>
                    </div>

                    <Badge
                      className={`text-[9px] uppercase font-mono font-bold ${
                        buf.status === 'RUPTURE_RISK'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : buf.status === 'WARNING_LOW'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {buf.status}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-3.5 space-y-3 text-xs">
                    {/* Barra de Estoque do Buffer */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">
                          Estoque Atual:{' '}
                          <strong className="text-slate-900">{buf.currentStockTons} t</strong>
                        </span>
                        <span className="font-mono text-slate-500">
                          Min: {buf.minStockTons} t / Max: {buf.maxStockTons} t
                        </span>
                      </div>

                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
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

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Taxa de Consumo</span>
                        <span className="font-mono font-bold text-slate-900">
                          {buf.consumptionRateTonsPerHour} t/h
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Cobertura Térmica</span>
                        <span className="font-mono font-bold text-[#004C97]">
                          {buf.coverageHours} h
                        </span>
                      </div>
                    </div>

                    {/* Fila Produtiva no Buffer */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
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
                            className="bg-slate-50 hover:bg-slate-100 p-2 rounded border border-slate-200 flex items-center justify-between text-[11px] cursor-pointer transition-all"
                          >
                            <span className="font-mono font-bold text-[#004C97]">
                              {q.orderNumber}
                            </span>
                            <span className="text-slate-700 font-medium">{q.tons} t</span>
                            <span className="text-slate-500 font-mono">~{q.durationHours} h</span>
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
      </div>{' '}
    </div>
  )
}
