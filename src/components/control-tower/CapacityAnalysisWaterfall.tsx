import React from 'react'
import { TrendingDown, BarChart3, Layers, ArrowRight, Info, ChevronDown } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { cn } from '@/lib/utils'

export const CapacityAnalysisWaterfall: React.FC = () => {
  const { plantCapacityAnalysis, filters } = useControlTower()
  const wf = plantCapacityAnalysis.waterfall

  // Array estruturado da Ponte Waterfall
  const waterfallSteps = [
    {
      label: 'Capacidade Nominal Técnica',
      value: wf.nominalCapacity,
      type: 'BASE',
      color: 'bg-[#004C97]',
    },
    {
      label: 'Perda Estrutural pelo Mix',
      value: wf.mixStructuralLoss,
      type: 'LOSS',
      color: 'bg-amber-600',
    },
    { label: 'Perda por Setup', value: wf.setupLoss, type: 'LOSS', color: 'bg-orange-600' },
    {
      label: 'Perda por Manutenção',
      value: wf.maintenanceLoss,
      type: 'LOSS',
      color: 'bg-rose-600',
    },
    {
      label: 'Perda por Ritmo (Velocidade)',
      value: wf.rhythmSpeedLoss,
      type: 'LOSS',
      color: 'bg-amber-500',
    },
    {
      label: 'Perda por Qualidade / Sucata',
      value: wf.qualityDefectLoss,
      type: 'LOSS',
      color: 'bg-rose-500',
    },
    {
      label: 'Perda por Falta de Material',
      value: wf.materialShortageLoss,
      type: 'LOSS',
      color: 'bg-purple-600',
    },
    { label: 'Perda Operacional', value: wf.operationalLoss, type: 'LOSS', color: 'bg-slate-600' },
    {
      label: 'Capacidade Realizada Física',
      value: wf.realizedCapacity,
      type: 'RESULT',
      color: 'bg-emerald-600',
    },
  ]

  return (
    <div className="space-y-4">
      {/* 4 Conceitos Fundamentais de Capacidade */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-900 border-slate-800 p-3.5 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">
            1. Capacidade Nominal
          </span>
          <div className="text-2xl font-black text-white font-mono">
            {plantCapacityAnalysis.nominalCapacityTons.toLocaleString('pt-BR')} t
          </div>
          <span className="text-[10px] text-slate-500">Referência técnica de placa</span>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3.5 space-y-1">
          <span className="text-[10px] font-mono text-sky-400 block uppercase">
            2. Programável pelo Mix
          </span>
          <div className="text-2xl font-black text-sky-400 font-mono">
            {plantCapacityAnalysis.mixProgrammableCapacityTons.toLocaleString('pt-BR')} t
          </div>
          <span className="text-[10px] text-slate-400">Considera ritmo por família</span>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3.5 space-y-1">
          <span className="text-[10px] font-mono text-emerald-400 block uppercase">
            3. Capacidade Realizada
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {plantCapacityAnalysis.realizedCapacityTons.toLocaleString('pt-BR')} t
          </div>
          <span className="text-[10px] text-emerald-300/70">Produção física acumulada</span>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3.5 space-y-1">
          <span className="text-[10px] font-mono text-rose-400 block uppercase">
            4. Capacidade Perdida
          </span>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {plantCapacityAnalysis.lostCapacityTons.toLocaleString('pt-BR')} t
          </div>
          <span className="text-[10px] text-rose-300/70">Programável − Realizada</span>
        </Card>
      </div>

      {/* Gráfico Ponte Waterfall */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <CardTitle className="text-sm font-bold text-white">
                Waterfall de Capacidade da Planta &bull; Ponte de Decomposição das Perdas
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-slate-700 text-slate-300"
            >
              Período: {plantCapacityAnalysis.period}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-4">
          <p className="text-xs text-slate-400">
            A capacidade nominal nunca é tratada como número isolado: o gráfico ponte decompõe o
            fluxo desde o teto técnico até a produção física realizada, permitindo drill-down em
            cada causa de perda.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-2 text-center text-xs font-mono">
            {waterfallSteps.map((step, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-2.5 rounded-lg border flex flex-col justify-between space-y-2',
                  step.type === 'BASE'
                    ? 'bg-sky-950/40 border-sky-800/80'
                    : step.type === 'RESULT'
                      ? 'bg-emerald-950/40 border-emerald-800/80'
                      : 'bg-slate-950 border-slate-800',
                )}
              >
                <div className="text-[10px] text-slate-400 leading-tight font-sans h-8 flex items-center justify-center">
                  {step.label}
                </div>

                <div
                  className={cn(
                    'text-base font-black font-mono',
                    step.value < 0 ? 'text-rose-400' : 'text-slate-100',
                  )}
                >
                  {step.value > 0 && step.type === 'BASE' ? '' : step.value > 0 ? '+' : ''}
                  {step.value.toLocaleString('pt-BR')} t
                </div>

                <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-800">
                  <div className={cn('h-full', step.color)} style={{ width: '100%' }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
