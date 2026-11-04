import React from 'react'

export interface ReworkSummaryData {
  items: Array<{
    material_code: string
    material_description?: string
    lot_number: string
    heat_number?: string
    stock_origin_type: 'SEMIACABADO' | 'ACABADO'
    storage_deposit: string
    storage_location: string
    available_quantity: number
    rework_quantity: number
    unit?: string
    rework_reason: string
    rework_operation: string
    rework_notes?: string
  }>
  reworkCenterCode: string
}

export function ReworkSummaryCard({ data }: { data: ReworkSummaryData }) {
  const totalReworkTons = data.items.reduce((acc, it) => acc + (it.rework_quantity || 0), 0)

  return (
    <div className="bg-amber-50/70 border border-amber-300 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-amber-200 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
            Resumo do Retrabalho
          </span>
          <span className="text-xs text-amber-800">
            {data.items.length}{' '}
            {data.items.length === 1 ? 'lote selecionado' : 'lotes selecionados'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-amber-700 block">Total a Retrabalhar</span>
          <span className="font-mono font-black text-sm text-amber-950">
            {totalReworkTons.toLocaleString('pt-BR', {
              minimumFractionDigits: 3,
              maximumFractionDigits: 3,
            })}{' '}
            t
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.items.map((it, idx) => (
          <div
            key={it.lot_number || idx}
            className="bg-white border border-amber-200 rounded p-2.5 text-xs space-y-1 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{it.material_code}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                  it.stock_origin_type === 'SEMIACABADO'
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {it.stock_origin_type}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 truncate" title={it.material_description}>
              {it.material_description || 'Material em Estoque'}
            </p>
            <div className="grid grid-cols-2 gap-1 text-[11px] pt-1 border-t border-slate-100">
              <div>
                <span className="text-slate-500 block text-[10px]">Lote / Corrida:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {it.lot_number} {it.heat_number ? `(${it.heat_number})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Depósito / Local:</span>
                <span
                  className="font-mono text-slate-800 truncate block"
                  title={`${it.storage_deposit} • ${it.storage_location}`}
                >
                  {it.storage_deposit} • {it.storage_location}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Disp. / Retrabalho:</span>
                <span className="font-mono text-slate-800">
                  {it.available_quantity.toLocaleString('pt-BR')} /{' '}
                  <strong className="text-amber-800 font-bold">
                    {it.rework_quantity.toLocaleString('pt-BR')} {it.unit || 't'}
                  </strong>
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Operação:</span>
                <span
                  className="font-medium text-slate-800 truncate block"
                  title={it.rework_operation}
                >
                  {it.rework_operation}
                </span>
              </div>
            </div>
            <div className="pt-1 text-[11px] text-slate-700 bg-amber-50/50 p-1 rounded border border-amber-100">
              <span className="font-medium text-amber-900">Motivo:</span> {it.rework_reason}
              {it.rework_notes && (
                <p
                  className="text-[10px] text-slate-500 italic mt-0.5 truncate"
                  title={it.rework_notes}
                >
                  Obs: {it.rework_notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-amber-900 bg-amber-100/60 px-3 py-1.5 rounded">
        <span>
          Centro de destino: <strong>{data.reworkCenterCode || 'RETRAB — Retrabalho'}</strong>
        </span>
        <span className="text-slate-500 text-[10px]">
          ℹ O saldo do estoque será revalidado no backend ao confirmar. Nenhuma movimentação física
          SAP será gerada no planejamento.
        </span>
      </div>
    </div>
  )
}
