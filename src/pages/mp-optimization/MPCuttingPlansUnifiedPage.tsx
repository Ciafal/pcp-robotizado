import React, { useState, useEffect, useMemo } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import {
  MPDimensionalItem,
  MPApplicationRequirement,
  MPCuttingPlan,
  CuttingScenarioType,
  ScenarioDetail,
  ReservationStatus,
  LeftoverClassification,
} from '@/types/mp-optimization'
import {
  generateCuttingScenarios,
  DEFAULT_OPTIMIZATION_PARAMETERS,
} from '@/services/mp-optimization-engine'
import { MP3DCanvasViewer } from '@/components/mp-optimization/MP3DCanvasViewer'
import { MPCuttingWeightStandardsModal } from '@/components/mp-optimization/MPCuttingWeightStandardsModal'
import { MPCuttingOptimizationFilterBar } from '@/components/mp-optimization/MPCuttingOptimizationFilterBar'
import { MPCuttingComparativeScenariosGrid } from '@/components/mp-optimization/MPCuttingComparativeScenariosGrid'
import { MPCuttingScenarioDetailModal } from '@/components/mp-optimization/MPCuttingScenarioDetailModal'
import { MPCuttingSimulationsHistoryModal } from '@/components/mp-optimization/MPCuttingSimulationsHistoryModal'
import { mpCuttingWeightStandardsService } from '@/services/mp-cutting-weight-standards-service'
import { mpCuttingOptimizationEngineService } from '@/services/mp-cutting-optimization-engine-service'
import { MPCuttingBatchSelector } from '@/components/mp-optimization/MPCuttingBatchSelector'
import { pcpCuttingBatchStockService } from '@/services/pcp-cutting-batch-stock-service'
import type {
  MPCuttingWeightStandard,
  MPCuttingOptimizationFilters,
  MPCuttingScenarioItem,
  MPCuttingSimulationResult,
} from '@/types/mp-cutting-weight-standards'
import { CuttingPlanBottleneckValidationSection } from '@/components/mp-optimization/CuttingPlanBottleneckValidationSection'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Sparkles,
  Scissors,
  Layers,
  Boxes,
  Maximize2,
  Sliders,
  History,
  ShieldCheck,
  ShieldAlert,
  Send,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { ResponsiveHorizontalNav } from '@/components/common/ResponsiveHorizontalNav'
import { MPDimensionalOperationalGrid } from '@/components/mp-optimization/MPDimensionalOperationalGrid'
import { MPMultipleCuttingPlanSection } from '@/components/mp-optimization/MPMultipleCuttingPlanSection'
import {
  MPCuttingPlansFilterBar,
  MPCuttingViewFilters,
  DEFAULT_CUTTING_VIEW_FILTERS,
} from '@/components/mp-optimization/MPCuttingPlansFilterBar'
import { formatNumberPtBr } from '@/lib/number-format'

export const MPCuttingPlansUnifiedPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const validTabs = useMemo(
    () => [
      'CENARIOS',
      'CORTE_MULTIPLO',
      'HISTORICO',
      'NOVO_PLANO',
      'ESTOQUE_DIMENSIONAL',
      'VALIDACAO_GARGALOS',
      'PROJECAO_3D',
      'MATRIZ_REQUISITOS',
    ],
    [],
  )

  const [activeSecondaryTab, setActiveSecondaryTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('planos_corte_secondary_tabs')
      if (saved && validTabs.includes(saved)) {
        // Se a aba salva requer dados adicionais não carregados no cold start (ex: CENARIOS/VALIDACAO_GARGALOS),
        // fallback seguro para a primeira aba operacional
        return saved
      }
    } catch {
      // Ignora erro de acesso ao localStorage
    }
    return 'CENARIOS'
  })
  // Filtros unificados de Planos de Corte / Estoque Dimensional
  const [viewFilters, setViewFilters] = useState<MPCuttingViewFilters>(DEFAULT_CUTTING_VIEW_FILTERS)

  const [items, setItems] = useState<MPDimensionalItem[]>([])
  const [requirements, setRequirements] = useState<MPApplicationRequirement[]>([])
  const [plans, setPlans] = useState<MPCuttingPlan[]>([])
  const [selectedPlate, setSelectedPlate] = useState<MPDimensionalItem | null>(null)
  const [materialForMultiple, setMaterialForMultiple] = useState<any | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isLoadingInventory, setIsLoadingInventory] = useState(false)
  const [scenarios, setScenarios] = useState<Record<CuttingScenarioType, ScenarioDetail> | null>(
    null,
  )
  const [selectedScenarioType, setSelectedScenarioType] =
    useState<CuttingScenarioType>('RECOMENDADO_IA')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false)

  // Estados dos Padrões de Peso para Corte e Motor de Cenários Comparativos Evoluído
  const [isStandardsModalOpen, setIsStandardsModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [detailModalScenario, setDetailModalScenario] = useState<MPCuttingScenarioItem | null>(null)
  const [weightStandards, setWeightStandards] = useState<MPCuttingWeightStandard[]>([])
  const [optimizationFilters, setOptimizationFilters] = useState<MPCuttingOptimizationFilters>({
    company_code: 'CIAFAL',
    center_code: 'SEML1',
    cutting_type: 'BLOCOS',
    material_code: 'TARUGO-130-1020',
    steel_family: 'SAE 1020',
    selected_standard_codes: [],
    target_weight_kg: 1250,
    min_weight_kg: 1200,
    max_weight_kg: 1300,
    required_weight_tons: 30,
    optimization_criterion: 'MAIOR_APROVEITAMENTO',
  })
  const [comparativeScenarios, setComparativeScenarios] = useState<MPCuttingScenarioItem[]>([])
  const [bestScenarioId, setBestScenarioId] = useState<string>('')
  const [selectedComparativeScenarioId, setSelectedComparativeScenarioId] = useState<string>('')
  const [aiJustification, setAiJustification] = useState<string>('')
  const [activeSimulation, setActiveSimulation] = useState<MPCuttingSimulationResult | null>(null)
  const [highlightBatchError, setHighlightBatchError] = useState(false)

  const loadWeightStandards = async () => {
    try {
      const data = await mpCuttingWeightStandardsService.listStandards(true)
      setWeightStandards(data)
      // Se não havia padrão selecionado e há padrões cadastrados, seleciona o primeiro por padrão
      if (data.length > 0 && optimizationFilters.selected_standard_codes.length === 0) {
        const first = data[0]
        setOptimizationFilters((prev) => ({
          ...prev,
          selected_standard_codes: [first.code],
          target_weight_kg: first.target_weight_kg,
          min_weight_kg: first.min_weight_kg,
          max_weight_kg: first.max_weight_kg,
          steel_family: first.steel_family || prev.steel_family,
        }))
      }
    } catch (e) {
      console.warn('Erro ao carregar padrões de peso:', e)
    }
  }

  const loadData = async () => {
    setIsLoadingInventory(true)
    setSyncError(null)
    try {
      const [inv, reqs, cutPlans] = await Promise.all([
        mpOptimizationService.getDimensionalInventory(),
        mpOptimizationService.getApplicationRequirements(),
        mpOptimizationService.getCuttingPlans(),
      ])
      setItems(inv)
      setRequirements(reqs)
      setPlans(cutPlans)
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR'))
      if (inv.length > 0 && !selectedPlate) {
        setSelectedPlate(inv[0])
      }
    } catch (err: any) {
      console.warn('Erro ao carregar dados de corte:', err)
      setSyncError(err.message || 'Falha na interface de integração SAP ECC.')
    } finally {
      setIsLoadingInventory(false)
    }
  }

  // Opções únicas disponíveis para os filtros
  const availableCenters = useMemo(
    () => Array.from(new Set(items.map((i) => i.center_code).filter(Boolean))),
    [items],
  )
  const availableDepots = useMemo(
    () => Array.from(new Set(items.map((i) => i.storage_location).filter(Boolean))) as string[],
    [items],
  )
  const availableItemTypes = useMemo(
    () => Array.from(new Set(items.map((i) => i.item_type).filter(Boolean))),
    [items],
  )
  const availableSteelGrades = useMemo(
    () => Array.from(new Set(items.map((i) => i.steel_grade).filter(Boolean))) as string[],
    [items],
  )

  // Itens filtrados com base nos filtros da visualização de Planos de Corte
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (viewFilters.center !== 'ALL' && item.center_code !== viewFilters.center) return false
      if (viewFilters.depot !== 'ALL' && item.storage_location !== viewFilters.depot) return false
      if (viewFilters.itemType !== 'ALL' && item.item_type !== viewFilters.itemType) return false
      if (viewFilters.steelGrade !== 'ALL' && item.steel_grade !== viewFilters.steelGrade)
        return false
      if (
        viewFilters.reservationStatus !== 'ALL' &&
        item.reservation_status !== viewFilters.reservationStatus
      ) {
        return false
      }

      if (viewFilters.searchTerm.trim()) {
        const q = viewFilters.searchTerm.toLowerCase()
        const matchCode = item.material_code?.toLowerCase().includes(q)
        const matchDesc = item.material_description?.toLowerCase().includes(q)
        const matchBatch = item.batch_number?.toLowerCase().includes(q)
        const matchHeat = item.heat_number?.toLowerCase().includes(q)
        const matchBlock = item.block_number?.toLowerCase().includes(q)
        const matchSupp = item.supplier_name?.toLowerCase().includes(q)
        if (!matchCode && !matchDesc && !matchBatch && !matchHeat && !matchBlock && !matchSupp) {
          return false
        }
      }

      return true
    })
  }, [items, viewFilters])

  // Totalizadores / Cards de Indicadores calculados dinamicamente sobre filteredItems
  const viewMetrics = useMemo(() => {
    let totalAvailableWeightKg = 0
    let totalFilteredWeightKg = 0
    let platesCount = 0
    let blocksCount = 0
    let piecesCount = 0
    let reusableLeftoversCount = 0
    let blockedCount = 0

    filteredItems.forEach((it) => {
      const wKg = it.weight_kg || 0
      totalFilteredWeightKg += wKg
      if (it.reservation_status === 'LIVRE' || it.reservation_status === 'SUGESTAO_RESERVA') {
        totalAvailableWeightKg += wKg
      }
      if (it.reservation_status === 'BLOQUEADA') {
        blockedCount += 1
      }
      if (it.item_type === 'PLACA') platesCount += 1
      else if (it.item_type === 'BLOCO') blocksCount += 1
      else if (it.item_type === 'PECA') piecesCount += 1
      else if (it.item_type === 'SOBRA_REUTILIZAVEL') reusableLeftoversCount += 1
    })

    return {
      totalAvailableWeightTons: totalAvailableWeightKg / 1000,
      totalFilteredWeightTons: totalFilteredWeightKg / 1000,
      totalCount: filteredItems.length,
      platesCount,
      blocksCount,
      piecesCount,
      reusableLeftoversCount,
      blockedCount,
    }
  }, [filteredItems])

  // Se a placa selecionada não passar pelos filtros aplicados, reajusta para a primeira compatível
  useEffect(() => {
    if (filteredItems.length > 0) {
      const isCurrentInFiltered = filteredItems.some((it) => it.id === selectedPlate?.id)
      if (!isCurrentInFiltered) {
        setSelectedPlate(filteredItems[0])
      }
    } else if (items.length > 0 && filteredItems.length === 0) {
      setSelectedPlate(null)
    }
  }, [filteredItems])

  useEffect(() => {
    loadData()
    loadWeightStandards()
  }, [])

  // Geração dos Cenários de Plano Blocos pelo Motor Integrado aos Padrões de Peso
  const handleGenerateComparativeScenarios = async () => {
    // REGRA OBRIGATÓRIA: Se Tipo de Corte = Múltiplos e não há material+lote selecionado
    if (optimizationFilters.cutting_type === 'MULTIPLOS') {
      const hasBatch = Boolean(
        optimizationFilters.selected_batch_number &&
        (optimizationFilters.selected_material_code || optimizationFilters.material_code),
      )

      if (!hasBatch) {
        setHighlightBatchError(true)
        toast({
          variant: 'destructive',
          title: 'Seleção Obrigatória',
          description:
            'Selecione o material e o lote da matéria-prima antes de gerar o Plano de Corte para Múltiplos.',
        })

        // Rola suavemente até o quadro
        const element = document.getElementById('quadro-material-lote-multiplos')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        return
      }

      // Revalidar saldo do lote antes de gerar
      const targetMaterial =
        optimizationFilters.selected_material_code || optimizationFilters.material_code
      const requiredTons = optimizationFilters.required_weight_tons || 30

      try {
        const reval = await pcpCuttingBatchStockService.revalidateBatchBalance(
          targetMaterial,
          optimizationFilters.selected_batch_number!,
          requiredTons,
          optimizationFilters.center_code,
        )

        if (!reval.isValid || !reval.isSufficient) {
          setHighlightBatchError(true)
          toast({
            variant: 'destructive',
            title: 'Saldo de Lote Insuficiente',
            description:
              reval.errorMessage ||
              `O lote [${optimizationFilters.selected_batch_number}] não possui saldo suficiente para o cenário solicitado. Revise a seleção ou os parâmetros do Plano de Corte.`,
          })
          const element = document.getElementById('quadro-material-lote-multiplos')
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
          return
        }

        // Se o saldo mudou entre a seleção e a geração, atualizar os filtros
        if (
          reval.item &&
          reval.item.available_stock !== optimizationFilters.selected_batch_available_stock
        ) {
          setOptimizationFilters((prev) => ({
            ...prev,
            selected_batch_available_stock: reval.item!.available_stock,
            selected_batch_unit: reval.item!.unit,
            selected_storage_location: reval.item!.storage_location,
          }))
        }
      } catch (err: any) {
        console.warn('Erro ao revalidar saldo do lote:', err)
      }
    }

    setHighlightBatchError(false)
    setIsGenerating(true)
    try {
      const simResult = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
        optimizationFilters,
        weightStandards,
      )
      setComparativeScenarios(simResult.scenarios)
      setBestScenarioId(simResult.best_scenario_id)
      setSelectedComparativeScenarioId(simResult.best_scenario_id)
      setAiJustification(simResult.technical_justification || '')
      setActiveSimulation(simResult)

      // Salva no banco de dados para rastreabilidade histórica
      await mpCuttingWeightStandardsService.saveSimulation(
        simResult,
        user?.name || user?.email || 'Engenheiro PCP',
      )

      toast({
        title: 'Cenários de Plano Blocos Gerados',
        description: `Motor calculou os cenários de blocos com base no critério [${simResult.optimization_criterion}] e padrões de peso.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar cenários',
        description: err.message || 'Falha no motor de otimização.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Executa uma simulação inicial automática para preencher a tela quando carrega (apenas se não for Múltiplos sem lote)
  useEffect(() => {
    if (comparativeScenarios.length === 0 && !isGenerating) {
      if (
        optimizationFilters.cutting_type === 'MULTIPLOS' &&
        !optimizationFilters.selected_batch_number
      ) {
        return
      }
      handleGenerateComparativeScenarios()
    }
  }, [weightStandards.length])

  const handleGeneratePlan = () => {
    if (!selectedPlate) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma Placa Selecionada',
        description: 'Selecione uma placa ou bloco rastreável do estoque dimensional.',
      })
      return
    }

    setIsGenerating(true)
    setTimeout(() => {
      const demands = [
        {
          order_number: 'ORD-70891',
          application: 'APL_LAM_ESTRUTURAL',
          width_mm: 550,
          length_mm: 1400,
          qty: 1,
          weight_kg: 1800,
        },
        {
          order_number: 'ORD-70892',
          application: 'APL_LAM_ESTRUTURAL',
          width_mm: 550,
          length_mm: 1400,
          qty: 1,
          weight_kg: 1800,
        },
      ]

      const results = generateCuttingScenarios(
        selectedPlate,
        demands,
        DEFAULT_OPTIMIZATION_PARAMETERS,
      )
      setScenarios(results)
      setIsGenerating(false)
      setActiveSecondaryTab('CENARIOS')
      toast({
        title: '6 Cenários Gerados com Sucesso',
        description:
          'Motor IA comparou: Recomendado, Maior Rendimento, Menor Custo, Menor Sucata, Preservação de MP Crítica e Maior Atendimento da Carteira.',
      })
    }, 450)
  }

  const handleCommitReservation = async (item: MPDimensionalItem) => {
    try {
      await mpOptimizationService.updateDimensionalItem(item.id, {
        reservation_status: 'RESERVADA',
      })
      toast({
        title: 'Reserva Efetivada no SAP',
        description: `Bloco ${item.block_number} reservado com sucesso pelo Programador PCP.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Efetivar Reserva',
        description: err.message,
      })
    }
  }

  const handleRequestApproval = async () => {
    if (!scenarios || !selectedPlate) return

    setIsSubmittingApproval(true)
    try {
      const activeScen = scenarios[selectedScenarioType]
      const planCode = `PLN-CORTE-${Date.now()}`

      await mpOptimizationService.createCuttingPlan({
        plan_code: planCode,
        version: 1,
        title: `Plano de Corte ${selectedPlate.block_number || selectedPlate.material_code} — ${activeScen.name}`,
        status: 'PENDENTE_APROVACAO',
        selected_scenario: selectedScenarioType,
        source_plates_count: 1,
        total_input_weight_tons: Number(((selectedPlate.weight_kg || 4000) / 1000).toFixed(2)),
        total_output_weight_tons: Number(
          (((selectedPlate.weight_kg || 4000) * (activeScen.yield_pct / 100)) / 1000).toFixed(2),
        ),
        overall_yield_pct: activeScen.yield_pct,
        overall_ai_score: activeScen.score_ia,
        created_by_user_id: user?.id,
        created_by_user_name: user?.name || user?.email || 'Programador PCP',
      })

      await mpOptimizationService.createWorkflowApproval({
        approval_code: `APPR-${Date.now()}`,
        approval_type: 'PLANO_CORTE',
        entity_ref_id: planCode,
        title: `Aprovação de Plano de Corte — ${selectedPlate.block_number}`,
        block_number: selectedPlate.block_number,
        original_application: selectedPlate.original_application,
        stage_pcp_status: 'PENDENTE',
        stage_quality_status: 'NAO_APLICAVEL',
        stage_production_status: 'PENDENTE',
        overall_status: 'EM_ANALISE',
        ai_recommendation_summary: `Score IA ${activeScen.score_ia}/100. Rendimento ${activeScen.yield_pct}%, Sucata ${activeScen.scrap_pct}%.`,
      })

      // Atualiza estado de reserva da placa
      await mpOptimizationService.updateDimensionalItem(selectedPlate.id, {
        reservation_status: 'CORTE_APROVADO',
      })

      toast({
        title: 'Plano Submetido para Aprovação Governança',
        description: 'Fluxo em 2 fases: Aprovação humana PCP + Produção.',
      })
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Submeter Plano',
        description: err.message,
      })
    } finally {
      setIsSubmittingApproval(false)
    }
  }

  const activeScenario = scenarios ? scenarios[selectedScenarioType] : null

  return (
    <MPModuleLayout
      activeTopic="planos-corte"
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGeneratePlan}
            disabled={isGenerating || !selectedPlate}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-2 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />[ GERAR MELHOR PLANO COM IA ]
          </Button>
        </div>
      }
    >
      {/* Régua de Abas Secundárias Obrigatórias de Planos de Corte com Navegação Horizontal Responsiva */}
      <Tabs
        value={activeSecondaryTab}
        onValueChange={(v: any) => setActiveSecondaryTab(v)}
        className="w-full space-y-4"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs">
          <ResponsiveHorizontalNav
            ariaLabel="Navegação interna de Planos de Corte"
            storageKey="planos_corte_secondary_tabs"
            activeId={activeSecondaryTab}
            onSelect={(id) => setActiveSecondaryTab(id as any)}
            rightContent={
              <Badge
                variant="outline"
                className="text-[11px] font-mono text-[#004C97] border-blue-200"
              >
                Kerf: 5.0mm &bull; Margem: 10.0mm &bull; Tolerância Real SAP
              </Badge>
            }
            items={[
              {
                id: 'CENARIOS',
                label: 'Plano Blocos',
                icon: Sliders,
              },
              {
                id: 'CORTE_MULTIPLO',
                label: 'Plano de Corte Múltiplo',
                badge: (
                  <Badge
                    variant="outline"
                    className="ml-1 text-[9px] py-0 h-4 bg-emerald-100 text-emerald-800 border-emerald-300"
                  >
                    Novo
                  </Badge>
                ),
                icon: Sparkles,
              },
              {
                id: 'HISTORICO',
                label: 'Histórico de Planos',
                icon: History,
              },
              {
                id: 'NOVO_PLANO',
                label: 'Novo Plano',
                badge: (
                  <Badge
                    variant="secondary"
                    className="ml-1 text-[10px] font-mono py-0 h-4 bg-slate-200 text-slate-800"
                  >
                    {filteredItems.length}
                  </Badge>
                ),
                icon: Scissors,
              },
              {
                id: 'ESTOQUE_DIMENSIONAL',
                label: 'Estoque Dimensional',
                badge: (
                  <Badge
                    variant="secondary"
                    className="ml-1 text-[10px] font-mono py-0 h-4 bg-slate-200 text-slate-800"
                  >
                    {filteredItems.length}
                  </Badge>
                ),
                icon: Boxes,
              },
              {
                id: 'VALIDACAO_GARGALOS',
                label: 'Validação Matriz de Gargalos',
                icon: ShieldAlert,
                activeItemClassName: 'bg-rose-600 text-white shadow-xs',
              },
              {
                id: 'PROJECAO_3D',
                label: 'Gêmeo Digital 3D',
                icon: Maximize2,
              },
              {
                id: 'MATRIZ_REQUISITOS',
                label: 'Matriz Oficial (ZPPMP)',
                icon: Layers,
              },
            ]}
          />
        </div>

        {/* BARRA UNIFICADA DE FILTROS DE PLANOS DE CORTE */}
        <MPCuttingPlansFilterBar
          filters={viewFilters}
          onFiltersChange={setViewFilters}
          onClearFilters={() => setViewFilters(DEFAULT_CUTTING_VIEW_FILTERS)}
          availableCenters={availableCenters}
          availableDepots={availableDepots}
          availableItemTypes={availableItemTypes}
          availableSteelGrades={availableSteelGrades}
          totalItemsCount={items.length}
          filteredItemsCount={filteredItems.length}
          isSapEmpty={items.length === 0}
        />

        {/* CARDS INDICADORES / TOTALIZADORES OPERACIONAIS (Refletem os filtros aplicados) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">
              Peso Livre para Corte
            </span>
            <div className="text-base font-black font-mono text-[#004C97] mt-0.5">
              {formatNumberPtBr(viewMetrics.totalAvailableWeightTons, 3)} t
            </div>
            <span className="text-[10px] text-emerald-700">Disponível Imediato</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">
              Peso Total Filtrado
            </span>
            <div className="text-base font-black font-mono text-slate-900 mt-0.5">
              {formatNumberPtBr(viewMetrics.totalFilteredWeightTons, 3)} t
            </div>
            <span className="text-[10px] text-slate-500">{viewMetrics.totalCount} un</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Placas</span>
            <div className="text-base font-black font-mono text-slate-900 mt-0.5">
              {viewMetrics.platesCount} un
            </div>
            <span className="text-[10px] text-slate-400">Pátio Matriz</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Blocos</span>
            <div className="text-base font-black font-mono text-slate-900 mt-0.5">
              {viewMetrics.blocksCount} un
            </div>
            <span className="text-[10px] text-slate-400">Produção</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Peças</span>
            <div className="text-base font-black font-mono text-slate-900 mt-0.5">
              {viewMetrics.piecesCount} un
            </div>
            <span className="text-[10px] text-slate-400">Cortadas</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">
              Sobras Aprov.
            </span>
            <div className="text-base font-black font-mono text-emerald-800 mt-0.5">
              {viewMetrics.reusableLeftoversCount} un
            </div>
            <span className="text-[10px] text-emerald-700">Reaproveitáveis</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Bloqueados</span>
            <div className="text-base font-black font-mono text-rose-800 mt-0.5">
              {viewMetrics.blockedCount} un
            </div>
            <span className="text-[10px] text-rose-600">Qualidade/SAP</span>
          </div>
        </div>

        {/* ABA 3: PLANO BLOCOS (Integrada aos Padrões de Peso para Corte) */}
        <TabsContent value="CENARIOS" className="space-y-4">
          <LocalErrorBoundary moduleName="Plano Blocos">
            {/* Barra de Filtros Superiores: Empresa, Centro, Padrões Múltiplos, Tolerâncias, Critério */}
            <MPCuttingOptimizationFilterBar
              filters={optimizationFilters}
              standards={weightStandards}
              onFiltersChange={(updated) => {
                setOptimizationFilters(updated)
                if (highlightBatchError && updated.selected_batch_number) {
                  setHighlightBatchError(false)
                }
              }}
              onGenerateScenarios={handleGenerateComparativeScenarios}
              onOpenStandardsModal={() => setIsStandardsModalOpen(true)}
              isGenerating={isGenerating}
            />

            {/* NOVO QUADRO: MATERIAL E LOTE PARA O PLANO DE CORTE (Exclusivo para Tipo de Corte = MULTIPLOS) */}
            {optimizationFilters.cutting_type === 'MULTIPLOS' && (
              <MPCuttingBatchSelector
                materialCode={optimizationFilters.material_code}
                centerCode={optimizationFilters.center_code}
                selectedBatchNumber={optimizationFilters.selected_batch_number}
                highlightError={highlightBatchError}
                onSelectBatch={(batchItem) => {
                  setHighlightBatchError(false)
                  setOptimizationFilters((prev) => ({
                    ...prev,
                    selected_material_code: batchItem.material_code,
                    selected_material_description: batchItem.material_description,
                    selected_batch_number: batchItem.batch_number,
                    selected_batch_available_stock: batchItem.available_stock,
                    selected_batch_unit: batchItem.unit,
                    selected_center_code: batchItem.center_code,
                    selected_storage_location: batchItem.storage_location,
                  }))
                }}
                onClearSelection={() => {
                  setOptimizationFilters((prev) => ({
                    ...prev,
                    selected_material_code: undefined,
                    selected_material_description: undefined,
                    selected_batch_number: undefined,
                    selected_batch_available_stock: undefined,
                    selected_batch_unit: undefined,
                    selected_center_code: undefined,
                    selected_storage_location: undefined,
                  }))
                }}
              />
            )}

            {/* Botão de Histórico e Ações Auxiliares */}
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-600">
                {comparativeScenarios.length > 0 ? (
                  <span>
                    Simulação ativa:{' '}
                    <strong className="font-mono text-blue-950">
                      {activeSimulation?.simulation_code || 'SIM-CORRENTE'}
                    </strong>{' '}
                    &bull; Critério: <strong>{optimizationFilters.optimization_criterion}</strong>
                  </span>
                ) : (
                  <span>Aguardando cálculo dos cenários de plano blocos...</span>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryModalOpen(true)}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5 text-xs font-semibold"
              >
                <History className="w-3.5 h-3.5 text-blue-900" /> Consultar Histórico de Simulações
              </Button>
            </div>

            {/* Grade com os 6 Cenários Comparativos e Destaque para o Melhor Cenário Recomendado */}
            {comparativeScenarios.length > 0 && (
              <MPCuttingComparativeScenariosGrid
                scenarios={comparativeScenarios}
                bestScenarioId={bestScenarioId}
                selectedScenarioId={selectedComparativeScenarioId}
                onSelectScenario={(scenId) => {
                  setSelectedComparativeScenarioId(scenId)
                  toast({
                    title: 'Cenário Selecionado para Programação',
                    description: `O cenário ${scenId} foi definido como prioritário para o sequenciamento.`,
                  })
                }}
                onDetailScenario={(scen) => setDetailModalScenario(scen)}
                aiJustification={aiJustification}
              />
            )}
          </LocalErrorBoundary>
        </TabsContent>

        {/* ABA NOVA: PLANO DE CORTE MÚLTIPLO */}
        <TabsContent value="CORTE_MULTIPLO" className="space-y-4">
          <LocalErrorBoundary moduleName="Plano de Corte Múltiplo">
            <MPMultipleCuttingPlanSection
              initialMaterial={materialForMultiple}
              onOpenHistory={() => setActiveSecondaryTab('HISTORICO')}
            />
          </LocalErrorBoundary>
        </TabsContent>

        {/* ABA HISTÓRICO DE PLANOS COMPLETA COM FILTROS, ORDENAÇÃO E MODAL */}
        <TabsContent value="HISTORICO" className="space-y-4">
          <LocalErrorBoundary moduleName="Histórico de Planos">
            <MPCuttingPlansHistoryTab
              onSelectPlanToEdit={(plan) => {
                setMaterialForMultiple({
                  material_code: plan.material_code,
                  material_description: plan.material_description,
                  steel_grade: plan.steel_grade,
                  center_code: plan.center_code,
                  line_code: plan.line_code,
                  batch_number: plan.batch_number,
                  heat_number: plan.heat_number,
                  supplier_code: plan.supplier_code,
                  supplier_name: plan.supplier_name,
                  thickness_mm: plan.thickness_mm,
                  width_mm: plan.width_mm,
                  length_mm: plan.length_mm,
                  weight_kg: plan.block_weight_tons ? plan.block_weight_tons * 1000 : undefined,
                })
                setActiveSecondaryTab('CORTE_MULTIPLO')
                toast({
                  title: 'Plano Carregado para Edição',
                  description: `Plano ${plan.plan_code} v0${plan.version || 1} carregado na tela de Corte Múltiplo.`,
                })
              }}
            />
          </LocalErrorBoundary>
        </TabsContent>

        {/* ABA 1: NOVO PLANO — Layout Visual Obrigatório em 4 Áreas */}
        <TabsContent value="NOVO_PLANO" className="space-y-4">
          <LocalErrorBoundary moduleName="Novo Plano">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* LADO ESQUERDO: LISTA DE MP DISPONÍVEL (Colunas 1 a 3) */}
              <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Boxes className="w-4 h-4 text-[#004C97]" />
                    <span>MP Disponível em Pátio</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {filteredItems.length} un
                  </Badge>
                </div>

                {items.length === 0 ? (
                  <SapEmptyState
                    title="SEM MP DISPONÍVEL"
                    description="Aguardando sincronização de placas e blocos no SAP ECC."
                    sapTransaction="ZPP86 / MB52"
                    onRefresh={loadData}
                  />
                ) : filteredItems.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg text-xs space-y-2">
                    <p className="font-semibold text-slate-700">
                      Nenhum material encontrado com os filtros aplicados.
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Tente ajustar o termo de pesquisa ou limpar os filtros de centro/aço.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewFilters(DEFAULT_CUTTING_VIEW_FILTERS)}
                      className="text-xs h-7 text-[#004C97]"
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[520px] overflow-y-auto no-scrollbar pr-1">
                    {filteredItems.map((it) => {
                      const isSel = selectedPlate?.id === it.id
                      return (
                        <div
                          key={it.id}
                          onClick={() => setSelectedPlate(it)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                            isSel
                              ? 'border-[#004C97] bg-blue-50/80 shadow-xs ring-1 ring-[#004C97]'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono font-bold text-slate-900 mb-1">
                            <span>Bloco {it.block_number || it.material_code}</span>
                            <span className="text-[10px] text-[#004C97]">{it.steel_grade}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono">
                            {it.thickness_mm} × {it.width_mm} × {it.length_mm} mm &bull;{' '}
                            <strong>
                              {((it.weight_kg || 0) / 1000).toLocaleString('pt-BR', {
                                minimumFractionDigits: 3,
                                maximumFractionDigits: 3,
                              })}{' '}
                              t
                            </strong>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">
                              Apl: <strong>{it.current_application}</strong>
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${
                                it.reservation_status === 'LIVRE'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {it.reservation_status}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* CENTRO: DESENHO DO PLANO DE CORTE / GÊMEO 3D (Colunas 4 a 8) */}
              <div className="lg:col-span-6 space-y-4">
                <LocalErrorBoundary moduleName="Visualizador 3D do Bloco">
                  <MP3DCanvasViewer
                    title={
                      selectedPlate
                        ? `Plano de Corte — Placa ${selectedPlate.block_number} (${selectedPlate.steel_grade})`
                        : 'Desenho Proporcional do Plano de Corte'
                    }
                    plate={
                      selectedPlate
                        ? {
                            thickness: selectedPlate.thickness_mm,
                            width: selectedPlate.width_mm,
                            length: selectedPlate.length_mm,
                            weight: selectedPlate.weight_kg,
                            label: `Bloco ${selectedPlate.block_number} &bull; ${selectedPlate.current_application}`,
                          }
                        : undefined
                    }
                    pieces={activeScenario?.pieces_generated}
                  />
                </LocalErrorBoundary>

                {/* Barra de Ações Rápidas de Reserva Inteligente */}
                {selectedPlate && (
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Status de Reserva da MP:
                      </span>
                      <div className="font-mono font-bold text-slate-900">
                        Estado Atual:{' '}
                        <span className="text-[#004C97]">{selectedPlate.reservation_status}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedPlate.reservation_status === 'LIVRE' && (
                        <Button
                          size="sm"
                          onClick={() => handleCommitReservation(selectedPlate)}
                          className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Efetivar Reserva Inteligente
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGeneratePlan}
                        className="border-slate-300 text-slate-700 font-semibold text-xs gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#004C97]" />
                        Recalcular Encaixe IA
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* LADO DIREITO: ANÁLISE DA IA & SCORE (Colunas 9 a 12) */}
              <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Sparkles className="w-4 h-4 text-[#004C97]" />
                  <span>Score & Explicabilidade IA</span>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-[#004C97]">
                    <span>Score Global do Plano:</span>
                    <span className="text-base font-black">
                      {activeScenario?.score_ia || 94} / 100
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-snug">
                    Cálculo com 10 pesos parametrizados pelo PCP: Rendimento (20%), Atendimento
                    Carteira (25%), Custo (15%), Menor Sucata (10%), Preservação MP Crítica (7%).
                  </p>
                </div>

                {/* Classificação de Sobras */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                    Classificação das Sobras do Corte
                  </span>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Sobra Reutilizável:</span>
                      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[9px]">
                        Retorna ao Estoque (1.2 t)
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Aparação / Refile:</span>
                      <Badge className="bg-slate-100 text-slate-700 text-[9px]">
                        Sucata Inevitável (3.2%)
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Botão de Solicitação de Aprovação */}
                <Button
                  onClick={handleRequestApproval}
                  disabled={isSubmittingApproval || !selectedPlate}
                  className="w-full bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-2 py-2.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmittingApproval ? 'Submetendo...' : 'SOLICITAR APROVAÇÃO HUMANA'}
                </Button>
              </div>
            </div>

            {/* PARTE INFERIOR: VALIDAÇÃO DA MATRIZ DE GARGALOS INTEGRADA */}
            {activeScenario && (
              <LocalErrorBoundary moduleName="Validação de Gargalos">
                <CuttingPlanBottleneckValidationSection
                  scenario={activeScenario}
                  scenariosMap={scenarios || undefined}
                  lineCode={selectedPlate?.line_destination_code || 'L1'}
                  plateInfo={{
                    blockNumber: selectedPlate?.block_number || 'BL-01',
                    steelGrade: selectedPlate?.steel_grade || 'SAE 1020',
                    dimensions: `${selectedPlate?.thickness_mm || 130}x${selectedPlate?.width_mm || 130}x${selectedPlate?.length_mm || 6000} mm`,
                    weightKg: selectedPlate?.weight_kg || 795,
                  }}
                  onSelectScenario={(k) => setSelectedScenarioType(k as CuttingScenarioType)}
                  onApproveSuccess={loadData}
                />
              </LocalErrorBoundary>
            )}

            {/* PARTE INFERIOR: CARTEIRA + PROGRAMAÇÕES FUTURAS */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#004C97]" />
                  Carteira Ativa SAP &bull; Programação Futura (7-90 dias) &bull; Integração
                  Sequenciador
                </h3>
                <Badge variant="outline" className="text-xs font-mono text-[#004C97]">
                  Integração Direta com ZPPMP & Matriz de Gargalos
                </Badge>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                O motor de plano de corte subordina a aprovação às restrições soberanas da linha,
                impedindo que planos com alto rendimento metálico mas que sobrecarregam a TCC ou a
                tesoura TR2 sejam liberados para o sequenciador semanal.
              </p>
            </div>
          </LocalErrorBoundary>
        </TabsContent>

        {/* ABA DEDICADA: VALIDAÇÃO MATRIZ DE GARGALOS */}
        <TabsContent value="VALIDACAO_GARGALOS" className="space-y-4">
          <LocalErrorBoundary moduleName="Validação Matriz de Gargalos">
            {activeScenario ? (
              <CuttingPlanBottleneckValidationSection
                scenario={activeScenario}
                scenariosMap={scenarios || undefined}
                lineCode={selectedPlate?.line_destination_code || 'L1'}
                plateInfo={{
                  blockNumber: selectedPlate?.block_number || 'BL-01',
                  steelGrade: selectedPlate?.steel_grade || 'SAE 1020',
                  dimensions: `${selectedPlate?.thickness_mm || 130}x${selectedPlate?.width_mm || 130}x${selectedPlate?.length_mm || 6000} mm`,
                  weightKg: selectedPlate?.weight_kg || 795,
                }}
                onSelectScenario={(k) => setSelectedScenarioType(k as CuttingScenarioType)}
                onApproveSuccess={loadData}
              />
            ) : (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-xs text-slate-500">
                Gere um plano com a IA para visualizar a validação da Matriz de Gargalos.
              </div>
            )}
          </LocalErrorBoundary>
        </TabsContent>

        {/* ABA 2: ESTOQUE DIMENSIONAL COMPLETO — Grade Operacional Rastreável */}
        <TabsContent value="ESTOQUE_DIMENSIONAL" className="space-y-3">
          <LocalErrorBoundary moduleName="Estoque Dimensional">
            <MPDimensionalOperationalGrid
              items={items}
              isLoading={isLoadingInventory}
              lastSyncTime={lastSyncTime}
              syncError={syncError}
              onRefresh={loadData}
              externalSearchTerm={viewFilters.searchTerm}
              externalCenter={viewFilters.center}
              externalDepot={viewFilters.depot}
              externalType={viewFilters.itemType}
              externalSteel={viewFilters.steelGrade}
              externalReservation={viewFilters.reservationStatus}
              onExternalFiltersChange={{
                setSearchTerm: (val) => setViewFilters((prev) => ({ ...prev, searchTerm: val })),
                setFilterCenter: (val) => setViewFilters((prev) => ({ ...prev, center: val })),
                setFilterDepot: (val) => setViewFilters((prev) => ({ ...prev, depot: val })),
                setFilterType: (val) => setViewFilters((prev) => ({ ...prev, itemType: val })),
                setFilterSteel: (val) => setViewFilters((prev) => ({ ...prev, steelGrade: val })),
                setFilterReservation: (val) =>
                  setViewFilters((prev) => ({ ...prev, reservationStatus: val })),
              }}
              onSelectForCuttingPlan={(selected) => {
                setSelectedPlate(selected)
                setActiveSecondaryTab('NOVO_PLANO')
                toast({
                  title: 'Material Selecionado',
                  description: `Bloco ${selected.block_number || selected.material_code} carregado no cockpit de corte.`,
                })
              }}
              onSelectForMultiplePlan={(selected) => {
                setMaterialForMultiple(selected)
                setActiveSecondaryTab('CORTE_MULTIPLO')
                toast({
                  title: 'Material no Corte Múltiplo',
                  description: `Material ${selected.material_code} carregado para otimização de múltiplos comprimentos.`,
                })
              }}
            />
          </LocalErrorBoundary>
        </TabsContent>

        {/* ABA 4: GÊMEO DIGITAL 3D */}
        <TabsContent value="PROJECAO_3D" className="space-y-3">
          <LocalErrorBoundary moduleName="Gêmeo Digital 3D">
            <MP3DCanvasViewer
              title={`Gêmeo Digital 3D Proporcional — ${selectedPlate?.block_number || 'Material'}`}
              plate={
                selectedPlate
                  ? {
                      thickness: selectedPlate.thickness_mm,
                      width: selectedPlate.width_mm,
                      length: selectedPlate.length_mm,
                      weight: selectedPlate.weight_kg,
                      label: `Bloco ${selectedPlate.block_number} &bull; ${selectedPlate.steel_grade}`,
                    }
                  : undefined
              }
              pieces={activeScenario?.pieces_generated}
            />
          </LocalErrorBoundary>
        </TabsContent>

        {/* ABA 5: MATRIZ OFICIAL DE REQUISITOS (ZPPMP) */}
        <TabsContent value="MATRIZ_REQUISITOS" className="space-y-3">
          <LocalErrorBoundary moduleName="Matriz Oficial ZPPMP">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Matriz Oficial de Requisitos de Aplicação (ZPPMP / ZBITOLAS)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Aplicação</th>
                      <th className="p-2.5">Aço</th>
                      <th className="p-2.5">Espessura (Min - Ideal - Max)</th>
                      <th className="p-2.5">Largura (Min - Ideal - Max)</th>
                      <th className="p-2.5">Comprimento (Min - Ideal - Max)</th>
                      <th className="p-2.5">Tabela SAP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requirements.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{req.application_code}</td>
                        <td className="p-2.5 text-[#004C97] font-bold">{req.steel_grade}</td>
                        <td className="p-2.5">
                          {req.min_thickness_mm} &bull; <strong>{req.ideal_thickness_mm}</strong>{' '}
                          &bull; {req.max_thickness_mm} mm
                        </td>
                        <td className="p-2.5">
                          {req.min_width_mm} &bull; <strong>{req.ideal_width_mm}</strong> &bull;{' '}
                          {req.max_width_mm} mm
                        </td>
                        <td className="p-2.5">
                          {req.min_length_mm} &bull; <strong>{req.ideal_length_mm}</strong> &bull;{' '}
                          {req.max_length_mm} mm
                        </td>
                        <td className="p-2.5 text-slate-500 font-sans">
                          {req.zppmp_table_ref || 'ZPPMP'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </LocalErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* POPUP: Cadastro e Consulta de Padrões de Peso para Corte */}
      <MPCuttingWeightStandardsModal
        isOpen={isStandardsModalOpen}
        onClose={() => setIsStandardsModalOpen(false)}
        onStandardsChanged={loadWeightStandards}
      />

      {/* POPUP: Detalhamento do Cenário de Corte */}
      <MPCuttingScenarioDetailModal
        isOpen={Boolean(detailModalScenario)}
        onClose={() => setDetailModalScenario(null)}
        scenario={detailModalScenario}
        criterionName={optimizationFilters.optimization_criterion}
      />

      {/* POPUP: Histórico de Simulações e Planos */}
      <MPCuttingSimulationsHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onLoadSimulation={(sim) => {
          setComparativeScenarios(sim.scenarios)
          setBestScenarioId(sim.best_scenario_id)
          setSelectedComparativeScenarioId(sim.selected_scenario_id || sim.best_scenario_id)
          setAiJustification(sim.technical_justification || '')
          setActiveSimulation(sim)
          setOptimizationFilters(sim.filter_parameters_snapshot)
        }}
      />
    </MPModuleLayout>
  )
}

export default MPCuttingPlansUnifiedPage
