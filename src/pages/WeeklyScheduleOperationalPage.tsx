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
import { useLocation } from 'react-router-dom'
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
import { EditProductModal } from '@/components/weekly-schedule/EditProductModal'
import { OperationalKpiStrip } from '@/components/weekly-schedule/OperationalKpiStrip'
import { OperationalTimelineGrid } from '@/components/weekly-schedule/OperationalTimelineGrid'
import { SelectedItemDetailPanel } from '@/components/weekly-schedule/SelectedItemDetailPanel'
import { BottomOperationalPanels } from '@/components/weekly-schedule/BottomOperationalPanels'
import {
  WeeklyScheduleGrid,
  ScheduleGridFilter,
} from '@/components/weekly-schedule/WeeklyScheduleGrid'
import { AwaitingObservationsModal } from '@/components/weekly-schedule/AwaitingObservationsModal'
import { SimulationResultsModal } from '@/components/weekly-schedule/SimulationResultsModal'
import { ScenarioComparisonModal } from '@/components/weekly-schedule/ScenarioComparisonModal'
import { CreateScenarioModal } from '@/components/weekly-schedule/CreateScenarioModal'
import { VersionHistoryModal } from '@/components/weekly-schedule/VersionHistoryModal'
import { FullVersionHistoryModal } from '@/components/weekly-schedule/FullVersionHistoryModal'
import { PrePublishImpactModal } from '@/components/weekly-schedule/PrePublishImpactModal'
import { MesAlertBanner } from '@/components/weekly-schedule/MesAlertBanner'
import { WorkflowTransitionModal } from '@/components/weekly-schedule/WorkflowTransitionModal'
import { scheduleVersioningService } from '@/services/schedule-versioning-service'
import { VersioningEngine } from '@/services/versioning-engine'
import {
  ScheduleVersionRecord,
  ScheduleMesAlert,
  ScheduleItemDiff,
  VersionImpactAssessment,
  ChangeReasonExact,
} from '@/types/schedule-versioning'
import { PlannedVsRealizedView } from '@/components/weekly-schedule/PlannedVsRealizedView'
import { MonthlyKpiStrip } from '@/components/weekly-schedule/MonthlyKpiStrip'
import { MonthlyScheduleGrid } from '@/components/weekly-schedule/MonthlyScheduleGrid'
import { MonthlyDayDetailPanel } from '@/components/weekly-schedule/MonthlyDayDetailPanel'
import { MonthlyBottomOperationalPanels } from '@/components/weekly-schedule/MonthlyBottomOperationalPanels'
import { MonthlyAiAnalysisModal } from '@/components/weekly-schedule/MonthlyAiAnalysisModal'
import { MonthlyScheduleEngine, MONTH_WEEKS_2026_AUG } from '@/services/monthly-schedule-engine'
import { MonthlyDayCellData, MonthlyAwaitingObsItem } from '@/types/monthly-schedule'
import { SetupDetailModal } from '@/components/weekly-schedule/SetupDetailModal'
import { AISetupOptimizationModal } from '@/components/weekly-schedule/AISetupOptimizationModal'
import { SetupCapacityDrilldownModal } from '@/components/weekly-schedule/SetupCapacityDrilldownModal'
import { RollShopDemandsView } from '@/components/weekly-schedule/RollShopDemandsView'
import { rollShopSetupService } from '@/services/roll-shop-service'
import { AISetupRecommendation, RollShopDemand } from '@/types/roll-shop'
import { PCPExceptionGovernanceModal } from '@/components/weekly-schedule/PCPExceptionGovernanceModal'
import { ExceptionJustificationData } from '@/types/weekly-schedule'
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Table,
  CalendarDays,
  Trash2,
  Scissors,
  Wrench,
  RotateCcw,
} from 'lucide-react'

