import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, TrendingDown } from 'lucide-react'
import { CarteiraItem } from '@/types/carteira-analise'

interface CarteiraL1ViewProps {
  itens: CarteiraItem[]
  onOpenMemoria: (item: CarteiraItem) => void
}

export const CarteiraL1View: React.FC<CarteiraL1ViewProps> = ({ itens, onOpenMemoria }) => {
  const [filtroFamilia, setFiltroFamilia] = useState<string>('TODAS')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('TODAS')

  const itensL1 = itens.filter(
    (i) =>
      i.linha === 'L1' ||
      ['C', 'Q', 'R', 'V'].includes((i.codigo_material || '').charAt(0).toUpperCase()),
  )

  const itensFiltrados = itensL1.filter((i) => {
    if (filtroFamilia !== 'TODAS' && i.familia !== filtroFamilia) return false
    if (filtroOrigem !== 'TODAS' && i.origem_produto !== filtroOrigem) return false
    return true
  })

  const totalCarteiraL1 = itensL1.reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)
  const totalEstoqueLivreL1 = itensL1.reduce((s, i) => s + (i.estoque_livre_tons || 0), 0)
  const totalEstoqueMtoL1 = itensL1.reduce((s, i) => s + (i.estoque_mto_tons || 0), 0)
  const totalSemiacabadoL1 = itensL1.reduce((s, i) => s + (i.estoque_semiacabado_tons || 0), 0)
  const totalSaldoPositivoL1 = itensL1.reduce((s, i) => s + (i.saldo_positivo_tons || 0), 0)
  const totalSaldoNegativoL1 = itensL1.reduce((s, i) => s + (i.saldo_negativo_tons || 0), 0)

  const topNegativos = [...itensL1]
    .filter((i) => i.saldo_negativo_tons < 0)
    .sort((a, b) => a.saldo_negativo_tons - b.saldo_negativo_tons)
    .slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Painel Ciclo L1 &bull; Laminação de Perfis Leves
            </h3>
            <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
              Substitui Planilha Ciclo L1
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Regras Oficiais: Disp = Livre + MTO + Semiacabado | Demanda = Carteira Vendas + MTO |
            Negativa = MIN(0; Disp - Demanda)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-slate-700 bg-slate-50 border-slate-300 font-mono text-xs"
          >
            Semana {Math.ceil((new Date().getDate() + 6) / 7)} / {new Date().getFullYear()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Demanda Total L1
          </span>
          <strong className="text-base font-mono font-bold text-slate-900 block mt-0.5">
            {totalCarteiraL1.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Estoque Livre
          </span>
          <strong className="text-base font-mono font-bold text-slate-800 block mt-0.5">
            {totalEstoqueLivreL1.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-purple-700 block">Estoque MTO</span>
          <strong className="text-base font-mono font-bold text-purple-900 block mt-0.5">
            {totalEstoqueMtoL1.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#004C97] block">Semiacabado</span>
          <strong className="text-base font-mono font-bold text-[#004C97] block mt-0.5">
            {totalSemiacabadoL1.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">
            Saldo Positivo
          </span>
          <strong className="text-base font-mono font-bold text-emerald-700 block mt-0.5">
            +{totalSaldoPositivoL1.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-rose-700 block">
            Carteira Negativa
          </span>
          <strong className="text-base font-mono font-bold text-rose-700 block mt-0.5">
            {totalSaldoNegativoL1.toFixed(1)} t
          </strong>
        </div>
      </div>

      {topNegativos.length > 0 && (
        <Card className="bg-rose-50/40 border-rose-200 shadow-xs">
          <CardHeader className="p-3 pb-2 border-b border-rose-100">
            <CardTitle className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" /> Ranking de Produtos com Maior
              Carteira Negativa L1
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {topNegativos.map((top, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white rounded-lg border border-rose-200 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {top.codigo_material}
                    </span>
                    <Badge className="bg-rose-100 text-rose-800 text-[9px] font-bold">
                      {top.saldo_negativo_tons.toFixed(1)} t
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {top.descricao_material}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {itensL1.length === 0 ? (
        <Card className="bg-white border-slate-200 text-center py-12 px-4 shadow-xs">
          <div className="max-w-md mx-auto space-y-2">
            <div className="p-3 bg-blue-50 text-[#004C97] w-12 h-12 rounded-full mx-auto flex items-center justify-center">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Nenhuma carteira carregada para Linha L1
            </h3>
            <p className="text-xs text-slate-500">
              Utilize 'Importar Carteira' para iniciar a análise dos perfis e barras leves L1.
            </p>
          </div>
        </Card>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#004C97] text-white text-[11px]">
                <tr>
                  <th className="p-2.5">Material</th>
                  <th className="p-2.5">Descrição</th>
                  <th className="p-2.5 text-center">Família</th>
                  <th className="p-2.5 text-center">Origem</th>
                  <th className="p-2.5 text-right">Carteira Vendas (t)</th>
                  <th className="p-2.5 text-right">Estoque Livre (t)</th>
                  <th className="p-2.5 text-right">Estoque MTO (t)</th>
                  <th className="p-2.5 text-right">Semiacabado (t)</th>
                  <th className="p-2.5 text-right">Carteira Negativa (t)</th>
                  <th className="p-2.5 text-right">Saldo Estoque (+)</th>
                  <th className="p-2.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itensFiltrados.map((it, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 text-[11px]">
                    <td className="p-2.5 font-mono font-bold text-slate-900">
                      {it.codigo_material}
                    </td>
                    <td className="p-2.5 text-slate-700 max-w-[200px] truncate">
                      {it.descricao_material}
                    </td>
                    <td className="p-2.5 text-center font-semibold text-slate-600">{it.familia}</td>
                    <td className="p-2.5 text-center">
                      <Badge className="bg-slate-100 text-slate-700 text-[9px]">
                        {it.origem_produto}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-800">
                      {it.carteira_aberta_tons.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-700">
                      {it.estoque_livre_tons.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-purple-800">
                      {it.estoque_mto_tons.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-[#004C97]">
                      {it.estoque_semiacabado_tons.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                      {it.saldo_negativo_tons < 0 ? it.saldo_negativo_tons.toFixed(1) : '-'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                      {it.saldo_positivo_tons > 0 ? `+${it.saldo_positivo_tons.toFixed(1)}` : '-'}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
export default CarteiraL1View
