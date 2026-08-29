import React, { useState } from 'react'
import {
  ThermometerSnowflake,
  ArrowRight,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const CoolingCalculatorWidget: React.FC = () => {
  const [productionEndTime, setProductionEndTime] = useState<string>('2026-08-25T14:00')
  const [coolingHours, setCoolingHours] = useState<number>(24)
  const [scheduledNextLineTime, setScheduledNextLineTime] = useState<string>('2026-08-26T08:00')

  // Cálculo de disponibilidade
  const prodDate = new Date(productionEndTime)
  const earliestAvailableDate = new Date(prodDate.getTime() + coolingHours * 60 * 60 * 1000)
  const scheduledDate = new Date(scheduledNextLineTime)

  const diffMs = earliestAvailableDate.getTime() - scheduledDate.getTime()
  const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10
  const isSatisfied = diffHours <= 0

  return (
    <Card className="bg-slate-900 text-white border-slate-800 shadow-md">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-600/30 text-cyan-400 rounded-lg">
              <ThermometerSnowflake className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wide">
                Simulador de Dependência Térmica & Disponibilidade Produtiva
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400">
                Linha Origem &rarr; Produção Concluída &rarr; Tempo Mínimo Resfriamento &rarr;
                Disponível para Linha Destino
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[10px] font-mono">
            Motor de Resfriamento
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 text-xs space-y-3">
        {/* ENTRADAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
          <div>
            <label className="text-slate-400 block text-[10px] mb-1 font-mono">
              1. Término Linha Origem (ex: ENDL1 / L1)
            </label>
            <Input
              type="datetime-local"
              value={productionEndTime}
              onChange={(e) => setProductionEndTime(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white text-xs h-8"
            />
          </div>

          <div>
            <label className="text-slate-400 block text-[10px] mb-1 font-mono">
              2. Tempo de Resfriamento Mínimo (h)
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                max={120}
                value={coolingHours}
                onChange={(e) => setCoolingHours(parseInt(e.target.value) || 0)}
                className="bg-slate-900 border-slate-700 text-cyan-300 font-mono font-bold text-xs h-8"
              />
              <span className="text-slate-400 text-xs">horas</span>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block text-[10px] mb-1 font-mono">
              3. Programado na Linha Destino (ex: ENDIR)
            </label>
            <Input
              type="datetime-local"
              value={scheduledNextLineTime}
              onChange={(e) => setScheduledNextLineTime(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white text-xs h-8"
            />
          </div>
        </div>

        {/* RESULTADO E DIAGNÓSTICO IA */}
        <div
          className={`p-3 rounded-lg border text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
            isSatisfied
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
              : 'bg-rose-950/40 border-rose-700/60 text-rose-200'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs">
              {isSatisfied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">🟢 RESFRIAMENTO ATENDIDO</span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-300">
                    🔴 RESFRIAMENTO NÃO ATENDIDO — Faltam: {diffHours} horas
                  </span>
                </>
              )}
            </div>

            <div className="text-[11px] text-slate-300 font-mono">
              Primeira disponibilidade física:{' '}
              <strong className="text-white">
                {earliestAvailableDate.toLocaleString('pt-BR')}
              </strong>
            </div>

            {!isSatisfied && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-300 font-sans mt-1">
                <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>
                  <strong>Sugestão IA:</strong> Reposicionar início da linha seguinte para depois de{' '}
                  {earliestAvailableDate.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  ou alterar a sequência utilizando outro lote/material resfriado.
                </span>
              </div>
            )}
          </div>

          <div className="shrink-0">
            <Badge
              variant="outline"
              className={`text-xs font-mono px-2.5 py-1 ${
                isSatisfied
                  ? 'bg-emerald-900/40 text-emerald-300 border-emerald-600'
                  : 'bg-rose-900/40 text-rose-300 border-rose-600'
              }`}
            >
              {isSatisfied ? 'Fluxo Liberado' : 'Bloqueio Térmico'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
