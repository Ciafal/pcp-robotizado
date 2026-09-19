import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Layers, ExternalLink } from 'lucide-react'
import type { ProductionOrder } from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR } from '@/lib/formatters-ptbr'

interface ProductionIndicatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  indicatorValue?: string | number
  orders: ProductionOrder[]
  onSelectOrder?: (order: ProductionOrder) => void
}

export const ProductionIndicatorModal: React.FC<ProductionIndicatorModalProps> = ({
  open,
  onOpenChange,
  title,
  subtitle,
  indicatorValue,
  orders,
  onSelectOrder,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="flex flex-row items-start justify-between border-b pb-4 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                {title}
              </DialogTitle>
              {indicatorValue !== undefined && (
                <Badge className="bg-blue-600 text-white font-mono text-xs px-2.5 py-0.5">
                  Valor: {indicatorValue}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-slate-600 mt-1">
              {subtitle ||
                'Detalhamento analítico dos registros industriais que compõem este indicador.'}
            </DialogDescription>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total de Ordens</span>
            <p className="text-lg font-bold text-blue-900 font-mono">{orders.length} OPs</p>
          </div>
        </DialogHeader>

        {/* Corpo com Tabela Ampla e Responsiva */}
        <div className="flex-1 overflow-auto my-3 border rounded-lg">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 sticky top-0 z-10 font-semibold border-b">
              <tr>
                <th className="py-2.5 px-3">OP</th>
                <th className="py-2.5 px-3">Centro</th>
                <th className="py-2.5 px-3">Linha</th>
                <th className="py-2.5 px-3">Material & Descrição</th>
                <th className="py-2.5 px-3 text-right">Prog. (t)</th>
                <th className="py-2.5 px-3 text-right">Prod. MES (t)</th>
                <th className="py-2.5 px-3 text-right">Apont. (t)</th>
                <th className="py-2.5 px-3 text-right">SAP (t)</th>
                <th className="py-2.5 px-3 text-right">Saldo (t)</th>
                <th className="py-2.5 px-3 text-center">Rendimento</th>
                <th className="py-2.5 px-3 text-center">Status OP</th>
                <th className="py-2.5 px-3 text-center">Status SAP</th>
                <th className="py-2.5 px-3 text-center">Fechamento</th>
                <th className="py-2.5 px-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-500">
                    Nenhum registro encontrado para o filtro deste indicador no momento.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-blue-900 font-mono">
                      {o.op_number}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{o.centro_code}</td>
                    <td className="py-2.5 px-3 text-slate-700">{o.linha_code}</td>
                    <td className="py-2.5 px-3 max-w-[280px]">
                      <div
                        className="font-medium text-slate-900 truncate"
                        title={o.material_description}
                      >
                        {o.material_description}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{o.material_code}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">
                      {formatQuantity(o.quantity_planned_tons, 't')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                      {formatQuantity(o.quantity_produced_tons, 't')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {formatQuantity(o.quantity_posted_tons, 't')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-blue-800">
                      {formatQuantity(o.quantity_sap_tons, 't')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span
                        className={
                          o.balance_tons > 0
                            ? 'text-amber-700'
                            : o.balance_tons < 0
                              ? 'text-blue-700'
                              : 'text-slate-600'
                        }
                      >
                        {formatQuantity(o.balance_tons, 't')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      <span
                        className={`font-semibold ${
                          o.yield_realized_pct < o.yield_planned_pct
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {formatPercentagePTBR(o.yield_realized_pct)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        meta: {formatPercentagePTBR(o.yield_planned_pct)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {o.status_op}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          o.status_sap === 'ERRO_INTEGRACAO' || o.status_sap === 'REJEITADA_SAP'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {o.status_sap}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          o.status_fechamento === 'FECHADA'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : o.status_fechamento === 'APTA'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {o.status_fechamento}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {onSelectOrder && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onSelectOrder(o)
                            onOpenChange(false)
                          }}
                          className="h-7 text-xs text-blue-700 hover:text-blue-900"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Detalhar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-xs text-slate-500">
            Formato numérico pt-BR (vírgula decimal; <strong>t</strong> = toneladas).
          </span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar Janela
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
