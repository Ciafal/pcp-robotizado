import React, { useState } from 'react'
import {
  ThermometerSnowflake,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const CoolingCalculatorWidget: React.FC = () => {
  const [productionEndTime, setProductionEndTime] = useState<string>('2026-08-25T14:00')
  const [coolingHours, setCoolingHours] = useState<number>(24)
  const [scheduledNextLineTime, setScheduledNextLineTime] = useState<string>('2026-08-26T08:00')

  // Cálculo determinístico de disponibilidade
  const prodDate = new Date(productionEndTime)
  const earliestAvailableDate = new Date(prodDate.getTime() + coolingHours * 60 * 60 * 1000)
  const scheduledDate = new Date(scheduledNextLineTime)

  const diffMs = earliestAvailableDate.getTime() - scheduledDate.getTime()
  const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10
  const isSatisfied = diffHours <= 0

  const handleResetDefaults = () => {
    setProductionEndTime('2026-08-25T14:00')
    setCoolingHours(24)
    setScheduledNextLineTime('2026-08-26T08:00')
  }

  return (
    <Card className="bg-white border-slate-200 shadow-xs rounded-xl overflow-hidden w-full max-w-full min-w-0">
      <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-2.5 bg-slate-50/70 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-50 text-[#004C97] border border-blue-200/80 rounded-lg shrink-0">
              <ThermometerSnowflake className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                <span className="text-[#004C97]">
                  SIMULADOR DE DEPENDÊNCIA TÉRMICA & DISPONIBILIDADE PRODUTIVA
                </span>
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500 mt-0.5 truncate">
                Linha Origem &rarr; Produção Concluída &rarr; Tempo Mínimo Resfriamento &rarr;
                Disponível para Linha Destino
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetDefaults}
              className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 gap-1"
              title="Restaurar valores padrão do simulador"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Restaurar</span>
            </Button>
            <Badge className="bg-blue-50 text-[#004C97] border border-blue-200 text-[10px] font-mono font-semibold">
              Motor de Resfriamento
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-4 text-xs space-y-3.5 bg-white">
        {/* ENTRADAS RESPONSIVAS: Lado a lado em desktop, quebra em telas médias, empilhados em mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50/80 p-3 sm:p-3.5 rounded-lg border border-slate-200/80">
          <div className="space-y-1">
            <label className="text-slate-700 block text-[11px] font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500 shrink-0" />
              <span>1. Término Linha Origem (ex: ENDL1 / L1)</span>
            </label>
            <Input
              type="datetime-local"
              value={productionEndTime}
              onChange={(e) => setProductionEndTime(e.target.value)}
              className="bg-white border-slate-300 text-slate-900 text-xs h-8.5 font-mono shadow-2xs focus-visible:ring-[#004C97]"
            />
            <span className="text-[10px] text-slate-400 block">
              Horário previsto de conclusão na origem
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-slate-700 block text-[11px] font-semibold flex items-center gap-1">
              <ThermometerSnowflake className="w-3 h-3 text-[#004C97] shrink-0" />
              <span>2. Tempo de Resfriamento Mínimo (h)</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={120}
                value={coolingHours}
                onChange={(e) => setCoolingHours(parseInt(e.target.value) || 0)}
                className="bg-white border-slate-300 text-[#004C97] font-mono font-bold text-xs h-8.5 shadow-2xs focus-visible:ring-[#004C97] flex-1"
              />
              <span className="text-slate-500 text-xs font-medium shrink-0">horas</span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Período de cura metalúrgica obrigatória
            </span>
          </div>

          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <label className="text-slate-700 block text-[11px] font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500 shrink-0" />
              <span>3. Programado na Linha Destino (ex: ENDIR)</span>
            </label>
            <Input
              type="datetime-local"
              value={scheduledNextLineTime}
              onChange={(e) => setScheduledNextLineTime(e.target.value)}
              className="bg-white border-slate-300 text-slate-900 text-xs h-8.5 font-mono shadow-2xs focus-visible:ring-[#004C97]"
            />
            <span className="text-[10px] text-slate-400 block">
              Início agendado na linha consumidora
            </span>
          </div>
        </div>

        {/* RESULTADO E DIAGNÓSTICO IA: Fundo limpo, destaque integrado Ciafal, vermelho restrito ao alerta crítico */}
        <div
          className={`p-3 sm:p-3.5 rounded-lg border text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-colors ${
            isSatisfied
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/70 border-rose-300 text-rose-950'
          }`}
        >
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
              {isSatisfied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-800 font-bold uppercase tracking-tight">
                    Resfriamento Atendido &bull; Sequenciamento Liberado
                  </span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="text-rose-800 font-bold uppercase tracking-tight">
                    Resfriamento Não Atendido &bull; Faltam: {diffHours} horas
                  </span>
                </>
              )}
            </div>

            <div className="text-[11px] sm:text-xs text-slate-700 font-mono">
              Primeira disponibilidade física:{' '}
              <strong className="text-slate-900 font-bold underline decoration-slate-300 decoration-1 underline-offset-2">
                {earliestAvailableDate.toLocaleString('pt-BR')}
              </strong>
            </div>

            {!isSatisfied && (
              <div className="flex items-start gap-1.5 text-[11px] text-rose-900 font-sans mt-1 bg-white/70 p-2 rounded-md border border-rose-200">
                <Sparkles className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="text-rose-950">Recomendação IA:</strong> Reposicionar início da
                  linha seguinte para depois de{' '}
                  <strong className="font-mono text-rose-950">
                    {earliestAvailableDate.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>{' '}
                  ({earliestAvailableDate.toLocaleDateString('pt-BR')}) ou alterar a sequência
                  utilizando outro lote/material já resfriado.
                </span>
              </div>
            )}
          </div>

          <div className="shrink-0 self-end md:self-center">
            <Badge
              variant="outline"
              className={`text-xs font-mono font-semibold px-2.5 py-1 shadow-2xs ${
                isSatisfied
                  ? 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-200'
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
