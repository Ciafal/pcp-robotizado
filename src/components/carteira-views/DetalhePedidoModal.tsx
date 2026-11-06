/**
 * Modal de Detalhe e Histórico de Entregas do Pedido SAP
 * Módulo: PCP Robotizado > Análise de Carteira (HUB CIAFAL)
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
import { FileText, Truck, Building2, Calendar, AlertCircle, Package } from 'lucide-react'
import { PedidoCarteiraAnalitico } from '@/types/pcp-pedidos-carteira'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

interface Props {
  pedido: PedidoCarteiraAnalitico | null
  isOpen: boolean
  onClose: () => void
}

export const DetalhePedidoModal: React.FC<Props> = ({ pedido, isOpen, onClose }) => {
  if (!pedido) return null

  const fmtT = (v: number) => `${formatNumberPTBR(v, 2)} t`
  const fmtMoeda = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200">
        <DialogHeader className="p-6 pb-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#004C97] text-white rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                  Pedido SAP {pedido.pedido_sap} — Item {pedido.item_sap}
                  <Badge variant="outline" className="border-slate-500 text-slate-200 text-xs">
                    {pedido.centro} / {pedido.linha}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Detalhes cadastrais, saldo residual e histórico de remessas/faturamentos
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)] text-sm">
          {/* Dados do Cliente e Material */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-[#004C97]" />
                Dados Comerciais
              </div>
              <div>
                <div className="text-xs text-slate-500">Cliente</div>
                <div className="font-semibold text-slate-900 text-sm">{pedido.nome_cliente}</div>
                <div className="text-xs text-slate-500 font-mono">
                  Código SAP: {pedido.codigo_cliente}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-xs">
                <div>
                  <span className="text-slate-500">Data Pedido: </span>
                  <span className="font-medium text-slate-800">{pedido.data_pedido}</span>
                </div>
                <div>
                  <span className="text-slate-500">Data Prevista: </span>
                  <span className="font-medium text-slate-800">{pedido.data_prevista}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Package className="w-4 h-4 text-[#004C97]" />
                Especificações Técnicas
              </div>
              <div>
                <div className="text-xs text-slate-500">Material</div>
                <div className="font-semibold text-slate-900 text-sm font-mono text-[#004C97]">
                  {pedido.codigo_material}
                </div>
                <div className="text-xs text-slate-700">{pedido.descricao_material}</div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-xs">
                <div>
                  <span className="text-slate-500">Família: </span>
                  <span className="font-medium text-slate-800">{pedido.familia}</span>
                </div>
                <div>
                  <span className="text-slate-500">Bitola: </span>
                  <span className="font-medium text-slate-800">{pedido.bitola}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Composição das Quantidades */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
            <h4 className="font-semibold text-slate-900 text-xs flex items-center justify-between">
              <span>Balanço Quantitativo do Item</span>
              {pedido.eh_saldo_residual && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[11px]">
                  Classificado como Saldo Residual
                </Badge>
              )}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Qtd Original</span>
                <span className="text-base font-bold text-slate-900">
                  {fmtT(pedido.qtd_original_t)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {fmtMoeda(pedido.valor_original_brl || 0)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-[11px] text-emerald-700 block">Qtd Já Faturada</span>
                <span className="text-base font-bold text-emerald-800">
                  {fmtT(pedido.qtd_entregue_t)}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  {pedido.qtd_original_t > 0
                    ? `${formatNumberPTBR((pedido.qtd_entregue_t / pedido.qtd_original_t) * 100, 1)}% faturado`
                    : '0%'}
                </span>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-[11px] text-[#004C97] block">Saldo em Aberto</span>
                <span className="text-base font-bold text-[#004C97]">
                  {fmtT(pedido.saldo_aberto_t)}
                </span>
                <span className="text-[10px] text-blue-600 block mt-0.5">
                  {formatNumberPTBR(pedido.percentual_residual, 2)}% residual
                </span>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <span className="text-[11px] text-purple-700 block">Valor Financeiro</span>
                <span className="text-base font-bold text-purple-900">
                  {fmtMoeda(pedido.valor_saldo_brl)}
                </span>
                <span className="text-[10px] text-purple-600 block mt-0.5">
                  Preço: {fmtMoeda(pedido.preco_unitario_brl || 0)}/t
                </span>
              </div>
            </div>
          </div>

          {/* Histórico de Entregas / Remessas */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#004C97]" />
              Histórico de Faturamentos e Remessas (SAP RFC)
            </h4>
            {!pedido.historico_entregas || pedido.historico_entregas.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                Nenhum faturamento registrado até o momento para este item. Quantidade integral em
                aberto.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Remessa / Documento</th>
                      <th className="py-2.5 px-3">Data Remessa</th>
                      <th className="py-2.5 px-3">Nota Fiscal</th>
                      <th className="py-2.5 px-3 text-right">Qtd Faturada (t)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pedido.historico_entregas.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono text-[#004C97] font-semibold">
                          {h.numero_remessa || '-'}
                        </td>
                        <td className="py-2 px-3">{h.data_remessa}</td>
                        <td className="py-2 px-3 font-mono">{h.nota_fiscal || '-'}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {fmtT(h.quantidade_t)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CRM Status se houver */}
          {pedido.status_crm && (
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <span className="text-slate-700">
                  Protocolo no CRM 360°:{' '}
                  <strong className="text-slate-900 font-mono">{pedido.protocolo_crm}</strong>
                </span>
              </div>
              <Badge className="bg-blue-600 text-white">Status: {pedido.status_crm}</Badge>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs px-5 font-semibold"
          >
            Fechar Detalhes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
