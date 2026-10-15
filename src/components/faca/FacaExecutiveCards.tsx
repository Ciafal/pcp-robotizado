import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Briefcase,
  Boxes,
  Factory,
  Layers,
  FileCheck2,
  DollarSign,
  AlertTriangle,
  Scale,
  ShieldAlert,
} from 'lucide-react'
import { FacaCardKpis } from '@/types/faca-analise'
import { formatNumberPtBr } from '@/lib/number-format'

interface FacaExecutiveCardsProps {
  kpis: FacaCardKpis
  onCardClick: (cardKey: string) => void
}

export const FacaExecutiveCards: React.FC<FacaExecutiveCardsProps> = ({ kpis, onCardClick }) => {
  const cards = [
    {
      key: 'carteira_total',
      titulo: 'Carteira Total FACA',
      subtitulo: 'Pedidos abertos SAP (t)',
      valor: `${formatNumberPtBr(kpis.carteira_total_t, 1)} t`,
      icone: Briefcase,
      corIcone: 'text-[#004C97] bg-blue-50 border-blue-200',
      destaque: 'Pedidos em carteira',
      corBadge: 'bg-blue-100 text-[#004C97]',
    },
    {
      key: 'estoque_disponivel',
      titulo: 'Estoque Disponível',
      subtitulo: 'Produto acabado faturável (t)',
      valor: `${formatNumberPtBr(kpis.estoque_disponivel_pa_t, 1)} t`,
      icone: Boxes,
      corIcone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      destaque: 'Livre em depósito PA',
      corBadge: 'bg-emerald-100 text-emerald-800',
    },
    {
      key: 'necessidade_producao',
      titulo: 'Necessidade Produção',
      subtitulo: 'Volume líquido a produzir (t)',
      valor: `${formatNumberPtBr(kpis.necessidade_producao_t, 1)} t`,
      icone: Factory,
      corIcone: 'text-amber-700 bg-amber-50 border-amber-200',
      destaque: 'Déficit líquido PA',
      corBadge: 'bg-amber-100 text-amber-800',
    },
    {
      key: 'mp_disponivel',
      titulo: 'MP Específica Disponível',
      subtitulo: 'Disponível Agora vs Potencial (t)',
      valor: `${formatNumberPtBr(kpis.mp_especifica_disponivel_t, 1)} t`,
      valorSecundario:
        kpis.mp_potencial_t !== undefined
          ? `Potencial: ${formatNumberPtBr(kpis.mp_potencial_t, 1)} t`
          : undefined,
      icone: Layers,
      corIcone: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      destaque: kpis.mp_detalhe_consolidado
        ? `DP07+DP04: ${formatNumberPtBr(kpis.mp_especifica_disponivel_t, 1)} t | KS: ${formatNumberPtBr(kpis.mp_detalhe_consolidado.ks_saldo_a_cortar_t, 1)} t`
        : 'Estoque Livre de Tarugos',
      corBadge: 'bg-indigo-100 text-indigo-800',
    },
    {
      key: 'mp_necessaria',
      titulo: 'MP Necessária',
      subtitulo: 'Necessidade líquida calculada (t)',
      valor: `${formatNumberPtBr(kpis.mp_necessaria_t, 1)} t`,
      icone: FileCheck2,
      corIcone: 'text-purple-700 bg-purple-50 border-purple-200',
      destaque: 'Demanda / Rendimento',
      corBadge: 'bg-purple-100 text-purple-800',
    },
    {
      key: 'faturamento_potencial',
      titulo: 'Faturamento Potencial',
      subtitulo: 'Pedidos com cobertura total (R$)',
      valor: `R$ ${kpis.faturamento_potencial_brl.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icone: DollarSign,
      corIcone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      destaque: `Confirmado: R$ ${kpis.faturamento_confirmado_brl.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      corBadge: 'bg-emerald-100 text-emerald-800',
    },
    {
      key: 'estoque_sem_pedido',
      titulo: 'Estoque Sem Pedido',
      subtitulo: 'PA livre sem carteira ativa (t)',
      valor: `${formatNumberPtBr(kpis.estoque_sem_pedido_t, 1)} t`,
      icone: AlertTriangle,
      corIcone: 'text-orange-700 bg-orange-50 border-orange-200',
      destaque: 'Atuação comercial spot',
      corBadge: 'bg-orange-100 text-orange-800',
    },
    {
      key: 'carteira_minima',
      titulo: 'Carteira Mínima',
      subtitulo: 'Abaixo do lote de laminação (t)',
      valor: `${formatNumberPtBr(kpis.carteira_minima_abaixo_t, 1)} t`,
      icone: Scale,
      corIcone: 'text-amber-700 bg-amber-50 border-amber-200',
      destaque: 'Abaixo do lote técnico',
      corBadge: 'bg-amber-100 text-amber-800',
    },
    {
      key: 'pedidos_criticos',
      titulo: 'Pedidos Críticos',
      subtitulo: 'Risco de não atendimento',
      valor: `${kpis.pedidos_criticos_count} pedidos`,
      icone: ShieldAlert,
      corIcone: 'text-rose-700 bg-rose-50 border-rose-200',
      destaque: 'Déficit de MP / Lote',
      corBadge: 'bg-rose-100 text-rose-800',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-3">
      {cards.map((card) => {
        const IconComponent = card.icone
        return (
          <Card
            key={card.key}
            onClick={() => onCardClick(card.key)}
            className="cursor-pointer border border-slate-200 hover:border-[#004C97] hover:shadow-md transition-all duration-200 bg-white group select-none"
          >
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors group-hover:scale-105 ${card.corIcone}`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 font-medium ${card.corBadge}`}
                >
                  Detalhes
                </Badge>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-800 truncate" title={card.titulo}>
                  {card.titulo}
                </div>
                <div className="text-[9px] text-slate-500 truncate" title={card.subtitulo}>
                  {card.subtitulo}
                </div>
              </div>

              <div className="pt-0.5 space-y-0.5">
                <div className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
                  {card.valor}
                </div>
                {(card as any).valorSecundario && (
                  <div className="text-[10px] font-bold text-indigo-700 truncate">
                    {(card as any).valorSecundario}
                  </div>
                )}
                <div
                  className="text-[9px] font-semibold text-slate-500 truncate pt-0.5"
                  title={card.destaque}
                >
                  {card.destaque}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
