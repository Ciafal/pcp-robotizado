import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Badge } from '../ui/badge'
import { GanttComparisonItem } from '../../types/pcp-commercial-simulation'
import { formatNumberPtBr } from '../../lib/number-format'
import { Calendar, AlertCircle, ArrowRight } from 'lucide-react'

interface GanttComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  items: GanttComparisonItem[]
  productCode: string
  customerName: string
}

export const GanttComparisonModal: React.FC<GanttComparisonModalProps> = ({
  isOpen,
  onClose,
  items,
  productCode,
  customerName,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Visualização Gantt Comparativa — Vigente × Simulada
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Comparação visual direta entre a programação vigente oficial e o cenário simulado
                com o novo pedido.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Alerta de Modo Cenário */}
        <div className="my-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <span className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            SIMULAÇÃO — NÃO ALTERA O GANTT OU A PROGRAMAÇÃO VIGENTE OFICIAL
          </span>
          <span className="text-[11px] text-amber-700 dark:text-amber-400">
            Ambiente de cenário estrito
          </span>
        </div>

        {/* Legenda do Gantt */}
        <div className="flex flex-wrap items-center gap-4 text-xs py-2 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-slate-400"></div>
            <span className="text-slate-600 dark:text-slate-300">Ordem Vigente (inalterada)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-blue-600"></div>
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              Novo Pedido Comercial Simulado
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-amber-500"></div>
            <span className="text-amber-700 dark:text-amber-400">Ordem Deslocada na Linha</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-rose-500"></div>
            <span className="font-semibold text-rose-700 dark:text-rose-400">
              Atraso Potencial de Pedido
            </span>
          </div>
        </div>

        {/* Visualização de Barras Comparativas */}
        <div className="flex-1 overflow-auto space-y-6 py-4">
          {/* Faixa 1: Programação Vigente */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Programação Vigente Oficial (Sequência Real Atual)
              </span>
              <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-800">
                Linha 1 — Semana Vigente
              </Badge>
            </div>
            <div className="space-y-2">
              {items
                .filter((it) => it.item_type === 'CURRENT')
                .map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between hover:shadow-sm transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-8 bg-slate-400 rounded-full shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>{it.order_code}</span>
                          <span className="font-normal text-slate-500">• {it.customer_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {it.material_code} — {formatNumberPtBr(it.quantity_tons, 1)} t
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {it.start_datetime}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex items-center justify-center text-slate-400">
            <ArrowRight className="w-5 h-5 rotate-90" />
          </div>

          {/* Faixa 2: Cenário Simulado */}
          <div className="border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 bg-blue-50/20 dark:bg-blue-950/20">
            <div className="flex items-center justify-between mb-3 border-b pb-2 border-blue-200 dark:border-blue-900/40">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                2. Cenário Simulado com Demanda Comercial Inserida
              </span>
              <Badge className="text-[10px] bg-blue-600 text-white">Cenário Virtual Ativo</Badge>
            </div>

            <div className="space-y-2">
              {/* Card Destacado do Pedido Simulado */}
              <div className="p-3 bg-blue-600 text-white rounded-lg flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-8 bg-white rounded-full shrink-0" />
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2">
                      <Badge className="bg-white text-blue-700 text-[10px] font-bold">NOVO</Badge>
                      <span>{customerName}</span>
                      <span className="opacity-90 font-mono">({productCode})</span>
                    </div>
                    <div className="text-[11px] opacity-90">
                      Demanda Comercial Simulada —{' '}
                      {formatNumberPtBr(items.find((i) => i.is_new_order)?.quantity_tons || 25, 1)}{' '}
                      t
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs font-bold">
                  {items.find((i) => i.is_new_order)?.start_datetime}
                </div>
              </div>

              {/* Itens Deslocados */}
              {items
                .filter((it) => it.is_displaced)
                .map((it, idx) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-lg flex items-center justify-between transition ${
                      it.is_delayed
                        ? 'bg-rose-50/70 border-rose-300 dark:bg-rose-950/20 dark:border-rose-800'
                        : 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-8 rounded-full shrink-0 ${
                          it.is_delayed ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>{it.order_code}</span>
                          <span className="font-normal text-slate-500">• {it.customer_name}</span>
                          {it.is_delayed ? (
                            <Badge className="bg-rose-600 text-white text-[10px]">
                              Atraso Gerado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-400 text-amber-700 text-[10px]"
                            >
                              Deslocada
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {it.material_code} — {formatNumberPtBr(it.quantity_tons, 1)} t
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                      Nova data: {it.start_datetime}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium text-xs transition"
          >
            Fechar Visualização Gantt
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
