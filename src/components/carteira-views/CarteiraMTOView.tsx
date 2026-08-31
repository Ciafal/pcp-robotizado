import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import { CarteiraItem } from '@/types/carteira-analise'

interface CarteiraMTOViewProps {
  itens: CarteiraItem[]
  onOpenMemoria: (item: CarteiraItem) => void
}

export const CarteiraMTOView: React.FC<CarteiraMTOViewProps> = ({ itens, onOpenMemoria }) => {
  const [subAba, setSubAba] = useState<'RESUMO' | 'MTO_L1' | 'MTO_L2'>('RESUMO')

  const itensMTO = itens.filter((i) => i.tipo_ordem === 'MTO')
  const mtoL1 = itensMTO.filter(
    (i) =>
      i.linha === 'L1' ||
      ['C', 'Q', 'R', 'V'].includes((i.codigo_material || '').charAt(0).toUpperCase()),
  )
  const mtoL2 = itensMTO.filter(
    (i) =>
      i.linha === 'L2' ||
      ['R', 'Q', 'B', 'S'].includes((i.codigo_material || '').charAt(0).toUpperCase()),
  )

  const totalMtoTons = itensMTO.reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)
  const aFaturarTons = itensMTO
    .filter((i) => i.status_atendimento === 'A_FATURAR')
    .reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)
  const aProduzirTons = itensMTO
    .filter((i) => i.status_atendimento === 'A_PRODUZIR' || i.status_atendimento === 'PROGRAMADO')
    .reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)
  const bloqueadosTons = itensMTO
    .filter((i) => i.bloqueio)
    .reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubAba('RESUMO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subAba === 'RESUMO'
                ? 'bg-[#004C97] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Resumo Geral MTO
          </button>
          <button
            onClick={() => setSubAba('MTO_L1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subAba === 'MTO_L1'
                ? 'bg-[#004C97] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Pedidos MTO L1 ({mtoL1.length})
          </button>
          <button
            onClick={() => setSubAba('MTO_L2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subAba === 'MTO_L2'
                ? 'bg-[#004C97] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Pedidos MTO L2 ({mtoL2.length})
          </button>
        </div>

        <Badge variant="outline" className="text-purple-800 bg-purple-50 border-purple-200 text-xs">
          Substitui Planilhas "Pedidos MTO L1" e "Pedidos MTO em aberto L2"
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Total Carteira MTO
          </span>
          <strong className="text-base font-mono font-bold text-slate-900 block mt-0.5">
            {totalMtoTons.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">
            MTO A Faturar (Coberto)
          </span>
          <strong className="text-base font-mono font-bold text-emerald-700 block mt-0.5">
            {aFaturarTons.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-700 block">
            MTO A Produzir (Pendente)
          </span>
          <strong className="text-base font-mono font-bold text-amber-800 block mt-0.5">
            {aProduzirTons.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-rose-700 block">
            Ordens Bloqueadas
          </span>
          <strong className="text-base font-mono font-bold text-rose-800 block mt-0.5">
            {bloqueadosTons.toFixed(1)} t
          </strong>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px]">
              <tr>
                <th className="p-2.5">Pedido / Item</th>
                <th className="p-2.5">Cliente</th>
                <th className="p-2.5">Material & Descrição</th>
                <th className="p-2.5 text-center">Linha</th>
                <th className="p-2.5 text-right">Qtd Ordem (t)</th>
                <th className="p-2.5 text-right">Faturado (t)</th>
                <th className="p-2.5 text-right">Saldo Pedido (t)</th>
                <th className="p-2.5 text-right">Estoque MTO (t)</th>
                <th className="p-2.5 text-right">Falta Produzir (t)</th>
                <th className="p-2.5 text-center">Status Atendimento</th>
                <th className="p-2.5 text-center">Data Desejada</th>
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(subAba === 'MTO_L1' ? mtoL1 : subAba === 'MTO_L2' ? mtoL2 : itensMTO).map(
                (it, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 text-[11px]">
                    <td className="p-2.5 font-mono font-bold text-slate-900">
                      {it.ordem_venda} / {it.item_ordem}
                    </td>
                    <td className="p-2.5 text-slate-800 font-medium max-w-[150px] truncate">
                      {it.nome_cliente}
                    </td>
                    <td className="p-2.5">
                      <span className="font-mono font-bold text-slate-900">
                        {it.codigo_material}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">
                        {it.descricao_material}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <Badge className="bg-slate-100 text-[#004C97] text-[10px]">
                        {it.linha || 'GERAL'}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-800">
                      {it.qtd_ordem_tons.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-600">
                      {it.qtd_faturada_tons.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-blue-900">
                      {it.carteira_aberta_tons.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-purple-800">
                      {it.estoque_mto_tons.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                      {it.falta_produzir_tons > 0 ? it.falta_produzir_tons.toFixed(1) : '0.0'}
                    </td>
                    <td className="p-2.5 text-center">
                      {it.bloqueio ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9px] font-bold">
                          Bloqueado
                        </Badge>
                      ) : it.status_atendimento === 'A_FATURAR' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold">
                          A Faturar
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-bold">
                          A Produzir
                        </Badge>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-700">
                      {it.data_desejada}
                    </td>
                    <td className="p-2.5 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenMemoria(it)}
                        className="h-6 px-1.5 text-[10px] text-[#004C97] hover:bg-blue-50"
                      >
                        <Eye className="w-3 h-3 mr-0.5" /> Memória
                      </Button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default CarteiraMTOView
