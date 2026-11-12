import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Flame, Layers, ArrowRight } from 'lucide-react'
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

const riskAccent: Record<string, string> = {
  CRITICAL: 'var(--status-danger)',
  HIGH: 'var(--status-warning)',
  LOW: 'var(--status-success)',
}

const riskBadge: Record<string, string> = {
  CRITICAL: 'ciafal-badge ciafal-badge--danger',
  HIGH: 'ciafal-badge ciafal-badge--warning',
  LOW: 'ciafal-badge ciafal-badge--success',
}

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
    <Card className="ciafal-card">
      <CardHeader className="pb-3 border-b" style={{ borderColor: 'var(--ciafal-border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle
            className="text-sm font-bold flex items-center gap-2"
            style={{ color: 'var(--ciafal-navy)' }}
          >
            <Flame
              className="w-4 h-4"
              style={{ color: 'var(--status-danger)' }}
              aria-hidden="true"
            />
            Diagnóstico de Gargalos & Saturação de Recursos
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'CRITICAL', 'HIGH', 'LOW'].map((risk) => (
              <Button
                key={risk}
                variant="ghost"
                size="sm"
                onClick={() => setFilterRisk(risk)}
                className={`h-6 px-2 text-[10px] font-mono rounded border ${
                  filterRisk === risk
                    ? 'bg-[var(--ciafal-primary-lighter)] font-bold border-[var(--ciafal-primary)]'
                    : 'bg-white border-transparent hover:bg-[var(--ciafal-primary-lighter)]'
                }`}
                style={{
                  color: filterRisk === risk ? 'var(--ciafal-primary)' : 'var(--ciafal-text-muted)',
                }}
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
            const accent = riskAccent[item.riskLevel] || 'var(--ciafal-primary)'

            return (
              <div
                key={item.lineCode}
                className="ciafal-card p-3.5 border-l-4"
                style={{ borderLeftColor: accent }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-mono font-bold text-xs"
                        style={{ color: 'var(--ciafal-navy)' }}
                      >
                        {item.lineCode}
                      </span>
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: 'var(--ciafal-text)' }}
                      >
                        {item.lineName}
                      </span>
                    </div>
                    <span className="text-[10px]" style={{ color: 'var(--ciafal-text-muted)' }}>
                      Período de Análise: {item.periodRef}
                    </span>
                  </div>

                  <span
                    className={`${riskBadge[item.riskLevel] || 'ciafal-badge--neutral'} whitespace-nowrap`}
                  >
                    {item.riskLevel} • {item.utilizationPct.toLocaleString('pt-BR')}%
                  </span>
                </div>

                {/* Barra de Progresso de Ocupação */}
                <div className="mt-2.5 space-y-1">
                  <div
                    className="flex justify-between text-[10px] font-mono"
                    style={{ color: 'var(--ciafal-text-muted)' }}
                  >
                    <span>Carga: {item.plannedLoadTons.toLocaleString('pt-BR')} t</span>
                    <span>
                      Cap. Programável: {item.programmableCapacityTons.toLocaleString('pt-BR')} t
                    </span>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden border"
                    style={{
                      backgroundColor: 'var(--ciafal-surface-muted)',
                      borderColor: 'var(--ciafal-border)',
                    }}
                    role="progressbar"
                    aria-valuenow={item.utilizationPct}
                    aria-valuemin={0}
                    aria-valuemax={120}
                    aria-label={`Ocupação ${item.lineCode}`}
                  >
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${Math.min(100, item.utilizationPct)}%`,
                        backgroundColor: accent,
                      }}
                    />
                  </div>
                </div>

                {/* Diagnóstico Determinístico */}
                <p
                  className="text-[11px] mt-2.5 leading-snug p-2 rounded"
                  style={{
                    backgroundColor:
                      item.riskLevel === 'CRITICAL'
                        ? 'var(--status-danger-bg)'
                        : item.riskLevel === 'HIGH'
                          ? 'var(--status-warning-bg)'
                          : 'var(--ciafal-surface-muted)',
                    color: 'var(--ciafal-text)',
                  }}
                >
                  {item.deterministicReason}
                </p>

                <div
                  className="mt-2.5 flex items-center justify-between text-[10px] border-t pt-2"
                  style={{ borderColor: 'var(--ciafal-border)', color: 'var(--ciafal-text-muted)' }}
                >
                  <span className="flex items-center gap-1">
                    <Layers
                      className="w-3 h-3"
                      style={{ color: 'var(--ciafal-primary)' }}
                      aria-hidden="true"
                    />{' '}
                    Pulmão Buffer:{' '}
                    <strong style={{ color: 'var(--ciafal-text)' }}>{item.bufferRisk}</strong>
                  </span>
                  {onSelectLine && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectLine(item.lineCode)}
                      className="h-5 px-1.5 text-[10px]"
                      style={{ color: 'var(--ciafal-primary)' }}
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
