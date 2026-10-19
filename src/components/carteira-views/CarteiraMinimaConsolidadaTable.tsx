import React from 'react'
import {
  Layers,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Package,
  FileSpreadsheet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CarteiraConsolidadaRow } from '@/types/carteira-minima-consolidada'
import { formatNumberPTBR } from '@/lib/number-format'

interface CarteiraMinimaConsolidadaTableProps {
  modo: 'BITOLA' | 'FAMILIA'
  rows: CarteiraConsolidadaRow[]
  onSelecionarRow: (row: CarteiraConsolidadaRow) => void
}

export const CarteiraMinimaConsolidadaTable: React.FC<CarteiraMinimaConsolidadaTableProps> = ({
  modo,
  rows,
  onSelecionarRow,
}) => {
  const primeiraColunaTitulo = modo === 'BITOLA' ? 'Bitola' : 'Família'

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold tracking-tight">
              <th className="py-3 px-3.5 whitespace-nowrap min-w-[170px]">
                {primeiraColunaTitulo}
              </th>
              <th className="py-3 px-3 whitespace-nowrap min-w-[110px]">Linha/Centro</th>
              <th className="py-3 px-3 text-center whitespace-nowrap min-w-[110px]">
                Materiais (qtde)
              </th>
              <th className="py-3 px-3 text-center whitespace-nowrap min-w-[100px]">
                Pedidos (qtde)
              </th>
              <th className="py-3 px-3 text-right whitespace-nowrap min-w-[120px]">
                Carteira total (t)
              </th>
              <th className="py-3 px-3 text-right whitespace-nowrap min-w-[115px]">
                Estoque livre (t)
              </th>
              <th className="py-3 px-3 text-right whitespace-nowrap min-w-[125px]">
                Saldo a produzir (t)
              </th>
              <th className="py-3 px-3 text-right whitespace-nowrap min-w-[130px]">
                Produção mínima (t)
              </th>
              <th className="py-3 px-3 text-right whitespace-nowrap min-w-[115px]">
                Diferença (t)
              </th>
              <th className="py-3 px-3.5 text-center whitespace-nowrap min-w-[140px]">Situação</th>
              <th className="py-3 px-2 text-center w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-500">
                  <div className="max-w-md mx-auto space-y-2">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">Nenhum agrupamento localizado</p>
                    <p className="text-xs text-slate-500">
                      Não há itens com carteira pendente para os filtros selecionados nesta visão
                      consolidada.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isNaoIdentificada = row.chave === 'Classificação não identificada'
                const isNaoAtingida = row.situacao === 'Não atingida'
                const isAtendida = row.situacao === 'Atendida'
                const isIndividual = row.situacao === 'Análise individual necessária'

                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelecionarRow(row)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    {/* 1. Bitola ou Família */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-slate-900 group-hover:text-[#004C97] transition-colors ${
                            isNaoIdentificada ? 'italic text-amber-800' : ''
                          }`}
                        >
                          {row.chave}
                        </span>
                        {isNaoIdentificada && (
                          <span
                            title="Sem bitola/família identificável no cadastro SAP/HUB"
                            className="inline-flex"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Linha/Centro */}
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80 font-mono text-[11px]">
                        {row.linha_centro}
                      </span>
                    </td>

                    {/* 3. Materiais (qtde de códigos) */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-800">
                        <Package className="w-3 h-3 text-slate-400" />
                        {row.materiais_count}
                      </span>
                    </td>

                    {/* 4. Pedidos (qtde) */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-800">
                        <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                        {row.pedidos_count}
                      </span>
                    </td>

                    {/* 5. Carteira total (t) */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatNumberPTBR(row.carteira_total_tons, 3)} t
                    </td>

                    {/* 6. Estoque livre (t) */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                      {formatNumberPTBR(row.estoque_livre_total_tons, 3)} t
                    </td>

                    {/* 7. Saldo a produzir (t) */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                      {formatNumberPTBR(row.saldo_total_produzir_tons, 3)} t
                    </td>

                    {/* 8. Produção mínima (t) */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-slate-800">
                      {row.producao_minima_tons !== null ? (
                        <span>{formatNumberPTBR(row.producao_minima_tons, 3)} t</span>
                      ) : (
                        <span className="text-[11px] font-sans italic text-slate-500">
                          {row.producao_minima_tipo === 'INDIVIDUAL_NECESSARIA'
                            ? 'Análise individual'
                            : 'Não recebido'}
                        </span>
                      )}
                    </td>

                    {/* 9. Diferença (t) */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
                      {row.diferenca_tons !== null ? (
                        <span
                          className={`font-bold ${
                            row.diferenca_tons < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {row.diferenca_tons > 0 ? '+' : ''}
                          {formatNumberPTBR(row.diferenca_tons, 3)} t
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* 10. Situação */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      {isAtendida && (
                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Atendida
                        </Badge>
                      )}
                      {isNaoAtingida && (
                        <Badge className="bg-rose-50 text-rose-800 border-rose-300 font-semibold gap-1 text-[10px]">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Não atingida
                        </Badge>
                      )}
                      {isIndividual && (
                        <Badge className="bg-amber-50 text-amber-900 border-amber-300 font-semibold gap-1 text-[10px]">
                          <HelpCircle className="w-3 h-3 text-amber-600" />
                          Análise individual necessária
                        </Badge>
                      )}
                      {!isAtendida && !isNaoAtingida && !isIndividual && (
                        <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-semibold text-[10px]">
                          {row.situacao}
                        </Badge>
                      )}
                    </td>

                    {/* 11. Ação rápida / chevron */}
                    <td className="py-3 px-2 text-center text-slate-400 group-hover:text-[#004C97]">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 group-hover:text-[#004C97] hover:bg-white"
                        title="Abrir detalhamento deste agrupamento"
                      >
                        <ChevronRight className="w-4 h-4" />
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

export default CarteiraMinimaConsolidadaTable
