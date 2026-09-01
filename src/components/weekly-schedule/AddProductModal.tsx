/**
 * Modal de Inclusão e Edição de Produtos na Programação Semanal
 * Conformidade com os Requisitos 8 a 16 e 29:
 * 1. Seleção em cascata obrigatória: Linha -> Família -> Produto (produto bloqueado até escolher família)
 * 2. Somente famílias e materiais homologados na Ficha Mestre / SAP
 * 3. Campo "Programar por": [Quantidade] ou [Horário]
 * 4. Cálculo bidirecional integrado com WeeklyScheduleEngine.calculateBidirectionalSchedule
 * 5. Bloqueio claro se não houver cadência na Ficha Mestre (sem valores fictícios)
 * 6. Distinção clara entre campos informados vs calculados (com ícone de calculadora)
 */

import React, { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Package,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Search,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { DAYS_OF_WEEK, WeeklyScheduleItem, OfficialMaterialOption } from '@/types/weekly-schedule'
import { LineOverviewData } from '@/types/line-master'
import { WeeklyScheduleEngine } from '@/services/weekly-schedule-engine'

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (item: Partial<WeeklyScheduleItem>) => void
  lineCode: string
  lineOverview: LineOverviewData | null
  officialMaterials: OfficialMaterialOption[]
  existingItems?: WeeklyScheduleItem[]
  targetDay?: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
  targetShiftCode?: string
  targetShiftName?: string
  targetCrewName?: string
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  lineCode,
  lineOverview,
  officialMaterials,
  existingItems = [],
  targetDay = 'SEG',
  targetShiftCode = 'T1_L1',
  targetShiftName = '1º Turno Matutino',
  targetCrewName = 'Turma A',
}) => {
  // Cascata: 1. Família -> 2. Produto
  const [selectedFamilyCode, setSelectedFamilyCode] = useState<string>('')
  const [selectedMaterial, setSelectedMaterial] = useState<OfficialMaterialOption | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // 3. Programar Por: Quantidade vs Horário
  const [programBy, setProgramBy] = useState<'QUANTITY' | 'TIME'>('QUANTITY')

  // Entradas de Programação
  const [quantityInput, setQuantityInput] = useState<string>('100')
  const [startTimeInput, setStartTimeInput] = useState<string>('06:00')
  const [endTimeInput, setEndTimeInput] = useState<string>('14:20')

  // Dia, Turno e Metadados
  const [selectedDay, setSelectedDay] = useState<
    'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
  >(targetDay)
  const [selectedShift, setSelectedShift] = useState<string>(targetShiftCode)
  const [productionOrder, setProductionOrder] = useState('')
  const [salesOrderMto, setSalesOrderMto] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [orderType, setOrderType] = useState<'MTS' | 'MTO' | 'INDUSTRIALIZACAO'>('MTS')
  const [pcpNotes, setPcpNotes] = useState('')

  // Sincroniza dias/turnos quando props mudarem
  useEffect(() => {
    if (isOpen) {
      setSelectedDay(targetDay)
      setSelectedShift(targetShiftCode)
    }
  }, [isOpen, targetDay, targetShiftCode])

  // 1. Extração de Famílias Únicas Homologadas para esta linha
  const homologatedFamilies = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number }>()
    officialMaterials.forEach((m) => {
      const code = m.family_code || 'GERAL'
      const name = m.family_name || 'Geral'
      const existing = map.get(code)
      if (existing) {
        existing.count += 1
      } else {
        map.set(code, { code, name, count: 1 })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [officialMaterials])

  // 2. Produtos filtrados estritamente pela família selecionada
  const materialsInSelectedFamily = useMemo(() => {
    if (!selectedFamilyCode) return []
    return officialMaterials.filter((m) => m.family_code === selectedFamilyCode)
  }, [officialMaterials, selectedFamilyCode])

  const filteredMaterials = useMemo(() => {
    const s = searchTerm.toLowerCase().trim()
    if (!s) return materialsInSelectedFamily
    return materialsInSelectedFamily.filter(
      (m) =>
        m.material_code.toLowerCase().includes(s) ||
        m.material_name.toLowerCase().includes(s) ||
        (m.dimension_spec && m.dimension_spec.toLowerCase().includes(s)) ||
        (m.steel_grade && m.steel_grade.toLowerCase().includes(s)),
    )
  }, [materialsInSelectedFamily, searchTerm])

  // 3. Cadência Oficial Ficha Mestra
  const materialCadence = useMemo(() => {
    if (!selectedMaterial) return null
    return WeeklyScheduleEngine.getProductivityForMaterialStrict(
      selectedMaterial.material_code,
      lineOverview,
    )
  }, [selectedMaterial, lineOverview])

  // 4. Executa cálculo temporal bidirecional através do motor central
  const calculationResult = useMemo(() => {
    if (!selectedMaterial || materialCadence === null || materialCadence <= 0) {
      return null
    }

    return WeeklyScheduleEngine.calculateBidirectionalSchedule({
      mode: programBy,
      cadenceTh: materialCadence,
      quantityTons: Number(quantityInput) || 0,
      startTime: startTimeInput,
      endTime: endTimeInput,
    })
  }, [selectedMaterial, materialCadence, programBy, quantityInput, startTimeInput, endTimeInput])

  // 5. Validação de Conflito e Sobreposição de Horários
  const overlapValidation = useMemo(() => {
    if (!calculationResult || !calculationResult.isValid) return { hasConflict: false }

    return WeeklyScheduleEngine.validateTimeOverlap({
      items: existingItems,
      dayOfWeek: selectedDay,
      shiftCode: selectedShift,
      startTime: calculationResult.startTime,
      endTime: calculationResult.endTime,
    })
  }, [calculationResult, existingItems, selectedDay, selectedShift])

  const handleApplyNextAvailableTime = () => {
    if (overlapValidation.nextAvailableStartTime) {
      setStartTimeInput(overlapValidation.nextAvailableStartTime)
    }
  }

  // Manipulador de Troca de Família
  const handleFamilyChange = (famCode: string) => {
    setSelectedFamilyCode(famCode)
    setSelectedMaterial(null)
    setSearchTerm('')
  }

  // Manipulador de Troca de Material
  const handleSelectMaterial = (mat: OfficialMaterialOption) => {
    setSelectedMaterial(mat)
    if (mat.default_order_type) {
      setOrderType(mat.default_order_type)
    }
  }

  // Confirmação com Validação
  const handleConfirm = () => {
    if (!selectedMaterial) return
    if (!calculationResult || !calculationResult.isValid) return
    if (overlapValidation.hasConflict) return

    const shifts = lineOverview?.shifts || []
    const shiftObj = shifts.find((s) => s.code === selectedShift)

    // Formata o turno no padrão institucional CIAFAL T1 · Turma X
    const formattedShiftName = WeeklyScheduleEngine.formatShiftDisplay(
      shiftObj?.name || targetShiftName,
      selectedShift,
      targetCrewName,
    )

    onAdd({
      material_code: selectedMaterial.material_code,
      material_description: selectedMaterial.material_name,
      family_code: selectedFamilyCode || selectedMaterial.family_code,
      steel_grade: selectedMaterial.steel_grade || 'SAE 1020',
      dimensions: selectedMaterial.dimension_spec || '50x50 mm #2.00',
      day_of_week: selectedDay,
      shift_code: selectedShift,
      shift_name: formattedShiftName,
      crew_name: targetCrewName || 'Turma A',
      planned_quantity_tons: calculationResult.quantityTons,
      productivity_rate_th: calculationResult.cadenceTh,
      production_hours: calculationResult.durationHours,
      start_datetime: `${selectedDay} ${calculationResult.startTime}`,
      end_datetime: `${selectedDay} ${calculationResult.endTime}`,
      order_type: orderType,
      production_order: productionOrder.trim() || undefined,
      sales_order_mto: salesOrderMto.trim() || undefined,
      customer_name:
        customerName.trim() ||
        (orderType === 'MTO' ? 'Cliente Específico MTO' : 'Mercado Geral (MTS)'),
      pcp_notes: pcpNotes.trim() || undefined,
      item_type: 'PRODUCTION',
      status: 'DRAFT',
      sap_cycle_time_avg_min: selectedMaterial.sap_cycle_time_avg_min ?? null,
      exception_approval_status: 'NONE',
    })

    // Reset de estado
    setSelectedFamilyCode('')
    setSelectedMaterial(null)
    setQuantityInput('100')
    setStartTimeInput('06:00')
    setEndTimeInput('14:20')
    setProductionOrder('')
    setSalesOrderMto('')
    setCustomerName('')
    setPcpNotes('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-white text-slate-900 border-slate-300 shadow-2xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Cabeçalho CIAFAL Pantone 2945 */}
        <div className="bg-[#004C97] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg text-white">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                Programar Produção — Linha {lineCode}
              </DialogTitle>
              <p className="text-xs text-blue-100">
                Motor Temporal Bidirecional (Quantidade ↔ Tempo) com Ficha Mestre Oficial
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 text-xs font-mono">
            CIAFAL PCP
          </Badge>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* ETAPA 1: SELEÇÃO EM CASCATA: FAMÍLIA -> PRODUTO */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-[#004C97]" />
                1. Família de Produto * (Ficha Mestre Linha {lineCode})
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {homologatedFamilies.length} família(s) homologada(s)
              </span>
            </div>

            <Select value={selectedFamilyCode} onValueChange={handleFamilyChange}>
              <SelectTrigger className="text-xs bg-white border-slate-300 h-10 font-medium text-slate-900">
                <SelectValue placeholder="Selecione primeiro a Família de Produto..." />
              </SelectTrigger>
              <SelectContent>
                {homologatedFamilies.map((fam) => (
                  <SelectItem key={fam.code} value={fam.code} className="text-xs">
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-bold text-slate-900">{fam.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({fam.code} • {fam.count} produto(s) homologado(s))
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* SELEÇÃO DO PRODUTO (LIBERADO APENAS APÓS FAMÍLIA) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Package className="w-4 h-4 text-[#004C97]" />
                  2. Produto / Material Oficial SAP *
                </label>
                {selectedFamilyCode ? (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {filteredMaterials.length} produtos disponíveis
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Selecione uma família acima
                  </span>
                )}
              </div>

              {!selectedFamilyCode ? (
                <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center bg-white text-slate-400 text-xs">
                  A lista de produtos fica liberada imediatamente após selecionar a Família de
                  Produto homologada.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      placeholder="Filtrar por código SAP, bitola, aço ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 text-xs bg-white border-slate-300 h-9"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-1.5 bg-white">
                    {filteredMaterials.map((mat) => {
                      const isSelected = selectedMaterial?.material_code === mat.material_code
                      return (
                        <button
                          key={mat.material_code}
                          type="button"
                          onClick={() => handleSelectMaterial(mat)}
                          className={`text-left p-2.5 rounded-md border text-xs transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#004C97] bg-blue-50 ring-2 ring-blue-500/20 shadow-xs'
                              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <span className="font-mono font-bold text-slate-900 block text-xs">
                                {mat.material_code}
                              </span>
                              <span className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 font-medium">
                                {mat.material_name}
                              </span>
                            </div>
                            {isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-[#004C97] shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-200 text-[10px] text-slate-600">
                            <span className="font-mono font-bold text-slate-800">
                              {mat.dimension_spec || '--'}
                            </span>
                            <span>•</span>
                            <span className="font-mono font-bold text-[#004C97]">
                              {mat.productivity_th > 0
                                ? `${mat.productivity_th} t/h`
                                : 'Sem cadência'}
                            </span>
                            {mat.steel_grade && (
                              <>
                                <span>•</span>
                                <span className="bg-slate-200 px-1 rounded text-slate-800 font-mono">
                                  {mat.steel_grade}
                                </span>
                              </>
                            )}
                          </div>

                          {/* DADOS AUTOMÁTICOS SAP/MRP */}
                          <div className="mt-1.5 pt-1 border-t border-dashed border-slate-200 text-[9px] text-slate-500 flex items-center justify-between">
                            {mat.sap_material_code ? (
                              <span>
                                Família:{' '}
                                <strong className="text-slate-700">
                                  {mat.sap_family_code || mat.family_code}
                                </strong>{' '}
                                | Ciclo:{' '}
                                <strong className="text-slate-700">
                                  {mat.sap_cycle_time_avg_min ?? '--'} min
                                </strong>{' '}
                                | <span className="text-blue-700 font-medium">SAP/MRP</span>
                              </span>
                            ) : (
                              <span className="text-amber-700 italic">
                                Dado SAP/MRP não disponível
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DETALHE DOS DADOS AUTOMÁTICOS SAP/MRP QUANDO SELECIONADO (REQUISITO 3) */}
          {selectedMaterial && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-[#004C97]" />
                  Parâmetros de Integração SAP/MRP
                </span>
                <Badge
                  className={
                    selectedMaterial.is_sap_integrated
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]'
                      : 'bg-amber-100 text-amber-800 border-amber-300 text-[10px]'
                  }
                >
                  {selectedMaterial.is_sap_integrated
                    ? 'Sincronizado SAP PP-PI'
                    : 'Dado SAP/MRP não disponível'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[9px] font-sans">Código SAP:</span>
                  <strong>
                    {selectedMaterial.sap_material_code || 'Dado SAP/MRP não disponível'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-sans">Família SAP:</span>
                  <strong>
                    {selectedMaterial.sap_family_code || selectedMaterial.family_code}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-sans">
                    Tempo Médio Ciclo:
                  </span>
                  <strong>
                    {selectedMaterial.sap_cycle_time_avg_min
                      ? `${selectedMaterial.sap_cycle_time_avg_min} min`
                      : 'Dado SAP/MRP não disponível'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-sans">Origem:</span>
                  <span className="text-[#004C97] font-semibold">
                    {selectedMaterial.sap_origin ||
                      (selectedMaterial.is_sap_integrated
                        ? 'SAP/MRP'
                        : 'Dado SAP/MRP não disponível')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ALERTA DE CONFLITO DE HORÁRIO / SOBREPOSIÇÃO (BLOQUEANTE) */}
          {overlapValidation.hasConflict && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-800">Conflito de Horário Detectado</p>
                  <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed font-mono font-bold">
                    {overlapValidation.conflictMessage}
                  </p>
                  <p className="text-[10px] text-rose-600 mt-1">
                    Não é permitido sobrepor itens no mesmo dia e turno. Ajuste o horário ou use a
                    ação rápida abaixo.
                  </p>
                </div>
              </div>

              {overlapValidation.nextAvailableStartTime && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleApplyNextAvailableTime}
                  className="shrink-0 bg-white hover:bg-rose-100 text-rose-900 border-rose-300 text-xs font-bold h-8"
                >
                  Usar próximo horário ({overlapValidation.nextAvailableStartTime})
                </Button>
              )}
            </div>
          )}

          {/* ALERTA DE CADÊNCIA AUSENTE (REQUISITO 29) */}
          {selectedMaterial && (materialCadence === null || materialCadence <= 0) && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-800">Cadência não cadastrada na Ficha Mestre</p>
                <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                  Cadência não cadastrada para este material nesta linha. Atualize a Ficha Mestre
                  antes de concluir a programação.
                </p>
              </div>
            </div>
          )}

          {/* ETAPA 2: MOTOR TEMPORAL BIDIRECIONAL (QUANTIDADE VS HORÁRIO) */}
          {selectedMaterial && materialCadence !== null && materialCadence > 0 && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Calculator className="w-4 h-4 text-[#004C97]" />
                  3. Programar por *
                </label>
                <div className="inline-flex rounded-lg border border-blue-300 bg-white p-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setProgramBy('QUANTITY')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      programBy === 'QUANTITY'
                        ? 'bg-[#004C97] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Quantidade (t &rarr; Tempo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProgramBy('TIME')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      programBy === 'TIME'
                        ? 'bg-[#004C97] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Horário (Tempo &rarr; t)
                  </button>
                </div>
              </div>

              {/* OPÇÃO A: PROGRAMAR POR QUANTIDADE */}
              {programBy === 'QUANTITY' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="space-y-3 bg-white p-3.5 rounded-lg border border-blue-200">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                      Informado pelo PCP:
                    </span>
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Quantidade Programada (t) *
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={quantityInput}
                          onChange={(e) => setQuantityInput(e.target.value)}
                          className="font-mono text-sm font-bold bg-slate-50 border-blue-300 h-9 pr-10 text-slate-900"
                        />
                        <span className="absolute right-3 top-2 font-bold text-xs text-[#004C97]">
                          t
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Hora Inicial (HH:mm) *
                      </label>
                      <Input
                        type="time"
                        value={startTimeInput}
                        onChange={(e) => setStartTimeInput(e.target.value)}
                        className="font-mono text-sm bg-slate-50 border-blue-300 h-9 text-slate-900"
                      />
                    </div>
                  </div>

                  {/* RESULTADOS CALCULADOS */}
                  <div className="bg-white p-3.5 rounded-lg border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-1.5">
                      <span className="flex items-center gap-1 font-bold text-[#004C97]">
                        <Calculator className="w-3.5 h-3.5" />
                        Calculado Automaticamente
                      </span>
                      <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px] font-mono">
                        Ficha Mestre: {materialCadence} t/h
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-sans">Duração:</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {calculationResult?.durationFormatted || '0 min'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          ({calculationResult?.durationHours.toFixed(2)} h)
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-sans">
                          Fim Previsto:
                        </span>
                        <span className="font-bold text-[#004C97] text-sm">
                          {calculationResult?.endTime || '--:--'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          Início: {calculationResult?.startTime || '--:--'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-1 italic leading-tight">
                      Fórmula: Duração = {quantityInput} t ÷ {materialCadence} t/h ={' '}
                      {calculationResult?.durationFormatted}
                    </p>
                  </div>
                </div>
              )}

              {/* OPÇÃO B: PROGRAMAR POR HORÁRIO */}
              {programBy === 'TIME' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="space-y-3 bg-white p-3.5 rounded-lg border border-blue-200">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                      Informado pelo PCP:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1">
                          Hora Inicial *
                        </label>
                        <Input
                          type="time"
                          value={startTimeInput}
                          onChange={(e) => setStartTimeInput(e.target.value)}
                          className="font-mono text-xs bg-slate-50 border-blue-300 h-9 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1">
                          Hora Final *
                        </label>
                        <Input
                          type="time"
                          value={endTimeInput}
                          onChange={(e) => setEndTimeInput(e.target.value)}
                          className="font-mono text-xs bg-slate-50 border-blue-300 h-9 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* RESULTADOS CALCULADOS */}
                  <div className="bg-white p-3.5 rounded-lg border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-1.5">
                      <span className="flex items-center gap-1 font-bold text-[#004C97]">
                        <Calculator className="w-3.5 h-3.5" />
                        Calculado Automaticamente
                      </span>
                      <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px] font-mono">
                        Ficha Mestre: {materialCadence} t/h
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-sans">
                          Tempo Produtivo:
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {calculationResult?.durationFormatted || '0 min'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          ({calculationResult?.durationHours.toFixed(2)} h)
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-sans">
                          Quantidade Prevista:
                        </span>
                        <span className="font-bold text-emerald-800 text-sm">
                          {calculationResult?.quantityTons.toLocaleString('pt-BR')} t
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          Cadência: {materialCadence} t/h
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-1 italic leading-tight">
                      Fórmula: Quantidade = {calculationResult?.durationHours.toFixed(2)} h ×{' '}
                      {materialCadence} t/h = {calculationResult?.quantityTons} t
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 3: DIA, TURNO E METADADOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dia da Semana</label>
              <Select value={selectedDay} onValueChange={(v: any) => setSelectedDay(v)}>
                <SelectTrigger className="text-xs bg-slate-50 border-slate-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.code} value={d.code} className="text-xs">
                      {d.label} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Turno de Produção
              </label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="text-xs bg-slate-50 border-slate-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(lineOverview?.shifts || []).map((s) => (
                    <SelectItem key={s.code} value={s.code} className="text-xs">
                      {WeeklyScheduleEngine.formatShiftDisplay(s.name, s.code, targetCrewName)} (
                      {s.start_time} - {s.end_time})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CLASSIFICAÇÃO MTS / MTO & CAMPOS COMPLEMENTARES */}
          <div className="border-t border-slate-200 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                5. Classificação da Demanda *
              </span>
              <div className="flex items-center gap-1.5">
                {(['MTS', 'MTO', 'INDUSTRIALIZACAO'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOrderType(type)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded border transition-colors ${
                      orderType === type
                        ? 'bg-[#004C97] text-white border-blue-600 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">
                  Ordem de Produção (OP)
                </label>
                <Input
                  placeholder="Ex: OP-2026-8812"
                  value={productionOrder}
                  onChange={(e) => setProductionOrder(e.target.value)}
                  className="text-xs bg-slate-50 border-slate-300 h-8 font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Pedido SAP / MTO</label>
                <Input
                  placeholder="Ex: 4500981240"
                  value={salesOrderMto}
                  onChange={(e) => setSalesOrderMto(e.target.value)}
                  className="text-xs bg-slate-50 border-slate-300 h-8 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Cliente Destino</label>
                <Input
                  placeholder="Ex: Usiminas / Gerdau / Mercado"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="text-xs bg-slate-50 border-slate-300 h-8"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-600 block mb-0.5">
                6. Observações do PCP / Instrução Operacional
              </label>
              <Textarea
                placeholder="Ex: Respeitar resfriamento prévio de tarugo; prioridade comercial contratual..."
                value={pcpNotes}
                onChange={(e) => setPcpNotes(e.target.value)}
                className="text-xs bg-slate-50 border-slate-300 h-14 resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={
              !selectedMaterial ||
              !calculationResult ||
              !calculationResult.isValid ||
              overlapValidation.hasConflict
            }
            className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            Adicionar à Programação &rarr;
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