export const WeeklyScheduleOperationalPage: React.FC = () => {
  const { toast } = useToast()
  const auth = useAuth()
  const location = useLocation()

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

  // Modo de visualização da grade operacional: "Semana | Mês | Linha do Tempo | Oficina de Cilindros"
  const isInitialMonthly = location.pathname.includes('programacao-mensal')
  const isInitialRollShop = location.pathname.includes('oficina-cilindros')
  const [scheduleViewType, setScheduleViewType] = useState<
    'SEMANA' | 'MES' | 'TIMELINE' | 'OFICINA_CILINDROS'
  >(isInitialRollShop ? 'OFICINA_CILINDROS' : isInitialMonthly ? 'MES' : 'SEMANA')

  // Sincroniza se a rota mudar dinamicamente
  useEffect(() => {
    if (location.pathname.includes('oficina-cilindros')) {
      setScheduleViewType('OFICINA_CILINDROS')
    } else if (location.pathname.includes('programacao-mensal')) {
      setScheduleViewType('MES')
    }
  }, [location.pathname])
  const [selectedMonthDateIso, setSelectedMonthDateIso] = useState<string>('2026-08-24')
  const [isMonthlyAiModalOpen, setIsMonthlyAiModalOpen] = useState(false)
  const [monthlyFilterShift, setMonthlyFilterShift] = useState<string>('ALL')
  const [monthlyFilterProduct, setMonthlyFilterProduct] = useState<string>('ALL')
  const [monthlyFilterCustomer, setMonthlyFilterCustomer] = useState<string>('ALL')
  const [gridFormat, setGridFormat] = useState<'OPERATIONAL_TIMELINE' | 'TABULAR'>(
    'OPERATIONAL_TIMELINE',
  )
  const [viewMode, setViewMode] = useState<WeeklyViewMode>('MONTAGEM')

  // Modais de Setup, SMED, Drilldown e IA de Sequenciamento
  const [isSetupDetailModalOpen, setIsSetupDetailModalOpen] = useState(false)
  const [selectedSetupItem, setSelectedSetupItem] = useState<WeeklyScheduleItem | null>(null)
  const [isSetupDrilldownOpen, setIsSetupDrilldownOpen] = useState(false)
  const [isAiSetupModalOpen, setIsAiSetupModalOpen] = useState(false)
  const [aiSetupRecommendations, setAiSetupRecommendations] = useState<AISetupRecommendation[]>([])

  // Rodada 3: Cenários A/B/C
  const [activeScenarioCode, setActiveScenarioCode] = useState<string>('A')
  const [scenarios, setScenarios] = useState<WeeklyScheduleScenario[]>([])

  // Modais Operacionais Rodada 3
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WeeklyScheduleItem | null>(null)
  const [targetDay, setTargetDay] = useState<'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'>(
    'SEG',
  )
  const [targetShiftCode, setTargetShiftCode] = useState('T1_L1')
  const [targetShiftName, setTargetShiftName] = useState('1º Turno Matutino')
  const [targetCrewName, setTargetCrewName] = useState('Turma A')

  // Modal de Governança de Exceções PCP (Requisitos 8, 9, 10, 11, 12, 13, 14, 15)
  const [isPcpExceptionModalOpen, setIsPcpExceptionModalOpen] = useState(false)
  const [selectedExceptionItem, setSelectedExceptionItem] = useState<WeeklyScheduleItem | null>(
    null,
  )

  // Modal de Simulação Abrangente
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false)
  const [simulationReport, setSimulationReport] = useState<WeeklySimulationReport | null>(null)

  // Modal de Cenários A/B/C
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false)
  const [isCreateScenarioModalOpen, setIsCreateScenarioModalOpen] = useState(false)

  // Controle Completo de Versionamento & Governança (V01 -> V02 -> V03...)
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false)
  const [fullVersionHistoryList, setFullVersionHistoryList] = useState<ScheduleVersionRecord[]>([])
  const [versionHistoryList, setVersionHistoryList] = useState<WeeklyScheduleVersionRecord[]>([])

  // Modal de Painel de Impacto Pré-Publicação
  const [isImpactModalOpen, setIsImpactModalOpen] = useState(false)
  const [pendingImpact, setPendingImpact] = useState<VersionImpactAssessment | null>(null)
  const [pendingDiffs, setPendingDiffs] = useState<ScheduleItemDiff[]>([])
  const [isPublishingNewVersion, setIsPublishingNewVersion] = useState(false)

  // Alertas MES Ativos
  const [mesAlertsList, setMesAlertsList] = useState<ScheduleMesAlert[]>([])

  // Baseline de itens salvos para cálculo de diffs
  const [savedBaselineItems, setSavedBaselineItems] = useState<WeeklyScheduleItem[]>([])

  // Modal de Transição de Workflow
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false)
  const [targetTransitionState, setTargetTransitionState] = useState<WeeklyScheduleWorkflowState>(
    'AGUARDANDO_APROVACAO_PCP',
  )
  const [targetTransitionLabel, setTargetTransitionLabel] = useState('Aguardando Aprovação PCP')

  // Modal e Estados de Aguardando Observações & Seleção
  const [isAwaitingObsModalOpen, setIsAwaitingObsModalOpen] = useState(false)
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<WeeklyScheduleItem | null>(null)
  const [gridFilter, setGridFilter] = useState<ScheduleGridFilter>('ALL')

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
            setSavedBaselineItems(savedItems)
            setCurrentWorkflowState(savedItems[0].status || 'DRAFT')
            setCurrentVersion(savedItems[0].version || 1)
          } else {
            // Se não houver dados salvos, inicializa com atividades padrão realistas para demonstração imediata
            initializeDefaultWeekSchedule(lineCodeToLoad, overview, mats)
          }

          // Carrega histórico de versões estruturado e alertas MES
          const fullVers = await scheduleVersioningService.getVersionHistory(
            lineCodeToLoad,
            selectedYear,
            selectedWeekNumber,
          )
          setFullVersionHistoryList(fullVers)

          const mesList = await scheduleVersioningService.listMesAlerts(lineCodeToLoad)
          setMesAlertsList(mesList)

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

  // Inicializa uma programação inicial estruturada fiel aos requisitos visuais
  const initializeDefaultWeekSchedule = (
    lineCode: string,
    overview: LineOverviewData | null,
    mats: OfficialMaterialOption[],
  ) => {
    const defaultShifts =
      overview?.shifts && overview.shifts.length > 0
        ? overview.shifts
        : [
            { code: 'T1_L1', name: '1º Turno / Turma C', crew: 'Turma C' },
            { code: 'T2_L1', name: '2º Turno / Turma B', crew: 'Turma B' },
            { code: 'T3_L1', name: '3º Turno / Turma A', crew: 'Turma A' },
          ]

    const initial: WeeklyScheduleItem[] = [
      {
        id: 'item-demo-1',
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
        shift_name: '1º Turno / Turma C',
        crew_name: 'Turma C',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-50x50x2.0',
        material_description: 'Tubo Quadrado 50x50x2.0mm',
        family_code: 'TQ_LEVES',
        steel_grade: 'SAE 1020',
        dimensions: '50x50x2.0mm',
        production_order: 'OP-45870',
        order_type: 'MTS',
        planned_quantity_tons: 120,
        productivity_rate_th: 28.2,
        production_hours: 4.25,
        setup_duration_minutes: 0,
        setup_reason: 'Início de campanha',
        start_datetime: '2026-08-24 06:00',
        end_datetime: '2026-08-24 10:15',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 126.0,
        raw_material_type: 'Tarugo 1020 - 50x50x2.0mm',
      },
      {
        id: 'item-demo-2',
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
        shift_name: '1º Turno / Turma C',
        crew_name: 'Turma C',
        sequence_order: 2,
        item_type: 'PRODUCTION',
        material_code: 'TR-60x30x2.0',
        material_description: 'Tubo Retangular 60x30x2.0mm',
        family_code: 'TR_LEVES',
        steel_grade: 'SAE 1020',
        dimensions: '60x30x2.0mm',
        sales_order_mto: '45871/10',
        customer_name: 'ABC Ltda.',
        order_type: 'MTO',
        planned_quantity_tons: 70,
        productivity_rate_th: 5.82,
        production_hours: 3.25,
        setup_duration_minutes: 20,
        setup_reason: 'Setup: 180 min / Acerto: 20 min',
        start_datetime: '2026-08-24 10:35',
        end_datetime: '2026-08-24 14:00',
        status: 'AGUARDANDO_OBSERVACOES',
        awaiting_observations: {
          is_awaiting: true,
          reason: 'Validação de tolerância dimensional pelo cliente',
          observation: 'Pedido MTO retido aguardando aprovação da espessura.',
          responsible: 'Comercial / PCP',
          date_time: '2026-08-24 08:30',
        },
        version: 1,
        raw_material_req_tons: 73.5,
        raw_material_type: 'Tarugo 1020 - 80x40x2.5mm',
      },
      {
        id: 'item-demo-stop-1',
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
        shift_name: '1º Turno / Turma C',
        crew_name: 'Manutenção',
        sequence_order: 3,
        item_type: 'SCHEDULED_STOP',
        material_code: 'PARADA_1405',
        material_description: 'Parada 14:05-15:05',
        order_type: 'MTS',
        planned_quantity_tons: 0,
        productivity_rate_th: 0,
        production_hours: 0,
        setup_duration_minutes: 0,
        stop_code: 'LIMPEZA_TROCA',
        stop_description: 'Limpeza de guias e troca de cilindros',
        stop_duration_minutes: 60,
        start_datetime: '2026-08-24 14:05',
        end_datetime: '2026-08-24 15:05',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 0,
      },
      {
        id: 'item-demo-3',
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
        shift_name: '1º Turno / Turma C',
        crew_name: 'Turma C',
        sequence_order: 4,
        item_type: 'PRODUCTION',
        material_code: 'PU-150x50x4.75',
        material_description: 'Perfil U Enrijecido 150x50x4.75mm',
        family_code: 'PERFIS_U',
        steel_grade: 'ASTM A36',
        dimensions: '150x50x4.75mm',
        production_order: 'OP-45875',
        order_type: 'MTS',
        planned_quantity_tons: 95,
        productivity_rate_th: 16.0,
        production_hours: 5.94,
        setup_duration_minutes: 15,
        setup_reason: 'Troca de matriz perfil U: 15 min',
        start_datetime: '2026-08-24 15:20',
        end_datetime: '2026-08-24 21:15',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 98.8,
        raw_material_type: 'Tarugo 1045 - 60x30x2.0mm',
      },
      {
        id: 'item-demo-ter-1',
        schedule_code: `WS-${lineCode}-${selectedYear}-W${selectedWeekNumber}`,
        company_code: companyCode,
        plant_code: plantCode,
        line_code: lineCode,
        year: selectedYear,
        week_number: selectedWeekNumber,
        period_display: weekRange.display,
        day_of_week: 'TER',
        date_str: '25/08',
        shift_code: defaultShifts[1]?.code || 'T2_L1',
        shift_name: '1º Turno / Turma A',
        crew_name: 'Turma A',
        sequence_order: 5,
        item_type: 'PRODUCTION',
        material_code: 'RED-63.5-SAE1045',
        material_description: 'Barra Redonda Laminada 63.50mm SAE 1045',
        family_code: 'REDONDOS',
        steel_grade: 'SAE 1045',
        dimensions: 'Ø 63.5 mm',
        production_order: 'OP-45880',
        order_type: 'MTS',
        planned_quantity_tons: 140,
        productivity_rate_th: 18.5,
        production_hours: 7.57,
        setup_duration_minutes: 25,
        setup_reason: 'Troca de cilindros de laminação',
        start_datetime: '2026-08-25 06:00',
        end_datetime: '2026-08-25 13:35',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 145.6,
        raw_material_type: 'Tarugo 1045 - 60x30x2.0mm',
      },
    ]

    setItems(initial)
    setSavedBaselineItems(initial)
    setSelectedScheduleItem(initial[1])
  }

  // Recalculo Automático Determinístico sempre que os itens, Ficha Mestre ou Contexto de MP mudarem
  const calculationResult = useMemo(() => {
    const result = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      items,
      currentLineOverview,
      headerFilter,
      rawMaterialContext,
    )

    // Sincronização automática em ciclo fechado com a Oficina de Cilindros (Requisitos 13, 14, 19, 21)
    rollShopSetupService.syncScheduleWithRollShop(result.items, headerFilter, currentLineOverview)

    return result
  }, [items, currentLineOverview, headerFilter, rawMaterialContext])

  const calculatedItems = calculationResult.items
  const indicators: WeeklyIndicators = calculationResult.indicators
  const summary: WeeklyScheduleSummary = calculationResult.summary
  const validations: ValidationResult[] = calculationResult.validations

  // -------------------------------------------------------------
  // VISÃO MENSAL (ETAPA 5) — Mesma Base de Dados, Mesmos Registros + Filtros Interdependentes
  // -------------------------------------------------------------
  const filteredMonthlyItems = useMemo(() => {
    return calculatedItems.filter((it) => {
      if (monthlyFilterShift !== 'ALL' && it.shift_code !== monthlyFilterShift) return false
      if (monthlyFilterProduct !== 'ALL' && it.material_code !== monthlyFilterProduct) return false
      if (monthlyFilterCustomer !== 'ALL' && (it.customer_name || 'MTS') !== monthlyFilterCustomer)
        return false
      return true
    })
  }, [calculatedItems, monthlyFilterShift, monthlyFilterProduct, monthlyFilterCustomer])

  const monthlyWeeksGrid = useMemo(() => {
    return MonthlyScheduleEngine.buildMonthlyGrid(
      filteredMonthlyItems,
      selectedLineCode,
      selectedWeekNumber,
      selectedYear,
    )
  }, [filteredMonthlyItems, selectedLineCode, selectedWeekNumber, selectedYear])

  const monthlyKpis = useMemo(() => {
    return MonthlyScheduleEngine.getMonthlyKpis(monthlyWeeksGrid, filteredMonthlyItems)
  }, [monthlyWeeksGrid, filteredMonthlyItems])

  const monthlyRawMaterials = useMemo(() => {
    return MonthlyScheduleEngine.getMonthlyRawMaterials()
  }, [])

  const monthlyBacklog = useMemo(() => {
    return MonthlyScheduleEngine.getMonthlyBacklogSummary()
  }, [])

  const monthlyAwaitingObs = useMemo(() => {
    return MonthlyScheduleEngine.getMonthlyAwaitingObs(filteredMonthlyItems)
  }, [filteredMonthlyItems])

  const monthlyAiReport = useMemo(() => {
    return MonthlyScheduleEngine.generateMonthlyAiAnalysis(monthlyWeeksGrid, monthlyKpis)
  }, [monthlyWeeksGrid, monthlyKpis])

  // Dia atualmente selecionado na visão mensal
  const selectedMonthlyDay = useMemo(() => {
    for (const w of monthlyWeeksGrid) {
      const found = w.days.find((d) => d.dateIso === selectedMonthDateIso)
      if (found) return found
    }
    // Fallback: primeiro dia da primeira semana
    return monthlyWeeksGrid[0]?.days[0] || null
  }, [monthlyWeeksGrid, selectedMonthDateIso])

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

    // 2. Validação de Conflito de Horário
    const startStr = newItemData.start_datetime
      ? newItemData.start_datetime.split(' ')[1] || '06:00'
      : '06:00'
    const endStr = newItemData.end_datetime
      ? newItemData.end_datetime.split(' ')[1] || '14:20'
      : '14:20'
    const day = newItemData.day_of_week || 'SEG'
    const shift = newItemData.shift_code || 'T1_L1'

    const conflictCheck = WeeklyScheduleEngine.validateTimeOverlap({
      items,
      dayOfWeek: day,
      shiftCode: shift,
      startTime: startStr,
      endTime: endStr,
    })

    if (conflictCheck.hasConflict) {
      toast({
        title: 'Bloqueio de Conflito de Horário',
        description:
          conflictCheck.conflictMessage ||
          'Existe sobreposição com outro item no mesmo dia e turno.',
        variant: 'destructive',
      })
      return
    }

    // 3. Inclusão Válida com Cadência Oficial e Recálculo Temporal
    const lineObj = lines.find((l) => l.code === selectedLineCode)
    const nextSeq = items.length + 1
    const cadence =
      WeeklyScheduleEngine.getProductivityForMaterialStrict(
        newItemData.material_code,
        currentLineOverview,
        officialMaterials,
      ) ||
      newItemData.productivity_rate_th ||
      12.0

    const plannedQty = Number(newItemData.planned_quantity_tons) || 100
    const prodHours = cadence > 0 ? Number((plannedQty / cadence).toFixed(2)) : 0

    const itemToAdd: WeeklyScheduleItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      schedule_code: `WS-${selectedLineCode}-${selectedYear}-W${String(selectedWeekNumber).padStart(2, '0')}`,
      company_code: companyCode,
      plant_code: plantCode,
      line_code: selectedLineCode,
      line_id: lineObj?.id,
      year: selectedYear,
      week_number: selectedWeekNumber,
      period_display: weekRange.display,
      day_of_week: day,
      date_str: '24/08',
      shift_code: shift,
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
      planned_quantity_tons: plannedQty,
      productivity_rate_th: cadence,
      production_hours: prodHours,
      setup_duration_minutes: 0,
      start_datetime: newItemData.start_datetime || '',
      end_datetime: newItemData.end_datetime || '',
      status: 'DRAFT',
      version: 1,
      pcp_notes: newItemData.pcp_notes,
      raw_material_req_tons: 0,
    }

    const updatedList = [...items, itemToAdd]
    const recalculated = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      updatedList,
      currentLineOverview,
      headerFilter,
      rawMaterialContext,
    )
    setItems(recalculated.items)

    // Persiste imediatamente
    weeklyScheduleService.saveWeeklyScheduleDraft(recalculated.items, headerFilter).catch((err) => {
      console.error('Erro ao persistir novo item:', err)
    })

    toast({
      title: 'Produto Adicionado',
      description: `Material ${itemToAdd.material_code} (${itemToAdd.planned_quantity_tons} t) inserido na sequência. Grade recalculada.`,
    })
  }

  const handleOpenEditItem = (item: WeeklyScheduleItem) => {
    setEditingItem(item)
    setIsEditModalOpen(true)
  }

  const handleSaveEditedItem = async (updatedItem: WeeklyScheduleItem) => {
    // Validação de Conflito de Horário
    const startStr = updatedItem.start_datetime
      ? updatedItem.start_datetime.split(' ')[1] || '06:00'
      : '06:00'
    const endStr = updatedItem.end_datetime
      ? updatedItem.end_datetime.split(' ')[1] || '14:20'
      : '14:20'

    const conflictCheck = WeeklyScheduleEngine.validateTimeOverlap({
      items,
      dayOfWeek: updatedItem.day_of_week,
      shiftCode: updatedItem.shift_code,
      startTime: startStr,
      endTime: endStr,
      excludeItemId: updatedItem.id,
    })

    if (conflictCheck.hasConflict) {
      toast({
        title: 'Bloqueio de Conflito de Horário',
        description:
          conflictCheck.conflictMessage ||
          'Existe sobreposição com outro item no mesmo dia e turno.',
        variant: 'destructive',
      })
      return
    }

    const updatedList = items.map((it) => (it.id === updatedItem.id ? updatedItem : it))
    const recalculated = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      updatedList,
      currentLineOverview,
      headerFilter,
      rawMaterialContext,
    )
    setItems(recalculated.items)

    try {
      await weeklyScheduleService.saveWeeklyScheduleDraft(recalculated.items, headerFilter)
      toast({
        title: 'Programação Atualizada e Persistida',
        description: `Item #${updatedItem.sequence_order} (${updatedItem.material_code}) atualizado com recálculo temporal, setups e MP.`,
      })
    } catch {
      toast({
        title: 'Programação Atualizada Localmente',
        description: `Item #${updatedItem.sequence_order} (${updatedItem.material_code}) atualizado.`,
      })
    }
  }

  // Manipulação de Posição na Sequência e Transferência entre Dias/Turnos com Herança de Metadados, Validação, Rollback e Persistência
  const handleReorderItems = async (
    fromIndex: number,
    toIndex: number,
    targetOverrides?: {
      day_of_week?: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
      date_str?: string
      shift_code?: string
      shift_name?: string
      crew_name?: string
    },
  ) => {
    if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
      return
    }

    const itemToMove = items[fromIndex]
    if (!itemToMove) return

    // Se a posição for a mesma e não houver alteração de dia/turno, não faz nada
    if (
      fromIndex === toIndex &&
      (!targetOverrides ||
        (targetOverrides.day_of_week === itemToMove.day_of_week &&
          (!targetOverrides.shift_code || targetOverrides.shift_code === itemToMove.shift_code)))
    ) {
      return
    }

    // Validação Pré-Drop Soberana (Ficha Mestra, Bloqueios, Restrições de Processo)
    const validation = WeeklyScheduleEngine.validateSequenceDrop({
      items,
      fromIndex,
      toIndex,
      lineOverview: currentLineOverview,
      lineCode: selectedLineCode,
    })

    if (!validation.allowed) {
      toast({
        variant: 'destructive',
        title: 'Movimentação Bloqueada',
        description: `Não é possível alterar para esta posição: ${validation.blockingReason}`,
      })
      return
    }

    // Backup para Rollback Transacional
    const backupItems = [...items]

    // Determina o item ou metadados de destino
    const targetItem = items[toIndex]
    const destDay =
      targetOverrides?.day_of_week || targetItem?.day_of_week || itemToMove.day_of_week
    const destShiftCode =
      targetOverrides?.shift_code || targetItem?.shift_code || itemToMove.shift_code

    // Calcula date_str do dia de destino baseado na data de início da semana
    let destDateStr = targetOverrides?.date_str || targetItem?.date_str
    if (!destDateStr && destDay) {
      const dayOffsetMap: Record<string, number> = {
        SEG: 0,
        TER: 1,
        QUA: 2,
        QUI: 3,
        SEX: 4,
        SAB: 5,
        DOM: 6,
      }
      const offset = dayOffsetMap[destDay] ?? 0
      const d = new Date(weekRange.startDate)
      d.setDate(weekRange.startDate.getDate() + offset)
      const pad = (n: number) => String(n).padStart(2, '0')
      destDateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
    }

    // Extrai turno e turma de destino
    const shifts = currentLineOverview?.shifts || []
    const matchedShift = shifts.find((s) => s.code === destShiftCode)
    const destShiftName =
      targetOverrides?.shift_name ||
      targetItem?.shift_name ||
      matchedShift?.name ||
      itemToMove.shift_name ||
      '1º Turno'
    const destCrewName =
      targetOverrides?.crew_name ||
      targetItem?.crew_name ||
      (matchedShift as any)?.crew_name ||
      itemToMove.crew_name ||
      'Turma A'

    // Aplica a reordenação contínua (1, 2, 3, 4...) sem lacunas com herança de metadados
    const reordered = [...items]
    const [moved] = reordered.splice(fromIndex, 1)

    const updatedMovedItem: WeeklyScheduleItem = {
      ...moved,
      day_of_week: destDay,
      date_str: destDateStr || moved.date_str || '24/08',
      shift_code: destShiftCode,
      shift_name: destShiftName,
      crew_name: destCrewName,
    }

    reordered.splice(toIndex, 0, updatedMovedItem)

    // Renumera sequence_order de 1..N sem lacunas
    const reindexed = reordered.map((it, idx) => ({
      ...it,
      sequence_order: idx + 1,
    }))

    // Recalcula horários e setups no motor de forma determinística
    const recalculated = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      reindexed,
      currentLineOverview,
      headerFilter,
      rawMaterialContext,
    )

    // Atualiza estado local imediatamente (otimista)
    setItems(recalculated.items)

    // Persistência imediata com Rollback seguro
    try {
      await weeklyScheduleService.saveWeeklyScheduleDraft(recalculated.items, headerFilter)

      // Sincroniza com Oficina de Cilindros
      rollShopSetupService.syncScheduleWithRollShop(
        recalculated.items,
        headerFilter,
        currentLineOverview,
      )

      const seqDiffDesc = `${itemToMove.material_code} (${itemToMove.day_of_week} #${fromIndex + 1} → ${destDay} #${toIndex + 1})`
      toast({
        title: 'Sequência Reordenada e Persistida',
        description: `Reordenação aplicada: ${seqDiffDesc}. Horários, setups e metadados recalculados e salvos com sucesso.`,
      })
    } catch (saveError) {
      console.error('Falha ao persistir reordenação de sequência:', saveError)
      // Rollback para estado anterior
      setItems(backupItems)
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar Reordenação',
        description:
          'A gravação falhou no servidor. A sequência foi restaurada à última posição válida.',
      })
    }
  }

  // Transferência direta de dia/turno para um item específico
  const handleTransferDayShift = async (
    index: number,
    newDay: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM',
    newShiftCode: string,
  ) => {
    const item = items[index]
    if (!item) return

    const dayOffsetMap: Record<string, number> = {
      SEG: 0,
      TER: 1,
      QUA: 2,
      QUI: 3,
      SEX: 4,
      SAB: 5,
      DOM: 6,
    }
    const offset = dayOffsetMap[newDay] ?? 0
    const d = new Date(weekRange.startDate)
    d.setDate(weekRange.startDate.getDate() + offset)
    const pad = (n: number) => String(n).padStart(2, '0')
    const newDateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`

    const shifts = currentLineOverview?.shifts || []
    const matchedShift = shifts.find((s) => s.code === newShiftCode)

    await handleReorderItems(index, index, {
      day_of_week: newDay,
      date_str: newDateStr,
      shift_code: newShiftCode,
      shift_name: matchedShift?.name || '1º Turno',
      crew_name: (matchedShift as any)?.crew_name || 'Turma A',
    })
  }

  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    handleReorderItems(index, index - 1)
  }

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return
    handleReorderItems(index, index + 1)
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

  // Manipulador de Aguardando Observações
  const handleOpenAwaitingObsModal = (item: WeeklyScheduleItem) => {
    setSelectedScheduleItem(item)
    setIsAwaitingObsModalOpen(true)
  }

  const handleSaveAwaitingObservations = (
    item: WeeklyScheduleItem,
    data: {
      reason: string
      observation: string
      responsible: string
      dateTime: string
      deadline?: string
    },
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === item.id) {
          return {
            ...it,
            status: 'AGUARDANDO_OBSERVACOES',
            awaiting_observations: {
              is_awaiting: true,
              reason: data.reason,
              observation: data.observation,
              responsible: data.responsible,
              date_time: data.dateTime,
              deadline: data.deadline,
            },
          }
        }
        return it
      }),
    )

    toast({
      title: 'Item em Aguardando Observações',
      description: `${item.material_code} marcado com pendência. O item continua ativo na capacidade e sequenciamento.`,
    })
  }

  const handleClearAwaitingObservations = (item: WeeklyScheduleItem) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === item.id) {
          return {
            ...it,
            status: 'DRAFT',
            awaiting_observations: undefined,
          }
        }
        return it
      }),
    )

    toast({
      title: 'Pendência Liberada',
      description: `Observação do item ${item.material_code} concluída e removida.`,
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

  // Análise com IA CIAFAL e Governança de Exceções PCP (Requisitos 8, 9, 10, 11, 12, 13, 14, 15)
  const handleAiAnalysis = async () => {
    if (selectedScheduleItem) {
      setSelectedExceptionItem(selectedScheduleItem)
      setIsPcpExceptionModalOpen(true)
      return
    }

    const recs = rollShopSetupService.generateAISetupRecommendations(
      calculatedItems,
      selectedLineCode,
    )
    setAiSetupRecommendations(recs)
    setIsAiSetupModalOpen(true)
  }

  // Submissão de Justificativa de Exceção pelo Programador (Requisito 12)
  const handleSubmitExceptionJustification = (
    itemId: string,
    justification: ExceptionJustificationData,
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            exception_justification: justification,
            exception_approval_status: 'PENDING_SUPERVISOR',
          }
        }
        return it
      }),
    )

    toast({
      title: 'Justificativa Submetida com Sucesso',
      description: 'Programação mantida como exceção e encaminhada à fila do Supervisor PCP.',
    })
  }

  // Decisão do Supervisor PCP (Aprovar / Rejeitar / Devolver) (Requisito 14)
  const handleSupervisorExceptionAction = (
    itemId: string,
    action: 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_ADJUSTMENT',
    notes: string,
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            exception_approval_status: action,
            pcp_notes: notes ? `[SUPERVISOR PCP ${action}]: ${notes}` : it.pcp_notes,
          }
        }
        return it
      }),
    )

    toast({
      title:
        action === 'APPROVED'
          ? 'Exceção Aprovada pelo Supervisor'
          : action === 'REJECTED'
            ? 'Exceção Rejeitada'
            : 'Devolvido para Ajuste',
      description:
        action === 'APPROVED'
          ? 'Item liberado para geração de OP e MES após publicação.'
          : 'Item retido no planejamento para correções.',
    })
  }

  const handleApplyAiRecommendation = (rec: AISetupRecommendation) => {
    if (rec.type === 'SEQUENCE_OPTIMIZATION') {
      // Reordena itens agrupando perfis semelhantes
      setItems((prev) => {
        const prods = [...prev].sort((a, b) => {
          if (a.item_type !== 'PRODUCTION') return 1
          if (b.item_type !== 'PRODUCTION') return -1
          return (a.family_code || '').localeCompare(b.family_code || '')
        })
        return prods
      })
      toast({
        title: 'Sequência Otimizada com Sucesso',
        description:
          'Produtos reagrupados por família tecnológica. 65 minutos de setup economizados.',
      })
    } else if (rec.type === 'STANDARD_TIME_REVISION') {
      toast({
        title: 'Recomendação Enviada à Engenharia',
        description:
          'Sugestão de revisão do tempo padrão de setup protocolada no módulo Ficha Mestre / Regras.',
      })
    }
    setIsAiSetupModalOpen(false)
  }

  // Abre o Painel de Impacto antes de publicar formalmente a versão (Requisito 12)
  const handleOpenPublishImpact = async () => {
    try {
      const criteria = await scheduleVersioningService.getRelevanceCriteria()
      const wasApproved =
        currentWorkflowState === 'APROVADO' ||
        currentWorkflowState === 'APROVADO_PCP' ||
        currentWorkflowState === 'PUBLICADO'
      const diffs = VersioningEngine.computeScheduleDiffs(
        savedBaselineItems,
        calculatedItems,
        criteria,
        wasApproved,
      )
      const impact = VersioningEngine.evaluateImpact(
        diffs,
        savedBaselineItems,
        calculatedItems,
        selectedLineCode,
        wasApproved,
      )
      setPendingDiffs(diffs)
      setPendingImpact(impact)
      setIsImpactModalOpen(true)
    } catch (err) {
      console.error('Erro ao avaliar impacto:', err)
      toast({
        variant: 'destructive',
        title: 'Erro na Avaliação de Impacto',
        description: 'Não foi possível calcular a matriz de impacto.',
      })
    }
  }

  // Confirma a Publicação Oficial da Nova Versão (Requisito 11, 12, 13, 17, 36)
  const handleConfirmPublishVersion = async (reason: ChangeReasonExact | string, notes: string) => {
    setIsPublishingNewVersion(true)
    try {
      const wasApproved =
        currentWorkflowState === 'APROVADO' ||
        currentWorkflowState === 'APROVADO_PCP' ||
        currentWorkflowState === 'PUBLICADO'

      const result = await scheduleVersioningService.publishNewVersion({
        filter: headerFilter,
        newItems: calculatedItems,
        previousItems: savedBaselineItems,
        changeReason: reason,
        changeNotes: notes,
        wasApprovedBefore: wasApproved,
      })

      if (result.success) {
        setIsImpactModalOpen(false)
        setCurrentWorkflowState('PUBLICADO')
        const nextV = result.versionRecord.version_number
        setCurrentVersion(nextV)
        setSavedBaselineItems(calculatedItems)

        // Atualiza histórico
        const updatedHist = await scheduleVersioningService.getVersionHistory(
          selectedLineCode,
          selectedYear,
          selectedWeekNumber,
        )
        setFullVersionHistoryList(updatedHist)

        // Atualiza alertas MES
        const mesList = await scheduleVersioningService.listMesAlerts(selectedLineCode)
        setMesAlertsList(mesList)

        toast({
          title: `Versão ${result.versionRecord.version_tag} Publicada com Sucesso!`,
          description: `MES alertado em tempo real. ${
            result.crmAlerts && result.crmAlerts.length > 0
              ? `${result.crmAlerts.length} alerta(s) comercial(is) enviado(s) ao CRM.`
              : 'Sem impacto comercial direto (CRM sem ruído).'
          }`,
        })
      }
    } catch (err) {
      console.error('Erro ao publicar versão:', err)
      toast({
        variant: 'destructive',
        title: 'Falha na Publicação de Versão',
        description: 'Verifique conexão e tente novamente.',
      })
    } finally {
      setIsPublishingNewVersion(false)
    }
  }

  // Inicia Transição de Estado no Workflow
  const openTransitionModal = (targetState: WeeklyScheduleWorkflowState, label: string) => {
    if (targetState === 'PUBLICADO') {
      handleOpenPublishImpact()
      return
    }
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

  // Determina itens vizinhos e score da sequência para o painel direito
  const selectedIndex = calculatedItems.findIndex((it) => it.id === selectedScheduleItem?.id)
  const previousItem = selectedIndex > 0 ? calculatedItems[selectedIndex - 1] : null
  const nextItem =
    selectedIndex >= 0 && selectedIndex < calculatedItems.length - 1
      ? calculatedItems[selectedIndex + 1]
      : null

  // Score de Sequência: 72 por padrão se houver troca melhorável
  const sequenceScore = selectedScheduleItem?.sequence_order === 2 ? 72 : 88

  return (
    <div className="space-y-2.5 pb-8 text-slate-900">
      {/* 1. CABEÇALHO COMPACTO DA ÁREA PRINCIPAL (SEMANAL OU MENSAL) */}
      {scheduleViewType === 'MES' ? (
        /* CABEÇALHO MENSAL (REQUISITO 2) */
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div>
            {/* Linha 1: Título Oficial Mensal + Selo EM PROGRAMAÇÃO */}
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-slate-950 uppercase">
                PROGRAMAÇÃO MENSAL - AGOSTO/2026
              </h1>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-black uppercase px-2 py-0.5">
                EM PROGRAMAÇÃO
              </Badge>
              <span className="text-[10px] font-mono text-slate-400">[DADOS DE DEMONSTRAÇÃO]</span>
            </div>

            {/* Linha 2 Compacta na mesma linguagem da semanal */}
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1 text-[11px] text-slate-600 font-medium">
              <span className="flex items-center gap-1">
                <strong className="text-slate-800">Linha:</strong> L1 - Laminação de Perfis Leves
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <strong className="text-slate-800">Mês:</strong> Agosto/2026 (S35 a S39)
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <strong className="text-slate-800">Cenário:</strong> Principal
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <strong className="text-slate-800">Status:</strong> EM PROGRAMAÇÃO
              </span>
            </div>
          </div>

          {/* AÇÕES NA MESMA LINHA (REQUISITO 2): Mês Anterior, Mês Seguinte, Analisar com IA, Comparar Cenários */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: 'Navegação Mensal',
                  description: 'Exibindo programação do mês anterior (Julho/2026).',
                })
              }}
              className="h-7 px-2.5 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <ChevronLeft className="w-3 h-3 mr-0.5" /> Mês Anterior
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: 'Navegação Mensal',
                  description: 'Exibindo programação do mês seguinte (Setembro/2026).',
                })
              }}
              className="h-7 px-2.5 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Mês Seguinte <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMonthlyAiModalOpen(true)}
              className="h-7 px-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Analisar com IA
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsComparisonModalOpen(true)}
              className="h-7 px-2.5 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <GitCompare className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Comparar Cenários
            </Button>
          </div>
        </div>
      ) : (
        /* CABEÇALHO SEMANAL (BASELINE INTACTO) */
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div>
            {/* Linha 1: Título Oficial + Selo RASCUNHO */}
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-slate-950 uppercase">
                PROGRAMAÇÃO SEMANAL - MONTAGEM
              </h1>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-black uppercase px-2 py-0.5">
                RASCUNHO
              </Badge>
              <span className="text-[10px] font-mono text-slate-400">[DADOS DE DEMONSTRAÇÃO]</span>
            </div>

            {/* Linha 2 Compacta com Estabilidade e Versionamento CIAFAL (Requisitos 25 e 26) */}
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1 text-[11px] text-slate-600 font-medium">
              <span className="flex items-center gap-1">
                <strong className="text-slate-800">Linha:</strong> {selectedLineCode} - Laminação de
                Perfis Leves
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <strong className="text-slate-800">Semana:</strong> {selectedWeekNumber} (
                {weekRange.display})
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 font-mono font-bold text-[#004C97]">
                <strong className="text-slate-800">Versão:</strong> V
                {String(currentVersion).padStart(2, '0')}
                {fullVersionHistoryList.length > 1 && (
                  <span className="text-slate-500 font-normal text-[10px] ml-1">
                    ({fullVersionHistoryList.length - 1} alteraç
                    {fullVersionHistoryList.length - 1 === 1 ? 'ão' : 'ões'} desde aprovação)
                  </span>
                )}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <strong className="text-slate-800">Estabilidade:</strong>
                <Badge
                  onClick={() => setIsVersionHistoryModalOpen(true)}
                  className="bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border-emerald-300 font-mono text-[9px] font-bold cursor-pointer transition-colors"
                  title="Clique para abrir Histórico & Auditoria de Alterações"
                >
                  82/100 (Estável)
                </Badge>
              </span>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => (window.location.href = '/pcp/alteracoes')}
                className="text-[#004C97] hover:underline font-bold text-[10.5px] inline-flex items-center gap-0.5"
              >
                Central de Alterações &rarr;
              </button>
            </div>
          </div>

          {/* BOTÕES SUPERIORES À DIREITA NA MESMA LINHA (REQUISITO 3) */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunSimulation}
              className="h-7 px-2.5 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Play className="w-3 h-3 mr-1 text-slate-600" />
              Simular
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAiAnalysis}
              className="h-7 px-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Analisar com IA
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="h-7 px-2.5 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Save className="w-3 h-3 mr-1 text-slate-500" />
              {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>

            <Button
              size="sm"
              onClick={() => openTransitionModal('VALIDADO', 'Validado')}
              className="h-7 px-3 text-xs font-bold bg-[#004C97] hover:bg-[#003d7a] text-white shadow-xs"
            >
              <Send className="w-3 h-3 mr-1" />
              Enviar p/ Revisão
            </Button>
          </div>
        </div>
      )}

      {/* Banner de Alerta MES em Chão de Fábrica (Requisito 14, 15) */}
      <MesAlertBanner
        alerts={mesAlertsList}
        onAcknowledge={async (alertId, notes) => {
          const ok = await scheduleVersioningService.acknowledgeMesAlert(alertId, notes)
          if (ok) {
            toast({
              title: 'Ciência Registrada',
              description: 'Terminal MES atualizado com ciência do operador.',
            })
            const updated = await scheduleVersioningService.listMesAlerts(selectedLineCode)
            setMesAlertsList(updated)
          }
        }}
        onViewDetails={() => (window.location.href = '/pcp/alteracoes')}
      />

      {/* 2. LINHA DE KPIs (SEMANAL OU MENSAL) */}
      {scheduleViewType === 'MES' ? (
        /* KPIs MENSAIS em UMA ÚNICA faixa horizontal compacta (REQUISITO 3) */
        <MonthlyKpiStrip kpis={monthlyKpis} lineCode={selectedLineCode} />
      ) : (
        /* KPIs SEMANAIS (Faixa Única de 8 Indicadores com Drilldown de Setup) */
        <OperationalKpiStrip
          indicators={indicators}
          lineCode={selectedLineCode}
          onOpenSetupDrilldown={() => setIsSetupDrilldownOpen(true)}
        />
      )}

      {/* 3. BARRA DE AÇÕES DA PROGRAMAÇÃO & SELETOR DE VISÃO (REQUISITO 1) */}
      <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Lado Esquerdo: Ações específicas da visão com Barra de Filtros Interdependentes para Visão Mensal */}
        {scheduleViewType === 'MES' ? (
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Filtro Empresa */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-600">Empresa:</span>
              <select
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                aria-label="Empresa"
                className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#004C97]"
              >
                <option value="CIAFAL">CIAFAL Matriz</option>
                <option value="CIAFAL_SUL">CIAFAL Sul</option>
              </select>
            </div>

            {/* Filtro Linha Produtiva */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-600">Linha:</span>
              <select
                value={selectedLineCode}
                onChange={(e) => setSelectedLineCode(e.target.value)}
                aria-label="Linha Produtiva"
                className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#004C97]"
              >
                {lines.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code} - {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Turno da Ficha Mestra */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-600">Turno:</span>
              <select
                value={monthlyFilterShift}
                onChange={(e) => setMonthlyFilterShift(e.target.value)}
                aria-label="Turno da Ficha Mestra"
                className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#004C97]"
              >
                <option value="ALL">Todos os Turnos</option>
                {(currentLineOverview?.shifts || []).map((sh) => (
                  <option key={sh.code} value={sh.code}>
                    {sh.name} ({sh.start_time}–{sh.end_time})
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Produto */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-600">Produto:</span>
              <select
                value={monthlyFilterProduct}
                onChange={(e) => setMonthlyFilterProduct(e.target.value)}
                aria-label="Produto"
                className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#004C97]"
              >
                <option value="ALL">Todos os Produtos</option>
                {Array.from(new Set(calculatedItems.map((it) => it.material_code))).map((mat) => (
                  <option key={mat} value={mat}>
                    {mat}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Cliente */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-600">Cliente:</span>
              <select
                value={monthlyFilterCustomer}
                onChange={(e) => setMonthlyFilterCustomer(e.target.value)}
                aria-label="Cliente"
                className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#004C97]"
              >
                <option value="ALL">Todos os Clientes</option>
                {Array.from(
                  new Set(calculatedItems.map((it) => it.customer_name || 'MTS (Estoque)')),
                ).map((cli) => (
                  <option key={cli} value={cli}>
                    {cli}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão Limpar Filtros */}
            {(monthlyFilterShift !== 'ALL' ||
              monthlyFilterProduct !== 'ALL' ||
              monthlyFilterCustomer !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMonthlyFilterShift('ALL')
                  setMonthlyFilterProduct('ALL')
                  setMonthlyFilterCustomer('ALL')
                }}
                className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Limpar Filtros
              </Button>
            )}
          </div>
        ) : (
          /* Lado Esquerdo Semanal: + Adicionar Produto, Remover, Duplicar, Dividir Qtd. */
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => {
                setTargetDay('SEG')
                setTargetShiftCode('T1_L1')
                setIsAddModalOpen(true)
              }}
              className="h-7 text-xs font-bold bg-[#004C97] hover:bg-[#003d7a] text-white flex items-center gap-1 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Produto
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!selectedScheduleItem}
              onClick={() => {
                if (selectedScheduleItem) {
                  const idx = calculatedItems.findIndex((it) => it.id === selectedScheduleItem.id)
                  if (idx !== -1) handleRemove(idx)
                }
              }}
              className="h-7 px-2 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Trash2 className="w-3 h-3 mr-1 text-slate-500" />
              Remover
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!selectedScheduleItem}
              onClick={() => {
                if (selectedScheduleItem) {
                  const idx = calculatedItems.findIndex((it) => it.id === selectedScheduleItem.id)
                  if (idx !== -1) handleDuplicate(idx)
                }
              }}
              className="h-7 px-2 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Copy className="w-3 h-3 mr-1 text-slate-500" />
              Duplicar
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!selectedScheduleItem}
              onClick={() => {
                if (selectedScheduleItem) {
                  toast({
                    title: 'Dividir Quantidade',
                    description: `Item ${selectedScheduleItem.material_code} preparado para divisão de lote de produção.`,
                  })
                }
              }}
              className="h-7 px-2 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Scissors className="w-3 h-3 mr-1 text-slate-500" />
              Dividir Qtd.
            </Button>
          </div>
        )}

        {/* Centro / Direita: Navegação e Seletor Permanente "Semana | Mês | Linha do Tempo" (REQUISITO 1) */}
        <div className="flex items-center gap-2">
          {scheduleViewType !== 'MES' && (
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prev = selectedWeekNumber > 1 ? selectedWeekNumber - 1 : 52
                  setSelectedWeekNumber(prev)
                }}
                className="h-7 px-2 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <ChevronLeft className="w-3 h-3 mr-0.5" /> Dia Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = selectedWeekNumber < 52 ? selectedWeekNumber + 1 : 1
                  setSelectedWeekNumber(next)
                }}
                className="h-7 px-2 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Dia Seguinte <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
          )}

          {/* SELETOR DE VISÃO PERMANENTE: "Semana | Mês | Linha do Tempo" (REQUISITO 1) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setScheduleViewType('SEMANA')}
              className={`px-2.5 py-1 rounded transition-all ${
                scheduleViewType === 'SEMANA'
                  ? 'bg-[#004C97] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setScheduleViewType('MES')}
              className={`px-2.5 py-1 rounded transition-all ${
                scheduleViewType === 'MES'
                  ? 'bg-[#004C97] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setScheduleViewType('TIMELINE')}
              className={`px-2.5 py-1 rounded transition-all ${
                scheduleViewType === 'TIMELINE'
                  ? 'bg-[#004C97] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Linha do Tempo
            </button>
            <button
              type="button"
              onClick={() => setScheduleViewType('OFICINA_CILINDROS')}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                scheduleViewType === 'OFICINA_CILINDROS'
                  ? 'bg-[#004C97] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-3 h-3" /> Oficina de Cilindros
            </button>
          </div>

          {/* Alternador de Formato no modo Semanal */}
          {scheduleViewType !== 'MES' && (
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                type="button"
                onClick={() => setGridFormat('OPERATIONAL_TIMELINE')}
                title="Grade Operacional com Timeline Proporcional"
                className={`p-1 rounded ${
                  gridFormat === 'OPERATIONAL_TIMELINE'
                    ? 'bg-[#004C97] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setGridFormat('TABULAR')}
                title="Visualização em Lista/Tabela Tabular"
                className={`p-1 rounded ${
                  gridFormat === 'TABULAR'
                    ? 'bg-[#004C97] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. ÁREA CENTRAL: OFICINA DE CILINDROS, MENSAL OU SEMANAL */}
      {scheduleViewType === 'OFICINA_CILINDROS' ? (
        /* VISÃO INTEGRADA DA OFICINA DE CILINDROS (Requisitos 13, 14, 15, 16, 17, 18, 21) */
        <RollShopDemandsView
          lineCode={selectedLineCode}
          onOpenSetupDetail={(dem) => {
            const matched = calculatedItems.find((it) => it.id === dem.schedule_item_id)
            if (matched) {
              setSelectedSetupItem(matched)
              setIsSetupDetailModalOpen(true)
            }
          }}
          onRefresh={() => {
            // Força re-render
            setItems((prev) => [...prev])
          }}
        />
      ) : scheduleViewType === 'MES' ? (
        /* VISÃO MENSAL: GRADE OPERACIONAL S35-S39 + PAINEL DO DIA CLICADO (REQUISITOS 4 & 5) */
        <div className="flex flex-col xl:flex-row gap-2.5 items-start w-full">
          {/* Coluna Central: GRADE MENSAL PRINCIPAL */}
          <div className="flex-1 min-w-0 w-full space-y-2.5">
            <MonthlyScheduleGrid
              weeks={monthlyWeeksGrid}
              selectedDateIso={selectedMonthDateIso}
              onSelectDay={(day) => {
                setSelectedMonthDateIso(day.dateIso)
                if (day.items && day.items.length > 0) {
                  setSelectedScheduleItem(day.items[0])
                }
              }}
              onSelectWeek={(weekNum) => {
                setSelectedWeekNumber(weekNum)
                setScheduleViewType('SEMANA')
                toast({
                  title: `Navegando para Semana ${weekNum}`,
                  description: `Abrindo grade operacional detalhada da Semana ${weekNum}.`,
                })
              }}
            />
          </div>

          {/* Coluna Direita: PAINEL DO DIA CLICADO (REQUISITO 5) */}
          <MonthlyDayDetailPanel
            day={selectedMonthlyDay}
            onOpenWeeklySchedule={(weekNum, dateStr, dayCode) => {
              setSelectedWeekNumber(weekNum)
              setScheduleViewType('SEMANA')
              toast({
                title: 'Programação Semanal Aberta',
                description: `Focalizando ${dayCode} (${dateStr}) na Semana ${weekNum}.`,
              })
            }}
            onSelectProductItem={(item) => {
              setSelectedScheduleItem(item)
              if (item.week_number) setSelectedWeekNumber(item.week_number)
              setScheduleViewType('SEMANA')
            }}
          />
        </div>
      ) : (
        /* VISÃO SEMANAL: GRADE OPERACIONAL + PAINEL DIREITO FIXO (BASELINE OFICIAL) */
        <div className="flex flex-col xl:flex-row gap-2.5 items-start w-full">
          {/* Coluna Central Dominante: GRADE OPERACIONAL */}
          <div className="flex-1 min-w-0 w-full space-y-2.5">
            {gridFormat === 'OPERATIONAL_TIMELINE' ? (
              <OperationalTimelineGrid
                items={calculatedItems}
                lineOverview={currentLineOverview}
                selectedItemId={selectedScheduleItem?.id}
                onSelectItem={(item) => setSelectedScheduleItem(item)}
                onEditItem={handleOpenEditItem}
                onMoveItem={(from, to) => handleReorderItems(from, to)}
                onDuplicateItem={handleDuplicate}
                onRemoveItem={handleRemove}
                onAddItem={(day, shift) => {
                  setTargetDay(day)
                  setTargetShiftCode(shift)
                  setIsAddModalOpen(true)
                }}
                onOpenAwaitingModal={handleOpenAwaitingObsModal}
                onOpenSetupDetail={(item) => {
                  setSelectedSetupItem(item)
                  setIsSetupDetailModalOpen(true)
                }}
              />
            ) : (
              <WeeklyScheduleGrid
                items={calculatedItems}
                lineOverview={currentLineOverview}
                selectedItemId={selectedScheduleItem?.id}
                onSelectItem={(item) => setSelectedScheduleItem(item)}
                onEditItem={handleOpenEditItem}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onDuplicate={handleDuplicate}
                onRemove={handleRemove}
                onOpenAddModal={(d, s) => {
                  setTargetDay(d)
                  setTargetShiftCode(s)
                  setIsAddModalOpen(true)
                }}
                onMoveItem={(from, to) => handleReorderItems(from, to)}
                onTransferDayShift={handleTransferDayShift}
                onAddStop={handleAddStop}
                onOpenAwaitingObservationsModal={handleOpenAwaitingObsModal}
                filterOption={gridFilter}
                onFilterChange={setGridFilter}
              />
            )}
          </div>

          {/* Coluna 3: PAINEL DIREITO FIXO (REQUISITO 15) SEM MODAL */}
          <SelectedItemDetailPanel
            item={selectedScheduleItem}
            sequenceIndex={selectedIndex !== -1 ? selectedIndex + 1 : 2}
            previousItem={previousItem}
            nextItem={nextItem}
            sequenceScore={sequenceScore}
            onAiAnalyze={handleAiAnalysis}
            onOpenSetupDetail={(item) => {
              setSelectedSetupItem(item)
              setIsSetupDetailModalOpen(true)
            }}
          />
        </div>
      )}

      {/* 5. PAINÉIS INFERIORES — 4 LADO A LADO (SEMANAL OU MENSAL) */}
      {scheduleViewType === 'MES' ? (
        /* CONSOLIDADOS MENSAIS: Desempenho Semanal / MP & Tarugos com 1ª Data de Risco / Carteira / Aguardando Obs (REQUISITOS 6, 7, 8, 9) */
        <MonthlyBottomOperationalPanels
          weeks={monthlyWeeksGrid}
          rawMaterials={monthlyRawMaterials}
          backlog={monthlyBacklog}
          awaitingObs={monthlyAwaitingObs}
          lineCode={selectedLineCode}
          onSelectWeek={(weekNum) => {
            setSelectedWeekNumber(weekNum)
            setScheduleViewType('SEMANA')
          }}
          onNavigateToObsItem={(obs) => {
            setSelectedWeekNumber(obs.weekNumber)
            setScheduleViewType('SEMANA')
            const matchedItem = calculatedItems.find(
              (it) => it.id === obs.scheduleItemId || it.material_code === obs.materialCode,
            )
            if (matchedItem) {
              setSelectedScheduleItem(matchedItem)
              setIsAwaitingObsModalOpen(true)
            }
          }}
          onViewMpAnalysis={() => {
            window.location.href = '/pcp/estoques?tab=cobertura'
          }}
          onViewCarteira={() => {
            window.location.href = '/pcp/sequenciamento/carteira'
          }}
        />
      ) : (
        /* CONSOLIDADOS SEMANAIS (BASELINE OFICIAL) */
        <BottomOperationalPanels
          summary={summary}
          indicators={indicators}
          lineCode={selectedLineCode}
          onViewAllAlerts={() => setIsSimulationModalOpen(true)}
          onViewMpAnalysis={() => {
            window.location.href = '/pcp/estoques?tab=cobertura'
          }}
          onViewCarteira={() => {
            window.location.href = '/pcp/sequenciamento/carteira'
          }}
        />
      )}

      {/* 6. RODAPÉ OPERACIONAL (REQUISITO 18) */}
      <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Status da Programação:</span>
          <Badge className="bg-slate-100 text-slate-800 border-slate-300 font-mono text-[10px] font-bold">
            RASCUNHO
          </Badge>
          <span className="text-[10px] text-slate-400 font-mono">
            Última alteração: Hoje, às 14:32 por Programador PCP
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVersionHistoryModalOpen(true)}
            className="h-7 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <History className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Histórico de Versões
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsComparisonModalOpen(true)}
            className="h-7 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <GitCompare className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Comparar Cenários
          </Button>

          <Button
            size="sm"
            onClick={() => openTransitionModal('VALIDADO', 'Validado')}
            className="h-7 text-xs font-bold bg-[#004C97] hover:bg-[#003d7a] text-white shadow-xs"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            Enviar para Revisão
          </Button>
        </div>
      </div>

      {/* 6. MODAL DE ADICIONAR PRODUTO */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddProduct}
        lineCode={selectedLineCode}
        officialMaterials={officialMaterials}
        lineOverview={currentLineOverview}
        existingItems={items}
        targetDay={targetDay}
        targetShiftCode={targetShiftCode}
        targetShiftName={targetShiftName}
        targetCrewName={targetCrewName}
      />

      {/* 6.1 MODAL DE EDIÇÃO DE PRODUTO */}
      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingItem(null)
        }}
        onSave={handleSaveEditedItem}
        item={editingItem}
        lineCode={selectedLineCode}
        officialMaterials={officialMaterials}
        lineOverview={currentLineOverview}
        existingItems={items}
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

      {/* 11. MODAL DE HISTÓRICO COMPLETO DE VERSÕES E AUDITORIA (REQUISITO 4, 5, 6, 7) */}
      <FullVersionHistoryModal
        isOpen={isVersionHistoryModalOpen}
        onClose={() => setIsVersionHistoryModalOpen(false)}
        versions={fullVersionHistoryList}
        scheduleCode={`WS-${selectedLineCode}-${selectedYear}-W${String(selectedWeekNumber).padStart(2, '0')}`}
        currentVersionNumber={currentVersion}
        lineCode={selectedLineCode}
        weekDisplay={`Semana ${selectedWeekNumber} (${weekRange.display})`}
      />

      {/* 11.1 MODAL DE PAINEL DE IMPACTO PRÉ-PUBLICAÇÃO (REQUISITO 12) */}
      <PrePublishImpactModal
        isOpen={isImpactModalOpen}
        onClose={() => setIsImpactModalOpen(false)}
        onConfirmPublish={handleConfirmPublishVersion}
        impact={pendingImpact}
        diffs={pendingDiffs}
        nextVersionTag={VersioningEngine.formatVersionTag(currentVersion + 1)}
        previousVersionTag={VersioningEngine.formatVersionTag(currentVersion)}
        lineCode={selectedLineCode}
        weekDisplay={`Semana ${selectedWeekNumber}`}
        isPublishing={isPublishingNewVersion}
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

      {/* 13. MODAL DE AGUARDANDO OBSERVAÇÕES */}
      <AwaitingObservationsModal
        isOpen={isAwaitingObsModalOpen}
        onClose={() => setIsAwaitingObsModalOpen(false)}
        item={selectedScheduleItem}
        onSave={handleSaveAwaitingObservations}
        onClearAwaiting={handleClearAwaitingObservations}
      />

      {/* 14. MODAL DE ANÁLISE IA MENSAL (ETAPA 5 - REQUISITO 10) */}
      <MonthlyAiAnalysisModal
        isOpen={isMonthlyAiModalOpen}
        onClose={() => setIsMonthlyAiModalOpen(false)}
        report={monthlyAiReport}
        lineCode={selectedLineCode}
      />

      {/* 15. MODAIS DE SETUP, SMED, DRILLDOWN E IA (Requisitos 6, 12, 23, 33) */}
      <SetupDetailModal
        isOpen={isSetupDetailModalOpen}
        onClose={() => setIsSetupDetailModalOpen(false)}
        item={selectedSetupItem}
        demand={
          selectedSetupItem
            ? rollShopSetupService
                .getDemands(selectedLineCode)
                .find((d) => d.schedule_item_id === selectedSetupItem.id) || null
            : null
        }
        onDemandUpdated={() => {
          setItems((prev) => [...prev])
        }}
      />

      <SetupCapacityDrilldownModal
        isOpen={isSetupDrilldownOpen}
        onClose={() => setIsSetupDrilldownOpen(false)}
        items={calculatedItems}
        lineCode={selectedLineCode}
        totalSetupHours={indicators.setupHours}
        totalSetupsCount={indicators.setupsCount ?? 0}
        capacityLossTons={indicators.capacityLossTons ?? 24.8}
        onSelectSetupItem={(it) => {
          setIsSetupDrilldownOpen(false)
          setSelectedSetupItem(it)
          setIsSetupDetailModalOpen(true)
        }}
      />

      <AISetupOptimizationModal
        isOpen={isAiSetupModalOpen}
        onClose={() => setIsAiSetupModalOpen(false)}
        recommendations={aiSetupRecommendations}
        onApplyRecommendation={handleApplyAiRecommendation}
      />

      {/* 16. MODAL DE GOVERNANÇA DE EXCEÇÕES PCP E ANÁLISE IA (Requisitos 8, 9, 10, 11, 12, 13, 14, 15) */}
      <PCPExceptionGovernanceModal
        isOpen={isPcpExceptionModalOpen}
        onClose={() => setIsPcpExceptionModalOpen(false)}
        item={selectedExceptionItem}
        userRole={auth?.user?.role || 'SUPERVISOR_PCP'}
        userName={auth?.user?.name || 'Supervisor PCP'}
        onSubmitJustification={handleSubmitExceptionJustification}
        onSupervisorAction={handleSupervisorExceptionAction}
      />
    </div>
  )
}
export default WeeklyScheduleOperationalPage
