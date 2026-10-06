import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Weight, ShoppingCart, Users, Truck, MapPin, Gauge } from 'lucide-react'

interface TmsExecutiveCardsProps {
  totalTons: number
  totalOrders: number
  totalCustomers: number
  potentialLoads: number
  statesCount: number
  averageOccupancyPct: number
}

export const TmsExecutiveCards: React.FC<TmsExecutiveCardsProps> = ({
  totalTons,
  totalOrders,
  totalCustomers,
  potentialLoads,
  statesCount,
  averageOccupancyPct,
}) => {
  const cards = [
    {
      title: 'Carteira Disponível',
      value: `${totalTons.toFixed(1).replace('.', ',')} t`,
      sub: 'Demanda total filtrada',
      icon: Weight,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      title: 'Pedidos',
      value: totalOrders.toLocaleString('pt-BR'),
      sub: 'Itens em carteira SAP',
      icon: ShoppingCart,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
      title: 'Clientes',
      value: totalCustomers.toLocaleString('pt-BR'),
      sub: 'Destinatários únicos',
      icon: Users,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Cargas Potenciais',
      value: potentialLoads.toLocaleString('pt-BR'),
      sub: 'Base 30-32 t/veículo',
      icon: Truck,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      title: 'Estados Atendidos',
      value: statesCount.toLocaleString('pt-BR'),
      sub: 'UFs com demanda ativa',
      icon: MapPin,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
    },
    {
      title: 'Ocupação Média Estimada',
      value: `${averageOccupancyPct}%`,
      sub: 'Aproveitamento de frota',
      icon: Gauge,
      color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c, i) => {
        const IconComponent = c.icon
        return (
          <Card
            key={i}
            className="border shadow-xs bg-white rounded-lg hover:shadow-sm transition-shadow"
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-500 truncate" title={c.title}>
                  {c.title}
                </span>
                <div className={`p-1.5 rounded-md border ${c.color}`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-lg font-bold text-slate-900 tracking-tight">{c.value}</div>
              <div className="text-[11px] text-slate-400 truncate">{c.sub}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
