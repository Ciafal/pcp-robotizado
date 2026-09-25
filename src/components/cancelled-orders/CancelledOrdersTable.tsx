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
import { formatTons, formatCurrencyPtBr } from '@/lib/formatters-ptbr'
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
              <th className="py-2.5 px-3 whitespace-nowrap">Ordem / Item</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Data Ordem</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Centro / Linha</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Cliente</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Material</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-right">Qtd. OV (t)</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-right">Faturado (t)</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-right bg-rose-50/70 text-rose-900 font-bold">
                Saldo Canc. (t)
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap text-right">Estoque Data</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-right">Preço Líq.</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-right font-bold">Valor Canc.</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Prazo / Fatur.</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Data Desejada</th>
              <th className="py-2.5 px-3 whitespace-nowrap min-w-[180px]">Motivo SAP / Revisado</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Categoria</th>
              <th className="py-2.5 px-3 whitespace-nowrap min-w-[210px]">Análise IA</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Status Análise</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[170px]">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={18} className="py-12 text-center text-slate-500">
                  Nenhum pedido cancelado corresponde aos critérios e filtros selecionados.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const isInconsistent = o.has_ai_inconsistency
                const isInsufficient = o.ai_confidence_level === 'Dados insuficientes'
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
                    {/* Ordem / Item */}
                    <td className="py-2 px-3 whitespace-nowrap font-mono font-medium text-slate-900">
                      <div className="font-bold text-slate-900">{o.ordem_venda}</div>
                      <div className="text-[10px] text-slate-500">Item: {o.item_ordem}</div>
                    </td>

                    {/* Data Ordem */}
                    <td className="py-2 px-3 whitespace-nowrap text-slate-700">{o.data_ordem}</td>

                    {/* Centro / Linha */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{o.centro}</span>
                      <div
                        className="text-[10px] text-slate-500 truncate max-w-[120px]"
                        title={o.linha}
                      >
                        {o.linha}
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="py-2 px-3 whitespace-nowrap max-w-[180px]">
                      <div className="font-medium text-slate-900 truncate" title={o.cliente_nome}>
                        {o.cliente_nome}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {o.cliente_codigo || 'SEM CÓDIGO'} •{' '}
                        {o.curva_abc ? `Curva ${o.curva_abc}` : ''}
                      </div>
                    </td>

                    {/* Material */}
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

                    {/* Qtd OV (t) */}
                    <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-slate-700">
                      {formatTons(o.quantidade_original_ov_t)}
                    </td>

                    {/* Faturado (t) */}
                    <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-slate-500">
                      {formatTons(o.quantidade_faturada_t)}
                    </td>

                    {/* Saldo Cancelado (t) */}
                    <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold text-rose-700 bg-rose-50/40">
                      {formatTons(o.saldo_cancelado_t)}
                    </td>

                    {/* Estoque na Data */}
                    <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-slate-700">
                      {o.estoque_disponivel_data_t !== null ? (
                        <span>{formatTons(o.estoque_disponivel_data_t)}</span>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Sem snapshot</span>
                      )}
                    </td>

                    {/* Preço Líquido */}
                    <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-slate-600">
                      {formatCurrencyPtBr(o.preco_liquido)}
                    </td>

                    {/* Valor Cancelado */}
                    <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                      {formatCurrencyPtBr(o.valor_cancelado_brl)}
                    </td>

                    {/* Prazo / Faturamento */}
                    <td className="py-2 px-3 whitespace-nowrap text-slate-600 text-[11px]">
                      <div>{o.prazo || o.condicao_pagamento || '-'}</div>
                      <div className="text-[10px] text-slate-500">{o.status_faturamento}</div>
                    </td>

                    {/* Data Desejada */}
                    <td className="py-2 px-3 whitespace-nowrap text-slate-700">
                      {o.data_desejada_cliente || '-'}
                    </td>

                    {/* Motivo Original SAP vs Motivo Validado após Revisão (Requisito 6) */}
                    <td className="py-2 px-3 max-w-[220px]">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-tight">
                          Motivo Original SAP:
                        </span>
                        <div
                          className="font-semibold text-slate-900 truncate text-[11px]"
                          title={o.motivo_original_sap}
                        >
                          {o.motivo_original_sap}
                        </div>
                      </div>

                      {o.motivo_validado_apos_revisao ? (
                        <div className="mt-1 pt-1 border-t border-slate-100">
                          <span className="text-[9px] uppercase font-bold text-emerald-700 block tracking-tight">
                            Motivo validado (CRM):
                          </span>
                          <div
                            className="font-bold text-emerald-900 truncate text-[11px]"
                            title={o.motivo_validado_apos_revisao}
                          >
                            {o.motivo_validado_apos_revisao}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 truncate" title={o.observacao}>
                          {o.observacao || 'Sem observações'}
                        </div>
                      )}
                    </td>

                    {/* Categoria */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {o.categoria_motivo}
                      </span>
                    </td>

                    {/* Análise IA */}
                    <td className="py-2 px-3 min-w-[210px]">
                      {isInconsistent ? (
                        <div className="flex items-start space-x-1.5 text-amber-800 bg-amber-50 p-1.5 rounded-md border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                          <div className="text-[11px] leading-tight min-w-0">
                            <span className="font-bold">Inconsistência encontrada</span>
                            <div
                              className="text-[10px] text-amber-900 mt-0.5 truncate max-w-[190px]"
                              title={o.ai_probable_cause}
                            >
                              {o.ai_probable_cause}
                            </div>
                          </div>
                        </div>
                      ) : isInsufficient ? (
                        <div className="flex items-start space-x-1.5 text-slate-700 bg-slate-100 p-1.5 rounded-md border border-slate-200">
                          <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-500" />
                          <div className="text-[11px] leading-tight">
                            <span className="font-semibold">Dados insuficientes</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start space-x-1.5 text-emerald-800 bg-emerald-50 p-1.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                          <div className="text-[11px] leading-tight min-w-0">
                            <span className="font-semibold">Coerente</span>
                            <div
                              className="text-[10px] text-emerald-900 truncate max-w-[190px]"
                              title={o.ai_probable_cause}
                            >
                              {o.ai_suggested_responsibility
                                ? `Resp: ${o.ai_suggested_responsibility}`
                                : ''}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status da Análise */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      {o.analysis_status === 'Revisão solicitada' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          <Clock className="w-3 h-3 mr-1 text-blue-600 animate-spin" />
                          Revisão solicitada
                        </span>
                      ) : o.analysis_status === 'Em análise CRM' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Em análise CRM
                        </span>
                      ) : o.analysis_status === 'Revisado' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          Revisado
                        </span>
                      ) : o.analysis_status === 'Concluído' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                          Concluído
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            o.analysis_status === 'Validado'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : o.analysis_status === 'Ação Criada'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : o.analysis_status === 'Discordado'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-slate-100 text-slate-800 border border-slate-300'
                          }`}
                        >
                          {o.analysis_status}
                        </span>
                      )}
                    </td>

                    {/* Ações (Requisitos 1 e 7) */}
                    <td className="py-2 px-3 whitespace-nowrap text-center">
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
