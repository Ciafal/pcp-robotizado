import React from 'react'
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Award,
  Package,
  Wrench,
  Microscope,
  Cpu,
  Clock,
  User,
  History,
  X,
} from 'lucide-react'
import { OrderRequirementSheet } from '@/types/product-quality'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface OrderRequirementSheetModalProps {
  isOpen: boolean
  onClose: () => void
  sheet: OrderRequirementSheet | null
}

export const OrderRequirementSheetModal: React.FC<OrderRequirementSheetModalProps> = ({
  isOpen,
  onClose,
  sheet,
}) => {
  if (!sheet) return null

  const isMto = sheet.production_type === 'MTO'
  const isConflict = sheet.validation_status === 'CONFLITO_REQUISITOS'
  const isPendency = sheet.validation_status === 'PENDENCIA_VALIDACAO'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto p-0 shadow-2xl">
        {/* Header Corporativo CIAFAL */}
        <div className="bg-[#004C97] text-white p-5 rounded-t-lg sticky top-0 z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-lg border border-white/20">
                <FileText className="w-6 h-6 text-cyan-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-blue-900/80 px-2 py-0.5 rounded text-cyan-200 border border-blue-700">
                    {sheet.sheet_code || 'FRS-MTO'}
                  </span>
                  <Badge
                    className={`text-[10px] font-bold uppercase ${
                      isMto
                        ? 'bg-purple-900 text-purple-200 border-purple-700'
                        : 'bg-blue-900 text-blue-200 border-blue-700'
                    }`}
                  >
                    {isMto ? 'Make to Order (MTO)' : 'Make to Stock (MTS)'}
                  </Badge>
                  {isConflict ? (
                    <Badge className="bg-rose-900 text-rose-200 border-rose-700 text-[10px] animate-pulse">
                      Conflito de Requisitos
                    </Badge>
                  ) : isPendency ? (
                    <Badge className="bg-amber-900 text-amber-200 border-amber-700 text-[10px]">
                      Pendência de Validação
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-900 text-emerald-200 border-emerald-700 text-[10px]">
                      Requisitos Validados
                    </Badge>
                  )}
                </div>
                <h2 className="text-base font-bold text-white mt-1">
                  Ficha Completa de Requisitos do Pedido &bull; {sheet.material_description}
                </h2>
                <p className="text-xs text-blue-100 font-mono">
                  Código: {sheet.material_code} &bull; Ordem/OP: {sheet.order_number} &bull; Pedido
                  SAP: {sheet.sales_order_sap} (Item {sheet.sales_order_item})
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 text-xs text-slate-800">
          {/* Alerta de Conflito de Requisitos quando aplicável */}
          {isConflict && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-900 text-sm block font-bold">
                  Conflito Técnico Detectado entre Especificações
                </strong>
                <p className="text-rose-700 mt-1">
                  {sheet.validation_pendency_details ||
                    'Há divergência entre as tolerâncias dimensionais da norma técnica e as exigências personalizadas do cliente.'}
                </p>
                <div className="mt-2 text-[11px] font-mono text-rose-800 bg-rose-100 p-2 rounded border border-rose-300">
                  Ação mandatória: Resolução de conflito pela Engenharia de Qualidade antes da
                  liberação fabril.
                </div>
              </div>
            </div>
          )}

          {/* 1. Identificação Comercial e Pedido SAP */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-1.5">
              <Building2 className="w-4 h-4 text-[#004C97]" />
              <span className="uppercase tracking-wider text-[11px]">
                1. Identificação Comercial & Pedido SAP
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Cliente
                </span>
                <strong className="text-slate-900 font-bold block truncate">
                  {sheet.customer_name}
                </strong>
                <span className="text-[10px] font-mono text-slate-500">
                  {sheet.customer_code || 'Cód. SAP'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Sales Order SAP
                </span>
                <strong className="font-mono text-[#004C97] font-bold block">
                  {sheet.sales_order_sap} / Item {sheet.sales_order_item}
                </strong>
                <span className="text-[10px] text-slate-500">Ordem de Venda</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Volume / Quantidade
                </span>
                <strong className="font-mono text-slate-900 font-bold block text-sm">
                  {sheet.quantity_tons.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}{' '}
                  {sheet.unit_of_measure || 't'}
                </strong>
                <span className="text-[10px] text-slate-500">
                  {sheet.quantity_units ? `(${sheet.quantity_units} barras)` : 'Granel'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Datas Comerciais
                </span>
                <span className="text-slate-700 block">
                  Desejada: <strong>{sheet.desired_delivery_date}</strong>
                </span>
                <span className="text-slate-500 block text-[10px]">
                  Confirmada: {sheet.confirmed_delivery_date || sheet.desired_delivery_date}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Prioridade Comercial
                </span>
                <Badge className="bg-slate-200 text-slate-800 text-[10px] font-bold">
                  {sheet.commercial_priority || 'ALTA'}
                </Badge>
              </div>
              <div className="col-span-3">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Representante / Vendedor
                </span>
                <span className="text-slate-800 font-medium">
                  {sheet.sales_representative || 'Equipe Corporativa CIAFAL'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Requisitos Dimensionais */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-1.5">
              <Layers className="w-4 h-4 text-[#004C97]" />
              <span className="uppercase tracking-wider text-[11px]">
                2. Requisitos Dimensionais & Geométricos
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Dimensão Nominal
                </span>
                <strong className="text-slate-900 font-mono font-bold block">
                  {sheet.nominal_dimension || '100x50x3.00 mm'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Tolerâncias Específicas
                </span>
                <strong className="text-slate-800 block text-[11px]">
                  {sheet.dimensional_tolerances || 'Padrão NBR 6355'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Comprimento Comercial
                </span>
                <strong className="font-mono text-slate-900 font-bold block">
                  {sheet.length_meters ? `${sheet.length_meters.toFixed(2)} m` : '6.00 m'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Peso Teórico / Barra
                </span>
                <strong className="font-mono text-slate-900 font-bold block">
                  {sheet.weight_kg_per_piece
                    ? `${sheet.weight_kg_per_piece.toFixed(1)} kg`
                    : '42.0 kg'}
                </strong>
              </div>
              <div className="col-span-4 bg-white p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-bold uppercase">
                  Notas Dimensionais Adicionais:
                </span>
                <span className="text-slate-700">
                  {sheet.dimensional_notes || 'Corte em esquadro sem rebarbas.'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Requisitos Técnicos e Metalúrgicos */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-1.5">
              <Wrench className="w-4 h-4 text-[#004C97]" />
              <span className="uppercase tracking-wider text-[11px]">
                3. Requisitos Técnicos, Grau do Aço & Embalagem
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Norma Técnica Aplicável
                </span>
                <strong className="text-[#004C97] font-bold block">
                  {sheet.technical_standard || 'ABNT NBR 6355 / ASTM A36'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Grau / Classe do Aço
                </span>
                <strong className="text-slate-900 font-bold block">
                  {sheet.steel_grade || 'ASTM A36 / NBR 7007 MR250'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Tratamento Térmico
                </span>
                <span className="text-slate-800">
                  {sheet.heat_treatment || 'Normalizado pós-conformação'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Condição Superficial
                </span>
                <span className="text-slate-800">
                  {sheet.surface_finish_condition || 'Decapado e oleado'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Embalagem Requerida
                </span>
                <span className="text-slate-800">
                  {sheet.packaging_requirements || 'Fardos de 2.5 t com 4 cintas de aço'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Identificação & Rastreabilidade
                </span>
                <span className="text-slate-800">
                  {sheet.marking_identification || 'Etiqueta com código de barras e lote'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Requisitos de Qualidade e Ensaios Obrigatórios */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-1.5">
              <Microscope className="w-4 h-4 text-[#004C97]" />
              <span className="uppercase tracking-wider text-[11px]">
                4. Requisitos de Qualidade, Ultrassom e Ensaios
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Ultrassom */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#004C97]" /> Ensaio de Ultrassom (US)
                  </span>
                  {sheet.requires_ultrasound ? (
                    <Badge className="bg-[#004C97] text-white text-[10px]">Obrigatório</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 text-[10px]">
                      Isento
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-slate-700 space-y-1">
                  <div>
                    Norma US:{' '}
                    <strong>{sheet.ultrasound_standard || 'ASME Sec. V / ASTM E213'}</strong>
                  </div>
                  <div>
                    Inspeção 100% de solda longitudinal. Bloqueante para liberação física e
                    faturamento.
                  </div>
                </div>
              </div>

              {/* Ensaios Mecânicos */}
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-700" /> Ensaios Mecânicos & Químicos
                  </span>
                  {sheet.requires_mechanical_tests ? (
                    <Badge className="bg-indigo-700 text-white text-[10px]">Exige Ensaios</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 text-[10px]">
                      Padrão Corrida
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-slate-700 space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {sheet.requires_mechanical_tests && (
                      <Badge className="bg-white text-indigo-900 border-indigo-300 text-[9px]">
                        Tração
                      </Badge>
                    )}
                    {sheet.requires_mechanical_tests && (
                      <Badge className="bg-white text-indigo-900 border-indigo-300 text-[9px]">
                        Dobramento 180°
                      </Badge>
                    )}
                    {sheet.requires_chemical_analysis && (
                      <Badge className="bg-white text-indigo-900 border-indigo-300 text-[9px]">
                        Análise Química
                      </Badge>
                    )}
                    {sheet.requires_metallography && (
                      <Badge className="bg-white text-indigo-900 border-indigo-300 text-[9px]">
                        Metalografia
                      </Badge>
                    )}
                    {sheet.requires_dimensional_inspection && (
                      <Badge className="bg-white text-indigo-900 border-indigo-300 text-[9px]">
                        Dimensional N2
                      </Badge>
                    )}
                  </div>
                  <div>
                    Certificados Exigidos:{' '}
                    <strong>
                      {sheet.quality_certificates_required?.join(', ') || 'Certificado Tipo 3.1'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Requisitos Especiais do Cliente */}
            {sheet.special_customer_requirements && (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-xs">
                <span className="font-bold block text-[11px] uppercase">
                  Requisitos Especiais do Cliente:
                </span>
                <p className="mt-0.5">{sheet.special_customer_requirements}</p>
              </div>
            )}
          </div>

          {/* 5. Trilha de Auditoria e Origem dos Requisitos */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-1.5">
              <History className="w-4 h-4 text-[#004C97]" />
              <span className="uppercase tracking-wider text-[11px]">
                5. Rastreabilidade da Origem de Requisitos (Governança)
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px] text-slate-700">
              {sheet.requirements_sources_traceability && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    &bull; Cadastro Mestre:{' '}
                    <span className="text-slate-900">
                      {sheet.requirements_sources_traceability.cadastro_mestre || 'PQR Mestre'}
                    </span>
                  </div>
                  <div>
                    &bull; Contrato Cliente:{' '}
                    <span className="text-slate-900">
                      {sheet.requirements_sources_traceability.cadastro_cliente ||
                        'Acordo Homologado'}
                    </span>
                  </div>
                  <div>
                    &bull; Pedido SAP:{' '}
                    <span className="text-slate-900">
                      {sheet.requirements_sources_traceability.pedido_sap || 'Sales Order'}
                    </span>
                  </div>
                  <div>
                    &bull; Procedimento Qualidade:{' '}
                    <span className="text-slate-900">
                      {sheet.requirements_sources_traceability.especificacoes_internas ||
                        'PQ CIAFAL'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200">
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold px-5"
          >
            Fechar Ficha de Requisitos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OrderRequirementSheetModal
