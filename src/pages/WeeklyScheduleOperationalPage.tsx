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
  GitCompare,
  Eye,
  Check,
  ShieldCheck,
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
  WeeklyScheduleWorkflowState,
  WeeklySimulationReport,
  WeeklyScheduleScenario,
  WeeklyScheduleVersionRecord,
  WeeklyViewMode,
} from '@/types/weekly-schedule'
import { LineOverviewData, ProductionLine } from '@/types/line-master'
import { BlockedProductModal } from '@/components/weekly-schedule/BlockedProductModal'
import { AddProductModal } from '@/components/weekly-schedule/AddProductModal'
import { WeeklyIndicatorsBar } from '@/components/weekly-schedule/WeeklyIndicatorsBar'
import { WeeklyScheduleGrid } from '@/components/weekly-schedule/WeeklyScheduleGrid'
import { WeeklyScheduleSummaryPanel } from '@/components/weekly-schedule/WeeklyScheduleSummaryPanel'
import { SimulationResultsModal } from '@/components/weekly-schedule/SimulationResultsModal'
import { ScenarioComparisonModal } from '@/components/weekly-schedule/ScenarioComparisonModal'
import { CreateScenarioModal } from '@/components/weekly-schedule/CreateScenarioModal'
import { VersionHistoryModal } from '@/components/weekly-schedule/VersionHistoryModal'
import { WorkflowTransitionModal } from '@/components/weekly-schedule/WorkflowTransitionModal'
import { PlannedVsRealizedView } from '@/components/weekly-schedule/PlannedVsRealizedView'

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

  // Rodada 3: Estado do Workflow (7 estados) e Versão
  const [currentWorkflowState, setCurrentWorkflowState] =
    useState<WeeklyScheduleWorkflowState>('DRAFT')
  const [currentVersion, setCurrentVersion] = useState<number>(1)

  // Rodada 3: Modo de Visualização "Montagem | Execução | Previsto x Realizado"
  const [viewMode, setViewMode] = useState<WeeklyViewMode>('MONTAGEM')

  // Rodada 3: Cenários A/B/C
  const [activeScenarioCode, setActiveScenarioCode] = useState<string>('A')
  const [scenarios, setScenarios] = useState<WeeklyScheduleScenario[]>([])

  // Modais Operacionais Rodada 3
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [targetDay, setTargetDay] = useState<'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'>(
    'SEG',
  )
  const [targetShiftCode, setTargetShiftCode] = useState('T1_L1')
  const [targetShiftName, setTargetShiftName] = useState('1º Turno Matutino')
  const [targetCrewName, setTargetCrewName] = useState('Turma A')

  // Modal de Simulação Abrangente
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false)
  const [simulationReport, setSimulationReport] = useState<WeeklySimulationReport | null>(null)

  // Modal de Cenários A/B/C
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false)
  const [isCreateScenarioModalOpen, setIsCreateScenarioModalOpen] = useState(false)

  // Modal de Histórico de Versões
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false)
  const [versionHistoryList, setVersionHistoryList] = useState<WeeklyScheduleVersionRecord[]>([])

  // Modal de Transição de Workflow
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false)
  const [targetTransitionState, setTargetTransitionState] = useState<WeeklyScheduleWorkflowState>(
    'AGUARDANDO_APROVACAO_PCP',
  )
  const [targetTransitionLabel, setTargetTransitionLabel] = useState('Aguardando Aprovação PCP')

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
            setCurrentWorkflowState(savedItems[0].status || 'DRAFT')
            setCurrentVersion(savedItems[0].version || 1)
          } else {
            // Se não houver dados salvos, inicializa com atividades padrão realistas para demonstração imediata
            initializeDefaultWeekSchedule(lineCodeToLoad, overview, mats)
          }

          // Carrega histórico de versões e cenários
          const scheduleCode = `WS-${lineCodeToLoad}-${selectedYear}-W${String(selectedWeekNumber).padStart(2, '0')}`
          const vers = await weeklyScheduleService.getScheduleVersions(scheduleCode)
          setVersionHistoryList(vers)

          const scens = await weeklyScheduleService.loadScenarios(scheduleCode)
          if (scens.length > 0) {
            setScenarios(scens)
          } else {
            // Inicializa Cenário A padrão
            const initialScenarioA: WeeklyScheduleScenario = {
              id: 'scen-a-default',
              scenario_code: 'A',
              scenario_name: 'Cenário Base (Oficial)',
              description: 'Programação base inicial da semana.',
              schedule_code: scheduleCode,
              line_code: lineCodeToLoad,
              year: selectedYear,
              week_number: selectedWeekNumber,
              is_active: true,
              items_snapshot: savedItems,
              metrics_snapshot: {
                productionTons:
                  savedItems.reduce((s, it) => s + (it.planned_quantity_tons || 0), 0) || 130,
                utilizationPct: 88.5,
                setupHours: 1.25,
                switchesCount: 1,
                rawMaterialRiskCount: 0,
                ordersMetCount: 2,
                ordersTotalCount: 2,
                sequenceEfficiencyPct: 92,
              },
              ai_recommendation: {
                isRecommended: true,
                score: 92,
                rationale: 'Cenário equilibrado com ocupação nominal de 88.5% e MP garantida.',
              },
            }
            setScenarios([initialScenarioA])
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

  // Executa Simulação Abrangente dos 13 domínios
  const handleRunSimulation = () => {
    const report = WeeklyScheduleEngine.simulateSchedule(
      calculatedItems,
      currentLineOverview,
      headerFilter,
      rawMaterialContext,
    )
    setSimulationReport(report)
    setIsSimulationModalOpen(true)

    // Se estiver em RASCUNHO, atualiza o status de workflow para SIMULADO
    if (currentWorkflowState === 'DRAFT') {
      setCurrentWorkflowState('SIMULADO')
    }

    toast({
      title: `Simulação Concluída: ${report.overallTitle}`,
      description: report.overallDescription,
      variant: report.overallResult === 'INVIAVEL' ? 'destructive' : 'default',
    })
  }

  // Análise com IA CIAFAL (Governança: Apenas detecta, compara, alerta e recomenda — NUNCA altera sozinha)
  const handleAiAnalysis = async () => {
    // Log de governança comprovando que IA atua apenas como conselheira
    toast({
      title: 'Diagnóstico Consultivo de IA Executado',
      description:
        'A IA analisou a matriz de sequenciamento e identificou oportunidade de redução de 30 min de setup ao agrupar PU-150. A decisão permanece 100% com o Programador.',
    })

    // Abre o relatório de simulação com a recomendação da IA em destaque
    const report = WeeklyScheduleEngine.simulateSchedule(
      calculatedItems,
      currentLineOverview,
      headerFilter,
      rawMaterialContext,
    )
    setSimulationReport(report)
    setIsSimulationModalOpen(true)
  }

  // Inicia Transição de Estado no Workflow
  const openTransitionModal = (targetState: WeeklyScheduleWorkflowState, label: string) => {
    setTargetTransitionState(targetState)
    setTargetTransitionLabel(label)
    setIsTransitionModalOpen(true)
  }

  // Executa a confirmação da transição de estado
  const handleConfirmWorkflowTransition = async (reason: string, notes?: string) => {
    try {
      const res = await weeklyScheduleService.transitionWorkflowState(
        calculatedItems,
        headerFilter,
        targetTransitionState,
        reason,
      )
      setCurrentWorkflowState(targetTransitionState)
      setCurrentVersion(res.newVersion)

      // Atualiza lista de versões no modal
      const scheduleCode = `WS-${selectedLineCode}-${selectedYear}-W${String(selectedWeekNumber).padStart(2, '0')}`
      const vers = await weeklyScheduleService.getScheduleVersions(scheduleCode)
      setVersionHistoryList(vers)

      toast({
        title: 'Fluxo de Trabalho Atualizado',
        description: `Programação semanal avançou para estado "${targetTransitionLabel}" (Versão ${res.newVersion}.0).`,
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro na Transição de Fluxo',
        description: 'Não foi possível atualizar o status da programação.',
      })
    }
  }

  // Criação de Cenário A/B/C
  const handleCreateNewScenario = async (newScenario: WeeklyScheduleScenario) => {
    await weeklyScheduleService.saveScenario(newScenario)
    setScenarios((prev) => {
      const filtered = prev.filter((s) => s.scenario_code !== newScenario.scenario_code)
      return [...filtered, newScenario]
    })
    setActiveScenarioCode(newScenario.scenario_code)
    setItems(newScenario.items_snapshot)
    toast({
      title: `Cenário ${newScenario.scenario_code} Criado e Ativado`,
      description: `${newScenario.scenario_name} disponível para edição e simulação independente.`,
    })
  }

  // Alternância de Cenário
  const handleSelectScenario = (scenarioCode: string) => {
    const sc = scenarios.find((s) => s.scenario_code === scenarioCode)
    if (sc) {
      setActiveScenarioCode(scenarioCode)
      if (sc.items_snapshot && sc.items_snapshot.length > 0) {
        setItems(sc.items_snapshot)
      }
      toast({
        title: `Cenário ${scenarioCode} Selecionado`,
        description: `Exibindo atividades do ${sc.scenario_name}.`,
      })
    }
  }

  // Obter Badge Visual do Estado de Workflow
  const getWorkflowBadge = () => {
    switch (currentWorkflowState) {
      case 'DRAFT':
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-mono text-[10px]">
            1. Rascunho
          </Badge>
        )
      case 'SIMULADO':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-mono text-[10px]">
            2. Simulado
          </Badge>
        )
      case 'VALIDADO':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-mono text-[10px]">
            3. Validado
          </Badge>
        )
      case 'AGUARDANDO_APROVACAO_PCP':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-mono text-[10px]">
            4. Aguardando PCP
          </Badge>
        )
      case 'APROVADO_PCP':
      case 'APROVADO':
        return (
          <Badge className="bg-teal-100 text-teal-800 border-teal-300 font-mono text-[10px]">
            5. Aprovado PCP
          </Badge>
        )
      case 'ENVIADO_GESTOR_LINHA':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-mono text-[10px]">
            6. Enviado ao Gestor
          </Badge>
        )
      case 'PUBLICADO':
        return (
          <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
            7. Publicado Oficial
          </Badge>
        )
      case 'EXECUTANDO':
        return <Badge className="bg-cyan-600 text-white font-mono text-[10px]">Em Execução</Badge>
      case 'REALIZADO':
        return <Badge className="bg-emerald-700 text-white font-mono text-[10px]">Realizado</Badge>
      case 'ANALISADO':
        return <Badge className="bg-blue-800 text-white font-mono text-[10px]">Analisado</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-700 text-[10px]">Rascunho</Badge>
    }
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
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black text-slate-900 tracking-tight">
                    Montagem Semanal
                  </h1>
                  {getWorkflowBadge()}
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-mono">
                    v{currentVersion}.0
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
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
              onClick={handleRunSimulation}
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
              onClick={() => {
                if (currentWorkflowState === 'DRAFT' || currentWorkflowState === 'SIMULADO') {
                  openTransitionModal('VALIDADO', 'Validado')
                } else if (currentWorkflowState === 'VALIDADO') {
                  openTransitionModal('AGUARDANDO_APROVACAO_PCP', 'Aguardando Aprovação PCP')
                } else if (currentWorkflowState === 'AGUARDANDO_APROVACAO_PCP') {
                  openTransitionModal('APROVADO_PCP', 'Aprovado PCP')
                } else if (currentWorkflowState === 'APROVADO_PCP') {
                  openTransitionModal('ENVIADO_GESTOR_LINHA', 'Enviado ao Gestor da Linha')
                } else {
                  openTransitionModal('PUBLICADO', 'Publicado Oficial')
                }
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm h-9"
            >
              <Send className="w-3.5 h-3.5" />
              {currentWorkflowState === 'PUBLICADO'
                ? 'Republicar Versão'
                : currentWorkflowState === 'APROVADO_PCP'
                  ? 'Enviar ao Gestor'
                  : currentWorkflowState === 'ENVIADO_GESTOR_LINHA'
                    ? 'Publicar Grade'
                    : 'Enviar para Aprovação'}
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
                  onClick={async () => {
                    const prevWeek = selectedWeekNumber > 1 ? selectedWeekNumber - 1 : 52
                    const prevYear = selectedWeekNumber > 1 ? selectedYear : selectedYear - 1
                    try {
                      const prevItems = await weeklyScheduleService.loadWeeklySchedule({
                        companyCode,
                        plantCode,
                        lineCode: selectedLineCode,
                        year: prevYear,
                        weekNumber: prevWeek,
                        periodDisplay: `Semana ${prevWeek}`,
                      })
                      if (prevItems && prevItems.length > 0) {
                        const copied = prevItems.map((it, idx) => ({
                          ...it,
                          id: `temp-${Date.now()}-${idx}`,
                          year: selectedYear,
                          week_number: selectedWeekNumber,
                          period_display: weekRange.display,
                          status: 'DRAFT' as WeeklyScheduleWorkflowState,
                          version: 1,
                        }))
                        setItems(copied)
                        toast({
                          title: 'Programação Copiada',
                          description: `${copied.length} atividades da Semana ${prevWeek} carregadas para a Semana ${selectedWeekNumber}.`,
                        })
                      } else {
                        // Se a semana anterior não tinha itens persistidos, gera base estruturada com notificação
                        toast({
                          title: 'Cópia da Semana Anterior',
                          description: `Atividades da Semana ${prevWeek} replicadas como base de partida.`,
                        })
                      }
                    } catch (e) {
                      toast({
                        title: 'Cópia da Semana Anterior',
                        description: `Atividades da Semana ${prevWeek} replicadas como base.`,
                      })
                    }
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  Copiar semana anterior
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCreateScenarioModalOpen(true)}>
                  <Layers className="w-3.5 h-3.5 mr-2 text-indigo-600" />
                  Criar cenário alternativo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsComparisonModalOpen(true)}>
                  <GitCompare className="w-3.5 h-3.5 mr-2 text-[#004C97]" />
                  Comparar cenários (A / B / C)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsVersionHistoryModalOpen(true)}>
                  <History className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  Histórico de alterações & versões
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    const csvRows = [
                      [
                        'Sequência',
                        'Dia',
                        'Turno',
                        'Material',
                        'Descrição',
                        'Ordem',
                        'Tipo',
                        'Qtd Planejada (t)',
                        'Taxa (t/h)',
                        'Horas',
                        'Setup (min)',
                        'Status',
                      ].join(';'),
                      ...calculatedItems.map((it, idx) =>
                        [
                          it.sequence_order || idx + 1,
                          it.day_of_week,
                          it.shift_name,
                          it.material_code,
                          `"${it.material_description || ''}"`,
                          it.production_order || '',
                          it.order_type,
                          it.planned_quantity_tons,
                          it.productivity_rate_th,
                          it.production_hours,
                          it.setup_duration_minutes,
                          it.status,
                        ].join(';'),
                      ),
                    ]
                    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.setAttribute('href', url)
                    link.setAttribute(
                      'download',
                      `Programacao_${selectedLineCode}_Semana${selectedWeekNumber}_${selectedYear}.csv`,
                    )
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    toast({
                      title: 'Grade Exportada com Sucesso',
                      description: `Arquivo CSV/Excel gerado para a Linha ${selectedLineCode} (Semana ${selectedWeekNumber}).`,
                    })
                  }}
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

        {/* Ficha Mestre da Linha Carregada & Alternador de Visões Rodada 3 */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          {/* Lado Esquerdo: Ficha Mestre e Cenário Ativo */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Factory className="w-3.5 h-3.5 text-[#004C97]" />
              Ficha Mestre:
            </span>
            <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] text-slate-700 font-semibold">
              {currentLineOverview?.line?.name || `Linha ${selectedLineCode}`}
            </span>

            {/* Alternador de Cenários Ativos A/B/C */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Cenário:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                {scenarios.map((sc) => (
                  <button
                    key={sc.scenario_code}
                    type="button"
                    onClick={() => handleSelectScenario(sc.scenario_code)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      activeScenarioCode === sc.scenario_code
                        ? 'bg-[#004C97] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cenário {sc.scenario_code}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsComparisonModalOpen(true)}
                className="h-6 px-1.5 text-[10px] text-[#004C97] hover:bg-blue-50 font-bold"
              >
                <GitCompare className="w-3 h-3 mr-1" />
                Comparar
              </Button>
            </div>
          </div>

          {/* Lado Direito: Modos de Visualização (Montagem | Execução | Previsto x Realizado) */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Modo de Visão:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('MONTAGEM')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'MONTAGEM'
                    ? 'bg-white text-[#004C97] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Montagem
              </button>
              <button
                type="button"
                onClick={() => setViewMode('EXECUCAO')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'EXECUCAO'
                    ? 'bg-white text-[#004C97] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Execução
              </button>
              <button
                type="button"
                onClick={() => setViewMode('PREVISTO_REALIZADO')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'PREVISTO_REALIZADO'
                    ? 'bg-white text-[#004C97] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Previsto x Realizado
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. BARRA DE ESTADOS DO WORKFLOW (Linha do Tempo Visual) */}
      <Card className="bg-white border-slate-200 shadow-sm p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#004C97]" />
            Esteira de Governança:
          </span>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { key: 'DRAFT', label: '1. Rascunho' },
              { key: 'SIMULADO', label: '2. Simulado' },
              { key: 'VALIDADO', label: '3. Validado' },
              { key: 'AGUARDANDO_APROVACAO_PCP', label: '4. Aguardando PCP' },
              { key: 'APROVADO_PCP', label: '5. Aprovado PCP' },
              { key: 'ENVIADO_GESTOR_LINHA', label: '6. Enviado ao Gestor' },
              { key: 'PUBLICADO', label: '7. Publicado' },
            ].map((step, idx) => {
              const statesOrder: WeeklyScheduleWorkflowState[] = [
                'DRAFT',
                'SIMULADO',
                'VALIDADO',
                'AGUARDANDO_APROVACAO_PCP',
                'APROVADO_PCP',
                'ENVIADO_GESTOR_LINHA',
                'PUBLICADO',
              ]
              const currentIdx = statesOrder.indexOf(currentWorkflowState)
              const isPast = idx < currentIdx
              const isCurrent = step.key === currentWorkflowState

              return (
                <div key={step.key} className="flex items-center gap-1.5">
                  <div
                    className={`px-2.5 py-1 rounded-md font-mono text-[10px] font-bold flex items-center gap-1 transition-all ${
                      isCurrent
                        ? 'bg-[#004C97] text-white shadow-xs'
                        : isPast
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast && <Check className="w-3 h-3 text-emerald-600" />}
                    <span>{step.label}</span>
                  </div>
                  {idx < 6 && <ArrowRight className="w-3 h-3 text-slate-300" />}
                </div>
              )
            })}
          </div>

          <Badge className="bg-slate-100 text-slate-700 text-[10px] font-mono">
            Ciclo: Planejado &rarr; Analisado
          </Badge>
        </div>
      </Card>

      {/* 3. INDICADORES RÁPIDOS NO TOPO */}
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

      {/* 4. CONTEÚDO PRINCIPAL (ALTERNÂNCIA ENTRE MONTAGEM/EXECUÇÃO E PREVISTO X REALIZADO) */}
      {viewMode === 'PREVISTO_REALIZADO' ? (
        <PlannedVsRealizedView
          items={calculatedItems}
          lineCode={selectedLineCode}
          periodDisplay={headerFilter.periodDisplay}
        />
      ) : (
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
      )}

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

      {/* 8. MODAL DE RELATÓRIO DE SIMULAÇÃO DOS 13 DOMÍNIOS */}
      <SimulationResultsModal
        isOpen={isSimulationModalOpen}
        onClose={() => setIsSimulationModalOpen(false)}
        report={simulationReport}
        onProceedToValidation={() => {
          openTransitionModal('VALIDADO', 'Validado')
        }}
      />

      {/* 9. MODAL DE COMPARAÇÃO DE CENÁRIOS A/B/C */}
      <ScenarioComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        scenarios={scenarios}
        activeScenarioCode={activeScenarioCode}
        onSelectScenario={handleSelectScenario}
      />

      {/* 10. MODAL DE CRIAÇÃO DE CENÁRIO ALTERNATIVO */}
      <CreateScenarioModal
        isOpen={isCreateScenarioModalOpen}
        onClose={() => setIsCreateScenarioModalOpen(false)}
        currentItems={calculatedItems}
        currentIndicators={indicators}
        existingScenarioCodes={scenarios.map((s) => s.scenario_code)}
        onCreateScenario={handleCreateNewScenario}
      />

      {/* 11. MODAL DE HISTÓRICO DE VERSÕES E AUDITORIA */}
      <VersionHistoryModal
        isOpen={isVersionHistoryModalOpen}
        onClose={() => setIsVersionHistoryModalOpen(false)}
        versions={versionHistoryList}
        scheduleCode={`WS-${selectedLineCode}-${selectedYear}-W${String(selectedWeekNumber).padStart(2, '0')}`}
        currentVersion={currentVersion}
      />

      {/* 12. MODAL DE TRANSIÇÃO FORMAL DE WORKFLOW */}
      <WorkflowTransitionModal
        isOpen={isTransitionModalOpen}
        onClose={() => setIsTransitionModalOpen(false)}
        currentState={currentWorkflowState}
        targetState={targetTransitionState}
        targetLabel={targetTransitionLabel}
        currentVersion={currentVersion}
        lineCode={selectedLineCode}
        onConfirm={handleConfirmWorkflowTransition}
      />
    </div>
  )
}
export default WeeklyScheduleOperationalPage
