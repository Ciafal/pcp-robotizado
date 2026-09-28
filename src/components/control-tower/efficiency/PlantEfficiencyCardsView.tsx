import React from 'react'
import { Building2, Gauge, Factory, ChevronRight, TrendingDown, Layers } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'
import { cn } from '@/lib/utils'

export interface PlantEfficiencyItem {
  id: string
  companyCode: string
  plantCode: string
  plantName: string
  cityState: string
  totalLinesCount: number
  totalCentersCount: number
  plannedTons: number
  realizedTons: number
  adherencePct: number
  occupancyPct: number
  lostCapacityTons: number
  status: 'DENTRO_ESPERADO' | 'ATENCAO' | 'CRITICO' | string
}

interface PlantEfficiencyCardsViewProps {
  plants: PlantEfficiencyItem[]
  onSelectPlant?: (plantCode: string) => void
}

export const PlantEfficiencyCardsView: React.FC<PlantEfficiencyCardsViewProps> = ({
  plants,
  onSelectPlant,
}) => {
  if (plants.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2 shadow-2xs">
        <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
        <h4 className="text-sm font-bold text-slate-800">
          Nenhuma planta industrial encontrada para os filtros selecionados
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Tente alterar os filtros de empresa ou período.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {plants.map((plant) => {
        const isCritical = plant.status === 'CRITICO' || plant.adherencePct < 70
        const isWarning =
          plant.status === 'ATENCAO' || (plant.adherencePct >= 70 && plant.adherencePct < 95)

        return (
          <Card
            key={plant.id}
            className={cn(
              'bg-white border border-slate-200 transition-all hover:shadow-sm rounded-xl overflow-hidden shadow-2xs',
              isCritical ? 'border-rose-300' : isWarning ? 'border-amber-300' : 'border-slate-200',
            )}
          >
            {/* Header da Planta */}
            <CardHeader className="p-4 pb-2 bg-slate-50/60 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-[#004C97] font-bold">
                    <span>{plant.companyCode}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-700">Planta {plant.plantCode}</span>
                  </div>
                  <h4
                    className="text-sm font-bold text-slate-900 leading-snug mt-1 truncate"
                    title={plant.plantName}
                  >
                    {plant.plantName}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{plant.cityState}</p>
                </div>

                <div className="shrink-0">
                  {isCritical ? (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
                      Crítico
                    </Badge>
                  ) : isWarning ? (
                    <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-semibold">
                      Atenção Preventiva
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                      Dentro do Esperado
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-3 space-y-3">
              {/* Resumo de Estrutura */}
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="flex items-center gap-1.5">
                  <Factory className="w-3.5 h-3.5 text-[#004C97]" />
                  <span>
                    {plant.totalLinesCount} {plant.totalLinesCount === 1 ? 'linha' : 'linhas'}
                  </span>
                </span>
                <span className="text-slate-300">&bull;</span>
                <span>
                  {plant.totalCentersCount}{' '}
                  {plant.totalCentersCount === 1 ? 'centro ativo' : 'centros ativos'}
                </span>
              </div>

              {/* Indicadores Principais: Aderência, Ocupação e Capacidade Perdida */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">Aderência</span>
                  <span
                    className={cn(
                      'font-bold text-sm',
                      plant.adherencePct >= 95
                        ? 'text-emerald-700'
                        : plant.adherencePct >= 85
                          ? 'text-amber-700'
                          : 'text-rose-700',
                    )}
                  >
                    {formatPercentPtBr(plant.adherencePct, 1)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Ocupação</span>
                  <span className="text-slate-800 font-semibold text-sm">
                    {formatPercentPtBr(plant.occupancyPct, 1)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Perda Estimada</span>
                  <span className="text-rose-700 font-bold text-sm">
                    {formatTonsPtBr(plant.lostCapacityTons, 1)}
                  </span>
                </div>
              </div>

              {/* Previsto vs Realizado */}
              <div className="flex justify-between items-center text-xs font-mono px-1">
                <span className="text-slate-500">
                  Previsto:{' '}
                  <strong className="text-slate-800">{formatTonsPtBr(plant.plannedTons, 1)}</strong>
                </span>
                <span className="text-slate-500">
                  Realizado:{' '}
                  <strong className="text-slate-900">
                    {formatTonsPtBr(plant.realizedTons, 1)}
                  </strong>
                </span>
              </div>

              {/* Ação */}
              <div className="pt-1">
                <Button
                  size="sm"
                  onClick={() => onSelectPlant && onSelectPlant(plant.plantCode)}
                  className="w-full h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-medium gap-1.5 shadow-2xs"
                >
                  <span>Ver linhas da planta</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
