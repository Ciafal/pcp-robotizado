import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { BarChart3, Info } from 'lucide-react'

interface LineCapacityMetrics {
  lineCode: string
  lineName: string
  nominalCapacityTons: number // Capacidade Nominal Teórica (24/7)
  programmableCapacityTons: number // Nominal - Paradas - Setup - Calendário
  plannedLoadTons: number // Carga Programada pelo Solver
  lostCapacityTons: number // Perda por Setup / Paradas
  freeSlackTons: number // Folga residual
  isMock: boolean
}

const DEFAULT_LINE_METRICS: Record<string, LineCapacityMetrics> = {
  L1: {
    lineCode: 'L1',
    lineName: 'Laminação L1 (Tubos & Perfis)',
    nominalCapacityTons: 3024,
    programmableCapacityTons: 2450,
    plannedLoadTons: 2150,
    lostCapacityTons: 574,
    freeSlackTons: 300,
    isMock: true,
  },
  L2: {
    lineCode: 'L2',
    lineName: 'Conformação L2 (Perfis & Cantoneiras)',
    nominalCapacityTons: 2352,
    programmableCapacityTons: 2050,
    plannedLoadTons: 1680,
    lostCapacityTons: 302,
    freeSlackTons: 370,
    isMock: true,
  },
  ACAB_L1: {
    lineCode: 'ACAB_L1',
    lineName: 'Acabamento & Embalagem L1',
    nominalCapacityTons: 2520,
    programmableCapacityTons: 1850,
    plannedLoadTons: 1980,
    lostCapacityTons: 670,
    freeSlackTons: 0,
    isMock: true,
  },
  ENF_L1: {
    lineCode: 'ENF_L1',
    lineName: 'Forno de Reaquecimento L1',
    nominalCapacityTons: 3696,
    programmableCapacityTons: 3200,
    plannedLoadTons: 2400,
    lostCapacityTons: 496,
    freeSlackTons: 800,
    isMock: true,
  },
}

