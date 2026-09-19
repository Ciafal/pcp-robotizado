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
import { Calculator, CheckCircle2, ShieldCheck, Database, Calendar, FileText } from 'lucide-react'
import { CarteiraItem } from '@/types/carteira-analise'
import { CoberturaTemporalEngine } from '@/services/cobertura-temporal-engine'
import CoverageTemporalAnalysis from './CoverageTemporalAnalysis'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

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
      <DialogContent className="modal-analitico flex flex-col p-0 overflow-hidden bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl [&>button:last-child]:hidden w-[min(96vw,1800px)] max-w-[min(96vw,1800px)] h-[94vh] max-h-[94vh]">
        {/* CABEÇALHO FIXO INSTITUCIONAL */}
        <header className="flex-none px-6 py-4 bg-gradient-to-r from-[#003870] via-[#004C97] to-[#0A2540] text-white border-b border-blue-900/60 shadow-xs relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-xl border border-white/15">
              <FileText className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <DialogTitle className="modal-analitico-title font-bold tracking-tight text-white m-0">
                Memória de Cálculo Auditável
              </DialogTitle>
              <DialogDescription className="modal-analitico-text text-blue-100/90 mt-0.5 m-0 font-normal">
                Material {item.codigo_material} &bull; {item.descricao_material}
              </DialogDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar modal"
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl text-white/90 hover:text-white hover:bg-white/15 active:bg-white/25 shrink-0 transition-colors"
          >
            ✕
          </Button>
        </header>

        {/* CORPO ROLÁVEL COM ÚNICO SCROLL VERTICAL */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 bg-slate-50/40 space-y-4">
          {/* Camada complementar: Cobertura Temporal & Previsão */}
          <div className="pt-1">
            <CoverageTemporalAnalysis analise={resultadoTemporal} />
          </div>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Material
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {item.codigo_material}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Linha</span>
                <span className="font-bold text-[#004C97] text-sm">{item.linha || 'GERAL'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Tipo / Curva
                </span>
                <span className="font-bold text-slate-700 text-sm">
                  {item.tipo_ordem} &bull; Curva {item.curva_abc}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Origem</span>
                <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                  {item.origem_produto}
                </Badge>
              </div>
            </div>

            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 shadow-xs">
              <span className="text-xs font-bold text-[#004C97] block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#004C97]" /> Fórmula Oficial do Motor
              </span>
              <p className="font-mono text-xs text-slate-800 bg-white p-3 rounded-lg border border-blue-100 leading-relaxed">
                {memoria?.formula_aplicada ||
                  'Regra Padrão ZSD28C: Saldo = Disponibilidade Elegível - Carteira Aberta'}
              </p>
            </div>

            {memoria?.explicacao_passo_a_passo && (
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                <span className="font-bold text-slate-800 block text-xs">
                  Passo a Passo da Apuração:
                </span>
                <div className="space-y-1.5">
                  {memoria.explicacao_passo_a_passo.map((passo, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-700 font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{passo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Qtd Ordem:</span>
                <strong className="font-sans text-slate-800 text-sm">
                  {formatNumberPTBR(item.qtd_ordem_tons, 2)} t
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Qtd Faturada:</span>
                <strong className="font-sans text-slate-800 text-sm">
                  {formatNumberPTBR(item.qtd_faturada_tons, 2)} t
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">
                  Carteira Aberta:
                </span>
                <strong className="font-sans text-[#004C97] text-sm">
                  {formatNumberPTBR(item.carteira_aberta_tons, 2)} t
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Estoque Livre:</span>
                <strong className="font-sans text-slate-800 text-sm">
                  {formatNumberPTBR(item.estoque_livre_tons, 2)} t
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Estoque MTO:</span>
                <strong className="font-sans text-blue-900 text-sm">
                  {formatNumberPTBR(item.estoque_mto_tons, 2)} t
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Semiacabado:</span>
                <strong className="font-sans text-slate-800 text-sm">
                  {formatNumberPTBR(item.estoque_semiacabado_tons, 2)} t
                </strong>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-emerald-700 font-bold block">
                  Saldo Positivo:
                </span>
                <strong className="font-sans text-emerald-700 text-base">
                  +{formatNumberPTBR(item.saldo_positivo_tons, 2)} t
                </strong>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-rose-700 font-bold block">Saldo Negativo:</span>
                <strong className="font-sans text-rose-700 text-base">
                  {formatNumberPTBR(item.saldo_negativo_tons, 2)} t
                </strong>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-amber-700 font-bold block">
                  Necessidade Líquida:
                </span>
                <strong className="font-sans text-amber-900 text-base">
                  {formatNumberPTBR(item.necessidade_liquida_tons, 2)} t
                </strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs text-[11px] text-slate-600">
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
              <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-bold">
                {memoria?.regra_versao || 'Regra v1.4-ZSD28C'}
              </Badge>
            </div>
          </div>
        </main>

        {/* RODAPÉ COMPACTO */}
        <footer className="flex-none px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Módulo PCP Robotizado &bull; Memória Auditável
          </span>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold px-6 shadow-xs"
          >
            Fechar Memória
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
export default MemoriaCalculoModal
