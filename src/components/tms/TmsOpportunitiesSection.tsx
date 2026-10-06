import React from 'react'
import { ConsolidationOpportunity, SapSalesOrderItem } from '@/types/tms-mapa-logistico'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, TrendingUp, Truck, CheckCircle2, ArrowRight } from 'lucide-react'

interface TmsOpportunitiesSectionProps {
  opportunities: ConsolidationOpportunity[]
  onSimulateOpportunity: (opp: ConsolidationOpportunity) => void
  onViewComposition: (opp: ConsolidationOpportunity) => void
}

export const TmsOpportunitiesSection: React.FC<TmsOpportunitiesSectionProps> = ({
  opportunities,
  onSimulateOpportunity,
  onViewComposition,
}) => {
  if (opportunities.length === 0) {
    return (
      <Card className="border bg-slate-50/50">
        <CardContent className="p-4 text-center text-xs text-slate-500">
          Nenhuma oportunidade de consolidação identificada para os filtros atuais.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Oportunidades de Consolidação de Cargas (IA)</span>
        </div>
        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
          {opportunities.length} rotas otimizáveis
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {opportunities.map((opp) => {
          const feasibilityBadge = {
            ALTA: {
              label: '🟢 Alta Possibilidade',
              color: 'bg-emerald-50 text-emerald-700 border-emerald-300',
            },
            MEDIA: {
              label: '🟡 Média Possibilidade',
              color: 'bg-amber-50 text-amber-700 border-amber-300',
            },
            BAIXA: {
              label: '🔴 Baixa Possibilidade',
              color: 'bg-rose-50 text-rose-700 border-rose-300',
            },
          }[opp.feasibility]

          return (
            <Card
              key={opp.id}
              className="border shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <CardContent className="p-3.5 space-y-2.5">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-xs">
                      Itinerário {opp.itinerary_code}
                    </span>
                    <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      {opp.itinerary_description}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0.5 ${feasibilityBadge.color}`}
                  >
                    {feasibilityBadge.label}
                  </Badge>
                </div>

                {/* Justificativa / Rationale */}
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                  {opp.rationale}
                </p>

                {/* Indicadores Operacionais */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="p-1.5 bg-blue-50/50 rounded border border-blue-100">
                    <span className="block text-[10px] text-blue-600 font-medium">Economia</span>
                    <span className="font-bold text-blue-900 text-xs">
                      R$ {opp.estimated_savings_brl.toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="p-1.5 bg-emerald-50/50 rounded border border-emerald-100">
                    <span className="block text-[10px] text-emerald-600 font-medium">Ocupação</span>
                    <span className="font-bold text-emerald-900 text-xs">{opp.occupancy_pct}%</span>
                  </div>

                  <div className="p-1.5 bg-purple-50/50 rounded border border-purple-100">
                    <span className="block text-[10px] text-purple-600 font-medium">Descargas</span>
                    <span className="font-bold text-purple-900 text-xs">
                      {opp.stops_count} paradas
                    </span>
                  </div>
                </div>

                {/* Resumo da Rota Proposta */}
                <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                  <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-700">{opp.origin}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                  <span className="truncate">{opp.destinations.join(' → ')}</span>
                </div>

                {/* Botões de Ação */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewComposition(opp)}
                    className="h-7 text-[11px] px-2 text-slate-600"
                  >
                    Ver composição
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSimulateOpportunity(opp)}
                    className="h-7 text-[11px] px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    Simular carga
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
