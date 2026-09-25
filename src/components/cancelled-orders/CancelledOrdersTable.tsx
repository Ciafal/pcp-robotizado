/**
 * Tabela Detalhada com Colunas Obrigatórias de Pedidos Cancelados
 * Requisito 5: Ordem; Item; Data da ordem; Cliente; Código do material; Descrição;
 * Qtd. OV (t); Qtd. faturada (t); Saldo cancelado (t); Estoque disponível na data;
 * Preço líquido; Valor cancelado; Prazo; Status faturamento; Data desejada;
 * Status da recusa; Motivo informado; Categoria; Observação; Análise IA; Status da análise; Ações.
 * Cabeçalho fixo, rolagem interna, sem truncamento descontrolado ou quebra de layout.
 */

import React from 'react'
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Eye,
  FileSpreadsheet,
  ArrowUpDown,
} from 'lucide-react'
import { CancelledOrderRecord } from '@/types/cancelled-orders'
import { formatTons, formatCurrencyPtBr } from '@/lib/formatters-ptbr'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TableProps {
  orders: CancelledOrderRecord[]
  onSelectOrder: (order: CancelledOrderRecord) => void
  onSort?: (field: keyof CancelledOrderRecord) => void
}

export const CancelledOrdersTable: React.FC<TableProps> = ({ orders, onSelectOrder }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col mb-8">
      {/* Cabeçalho da Tabela com Metadados */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-800">
            Carteira de Pedidos Cancelados e Recusados
          </h3>
          <Badge
            variant="outline"
            className="text-xs bg-white text-slate-700 font-semibold border-slate-300"
          >
            {orders.length} registros
          </Badge>
        </div>
        <div className="text-xs text-slate-500">
          Clique sobre qualquer linha para abrir a{' '}
          <span className="font-semibold text-indigo-700">Análise do Cancelamento</span>
        </div>
      </div>

      {/* Container com Rolagem Interna e Cabeçalho Fixo */}
      <div className="overflow-x-auto overflow-y-auto max-h-[600px] border-b border-slate-200">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/90 text-slate-700 uppercase font-semibold text-[11px] sticky top-0 z-10 shadow-sm border-b border-slate-300">
            <tr>
              <th className="py-2.5 px-3 whitespace-nowrap">Ordem / Item</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Data Ordem</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Centro/Linha</th>
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
              <th className="py-2.5 px-3 whitespace-nowrap">Motivo Original SAP</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Categoria</th>
              <th className="py-2.5 px-3 whitespace-nowrap min-w-[200px]">Análise IA</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Status Análise</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-center">Ações</th>
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

                return (
                  <tr
                    key={o.id}
                    onClick={() => onSelectOrder(o)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                  >
                    {/* Ordem / Item */}
                    <td className="py-2 px-3 whitespace-nowrap font-mono font-medium text-slate-900">
                      <div>{o.ordem_venda}</div>
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
                        {o.cliente_codigo || 'SEM COD'} •{' '}
                        {o.curva_abc ? `Curva ${o.curva_abc}` : ''}
                      </div>
                    </td>

                    {/* Material */}
                    <td className="py-2 px-3 max-w-[220px]">
                      <div
                        className="font-mono text-indigo-950 font-semibold truncate"
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

                    {/* Motivo Original SAP */}
                    <td className="py-2 px-3 max-w-[200px]">
                      <div
                        className="font-semibold text-slate-900 truncate"
                        title={o.motivo_original_sap}
                      >
                        {o.motivo_original_sap}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate" title={o.observacao}>
                        {o.observacao || 'Sem observações registradas'}
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {o.categoria_motivo}
                      </span>
                    </td>

                    {/* Análise IA */}
                    <td className="py-2 px-3 min-w-[220px]">
                      {isInconsistent ? (
                        <div className="flex items-start space-x-1.5 text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                          <div className="text-[11px] leading-tight">
                            <span className="font-bold">Inconsistência encontrada</span>
                            <div
                              className="text-[10px] text-amber-900 mt-0.5 truncate max-w-[200px]"
                              title={o.ai_probable_cause}
                            >
                              {o.ai_probable_cause}
                            </div>
                          </div>
                        </div>
                      ) : isInsufficient ? (
                        <div className="flex items-start space-x-1.5 text-slate-700 bg-slate-100 p-1.5 rounded border border-slate-200">
                          <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-500" />
                          <div className="text-[11px] leading-tight">
                            <span className="font-semibold">Dados insuficientes</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start space-x-1.5 text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                          <div className="text-[11px] leading-tight">
                            <span className="font-semibold">Coerente</span>
                            <div
                              className="text-[10px] text-emerald-900 truncate max-w-[200px]"
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
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          o.analysis_status === 'Validado'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : o.analysis_status === 'Ação Criada'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : o.analysis_status === 'Discordado'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {o.analysis_status}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-2 px-3 whitespace-nowrap text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectOrder(o)
                        }}
                        className="h-7 px-2 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100"
                        title="Abrir Análise do Cancelamento"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Analisar
                      </Button>
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
