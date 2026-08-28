import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Flame,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react'
import { ScenarioBottleneckDetail } from '@/types/optimization-engine'

interface BottleneckBoardProps {
  bottlenecks?: ScenarioBottleneckDetail[]
  onSelectLine?: (lineCode: string) => void
}

const DEFAULT_BOTTLENECKS: ScenarioBottleneckDetail[] = [
  {
    lineCode: 'ACAB_L1',
    lineName: 'Acabamento & Embalagem L1',
    periodRef: '2025-W12',
    nominalCapacityTons: 2016,
    programmableCapacityTons: 1850,
    plannedLoadTons: 1980,
    utilizationPct: 107.0,
    freeSlackTons: 0,
    lostCapacityTons: 166,
    bufferRisk: 'SATURATION_RISK',
    riskLevel: 'CRITICAL',
    deterministicReason:
      'Gargalo Crítico: Demanda alocada (1.980t) excede a capacidade programável (1.850t) em virtude do tempo de setup e limite de embalagem.',
  },
  {
    lineCode: 'L1',
    lineName: 'Laminação L1 (Tubo & Perfis)',
    periodRef: '2025-W12',
    nominalCapacityTons: 2419,
    programmableCapacityTons: 2200,
    plannedLoadTons: 2150,
    utilizationPct: 97.7,
    freeSlackTons: 50,
    lostCapacityTons: 219,
    bufferRisk: 'BALANCED',
    riskLevel: 'HIGH',
    deterministicReason:
      'Alerta de Ocupação Elevada: Carga em 97.7% da capacidade programável. Buffer intermediário operando próximo ao limite superior.',
  },
  {
    lineCode: 'L2',
    lineName: 'Conformação L2 (Perfis & Cantoneiras)',
    periodRef: '2025-W12',
    nominalCapacityTons: 1880,
    programmableCapacityTons: 1750,
    plannedLoadTons: 1480,
    utilizationPct: 84.5,
    freeSlackTons: 270,
    lostCapacityTons: 130,
    bufferRisk: 'BALANCED',
    riskLevel: 'LOW',
    deterministicReason:
      'Operação Estável: Margem de folga de 270t. Absorve lotes alternativos sem risco de atraso.',
  },
  {
    lineCode: 'ENF_L1',
    lineName: 'Forno de Reaquecimento L1',
    periodRef: '2025-W12',
    nominalCapacityTons: 2950,
    programmableCapacityTons: 2800,
    plannedLoadTons: 2400,
    utilizationPct: 85.7,
    freeSlackTons: 400,
    lostCapacityTons: 150,
    bufferRisk: 'BALANCED',
    riskLevel: 'LOW',
    deterministicReason:
      'Taxa térmica suficiente. Fornecimento contínuo de bilhas para o laminador.',
  },
]

export const BottleneckBoard: React.FC<BottleneckBoardProps> = ({
  bottlenecks = DEFAULT_BOTTLENECKS,
  onSelectLine,
}) => {
  const [filterRisk, setFilterRisk] = useState<string>('ALL')

  const filtered = bottlenecks.filter((b) => {
    if (filterRisk === 'ALL') return true
    return b.riskLevel === filterRisk
  })

  return (
    <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
      <CardHeader className="pb-3 border-b border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
            Diagnóstico de Gargalos & Saturação de Recursos
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {['ALL', 'CRITICAL', 'HIGH', 'LOW'].map((risk) => (
              <Button
                key={risk}
                variant="ghost"
                size="sm"
                onClick={() => setFilterRisk(risk)}
                className={`h-6 px-2 text-[10px] font-mono rounded ${
                  filterRisk === risk
                    ? 'bg-slate-800 text-white font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {risk === 'ALL' ? 'Todos' : risk}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((item) => {
            const isCrit = item.riskLevel === 'CRITICAL'
            const isHigh = item.riskLevel === 'HIGH'

            return (
              <div
                key={item.lineCode}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCrit
                    ? 'bg-rose-950/25 border-rose-800/80'
                    : isHigh
                      ? 'bg-amber-950/20 border-amber-800/60'
                      : 'bg-slate-900/40 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-xs">
                        {item.lineCode}
                      </span>
                      <span className="text-[11px] text-slate-300 font-medium">
                        {item.lineName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Período de Análise: {item.periodRef}
                    </span>
                  </div>

                  <Badge
                    className={`text-[9px] font-mono uppercase ${
                      isCrit
                        ? 'bg-rose-900/80 text-rose-200 border-rose-700'
                        : isHigh
                          ? 'bg-amber-900/80 text-amber-200 border-amber-700'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {item.riskLevel} • {item.utilizationPct}%
                  </Badge>
                </div>

                {/* Barra de Progresso de Ocupação */}
                <div className="mt-2.5 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Carga: {item.plannedLoadTons} t</span>
                    <span>Cap. Programável: {item.programmableCapacityTons} t</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isCrit ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${Math.min(100, item.utilizationPct)}%` }}
                    />
                  </div>
                </div>

                {/* Diagnóstico Determinístico */}
                <p className="text-[11px] text-slate-300 mt-2.5 leading-snug bg-slate-950/60 p-2 rounded border border-slate-800/70">
                  {item.deterministicReason}
                </p>

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60 pt-2">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-cyan-400" /> Pulmão Buffer:{' '}
                    <strong className="text-slate-200">{item.bufferRisk}</strong>
                  </span>
                  {onSelectLine && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectLine(item.lineCode)}
                      className="h-5 px-1.5 text-[10px] text-cyan-400 hover:text-cyan-300"
                    >
                      Inspecionar Cascata <ArrowRight className="w-2.5 h-2.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
export default BottleneckBoard
