/**
 * Cards Executivos Clicáveis para Pedidos Cancelados no PCP Robotizado - HUB CIAFAL
 * Requisito 3: 10 cards clicáveis que abrem modal analítico detalhado
 * Padrão Brasileiro ABNT: 1.234,567 t, R$ 1.234,56, 12,5%
 */

import React from 'react'
import {
  XCircle,
  Scale,
  DollarSign,
  Percent,
  Factory,
  Briefcase,
  AlertTriangle,
  Repeat,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'
import { CancellationExecutiveKPIs } from '@/types/cancelled-orders'
import { formatTons, formatCurrencyPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'

interface ExecutiveCardsProps {
  kpis: CancellationExecutiveKPIs
  onCardClick: (cardKey: string, cardTitle: string) => void
}

export const CancelledOrdersExecutiveCards: React.FC<ExecutiveCardsProps> = ({
  kpis,
  onCardClick,
}) => {
  const cards = [
    {
      key: 'pedidos_cancelados',
      title: 'Pedidos cancelados',
      value: `${kpis.totalPedidosQtd.toLocaleString('pt-BR')} itens`,
      subtext: 'Volume total cancelado no período',
      icon: XCircle,
      accentColor: 'border-l-rose-600 text-rose-700 bg-rose-50/40',
      badge: 'Geral',
    },
    {
      key: 'volume_cancelado',
      title: 'Volume cancelado',
      value: formatTons(kpis.totalVolumeToneladas),
      subtext: 'Toneladas brutas recusadas',
      icon: Scale,
      accentColor: 'border-l-amber-600 text-amber-700 bg-amber-50/40',
      badge: 'Massa',
    },
    {
      key: 'valor_cancelado',
      title: 'Valor cancelado',
      value: formatCurrencyPtBr(kpis.totalValorBrl),
      subtext: 'Impacto financeiro faturamento',
      icon: DollarSign,
      accentColor: 'border-l-red-600 text-red-700 bg-red-50/40',
      badge: 'Financeiro',
    },
    {
      key: 'percentual_carteira',
      title: '% da carteira cancelada',
      value: formatPercentPtBr(kpis.percentualCarteiraCancelada),
      subtext: 'Volume cancelado ÷ Carteira total',
      icon: Percent,
      accentColor: 'border-l-blue-600 text-blue-700 bg-blue-50/40',
      badge: 'Índice',
    },
    {
      key: 'cancelamentos_pcp',
      title: 'Cancelamentos PCP',
      value: `${kpis.pcpQtd} ped. | ${formatTons(kpis.pcpToneladas)}`,
      subtext: 'Estoque, laminação e MP',
      icon: Factory,
      accentColor: 'border-l-indigo-600 text-indigo-700 bg-indigo-50/40',
      badge: 'PCP',
    },
    {
      key: 'cancelamentos_comerciais',
      title: 'Cancelamentos comerciais',
      value: `${kpis.comercialQtd} ped. | ${formatTons(kpis.comercialToneladas)}`,
      subtext: 'Preço, prazo e condição',
      icon: Briefcase,
      accentColor: 'border-l-emerald-600 text-emerald-700 bg-emerald-50/40',
      badge: 'Comercial',
    },
    {
      key: 'principal_motivo',
      title: 'Principal motivo',
      value: kpis.principalMotivoNome,
      subtext: `Impacto: ${formatTons(kpis.principalMotivoToneladas)}`,
      icon: AlertTriangle,
      accentColor: 'border-l-orange-600 text-orange-700 bg-orange-50/40',
      badge: 'Top 1',
    },
    {
      key: 'cancelamentos_reincidentes',
      title: 'Cancelamentos reincidentes',
      value: `${kpis.reincidentesQtd.toLocaleString('pt-BR')} casos`,
      subtext: 'Repetição de material/cliente',
      icon: Repeat,
      accentColor: 'border-l-purple-600 text-purple-700 bg-purple-50/40',
      badge: 'Padrão',
    },
    {
      key: 'inconsistencia_ia',
      title: 'Inconsistência pela IA',
      value: `${kpis.inconsistenciasIAQtd.toLocaleString('pt-BR')} ordens`,
      subtext: 'Dados contradizem motivo SAP',
      icon: Sparkles,
      accentColor: 'border-l-yellow-600 text-yellow-800 bg-yellow-50/50',
      badge: 'Alerta IA',
    },
    {
      key: 'potencialmente_evitaveis',
      title: 'Potencialmente evitáveis',
      value: `${kpis.potencialmenteEvitaveisQtd} ped. | ${formatTons(kpis.potencialmenteEvitaveisToneladas)}`,
      subtext: 'Sugestão preliminar da IA',
      icon: ShieldAlert,
      accentColor: 'border-l-cyan-600 text-cyan-800 bg-cyan-50/40',
      badge: 'Oportunidade',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onCardClick(card.key, card.title)}
            className={`group text-left border rounded-lg p-3.5 bg-white border-slate-200 border-l-4 ${card.accentColor} hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-400`}
            title={`Clique para abrir detalhamento executivo de "${card.title}"`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider truncate">
                {card.title}
              </span>
              <Icon className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform flex-shrink-0" />
            </div>

            <div
              className="text-base font-bold text-slate-900 tracking-tight leading-snug truncate"
              title={card.value}
            >
              {card.value}
            </div>

            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
              <span className="truncate">{card.subtext}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/80 border border-slate-200 text-slate-700">
                {card.badge}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
