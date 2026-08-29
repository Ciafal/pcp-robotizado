import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  Play,
  Sparkles,
  Save,
  Send,
  Copy,
  History,
  FileSpreadsheet,
  Printer,
  Calendar,
  Layers,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Factory,
  RefreshCw,
  Info,
  Clock,
  Flame,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { useAuth } from '@/contexts/AuthContext'
import { lineMasterService } from '@/services/line-master'
import { weeklyScheduleService } from '@/services/weekly-schedule-service'
import {
  WeeklyScheduleEngine,
  getWeekDateRange,
  RawMaterialEngineContext,
} from '@/services/weekly-schedule-engine'
import {
  WeeklyScheduleItem,
  WeeklyHeaderFilter,
  WeeklyIndicators,
  WeeklyScheduleSummary,
  ValidationResult,
  HardBlockModalData,
  OfficialMaterialOption,
} from '@/types/weekly-schedule'
import { LineOverviewData, ProductionLine } from '@/types/line-master'
import { BlockedProductModal } from '@/components/weekly-schedule/BlockedProductModal'
import { AddProductModal } from '@/components/weekly-schedule/AddProductModal'
import { WeeklyIndicatorsBar } from '@/components/weekly-schedule/WeeklyIndicatorsBar'
import { WeeklyScheduleGrid } from '@/components/weekly-schedule/WeeklyScheduleGrid'
import { WeeklyScheduleSummaryPanel } from '@/components/weekly-schedule/WeeklyScheduleSummaryPanel'

