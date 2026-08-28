import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Layers, Info, Calendar } from 'lucide-react'

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

export const AdvancedCapacityHeatmap: React.FC<{
  onCellClick?: (cell: HeatmapCell) => void
}> = ({ onCellClick }) => {
  const [data] = useState(GENERATE_HEATMAP_DATA)
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null)

  const getCellBgClass = (utilPct: number) => {
    if (utilPct >= 105) return 'bg-rose-600/80 text-white font-bold border-rose-400'
    if (utilPct >= 95) return 'bg-amber-600/80 text-white font-bold border-amber-400'
    if (utilPct >= 85) return 'bg-blue-600/70 text-slate-100 font-semibold border-blue-400'
    if (utilPct >= 70) return 'bg-cyan-900/60 text-cyan-200 border-cyan-800'
    return 'bg-slate-900/50 text-slate-400 border-slate-800'
  }

  return (
    <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
      <CardHeader className="pb-3 border-b border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Mapa de Calor de Capacidade Programável (Linha × Período)
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Taxa de ocupação com valores numéricos explícitos (%) e indicação de sobrecarga.
            </p>
          </div>
          {/* Legenda */}
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-700"></span>{' '}
              &lt;70%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-900 border border-cyan-700"></span>{' '}
              70-84%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 border border-blue-400"></span>{' '}
              85-94%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 border border-amber-400"></span>{' '}
              95-104%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 border border-rose-400"></span>{' '}
              &ge;105% (Crítico)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-semibold">
                <th className="text-left py-2 px-3 w-44">Linha de Produção</th>
                {DAYS_OF_WEEK.map((d) => (
                  <th key={d.key} className="py-2 px-2 font-mono">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {LINES_LIST.map((line) => (
                <tr key={line.code} className="hover:bg-slate-900/30">
                  <td className="text-left py-2.5 px-3 font-semibold text-slate-200">
                    <div className="font-mono text-xs text-white">{line.code}</div>
                    <div className="text-[10px] text-slate-400 truncate">{line.name}</div>
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
                          className={`w-full py-2.5 px-1 rounded-md border text-center transition-all ${getCellBgClass(
                            cell.utilizationPct,
                          )} hover:scale-105 shadow-sm font-mono text-xs`}
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
          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>
                <strong className="text-white">
                  {hoveredCell.lineCode} ({hoveredCell.lineName})
                </strong>{' '}
                — {hoveredCell.dayLabel}:
              </span>
              <span className="font-mono text-slate-300">
                Carga: <strong>{hoveredCell.plannedTons}t</strong> / Cap. Programável:{' '}
                <strong>{hoveredCell.programmableTons}t</strong>
              </span>
            </div>
            <Badge
              className={`font-mono text-[10px] ${
                hoveredCell.riskLevel === 'CRITICAL'
                  ? 'bg-rose-950 text-rose-300 border-rose-700'
                  : hoveredCell.riskLevel === 'HIGH'
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}
            >
              Risco: {hoveredCell.riskLevel} ({hoveredCell.utilizationPct}%)
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
export default AdvancedCapacityHeatmap
