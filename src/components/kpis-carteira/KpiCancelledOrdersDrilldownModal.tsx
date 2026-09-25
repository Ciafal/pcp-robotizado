import React, { useState } from 'react'
import {
  X,
  FileSpreadsheet,
  AlertOctagon,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { CancelledOrderRecord } from '@/types/cancelled-orders'

interface KpiCancelledOrdersDrilldownModalProps {
  isOpen: boolean
  onClose: () => void
  orders: CancelledOrderRecord[]
  title?: string
  subtitle?: string
}

export const KpiCancelledOrdersDrilldownModal: React.FC<KpiCancelledOrdersDrilldownModalProps> = ({
  isOpen,
  onClose,
  orders,
  title = 'Pedidos Cancelados — Categoria PCP / Planejamento',
  subtitle,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCentro, setSelectedCentro] = useState<string>('Todos')

  if (!isOpen) return null

  const centros = Array.from(new Set(orders.map((o) => o.centro).filter(Boolean)))

  const filteredOrders = orders.filter((o) => {
    if (selectedCentro !== 'Todos' && o.centro !== selectedCentro) return false
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      o.ordem_venda.toLowerCase().includes(term) ||
      o.cliente_nome.toLowerCase().includes(term) ||
      o.material_codigo.toLowerCase().includes(term) ||
      o.material_descricao.toLowerCase().includes(term) ||
      o.motivo_original_sap.toLowerCase().includes(term)
    )
  })

  // Agregações sem dados financeiros
  const uniqueOrders = new Set(filteredOrders.map((o) => o.ordem_venda)).size
  const totalItens = filteredOrders.length
  const totalToneladas = filteredOrders.reduce((acc, o) => acc + (o.saldo_cancelado_t || 0), 0)

  const handleExportCsv = () => {
    const headers = [
      'Ordem Venda',
      'Item',
      'Data Ordem',
      'Centro',
      'Linha',
      'Cliente',
      'Curva',
      'Material Código',
      'Material Descrição',
      'Saldo Cancelado (t)',
      'Motivo Original SAP',
      'Categoria',
    ]

    const rows = filteredOrders.map((o) => [
      `"${o.ordem_venda}"`,
      o.item_ordem,
      `"${o.data_ordem}"`,
      `"${o.centro}"`,
      `"${o.linha || ''}"`,
      `"${o.cliente_nome.replace(/"/g, '""')}"`,
      `"${o.curva_abc || ''}"`,
      `"${o.material_codigo}"`,
      `"${o.material_descricao.replace(/"/g, '""')}"`,
      o.saldo_cancelado_t.toFixed(2).replace('.', ','),
      `"${o.motivo_original_sap.replace(/"/g, '""')}"`,
      `"${o.categoria_motivo}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `kpi_pedidos_cancelados_pcp_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-700 text-white rounded-lg shadow-xs">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
                <Badge
                  variant="outline"
                  className="text-xs bg-rose-50 text-rose-700 border-rose-200 font-semibold"
                >
                  {uniqueOrders} ordens ({totalItens} itens)
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {subtitle ||
                  `Total de ${totalToneladas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t canceladas (sem dados financeiros conforme governança)`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs h-8 text-slate-700 border-slate-300 hover:bg-slate-100"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Exportar CSV
            </Button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Busca Local */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar OV, cliente, material ou motivo..."
              className="pl-9 h-8 text-xs bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Centro:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedCentro('Todos')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  selectedCentro === 'Todos'
                    ? 'bg-[#004C97] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              {centros.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCentro(c)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    selectedCentro === c
                      ? 'bg-[#004C97] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela de Ordens Canceladas */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">OV / Item</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Centro / Linha</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Material & Descrição</th>
                  <th className="py-2.5 px-2 text-center">Curva</th>
                  <th className="py-2.5 px-3 text-right">Saldo Cancelado</th>
                  <th className="py-2.5 px-3">Motivo Original SAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Nenhum pedido cancelado encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {o.ordem_venda} / {o.item_ordem}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                        {o.data_ordem}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800">{o.centro}</span>
                        {o.linha && (
                          <span className="block text-[10px] text-slate-500">{o.linha}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 leading-tight">
                          {o.cliente_nome}
                        </div>
                        {o.cliente_codigo && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Cód: {o.cliente_codigo}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-slate-800 font-bold block">
                          {o.material_codigo}
                        </span>
                        <span className="text-[11px] text-slate-600 line-clamp-1">
                          {o.material_descricao}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-1.5 py-0 ${
                            o.curva_abc === 'A'
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : o.curva_abc === 'B'
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          }`}
                        >
                          {o.curva_abc || 'C'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                        {o.saldo_cancelado_t.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        t
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <span className="bg-rose-50 text-rose-900 font-medium px-2 py-0.5 rounded text-[11px] border border-rose-200 block truncate max-w-xs">
                          {o.motivo_original_sap}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Consome os mesmos registros e regras da tela Pedidos Cancelados</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-7"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