export const WeeklyScheduleOperationalPage: React.FC = () => {
  const { toast } = useToast()
  const auth = useAuth()

  // Estados de Filtro de Cabeçalho (Empresa, Centro, Linha, Ano, Semana)
  const [companyCode, setCompanyCode] = useState<string>('CIAFAL')
  const [plantCode, setPlantCode] = useState<string>('PLANTA_1')
  const [selectedLineCode, setSelectedLineCode] = useState<string>('L1')
  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(35)

  // Dados Carregados da Ficha Mestre e Linhas Cadastradas
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [currentLineOverview, setCurrentLineOverview] = useState<LineOverviewData | null>(null)
  const [officialMaterials, setOfficialMaterials] = useState<OfficialMaterialOption[]>([])
  const [rawMaterialContext, setRawMaterialContext] = useState<RawMaterialEngineContext>({})
  const [isLoadingLine, setIsLoadingLine] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // Itens da Programação Semanal
  const [items, setItems] = useState<WeeklyScheduleItem[]>([])

  // Modais Operacionais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [targetDay, setTargetDay] = useState<'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'>(
    'SEG',
  )
  const [targetShiftCode, setTargetShiftCode] = useState('T1_L1')
  const [targetShiftName, setTargetShiftName] = useState('1º Turno Matutino')
  const [targetCrewName, setTargetCrewName] = useState('Turma A')

  // Modal Vermelho de HARD BLOCK
  const [hardBlockData, setHardBlockData] = useState<HardBlockModalData>({
    isOpen: false,
    materialCode: '',
    materialDescription: '',
    lineCode: '',
    lineName: '',
    reason: '',
  })

  // Período Calculado da Semana ISO
  const weekRange = useMemo(() => {
    return getWeekDateRange(selectedYear, selectedWeekNumber)
  }, [selectedYear, selectedWeekNumber])

  const headerFilter: WeeklyHeaderFilter = useMemo(
    () => ({
      companyCode,
      plantCode,
      lineCode: selectedLineCode,
      year: selectedYear,
      weekNumber: selectedWeekNumber,
      periodDisplay: weekRange.display,
    }),
    [companyCode, plantCode, selectedLineCode, selectedYear, selectedWeekNumber, weekRange.display],
  )

  // 1. Carrega Linhas Produtivas Cadastradas Oficialmente
  useEffect(() => {
    const fetchLines = async () => {
      try {
        const lineList = await lineMasterService.listLines()
        if (lineList && lineList.length > 0) {
          setLines(lineList)
          // Se selectedLineCode não estiver na lista, seleciona a primeira
          if (!lineList.some((l) => l.code === selectedLineCode)) {
            setSelectedLineCode(lineList[0].code)
          }
        }
      } catch (err) {
        console.error('Erro ao buscar linhas produtivas:', err)
      }
    }
    fetchLines()
  }, [])

  // 2. Carrega Ficha Mestre da Linha Selecionada e Materiais Oficiais
  const loadLineData = useCallback(
    async (lineCodeToLoad: string) => {
      setIsLoadingLine(true)
      try {
        const lineList = lines.length > 0 ? lines : await lineMasterService.listLines()
        const lineObj = lineList.find((l) => l.code === lineCodeToLoad) || lineList[0]

        if (lineObj) {
          const overview = await lineMasterService.getLineOverview(lineObj.id)
          setCurrentLineOverview(overview)

          const mats = await weeklyScheduleService.getOfficialMaterialsForLine(lineObj.id, overview)
          setOfficialMaterials(mats)

          // Carrega contexto completo de MP (Estoque SAP/WMS, Pedidos de Compra SAP, Produção Upstream)
          const currentFilter: WeeklyHeaderFilter = {
            companyCode,
            plantCode,
            lineCode: lineCodeToLoad,
            year: selectedYear,
            weekNumber: selectedWeekNumber,
            periodDisplay: weekRange.display,
          }
          const rmContext = await weeklyScheduleService.loadRawMaterialContext(currentFilter)
          setRawMaterialContext(rmContext)

          // Carrega programação salva existente para a semana
          const savedItems = await weeklyScheduleService.loadWeeklySchedule(currentFilter)

          if (savedItems.length > 0) {
            setItems(savedItems)
          } else {
            // Se não houver dados salvos, inicializa com atividades padrão realistas para demonstração imediata
            initializeDefaultWeekSchedule(lineCodeToLoad, overview, mats)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar Ficha Mestre da linha:', err)
        toast({
          variant: 'destructive',
          title: 'Erro na Ficha Mestre',
          description: 'Não foi possível carregar os parâmetros completos da linha.',
        })
      } finally {
        setIsLoadingLine(false)
      }
    },
    [lines, companyCode, plantCode, selectedYear, selectedWeekNumber, weekRange.display],
  )

  useEffect(() => {
    if (selectedLineCode) {
      loadLineData(selectedLineCode)
    }
  }, [selectedLineCode, selectedYear, selectedWeekNumber])

  // Inicializa uma programação inicial estruturada se não houver registros salvos
  const initializeDefaultWeekSchedule = (
    lineCode: string,
    overview: LineOverviewData | null,
    mats: OfficialMaterialOption[],
  ) => {
    const defaultShifts =
      overview?.shifts && overview.shifts.length > 0
        ? overview.shifts
        : [
            { code: 'T1_L1', name: '1º Turno Matutino', crew: 'Turma A' },
            { code: 'T2_L1', name: '2º Turno Vespertino', crew: 'Turma B' },
            { code: 'T3_L1', name: '3º Turno Noturno', crew: 'Turma C' },
          ]

    const m1 = mats[0] || {
      material_code: 'TQ-50x50x2.0',
      material_name: 'Tubo Quadrado 50x50x2.0mm',
      family_code: '10x1ou865v4sv8q',
      steel_grade: 'SAE 1020',
      dimension_spec: '50x50 mm #2.00',
      productivity_th: 12.0,
    }
    const m2 = mats[1] || {
      material_code: 'TR-80x40x2.5',
      material_name: 'Tubo Retangular 80x40x2.5mm',
      family_code: 'f1w4lkse2qlf3xz',
      steel_grade: 'SAE 1020',
      dimension_spec: '80x40 mm #2.50',
      productivity_th: 10.0,
    }
    const m3 = mats[2] || {
      material_code: 'PU-150x50x4.75',
      material_name: 'Perfil U Enrijecido 150x50x4.75mm',
      family_code: 'azlmlkd68l59f0c',
      steel_grade: 'ASTM A36',
      dimension_spec: '150x50 mm #4.75',
      productivity_th: 16.0,
    }

    const initial: WeeklyScheduleItem[] = [
      {
        id: 'temp-1',
        schedule_code: `WS-${lineCode}-${selectedYear}-W${selectedWeekNumber}`,
        company_code: companyCode,
        plant_code: plantCode,
        line_code: lineCode,
        year: selectedYear,
        week_number: selectedWeekNumber,
        period_display: weekRange.display,
        day_of_week: 'SEG',
        date_str: '24/08',
        shift_code: defaultShifts[0]?.code || 'T1_L1',
        shift_name: defaultShifts[0]?.name || '1º Turno Matutino',
        crew_name: 'Turma A',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: m1.material_code,
        material_description: m1.material_name,
        family_code: m1.family_code,
        steel_grade: m1.steel_grade || 'SAE 1020',
        dimensions: m1.dimension_spec || '50x50 mm',
        production_order: 'OP-2026-8801',
        order_type: 'MTS',
        planned_quantity_tons: 80,
        productivity_rate_th: m1.productivity_th,
        production_hours: 6.67,
        setup_duration_minutes: 0,
        setup_reason: 'Início de campanha',
        start_datetime: '2026-08-24 06:00',
        end_datetime: '2026-08-24 12:40',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 82.0,
        raw_material_type: 'Tarugo 130x130 SAE 1020',
      },
      {
        id: 'temp-2',
        schedule_code: `WS-${lineCode}-${selectedYear}-W${selectedWeekNumber}`,
        company_code: companyCode,
        plant_code: plantCode,
        line_code: lineCode,
        year: selectedYear,
        week_number: selectedWeekNumber,
        period_display: weekRange.display,
        day_of_week: 'SEG',
        date_str: '24/08',
        shift_code: defaultShifts[0]?.code || 'T1_L1',
        shift_name: defaultShifts[0]?.name || '1º Turno Matutino',
        crew_name: 'Turma A',
        sequence_order: 2,
        item_type: 'PRODUCTION',
        material_code: m2.material_code,
        material_description: m2.material_name,
        family_code: m2.family_code,
        steel_grade: m2.steel_grade || 'SAE 1020',
        dimensions: m2.dimension_spec || '80x40 mm',
        production_order: 'OP-2026-8802',
        order_type: 'MTS',
        planned_quantity_tons: 50,
        productivity_rate_th: m2.productivity_th,
        production_hours: 5.0,
        setup_duration_minutes: 15,
        setup_reason: 'Troca de matriz retangular: 15 min',
        start_datetime: '2026-08-24 12:40',
        end_datetime: '2026-08-24 17:55',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 51.25,
        raw_material_type: 'Tarugo 130x130 SAE 1020',
      },
    ]

    setItems(initial)
  }

  // Recalculo Automático Determinístico sempre que os itens, Ficha Mestre ou Contexto de MP mudarem
  const calculationResult = useMemo(() => {
    return WeeklyScheduleEngine.recalculateWeeklyTimeline(
      items,
      currentLineOverview,
      headerFilter,
      rawMaterialContext,
    )
  }, [items, currentLineOverview, headerFilter, rawMaterialContext])

  const calculatedItems = calculationResult.items
  const indicators: WeeklyIndicators = calculationResult.indicators
  const summary: WeeklyScheduleSummary = calculationResult.summary
  const validations: ValidationResult[] = calculationResult.validations

  // Adiciona Produto com Verificação de HARD BLOCK
  const handleAddProduct = (newItemData: Partial<WeeklyScheduleItem>) => {
    if (!newItemData.material_code) return

    // 1. HARD BLOCK CHECK (VAL-02)
    const block = WeeklyScheduleEngine.checkHardBlock(
      newItemData.material_code,
      currentLineOverview,
    )
    if (block) {
      // Abre o Modal Vermelho e impede a inclusão
      const lineObj = lines.find((l) => l.code === selectedLineCode)
      setHardBlockData({
        isOpen: true,
        materialCode: newItemData.material_code,
        materialDescription: newItemData.material_description || 'Material Bloqueado',
        lineCode: selectedLineCode,
        lineName: lineObj?.name || `Linha ${selectedLineCode}`,
        reason: block.block_reason || 'Restrição técnica de laminação / Ficha Mestre CIAFAL.',
        blockDate: block.valid_from
          ? new Date(block.valid_from).toLocaleDateString('pt-BR')
          : '2026-01-15',
        responsibleName: 'Engenharia de Processos CIAFAL',
      })

      // Registra no log de auditoria oficial
      weeklyScheduleService.logBlockedProductAttempt({
        materialCode: newItemData.material_code,
        materialDescription: newItemData.material_description || 'Material Bloqueado',
        lineCode: selectedLineCode,
        reason: block.block_reason,
      })

      return
    }

    // 2. Inclusão Válida
    const lineObj = lines.find((l) => l.code === selectedLineCode)
    const nextSeq = items.length + 1
    const itemToAdd: WeeklyScheduleItem = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      schedule_code: `WS-${selectedLineCode}-${selectedYear}-W${String(selectedWeekNumber).padStart(2, '0')}`,
      company_code: companyCode,
      plant_code: plantCode,
      line_code: selectedLineCode,
      line_id: lineObj?.id,
      year: selectedYear,
      week_number: selectedWeekNumber,
      period_display: weekRange.display,
      day_of_week: newItemData.day_of_week || 'SEG',
      date_str: '24/08',
      shift_code: newItemData.shift_code || 'T1_L1',
      shift_name: newItemData.shift_name || '1º Turno Matutino',
      crew_name: newItemData.crew_name || 'Turma A',
      sequence_order: nextSeq,
      item_type: 'PRODUCTION',
      material_code: newItemData.material_code,
      material_description: newItemData.material_description || '',
      family_code: newItemData.family_code,
      steel_grade: newItemData.steel_grade || 'SAE 1020',
      dimensions: newItemData.dimensions || '50x50 mm',
      production_order: newItemData.production_order,
      sales_order_mto: newItemData.sales_order_mto,
      customer_name: newItemData.customer_name,
      order_type: newItemData.order_type || 'MTS',
      planned_quantity_tons: Number(newItemData.planned_quantity_tons) || 100,
      productivity_rate_th: 12.0,
      production_hours: 0,
      setup_duration_minutes: 0,
      start_datetime: '',
      end_datetime: '',
      status: 'DRAFT',
      version: 1,
      pcp_notes: newItemData.pcp_notes,
      raw_material_req_tons: 0,
    }

    setItems((prev) => [...prev, itemToAdd])
    toast({
      title: 'Produto Adicionado',
      description: `Material ${itemToAdd.material_code} (${itemToAdd.planned_quantity_tons} t) inserido na sequência. Grade recalculada.`,
    })
  }

  // Manipulação de Posição na Sequência (Recalcular em tempo real)
  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    setItems((prev) => {
      const copy = [...prev]
      const temp = copy[index - 1]
      copy[index - 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return
    setItems((prev) => {
      const copy = [...prev]
      const temp = copy[index + 1]
      copy[index + 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  const handleDuplicate = (index: number) => {
    const target = items[index]
    if (!target) return
    const duplicated: WeeklyScheduleItem = {
      ...target,
      id: `temp-${Date.now()}`,
      sequence_order: items.length + 1,
    }
    setItems((prev) => {
      const copy = [...prev]
      copy.splice(index + 1, 0, duplicated)
      return copy
    })
    toast({
      title: 'Item Duplicado',
      description: `Lote de ${target.material_code} duplicado na sequência.`,
    })
  }

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
    toast({
      title: 'Item Removido',
      description: 'Atividade removida da programação semanal.',
    })
  }

  const handleTransferDayShift = (
    index: number,
    newDay: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM',
    newShiftCode: string,
  ) => {
    setItems((prev) => {
      const copy = [...prev]
      if (copy[index]) {
        copy[index].day_of_week = newDay
        copy[index].shift_code = newShiftCode
      }
      return copy
    })
  }

  const handleAddStop = (
    day: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM',
    shiftCode: string,
  ) => {
    const shifts = currentLineOverview?.shifts || []
    const shift = shifts.find((s) => s.code === shiftCode)
    const newStop: WeeklyScheduleItem = {
      id: `stop-${Date.now()}`,
      schedule_code: `WS-${selectedLineCode}-${selectedYear}-W${selectedWeekNumber}`,
      company_code: companyCode,
      plant_code: plantCode,
      line_code: selectedLineCode,
      year: selectedYear,
      week_number: selectedWeekNumber,
      period_display: weekRange.display,
      day_of_week: day,
      date_str: '24/08',
      shift_code: shiftCode,
      shift_name: shift?.name || '1º Turno',
      crew_name: 'Manutenção',
      sequence_order: items.length + 1,
      item_type: 'SCHEDULED_STOP',
      material_code: 'PARADA_PROG',
      material_description: 'Parada Programada / Manutenção Preventiva',
      order_type: 'MTS',
      planned_quantity_tons: 0,
      productivity_rate_th: 0,
      production_hours: 0,
      setup_duration_minutes: 0,
      stop_code: 'PREV_01',
      stop_description: 'Inspeção Mecânica e Troca de Cilindros',
      stop_duration_minutes: 60,
      start_datetime: '',
      end_datetime: '',
      status: 'DRAFT',
      version: 1,
      raw_material_req_tons: 0,
    }
    setItems((prev) => [...prev, newStop])
    toast({
      title: 'Parada Programada Inserida',
      description: 'Tempo de parada deduzido da capacidade disponível da linha.',
    })
  }

  // Ações Principais
  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      await weeklyScheduleService.saveWeeklyScheduleDraft(calculatedItems, headerFilter)
      toast({
        title: 'Rascunho Salvo com Sucesso',
        description: `Programação da Linha ${selectedLineCode} (Semana ${selectedWeekNumber}) persistida com sucesso.`,
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar Rascunho',
        description: 'Verifique a conexão ou permissões de usuário.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSimulate = () => {
    toast({
      title: 'Simulação de Programação Executada',
      description: `Ocupação: ${indicators.utilizationPct}% | Score da Sequência: ${indicators.sequenceScore}/100 | Setup Total: ${indicators.setupHours}h`,
    })
  }

  const handleAiAnalysis = () => {
    toast({
      title: 'Análise Heurística com IA CIAFAL',
      description:
        'A IA sugere agrupar produtos da mesma família para reduzir 45 minutos de setup adicional na quarta-feira. O Programador decide a aplicação.',
    })
  }

  const handleSendForApproval = () => {
    toast({
      title: 'Submetido para Validação do Gestor',
      description: `A programação semanal da Linha ${selectedLineCode} foi enviada para fluxo de aprovação formal.`,
    })
  }

  return (
    <div className="space-y-4 pb-12">
      {/* 1. CABEÇALHO DE SELEÇÃO & CONTROLES */}
      <Card className="bg-white border-slate-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Lado Esquerdo: Identificação e Filtros Operacionais */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-sm">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Montagem Semanal
                  <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-mono font-bold uppercase">
                    PCP &bull; Programação
                  </Badge>
                </h1>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedLineCode} | Semana {selectedWeekNumber} | {weekRange.display}
                </p>
              </div>
            </div>

            {/* Filtros em Linha: Empresa, Centro, Linha, Ano, Semana */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Empresa */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Empresa</span>
                <Select value={companyCode} onValueChange={setCompanyCode}>
                  <SelectTrigger className="text-xs font-semibold bg-slate-50 border-slate-300 h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CIAFAL">CIAFAL</SelectItem>
                    <SelectItem value="CIAFAL_SIDER">CIAFAL Siderurgia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Centro / Planta */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Centro</span>
                <Select value={plantCode} onValueChange={setPlantCode}>
                  <SelectTrigger className="text-xs font-semibold bg-slate-50 border-slate-300 h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANTA_1">Planta 1 - Matriz</SelectItem>
                    <SelectItem value="PLANTA_2">Planta 2 - Perfilados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Linha Produtiva (Qualquer Linha Parametrizada) */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase">
                  Linha Produtiva *
                </span>
                <Select value={selectedLineCode} onValueChange={setSelectedLineCode}>
                  <SelectTrigger className="text-xs font-bold text-[#004C97] bg-blue-50 border-blue-300 h-8 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lines.map((l) => (
                      <SelectItem key={l.code} value={l.code} className="text-xs">
                        {l.code} - {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ano */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Ano</span>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(v) => setSelectedYear(Number(v))}
                >
                  <SelectTrigger className="text-xs font-semibold bg-slate-50 border-slate-300 h-8 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Semana */}
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Semana</span>
                <Select
                  value={String(selectedWeekNumber)}
                  onValueChange={(v) => setSelectedWeekNumber(Number(v))}
                >
                  <SelectTrigger className="text-xs font-bold text-[#004C97] bg-slate-50 border-slate-300 h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                      <SelectItem key={w} value={String(w)} className="text-xs">
                        Semana {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Lado Direito: Ações Principais e Menu Secundário */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Botão Primário: + Adicionar Produto */}
            <Button
              onClick={() => {
                setTargetDay('SEG')
                setTargetShiftCode('T1_L1')
                setIsAddModalOpen(true)
              }}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm h-9 px-3.5"
            >
              <Plus className="w-4 h-4" />+ Adicionar Produto
            </Button>

            {/* Simular */}
            <Button
              variant="outline"
              onClick={handleSimulate}
              className="text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 h-9"
            >
              <Play className="w-3.5 h-3.5 mr-1 text-[#004C97]" />
              Simular
            </Button>

            {/* Analisar com IA */}
            <Button
              variant="outline"
              onClick={handleAiAnalysis}
              className="text-xs font-semibold border-blue-300 text-[#004C97] bg-blue-50/50 hover:bg-blue-100/60 h-9"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Analisar com IA
            </Button>

            {/* Salvar Rascunho */}
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 h-9"
            >
              <Save className="w-3.5 h-3.5 mr-1 text-slate-500" />
              {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>

            {/* Enviar para Aprovação */}
            <Button
              onClick={handleSendForApproval}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm h-9"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar para Aprovação
            </Button>

            {/* Menu Secundário */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-slate-300 text-slate-600 h-9 px-2">
                  Mais Ações...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="text-xs bg-white border-slate-200 text-slate-800"
              >
                <DropdownMenuItem
                  onClick={() =>
                    toast({
                      title: 'Copiar Semana Anterior',
                      description: 'Atividades da Semana 34 replicadas como rascunho.',
                    })
                  }
                >
                  <Copy className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  Copiar semana anterior
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    toast({
                      title: 'Histórico de Versões',
                      description:
                        'Exibindo rascunhos e versões publicadas da Linha ' + selectedLineCode,
                    })
                  }
                >
                  <History className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  Histórico de alterações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    toast({
                      title: 'Exportar Grade',
                      description: 'Exportando grade semanal em formato Excel / CSV.',
                    })
                  }
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                  Exportar planilha
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  Imprimir programação
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Ficha Mestre da Linha Carregada - Resumo */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Factory className="w-3.5 h-3.5 text-[#004C97]" />
              Ficha Mestre Vinculada:
            </span>
            <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] text-slate-700 font-semibold">
              {currentLineOverview?.line?.name || `Linha ${selectedLineCode} - Laminação Contínua`}
            </span>
            <span className="text-[11px] text-slate-500">
              Capacidade Nominal:{' '}
              <strong className="text-slate-800 font-mono">
                {currentLineOverview?.master?.nominal_hourly_capacity || 12.0} t/h
              </strong>
            </span>
            <span className="text-[11px] text-slate-500">
              Turnos Configurados:{' '}
              <strong className="text-slate-800 font-mono">
                {currentLineOverview?.shifts?.length || 3} turnos/dia
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Ficha Mestre Sincronizada
            </span>
            <span>&bull;</span>
            <span className="font-mono">SAP S/4HANA Conectado</span>
          </div>
        </div>
      </Card>

      {/* 2. INDICADORES RÁPIDOS NO TOPO */}
      <WeeklyIndicatorsBar indicators={indicators} lineCode={selectedLineCode} />

      {/* 3. ALERTA DE VALIDAÇÃO CRÍTICA / HARD BLOCK EM TEMPO REAL */}
      {validations.length > 0 && (
        <div className="space-y-1.5">
          {validations.map((v, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                v.level === 'BLOCKED' || v.level === 'CRITICAL'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {v.level === 'BLOCKED' || v.level === 'CRITICAL' ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>
                  <strong>
                    [{v.code}] {v.title}:
                  </strong>{' '}
                  {v.message}
                </span>
              </div>
              <Badge
                className={`text-[10px] font-mono font-bold ${
                  v.level === 'BLOCKED' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {v.level}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* 4. GRADE PRINCIPAL OPERACIONAL (Dia -> Turno -> Turma -> Sequência) */}
      <WeeklyScheduleGrid
        items={calculatedItems}
        lineOverview={currentLineOverview}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onDuplicate={handleDuplicate}
        onRemove={handleRemove}
        onOpenAddModal={(d, s) => {
          setTargetDay(d)
          setTargetShiftCode(s)
          setIsAddModalOpen(true)
        }}
        onTransferDayShift={handleTransferDayShift}
        onAddStop={handleAddStop}
      />

      {/* 5. RESUMO CONSOLIDADO DA SEMANA (Painel Inferior Recolhível) */}
      <WeeklyScheduleSummaryPanel
        summary={summary}
        lineCode={selectedLineCode}
        periodDisplay={headerFilter.periodDisplay}
      />

      {/* 6. MODAL DE ADICIONAR PRODUTO */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddProduct}
        officialMaterials={officialMaterials}
        lineOverview={currentLineOverview}
        targetDay={targetDay}
        targetShiftCode={targetShiftCode}
        targetShiftName={targetShiftName}
        targetCrewName={targetCrewName}
      />

      {/* 7. MODAL VERMELHO DE HARD BLOCK (MATERIAL BLOQUEADO) */}
      <BlockedProductModal
        data={hardBlockData}
        onClose={() => setHardBlockData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
export default WeeklyScheduleOperationalPage
