import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Activity, Info } from 'lucide-react'

interface HeatmapCell {
  lineCode: string
  lineName: string
  day: string
  dayLabel: string
  utilizationPct: number
  programmableTons: number
  plannedTons: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

const DAYS_OF_WEEK = [
  { key: 'SEG', label: 'Seg 24/03' },
  { key: 'TER', label: 'Ter 25/03' },
  { key: 'QUA', label: 'Qua 26/03' },
  { key: 'QUI', label: 'Qui 27/03' },
  { key: 'SEX', label: 'Sex 28/03' },
  { key: 'SAB', label: 'Sáb 29/03' },
  { key: 'DOM', label: 'Dom 30/03' },
]

const LINES_LIST = [
  { code: 'L1', name: 'Laminação L1' },
  { code: 'L2', name: 'Conformação L2' },
  { code: 'ENF_L1', name: 'Forno Enfornamento L1' },
  { code: 'ACAB_L1', name: 'Acabamento L1' },
  { code: 'ACAB_L2', name: 'Acabamento L2' },
  { code: 'ENDIR', name: 'Endireitadeira' },
]

// Gerador de dados determinísticos com variação por perfil/dia
const GENERATE_HEATMAP_DATA = (): Record<string, Record<string, HeatmapCell>> => {
  const result: Record<string, Record<string, HeatmapCell>> = {}

  const baseValues: Record<string, number[]> = {
    L1: [88, 92, 98, 102, 95, 80, 75],
    L2: [78, 84, 85, 82, 88, 70, 65],
    ENF_L1: [85, 86, 88, 85, 90, 75, 70],
    ACAB_L1: [94, 98, 108, 112, 104, 85, 60],
    ACAB_L2: [72, 75, 80, 82, 78, 65, 50],
    ENDIR: [65, 70, 75, 80, 82, 60, 45],
  }

  LINES_LIST.forEach((line) => {
    result[line.code] = {}
    DAYS_OF_WEEK.forEach((day, idx) => {
      const util = baseValues[line.code][idx]
      let risk: HeatmapCell['riskLevel'] = 'LOW'
      if (util >= 105) risk = 'CRITICAL'
      else if (util >= 95) risk = 'HIGH'
      else if (util >= 85) risk = 'MEDIUM'

      result[line.code][day.key] = {
        lineCode: line.code,
        lineName: line.name,
        day: day.key,
        dayLabel: day.label,
        utilizationPct: util,
        programmableTons: Math.round(line.code === 'L1' ? 350 : 280),
        plannedTons: Math.round(((line.code === 'L1' ? 350 : 280) * util) / 100),
        riskLevel: risk,
      }
    })
  })

  return result
}

const RISK_BADGE: Record<string, string> = {
  CRITICAL: 'ciafal-badge ciafal-badge--danger',
  HIGH: 'ciafal-badge ciafal-badge--warning',
  MEDIUM: 'ciafal-badge ciafal-badge--info',
  LOW: 'ciafal-badge ciafal-badge--success',
}

export const AdvancedCapacityHeatmap: React.FC<{
  onCellClick?: (cell: HeatmapCell) => void
}> = ({ onCellClick }) => {
  const [data] = useState(GENERATE_HEATMAP_DATA)
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null)

  const getCellStyle = (utilPct: number): React.CSSProperties => {
    if (utilPct >= 105)
      return {
        backgroundColor: '#dc2626',
        color: '#ffffff',
        fontWeight: 700,
        borderColor: '#fecaca',
      }
    if (utilPct >= 95)
      return {
        backgroundColor: '#f59e0b',
        color: '#ffffff',
        fontWeight: 700,
        borderColor: '#fde68a',
      }
    if (utilPct >= 85)
      return {
        backgroundColor: '#004c97',
        color: '#ffffff',
        fontWeight: 600,
        borderColor: '#bfdbfe',
      }
    if (utilPct >= 70)
      return {
        backgroundColor: '#dbeafe',
        color: '#0f2a4a',
        fontWeight: 600,
        borderColor: '#bfdbfe',
      }
    return {
      backgroundColor: 'var(--ciafal-surface-muted)',
      color: 'var(--ciafal-text-muted)',
      fontWeight: 500,
      borderColor: 'var(--ciafal-border)',
    }
  }

