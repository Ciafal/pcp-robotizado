import React, { useState, useEffect } from 'react'
import {
  Layers,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProductionFilterBar } from '@/components/production-control/ProductionFilterBar'
import { ProductionOrderDetailModal } from '@/components/production-control/ProductionOrderDetailModal'
import { MESIntegrationBanner } from '@/components/production-control/MESIntegrationBanner'
import {
  pcpProductionService,
  defaultProductionFilters,
  type MESConnectionStatus,
} from '@/services/pcp-production-service'
import type { ProductionOrder, ProductionFiltersState } from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR, formatDatePTBR } from '@/lib/formatters-ptbr'

export const ProductionOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)
  const [filters, setFilters] = useState<ProductionFiltersState>(defaultProductionFilters)

  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [mes, list] = await Promise.all([
        pcpProductionService.checkMESConnection(),
        pcpProductionService.listOrders(filters),
      ])
      setMesStatus(mes)
      setOrders(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenDetail = (order: ProductionOrder) => {
    setSelectedOrder(order)
    setDetailModalOpen(true)
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Ordens de Produção (OPs)
            </h1>
            <Badge className="bg-blue-700 text-white font-mono text-xs">GESTÃO DE ORDENS</Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Tabela operacional e conciliação completa de OPs: programado PCP vs realizado MES vs
            integrado SAP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs bg-white text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Ordens
          </Button>
        </div>
      </div>

      {/* Banner MES 4.0 */}
      <MESIntegrationBanner
        status={mesStatus}
        loading={loading}
        onRefresh={() => pcpProductionService.checkMESConnection().then(setMesStatus)}
      />

      {/* Filtros Combináveis */}
      <ProductionFilterBar
        filters={filters}
        onChange={setFilters}
        onApply={loadData}
        onRefresh={loadData}
        loading={loading}
      />

      {/* Tabela Completa com as Colunas Mínimas do Usuário */}
      <div className="bg-white border rounded-lg shadow-2xs overflow-hidden">
        <div className="p-3 border-b bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Mostrando <strong>{orders.length}</strong> ordens de produção filtradas
          </span>
          <span className="text-slate-500">
            Valores numéricos no padrão <strong>pt-BR</strong> (vírgula decimal; tonelada em{' '}
            <strong>t</strong>)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Empresa</th>
                <th className="py-2.5 px-3">Linha</th>
                <th className="py-2.5 px-3">Centro</th>
                <th className="py-2.5 px-3">CT</th>
                <th className="py-2.5 px-3">OP</th>
                <th className="py-2.5 px-3">Material & Descrição</th>
                <th className="py-2.5 px-3">Família</th>
                <th className="py-2.5 px-3">Aço</th>
                <th className="py-2.5 px-3">Bitola</th>
                <th className="py-2.5 px-3 text-right">Prog. (t)</th>
                <th className="py-2.5 px-3 text-right">Prod. (t)</th>
                <th className="py-2.5 px-3 text-right">Apont. (t)</th>
                <th className="py-2.5 px-3 text-right">Saldo (t)</th>
                <th className="py-2.5 px-3 text-center">% Conc.</th>
                <th className="py-2.5 px-3 text-center">Rendimento (Prev/Real)</th>
                <th className="py-2.5 px-3 text-center">Status MES</th>
                <th className="py-2.5 px-3 text-center">Status SAP</th>
                <th className="py-2.5 px-3 text-center">Fechamento</th>
                <th className="py-2.5 px-3 text-center">Status Visual</th>
                <th className="py-2.5 px-3 text-center">Criticidade IA</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {orders.map((o) => {
                const pctConcluido =
                  o.quantity_planned_tons > 0
                    ? (o.quantity_produced_tons / o.quantity_planned_tons) * 100
                    : 0

                return (
                  <tr
                    key={o.id}
                    onClick={() => handleOpenDetail(o)}
                    className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium text-slate-700">{o.empresa_code}</td>
                    <td className="py-2.5 px-3 text-slate-800">{o.linha_code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{o.centro_code}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {o.work_center}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-900 font-mono whitespace-nowrap">
                      {o.op_number}
                    </td>
                    <td className="py-2.5 px-3 max-w-[240px]">
                      <div
                        className="font-medium text-slate-900 truncate"
                        title={o.material_description}
                      >
                        {o.material_description}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{o.material_code}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{o.family_code}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{o.steel_grade}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{o.gauge_dimension}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">
                      {formatQuantity(o.quantity_planned_tons, 't')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                      {formatQuantity(o.quantity_produced_tons, 't')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {formatQuantity(o.quantity_posted_tons, 't')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={o.balance_tons > 0 ? 'text-amber-700' : 'text-slate-600'}>
                        {formatQuantity(o.balance_tons, 't')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold">
                      {formatPercentagePTBR(pctConcluido)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                      <span className="text-slate-500">
                        {formatPercentagePTBR(o.yield_planned_pct)}
                      </span>
                      <span className="mx-1 text-slate-300">/</span>
                      <span
                        className={
                          o.yield_realized_pct < o.yield_planned_pct
                            ? 'font-bold text-rose-700'
                            : 'font-bold text-emerald-700'
                        }
                      >
                        {formatPercentagePTBR(o.yield_realized_pct)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                        {o.status_mes}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          o.status_sap.includes('ERRO') || o.status_sap.includes('REJEITADA')
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {o.status_sap}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          o.status_fechamento === 'FECHADA'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : o.status_fechamento === 'APTA'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {o.status_fechamento}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          o.visual_status === 'CRITICO'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : o.visual_status === 'DESVIO'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : o.visual_status === 'ATENCAO'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : o.visual_status === 'CONCLUIDO'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {o.visual_status === 'CRITICO' && '🔴 '}
                        {o.visual_status === 'DESVIO' && '🟠 '}
                        {o.visual_status === 'ATENCAO' && '🟡 '}
                        {o.visual_status === 'CONCLUIDO' && '🔵 '}
                        {o.visual_status === 'NORMAL' && '🟢 '}
                        {o.visual_status === 'AGUARDANDO' && '⚪ '}
                        {o.visual_status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          o.ai_risk_score === 'CRITICO' || o.ai_risk_score === 'ALTO_RISCO'
                            ? 'border-rose-300 text-rose-800 bg-rose-50'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {o.ai_risk_score}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDetail(o)}
                        className="h-7 text-xs text-blue-700 hover:text-blue-900"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Detalhar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Amplo de Detalhe Completo da OP */}
      <ProductionOrderDetailModal
        order={selectedOrder}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onOrderUpdated={loadData}
      />
    </div>
  )
}
