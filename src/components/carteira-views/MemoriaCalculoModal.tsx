import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calculator, CheckCircle2, ShieldCheck, Database, Calendar, FileText } from 'lucide-react'
import { CarteiraItem } from '@/types/carteira-analise'
import { CoberturaTemporalEngine } from '@/services/cobertura-temporal-engine'
import CoverageTemporalAnalysis from './CoverageTemporalAnalysis'

interface MemoriaCalculoModalProps {
  isOpen: boolean
  onClose: () => void
  item: CarteiraItem | null
}

export const MemoriaCalculoModal: React.FC<MemoriaCalculoModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  if (!item) return null

  const memoria = item.memoria_calculo

  // Gera a análise temporal pelo motor central
  const inputAnalise = CoberturaTemporalEngine.converterCarteiraItemParaInput(
    item,
    item.linha === 'L1'
      ? 'L1'
      : item.linha === 'L2'
        ? 'L2'
        : item.tipo_ordem === 'ZPRM'
          ? 'MTO'
          : 'GERAL',
  )
  const resultadoTemporal = CoberturaTemporalEngine.calcular(inputAnalise)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="modal-analitico w-[min(96vw,1800px)] max-w-[min(96vw,1800px)] h-[94vh] max-h-[94vh] 2xl:h-[min(94vh,1100px)] 2xl:max-h-[min(94vh,1100px)] overflow-y-auto bg-white border-slate-200 text-slate-900 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#004C97] text-white rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Memória de Cálculo Auditável
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Material {item.codigo_material} &bull; {item.descricao_material}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Camada complementar: Cobertura Temporal & Previsão */}
        <div className="pt-1">
          <CoverageTemporalAnalysis analise={resultadoTemporal} />
        </div>

        <div className="space-y-4 py-2 text-xs">
          {' '}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Material</span>
              <span className="font-mono font-bold text-slate-900">{item.codigo_material}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Linha</span>
              <span className="font-bold text-[#004C97]">{item.linha || 'GERAL'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Tipo / Curva
              </span>
              <span className="font-bold text-slate-700">
                {item.tipo_ordem} &bull; Curva {item.curva_abc}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Origem</span>
              <Badge className="bg-slate-200 text-slate-800 text-[10px]">
                {item.origem_produto}
              </Badge>
            </div>
          </div>
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-[#004C97] block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#004C97]" /> Fórmula Oficial do Motor
            </span>
            <p className="font-mono text-xs text-slate-800 bg-white p-2 rounded border border-blue-100">
              {memoria?.formula_aplicada ||
                'Regra Padrão ZSD28C: Saldo = Disponibilidade Elegível - Carteira Aberta'}
            </p>
          </div>
          {memoria?.explicacao_passo_a_passo && (
            <div className="space-y-2">
              <span className="font-bold text-slate-800 block text-xs">
                Passo a Passo da Apuração:
              </span>
              <div className="space-y-1.5">
                {memoria.explicacao_passo_a_passo.map((passo, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-700 font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{passo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 font-medium block">Qtd Ordem:</span>
              <strong className="font-mono text-slate-800">
                {item.qtd_ordem_tons.toFixed(2)} t
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-medium block">Qtd Faturada:</span>
              <strong className="font-mono text-slate-800">
                {item.qtd_faturada_tons.toFixed(2)} t
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-medium block">Carteira Aberta:</span>
              <strong className="font-mono text-blue-900">
                {item.carteira_aberta_tons.toFixed(2)} t
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-medium block">Estoque Livre:</span>
              <strong className="font-mono text-slate-800">
                {item.estoque_livre_tons.toFixed(2)} t
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-medium block">Estoque MTO:</span>
              <strong className="font-mono text-purple-800">
                {item.estoque_mto_tons.toFixed(2)} t
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-medium block">Semiacabado:</span>
              <strong className="font-mono text-slate-800">
                {item.estoque_semiacabado_tons.toFixed(2)} t
              </strong>
            </div>
            <div className="pt-1 border-t border-slate-200">
              <span className="text-[10px] text-emerald-700 font-bold block">Saldo Positivo:</span>
              <strong className="font-mono text-emerald-700 text-sm">
                +{item.saldo_positivo_tons.toFixed(2)} t
              </strong>
            </div>
            <div className="pt-1 border-t border-slate-200">
              <span className="text-[10px] text-rose-700 font-bold block">Saldo Negativo:</span>
              <strong className="font-mono text-rose-700 text-sm">
                {item.saldo_negativo_tons.toFixed(2)} t
              </strong>
            </div>
            <div className="pt-1 border-t border-slate-200">
              <span className="text-[10px] text-amber-700 font-bold block">
                Necessidade Líquida:
              </span>
              <strong className="font-mono text-amber-900 text-sm">
                {item.necessidade_liquida_tons.toFixed(2)} t
              </strong>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-lg text-[11px] text-slate-600">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              Fonte: <strong>{memoria?.fonte_dado || 'Excel QAS / ZSD28C'}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Apuração:{' '}
              {memoria?.data_hora_apuracao
                ? new Date(memoria.data_hora_apuracao).toLocaleString('pt-BR')
                : 'Tempo Real'}
            </span>
            <Badge className="bg-slate-200 text-slate-700 text-[10px]">
              {memoria?.regra_versao || 'Regra v1.4-ZSD28C'}
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
          >
            Fechar Memória
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default MemoriaCalculoModal