export const AdvancedCapacityLoadChart: React.FC<{
  selectedLineCode?: string
}> = ({ selectedLineCode = 'L1' }) => {
  const [activeLine, setActiveLine] = useState<string>(selectedLineCode)

  const metric = DEFAULT_LINE_METRICS[activeLine] || DEFAULT_LINE_METRICS.L1

  const maxVal = Math.max(metric.nominalCapacityTons, metric.plannedLoadTons) * 1.1

  const getPct = (val: number) => ((val / maxVal) * 100).toFixed(1)

  const overload = metric.plannedLoadTons > metric.programmableCapacityTons

  return (
    <Card className="ciafal-card">
      <CardHeader className="pb-3 border-b" style={{ borderColor: 'var(--ciafal-border)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle
              className="text-sm font-bold flex items-center gap-2"
              style={{ color: 'var(--ciafal-navy)' }}
            >
              <BarChart3
                className="w-4 h-4"
                style={{ color: 'var(--ciafal-primary)' }}
                aria-hidden="true"
              />
              Decomposição da Capacidade da Linha (Nominal × Programável × Carga)
            </CardTitle>
            <p className="text-[11px]" style={{ color: 'var(--ciafal-text-muted)' }}>
              O motor otimiza estritamente sobre a <strong>Capacidade Programável</strong>,
              descontando paradas planejadas e setups previstos.
            </p>
          </div>
          {/* Seletor de Linha */}
          <div className="flex items-center gap-1 flex-wrap">
            {Object.keys(DEFAULT_LINE_METRICS).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setActiveLine(code)}
                aria-pressed={activeLine === code}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--ciafal-primary)] ${
                  activeLine === code
                    ? 'text-white shadow-sm'
                    : 'bg-white hover:bg-[var(--ciafal-primary-lighter)]'
                }`}
                style={
                  activeLine === code
                    ? {
                        backgroundColor: 'var(--ciafal-primary)',
                        borderColor: 'var(--ciafal-primary)',
                      }
                    : { borderColor: 'var(--ciafal-border)', color: 'var(--ciafal-text-muted)' }
                }
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4 text-xs">
        {/* Banner de Mock de Capacidade Realizada */}
        {metric.isMock && (
          <div
            className="p-2.5 rounded-lg flex items-center justify-between gap-2 text-[11px] border"
            style={{
              backgroundColor: 'var(--status-warning-bg)',
              borderColor: '#fde68a',
              color: 'var(--status-warning)',
            }}
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Dado de capacidade realizada em modo de simulação — aguardando MES/SAP.
            </span>
            <span className="ciafal-badge ciafal-badge--warning whitespace-nowrap">
              MOCK CONTROLADO
            </span>
          </div>
        )}

        {/* Gráfico de Barras Horizontais Comparativas */}
        <div
          className="space-y-3.5 p-4 rounded-xl border"
          style={{
            backgroundColor: 'var(--ciafal-surface-muted)',
            borderColor: 'var(--ciafal-border)',
          }}
        >
          {/* 1. Capacidade Nominal */}
          <div className="space-y-1">
            <div
              className="flex justify-between font-semibold"
              style={{ color: 'var(--ciafal-text)' }}
            >
              <span>Capacidade Nominal Teórica (24/7)</span>
              <span className="font-mono">
                {metric.nominalCapacityTons.toLocaleString('pt-BR')} t
              </span>
            </div>
            <div
              className="w-full h-5 rounded-md overflow-hidden border"
              style={{
                backgroundColor: 'var(--ciafal-surface)',
                borderColor: 'var(--ciafal-border)',
              }}
            >
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{
                  width: `${getPct(metric.nominalCapacityTons)}%`,
                  backgroundColor: '#cbd5e1',
                }}
              />
            </div>
          </div>

          {/* 2. Capacidade Programável */}
          <div className="space-y-1">
            <div
              className="flex justify-between font-semibold"
              style={{ color: 'var(--ciafal-primary)' }}
            >
              <span>Capacidade Programável (Disponível para o Solver)</span>
              <span className="font-mono font-bold">
                {metric.programmableCapacityTons.toLocaleString('pt-BR')} t
              </span>
            </div>
            <div
              className="w-full h-5 rounded-md overflow-hidden border"
              style={{
                backgroundColor: 'var(--ciafal-surface)',
                borderColor: 'var(--ciafal-border)',
              }}
            >
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{
                  width: `${getPct(metric.programmableCapacityTons)}%`,
                  backgroundColor: 'var(--ciafal-primary)',
                }}
              />
            </div>
          </div>

          {/* 3. Carga Programada */}
          <div className="space-y-1">
            <div
              className="flex justify-between font-semibold"
              style={{ color: 'var(--ciafal-navy)' }}
            >
              <span>Carga Programada pelo CP-SAT</span>
              <span
                className="font-mono font-bold"
                style={{ color: overload ? 'var(--status-danger)' : 'var(--status-success)' }}
              >
                {metric.plannedLoadTons.toLocaleString('pt-BR')} t (
                {((metric.plannedLoadTons / metric.programmableCapacityTons) * 100)
                  .toFixed(1)
                  .replace('.', ',')}
                %)
              </span>
            </div>
            <div
              className="w-full h-5 rounded-md overflow-hidden border"
              style={{
                backgroundColor: 'var(--ciafal-surface)',
                borderColor: 'var(--ciafal-border)',
              }}
            >
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{
                  width: `${getPct(metric.plannedLoadTons)}%`,
                  backgroundColor: overload ? 'var(--status-danger)' : '#22c55e',
                }}
              />
            </div>
          </div>
        </div>

        {/* Resumo de Indicadores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
          <div className="ciafal-kpi">
            <span className="ciafal-kpi__label" style={{ color: 'var(--ciafal-text-muted)' }}>
              Cap. Nominal
            </span>
            <strong className="ciafal-kpi__value" style={{ color: 'var(--ciafal-navy)' }}>
              {metric.nominalCapacityTons.toLocaleString('pt-BR')} t
            </strong>
          </div>
          <div className="ciafal-kpi">
            <span className="ciafal-kpi__label" style={{ color: 'var(--ciafal-text-muted)' }}>
              Cap. Programável
            </span>
            <strong className="ciafal-kpi__value" style={{ color: 'var(--ciafal-primary)' }}>
              {metric.programmableCapacityTons.toLocaleString('pt-BR')} t
            </strong>
          </div>
          <div className="ciafal-kpi">
            <span className="ciafal-kpi__label" style={{ color: 'var(--ciafal-text-muted)' }}>
              Perda Programada
            </span>
            <strong className="ciafal-kpi__value" style={{ color: 'var(--status-warning)' }}>
              -{metric.lostCapacityTons.toLocaleString('pt-BR')} t
            </strong>
          </div>
          <div className="ciafal-kpi">
            <span className="ciafal-kpi__label" style={{ color: 'var(--ciafal-text-muted)' }}>
              Folga Residual
            </span>
            <strong className="ciafal-kpi__value" style={{ color: 'var(--status-success)' }}>
              +{metric.freeSlackTons.toLocaleString('pt-BR')} t
            </strong>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
export default AdvancedCapacityLoadChart
