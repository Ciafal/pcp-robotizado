import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import { CarteiraItem } from '@/types/carteira-analise'

interface CarteiraL2ViewProps {
  itens: CarteiraItem[]
  onOpenMemoria: (item: CarteiraItem) => void
}

export const CarteiraL2View: React.FC<CarteiraL2ViewProps> = ({ itens, onOpenMemoria }) => {
  const [filtroFamilia, setFiltroFamilia] = useState<string>('TODAS')

  const itensL2 = itens.filter(
    (i) =>
      i.linha === 'L2' ||
      ['R', 'Q', 'B', 'S'].includes((i.codigo_material || '').charAt(0).toUpperCase()),
  )

  const itensFiltrados = itensL2.filter((i) => {
    if (filtroFamilia !== 'TODAS' && i.familia !== filtroFamilia) return false
    return true
  })

  const totalCarteiraL2 = itensL2.reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)
  const totalSemiCiafal = itensL2.reduce(
    (s, i) => s + (i.estoque_semiacabado_ciafal_tons || i.estoque_semiacabado_tons || 0),
    0,
  )
  const totalSemiVallourec = itensL2.reduce(
    (s, i) => s + (i.estoque_semiacabado_vallourec_tons || 0),
    0,
  )
  const totalSaldoPositivoL2 = itensL2.reduce((s, i) => s + (i.saldo_positivo_tons || 0), 0)
  const totalSaldoNegativoL2 = itensL2.reduce((s, i) => s + (i.saldo_negativo_tons || 0), 0)

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Painel Ciclo L2 &bull; Laminação de Perfis Pesados e Blocos
            </h3>
            <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
              Substitui Planilha Ciclo L2
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Particularidade L2: Separação estrita de Semiacabado CIAFAL, Semiacabado Vallourec e
            ZSD24.
          </p>
        </div>

        <Badge
          variant="outline"
          className="text-amber-800 bg-amber-50 border-amber-300 text-xs font-semibold"
        >
          Regra Legada Ciclo L2 &bull; Sujeita a validação do PCP
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Carteira Aberta L2
          </span>
          <strong className="text-base font-mono font-bold text-slate-900 block mt-0.5">
            {totalCarteiraL2.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#004C97] block">
            Semiacabado CIAFAL
          </span>
          <strong className="text-base font-mono font-bold text-[#004C97] block mt-0.5">
            {totalSemiCiafal.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-purple-700 block">
            Semiacabado Vallourec
          </span>
          <strong className="text-base font-mono font-bold text-purple-900 block mt-0.5">
            {totalSemiVallourec.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">
            Saldo Positivo
          </span>
          <strong className="text-base font-mono font-bold text-emerald-700 block mt-0.5">
            +{totalSaldoPositivoL2.toFixed(1)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-rose-700 block">
            Carteira Negativa
          </span>
          <strong className="text-base font-mono font-bold text-rose-700 block mt-0.5">
            {totalSaldoNegativoL2.toFixed(1)} t
          </strong>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px]">
              <tr>
                <th className="p-2.5">Material</th>
                <th className="p-2.5">Descrição</th>
                <th className="p-2.5 text-center">Família</th>
                <th className="p-2.5 text-right">ZSD24 (t)</th>
                <th className="p-2.5 text-right">Carteira Vendas</th>
                <th className="p-2.5 text-right">Estoque Livre</th>
                <th className="p-2.5 text-right">Semi CIAFAL</th>
                <th className="p-2.5 text-right">Semi Vallourec</th>
                <th className="p-2.5 text-right">Carteira Negativa</th>
                <th className="p-2.5 text-right">Saldo Estoque</th>
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensFiltrados.map((it, idx) => (
                <tr key={idx} className="hover:bg-blue-50/40 text-[11px]">
                  <td className="p-2.5 font-mono font-bold text-slate-900">{it.codigo_material}</td>
                  <td className="p-2.5 text-slate-700 max-w-[200px] truncate">
                    {it.descricao_material}
                  </td>
                  <td className="p-2.5 text-center font-semibold text-slate-600">{it.familia}</td>
                  <td className="p-2.5 text-right font-mono text-slate-700">
                    {(it.zsd24_tons ?? it.carteira_aberta_tons).toFixed(1)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-slate-800">
                    {it.carteira_aberta_tons.toFixed(1)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-slate-700">
                    {it.estoque_livre_tons.toFixed(1)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-[#004C97]">
                    {(it.estoque_semiacabado_ciafal_tons || it.estoque_semiacabado_tons).toFixed(1)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-purple-800">
                    {(it.estoque_semiacabado_vallourec_tons || 0).toFixed(1)}
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
    </div>
  )
}
export default CarteiraL2View
