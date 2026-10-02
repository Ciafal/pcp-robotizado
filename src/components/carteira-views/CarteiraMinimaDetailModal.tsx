import React from 'react'
import {
  X,
  Sparkles,
  Layers,
  Scale,
  Clock,
  Calendar,
  Building2,
  Factory,
  PackageCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CarteiraMinimaItem } from '@/types/carteira-minima'
import { formatNumberPTBR } from '@/lib/number-format'

interface CarteiraMinimaDetailModalProps {
  item: CarteiraMinimaItem | null
  isOpen: boolean
  onClose: () => void
}

function formatarDataPtBr(dataIso?: string): string {
  if (!dataIso) return '—'
  const parts = dataIso.split('T')[0].split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dataIso
}

export const CarteiraMinimaDetailModal: React.FC<CarteiraMinimaDetailModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-0 gap-0 rounded-2xl">
        {/* Cabeçalho do Modal */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-widest text-[#004C97] uppercase">
                  PCP ROBOTIZADO • DETALHAMENTO DE CARTEIRA MÍNIMA
                </span>
                <Badge
                  variant="outline"
                  className={
                    item.criticidade === 'Crítico'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
                      : item.criticidade === 'Atenção'
                        ? 'bg-amber-50 text-amber-700 border-amber-300 font-bold'
                        : 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                  }
                >
                  {item.criticidade}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Material {item.material} — {item.descricao_material}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Pedido de Venda: <strong>{item.pedido_formatado}</strong> • Empresa:{' '}
                <strong>{item.empresa}</strong>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Corpo do Detalhamento */}
        <div className="p-6 space-y-6">
          {/* 1. Grade de Dados Quantitativos Obrigatórios */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#004C97]" />
              Balanço Físico de Carteira vs Lote Mínimo
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Carteira do Item
                </span>
                <span className="text-base font-mono font-bold text-slate-900 block mt-1">
                  {formatNumberPTBR(item.carteira_tons, 3)} t
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Demanda total do cliente
                </span>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 uppercase block font-semibold">
                  Estoque Livre
                </span>
                <span className="text-base font-mono font-bold text-emerald-800 block mt-1">
                  {formatNumberPTBR(item.estoque_livre_tons, 3)} t
                </span>
                <span className="text-[10px] text-emerald-600 mt-0.5 block">
                  Disponível em depósito
                </span>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-300">
                <span className="text-[10px] text-amber-800 uppercase block font-bold">
                  Saldo a Produzir
                </span>
                <span className="text-base font-mono font-bold text-amber-900 block mt-1">
                  {formatNumberPTBR(item.saldo_produzir_tons, 3)} t
                </span>
                <span className="text-[10px] text-amber-700 mt-0.5 block">
                  Carteira − Estoque Livre
                </span>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                <span className="text-[10px] text-blue-700 uppercase block font-semibold">
                  Produção Mínima
                </span>
                <span className="text-base font-mono font-bold text-blue-900 block mt-1">
                  {formatNumberPTBR(item.producao_minima_tons, 3)} t
                </span>
                <span className="text-[10px] text-blue-600 mt-0.5 block">
                  Lote mínimo de laminação
                </span>
              </div>
            </div>

            {/* Destaque da Diferença para Atingir o Mínimo */}
            <div className="mt-3 p-3.5 bg-rose-50/60 rounded-xl border border-rose-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-slate-700 font-medium">
                  Diferença pendente para atingir o lote mínimo de produção:
                </span>
              </div>
              <span className="text-sm font-mono font-bold text-rose-700 whitespace-nowrap">
                Faltam {formatNumberPTBR(item.diferenca_minimo_tons, 3)} t
              </span>
            </div>
          </div>

          {/* 2. Parâmetros Industriais e Prazos */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Factory className="w-4 h-4 text-[#004C97]" />
              Parâmetros Industriais e Logísticos
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 border border-slate-200 rounded-xl bg-white">
                <span className="text-slate-500 block text-[11px]">Data Desejada</span>
                <span className="text-xs font-mono font-bold text-slate-800 mt-1 block">
                  {formatarDataPtBr(item.data_desejada)}
                </span>
              </div>

              <div className="p-3 border border-slate-200 rounded-xl bg-white">
                <span className="text-slate-500 block text-[11px]">Tempo Médio de Ciclo</span>
                <span className="text-xs font-mono font-bold text-slate-800 mt-1 block">
                  {item.tempo_ciclo_formatado} ({item.tempo_ciclo_minutos} min)
                </span>
              </div>

              <div className="p-3 border border-slate-200 rounded-xl bg-white">
                <span className="text-slate-500 block text-[11px]">Centro Produtivo</span>
                <span className="text-xs font-mono font-bold text-slate-800 mt-1 block">
                  {item.centro} (CIAFAL)
                </span>
              </div>

              <div className="p-3 border border-slate-200 rounded-xl bg-white">
                <span className="text-slate-500 block text-[11px]">Linha de Laminação</span>
                <span className="text-xs font-mono font-bold text-slate-800 mt-1 block">
                  {item.linha || 'Linha 1 (L1)'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Diagnóstico e Análise Gerada pela IA Integrada */}
          <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/40 text-xs space-y-3">
            <div className="flex items-center gap-2 text-[#004C97] font-bold uppercase tracking-wider text-[11px]">
              <Sparkles className="w-4 h-4" />
              Análise Gerada pela IA (Dados Reais do Registro)
            </div>

            <p className="text-slate-800 leading-relaxed font-medium">
              {item.analise_detalhada_ia || item.observacao_ia}
            </p>

            {item.recomendacoes_ia && item.recomendacoes_ia.length > 0 && (
              <div className="pt-2 border-t border-blue-100 space-y-1.5">
                <span className="font-bold text-slate-800 block text-[11px]">
                  Recomendações e Ações Sugeridas ao Programador:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  {item.recomendacoes_ia.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-blue-100 flex items-center gap-2 text-[10px] text-slate-500">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Regra de Governança: A IA analisa e recomenda com base exclusiva nos dados reais. A
                decisão operacional e a liberação de campanha cabem ao usuário responsável.
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé com Fechamento */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Origem: SAP ECC via FCA • RFC <code>Z_RFC_CARTEIRA_MINIMA_PROD</code>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CarteiraMinimaDetailModal