  const legendRanges = [
    { label: '<70%', color: 'var(--ciafal-surface-muted)', border: 'var(--ciafal-border)' },
    { label: '70–84%', color: '#dbeafe', border: '#bfdbfe' },
    { label: '85–94%', color: '#004c97', border: '#004c97' },
    { label: '95–104%', color: '#f59e0b', border: '#f59e0b' },
    { label: '≥105% (Crítico)', color: '#dc2626', border: '#dc2626' },
  ]

  return (
    <Card className="ciafal-card">
      <CardHeader className="pb-3 border-b" style={{ borderColor: 'var(--ciafal-border)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle
              className="text-sm font-bold flex items-center gap-2"
              style={{ color: 'var(--ciafal-navy)' }}
            >
              <Activity
                className="w-4 h-4"
                style={{ color: 'var(--ciafal-primary)' }}
                aria-hidden="true"
              />
              Mapa de Calor de Capacidade Programável (Linha × Período)
            </CardTitle>
            <p className="text-[11px]" style={{ color: 'var(--ciafal-text-muted)' }}>
              Taxa de ocupação com valores numéricos explícitos (%) e indicação de sobrecarga.
            </p>
          </div>
          {/* Legenda */}
          <div
            className="flex items-center gap-2 text-[10px] font-mono flex-wrap"
            style={{ color: 'var(--ciafal-text-muted)' }}
          >
            {legendRanges.map((r) => (
              <span key={r.label} className="flex items-center gap-1 whitespace-nowrap">
                <span
                  className="w-2.5 h-2.5 rounded-sm border"
                  style={{ backgroundColor: r.color, borderColor: r.border }}
                  aria-hidden="true"
                ></span>{' '}
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="ciafal-table-wrap">
          <table className="ciafal-table text-center border-collapse text-xs">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 w-44">Linha de Produção</th>
                {DAYS_OF_WEEK.map((d) => (
                  <th key={d.key} className="py-2 px-2 font-mono">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINES_LIST.map((line) => (
                <tr key={line.code}>
                  <td
                    className="text-left py-2.5 px-3 font-semibold whitespace-nowrap"
                    style={{ color: 'var(--ciafal-navy)' }}
                  >
                    <div className="font-mono text-xs" style={{ color: 'var(--ciafal-navy)' }}>
                      {line.code}
                    </div>
                    <div
                      className="text-[10px] truncate"
                      style={{ color: 'var(--ciafal-text-muted)' }}
                    >
                      {line.name}
                    </div>
                  </td>
                  {DAYS_OF_WEEK.map((day) => {
                    const cell = data[line.code]?.[day.key]
                    if (!cell) return <td key={day.key}>-</td>

                    return (
                      <td key={day.key} className="p-1">
                        <button
                          type="button"
                          onClick={() => onCellClick && onCellClick(cell)}
                          onMouseEnter={() => setHoveredCell(cell)}
                          onMouseLeave={() => setHoveredCell(null)}
                          onFocus={() => setHoveredCell(cell)}
                          onBlur={() => setHoveredCell(null)}
                          className="w-full py-2.5 px-1 rounded-md border text-center transition-all hover:scale-105 shadow-sm font-mono text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--ciafal-primary)]"
                          style={getCellStyle(cell.utilizationPct)}
                          aria-label={`${line.code}, ${day.label}: ocupação ${cell.utilizationPct}%`}
                        >
                          {cell.utilizationPct}%
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detalhe On-Hover / Inspecionar */}
        {hoveredCell && (
          <div
            className="p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
            style={{
              backgroundColor: 'var(--ciafal-surface-muted)',
              borderColor: 'var(--ciafal-border)',
              color: 'var(--ciafal-text)',
            }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Info
                className="w-4 h-4"
                style={{ color: 'var(--ciafal-primary)' }}
                aria-hidden="true"
              />
              <span>
                <strong style={{ color: 'var(--ciafal-navy)' }}>
                  {hoveredCell.lineCode} ({hoveredCell.lineName})
                </strong>{' '}
                — {hoveredCell.dayLabel}:
              </span>
              <span className="font-mono" style={{ color: 'var(--ciafal-text)' }}>
                Carga: <strong>{hoveredCell.plannedTons.toLocaleString('pt-BR')}t</strong> / Cap.
                Programável:{' '}
                <strong>{hoveredCell.programmableTons.toLocaleString('pt-BR')}t</strong>
              </span>
            </div>
            <span className={`${RISK_BADGE[hoveredCell.riskLevel] || 'ciafal-badge--neutral'}`}>
              Risco: {hoveredCell.riskLevel} ({hoveredCell.utilizationPct.toLocaleString('pt-BR')}%)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
export default AdvancedCapacityHeatmap
