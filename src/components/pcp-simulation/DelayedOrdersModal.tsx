import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DeliveryImpactItem } from '@/types/pcp-commercial-simulation'
import { formatNumberPtBr } from '@/lib/number-format'
import { AlertTriangle, Clock } from 'lucide-react'

interface DelayedOrdersModalProps {
  isOpen: boolean
  onClose: () => void
  delayedOrders: DeliveryImpactItem[]
  totalDelayedTonnage: number
  aiExplanation?: string
}

export const DelayedOrdersModal: React.FC<DelayedOrdersModalProps> = ({
  isOpen,
  onClose,
  delayedOrders,
  totalDelayedTonnage,
  aiExplanation,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Pedidos Potencialmente Atrasados na Carteira
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Detalhamento analítico dos pedidos que ultrapassariam a data comprometida com os
                clientes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo da IA no topo do Modal */}
        <div className="my-4 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-sm leading-relaxed flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Diagnóstico do Motor de IA CIAFAL:</span>
            A inclusão desta demanda provocaria atraso potencial em{' '}
            <strong className="underline">{delayedOrders.length} pedido(s)</strong>, totalizando{' '}
            <strong className="underline">
              {formatNumberPtBr(totalDelayedTonnage, 1)} toneladas
            </strong>{' '}
            em carteira.
            {aiExplanation && (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{aiExplanation}</p>
            )}
          </div>
        </div>

        {/* Tabela de Pedidos Atrasados */}
        <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
              <TableRow>
                <TableHead className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                  Pedido SAP / OP
                </TableHead>
                <TableHead className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                  Cliente
                </TableHead>
                <TableHead className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                  Produto
                </TableHead>
                <TableHead className="font-semibold text-xs text-slate-700 dark:text-slate-300 text-right">
                  Quantidade
                </TableHead>
                <TableHead className="font-semibold text-xs text-slate-700 dark:text-slate-300 text-center">
                  Data Prometida
                </TableHead>
                <TableHead className="font-semibold text-xs text-slate-700 dark:text-slate-300 text-center">
                  Data Simulada
                </TableHead>
                <TableHead className="font-semibold text-xs text-slate-700 dark:text-slate-300 text-center">
                  Atraso Estimado
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delayedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhum pedido da carteira foi classificado com risco de atraso na simulação.
                  </TableCell>
                </TableRow>
              ) : (
                delayedOrders.map((ord, idx) => (
                  <TableRow
                    key={idx}
                    className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors"
                  >
                    <TableCell className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                      <div>{ord.sales_order}</div>
                      <div className="text-[11px] text-slate-400">{ord.production_order}</div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {ord.customer_name}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                      <div className="font-mono font-medium">{ord.product_code}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">
                        {ord.product_description}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-semibold text-slate-800 dark:text-slate-200">
                      {formatNumberPtBr(ord.quantity_tons, 1)} t
                    </TableCell>
                    <TableCell className="text-xs text-center text-slate-600 dark:text-slate-400">
                      {ord.current_promised_date}
                    </TableCell>
                    <TableCell className="text-xs text-center font-medium text-amber-700 dark:text-amber-400">
                      {ord.simulated_delivery_date}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 text-xs font-semibold px-2 py-0.5"
                      >
                        +{ord.difference_days} {ord.difference_days === 1 ? 'dia' : 'dias'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <span>
            * Simulação baseada no sequenciamento vigente e produtividade nominal dos centros.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium text-xs transition"
          >
            Fechar Detalhamento
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
