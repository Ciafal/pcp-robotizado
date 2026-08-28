import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { GitFork, ArrowRight, Layers, TrendingDown, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const ProductionFlow: React.FC = () => {
  const { flowSteps } = useControlTower()

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <GitFork className="w-4 h-4 text-[#004C97]" />
          <span className="font-bold text-white uppercase tracking-wider">
            Fluxo de Massa & Movimentação de Toneladas (Sankey Simplificado)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Fluxo Normal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Buffer Acumulando
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Estrangulado (Choked)
          </span>
        </div>
      </div>

      {/* Tabela de Passos de Fluxo */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left text-slate-200">
          <thead className="bg-slate-900 text-slate-400 text-[11px] uppercase font-semibold border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Origem (Upstream)</th>
              <th className="px-4 py-3 text-center"></th>
              <th className="px-4 py-3">Destino (Downstream)</th>
              <th className="px-4 py-3 text-right">Volume Transportado</th>
              <th className="px-4 py-3 text-right">Perdas / Sucata</th>
              <th className="px-4 py-3 text-right">Retrabalho</th>
              <th className="px-4 py-3 text-right">Buffer Acumulado</th>
              <th className="px-4 py-3 text-center">Status do Fluxo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {flowSteps.map((step) => {
              const isChoked = step.status === 'CHOKED'
              const isStarved = step.status === 'STARVED'

              return (
                <tr key={step.id} className="hover:bg-slate-900/40 transition-all">
                  <td className="px-4 py-3 font-semibold text-white">{step.source}</td>
                  <td className="px-4 py-3 text-center text-slate-500">
                    <ArrowRight className="w-4 h-4 mx-auto text-cyan-400" />
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{step.target}</td>

                  <td className="px-4 py-3 text-right font-mono font-bold text-white">
                    {step.tons.toLocaleString('pt-BR')} ton
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-slate-400">
                    {step.lossTons > 0 ? `${step.lossTons} ton` : '—'}
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-purple-300">
                    {step.reworkTons > 0 ? `${step.reworkTons} ton` : '—'}
                  </td>

                  <td className="px-4 py-3 text-right font-mono font-bold text-cyan-300">
                    {step.accumulatedBufferTons} ton
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Badge
                      className={`text-[9px] uppercase font-mono ${
                        isChoked
                          ? 'bg-rose-950 text-rose-300 border-rose-700'
                          : isStarved
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      }`}
                    >
                      {step.status === 'CHOKED'
                        ? 'Estrangulado'
                        : step.status === 'STARVED'
                          ? 'Desabastecido'
                          : 'Normal'}
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
