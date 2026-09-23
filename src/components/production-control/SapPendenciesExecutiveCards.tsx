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
      label: 'Total de Pendências',
      value: stats.total,
      subtext: 'Registros ativos',
      icon: Layers,
      color: 'blue',
      borderClass: 'border-blue-200 hover:border-blue-400',
      activeClass: 'bg-blue-50 ring-2 ring-blue-500',
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
      label: 'Pendências >24h',
      value: stats.maior_24h,
      subtext: 'Idade > 24 horas',
      icon: Clock,
      color: 'amber',
      borderClass: 'border-amber-200 hover:border-amber-400',
      activeClass: 'bg-amber-50 ring-2 ring-amber-500',
    },
    {
      key: 'MAIOR_48H',
      label: 'Pendências >48h',
      value: stats.maior_48h,
      subtext: 'Idade > 48 horas',
      icon: Clock,
      color: 'rose',
      borderClass: 'border-rose-200 hover:border-rose-400',
      activeClass: 'bg-rose-50 ring-2 ring-rose-500',
    },
    {
      key: 'ORDENS_IMPACTADAS',
      label: 'Ordens Impactadas',
      value: stats.ordens_impactadas,
      subtext: 'OPs com restrição',
      icon: TrendingUp,
      color: 'indigo',
      borderClass: 'border-indigo-200 hover:border-indigo-400',
      activeClass: 'bg-indigo-50 ring-2 ring-indigo-500',
    },
    {
      key: 'TONELADAS',
      label: 'Qtd / Toneladas',
      value: `${stats.quantidade_toneladas} t`,
      subtext: 'Volume afetado',
      icon: Boxes,
      color: 'slate',
      borderClass: 'border-slate-200 hover:border-slate-400',
      activeClass: 'bg-slate-100 ring-2 ring-slate-600',
    },
    {
      key: 'CENTRO_TOP',
      label: 'Centro + Pendências',
      value: stats.centro_top.centro !== '-' ? `C${stats.centro_top.centro}` : '-',
      subtext: `${stats.centro_top.count} ocorrências`,
      icon: Factory,
      color: 'cyan',
      borderClass: 'border-cyan-200 hover:border-cyan-400',
      activeClass: 'bg-cyan-50 ring-2 ring-cyan-500',
    },
    {
      key: 'CATEGORIA_TOP',
      label: 'Principal Categoria',
      value: stats.categoria_top.categoria,
      subtext: `${stats.categoria_top.count} registros`,
      icon: CheckCircle2,
      color: 'teal',
      borderClass: 'border-teal-200 hover:border-teal-400',
      activeClass: 'bg-teal-50 ring-2 ring-teal-500',
    },
    {
      key: 'REINCIDENTES',
      label: 'Reincidentes',
      value: stats.reincidentes,
      subtext: 'Mesma chave SAP',
      icon: RotateCcw,
      color: 'purple',
      borderClass: 'border-purple-200 hover:border-purple-400',
      activeClass: 'bg-purple-50 ring-2 ring-purple-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
      {cards.map((c) => {
        const Icon = c.icon
        const isActive = activeFilterKey === c.key
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onCardClick?.(c.key)}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer bg-white shadow-2xs flex flex-col justify-between min-h-[82px] ${c.borderClass} ${
              isActive ? c.activeClass : ''
            }`}
            title={`Filtrar por: ${c.label}`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight truncate">
                {c.label}
              </span>
              <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>
            <div className="font-mono font-bold text-base text-slate-900 truncate my-0.5">
              {c.value}
            </div>
            <div className="text-[9px] text-slate-400 truncate">{c.subtext}</div>
          </button>
        )
      })}
    </div>
  )
}
