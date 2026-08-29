import React, { useState, useMemo } from 'react'
import {
  ShieldCheck,
  Sparkles,
  Award,
  AlertTriangle,
  Layers,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  AlertOctagon,
  Search,
} from 'lucide-react'
import {
  QualityInspectionDemand,
  ProductQualityRequirement,
  OrderRequirementSheet,
} from '@/types/product-quality'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OrderRequirementSheetModal } from './OrderRequirementSheetModal'
import { QualityRequirementDetailModal } from './QualityRequirementDetailModal'

interface QualityRequirementsPanelProps {
  scheduleCode: string
  lineCode?: string
  demands: QualityInspectionDemand[]
  requirements: ProductQualityRequirement[]
  requirementSheets: OrderRequirementSheet[]
  onRefresh?: () => void
}

export const QualityRequirementsPanel: React.FC<QualityRequirementsPanelProps> = ({
  scheduleCode,
  lineCode,
  demands,
  requirements,
  requirementSheets,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [selectedSheet, setSelectedSheet] = useState<OrderRequirementSheet | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean
    productCode: string
    productName: string
    productionType: 'MTS' | 'MTO'
    demandType: 'ULTRASSOM' | 'ENSAIOS_MECANICOS' | 'STATUS_QUALIDADE'
    demand: QualityInspectionDemand | null
  }>({
    isOpen: false,
    productCode: '',
    productName: '',
    productionType: 'MTS',
    demandType: 'STATUS_QUALIDADE',
    demand: null,
  })

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const total = demands.length
    const us = demands.filter((d) => d.inspection_type === 'ULTRASSOM').length
    const em = demands.filter(
      (d) =>
        d.inspection_type === 'ENSAIO_TRACAO' ||
        d.inspection_type === 'ENSAIO_DOBRAMENTO' ||
        d.inspection_type === 'DUREZA' ||
        d.inspection_type === 'IMPACTO',
    ).length
    const blocking = demands.filter((d) => d.is_blocking_release).length
    const approved = demands.filter(
      (d) => d.status === 'APROVADA' || d.status === 'LIBERADA',
    ).length
    const pending = demands.filter(
      (d) => d.status === 'PENDENTE' || d.status === 'PROGRAMADA' || d.status === 'PREVISTA',
    ).length

    return { total, us, em, blocking, approved, pending }
  }, [demands])

  // Filtragem
  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      const matchSearch =
        searchTerm === '' ||
        d.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.product_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.production_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.customer_name && d.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchType =
        selectedType === 'ALL' ||
        (selectedType === 'ULTRASSOM' && d.inspection_type === 'ULTRASSOM') ||
        (selectedType === 'MECANICOS' && d.inspection_type !== 'ULTRASSOM') ||
        (selectedType === 'MTO' && d.production_type === 'MTO') ||
        (selectedType === 'MTS' && d.production_type === 'MTS')

      const matchStatus = selectedStatus === 'ALL' || d.status === selectedStatus

      return matchSearch && matchType && matchStatus
    })
  }, [demands, searchTerm, selectedType, selectedStatus])

  const handleOpenSheet = (orderNum: string, sapOrder?: string) => {
    const sheet =
      requirementSheets.find((s) => s.order_number === orderNum) ||
      (sapOrder ? requirementSheets.find((s) => s.sales_order_sap === sapOrder) : undefined)
    if (sheet) {
      setSelectedSheet(sheet)
      setIsSheetOpen(true)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header e KPIs de Qualidade */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Total Demandas
          </span>
          <strong className="text-lg font-bold text-slate-900">{stats.total}</strong>
          <span className="text-[10px] text-slate-500 block">Inspeções Mapeadas</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#004C97] block flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#004C97]" /> Ultrassom (US)
          </span>
          <strong className="text-lg font-bold text-[#004C97]">{stats.us}</strong>
          <span className="text-[10px] text-slate-500 block">Solda longitudinal</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-indigo-800 block flex items-center gap-1">
            <Award className="w-3 h-3 text-indigo-700" /> Ensaios Mecânicos
          </span>
          <strong className="text-lg font-bold text-indigo-900">{stats.em}</strong>
          <span className="text-[10px] text-slate-500 block">Tração / Dobramento</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-rose-700 block flex items-center gap-1">
            <AlertOctagon className="w-3 h-3 text-rose-600" /> Bloqueantes
          </span>
          <strong className="text-lg font-bold text-rose-800">{stats.blocking}</strong>
          <span className="text-[10px] text-slate-500 block">Trava liberação OP</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-700 block flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Pendentes / Fila
          </span>
          <strong className="text-lg font-bold text-amber-800">{stats.pending}</strong>
          <span className="text-[10px] text-slate-500 block">Aguardando lab</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aprovadas
          </span>
          <strong className="text-lg font-bold text-emerald-800">{stats.approved}</strong>
          <span className="text-[10px] text-slate-500 block">Laudo homologado</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Filtrar por produto, OP, cliente ou pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full md:w-auto items-center">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                selectedType === 'ALL'
                  ? 'bg-[#004C97] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedType('ULTRASSOM')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                selectedType === 'ULTRASSOM'
                  ? 'bg-[#004C97] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ultrassom
            </button>
            <button
              onClick={() => setSelectedType('MECANICOS')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                selectedType === 'MECANICOS'
                  ? 'bg-[#004C97] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ensaios Mecânicos
            </button>
            <button
              onClick={() => setSelectedType('MTO')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                selectedType === 'MTO'
                  ? 'bg-[#004C97] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              MTO
            </button>
            <button
              onClick={() => setSelectedType('MTS')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                selectedType === 'MTS'
                  ? 'bg-[#004C97] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              MTS
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Demandas e Requisitos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px] uppercase font-bold tracking-wider">
              <tr>
                <th className="p-3">Demanda / OP</th>
                <th className="p-3">Tipo / Ensaio</th>
                <th className="p-3">Produto / Especificação</th>
                <th className="p-3">Classif.</th>
                <th className="p-3">Cliente / Pedido SAP</th>
                <th className="p-3 text-right">Volume</th>
                <th className="p-3">Data Prevista</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDemands.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Nenhuma demanda de qualidade encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredDemands.map((d) => {
                  const isMto = d.production_type === 'MTO'
                  const isUS = d.inspection_type === 'ULTRASSOM'

                  return (
                    <tr
                      key={d.id || d.demand_code}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="p-3">
                        <strong className="font-mono text-[#004C97] block font-bold">
                          {d.demand_code}
                        </strong>
                        <span className="font-mono text-slate-500 text-[10px]">
                          OP: {d.production_order_number}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {isUS ? (
                            <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-[10px] font-bold">
                              <Sparkles className="w-2.5 h-2.5 mr-1" /> ULTRASSOM
                            </Badge>
                          ) : (
                            <Badge className="bg-indigo-100 text-indigo-900 border-indigo-200 text-[10px] font-bold">
                              <Award className="w-2.5 h-2.5 mr-1" />{' '}
                              {d.inspection_type.replace('ENSAIO_', '')}
                            </Badge>
                          )}
                          {d.is_blocking_release && (
                            <span title="Bloqueante para liberação física">
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-600 inline" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                          {d.applicable_standard || 'Norma CIAFAL'}
                        </span>
                      </td>

                      <td className="p-3">
                        <strong className="text-slate-900 block truncate max-w-[200px]">
                          {d.product_description}
                        </strong>
                        <span className="font-mono text-[10px] text-slate-500">
                          {d.product_code}
                        </span>
                      </td>

                      <td className="p-3">
                        <Badge
                          className={`text-[10px] font-bold ${
                            isMto
                              ? 'bg-purple-100 text-purple-900 border-purple-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {d.production_type}
                        </Badge>
                      </td>

                      <td className="p-3">
                        <span className="text-slate-800 font-medium block truncate max-w-[160px]">
                          {d.customer_name || 'Mercado Geral'}
                        </span>
                        {d.sales_order_sap && (
                          <span className="text-[10px] font-mono text-[#004C97] block">
                            SAP: {d.sales_order_sap}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {d.quantity_tons.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} t
                      </td>

                      <td className="p-3">
                        <span className="text-slate-800 font-mono text-[11px] block">
                          {d.planned_inspection_date}
                        </span>
                        <span className="text-[10px] text-slate-500">Linha {d.line_code}</span>
                      </td>

                      <td className="p-3">
                        <Badge
                          className={`text-[10px] font-bold ${
                            d.status === 'APROVADA' || d.status === 'LIBERADA'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : d.status === 'REPROVADA'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : d.status === 'EM_INSPECAO'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {d.status}
                        </Badge>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDetailModal({
                                isOpen: true,
                                productCode: d.product_code,
                                productName: d.product_description,
                                productionType: d.production_type,
                                demandType: isUS ? 'ULTRASSOM' : 'ENSAIOS_MECANICOS',
                                demand: d,
                              })
                            }
                            className="h-7 px-2 text-xs text-[#004C97] hover:bg-blue-50"
                          >
                            Detalhes
                          </Button>

                          {isMto && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleOpenSheet(d.production_order_number, d.sales_order_sap)
                              }
                              className="h-7 px-2 text-xs border-purple-200 text-purple-800 hover:bg-purple-50"
                              title="Ver Ficha de Requisitos MTO"
                            >
                              <FileText className="w-3 h-3 mr-1" /> Ficha
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modais */}
      <OrderRequirementSheetModal
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        sheet={selectedSheet}
      />

      <QualityRequirementDetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal((prev) => ({ ...prev, isOpen: false }))}
        productCode={detailModal.productCode}
        productName={detailModal.productName}
        productionType={detailModal.productionType}
        demandType={detailModal.demandType}
        demand={detailModal.demand}
        onOpenRequirementSheet={() => {
          if (detailModal.demand) {
            handleOpenSheet(
              detailModal.demand.production_order_number,
              detailModal.demand.sales_order_sap,
            )
          }
        }}
      />
    </div>
  )
}

export default QualityRequirementsPanel
