import React from 'react'
import { AlertTriangle, Clock, Sparkles, ChevronRight, ShieldAlert, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CarteiraMinimaItem, CriticidadeCarteiraMinima } from '@/types/carteira-minima'
import { formatNumberPTBR } from '@/lib/number-format'

interface CarteiraMinimaTableProps {
  itens: CarteiraMinimaItem[]
  aoSelecionarItem: (item: CarteiraMinimaItem) => void
  itemSelecionadoId?: string | null
}

function formatarDataPtBr(dataIso?: string): string {
  if (!dataIso) return '—'
  const parts = dataIso.split('T')[0].split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dataIso
}

function renderCriticidadeBadge(crit: CriticidadeCarteiraMinima) {
  switch (crit) {
    case 'Crítico':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
          Crítico
        </span>
      )
    case 'Atenção':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          Atenção
        </span>
      )
    case 'Monitoramento':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <span className="w-1.5 h-1.5 rounded-full bg-[#004C97]" />
          Monitoramento
        </span>
      )
    default:
      return null
  }
}

export const CarteiraMinimaTable: React.FC<CarteiraMinimaTableProps> = ({
  itens,
  aoSelecionarItem,
  itemSelecionadoId,
}) => {
  return (
    <div className="w-full">
      {/* VISÃO DESKTOP/TABLET: Tabela com cabeçalho fixo e rolagem horizontal SOMENTE interna */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-w-full max-h-[640px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 z-20 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
              <tr>
                <th className="py-3 px-3 text-center w-28 whitespace-nowrap">Criticidade</th>
                <th className="py-3 px-3 w-32 whitespace-nowrap">1. Material</th>
                <th className="py-3 px-3 min-w-[200px] whitespace-nowrap">2. Texto breve</th>
                <th className="py-3 px-3 text-right w-28 whitespace-nowrap">3. Carteira (t)</th>
                <th className="py-3 px-3 text-right w-28 whitespace-nowrap">
                  4. Estoque livre (t)
                </th>
                <th className="py-3 px-3 text-right w-32 whitespace-nowrap">
                  5. Saldo do pedido (t)
                </th>
                <th className="py-3 px-3 text-right w-36 whitespace-nowrap">
                  6. Carteira mínima de produção (t)
                </th>
                <th className="py-3 px-3 text-center w-32 whitespace-nowrap">7. Pedido</th>
                <th className="py-3 px-3 text-center w-28 whitespace-nowrap">8. Data desejada</th>
                <th className="py-3 px-3 min-w-[320px]">9. Observação</th>
                <th className="py-3 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {itens.map((item) => {
                const isSelected = item.id === itemSelecionadoId
                return (
                  <tr
                    key={item.id}
                    onClick={() => aoSelecionarItem(item)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected ? 'bg-blue-50/80 hover:bg-blue-100/80' : 'hover:bg-slate-50/90'
                    }`}
                  >
                    {/* Indicador de criticidade */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {renderCriticidadeBadge(item.criticidade)}
                    </td>

                    {/* 1. Material */}
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {item.material}
                    </td>

                    {/* 2. Texto breve */}
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      <div className="line-clamp-2" title={item.descricao_material}>
                        {item.descricao_material}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Centro: {item.centro} • Linha: {item.linha || 'L1'}
                      </div>
                    </td>

                    {/* 3. Carteira (t) */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {formatNumberPTBR(item.carteira_tons, 3)} t
                    </td>

                    {/* 4. Estoque livre (t) */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                      {formatNumberPTBR(item.estoque_livre_tons, 3)} t
                    </td>

                    {/* 5. Saldo do pedido (t) */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 bg-amber-50/40 whitespace-nowrap">
                      {formatNumberPTBR(item.saldo_produzir_tons, 3)} t
                    </td>

                    {/* 6. Carteira mínima de produção (t) */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatNumberPTBR(item.producao_minima_tons, 3)} t
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Faltam {formatNumberPTBR(item.diferenca_minimo_tons, 3)} t
                      </span>
                    </td>

                    {/* 7. Pedido: número/item no formato exato "251967 / 10" */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-[#004C97] whitespace-nowrap">
                      {item.pedido_formatado}
                    </td>

                    {/* 8. Data desejada dd/mm/aaaa */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700 whitespace-nowrap">
                      {formatarDataPtBr(item.data_desejada)}
                    </td>

                    {/* 9. Observação: maior largura, gerada pela IA com dados reais */}
                    <td className="py-2.5 px-3 text-slate-700 text-[11px] leading-relaxed">
                      <div className="flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#004C97] shrink-0 mt-0.5" />
                        <span className="line-clamp-2" title={item.observacao_ia}>
                          {item.observacao_ia}
                        </span>
                      </div>
                    </td>

                    {/* Ação / Ícone de detalhe */}
                    <td className="py-2.5 px-2 text-center text-slate-400 group-hover:text-[#004C97]">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* VISÃO MOBILE: Linhas viram cards com todos os campos e formatação pt-BR */}
      <div className="md:hidden space-y-3">
        {itens.map((item) => {
          const isSelected = item.id === itemSelecionadoId
          return (
            <div
              key={item.id}
              onClick={() => aoSelecionarItem(item)}
              className={`bg-white rounded-xl border p-4 shadow-2xs space-y-3 transition-colors cursor-pointer ${
                isSelected
                  ? 'border-[#004C97] ring-1 ring-[#004C97] bg-blue-50/30'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Topo do Card Mobile: Material, Criticidade e Pedido */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {item.material}
                    </span>
                    {renderCriticidadeBadge(item.criticidade)}
                  </div>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">
                    {item.descricao_material}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                    Pedido / Item
                  </span>
                  <span className="font-mono font-bold text-xs text-[#004C97]">
                    {item.pedido_formatado}
                  </span>
                </div>
              </div>

              {/* Grid de Valores (Toneladas formatadas) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Carteira (t)</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatNumberPTBR(item.carteira_tons, 3)} t
                  </span>
                </div>
                <div className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 block">Estoque Livre (t)</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {formatNumberPTBR(item.estoque_livre_tons, 3)} t
                  </span>
                </div>
                <div className="p-2 bg-amber-50/60 rounded-lg border border-amber-200">
                  <span className="text-[10px] text-amber-800 font-semibold block">
                    Saldo a Produzir (t)
                  </span>
                  <span className="font-mono font-bold text-amber-900">
                    {formatNumberPTBR(item.saldo_produzir_tons, 3)} t
                  </span>
                </div>
                <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-blue-700 block">Produção Mínima (t)</span>
                  <span className="font-mono font-bold text-blue-900">
                    {formatNumberPTBR(item.producao_minima_tons, 3)} t
                  </span>
                </div>
              </div>

              {/* Informações Complementares */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                <span>
                  Data Desejada: <strong>{formatarDataPtBr(item.data_desejada)}</strong>
                </span>
                <span>
                  Centro/Linha:{' '}
                  <strong>
                    {item.centro} / {item.linha || 'L1'}
                  </strong>
                </span>
              </div>

              {/* Observação IA */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-700 space-y-1">
                <div className="flex items-center gap-1 font-bold text-[#004C97] text-[10px] uppercase">
                  <Sparkles className="w-3 h-3" />
                  Observação IA (Dados Reais)
                </div>
                <p className="line-clamp-3 leading-relaxed">{item.observacao_ia}</p>
              </div>

              <div className="text-right pt-1">
                <span className="text-xs text-[#004C97] font-semibold flex items-center justify-end gap-1">
                  Ver Detalhes do Gargalo
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CarteiraMinimaTable
