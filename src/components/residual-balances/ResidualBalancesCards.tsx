import React from 'react'
import { Card, CardContent } from '../ui/card'
import { ResidualBalancesExecutiveCards } from '../../types/pcp-residual-balances'
import { formatNumberPTBR } from '../../lib/number-format'
import { Warehouse, Boxes, Layers, Scale, AlertTriangle, Clock } from 'lucide-react'

interface ResidualBalancesCardsProps {
  cards: ResidualBalancesExecutiveCards
  loading?: boolean
}

export const ResidualBalancesCards: React.FC<ResidualBalancesCardsProps> = ({
  cards,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse bg-slate-50 border-slate-200">
            <CardContent className="p-4 h-24 flex flex-col justify-between">
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-6 bg-slate-200 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const items = [
    {
      title: 'Depósitos c/ Residual',
      value: cards.depositos_com_residual,
      formattedValue: String(cards.depositos_com_residual),
      icon: Warehouse,
      subtext: 'Depósitos com ≥1 residual',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Materiais c/ Residual',
      value: cards.materiais_com_residual,
      formattedValue: String(cards.materiais_com_residual),
      icon: Boxes,
      subtext: 'Códigos distintos',
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50 border-indigo-200',
    },
    {
      title: 'Lotes c/ Residual',
      value: cards.lotes_com_residual,
      formattedValue: String(cards.lotes_com_residual),
      icon: Layers,
      subtext: 'Lotes identificados',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50 border-amber-200',
    },
    {
      title: 'Volume Total Residual',
      value: cards.volume_total_residual,
      formattedValue: `${formatNumberPTBR(cards.volume_total_residual, 0, 2)} ${cards.unidade_medida_predominante}`,
      icon: Scale,
      subtext: 'Soma total em estoque',
      color: 'text-slate-800',
      bgColor: 'bg-slate-50 border-slate-200',
    },
    {
      title: 'Ações Necessárias',
      value: cards.acoes_necessarias,
      formattedValue: String(cards.acoes_necessarias),
      icon: AlertTriangle,
      subtext: 'Ultrapassaram parâmetro',
      color: cards.acoes_necessarias > 0 ? 'text-red-700' : 'text-emerald-700',
      bgColor:
        cards.acoes_necessarias > 0
          ? 'bg-red-50 border-red-200 shadow-sm'
          : 'bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Em Tratamento',
      value: cards.em_tratamento,
      formattedValue: String(cards.em_tratamento),
      icon: Clock,
      subtext: 'Tratamentos em andamento',
      color: 'text-sky-700',
      bgColor: 'bg-sky-50 border-sky-200',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {items.map((it, idx) => {
        const Icon = it.icon
        return (
          <Card key={idx} className={`border transition-all hover:shadow-md ${it.bgColor}`}>
            <CardContent className="p-3.5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-600 truncate mr-1">
                  {it.title}
                </span>
                <Icon className={`w-4 h-4 shrink-0 ${it.color}`} />
              </div>
              <div>
                <div className={`text-xl font-bold tracking-tight ${it.color}`}>
                  {it.formattedValue}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">{it.subtext}</div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
