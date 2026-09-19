import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import { formatNumberPTBR, formatCurrencyPTBR } from '@/lib/formatters-ptbr'

export interface PortfolioCardMetric {
  id: string
  titulo: string
  subtitulo?: string
  valor: string | number
  unidade?: string
  tipoFormato?: 'tonelada' | 'quantidade' | 'moeda' | 'percentual' | 'texto'
  cor?: 'padrao' | 'azul' | 'verde' | 'vermelho' | 'amarelo' | 'roxo' | 'cinza'
  destaque?: boolean
  badge?: string
  badgeVariant?: 'default' | 'destructive' | 'outline' | 'secondary'
  tooltip?: string
  itensCount?: number
}

interface PortfolioCardsGridProps {
  cards: PortfolioCardMetric[]
  onCardClick: (cardId: string) => void
}

export const PortfolioCardsGrid: React.FC<PortfolioCardsGridProps> = ({ cards, onCardClick }) => {
  const getCorClasses = (cor?: string) => {
    switch (cor) {
      case 'azul':
        return 'border-blue-200 bg-blue-50/40 hover:border-[#004C97] text-blue-900'
      case 'verde':
        return 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-500 text-emerald-900'
      case 'vermelho':
        return 'border-rose-200 bg-rose-50/40 hover:border-rose-500 text-rose-900'
      case 'amarelo':
        return 'border-amber-200 bg-amber-50/40 hover:border-amber-500 text-amber-900'
      case 'roxo':
        return 'border-purple-200 bg-purple-50/40 hover:border-purple-500 text-purple-900'
      case 'cinza':
        return 'border-slate-200 bg-slate-50/60 hover:border-slate-400 text-slate-800'
      default:
        return 'border-slate-200 bg-white hover:border-[#004C97] text-slate-900'
    }
  }

  const getValorCor = (cor?: string) => {
    switch (cor) {
      case 'azul':
        return 'text-[#004C97]'
      case 'verde':
        return 'text-emerald-700'
      case 'vermelho':
        return 'text-rose-700'
      case 'amarelo':
        return 'text-amber-700'
      case 'roxo':
        return 'text-purple-700'
      default:
        return 'text-slate-900'
    }
  }

  const formatarValor = (card: PortfolioCardMetric) => {
    if (typeof card.valor === 'number') {
      if (card.tipoFormato === 'moeda') return formatCurrencyPTBR(card.valor)
      if (card.tipoFormato === 'tonelada') return `${formatNumberPTBR(card.valor, 2)} t`
      if (card.tipoFormato === 'percentual') return `${formatNumberPTBR(card.valor, 2)} %`
      if (card.tipoFormato === 'quantidade') return Math.round(card.valor).toLocaleString('pt-BR')
      return formatNumberPTBR(card.valor, 2)
    }
    return String(card.valor)
  }

  return (
    <div className="pcp-card-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-2.5">
      {cards.map((c) => {
        const corCard = getCorClasses(c.cor)
        const corValor = getValorCor(c.cor)

        return (
          <Card
            key={c.id}
            onClick={() => onCardClick(c.id)}
            title={c.tooltip || `${c.titulo} • Clique para detalhar`}
            className={`border rounded-xl shadow-2xs hover:shadow-sm transition-all duration-150 cursor-pointer group flex flex-col justify-between min-h-[94px] p-2.5 relative select-none ${corCard}`}
          >
            <div className="flex items-start justify-between gap-1 w-full">
              <span
                className="text-[11px] font-bold text-slate-600 group-hover:text-[#004C97] leading-snug break-words hyphens-auto flex-1 min-w-0"
                title={c.titulo}
              >
                {c.titulo}
              </span>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {c.badge && (
                  <Badge
                    variant={c.badgeVariant || 'secondary'}
                    className="text-[9px] px-1 py-0 h-4 font-bold"
                  >
                    {c.badge}
                  </Badge>
                )}
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-[#004C97] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span
                className={`text-base sm:text-lg font-mono font-bold leading-tight ${corValor}`}
              >
                {formatarValor(c)}
              </span>
              {c.unidade && (
                <span className="text-[10px] text-slate-500 font-mono">{c.unidade}</span>
              )}
            </div>

            {c.subtitulo && (
              <span
                className="text-[10px] text-slate-500 truncate block mt-0.5"
                title={c.subtitulo}
              >
                {c.subtitulo}
              </span>
            )}
          </Card>
        )
      })}
    </div>
  )
}
export default PortfolioCardsGrid
