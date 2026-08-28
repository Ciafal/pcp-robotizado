import React, { useState } from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { Flame, Calendar, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface HeatmapCell {
  day: string
  occupancy: number
  risk: boolean
  tons: number
}

interface LineHeatmapData {
  lineCode: string
  lineName: string
  cells: HeatmapCell[]
}

const mockHeatmapData: LineHeatmapData[] = [
  {
    lineCode: 'L1',
    lineName: 'Laminação & Conformação L1',
    cells: [
      { day: 'Seg', occupancy: 92, risk: false, tons: 1850 },
      { day: 'Ter', occupancy: 98, risk: false, tons: 1920 },
      { day: 'Qua', occupancy: 112, risk: true, tons: 2150 },
      { day: 'Qui', occupancy: 87, risk: false, tons: 1720 },
      { day: 'Sex', occupancy: 81, risk: false, tons: 1600 },
    ],
  },
  {
    lineCode: 'ENF_L1',
    lineName: 'Enfornamento L1 (Forno)',
    cells: [
      { day: 'Seg', occupancy: 96, risk: false, tons: 2000 },
      { day: 'Ter', occupancy: 96, risk: false, tons: 2000 },
      { day: 'Qua', occupancy: 104, risk: true, tons: 2100 },
      { day: 'Qui', occupancy: 90, risk: false, tons: 1850 },
      { day: 'Sex', occupancy: 85, risk: false, tons: 1750 },
    ],
  },
  {
    lineCode: 'ACAB_L1',
    lineName: 'Acabamento L1',
    cells: [
      { day: 'Seg', occupancy: 98, risk: true, tons: 1650 },
      { day: 'Ter', occupancy: 108, risk: true, tons: 1820 },
      { day: 'Qua', occupancy: 118, risk: true, tons: 1980 },
      { day: 'Qui', occupancy: 92, risk: false, tons: 1550 },
      { day: 'Sex', occupancy: 78, risk: false, tons: 1300 },
    ],
  },
  {
    lineCode: 'L2',
    lineName: 'Perfis & Estruturais L2',
    cells: [
      { day: 'Seg', occupancy: 84, risk: false, tons: 1250 },
      { day: 'Ter', occupancy: 90, risk: false, tons: 1350 },
      { day: 'Qua', occupancy: 94, risk: false, tons: 1400 },
      { day: 'Qui', occupancy: 99, risk: false, tons: 1480 },
      { day: 'Sex', occupancy: 75, risk: false, tons: 1100 },
    ],
  },
  {
    lineCode: 'ACAB_L2',
    lineName: 'Acabamento L2',
    cells: [
      { day: 'Seg', occupancy: 97, risk: false, tons: 1100 },
      { day: 'Ter', occupancy: 92, risk: false, tons: 1050 },
      { day: 'Qua', occupancy: 89, risk: false, tons: 1000 },
      { day: 'Qui', occupancy: 95, risk: false, tons: 1080 },
      { day: 'Sex', occupancy: 70, risk: false, tons: 800 },
    ],
  },
  {
    lineCode: 'ENDIR',
    lineName: 'Endireitadeira Pesada',
    cells: [
      { day: 'Seg', occupancy: 72, risk: true, tons: 620 },
      { day: 'Ter', occupancy: 115, risk: true, tons: 980 },
      { day: 'Qua', occupancy: 102, risk: true, tons: 890 },
      { day: 'Qui', occupancy: 80, risk: false, tons: 700 },
      { day: 'Sex', occupancy: 65, risk: false, tons: 550 },
    ],
  },
  {
    lineCode: 'RETRAB',
    lineName: 'Célula de Retrabalho',
    cells: [
      { day: 'Seg', occupancy: 92, risk: false, tons: 380 },
      { day: 'Ter', occupancy: 85, risk: false, tons: 350 },
      { day: 'Qua', occupancy: 90, risk: false, tons: 370 },
      { day: 'Qui', occupancy: 75, risk: false, tons: 300 },
      { day: 'Sex', occupancy: 60, risk: false, tons: 240 },
    ],
  },
]

export const CapacityHeatmap: React.FC = () => {
  const { setSelectedProcess, processNodes } = useControlTower()
  const [granularity, setGranularity] = useState<'DIA' | 'TURNO' | 'SEMANA'>('DIA')

  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

  const getCellColor = (occ: number) => {
    if (occ > 105) return 'bg-rose-900 text-rose-100 border-rose-600'
    if (occ >= 95) return 'bg-amber-900/80 text-amber-100 border-amber-600'
    if (occ >= 80) return 'bg-[#004C97]/80 text-blue-100 border-blue-500'
    return 'bg-slate-900 text-slate-300 border-slate-800'
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header do Heatmap */}
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white uppercase tracking-wider">
            Heatmap Preditivo de Ocupação & Saturação Fabril
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setGranularity('TURNO')}
              className={`px-2 py-0.5 rounded ${
                granularity === 'TURNO' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              Turno
            </button>
            <button
              type="button"
              onClick={() => setGranularity('DIA')}
              className={`px-2 py-0.5 rounded ${
                granularity === 'DIA' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              Dia
            </button>
            <button
              type="button"
              onClick={() => setGranularity('SEMANA')}
              className={`px-2 py-0.5 rounded ${
                granularity === 'SEMANA' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              Semana
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-800"></span> &lt;80%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-[#004C97]"></span> 80-94%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-600"></span> 95-105%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-600"></span> &gt;105% (Crítico)
            </span>
          </div>
        </div>
      </div>

      {/* Matriz Heatmap */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left text-slate-200">
          <thead className="bg-slate-900 text-slate-400 text-[11px] uppercase font-semibold border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 w-64">Linha / Recurso</th>
              {days.map((day) => (
                <th key={day} className="px-4 py-3 text-center">
                  {day}
                </th>
              ))}
              <th className="px-4 py-3 text-center">Média Semanal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {mockHeatmapData.map((row) => {
              const avgOcc = Math.round(
                row.cells.reduce((sum, c) => sum + c.occupancy, 0) / row.cells.length,
              )
              const matchedNode = processNodes.find((n) => n.code === row.lineCode)

              return (
                <tr
                  key={row.lineCode}
                  className="hover:bg-slate-900/40 transition-all cursor-pointer"
                  onClick={() => matchedNode && setSelectedProcess(matchedNode)}
                >
                  <td className="px-4 py-3">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-cyan-300">{row.lineCode}</span>
                      <span className="text-slate-300 text-xs truncate max-w-[160px]">
                        {row.lineName}
                      </span>
                    </div>
                  </td>

                  {row.cells.map((cell) => (
                    <td key={cell.day} className="px-3 py-2 text-center">
                      <div
                        className={`py-2 px-3 rounded-lg border font-mono font-bold text-xs transition-all flex flex-col items-center justify-center gap-0.5 ${getCellColor(
                          cell.occupancy,
                        )}`}
                      >
                        <span>{cell.occupancy}%</span>
                        <span className="text-[9px] opacity-80">{cell.tons} t</span>
                      </div>
                    </td>
                  ))}

                  <td className="px-4 py-3 text-center font-mono font-bold text-white">
                    <Badge
                      className={`text-xs ${
                        avgOcc > 100
                          ? 'bg-rose-950 text-rose-300 border-rose-700'
                          : 'bg-slate-900 text-slate-200 border-slate-700'
                      }`}
                    >
                      {avgOcc}%
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
