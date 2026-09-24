import React from 'react'
import {
  AlertTriangle,
  Clock,
  Flame,
  Layers,
  CheckCircle2,
  TrendingUp,
  Boxes,
  Factory,
  RotateCcw,
} from 'lucide-react'
import type { ExecutiveCardsStats } from '@/types/sap-pendencies'

interface SapPendenciesExecutiveCardsProps {
  stats: ExecutiveCardsStats
  activeFilterKey?: string | null
  onCardClick?: (filterKey: string) => void
}

export const SapPendenciesExecutiveCards: React.FC<SapPendenciesExecutiveCardsProps> = ({
  stats,
  activeFilterKey,
  onCardClick,
}) => {
  const cards = [
    {
      key: 'TOTAL',
      label: 'Total',
      value: stats.total,
      subtext: 'Registros ativos',
      icon: Layers,
      color: 'blue',
      borderClass: 'border-blue-200 hover:border-blue-400',
      activeClass: 'bg-blue-50 ring-2 ring-[#004C97]',
    },
    {
      key: 'CRITICAS',
      label: 'Críticas',
      value: stats.criticas,
      subtext: 'Bloqueio imediato',
      icon: Flame,
      color: 'rose',
      borderClass: 'border-rose-300 hover:border-rose-500',
      activeClass: 'bg-rose-50 ring-2 ring-rose-600',
    },
    {
      key: 'URGENTES',
      label: 'Urgentes',
      value: stats.urgentes,
      subtext: 'Risco de parada',
      icon: AlertTriangle,
      color: 'amber',
      borderClass: 'border-amber-300 hover:border-amber-500',
      activeClass: 'bg-amber-50 ring-2 ring-amber-600',
    },
    {
      key: 'MAIOR_24H',
      label: '> 24 h',
      value: stats.maior_24h,
      subtext: 'Idade > 24 horas',
      icon: Clock,
      color: 'amber',
      borderClass: 'border-amber-200 hover:border-amber-400',
      activeClass: 'bg-amber-50 ring-2 ring-amber-500',
    },
    {
      key: 'ORDENS_IMPACTADAS',
      label: 'Ordens impactadas',
      value: stats.ordens_impactadas,
      subtext: 'OPs com restrição',
      icon: TrendingUp,
      color: 'blue',
      borderClass: 'border-blue-200 hover:border-blue-400',
      activeClass: 'bg-blue-50 ring-2 ring-[#004C97]',
    },
    {
      key: 'REINCIDENTES',
      label: 'Reincidentes',
      value: stats.reincidentes,
      subtext: 'Mesma chave SAP',
      icon: RotateCcw,
      color: 'purple',
      borderClass: 'border-purple-200 hover:border-purple-400',
      activeClass: 'bg-purple-50 ring-2 ring-purple-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-2.5">
      {cards.map((c) => {
        const Icon = c.icon
        const isActive = activeFilterKey === c.key
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onCardClick?.(c.key)}
            className={`p-2.5 sm:p-3 rounded-lg border text-left transition-all cursor-pointer bg-white shadow-2xs flex flex-col justify-between min-h-[76px] sm:min-h-[80px] ${c.borderClass} ${
              isActive ? c.activeClass : ''
            }`}
            title={`Filtrar por: ${c.label}`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight truncate">
                {c.label}
              </span>
              <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>
            <div className="font-mono font-bold text-lg text-slate-900 truncate my-0.5">
              {c.value}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{c.subtext}</div>
          </button>
        )
      })}
    </div>
  )
}
