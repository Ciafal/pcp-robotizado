import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import {
  Clock,
  Radio,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Database,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const EventTimeline: React.FC = () => {
  const { events } = useControlTower()

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#004C97]" />
          <span className="font-bold text-white uppercase tracking-wider">
            Linha do Tempo Operacional & Trilha de Eventos em Tempo Real
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
          {events.length} eventos registrados hoje
        </Badge>
      </div>

      {/* Timeline Vertical de Eventos */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="relative border-l border-slate-800 ml-4 space-y-6">
          {events.map((ev) => {
            const isCritical = ev.severity === 'CRITICAL'
            const isWarning = ev.severity === 'WARNING' || ev.severity === 'RISK'

            return (
              <div key={ev.id} className="relative pl-6 group">
                {/* Ícone / Marcador no Eixo */}
                <span
                  className={`absolute -left-3 top-1 w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
                    isCritical
                      ? 'bg-rose-950 border-rose-600 text-rose-300'
                      : isWarning
                        ? 'bg-amber-950 border-amber-600 text-amber-300'
                        : 'bg-[#004C97]/30 border-[#004C97] text-cyan-300'
                  }`}
                >
                  {ev.source === 'SAP' ? (
                    <Database className="w-3 h-3" />
                  ) : ev.source === 'IA' ? (
                    <Sparkles className="w-3 h-3" />
                  ) : ev.source === 'USUARIO' ? (
                    <UserCheck className="w-3 h-3" />
                  ) : (
                    <Radio className="w-3 h-3" />
                  )}
                </span>

                {/* Card de Conteúdo do Evento */}
                <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-3 rounded-xl transition-all shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{ev.title}</span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 uppercase border-slate-700 text-slate-400"
                      >
                        {ev.source}
                      </Badge>
                      {ev.processCode && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1 py-0 bg-slate-800 text-cyan-300 font-mono"
                        >
                          {ev.processCode}
                        </Badge>
                      )}
                    </div>

                    <span className="font-mono text-[11px] text-slate-400 font-semibold">
                      {ev.timestamp}
                    </span>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">{ev.description}</p>

                  {ev.actor && (
                    <div className="text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-850">
                      Responsável / Interface:{' '}
                      <strong className="text-slate-400">{ev.actor}</strong>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
