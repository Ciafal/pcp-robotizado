import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, SlidersHorizontal } from 'lucide-react'
import { CarteiraItem, CarteiraEntradaFutura } from '@/types/carteira-analise'
import { CoberturaTemporalEngine } from '@/services/cobertura-temporal-engine'

interface CarteiraImportadoViewProps {
  itens: CarteiraItem[]
  entradasFuturas: CarteiraEntradaFutura[]
  onOpenMemoria: (item: CarteiraItem) => void
  onOpenDetalheMaterial?: (item: CarteiraItem) => void
}

export const CarteiraImportadoView: React.FC<CarteiraImportadoViewProps> = ({
  itens,
  entradasFuturas,
  onOpenMemoria,
  onOpenDetalheMaterial,
}) => {
  const [mostrarColunasTemporais, setMostrarColunasTemporais] = useState(false)
  const itensImportados = itens.filter((i) => i.origem_produto === 'IMPORTADO')
  const entradasImportadas = entradasFuturas.filter((e) => e.origem === 'IMPORTADO')

  const totalCarteiraImportados = itensImportados.reduce(
    (s, i) => s + (i.carteira_aberta_tons || 0),
    0,
  )
  const totalEstoqueImportado = itensImportados.reduce((s, i) => s + (i.estoque_livre_tons || 0), 0)
  const totalTransitoPendente = entradasImportadas.reduce(
    (s, i) => s + (i.quantidade_pendente_tons || 0),
    0,
  )
  const saldoFuturoImportado =
    totalEstoqueImportado + totalTransitoPendente - totalCarteiraImportados

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Carteira de Produtos Importados &bull; Comércio Exterior & Trânsito
            </h3>
            <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
              Origem: Importado
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento de lotes em trânsito internacional, desembaraço aduaneiro e cobertura de
            pedidos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-purple-800 bg-purple-50 border-purple-200 text-xs font-semibold"
          >
            Origem ZIMP &bull; Importados & Trading
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMostrarColunasTemporais(!mostrarColunasTemporais)}
            className={`h-7 text-xs gap-1 border-slate-300 ${
              mostrarColunasTemporais
                ? 'bg-blue-50 text-[#004C97] font-bold border-blue-300'
                : 'text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Colunas: Cobertura Temporal</span>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Carteira Importada
          </span>
          <strong className="text-base font-mono font-bold text-slate-900 block mt-0.5">
            {totalCarteiraImportados.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Estoque Disponível
          </span>
          <strong className="text-base font-mono font-bold text-slate-800 block mt-0.5">
            {totalEstoqueImportado.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-purple-700 block">
            Em Trânsito / Porto (t)
          </span>
          <strong className="text-base font-mono font-bold text-purple-900 block mt-0.5">
            {totalTransitoPendente.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">
            Saldo Futuro Projetado
          </span>
          <strong className="text-base font-mono font-bold text-emerald-700 block mt-0.5">
            {saldoFuturoImportado >= 0
              ? `+${saldoFuturoImportado.toFixed(1)}`
              : saldoFuturoImportado.toFixed(1)}{' '}
            t
          </strong>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
          Ordens de Venda de Produtos Importados ({itensImportados.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px]">
              <tr>
                <th className="p-2.5">Material</th>
                <th className="p-2.5">Cliente</th>
                <th className="p-2.5">Pedido / Item</th>
                <th className="p-2.5 text-right">Carteira (t)</th>
                <th className="p-2.5 text-right">Estoque (t)</th>
                <th className="p-2.5 text-right">Em Trânsito (t)</th>
                <th className="p-2.5 text-center">Data Desejada</th>
                <th className="p-2.5 text-center">Status Chegada</th>
                {mostrarColunasTemporais && (
                  <>
                    <th className="p-2.5 text-right bg-blue-900/40">Média (t/d)</th>
                    <th className="p-2.5 text-right bg-blue-900/40">Cobertura</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Fim Estoque</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Próx. Disponibilidade ETA</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Gap Dias</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Status Temporal</th>
                  </>
                )}
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensImportados.map((it, idx) => {
                const inputTemp = CoberturaTemporalEngine.converterCarteiraItemParaInput(
                  it,
                  'IMPORTADO',
                  entradasImportadas,
                )
                const resTemp = CoberturaTemporalEngine.calcular(inputTemp)

                return (
                  <tr
                    key={idx}
                    onClick={() =>
                      onOpenDetalheMaterial ? onOpenDetalheMaterial(it) : onOpenMemoria(it)
                    }
                    className="hover:bg-blue-50/40 text-[11px] cursor-pointer"
                  >
                    <td className="p-2.5 font-mono font-bold text-slate-900">
                      {it.codigo_material}
                    </td>
                    <td className="p-2.5 text-slate-700 max-w-[150px] truncate">
                      {it.nome_cliente}
                    </td>
                    <td className="p-2.5 font-mono text-slate-700">
                      {it.ordem_venda}/{it.item_ordem}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-blue-900">
                      {it.carteira_aberta_tons.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-700">
                      {it.estoque_livre_tons.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-purple-800">
                      {entradasImportadas
                        .find((e) => e.codigo_material === it.codigo_material)
                        ?.quantidade_pendente_tons.toFixed(1) || '0.0'}
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-700">
                      {it.data_desejada}
                    </td>
                    <td className="p-2.5 text-center">
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[9px] font-bold">
                        Em Trânsito
                      </Badge>
                    </td>
                    {mostrarColunasTemporais && (
                      <>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          {resTemp.mediaDiariaFaturamentoT
                            ? `${resTemp.mediaDiariaFaturamentoT.toFixed(2)}`
                            : 'N/D'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                          {resTemp.diasCoberturaFormatado}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-700">
                          {resTemp.dataFimEstoqueFormatada}
                        </td>
                        <td
                          className="p-2.5 text-center font-mono text-[10px] text-blue-900 truncate max-w-[120px]"
                          title={resTemp.proximaDataPrevistaFormatada}
                        >
                          {resTemp.proximaDataPrevistaFormatada}
                        </td>
                        <td
                          className={`p-2.5 text-center font-mono font-bold ${resTemp.temGapRuptura ? 'text-rose-700' : 'text-emerald-700'}`}
                        >
                          {resTemp.diasEstoqueNegativoFormatado}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[9px] font-bold border ${resTemp.badgeCor.bg} ${resTemp.badgeCor.text} ${resTemp.badgeCor.border}`}
                          >
                            {resTemp.status}
                          </Badge>
                        </td>
                      </>
                    )}
                    <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onOpenDetalheMaterial ? onOpenDetalheMaterial(it) : onOpenMemoria(it)
                        }
                        className="h-6 px-1.5 text-[10px] text-[#004C97] hover:bg-blue-50 font-semibold gap-1"
                        title="Ver detalhe com Cobertura Temporal & Previsão"
                      >
                        <Eye className="w-3 h-3" /> Detalhe
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default CarteiraImportadoView
