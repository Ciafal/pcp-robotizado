/**
 * Tabela de Carteira de Pedidos Cancelados e Recusados
 * PCP Robotizado - CIAFAL
 *
 * Colunas na ordem oficial:
 * Ordem/Item | Data | Centro | Cliente | MATERIAL | SALDO ATUAL (t) | SALDO NA DATA DESEJADA (t) | SALDO NA DATA DO CADASTRO DO PEDIDO (t) | DIAS SEM ESTOQUE DO MATERIAL | MOTIVO SAP | AÇÃO
 *
 * Requisitos estritos atendidos:
 * 1. Renomeação da coluna de saldo cancelado para "Saldo atual (t)".
 * 2. Adição imediata de 3 novas colunas após "Saldo atual (t)":
 *    - "Saldo na data desejada (t)"
 *    - "Saldo na data do cadastro do pedido (t)"
 *    - "Dias sem estoque do material"
 * 3. Saldo na data desejada (t): valores negativos com destaque discreto em vermelho; zero facilmente identificável.
 * 4. Sem fonte de dados = "Não disponível" (nunca zero, nunca valor fictício).
 * 5. Tooltips com textos exatos do usuário e ícone discreto nos cabeçalhos:
 *    - Saldo atual: "Estoque disponível atual do material."
 *    - Saldo na data desejada: "Estoque disponível ou projetado para a data desejada de atendimento do pedido."
 *    - Saldo na data do cadastro do pedido: "Estoque disponível registrado quando o pedido foi cadastrado."
 *    - Dias sem estoque do material: "Quantidade de dias em que o saldo disponível do material permaneceu igual ou inferior a zero."
 * 6. Ordenação numérica (crescente/decrescente) nas 4 colunas numéricas (saldo atual + as 3 novas).
 * 7. Formatação padrão brasileiro (t, vírgula decimal, ponto de milhar, 2 casas).
 * 8. Responsividade: rolagem horizontal interna, cabeçalho alinhado, texto quebra controlado, layout Ciafal intacto.
 * 9. Botões "Analisar" e "Solicitar revisão" mantidos estritamente funcionais.
 */

