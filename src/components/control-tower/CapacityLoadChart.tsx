import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { BarChart3, Activity, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const CapacityLoadChart: React.FC = () => {
  const { filteredNodes, setSelectedProcess } = useControlTower()

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#004C97]" />
          <span className="font-bold text-white uppercase tracking-wider">
            Balanço de Carga × Capacidade por Recurso Industrial
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2.5 h-2.5 rounded bg-[#004C97]"></span> Carga Atual (t/h)
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Capacidade Nominal
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Sobrecarga (&gt;100%)
          </span>
        </div>
      </div>

      {/* Grid de Linhas / Máquinas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNodes.map((node) => {
          const loadPct = node.occupancyPct
          const isOverloaded = loadPct > 100
          const isAttention = loadPct >= 85 && loadPct <= 100
          const isNormal = loadPct < 85

          return (
            <Card
              key={node.id}
              onClick={() => setSelectedProcess(node)}
              className="bg-slate-950 border-slate-800 text-slate-100 hover:border-slate-700 cursor-pointer transition-all shadow-sm"
            >
              <CardHeader className="p-4 pb-2 border-b border-slate-900 flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400 text-sm">{node.code}</span>
                    <span className="text-xs text-slate-300 font-semibold">{node.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{node.sector}</div>
                </div>

                <Badge
                  className={`text-[10px] font-mono font-bold ${
                    isOverloaded
                      ? 'bg-rose-950 text-rose-300 border-rose-700'
                      : isAttention
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  }`}
                >
                  {loadPct}% Carga
                </Badge>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                {/* Gráfico de Barras Carga x Capacidade */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Taxa Atual:</span>
                    <span className="font-mono font-bold text-white">
                      {node.currentRateTonsPerHour} t/h / {node.nominalCapacityTonsPerHour} t/h
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                    <div
                      className={`h-full transition-all ${
                        isOverloaded
                          ? 'bg-rose-500'
                          : isAttention
                            ? 'bg-[#004C97]'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, loadPct)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Métricas Adicionais */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2 rounded-lg border border-slate-850">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Capacidade Nominal</span>
                    <span className="font-mono font-bold text-slate-200">100% (Base)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Classificação</span>
                    <span
                      className={`font-semibold ${
                        isOverloaded
                          ? 'text-rose-400'
                          : isAttention
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                      }`}
                    >
                      {isOverloaded
                        ? 'Sobrecarga Crítica'
                        : isAttention
                          ? 'Faixa de Atenção'
                          : 'Operação Normal'}
                    </span>
                  </div>
                </div>

                {/* Buffer Downstream */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Buffer Conectado:</span>
                  <span className="font-mono text-cyan-300">
                    {node.downstreamBufferTons} t ({node.downstreamBufferHours}h)
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
