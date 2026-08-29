import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { useState } from 'react'
import {
  X,
  CalendarDays,
  Zap,
  Clock,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  FileText,
  Sparkles,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OrderRequirementSheetModal } from '@/components/quality/OrderRequirementSheetModal'
import { QualityRequirementDetailModal } from '@/components/quality/QualityRequirementDetailModal'
import { qualityService } from '@/services/quality-service'
import { OrderRequirementSheet } from '@/types/product-quality'

export const OrderDrawer: React.FC = () => {
  const { selectedOrder, setSelectedOrder, setActiveTab, setIsSimulatorModalOpen } =
    useControlTower()

  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [loadedSheet, setLoadedSheet] = useState<OrderRequirementSheet | null>(null)
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean
    type: 'ULTRASSOM' | 'ENSAIOS_MECANICOS' | 'STATUS_QUALIDADE'
  }>({ isOpen: false, type: 'STATUS_QUALIDADE' })

  if (!selectedOrder) return null

  const isMto =
    selectedOrder.productionType === 'MTO' || selectedOrder.customerName !== 'Mercado Geral'

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-950 border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-cyan-400 text-base">
              {selectedOrder.orderNumber}
            </span>
            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
              Linha: {selectedOrder.lineCode}
            </Badge>
            <Badge
              className={`text-[9px] font-bold ${
                isMto
                  ? 'bg-purple-900 text-purple-200 border-purple-700'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {isMto ? 'MTO' : 'MTS'}
            </Badge>
            <Badge
              className={`text-[9px] uppercase ${
                selectedOrder.status === 'IN_PRODUCTION'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                  : selectedOrder.status === 'SETUP'
                    ? 'bg-amber-950 text-amber-400 border-amber-700'
                    : selectedOrder.status === 'BLOCKED'
                      ? 'bg-rose-950 text-rose-400 border-rose-700'
                      : 'bg-slate-900 text-slate-300'
              }`}
            >
              {selectedOrder.status}
            </Badge>
          </div>
          <h3 className="text-sm font-bold text-white mt-1">{selectedOrder.materialName}</h3>
          <p className="text-xs text-slate-400">
            Cliente: <strong className="text-slate-200">{selectedOrder.customerName}</strong>
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedOrder(null)}
          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
        {/* Tonelagem e Aderência */}
        <div className="grid grid-cols-2 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-400 block text-[11px]">Volume Programado:</span>
            <strong className="text-white text-base font-mono">
              {selectedOrder.plannedTons} t
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Realizado / Restante:</span>
            <strong className="text-emerald-400 text-base font-mono">
              {selectedOrder.producedTons} t{' '}
              <span className="text-slate-500 font-normal">({selectedOrder.remainingTons} t)</span>
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Ritmo Atual:</span>
            <strong className="text-cyan-300 font-mono">
              {selectedOrder.currentRatePerHour} t/h (Meta: {selectedOrder.targetRatePerHour} t/h)
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Aderência:</span>
            <strong className="text-emerald-400 font-mono">{selectedOrder.adherencePct}%</strong>
          </div>
        </div>

        {/* Datas e Horários */}
        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
          <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
            Cronograma Operacional:
          </span>
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div>
              Início Previsto: <strong>{selectedOrder.plannedStart}</strong>
            </div>
            <div>
              Fim Previsto: <strong>{selectedOrder.plannedEnd}</strong>
            </div>
            <div>
              Conclusão Projetada:{' '}
              <strong className="text-cyan-300">{selectedOrder.projectedEnd}</strong>
            </div>
            <div>
              Setup: <strong>{selectedOrder.setupMinutes} min</strong>
            </div>
          </div>
        </div>

        {/* Drill-down de Pedido e Cliente */}
        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
              Vínculo Comercial SAP ECC:
            </span>
            {isMto && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const sheet = await qualityService.getRequirementSheetByOrder(
                    selectedOrder.orderNumber,
                  )
                  if (sheet) {
                    setLoadedSheet(sheet)
                  } else {
                    setLoadedSheet({
                      id: 'mto-drawer',
                      sheet_code: `FRS-2026-${selectedOrder.materialCode}`,
                      order_number: selectedOrder.orderNumber,
                      customer_name: selectedOrder.customerName,
                      sales_order_sap: selectedOrder.salesOrderId || '4500981240',
                      sales_order_item: selectedOrder.salesOrderItem || '10',
                      material_code: selectedOrder.materialCode,
                      material_description: selectedOrder.materialName,
                      production_type: 'MTO',
                      quantity_tons: selectedOrder.plannedTons,
                      desired_delivery_date: selectedOrder.plannedEnd,
                      technical_standard: 'ABNT NBR 6355 / ASTM A36',
                      requires_ultrasound: true,
                      requires_mechanical_tests: true,
                      validation_status: 'VALIDADO',
                    })
                  }
                  setIsSheetOpen(true)
                }}
                className="h-6 px-2 text-[10px] bg-purple-950/60 border-purple-600 text-purple-200 hover:bg-purple-900"
              >
                <FileText className="w-3 h-3 mr-1" /> Ficha de Requisitos
              </Button>
            )}
          </div>
          <div className="space-y-1 text-slate-300">
            <div>
              Ordem de Venda: <strong>{selectedOrder.salesOrderId}</strong> (Item:{' '}
              {selectedOrder.salesOrderItem})
            </div>
            <div>
              Cliente: <strong>{selectedOrder.customerName}</strong>
            </div>
            <div>
              Campanha: <strong>{selectedOrder.campaignName}</strong>
            </div>
            <div>
              Programador PCP: <strong>{selectedOrder.programmer}</strong>
            </div>
          </div>
        </div>

        {/* Requisitos de Qualidade Integrados (US, EM e Status Qualidade) */}
        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
              Requisitos de Qualidade & Inspeção:
            </span>
            <span className="text-[10px] text-slate-400">Clique para abrir Ficha / Detalhe</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* Ultrassom (US) */}
            <div
              onClick={async () => {
                const sheet = await qualityService.getRequirementSheetByOrder(
                  selectedOrder.orderNumber,
                )
                if (sheet) {
                  setLoadedSheet(sheet)
                  setIsSheetOpen(true)
                } else if (isMto) {
                  setLoadedSheet({
                    id: 'mto-drawer-us',
                    sheet_code: selectedOrder.sheetCode || `FRS-2026-${selectedOrder.materialCode}`,
                    order_number: selectedOrder.orderNumber,
                    customer_name: selectedOrder.customerName,
                    sales_order_sap: selectedOrder.salesOrderId || '4500981240',
                    sales_order_item: selectedOrder.salesOrderItem || '10',
                    material_code: selectedOrder.materialCode,
                    material_description: selectedOrder.materialName,
                    production_type: 'MTO',
                    quantity_tons: selectedOrder.plannedTons,
                    desired_delivery_date: selectedOrder.plannedEnd,
                    technical_standard: 'ABNT NBR 6355 / ASTM A36',
                    requires_ultrasound: true,
                    requires_mechanical_tests: true,
                    validation_status: 'VALIDADO',
                  })
                  setIsSheetOpen(true)
                } else {
                  setDetailModal({ isOpen: true, type: 'ULTRASSOM' })
                }
              }}
              className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-cyan-500 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> US
                </span>
                <Badge className="bg-blue-950 text-cyan-300 text-[9px] border-blue-800">
                  {selectedOrder.requiresUltrasound || isMto ? 'Exigido' : 'Isento'}
                </Badge>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1 truncate">ASME / Phased</span>
            </div>

            {/* Ensaios Mecânicos (EM) */}
            <div
              onClick={async () => {
                const sheet = await qualityService.getRequirementSheetByOrder(
                  selectedOrder.orderNumber,
                )
                if (sheet) {
                  setLoadedSheet(sheet)
                  setIsSheetOpen(true)
                } else if (isMto) {
                  setLoadedSheet({
                    id: 'mto-drawer-em',
                    sheet_code: selectedOrder.sheetCode || `FRS-2026-${selectedOrder.materialCode}`,
                    order_number: selectedOrder.orderNumber,
                    customer_name: selectedOrder.customerName,
                    sales_order_sap: selectedOrder.salesOrderId || '4500981240',
                    sales_order_item: selectedOrder.salesOrderItem || '10',
                    material_code: selectedOrder.materialCode,
                    material_description: selectedOrder.materialName,
                    production_type: 'MTO',
                    quantity_tons: selectedOrder.plannedTons,
                    desired_delivery_date: selectedOrder.plannedEnd,
                    technical_standard: 'ABNT NBR 6355 / ASTM A36',
                    requires_ultrasound: true,
                    requires_mechanical_tests: true,
                    validation_status: 'VALIDADO',
                  })
                  setIsSheetOpen(true)
                } else {
                  setDetailModal({ isOpen: true, type: 'ENSAIOS_MECANICOS' })
                }
              }}
              className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Award className="w-3 h-3 text-indigo-400" /> EM
                </span>
                <Badge className="bg-indigo-950 text-indigo-300 text-[9px] border-indigo-800">
                  {selectedOrder.requiresMechanical ? 'Tração' : 'Padrão'}
                </Badge>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1 truncate">Laudo 3.1</span>
            </div>

            {/* Status Qualidade */}
            <div
              onClick={async () => {
                const sheet = await qualityService.getRequirementSheetByOrder(
                  selectedOrder.orderNumber,
                )
                if (sheet) {
                  setLoadedSheet(sheet)
                  setIsSheetOpen(true)
                } else if (isMto) {
                  setLoadedSheet({
                    id: 'mto-drawer-status',
                    sheet_code: selectedOrder.sheetCode || `FRS-2026-${selectedOrder.materialCode}`,
                    order_number: selectedOrder.orderNumber,
                    customer_name: selectedOrder.customerName,
                    sales_order_sap: selectedOrder.salesOrderId || '4500981240',
                    sales_order_item: selectedOrder.salesOrderItem || '10',
                    material_code: selectedOrder.materialCode,
                    material_description: selectedOrder.materialName,
                    production_type: 'MTO',
                    quantity_tons: selectedOrder.plannedTons,
                    desired_delivery_date: selectedOrder.plannedEnd,
                    technical_standard: 'ABNT NBR 6355 / ASTM A36',
                    requires_ultrasound: true,
                    requires_mechanical_tests: true,
                    validation_status: 'VALIDADO',
                  })
                  setIsSheetOpen(true)
                } else {
                  setDetailModal({ isOpen: true, type: 'STATUS_QUALIDADE' })
                }
              }}
              className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-emerald-500 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Qualidade
                </span>
                <Badge
                  className={`text-[9px] px-1 py-0 ${
                    selectedOrder.qualityStatus === 'APROVADA' ||
                    selectedOrder.qualityStatus === 'LIBERADA'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : selectedOrder.qualityStatus === 'REPROVADA'
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : selectedOrder.qualityStatus === 'DISPONIVEL_INSPECAO' ||
                            selectedOrder.qualityStatus === 'EM_INSPECAO'
                          ? 'bg-blue-950 text-cyan-300 border-blue-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}
                >
                  {selectedOrder.qualityStatus ||
                    (selectedOrder.status === 'COMPLETED' ? 'APROVADA' : 'PROGRAMADA')}
                </Badge>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1 truncate">Ficha & Laudo</span>
            </div>
          </div>
        </div>

        {/* Alerta de Atraso se houver */}
        {selectedOrder.delayMinutes > 0 && (
          <div className="bg-amber-950/40 border border-amber-700 p-3 rounded-lg text-amber-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-300">
                Atraso Projetado: +{selectedOrder.delayMinutes} minutos
              </strong>
              <span>
                Recomendada simulação de realocação ou ajuste de sequência para evitar impacto na
                expedição.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modais de Qualidade */}
      <OrderRequirementSheetModal
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        sheet={loadedSheet}
      />

      <QualityRequirementDetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal((prev) => ({ ...prev, isOpen: false }))}
        productCode={selectedOrder.materialCode}
        productName={selectedOrder.materialName}
        productionType={isMto ? 'MTO' : 'MTS'}
        demandType={detailModal.type}
      />

      {/* Footer Drawer */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setActiveTab('GANTT')
            setSelectedOrder(null)
          }}
          className="border-slate-700 bg-slate-950 text-slate-200 text-xs h-8 gap-1.5"
        >
          <CalendarDays className="w-3.5 h-3.5 text-cyan-400" /> Ver Bloco no Gantt
        </Button>

        <Button
          size="sm"
          onClick={() => {
            setIsSimulatorModalOpen(true)
            setSelectedOrder(null)
          }}
          className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" /> Simular Cenário com Esta OP
        </Button>
      </div>
    </div>
  )
}
