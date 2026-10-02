import React from 'react'
import { AlertTriangle, Scale, Package, Layers, FileSpreadsheet } from 'lucide-react'
import { CarteiraMinimaTotalizadores } from '@/types/carteira-minima'
import { formatNumberPTBR } from '@/lib/number-format'

interface CarteiraMinimaCardsProps {
  totalizadores: CarteiraMinimaTotalizadores
  carregando?: boolean
}

export const CarteiraMinimaCards: React.FC<CarteiraMinimaCardsProps> = ({
  totalizadores,
  carregando = false,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 w-full">
      {/* CARD 1: Itens abaixo da carteira mínima */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between min-h-[116px]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-xs font-semibold text-slate-600 leading-tight">
            Itens abaixo da carteira mínima
          </span>
        </div>
        <div className="mt-2 space-y-0.5">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {carregando ? '—' : totalizadores.total_itens_abaixo_minimo}
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Materiais com saldo &lt; lote mínimo
          </p>
        </div>
      </div>

      {/* CARD 2: Carteira total (t) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between min-h-[116px]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 shrink-0">
            <Layers className="w-4 h-4 text-[#004C97]" />
          </div>
          <span className="text-xs font-semibold text-slate-600 leading-tight">Carteira total</span>
        </div>
        <div className="mt-2 space-y-0.5">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {carregando ? '—' : `${formatNumberPTBR(totalizadores.carteira_total_tons, 3)} t`}
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">Demanda total em pedidos</p>
        </div>
      </div>

      {/* CARD 3: Estoque livre total (t) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between min-h-[116px]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 shrink-0">
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xs font-semibold text-slate-600 leading-tight">
            Estoque livre total
          </span>
        </div>
        <div className="mt-2 space-y-0.5">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {carregando ? '—' : `${formatNumberPTBR(totalizadores.estoque_livre_total_tons, 3)} t`}
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">Disponível em depósitos SAP</p>
        </div>
      </div>

      {/* CARD 4: Saldo total a produzir (t) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between min-h-[116px]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 shrink-0">
            <Scale className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-xs font-semibold text-slate-600 leading-tight">
            Saldo total a produzir
          </span>
        </div>
        <div className="mt-2 space-y-0.5">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {carregando ? '—' : `${formatNumberPTBR(totalizadores.saldo_total_produzir_tons, 3)} t`}
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">Carteira líquida pendente</p>
        </div>
      </div>

      {/* CARD 5: Quantidade de pedidos afetados */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between min-h-[116px]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-xs font-semibold text-slate-600 leading-tight">
            Quantidade de pedidos afetados
          </span>
        </div>
        <div className="mt-2 space-y-0.5">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {carregando ? '—' : totalizadores.pedidos_afetados_count}
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Ordens de venda com gargalo de lote
          </p>
        </div>
      </div>
    </div>
  )
}

export default CarteiraMinimaCards