import React, { useState, useMemo } from 'react'
import { Eye, Send, ExternalLink, Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { CancelledOrderRecord } from '@/types/cancelled-orders'
import { formatTonsPtBr, DADO_NAO_DISPONIVEL } from '@/lib/formatters-ptbr'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface CancelledOrdersTableProps {
  orders: CancelledOrderRecord[]
  selectedOrderId?: string
  onSelectOrder: (order: CancelledOrderRecord) => void
  onRequestRevision: (order: CancelledOrderRecord) => void
  onViewRevisionHistory: (order: CancelledOrderRecord) => void
}

type SortField = 'saldo_atual' | 'saldo_desejada' | 'saldo_cadastro' | 'dias_sem_estoque'

type SortDirection = 'asc' | 'desc'

export const CancelledOrdersTable: React.FC<CancelledOrdersTableProps> = ({
  orders,
  selectedOrderId,
  onSelectOrder,
  onRequestRevision,
  onViewRevisionHistory,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'desc') {
        setSortDirection('asc')
      } else {
        setSortField(null)
        setSortDirection('desc')
      }
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Ordenação numérica estrita das 4 colunas (nulos ao final)
  const sortedOrders = useMemo(() => {
    if (!sortField) return orders

    return [...orders].sort((a, b) => {
      let valA: number | null = null
      let valB: number | null = null

      switch (sortField) {
        case 'saldo_atual':
          valA =
            a.saldo_cancelado_t !== undefined && a.saldo_cancelado_t !== null
              ? a.saldo_cancelado_t
              : null
          valB =
            b.saldo_cancelado_t !== undefined && b.saldo_cancelado_t !== null
              ? b.saldo_cancelado_t
              : null
          break
        case 'saldo_desejada':
          valA = a.saldo_data_desejada_t !== undefined ? a.saldo_data_desejada_t : null
          valB = b.saldo_data_desejada_t !== undefined ? b.saldo_data_desejada_t : null
          break
        case 'saldo_cadastro':
          valA = a.saldo_data_cadastro_t !== undefined ? a.saldo_data_cadastro_t : null
          valB = b.saldo_data_cadastro_t !== undefined ? b.saldo_data_cadastro_t : null
          break
        case 'dias_sem_estoque':
          valA = a.dias_sem_estoque_material !== undefined ? a.dias_sem_estoque_material : null
          valB = b.dias_sem_estoque_material !== undefined ? b.dias_sem_estoque_material : null
          break
      }

      // Tratamento de nulos/indisponíveis: sempre ao final da lista
      if (valA === null && valB === null) return 0
      if (valA === null) return 1
      if (valB === null) return -1

      return sortDirection === 'asc' ? valA - valB : valB - valA
    })
  }, [orders, sortField, sortDirection])

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown className="w-3 h-3 ml-1 text-slate-400 opacity-60 group-hover:opacity-100" />
      )
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-[#004C97] font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-[#004C97] font-bold" />
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden mb-6">
        {/* Cabeçalho da Tabela com Legenda e Contagem */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Carteira de Pedidos Cancelados e Recusados
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Exibindo {sortedOrders.length} pedidos no período selecionado com análise temporal de
              estoque
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
          <table className="w-full text-left border-collapse text-xs min-w-[1360px]">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] sticky top-0 z-10 shadow-xs border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap w-[120px]">Ordem/Item</th>
                <th className="py-2.5 px-3 whitespace-nowrap w-[95px]">Data</th>
                <th className="py-2.5 px-3 whitespace-nowrap w-[80px] text-center">Centro</th>
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[170px] max-w-[200px]">
                  Cliente
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[190px] max-w-[230px]">
                  Material
                </th>

                {/* 1. Saldo atual (t) - renomeado da antiga Saldo (t) */}
                <th
                  className="py-2.5 px-3 whitespace-nowrap text-right w-[140px] bg-rose-50/70 text-rose-950 font-bold border-l border-r border-rose-100 select-none cursor-pointer group"
                  onClick={() => handleToggleSort('saldo_atual')}
                  title="Clique para ordenar numericamente por Saldo atual"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="truncate">Saldo atual (t)</span>
                    <Tooltip>
                      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-help ml-0.5">
                          <Info className="w-3 h-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-[240px] text-xs font-normal normal-case"
                      >
                        Estoque disponível atual do material.
                      </TooltipContent>
                    </Tooltip>
                    {renderSortIcon('saldo_atual')}
                  </div>
                </th>

                {/* 2. Saldo na data desejada (t) - NOVA COLUNA 1 */}
                <th
                  className="py-2.5 px-3 text-right w-[165px] bg-sky-50/60 text-slate-800 font-bold border-r border-slate-200 select-none cursor-pointer group"
                  onClick={() => handleToggleSort('saldo_desejada')}
                  title="Clique para ordenar numericamente por Saldo na data desejada"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="whitespace-normal leading-tight text-right">
                      Saldo na data desejada (t)
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-help ml-0.5">
                          <Info className="w-3 h-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-[260px] text-xs font-normal normal-case"
                      >
                        Estoque disponível ou projetado para a data desejada de atendimento do
                        pedido.
                      </TooltipContent>
                    </Tooltip>
                    {renderSortIcon('saldo_desejada')}
                  </div>
                </th>

                {/* 3. Saldo na data do cadastro do pedido (t) - NOVA COLUNA 2 */}
                <th
                  className="py-2.5 px-3 text-right w-[175px] bg-slate-50 text-slate-800 font-bold border-r border-slate-200 select-none cursor-pointer group"
                  onClick={() => handleToggleSort('saldo_cadastro')}
                  title="Clique para ordenar numericamente por Saldo na data do cadastro"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="whitespace-normal leading-tight text-right">
                      Saldo na data do cadastro do pedido (t)
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-help ml-0.5">
                          <Info className="w-3 h-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-[260px] text-xs font-normal normal-case"
                      >
                        Estoque disponível registrado quando o pedido foi cadastrado.
                      </TooltipContent>
                    </Tooltip>
                    {renderSortIcon('saldo_cadastro')}
                  </div>
                </th>

                {/* 4. Dias sem estoque do material - NOVA COLUNA 3 */}
                <th
                  className="py-2.5 px-3 text-right w-[150px] bg-amber-50/50 text-slate-800 font-bold border-r border-slate-200 select-none cursor-pointer group"
                  onClick={() => handleToggleSort('dias_sem_estoque')}
                  title="Clique para ordenar numericamente por Dias sem estoque"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="whitespace-normal leading-tight text-right">
                      Dias sem estoque do material
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-help ml-0.5">
                          <Info className="w-3 h-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-[260px] text-xs font-normal normal-case"
                      >
                        Quantidade de dias em que o saldo disponível do material permaneceu igual ou
                        inferior a zero.
                      </TooltipContent>
                    </Tooltip>
                    {renderSortIcon('dias_sem_estoque')}
                  </div>
                </th>

                <th className="py-2.5 px-3 whitespace-nowrap min-w-[190px]">Motivo SAP</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center w-[160px]">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    Nenhum pedido cancelado corresponde aos critérios e filtros selecionados.
                  </td>
                </tr>
              ) : (
                sortedOrders.map((o) => {
                  const isSelected = selectedOrderId === o.id
                  const hasCrmRevision = Boolean(o.crm_protocolo)

                  // Formatações estritas
                  const saldoAtualVal = o.saldo_cancelado_t
                  const saldoDesejadaVal = o.saldo_data_desejada_t
                  const saldoCadastroVal = o.saldo_data_cadastro_t
                  const diasSemEstoqueVal = o.dias_sem_estoque_material

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

                      {/* 6. Saldo atual (t) */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold text-rose-700 bg-rose-50/40 border-l border-r border-rose-100">
                        {saldoAtualVal !== null && saldoAtualVal !== undefined ? (
                          formatTonsPtBr(saldoAtualVal, 2)
                        ) : (
                          <span className="text-slate-400 font-normal italic">Não disponível</span>
                        )}
                      </td>

                      {/* 7. Saldo na data desejada (t) - Destaque discreto em vermelho se negativo; zero identificável */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono border-r border-slate-200 bg-sky-50/20">
                        {saldoDesejadaVal === null || saldoDesejadaVal === undefined ? (
                          <span className="text-slate-400 font-sans text-[11px] italic">
                            Não disponível
                          </span>
                        ) : saldoDesejadaVal < 0 ? (
                          <span
                            className="inline-block px-1.5 py-0.5 rounded bg-red-100/80 text-red-700 font-bold border border-red-200"
                            title={`Saldo negativo de ${formatTonsPtBr(saldoDesejadaVal, 2)} projetado para ${o.data_desejada_cliente || 'a data desejada'}`}
                          >
                            {formatTonsPtBr(saldoDesejadaVal, 2)}
                          </span>
                        ) : saldoDesejadaVal === 0 ? (
                          <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {formatTonsPtBr(0, 2)}
                          </span>
                        ) : (
                          <span className="text-slate-900 font-medium">
                            {formatTonsPtBr(saldoDesejadaVal, 2)}
                          </span>
                        )}
                      </td>

                      {/* 8. Saldo na data do cadastro do pedido (t) */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono border-r border-slate-200">
                        {saldoCadastroVal === null || saldoCadastroVal === undefined ? (
                          <span className="text-slate-400 font-sans text-[11px] italic">
                            Não disponível
                          </span>
                        ) : saldoCadastroVal === 0 ? (
                          <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {formatTonsPtBr(0, 2)}
                          </span>
                        ) : (
                          <span className="text-slate-900 font-medium">
                            {formatTonsPtBr(saldoCadastroVal, 2)}
                          </span>
                        )}
                      </td>

                      {/* 9. Dias sem estoque do material (ex: "0 dias", "4 dias", "18 dias") */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono border-r border-slate-200">
                        {diasSemEstoqueVal === null || diasSemEstoqueVal === undefined ? (
                          <span className="text-slate-400 font-sans text-[11px] italic">
                            Não disponível
                          </span>
                        ) : diasSemEstoqueVal > 0 ? (
                          <span className="inline-flex items-center font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {diasSemEstoqueVal} {diasSemEstoqueVal === 1 ? 'dia' : 'dias'}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-normal">0 dias</span>
                        )}
                      </td>

                      {/* 10. Motivo SAP */}
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

                      {/* 11. Ação */}
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
    </TooltipProvider>
  )
}
