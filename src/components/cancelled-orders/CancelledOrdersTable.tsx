/**
 * Tabela de Carteira de Pedidos Cancelados e Recusados
 * PCP Robotizado - CIAFAL
 * Inclui:
 * - Ação "Solicitar revisão" com ícone de encaminhamento (Send)
 * - Identificação visual de "Revisão solicitada" com protocolo, responsável e status CRM
 * - Exibição de "Motivo Original SAP" e "Motivo validado após revisão"
 * - Permite abrir solicitação para consultar histórico (ConsultarRevisaoCrmModal)
 */

import React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Eye,
  Send,
  FileCheck2,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { CancelledOrderRecord } from '@/types/cancelled-orders'
import { formatTons } from '@/lib/formatters-ptbr'
import { Button } from '@/components/ui/button'

interface CancelledOrdersTableProps {
  orders: CancelledOrderRecord[]
  selectedOrderId?: string
  onSelectOrder: (order: CancelledOrderRecord) => void
  onRequestRevision: (order: CancelledOrderRecord) => void
  onViewRevisionHistory: (order: CancelledOrderRecord) => void
}

export const CancelledOrdersTable: React.FC<CancelledOrdersTableProps> = ({
  orders,
  selectedOrderId,
  onSelectOrder,
  onRequestRevision,
  onViewRevisionHistory,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden mb-6">
      {/* Cabeçalho da Tabela com Legenda e Contagem */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Carteira de Pedidos Cancelados e Recusados
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Exibindo {orders.length} pedidos no período selecionado com auditoria inteligente
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-600">
          <span className="inline-flex items-center">
            <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
            Inconsistência IA
          </span>
          <span className="inline-flex items-center ml-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
            Coerente
          </span>
          <span className="inline-flex items-center ml-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
            Revisão CRM
          </span>
        </div>
      </div>

      {/* Container com Rolagem Interna e Cabeçalho Fixo */}
      <div className="overflow-x-auto overflow-y-auto max-h-[620px] border-b border-slate-200">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] sticky top-0 z-10 shadow-xs border-b border-slate-300">
            <tr>
              <th className="py-2.5 px-3 whitespace-nowrap w-[130px]">Ordem/Item</th>
              <th className="py-2.5 px-3 whitespace-nowrap w-[100px]">Data</th>
              <th className="py-2.5 px-3 whitespace-nowrap w-[90px] text-center">Centro</th>
              <th className="py-2.5 px-3 whitespace-nowrap min-w-[190px]">Cliente</th>
              <th className="py-2.5 px-3 whitespace-nowrap min-w-[210px]">Material</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-right w-[110px] bg-rose-50/70 text-rose-900 font-bold">
                Saldo (t)
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap min-w-[200px]">Motivo SAP</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-center w-[160px]">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  Nenhum pedido cancelado corresponde aos critérios e filtros selecionados.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const isSelected = selectedOrderId === o.id
                const hasCrmRevision = Boolean(o.crm_protocolo)

                return (
                  <tr
                    key={o.id}
                    onClick={() => onSelectOrder(o)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* 1. Ordem/Item */}
                    <td className="py-2 px-3 whitespace-nowrap font-mono font-medium text-slate-900">
                      <div className="font-bold text-slate-900">{o.ordem_venda}</div>
                      <div className="text-[10px] text-slate-500">Item: {o.item_ordem}</div>
                    </td>

                    {/* 2. Data */}
                    <td className="py-2 px-3 whitespace-nowrap text-slate-700">{o.data_ordem}</td>

                    {/* 3. Centro */}
                    <td className="py-2 px-3 whitespace-nowrap text-center">
                      <span className="font-bold text-slate-800 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {o.centro}
                      </span>
                      {o.linha && (
                        <div
                          className="text-[10px] text-slate-500 truncate max-w-[90px] mx-auto mt-0.5"
                          title={o.linha}
                        >
                          {o.linha}
                        </div>
                      )}
                    </td>

                    {/* 4. Cliente */}
                    <td className="py-2 px-3 max-w-[200px]">
                      <div className="font-medium text-slate-900 truncate" title={o.cliente_nome}>
                        {o.cliente_nome}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {o.cliente_codigo || 'SEM CÓDIGO'}{' '}
                        {o.curva_abc ? `• Curva ${o.curva_abc}` : ''}
                      </div>
                    </td>

                    {/* 5. Material */}
                    <td className="py-2 px-3 max-w-[220px]">
                      <div
                        className="font-mono text-[#004C97] font-bold truncate"
                        title={o.material_codigo}
                      >
                        {o.material_codigo}
                      </div>
                      <div
                        className="text-[10px] text-slate-600 truncate"
                        title={o.material_descricao}
                      >
                        {o.material_descricao}
                      </div>
                    </td>

                    {/* 6. Saldo (t) */}
                    <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold text-rose-700 bg-rose-50/40">
                      {formatTons(o.saldo_cancelado_t)}
                    </td>

                    {/* 7. Motivo SAP */}
                    <td className="py-2 px-3 max-w-[230px]">
                      <div
                        className="font-semibold text-slate-900 truncate text-[11px]"
                        title={o.motivo_original_sap}
                      >
                        {o.motivo_original_sap}
                      </div>
                      {o.motivo_validado_apos_revisao ? (
                        <div
                          className="text-[10px] text-emerald-700 font-medium truncate mt-0.5"
                          title={`CRM: ${o.motivo_validado_apos_revisao}`}
                        >
                          CRM: {o.motivo_validado_apos_revisao}
                        </div>
                      ) : (
                        <div
                          className="text-[10px] text-slate-400 truncate"
                          title={o.categoria_motivo}
                        >
                          Cat: {o.categoria_motivo}
                        </div>
                      )}
                    </td>

                    {/* 8. Ação */}
                    <td className="py-2 px-3 whitespace-nowrap text-center">
                      {' '}
                      <div className="flex items-center justify-center space-x-1">
                        {/* Ação 1: Analisar/Visualizar */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectOrder(o)
                          }}
                          className="h-7 px-2 text-[#004C97] hover:text-[#003d7a] hover:bg-blue-50"
                          title="Abrir Análise Completa do Cancelamento"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Analisar
                        </Button>

                        {/* Ação 2: Solicitar Revisão OU Exibir Protocolo/Histórico CRM */}
                        {hasCrmRevision ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onViewRevisionHistory(o)
                            }}
                            className="h-7 px-2 text-xs border-blue-300 text-blue-800 bg-blue-50 hover:bg-blue-100"
                            title={`Protocolo ${o.crm_protocolo} - ${o.crm_status || 'Em análise'}. Clique para ver histórico.`}
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1 text-blue-700" />
                            <span className="font-mono text-[10px] font-bold">
                              {o.crm_protocolo?.split('-').slice(1).join('-') || 'Revisão'}
                            </span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onRequestRevision(o)
                            }}
                            className="h-7 px-2 text-xs bg-[#004C97] hover:bg-[#003d7a] text-white font-medium shadow-2xs"
                            title="Solicitar revisão do cancelamento ao CRM 360º"
                          >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            Solicitar revisão
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
