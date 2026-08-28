import React from 'react'
import { ExecutiveCardKPI, TrafficLightStatus } from '@/types/executive-cockpit'
import { formatCiafalNumber, formatWithUnit } from '@/services/deterministic-executive-engine'
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ExecutiveCardsGridProps {
  cards: ExecutiveCardKPI[]
  onSelectCard?: (card: ExecutiveCardKPI) => void
}

export const ExecutiveCardsGrid: React.FC<ExecutiveCardsGridProps> = ({ cards, onSelectCard }) => {
  const renderStatusBadge = (status: TrafficLightStatus, text: string) => {
    switch (status) {
      case 'GREEN':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Verde &bull; {text}</span>
          </Badge>
        )
      case 'YELLOW':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Amarelo &bull; {text}</span>
          </Badge>
        )
      case 'RED':
        return (
          <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px] font-bold gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Vermelho &bull; {text}</span>
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-bold gap-1">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            <span>Cinza &bull; N/A</span>
          </Badge>
        )
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
      {cards.map((card) => {
        const isPositiveTrend = card.trend === 'UP'
        const isNegativeTrend = card.trend === 'DOWN'

        return (
          <Card
            key={card.id}
            onClick={() => onSelectCard?.(card)}
            className="bg-white border-slate-200 hover:border-[#004C97]/50 transition-all shadow-sm cursor-pointer group flex flex-col justify-between"
          >
            <div className="p-3.5 space-y-2.5">
              {/* Cabeçalho do Card */}
              <div className="flex items-start justify-between gap-1.5">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 block">
                    {card.sourceModule}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-[#004C97] transition-colors leading-tight">
                    {card.title}
                  </h3>
                </div>
                <div className="shrink-0">
                  {renderStatusBadge(card.status, card.statusText.split(' ')[0])}
                </div>
              </div>

              {/* Valor Principal Realizado vs Meta */}
              <div className="pt-1 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {formatCiafalNumber(card.realized, card.unit === '%' ? 0 : 1)}
                  </span>
                  <span className="text-xs font-bold text-[#004C97] ml-1">{card.unit}</span>
                </div>

                <div className="text-right text-[11px] text-slate-500">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Meta</span>
                  <span className="font-semibold text-slate-700">
                    {formatWithUnit(card.target, card.unit, card.unit === '%' ? 0 : 1)}
                  </span>
                </div>
              </div>

              {/* Grid de Detalhes Técnicos: Gap | Tendência | Forecast */}
              <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center text-[10px]">
                {/* Gap */}
                <div>
                  <span className="block text-slate-400 uppercase font-bold text-[8px]">GAP</span>
                  <span
                    className={`font-bold ${card.gap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {card.gap > 0 ? '+' : ''}
                    {formatCiafalNumber(card.gap, card.unit === '%' ? 0 : 1)} {card.unit}
                  </span>
                </div>

                {/* Tendência */}
                <div>
                  <span className="block text-slate-400 uppercase font-bold text-[8px]">
                    Tendência
                  </span>
                  <span
                    className={`font-bold inline-flex items-center gap-0.5 ${
                      isPositiveTrend
                        ? 'text-emerald-600'
                        : isNegativeTrend
                          ? 'text-rose-600'
                          : 'text-slate-600'
                    }`}
                  >
                    {isPositiveTrend ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : isNegativeTrend ? (
                      <ArrowDownRight className="w-3 h-3" />
                    ) : (
                      <Minus className="w-3 h-3" />
                    )}
                    {Math.abs(card.trendPct)}%
                  </span>
                </div>

                {/* Forecast */}
                <div>
                  <span className="block text-slate-400 uppercase font-bold text-[8px]">
                    Forecast
                  </span>
                  <span className="font-bold text-[#004C97]">
                    {formatCiafalNumber(card.forecast, card.unit === '%' ? 0 : 1)} {card.unit}
                  </span>
                </div>
              </div>

              {/* Mini Sparkline Histórico Simulado */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1">
                  <span>Ritmo 7D</span>
                  <span className="font-mono text-emerald-600 font-bold">
                    Conf: {card.confidencePct}%
                  </span>
                </div>
                <div className="flex items-end gap-1 h-6 pt-1">
                  {card.historySeries.map((s, idx) => {
                    const heightPct = Math.min(
                      100,
                      Math.max(20, (s.realized / (card.target || 1)) * 60),
                    )
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-blue-100 hover:bg-[#004C97] transition-colors rounded-xs relative group/bar h-full flex items-end"
                        title={`${s.date}: ${s.realized} ${card.unit}`}
                      >
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-xs ${
                            s.forecast ? 'bg-amber-400' : 'bg-[#004C97]'
                          }`}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Rodapé com Explicação Racional */}
            <div className="bg-slate-50/80 px-3.5 py-2 border-t border-slate-100 text-[10px] text-slate-600 truncate">
              {card.statusRationale}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export default ExecutiveCardsGrid
