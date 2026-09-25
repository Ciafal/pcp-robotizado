/**
 * Cards Executivos Clicáveis para Pedidos Cancelados no PCP Robotizado - HUB CIAFAL
 * PARTE 2: Correção dos 10 cards superiores
 * - Grid: desktop 5 por linha, tablet 2-3, celular 1.
 * - Mesma altura na linha, padding uniforme, largura proporcional.
 * - Estrutura interna em 4 linhas padronizadas:
 *    Linha 1: ícone + título curto (13-14px)
 *    Linha 2: valor principal (18-22px) SEMPRE completo, quebrando em 2 linhas se necessário, NUNCA truncando com "..."
 *    Linha 3: descrição resumida (12-13px)
 *    Linha 4: tag/status opcional (11-12px)
 * - Títulos curtos obrigatórios:
 *    1. Pedidos cancelados
 *    2. Volume cancelado
 *    3. Valor cancelado
 *    4. % da carteira
 *    5. Relacionados ao PCP
 *    6. Comerciais
 *    7. Principal motivo
 *    8. Reincidências
 *    9. Inconsistências IA
 *    10. Evitáveis
 * - Todos clicáveis aplicando filtro ou abrindo detalhamento analítico.
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
  ChevronRight,
} from 'lucide-react'
import { CancellationExecutiveKPIs } from '@/types/cancelled-orders'
import { formatTons, formatCurrencyPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'

interface ExecutiveCardsProps {
  kpis: CancellationExecutiveKPIs
  onCardClick: (cardKey: string, cardTitle: string) => void
  activeCardKey?: string | null
}

export const CancelledOrdersExecutiveCards: React.FC<ExecutiveCardsProps> = ({
  kpis,
  onCardClick,
  activeCardKey,
}) => {
  const cards = [
    {
      key: 'pedidos_cancelados',
      title: 'Pedidos cancelados',
      // Linha 2 valor principal: completo
      valuePrimary: `${kpis.totalPedidosQtd.toLocaleString('pt-BR')} itens`,
      valueSecondary: `Volume total: ${formatTons(kpis.totalVolumeToneladas)}`,
      description: 'Volume total cancelado no período',
      tag: 'Geral',
      icon: XCircle,
      borderColor: 'border-l-rose-600',
      tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
      activeRing: 'ring-2 ring-rose-500',
      fullTooltip: `${kpis.totalPedidosQtd} pedidos cancelados somando ${formatTons(kpis.totalVolumeToneladas)} e ${formatCurrencyPtBr(kpis.totalValorBrl)}`,
    },
    {
      key: 'volume_cancelado',
      title: 'Volume cancelado',
      valuePrimary: formatTons(kpis.totalVolumeToneladas),
      valueSecondary: 'Toneladas canceladas',
      description: 'Massa total recusada',
      tag: 'Massa',
      icon: Scale,
      borderColor: 'border-l-amber-600',
      tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
      activeRing: 'ring-2 ring-amber-500',
      fullTooltip: `Total de ${formatTons(kpis.totalVolumeToneladas)} de produtos acabados cancelados`,
    },
    {
      key: 'valor_cancelado',
      title: 'Valor cancelado',
      valuePrimary: formatCurrencyPtBr(kpis.totalValorBrl),
      valueSecondary: 'Impacto financeiro',
      description: 'Faturamento bruto impactado',
      tag: 'Financeiro',
      icon: DollarSign,
      borderColor: 'border-l-red-600',
      tagColor: 'bg-red-50 text-red-700 border-red-200',
      activeRing: 'ring-2 ring-red-500',
      fullTooltip: `Impacto financeiro total de ${formatCurrencyPtBr(kpis.totalValorBrl)} na carteira`,
    },
    {
      key: 'percentual_carteira',
      title: '% da carteira',
      valuePrimary: formatPercentPtBr(kpis.percentualCarteiraCancelada),
      valueSecondary: 'Sobre carteira total',
      description: 'Proporção de perdas sobre pedidos',
      tag: 'Índice',
      icon: Percent,
      borderColor: 'border-l-blue-600',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
      activeRing: 'ring-2 ring-blue-500',
      fullTooltip: `${formatPercentPtBr(kpis.percentualCarteiraCancelada)} do volume total da carteira foi cancelado`,
    },
    {
      key: 'cancelamentos_pcp',
      title: 'Relacionados ao PCP',
      valuePrimary: `${kpis.pcpQtd} pedidos`,
      valueSecondary: formatTons(kpis.pcpToneladas),
      description: 'Estoque, laminação e matéria-prima',
      tag: 'PCP',
      icon: Factory,
      borderColor: 'border-l-indigo-600',
      tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      activeRing: 'ring-2 ring-indigo-500',
      fullTooltip: `${kpis.pcpQtd} pedidos atribuídos ao PCP somando ${formatTons(kpis.pcpToneladas)}. Clique para filtrar por responsabilidade PCP.`,
    },
    {
      key: 'cancelamentos_comerciais',
      title: 'Comerciais',
      valuePrimary: `${kpis.comercialQtd} pedidos`,
      valueSecondary: formatTons(kpis.comercialToneladas),
      description: 'Preço, condição e prazo comercial',
      tag: 'Comercial',
      icon: Briefcase,
      borderColor: 'border-l-emerald-600',
      tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      activeRing: 'ring-2 ring-emerald-500',
      fullTooltip: `${kpis.comercialQtd} pedidos cancelados por motivos comerciais somando ${formatTons(kpis.comercialToneladas)}`,
    },
    {
      key: 'principal_motivo',
      title: 'Principal motivo',
      valuePrimary: kpis.principalMotivoNome || 'Não apurado',
      valueSecondary: formatTons(kpis.principalMotivoToneladas),
      description: 'Maior ofensor em volume',
      tag: 'Top 1',
      icon: AlertTriangle,
      borderColor: 'border-l-orange-600',
      tagColor: 'bg-orange-50 text-orange-800 border-orange-200',
      activeRing: 'ring-2 ring-orange-500',
      fullTooltip: `Principal motivo: "${kpis.principalMotivoNome}" com ${formatTons(kpis.principalMotivoToneladas)}. Clique para filtrar por este motivo.`,
    },
    {
      key: 'cancelamentos_reincidentes',
      title: 'Reincidências',
      valuePrimary: `${kpis.reincidentesQtd.toLocaleString('pt-BR')} casos`,
      valueSecondary: 'Material / cliente recorrente',
      description: 'Padrão reincidente identificado',
      tag: 'Recorrente',
      icon: Repeat,
      borderColor: 'border-l-purple-600',
      tagColor: 'bg-purple-50 text-purple-800 border-purple-200',
      activeRing: 'ring-2 ring-purple-500',
      fullTooltip: `${kpis.reincidentesQtd} ocorrências reincidentes em até 30 dias. Clique para filtrar reincidentes.`,
    },
    {
      key: 'inconsistencia_ia',
      title: 'Inconsistências IA',
      valuePrimary: `${kpis.inconsistenciasIAQtd.toLocaleString('pt-BR')} pedidos`,
      valueSecondary: 'Dados contradizem SAP',
      description: 'Divergências detectadas pelo modelo',
      tag: 'Alerta IA',
      icon: Sparkles,
      borderColor: 'border-l-amber-500',
      tagColor: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
      activeRing: 'ring-2 ring-amber-500',
      fullTooltip: `${kpis.inconsistenciasIAQtd} ordens com inconsistência encontrada pela IA. Clique para filtrar pedidos com divergência.`,
    },
    {
      key: 'potencialmente_evitaveis',
      title: 'Evitáveis',
      valuePrimary: `${kpis.potencialmenteEvitaveisQtd} pedidos`,
      valueSecondary: formatTons(kpis.potencialmenteEvitaveisToneladas),
      description: 'Oportunidade de reversão',
      tag: 'Evitável',
      icon: ShieldAlert,
      borderColor: 'border-l-teal-600',
      tagColor: 'bg-teal-50 text-teal-800 border-teal-200',
      activeRing: 'ring-2 ring-teal-500',
      fullTooltip: `${kpis.potencialmenteEvitaveisQtd} pedidos classificados como potencialmente evitáveis (${formatTons(kpis.potencialmenteEvitaveisToneladas)}). Clique para filtrar.`,
    },
  ]

  return (
    <div className="w-full mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 items-stretch">
        {cards.map((card) => {
          const Icon = card.icon
          const isActive = activeCardKey === card.key

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onCardClick(card.key, card.title)}
              title={card.fullTooltip}
              className={`group text-left border rounded-xl p-3.5 bg-white border-slate-200 border-l-[5px] ${card.borderColor} flex flex-col justify-between h-full min-h-[148px] shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#004C97]/40 ${
                isActive ? `${card.activeRing} bg-slate-50/80` : ''
              }`}
            >
              {/* Linha 1: Ícone + Título Curto (13-14px) */}
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="p-1 rounded-md bg-slate-100 text-slate-700 group-hover:bg-[#004C97]/10 group-hover:text-[#004C97] transition-colors flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[13px] md:text-[14px] font-bold text-slate-700 tracking-tight leading-tight truncate">
                    {card.title}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>

              {/* Linha 2: Valor Principal (18-22px) SEMPRE completo, quebra em 2 linhas se necessário */}
              <div className="mt-2 mb-1 w-full">
                <div className="text-[18px] sm:text-[19px] xl:text-[20px] font-extrabold text-slate-900 tracking-tight leading-tight break-words">
                  {card.valuePrimary}
                </div>
                {card.valueSecondary && (
                  <div className="text-[12px] font-semibold text-slate-600 mt-0.5 leading-snug break-words">
                    {card.valueSecondary}
                  </div>
                )}
              </div>

              {/* Linha 3: Descrição resumida (12-13px) */}
              <div className="text-[12px] text-slate-500 leading-snug line-clamp-1 w-full mt-auto">
                {card.description}
              </div>

              {/* Linha 4: Tag/Status Opcional (11-12px) */}
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 w-full text-[11px]">
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] border ${card.tagColor}`}
                >
                  {card.tag}
                </span>
                <span className="text-[11px] text-slate-400 font-medium group-hover:text-[#004C97] transition-colors">
                  Detalhes →
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
