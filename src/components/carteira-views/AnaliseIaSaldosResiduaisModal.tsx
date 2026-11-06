/**
 * Modal de Análise IA de Saldos Residuais
 * Apresenta concentração por cliente, materiais mais recorrentes, valor financeiro,
 * pedidos vencidos, impacto no planejamento e recomendações de ação comercial.
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  TrendingDown,
  Building2,
  Package,
  Calendar,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
} from 'lucide-react'
import { AnaliseIaResidual } from '@/types/pcp-pedidos-carteira'

interface Props {
  isOpen: boolean
  onClose: () => void
  analise: AnaliseIaResidual | null
}

const formatarMoeda = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(val || 0)
}

const formatarTons = (val: number) => {
  return (
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0) + ' t'
  )
}

export const AnaliseIaSaldosResiduaisModal: React.FC<Props> = ({ isOpen, onClose, analise }) => {
  if (!analise) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-[#004C97] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <Sparkles className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                Análise Cognitiva de Saldos Residuais (IA PCP)
              </DialogTitle>
              <DialogDescription className="text-purple-200 text-xs mt-1">
                Diagnóstico de gargalos, dispersão comercial e impacto na programação fabril das
                linhas de laminação.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)] text-sm">
          {/* Métricas macro da IA */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/60">
              <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider block">
                Total de Itens
              </span>
              <span className="text-xl font-black text-purple-950 font-mono mt-0.5 block">
                {analise.total_itens.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60">
              <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
                Volume Total
              </span>
              <span className="text-xl font-black text-blue-950 font-mono mt-0.5 block">
                {formatarTons(analise.saldo_total_t)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Impacto Financeiro
              </span>
              <span className="text-xl font-black text-emerald-950 font-mono mt-0.5 block">
                {formatarMoeda(analise.valor_total_rs)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                Itens Vencidos
              </span>
              <span className="text-xl font-black text-amber-950 font-mono mt-0.5 block">
                {analise.pedidos_vencidos.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Impacto no Planejamento */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
              <TrendingDown className="w-4 h-4 text-purple-700" />
              Impacto no Planejamento e nas Linhas de Laminação
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{analise.impacto_planejamento}</p>
          </div>

          {/* Duas colunas: Clientes e Materiais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Clientes com maior concentração */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-[#004C97]" />
                Top 5 Clientes com Maior Concentração
              </div>
              <div className="space-y-2">
                {analise.clientes_concentracao.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold text-slate-800 block truncate">
                        {c.cliente}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {c.itens} {c.itens === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-mono font-bold text-[#004C97] block">
                        {formatarTons(c.saldo_t)}
                      </span>
                      <span className="text-[11px] font-mono text-slate-600 block">
                        {formatarMoeda(c.valor_rs)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Materiais mais recorrentes */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
                <Package className="w-4 h-4 text-[#004C97]" />
                Top 5 Materiais Mais Recorrentes
              </div>
              <div className="space-y-2">
                {analise.materiais_recorrentes.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold text-slate-800 block font-mono text-[11px]">
                        {m.material}
                      </span>
                      <span className="text-[11px] text-slate-600 truncate block">
                        {m.descricao}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant="outline" className="font-mono text-[10px] mb-0.5">
                        {m.ocorrencias} {m.ocorrencias === 1 ? 'ped.' : 'peds.'}
                      </Badge>
                      <span className="font-mono font-bold text-[#004C97] text-xs block">
                        {formatarTons(m.saldo_t)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recomendações Comerciais Estratégicas */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3">
            <div className="flex items-center gap-2 font-bold text-indigo-950 text-xs uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-indigo-700" />
              Recomendações de Ação Comercial (Diretrizes para o CRM 360°)
            </div>
            <div className="space-y-2">
              {analise.recomendacoes_comerciais.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-indigo-950">
                  <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs bg-white border-slate-300"
          >
            Fechar Diagnóstico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
