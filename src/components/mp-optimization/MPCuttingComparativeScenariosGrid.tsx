import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Layers,
  Scale,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Percent,
  Check,
} from 'lucide-react'
import type { MPCuttingScenarioItem } from '@/types/mp-cutting-weight-standards'

interface MPCuttingComparativeScenariosGridProps {
  scenarios: MPCuttingScenarioItem[]
  bestScenarioId: string
  selectedScenarioId?: string
  onSelectScenario: (scenarioId: string) => void
  onDetailScenario: (scenario: MPCuttingScenarioItem) => void
  aiJustification?: string
}

export const MPCuttingComparativeScenariosGrid: React.FC<
  MPCuttingComparativeScenariosGridProps
> = ({
  scenarios,
  bestScenarioId,
  selectedScenarioId,
  onSelectScenario,
  onDetailScenario,
  aiJustification,
}) => {
  const bestScenario = scenarios.find((s) => s.id === bestScenarioId)

  return (
    <div className="space-y-6">
      {/* CARD DESTAQUE: MELHOR CENÁRIO RECOMENDADO PELA IA */}
      {bestScenario && (
        <Card className="border-2 border-blue-900 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Sparkles className="w-32 h-32" />
          </div>

          <CardHeader className="pb-3 border-b border-blue-800/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-800 text-amber-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-amber-300">
                      Melhor Cenário Recomendado pelo PCP
                    </span>
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px]">
                      {bestScenario.status}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-0.5">{bestScenario.name}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDetailScenario(bestScenario)}
                  className="bg-transparent border-blue-400 text-white hover:bg-blue-800 text-xs font-semibold"
                >
                  Detalhar Cenário
                </Button>
                <Button
                  size="sm"
                  onClick={() => onSelectScenario(bestScenario.id)}
                  className="bg-amber-400 hover:bg-amber-500 text-blue-950 font-bold text-xs gap-1.5 shadow"
                >
                  {selectedScenarioId === bestScenario.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Cenário Selecionado
                    </>
                  ) : (
                    'Selecionar para Programação'
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 pb-4 space-y-4">
            {/* Indicadores do Cenário Recomendado */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-blue-900/60 border border-blue-700/50 rounded-lg p-2.5">
                <span className="text-[11px] text-blue-200 block">Tipo de Corte</span>
                <span className="text-sm font-bold text-white mt-0.5 block">
                  {bestScenario.cutting_type === 'BLOCOS' ? 'Blocos' : 'Múltiplos'}
                </span>
                <span className="text-[10px] text-blue-300">{bestScenario.used_standard_code}</span>
              </div>

              <div className="bg-blue-900/60 border border-blue-700/50 rounded-lg p-2.5">
                <span className="text-[11px] text-blue-200 block">Rendimento Metálico</span>
                <span className="text-sm font-bold text-emerald-300 mt-0.5 block">
                  {bestScenario.yield_pct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%
                </span>
                <span className="text-[10px] text-blue-300">
                  {(bestScenario.used_weight_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}{' '}
                  t
                </span>
              </div>

              <div className="bg-blue-900/60 border border-blue-700/50 rounded-lg p-2.5">
                <span className="text-[11px] text-blue-200 block">Peso Unit. Calculado</span>
                <span className="text-sm font-bold text-white mt-0.5 block">
                  {(bestScenario.calculated_weight_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}{' '}
                  t
                </span>
                <span className="text-[10px] text-amber-200">
                  Ideal:{' '}
                  {(bestScenario.target_weight_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}{' '}
                  t
                </span>
              </div>

              <div className="bg-blue-900/60 border border-blue-700/50 rounded-lg p-2.5">
                <span className="text-[11px] text-blue-200 block">Desvio do Padrão</span>
                <span className="text-sm font-bold text-amber-300 mt-0.5 block">
                  {bestScenario.deviation_kg > 0 ? '+' : ''}
                  {(bestScenario.deviation_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}{' '}
                  t ({bestScenario.deviation_pct}%)
                </span>
                <span className="text-[10px] text-blue-300">
                  Faixa{' '}
                  {(bestScenario.min_allowed_weight_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}{' '}
                  a{' '}
                  {(bestScenario.max_allowed_weight_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}{' '}
                  t
                </span>
              </div>

              <div className="bg-blue-900/60 border border-blue-700/50 rounded-lg p-2.5">
                <span className="text-[11px] text-blue-200 block">Perda de Corte</span>
                <span className="text-sm font-bold text-red-300 mt-0.5 block">
                  {(bestScenario.cutting_loss_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}{' '}
                  t
                </span>
                <span className="text-[10px] text-blue-300">Ficha Mestra</span>
              </div>

              <div className="bg-blue-900/60 border border-blue-700/50 rounded-lg p-2.5">
                <span className="text-[11px] text-blue-200 block">Atendimento Demanda</span>
                <span className="text-sm font-bold text-emerald-300 mt-0.5 block">
                  {bestScenario.demand_fulfillment_pct.toLocaleString('pt-BR')}%
                </span>
                <span className="text-[10px] text-blue-300">
                  {bestScenario.produced_quantity} peças
                </span>
              </div>
            </div>

            {/* Justificativa Técnica Orientativa da IA */}
            <div className="bg-blue-900/40 border border-blue-700/40 rounded-lg p-3 text-xs text-blue-100 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300">Justificativa da IA Orientativa:</strong>{' '}
                {aiJustification || bestScenario.composition.technical_justification}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OS 6 CENÁRIOS COMPARATIVOS EM GRADE */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-900" />
            Matriz dos 6 Cenários Comparativos Gerados
          </h3>
          <span className="text-xs text-slate-500">
            Total de 6 cenários dimensionados conforme regras industriais de corte
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scen, idx) => {
            const isBest = scen.id === bestScenarioId
            const isSelected = scen.id === selectedScenarioId
            const isViable = scen.status === 'VIÁVEL'

            return (
              <Card
                key={scen.id}
                className={`border transition-all shadow-sm flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-900 ring-2 ring-blue-900/20 bg-blue-50/20'
                    : isBest
                      ? 'border-blue-300 bg-white'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={
                            scen.cutting_type === 'BLOCOS'
                              ? 'bg-blue-50 text-blue-800 border-blue-200 text-[10px]'
                              : 'bg-purple-50 text-purple-800 border-purple-200 text-[10px]'
                          }
                        >
                          {scen.cutting_type === 'BLOCOS' ? 'Blocos' : 'Múltiplos'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            isViable
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]'
                              : 'bg-red-50 text-red-800 border-red-200 text-[10px]'
                          }
                        >
                          {scen.status}
                        </Badge>
                        {isBest && (
                          <Badge className="bg-amber-500 text-blue-950 font-bold text-[10px]">
                            Recomendado IA
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1.5">{scen.name}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        Padrão: {scen.used_standard_code} — {scen.used_standard_description}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-3 space-y-3 flex-1">
                  {/* Grid de 6 Métricas Principais */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">Rendimento Metálico</span>
                      <span className="font-bold text-blue-950 text-sm block mt-0.5">
                        {scen.yield_pct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">Peso Unit. Calculado</span>
                      <span className="font-bold text-slate-900 text-sm block mt-0.5">
                        {(scen.calculated_weight_kg / 1000).toLocaleString('pt-BR', {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })}{' '}
                        t
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">Peso Ideal (Padrão)</span>
                      <span className="font-semibold text-slate-700 block mt-0.5">
                        {(scen.target_weight_kg / 1000).toLocaleString('pt-BR', {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })}{' '}
                        t
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">Desvio do Padrão</span>
                      <span
                        className={`font-semibold block mt-0.5 ${
                          Math.abs(scen.deviation_pct) > 2 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {scen.deviation_kg > 0 ? '+' : ''}
                        {(scen.deviation_kg / 1000).toLocaleString('pt-BR', {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })}{' '}
                        t ({scen.deviation_pct}%)
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">Perda de Corte</span>
                      <span className="font-semibold text-slate-700 block mt-0.5">
                        {(scen.cutting_loss_kg / 1000).toLocaleString('pt-BR', {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })}{' '}
                        t
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">Atendimento</span>
                      <span className="font-semibold text-slate-700 block mt-0.5">
                        {scen.demand_fulfillment_pct.toLocaleString('pt-BR')}% (
                        {scen.produced_quantity} un)
                      </span>
                    </div>
                  </div>

                  {/* Faixa Permitida */}
                  <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
                    <span>Faixa permitida:</span>
                    <span className="font-medium text-slate-700">
                      {(scen.min_allowed_weight_kg / 1000).toLocaleString('pt-BR', {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{' '}
                      a{' '}
                      {(scen.max_allowed_weight_kg / 1000).toLocaleString('pt-BR', {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{' '}
                      t
                    </span>
                  </div>

                  {!isViable && scen.inviability_reason && (
                    <div className="p-2 bg-red-50 text-red-800 rounded border border-red-200 text-[11px]">
                      <strong>Inviabilidade:</strong> {scen.inviability_reason}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="p-3 pt-0 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDetailScenario(scen)}
                    className="text-xs text-blue-900 hover:text-blue-950 font-medium h-8 px-2"
                  >
                    Detalhar Cenário
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={!isViable}
                    onClick={() => onSelectScenario(scen.id)}
                    className={`text-xs font-semibold h-8 ${
                      isSelected
                        ? 'bg-blue-900 text-white'
                        : 'bg-slate-100 text-slate-800 hover:bg-blue-900 hover:text-white'
                    }`}
                  >
                    {isSelected ? 'Selecionado' : 'Selecionar'}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
