/**
 * MODAL DE INCLUSÃO DE PRODUTO NA PROGRAMAÇÃO SEMANAL (PCP ROBOTIZADO)
 * Atende integralmente às Partes 0, 2, 3, 4 e 5:
 * - Parte 0: Preservação de todos os comportamentos existentes (cálculo temporal, cadência estrita da Ficha Mestre)
 * - Parte 2: Bloco "Estoque & Carteira" imediato após seleção do produto SAP
 *   * Origem SAP / Integração existente (somente leitura)
 *   * Saldo Carteira = Carteira - Estoque ACAB + Estoque SEMI
 *   * Cobertura atual e Cobertura pós-programação
 *   * Situação da cobertura com TEXTO + Status ("Dentro da tolerância", etc.)
 *   * Tratamento de indisponibilidade com as 3 mensagens obrigatórias
 *   * Diferenciação visual entre digitado, SAP e calculado
 * - Parte 3: Seção "Matéria-Prima Programada"
 *   * Tipo de MP, Material MP, Quantidade MP, Rendimento Metálico Previsto (%)
 *   * Cálculo direto: Qtd MP = Prod Boa / Rendimento
 *   * Cálculo inverso: Prod Boa = Qtd MP * Rendimento
 *   * Saldo MP pós-programação = MP disponível - MP necessária com alerta claro de déficit
 * - Parte 4: Tipo de Enfornamento (Somente Laminação: L1 / L2 / LAMINAÇÃO)
 *   * Opções: Frio, Quente, Intercalado, Tapete, Normal
 *   * Busca produtividade ativa por linha + bitola + enfornamento + vigência
 * - Parte 5: Resumo de Impacto antes de salvar e persistência completa
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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
  Flame,
  Boxes,
  Database,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import { DAYS_OF_WEEK, WeeklyScheduleItem, OfficialMaterialOption } from '@/types/weekly-schedule'
import { LineOverviewData } from '@/types/line-master'
import { WeeklyScheduleEngine } from '@/services/weekly-schedule-engine'
import {
  StockCarteiraEngine,
  MaterialStockAndCarteiraData,
  ValueWithAvailability,
} from '@/services/stock-carteira-engine'
import {
  MpProgrammingEngine,
  OfficialMpOption,
  OFFICIAL_MP_TYPES,
} from '@/services/mp-programming-engine'
import {
  EnfornamentoLaminacaoEngine,
  EnfornamentoType,
  ENFORNAMENTO_OPTIONS,
  EnfornamentoProductivityMatch,
} from '@/services/enfornamento-laminacao-engine'

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

  // PARTE 2: ESTOQUE & CARTEIRA
  const [stockCarteiraData, setStockCarteiraData] = useState<MaterialStockAndCarteiraData | null>(
    null,
  )
  const [loadingStockCarteira, setLoadingStockCarteira] = useState<boolean>(false)

  // PARTE 4: ENFORNAMENTO (SOMENTE LAMINAÇÃO)
  const isLaminacao = useMemo(() => {
    const code = (lineCode || '').trim().toUpperCase()
    const desc = (lineOverview?.master?.description || '').toUpperCase()
    return code === 'L1' || code === 'L2' || code.includes('LAM') || desc.includes('LAMINA')
  }, [lineCode, lineOverview])

  const [enfornamentoType, setEnfornamentoType] = useState<EnfornamentoType>('NORMAL')
  const [productivityMatch, setProductivityMatch] = useState<EnfornamentoProductivityMatch | null>(
    null,
  )

  // PARTE 3: MATÉRIA-PRIMA PROGRAMADA
  const [mpOptions, setMpOptions] = useState<OfficialMpOption[]>([])
  const [selectedMpType, setSelectedMpType] = useState<string>('TARUGO 130x130')
  const [selectedMpMaterialCode, setSelectedMpMaterialCode] = useState<string>('')
  const [yieldPctInput, setYieldPctInput] = useState<string>('97.5')
  const [mpQuantityInput, setMpQuantityInput] = useState<string>('102.56')
  const [mpDirectionLock, setMpDirectionLock] = useState<'PROD_TO_MP' | 'MP_TO_PROD'>('PROD_TO_MP')

  // Sincroniza dias/turnos quando props mudarem
  useEffect(() => {
    if (isOpen) {
      setSelectedDay(targetDay)
      setSelectedShift(targetShiftCode)
    }
  }, [isOpen, targetDay, targetShiftCode])

  // Carrega opções de MP quando a linha mudar ou modal abrir
  useEffect(() => {
    if (isOpen) {
      MpProgrammingEngine.fetchOfficialMpOptions(lineCode, lineOverview).then((opts) => {
        setMpOptions(opts)
        if (opts.length > 0 && !selectedMpMaterialCode) {
          setSelectedMpMaterialCode(opts[0].code)
          setSelectedMpType(opts[0].mpType)
          setYieldPctInput(opts[0].defaultYieldPct.toString())
        }
      })
    }
  }, [isOpen, lineCode, lineOverview])

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

  // PARTE 4: Busca de produtividade ativa com base no enfornamento
  useEffect(() => {
    if (isLaminacao && selectedMaterial) {
      EnfornamentoLaminacaoEngine.resolveActiveProductivity({
        lineCode,
        lineOverview,
        materialCode: selectedMaterial.material_code,
        gaugeDimension: selectedMaterial.dimension_spec,
        enfornamentoType,
      }).then((match) => {
        setProductivityMatch(match)
      })
    } else {
      setProductivityMatch(null)
    }
  }, [isLaminacao, selectedMaterial, enfornamentoType, lineCode, lineOverview])

  // 3. Cadência Oficial Ficha Mestra (com ajuste de enfornamento quando aplicável)
  const materialCadence = useMemo(() => {
    if (!selectedMaterial) return null
    if (isLaminacao && productivityMatch && productivityMatch.productivityTh > 0) {
      return productivityMatch.productivityTh
    }
    return WeeklyScheduleEngine.getProductivityForMaterialStrict(
      selectedMaterial.material_code,
      lineOverview,
    )
  }, [selectedMaterial, isLaminacao, productivityMatch, lineOverview])

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

  // Consulta de Estoque e Carteira ao selecionar material ou alterar quantidade
  const plannedTonsNum = calculationResult?.quantityTons ?? (Number(quantityInput) || 0)

  useEffect(() => {
    if (selectedMaterial) {
      setLoadingStockCarteira(true)
      StockCarteiraEngine.fetchMaterialStockAndCarteira({
        materialCode: selectedMaterial.material_code,
        plannedTons: plannedTonsNum,
      })
        .then((data) => {
          setStockCarteiraData(data)
        })
        .finally(() => {
          setLoadingStockCarteira(false)
        })
    } else {
      setStockCarteiraData(null)
    }
  }, [selectedMaterial?.material_code, plannedTonsNum])

  // PARTE 3: Motor Bidirecional de Matéria-Prima
  const currentYield = Number(yieldPctInput) || 97.5

  // Sincroniza Quantidade de MP a partir da Produção Boa (Cálculo Direto)
  useEffect(() => {
    if (mpDirectionLock === 'PROD_TO_MP') {
      const goodProd = calculationResult?.quantityTons ?? (Number(quantityInput) || 0)
      if (goodProd > 0) {
        const calculatedMp = MpProgrammingEngine.calculateMpFromProduction(goodProd, currentYield)
        setMpQuantityInput(calculatedMp.toFixed(2))
      }
    }
  }, [calculationResult?.quantityTons, quantityInput, currentYield, mpDirectionLock])

  // Manipulador de alteração direta da Quantidade de MP (Cálculo Inverso)
  const handleMpQuantityChange = (valStr: string) => {
    setMpDirectionLock('MP_TO_PROD')
    setMpQuantityInput(valStr)
    const valNum = Number(valStr) || 0
    if (valNum > 0 && currentYield > 0) {
      const inverseGoodProd = MpProgrammingEngine.calculateProductionFromMp(valNum, currentYield)
      setQuantityInput(inverseGoodProd.toFixed(2))
    }
  }

  // Material de MP atualmente selecionado
  const currentMpRecord = useMemo(() => {
    return mpOptions.find((o) => o.code === selectedMpMaterialCode) || mpOptions[0] || null
  }, [mpOptions, selectedMpMaterialCode])

  // Saldo de MP pós-programação
  const mpPostBalanceResult = useMemo(() => {
    const needed = Number(mpQuantityInput) || 0
    const available = currentMpRecord?.stockAvailableTons ?? null
    return MpProgrammingEngine.calculateMpPostBalance(available, needed)
  }, [currentMpRecord, mpQuantityInput])

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
    setMpDirectionLock('PROD_TO_MP')
    if (mat.default_order_type) {
      setOrderType(mat.default_order_type)
    }
  }

  // Helper visual para exibir campos de disponibilidade
  const renderFieldWithAvailability = (
    label: string,
    field: ValueWithAvailability<number> | undefined,
    unit: string,
    isCalculated = false,
  ) => {
    if (!field || field.status !== 'AVAILABLE') {
      const msg = field?.statusMessage || 'Dado indisponível — aguardando integração SAP.'
      return (
        <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">
              Origem SAP
            </span>
          </div>
          <p className="text-[11px] text-amber-700 italic mt-1 leading-snug">{msg}</p>
        </div>
      )
    }

    return (
      <div
        className={`rounded p-2.5 border flex flex-col justify-between ${
          isCalculated
            ? 'bg-blue-50/60 border-blue-200 ring-1 ring-blue-300/30'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
              isCalculated
                ? 'bg-blue-100 text-[#004C97] font-semibold'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {isCalculated ? 'Calculado' : 'SAP Oficial'}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-mono text-base font-bold text-slate-900">
            {field.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 font-bold">{unit}</span>
        </div>
      </div>
    )
  }

  // Confirmação com Validação e Persistência Completa (Parte 5)
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
      sap_cycle_time_avg_min:
        stockCarteiraData?.tempoMedioCicloMin?.value ??
        selectedMaterial.sap_cycle_time_avg_min ??
        null,
      exception_approval_status: 'NONE',

      // PARTE 5: Persistência junto ao item programado
      estoque_referencia_consultado: stockCarteiraData?.estoqueAcab?.value ?? null,
      carteira_referencia: stockCarteiraData?.carteira?.value ?? null,
      cobertura_antes_dias: stockCarteiraData?.coverage?.currentCoverageDays ?? null,
      cobertura_depois_dias: stockCarteiraData?.coverage?.postCoverageDays ?? null,
      situacao_cobertura: stockCarteiraData?.coverage?.situationText || 'Indisponível para cálculo',

      raw_material_type: selectedMpType,
      raw_material_material_code: selectedMpMaterialCode,
      raw_material_planned_tons: Number(mpQuantityInput) || 0,
      raw_material_yield_pct: currentYield,
      raw_material_available_tons: currentMpRecord?.stockAvailableTons ?? null,

      enfornamento_type: isLaminacao ? enfornamentoType : undefined,
      productivity_applied_source:
        isLaminacao && productivityMatch ? productivityMatch.notes : undefined,
      query_timestamp: stockCarteiraData?.calculationTimestamp || new Date().toISOString(),
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
    setStockCarteiraData(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-white text-slate-900 border-slate-300 shadow-2xl p-0 overflow-hidden max-h-[94vh] flex flex-col">
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
                Motor Temporal Bidirecional • Integração SAP Oficial • Validação MP & Enfornamento
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 text-xs font-mono">
            CIAFAL PCP • PRD
          </Badge>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
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
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PARTE 2: BLOCO ESTOQUE & CARTEIRA (EXIBIDO IMEDIATAMENTE APÓS SELECIONAR PRODUTO) */}
          {selectedMaterial && (
            <div className="bg-white border-2 border-[#004C97]/30 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#004C97]" />
                  <span className="font-bold text-xs uppercase tracking-wide text-slate-900">
                    Estoque & Carteira — Material {selectedMaterial.material_code}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-mono">
                    Fonte Oficial SAP ZSD28C
                  </Badge>
                  {loadingStockCarteira && (
                    <span className="text-[10px] text-slate-500 animate-pulse">
                      Sincronizando...
                    </span>
                  )}
                </div>
              </div>

              {/* Guia de Legenda Visual (Diferenciação Visual Obrigatória) */}
              <div className="flex items-center gap-4 text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <span className="font-bold text-slate-700">Legenda de Origem:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-white border border-slate-300" />
                  Origem SAP Oficial (Somente Leitura)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-300" />
                  Calculado Automaticamente
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-400" />
                  Indisponível / Aguardando SAP
                </span>
              </div>

              {/* Grid com os 9 Campos Obrigatórios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* 1. Estoque ACAB */}
                {renderFieldWithAvailability(
                  '1. Estoque ACAB',
                  stockCarteiraData?.estoqueAcab,
                  't',
                  false,
                )}

                {/* 2. Estoque SEMI */}
                {renderFieldWithAvailability(
                  '2. Estoque SEMI',
                  stockCarteiraData?.estoqueSemi,
                  't',
                  false,
                )}

                {/* 3. Carteira */}
                {renderFieldWithAvailability(
                  '3. Carteira Total',
                  stockCarteiraData?.carteira,
                  't',
                  false,
                )}

                {/* 4. Saldo Carteira (Carteira − Estoque ACAB + Estoque SEMI) */}
                {renderFieldWithAvailability(
                  '4. Saldo Carteira',
                  stockCarteiraData?.saldoCarteira,
                  't',
                  true,
                )}

                {/* 5. Média diária de faturamento */}
                {renderFieldWithAvailability(
                  '5. Média Diária Fat.',
                  stockCarteiraData?.mediaDiariaFaturamentoTDia,
                  't/dia',
                  false,
                )}

                {/* 6. Tempo médio de ciclo */}
                {renderFieldWithAvailability(
                  '6. Tempo Médio Ciclo',
                  stockCarteiraData?.tempoMedioCicloMin,
                  'min',
                  false,
                )}

                {/* 7. Cobertura atual */}
                <div className="bg-blue-50/60 border border-blue-200 rounded p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      7. Cobertura Atual
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-[#004C97] font-semibold">
                      Calculado
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-mono text-base font-bold text-slate-900">
                      {stockCarteiraData?.coverage?.currentCoverageDays !== null &&
                      stockCarteiraData?.coverage?.currentCoverageDays !== undefined
                        ? stockCarteiraData.coverage.currentCoverageDays.toFixed(1)
                        : '--'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">dias</span>
                  </div>
                </div>

                {/* 8. Cobertura pós-programação */}
                <div className="bg-blue-50/60 border border-blue-200 rounded p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      8. Cobertura Pós-Prog.
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-[#004C97] font-semibold">
                      Calculado
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-mono text-base font-bold text-[#004C97]">
                      {stockCarteiraData?.coverage?.postCoverageDays !== null &&
                      stockCarteiraData?.coverage?.postCoverageDays !== undefined
                        ? stockCarteiraData.coverage.postCoverageDays.toFixed(1)
                        : '--'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">dias</span>
                  </div>
                </div>

                {/* 9. Situação da cobertura (TEXTO + STATUS EXPLÍCITO) */}
                <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      9. Situação Cobertura
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-medium">
                      Faixa: 5-8 dias
                    </span>
                  </div>
                  <div className="mt-1">
                    <Badge
                      className={`text-[10px] font-bold px-2 py-0.5 ${
                        stockCarteiraData?.coverage?.situationStatus === 'WITHIN_TOLERANCE'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : stockCarteiraData?.coverage?.situationStatus === 'BELOW_MIN'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : stockCarteiraData?.coverage?.situationStatus === 'ABOVE_MAX'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      {stockCarteiraData?.coverage?.situationText || 'Indisponível para cálculo'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PARTE 4: TIPO DE ENFORNAMENTO (SOMENTE PARA LAMINAÇÃO L1 / L2) */}
          {isLaminacao && selectedMaterial && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-amber-700" />
                  Tipo de Enfornamento (Exclusivo Laminação {lineCode}) *
                </label>
                <span className="text-[10px] font-mono text-amber-800">
                  Regime Térmico Forno de Reaquecimento
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {ENFORNAMENTO_OPTIONS.map((opt) => {
                  const isChosen = enfornamentoType === opt.code
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setEnfornamentoType(opt.code)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isChosen
                          ? 'bg-amber-100 border-amber-600 ring-2 ring-amber-500/20 font-bold text-amber-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50/50'
                      }`}
                    >
                      <div className="text-xs flex items-center justify-between">
                        <span>{opt.label}</span>
                        {isChosen && <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />}
                      </div>
                      <p className="text-[9px] text-slate-500 mt-1 line-clamp-1">
                        {opt.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              {productivityMatch && (
                <div className="text-[11px] text-amber-900 bg-white/80 p-2 rounded border border-amber-200 flex items-center justify-between">
                  <span>
                    Produtividade ativa aplicada:{' '}
                    <strong className="font-mono">{productivityMatch.productivityTh} t/h</strong> (
                    {productivityMatch.notes})
                  </span>
                  <Badge variant="outline" className="text-[9px] border-amber-400 text-amber-800">
                    Fonte: {productivityMatch.source}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* PARTE 3: SEÇÃO MATÉRIA-PRIMA PROGRAMADA */}
          {selectedMaterial && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Boxes className="w-4 h-4 text-[#004C97]" />
                  Matéria-Prima Programada
                </label>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-mono">
                    Cálculo Direto / Inverso
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Tipo de MP */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Tipo de MP *
                  </label>
                  <Select value={selectedMpType} onValueChange={setSelectedMpType}>
                    <SelectTrigger className="text-xs bg-white border-slate-300 h-9 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OFFICIAL_MP_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Material MP */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Material MP (SAP/Ficha Mestre) *
                  </label>
                  <Select
                    value={selectedMpMaterialCode}
                    onValueChange={(code) => {
                      setSelectedMpMaterialCode(code)
                      const found = mpOptions.find((o) => o.code === code)
                      if (found) {
                        setSelectedMpType(found.mpType)
                        setYieldPctInput(found.defaultYieldPct.toString())
                      }
                    }}
                  >
                    <SelectTrigger className="text-xs bg-white border-slate-300 h-9 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mpOptions.map((o) => (
                        <SelectItem key={o.code} value={o.code} className="text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold">{o.code}</span>
                            <span className="text-[10px] text-slate-500">
                              {o.description} ({o.supplierName || 'Padrão'})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Rendimento Metálico Previsto (%) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Rendimento Previsto (%) *
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="50"
                      max="100"
                      value={yieldPctInput}
                      onChange={(e) => {
                        setYieldPctInput(e.target.value)
                        setMpDirectionLock('PROD_TO_MP')
                      }}
                      className="font-mono text-xs bg-white border-slate-300 h-9 pr-8"
                    />
                    <span className="absolute right-2.5 top-2 font-bold text-xs text-slate-500">
                      %
                    </span>
                  </div>
                </div>

                {/* 4. Quantidade MP */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Quantidade MP Necessária (t) *
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      value={mpQuantityInput}
                      onChange={(e) => handleMpQuantityChange(e.target.value)}
                      className="font-mono text-xs font-bold text-[#004C97] bg-white border-blue-300 h-9 pr-8"
                    />
                    <span className="absolute right-2.5 top-2 font-bold text-xs text-[#004C97]">
                      t
                    </span>
                  </div>
                </div>
              </div>

              {/* Saldo de MP pós-programação e Alerta de Déficit */}
              <div className="pt-2 border-t border-slate-200">
                {mpPostBalanceResult.hasDeficit ? (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg flex items-start gap-2.5 text-xs text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{mpPostBalanceResult.warningMessage}</span>
                      <p className="text-[10px] text-rose-700 mt-0.5">
                        O PCP pode prosseguir com a programação caso haja recebimento de MP previsto
                        ou autorização de liderança.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 flex items-center justify-between bg-white p-2.5 rounded border border-slate-200">
                    <span>
                      Saldo MP pós-programação:{' '}
                      <strong className="text-slate-900 font-mono">
                        {mpPostBalanceResult.balanceTons !== null
                          ? `${mpPostBalanceResult.balanceTons.toFixed(2)} t`
                          : 'Dado de saldo MP aguardando integração SAP/WMS'}
                      </strong>
                    </span>
                    <span className="text-[10px] text-slate-500 italic">
                      Fórmula: MP Necessária = Produção Boa (
                      {calculationResult?.quantityTons || quantityInput} t) ÷ {currentYield}% ={' '}
                      {mpQuantityInput} t
                    </span>
                  </div>
                )}
              </div>
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

          {/* PARTE 5: RESUMO DE IMPACTO ANTES DE SALVAR (OBRIGATÓRIO) */}
          {selectedMaterial && calculationResult && calculationResult.isValid && (
            <div className="bg-slate-900 text-white rounded-xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-100">
                    Resumo de Impacto da Programação
                  </span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  Auditoria Automática Pré-Gravação
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Produto / Quantidade:</span>
                  <span className="font-bold text-white">
                    {selectedMaterial.material_code} ({calculationResult.quantityTons} t)
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Tempo Previsto:</span>
                  <span className="font-bold text-white">
                    {calculationResult.durationFormatted} ({calculationResult.startTime} -{' '}
                    {calculationResult.endTime})
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Linha / Data / Turno:</span>
                  <span className="font-bold text-white">
                    Linha {lineCode} • {selectedDay} • {selectedShift}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Turma Operacional:</span>
                  <span className="font-bold text-white">{targetCrewName || 'Turma A'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Carteira / Estoque Atual:
                  </span>
                  <span className="font-bold text-white">
                    {stockCarteiraData?.carteira?.value !== null &&
                    stockCarteiraData?.carteira?.value !== undefined
                      ? `${stockCarteiraData.carteira.value} t`
                      : 'N/D'}{' '}
                    /{' '}
                    {stockCarteiraData?.estoqueAcab?.value !== null &&
                    stockCarteiraData?.estoqueAcab?.value !== undefined
                      ? `${stockCarteiraData.estoqueAcab.value} t`
                      : 'N/D'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">MP Necessária / Disp.:</span>
                  <span className="font-bold text-white">
                    {mpQuantityInput} t /{' '}
                    {currentMpRecord?.stockAvailableTons !== null &&
                    currentMpRecord?.stockAvailableTons !== undefined
                      ? `${currentMpRecord.stockAvailableTons} t`
                      : 'N/D'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Rendimento Metálico:</span>
                  <span className="font-bold text-white">{currentYield}%</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Cobertura Antes &rarr; Depois:
                  </span>
                  <span className="font-bold text-blue-300">
                    {stockCarteiraData?.coverage?.currentCoverageDays ?? '--'}d &rarr;{' '}
                    {stockCarteiraData?.coverage?.postCoverageDays ?? '--'}d (
                    {stockCarteiraData?.coverage?.situationText || 'N/D'})
                  </span>
                </div>
              </div>
            </div>
          )}
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
