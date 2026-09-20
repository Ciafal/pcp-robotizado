import React, { useState, useEffect } from 'react'
import {
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Download,
  Filter,
  BarChart3,
  Layers,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MESIntegrationBanner } from '@/components/production-control/MESIntegrationBanner'
import { ProductionIndicatorModal } from '@/components/production-control/ProductionIndicatorModal'
import { ProductionOrderDetailModal } from '@/components/production-control/ProductionOrderDetailModal'
import { pcpProductionService, type MESConnectionStatus } from '@/services/pcp-production-service'
import type { ProductionOrder } from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR } from '@/lib/formatters-ptbr'

export const ProductionComparativePage: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)

  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const [indicatorModalOpen, setIndicatorModalOpen] = useState(false)
  const [indicatorTitle, setIndicatorTitle] = useState('')
  const [indicatorOrders, setIndicatorOrders] = useState<ProductionOrder[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [mes, list] = await Promise.all([
        pcpProductionService.checkMESConnection(),
        pcpProductionService.listOrders(),
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

  // Agrupamento comparativo por centro industrial
  const centers = ['SEML1', 'ENDL1', 'PNCL1', 'PNCL2', 'OXIFERKS', 'PNCSDC']
  const centerComparatives = centers.map((centerCode) => {
    const centerOrders = orders.filter((o) => o.centro_code === centerCode)
    const progTons = centerOrders.reduce((acc, o) => acc + (o.quantity_planned_tons || 0), 0)
    const prodTons = centerOrders.reduce((acc, o) => acc + (o.quantity_produced_tons || 0), 0)
    const sapTons = centerOrders.reduce((acc, o) => acc + (o.quantity_sap_tons || 0), 0)
    const deltaTons = prodTons - progTons
    const adherencePct = progTons > 0 ? (prodTons / progTons) * 100 : 0
    const yieldAvg =
      centerOrders.length > 0
        ? centerOrders.reduce((acc, o) => acc + (o.yield_realized_pct || 0), 0) /
          centerOrders.length
        : 0

    return {
      centerCode,
      ordersCount: centerOrders.length,
      progTons,
      prodTons,
      sapTons,
      deltaTons,
      adherencePct,
      yieldAvg,
      orders: centerOrders,
    }
  })

  const handleOpenCenterModal = (comp: (typeof centerComparatives)[0]) => {
    setIndicatorTitle(`Conciliação Detalhada: Centro ${comp.centerCode}`)
    setIndicatorOrders(comp.orders)
    setIndicatorModalOpen(true)
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Comparativo PCP x Produção
            </h1>
            <Badge className="bg-blue-700 text-white font-mono text-xs">
              DIGITAL AUTOMÁTICO (SUBSTITUIÇÃO ZPP_01 MANUAL)
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Tela digital automática que substitui a consolidação manual dos relatórios ZPP_01
            enviados por e-mail/planilha.
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
            Atualizar Comparativo
          </Button>
        </div>
      </div>

      {/* Banner MES 4.0 */}
      <MESIntegrationBanner
        status={mesStatus}
        loading={loading}
        onRefresh={() => pcpProductionService.checkMESConnection().then(setMesStatus)}
      />

      {/* Tabela de Comparativo Consolidado por Centro Industrial */}
      <div className="bg-white border rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Quadro Comparativo Digital por Centro Operacional
          </h3>
          <span className="text-xs text-slate-500">
            Clique em qualquer linha para abrir a composição analítica de OPs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b">
              <tr>
                <th className="py-2.5 px-3">Centro</th>
                <th className="py-2.5 px-3 text-center">Nº de OPs</th>
                <th className="py-2.5 px-3 text-right">Programado PCP (t)</th>
                <th className="py-2.5 px-3 text-right">Realizado MES (t)</th>
                <th className="py-2.5 px-3 text-right">Integrado SAP (t)</th>
                <th className="py-2.5 px-3 text-right">Desvio (t)</th>
                <th className="py-2.5 px-3 text-center">Aderência (%)</th>
                <th className="py-2.5 px-3 text-center">Rendimento Médio</th>
                <th className="py-2.5 px-3 text-center">Status Conciliação</th>
                <th className="py-2.5 px-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {centerComparatives.map((comp) => (
                <tr
                  key={comp.centerCode}
                  onClick={() => handleOpenCenterModal(comp)}
                  className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-bold text-blue-900 font-mono text-sm">
                    {comp.centerCode}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-medium">
                    {comp.ordersCount} OPs
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium">
                    {formatQuantity(comp.progTons, 't')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatQuantity(comp.prodTons, 't')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-blue-800">
                    {formatQuantity(comp.sapTons, 't')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    <span className={comp.deltaTons < 0 ? 'text-rose-700' : 'text-emerald-700'}>
                      {formatQuantity(comp.deltaTons, 't')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${
                        comp.adherencePct >= 95
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {formatPercentagePTBR(comp.adherencePct)}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">
                    {formatPercentagePTBR(comp.yieldAvg)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${
                        comp.prodTons === comp.sapTons
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-rose-50 text-rose-800'
                      }`}
                    >
                      {comp.prodTons === comp.sapTons ? 'Conciliado' : 'Delta MES x SAP'}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenCenterModal(comp)}
                      className="h-7 text-xs text-blue-700 hover:text-blue-900"
                    >
                      Explodir OPs
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Amplo de OPs do Centro */}
      <ProductionIndicatorModal
        open={indicatorModalOpen}
        onOpenChange={setIndicatorModalOpen}
        title={indicatorTitle}
        subtitle="Ordens de produção físicas e lançamentos que compõem este centro"
        orders={indicatorOrders}
        onSelectOrder={(ord) => {
          setSelectedOrder(ord)
          setDetailModalOpen(true)
        }}
      />

      {/* Modal Completo de Detalhe da OP */}
      <ProductionOrderDetailModal
        order={selectedOrder}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onOrderUpdated={loadData}
      />
    </div>
  )
}

export default ProductionComparativePage
