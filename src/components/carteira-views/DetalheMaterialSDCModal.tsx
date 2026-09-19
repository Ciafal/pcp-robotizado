import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Briefcase,
  Layers,
  Calendar,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react'
import { CarteiraSDCItem } from '@/types/carteira-sdc'

interface DetalheMaterialSDCModalProps {
  isOpen: boolean
  onClose: () => void
  item: CarteiraSDCItem | null
}

export const DetalheMaterialSDCModal: React.FC<DetalheMaterialSDCModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  if (!item) return null

  const isDeficit = item.saldo_t < 0
  const isProjPositivo = item.saldo_projetado_t >= 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="modal-analitico w-[min(96vw,1800px)] max-w-[min(96vw,1800px)] h-[94vh] max-h-[94vh] 2xl:h-[min(94vh,1100px)] 2xl:max-h-[min(94vh,1100px)] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black text-[#004C97] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {item.material}
              </span>
              <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
                WERKS = SDPL (Sidercentro)
              </Badge>
              {item.curva_abc && (
                <Badge
                  variant="outline"
                  className="border-slate-300 text-slate-700 text-[10px] font-bold"
                >
                  Curva {item.curva_abc}
                </Badge>
              )}
            </div>

            <Badge
              className={`text-[11px] font-bold ${
                item.status === 'COBERTO'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : item.status === 'COBERTURA PROGRAMADA'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : item.status === 'EM PRODUÇÃO'
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                      : item.status === 'COBERTURA PARCIAL'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : item.status === 'CRÍTICO' || item.status === 'SEM ESTOQUE'
                          ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              {item.status}
            </Badge>
          </div>

          <DialogTitle className="text-base font-bold text-slate-900 mt-2">
            {item.descricao}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Família: <strong>{item.familia}</strong> &bull; Bitola: <strong>{item.bitola}</strong>{' '}
            &bull; Aço: <strong>{item.qualidade_aco}</strong> &bull; Origem Produtiva:{' '}
            <strong>{item.origem_producao}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Alertas Ativos */}
        {item.alertas_lista && item.alertas_lista.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Alertas Ativos de PCP & Cobertura:
            </div>
            {item.alertas_lista.map((msg, idx) => (
              <p key={idx} className="text-xs text-amber-800 pl-5">
                &bull; {msg}
              </p>
            ))}
          </div>
        )}

        {/* 5 Blocos Exigidos no Detalhamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* 1. CARTEIRA */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#004C97]" /> 1. Carteira de Pedidos
              </span>
              <span className="text-sm font-mono font-bold text-[#004C97]">
                {item.carteira_t.toFixed(2)} t
              </span>
            </div>

            {item.pedidos_compoem && item.pedidos_compoem.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {item.pedidos_compoem.map((ped, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <span>{ped.ordem_venda}</span>
                        <span className="text-slate-400">/ {ped.item_ordem}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                        Cliente: {ped.cliente}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900">
                        {ped.quantidade_t.toFixed(2)} t
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Desejada: {ped.data_desejada}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2">
                Nenhum pedido aberto detalhado para este material no momento.
              </div>
            )}
          </div>

          {/* 2. ESTOQUE */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" /> 2. Estoque no Centro SDPL
              </span>
              <span className="text-sm font-mono font-bold text-emerald-700">
                {item.estoque_total_t.toFixed(2)} t
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Disponível</span>
                <strong className="text-xs font-mono text-emerald-700">
                  {(item.estoque_disponivel_t ?? item.estoque_total_t).toFixed(2)} t
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Bloqueado / Qualidade</span>
                <strong
                  className={`text-xs font-mono ${
                    (item.estoque_bloqueado_t || 0) > 0
                      ? 'text-rose-600 font-bold'
                      : 'text-slate-700'
                  }`}
                >
                  {(item.estoque_bloqueado_t || 0).toFixed(2)} t
                </strong>
              </div>
            </div>

            {(item.estoque_bloqueado_t || 0) > 0 && (
              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Existe lote bloqueado que não pode ser utilizado para expedição imediata.
              </div>
            )}
          </div>

          {/* 3. PROGRAMAÇÃO */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" /> 3. Programação Existente
              </span>
              <span className="text-sm font-mono font-bold text-blue-700">
                {item.programado_t.toFixed(2)} t
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Centro Produtivo:</span>
                <strong className="text-slate-800">
                  {item.programacao_detalhe?.centro_produtivo ||
                    (item.origem_producao === 'CIAFAL' ? 'CFPL (CIAFAL)' : 'SDPL (Sidercentro)')}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Linha / Destino:</span>
                <strong className="text-slate-800">
                  {item.programacao_detalhe?.linha ||
                    (item.origem_producao === 'CIAFAL' ? 'Linha L2' : 'L-SDC Industrializador')}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data Prevista:</span>
                <strong className="text-slate-800 font-mono">
                  {item.data_prevista || 'Não informada'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Situação:</span>
                <Badge variant="outline" className="text-[10px]">
                  {item.situacao_producao}
                </Badge>
              </div>
            </div>
          </div>

          {/* 4. INDUSTRIALIZAÇÃO SDC */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-600" /> 4. Industrialização SDC
              </span>
              <span className="text-sm font-mono font-bold text-purple-700">
                {(item.em_producao_t + item.programado_t).toFixed(2)} t
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Destinada</span>
                <strong className="font-mono text-slate-800">
                  {(item.industrializacao_sdc?.destinada_t ?? item.programado_t).toFixed(2)} t
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Em Processo</span>
                <strong className="font-mono text-indigo-700">
                  {(item.industrializacao_sdc?.em_processo_t ?? item.em_producao_t).toFixed(2)} t
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Concluída</span>
                <strong className="font-mono text-emerald-700">
                  {(item.industrializacao_sdc?.concluida_t ?? item.estoque_total_t).toFixed(2)} t
                </strong>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-1 flex justify-between">
              <span>Previsão de Retorno:</span>
              <span className="font-mono font-bold text-slate-700">
                {item.industrializacao_sdc?.previsao_retorno || item.data_prevista || 'A programar'}
              </span>
            </div>
          </div>
        </div>

        {/* 5. COBERTURA & BALANÇO OFICIAL */}
        <div className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#004C97]" /> 5. Balanço & Cobertura Auditável
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              Unidade: Toneladas (t)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Saldo Atual */}
            <div
              className={`p-3 rounded-lg border ${
                isDeficit ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Saldo Atual (Estoque − Carteira)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong
                  className={`text-lg font-mono font-black ${
                    isDeficit ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {item.saldo_t > 0 ? `+${item.saldo_t.toFixed(2)}` : item.saldo_t.toFixed(2)}
                </strong>
                <span className="text-xs font-semibold text-slate-500">t</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isDeficit
                  ? `Déficit imediato de ${Math.abs(item.saldo_t).toFixed(2)} t`
                  : 'Atendimento coberto com estoque atual'}
              </span>
            </div>

            {/* Saldo Projetado */}
            <div
              className={`p-3 rounded-lg border ${
                isProjPositivo ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Saldo Projetado (Estoque + Prog − Cart)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong
                  className={`text-lg font-mono font-black ${
                    isProjPositivo ? 'text-[#004C97]' : 'text-amber-800'
                  }`}
                >
                  {item.saldo_projetado_t > 0
                    ? `+${item.saldo_projetado_t.toFixed(2)}`
                    : item.saldo_projetado_t.toFixed(2)}
                </strong>
                <span className="text-xs font-semibold text-slate-500">t</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isProjPositivo
                  ? 'Cobertura projetada suficiente'
                  : `Déficit residual de ${Math.abs(item.saldo_projetado_t).toFixed(2)} t`}
              </span>
            </div>

            {/* Cobertura Atual */}
            <div className="p-3 rounded-lg border bg-slate-50 border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Cobertura Atual (%)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong className="text-lg font-mono font-black text-slate-800">
                  {item.cobertura_pct.toFixed(1)}%
                </strong>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {item.cobertura_pct >= 100
                  ? '100% dos pedidos cobertos'
                  : `Faltam ${(100 - item.cobertura_pct).toFixed(1)}% para cobertura física`}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 bg-slate-100/80 p-2.5 rounded font-mono">
            <strong>Memória de Cálculo:</strong> Saldo ({item.estoque_total_t.toFixed(2)} -{' '}
            {item.carteira_t.toFixed(2)} = {item.saldo_t.toFixed(2)} t) &bull; Saldo Projetado (
            {item.estoque_total_t.toFixed(2)} +{' '}
            {(item.programado_t + item.em_producao_t).toFixed(2)} - {item.carteira_t.toFixed(2)} ={' '}
            {item.saldo_projetado_t.toFixed(2)} t)
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default DetalheMaterialSDCModal
