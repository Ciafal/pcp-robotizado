import React, { createContext, useContext, useState, useMemo, useCallback } from 'react'
import {
  PerspectiveMode,
  ViewTab,
  GlobalFilterState,
  ProductOrder,
  ProductionProcessNode,
  BottleneckItem,
  BufferStatus,
  FlowSankeyStep,
  OperationalEvent,
  OperationalAlert,
  ScenarioDefinition,
  ImpactAnalysis,
  VersionHistoryItem,
} from '@/types/control-tower'
import {
  mockCentralOrders,
  mockProcessNodes,
  mockBottlenecks,
  mockBuffers,
  mockFlowSteps,
  mockOperationalEvents,
  mockOperationalAlerts,
  mockScenarios,
  mockImpactAnalysis,
  mockVersionHistory,
} from '@/data/control-tower-mock'
import { useToast } from '@/hooks/use-toast'

export interface SimulationDragDiff {
  orderId: string
  orderNumber: string
  originalLine: string
  newLine: string
  originalStart: string
  newStart: string
  setupDeltaMinutes: number
  materialRisk: boolean
  delayDeltaHours: number
  capacityConflict: boolean
  downstreamImpactTons: number
}

interface ControlTowerContextType {
  // Perspectiva e Visão
  perspective: PerspectiveMode
  setPerspective: (p: PerspectiveMode) => void
  activeTab: ViewTab
  setActiveTab: (t: ViewTab) => void

  // Filtros Globais
  filters: GlobalFilterState
  setFilters: React.Dispatch<React.SetStateAction<GlobalFilterState>>
  resetFilters: () => void

  // Dados Centrais (Único Modelo de Dados Compartilhado)
  orders: ProductOrder[]
  processNodes: ProductionProcessNode[]
  bottlenecks: BottleneckItem[]
  buffers: BufferStatus[]
  flowSteps: FlowSankeyStep[]
  events: OperationalEvent[]
  alerts: OperationalAlert[]
  scenarios: ScenarioDefinition[]
  activeScenarioId: string
  setActiveScenarioId: (id: string) => void
  impactAnalysis: ImpactAnalysis
  versionHistory: VersionHistoryItem[]

  // Filtros computados
  filteredOrders: ProductOrder[]
  filteredNodes: ProductionProcessNode[]
  filteredBottlenecks: BottleneckItem[]
  filteredAlerts: OperationalAlert[]

  // KPIs Centrais Agregados
  kpis: {
    plannedTons: number
    producedTons: number
    adherencePct: number
    availableCapacityPct: number
    occupancyPct: number
    activeBottlenecks: number
    ordersAtRisk: number
    delaysCount: number
    criticalStopsCount: number
    totalRatePerHour: number
  }

  // Gavetas & Modais
  selectedProcess: ProductionProcessNode | null
  setSelectedProcess: (p: ProductionProcessNode | null) => void
  selectedOrder: ProductOrder | null
  setSelectedOrder: (o: ProductOrder | null) => void
  isSimulatorModalOpen: boolean
  setIsSimulatorModalOpen: (open: boolean) => void
  isComparisonModalOpen: boolean
  setIsComparisonModalOpen: (open: boolean) => void
  isAlertCenterOpen: boolean
  setIsAlertCenterOpen: (open: boolean) => void
  isAIPanelOpen: boolean
  setIsAIPanelOpen: (open: boolean) => void
  isCriticalPathVisible: boolean
  setIsCriticalPathVisible: (show: boolean) => void
  isVersionModalOpen: boolean
  setIsVersionModalOpen: (open: boolean) => void

  // Simulação Drag & Drop Temporária
  activeSimulationDiff: SimulationDragDiff | null
  simulateOrderMove: (orderId: string, newLine: string, newStart: string) => void
  cancelSimulation: () => void
  applySimulationToScenario: () => void
  sendScenarioForApproval: (note: string) => void

  // Ações de Alertas e Auditoria
  acknowledgeAlert: (alertId: string) => void
  refreshData: () => void
  lastSyncTime: string
  isSyncing: boolean

  // Gestão de visualização salva
  savedViews: { id: string; name: string; filters: GlobalFilterState; tab: ViewTab }[]
  saveCurrentView: (name: string) => void
  applySavedView: (id: string) => void
}

const initialFilters: GlobalFilterState = {
  period: 'HOJE',
  lineCode: 'ALL',
  processCode: 'ALL',
  familyCode: 'ALL',
  shift: 'ALL',
  status: 'ALL',
  quickFilterOnlyBottlenecks: false,
  quickFilterOnlyDelays: false,
  quickFilterOnlyConflicts: false,
  quickFilterOnlyRisks: false,
  quickFilterOnlyChanges: false,
  quickFilterOnlyOrdersAtRisk: false,
  searchQuery: '',
}

const ControlTowerContext = createContext<ControlTowerContextType | undefined>(undefined)

export const ControlTowerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast()

  const [perspective, setPerspective] = useState<PerspectiveMode>('PROGRAMADOR')
  const [activeTab, setActiveTab] = useState<ViewTab>('OVERVIEW')
  const [filters, setFilters] = useState<GlobalFilterState>(initialFilters)

  // Estado Central Único
  const [orders, setOrders] = useState<ProductOrder[]>(mockCentralOrders)
  const [processNodes, setProcessNodes] = useState<ProductionProcessNode[]>(mockProcessNodes)
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>(mockBottlenecks)
  const [buffers, setBuffers] = useState<BufferStatus[]>(mockBuffers)
  const [flowSteps, setFlowSteps] = useState<FlowSankeyStep[]>(mockFlowSteps)
  const [events, setEvents] = useState<OperationalEvent[]>(mockOperationalEvents)
  const [alerts, setAlerts] = useState<OperationalAlert[]>(mockOperationalAlerts)
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>(mockScenarios)
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scen-base')
  const [impactAnalysis, setImpactAnalysis] = useState<ImpactAnalysis>(mockImpactAnalysis)
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>(mockVersionHistory)

  // Drawer & Modals state
  const [selectedProcess, setSelectedProcess] = useState<ProductionProcessNode | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null)
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState(false)
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false)
  const [isAlertCenterOpen, setIsAlertCenterOpen] = useState(false)
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [isCriticalPathVisible, setIsCriticalPathVisible] = useState(false)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)

  // Simulação Temporária Drag & Drop
  const [activeSimulationDiff, setActiveSimulationDiff] = useState<SimulationDragDiff | null>(null)

  // Sincronização SAP
  const [lastSyncTime, setLastSyncTime] = useState<string>('28/08/2026 09:28')
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  // Visualizações salvas
  const [savedViews, setSavedViews] = useState<
    { id: string; name: string; filters: GlobalFilterState; tab: ViewTab }[]
  >([
    {
      id: 'sv-1',
      name: 'Programador L1 (Gargalos & 48h)',
      filters: { ...initialFilters, lineCode: 'L1', quickFilterOnlyBottlenecks: true },
      tab: 'GANTT',
    },
    {
      id: 'sv-2',
      name: 'Torre de Controle Diretoria (Visão Geral)',
      filters: initialFilters,
      tab: 'OVERVIEW',
    },
    {
      id: 'sv-3',
      name: 'Chão de Fábrica Linha 1',
      filters: { ...initialFilters, lineCode: 'L1' },
      tab: 'SHOP_FLOOR',
    },
  ])

  // Filtragem Reativa de Ordens
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // 1. Linha
      if (filters.lineCode !== 'ALL' && ord.lineCode !== filters.lineCode) return false
      // 2. Família
      if (filters.familyCode !== 'ALL' && ord.familyCode !== filters.familyCode) return false
      // 3. Status
      if (filters.status !== 'ALL' && ord.status !== filters.status) return false
      // 4. Quick Filters
      if (filters.quickFilterOnlyDelays && ord.delayMinutes <= 0) return false
      if (filters.quickFilterOnlyOrdersAtRisk && ord.priority > 2 && ord.delayMinutes <= 0)
        return false
      if (filters.quickFilterOnlyBottlenecks && !ord.isCriticalPath) return false
      // 5. Query
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase()
        const match =
          ord.orderNumber.toLowerCase().includes(q) ||
          ord.materialName.toLowerCase().includes(q) ||
          ord.customerName.toLowerCase().includes(q) ||
          ord.campaignName.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [orders, filters])

  // Filtragem Reativa de Nós
  const filteredNodes = useMemo(() => {
    return processNodes.filter((node) => {
      if (filters.lineCode !== 'ALL' && node.code !== filters.lineCode) {
        // Se filtro for L1, mostrar também upstream/downstream relevantes
        if (
          !node.downstreamProcessCodes.includes(filters.lineCode) &&
          !node.upstreamProcessCodes.includes(filters.lineCode)
        ) {
          return false
        }
      }
      if (filters.quickFilterOnlyBottlenecks && !node.isBottleneck) return false
      return true
    })
  }, [processNodes, filters])

  // Filtragem de Gargalos
  const filteredBottlenecks = useMemo(() => {
    return bottlenecks.filter((bot) => {
      if (filters.lineCode !== 'ALL' && bot.processCode !== filters.lineCode) return false
      return true
    })
  }, [bottlenecks, filters])

  // Filtragem de Alertas
  const filteredAlerts = useMemo(() => {
    return alerts.filter((al) => {
      if (filters.lineCode !== 'ALL' && al.processCode !== filters.lineCode) return false
      return true
    })
  }, [alerts, filters])

  // Cálculo de KPIs Centrais Unificados
  const kpis = useMemo(() => {
    const plannedTons = orders.reduce((sum, o) => sum + o.plannedTons, 0)
    const producedTons = orders.reduce((sum, o) => sum + o.producedTons, 0)
    const adherencePct =
      plannedTons > 0 ? Number(((producedTons / plannedTons) * 100).toFixed(1)) : 82.2
    const totalRate = processNodes.reduce((sum, n) => sum + n.currentRateTonsPerHour, 0)
    const totalNominal = processNodes.reduce((sum, n) => sum + n.nominalCapacityTonsPerHour, 0)
    const occupancyPct = totalNominal > 0 ? Math.round((totalRate / totalNominal) * 100) : 91
    const activeBottlenecks = bottlenecks.length
    const ordersAtRisk = orders.filter((o) => o.delayMinutes > 0 || o.alertsCount > 0).length
    const delaysCount = orders.filter((o) => o.delayMinutes > 0).length
    const criticalStopsCount = processNodes.filter(
      (n) => n.currentStatus === 'maintenance' || n.currentStatus === 'stopped',
    ).length

    return {
      plannedTons,
      producedTons,
      adherencePct,
      availableCapacityPct: 100 - occupancyPct,
      occupancyPct,
      activeBottlenecks,
      ordersAtRisk,
      delaysCount,
      criticalStopsCount,
      totalRatePerHour: totalRate,
    }
  }, [orders, processNodes, bottlenecks])

  // Simulação Drag & Drop de Gantt / Kanban
  const simulateOrderMove = useCallback(
    (orderId: string, newLine: string, newStart: string) => {
      const order = orders.find((o) => o.id === orderId)
      if (!order) return

      // Cálculo de impacto simulado
      const setupDeltaMinutes = newLine !== order.lineCode ? +35 : 0
      const materialRisk = newLine === 'L2' && !order.rawMaterialAvailable
      const delayDeltaHours = newLine === 'L1' ? -4.0 : +2.5
      const capacityConflict = newLine === 'ENDIR'

      setActiveSimulationDiff({
        orderId,
        orderNumber: order.orderNumber,
        originalLine: order.lineCode,
        newLine,
        originalStart: order.plannedStart,
        newStart,
        setupDeltaMinutes,
        materialRisk,
        delayDeltaHours,
        capacityConflict,
        downstreamImpactTons: order.remainingTons,
      })

      toast({
        title: '🧪 Simulação Temporária Criada',
        description: `Ordem ${order.orderNumber} realocada em memória. A programação oficial permanece inalterada.`,
      })
    },
    [orders, toast],
  )

  const cancelSimulation = useCallback(() => {
    setActiveSimulationDiff(null)
    toast({
      title: 'Simulação Cancelada',
      description: 'Nenhum impacto foi gravado na programação.',
    })
  }, [toast])

  const applySimulationToScenario = useCallback(() => {
    if (!activeSimulationDiff) return

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === activeSimulationDiff.orderId) {
          return {
            ...ord,
            lineCode: activeSimulationDiff.newLine,
            plannedStart: activeSimulationDiff.newStart,
            delayMinutes: Math.max(0, ord.delayMinutes + activeSimulationDiff.delayDeltaHours * 60),
          }
        }
        return ord
      }),
    )

    // Adiciona evento na timeline
    setEvents((prev) => [
      {
        id: `ev-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        source: 'PCP',
        category: 'SIMULATION',
        severity: 'INFO',
        title: `Cenário Alterado pelo Programador: ${activeSimulationDiff.orderNumber}`,
        description: `Ordem movida para ${activeSimulationDiff.newLine} às ${activeSimulationDiff.newStart}.`,
        actor: 'Carlos Silva (PCP)',
        processCode: activeSimulationDiff.newLine,
        orderNumber: activeSimulationDiff.orderNumber,
      },
      ...prev,
    ])

    setActiveSimulationDiff(null)
    toast({
      title: 'Cenário Atualizado em Memória',
      description: 'Alteração mantida no cenário ativo. Envie para aprovação para oficializar.',
    })
  }, [activeSimulationDiff, toast])

  const sendScenarioForApproval = useCallback(
    (note: string) => {
      // Adicionar nova versão ao histórico
      const newVersion = `v2.${versionHistory.length + 3}`
      const newHistoryItem: VersionHistoryItem = {
        version: `${newVersion} (Pendente Homologação)`,
        publishedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        author: 'Carlos Silva (PCP)',
        approver: 'Aguardando Gestor de Linha',
        reason: note || 'Otimização de gargalos e realocação de ordens críticas',
        changesCount: 2,
        deltaTons: +80,
        status: 'CURRENT',
      }
      setVersionHistory((prev) => [newHistoryItem, ...prev])

      setEvents((prev) => [
        {
          id: `ev-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          source: 'USUARIO',
          category: 'APPROVAL',
          severity: 'INFO',
          title: `Programador Enviou ${newVersion} para Homologação`,
          description: `Justificativa: ${note || 'Otimização de sequência'}`,
          actor: 'Carlos Silva (PCP)',
        },
        ...prev,
      ])

      toast({
        title: '✅ Cenário Enviado para Aprovação',
        description:
          'A esteira de 2 fases foi acionada. A programação oficial será atualizada após validação do Gestor.',
      })
    },
    [versionHistory, toast],
  )

  const acknowledgeAlert = useCallback(
    (alertId: string) => {
      setAlerts((prev) =>
        prev.map((al) => (al.id === alertId ? { ...al, acknowledged: true } : al)),
      )
      toast({
        title: 'Alerta Reconhecido',
        description: 'Status registrado na trilha de auditoria.',
      })
    },
    [toast],
  )

  const refreshData = useCallback(() => {
    setIsSyncing(true)
    setTimeout(() => {
      setLastSyncTime(
        new Date().toLocaleDateString('pt-BR') +
          ' ' +
          new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      )
      setIsSyncing(false)
      toast({
        title: 'Dados Sincronizados com SAP ECC',
        description: 'Status de linhas, buffers e carteira atualizados em tempo real.',
      })
    }, 600)
  }, [toast])

  const resetFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [])

  const saveCurrentView = useCallback(
    (name: string) => {
      const newId = `sv-${Date.now()}`
      setSavedViews((prev) => [
        ...prev,
        { id: newId, name, filters: { ...filters }, tab: activeTab },
      ])
      toast({
        title: 'Visão Salva',
        description: `A visualização "${name}" foi adicionada aos seus favoritos.`,
      })
    },
    [filters, activeTab, toast],
  )

  const applySavedView = useCallback(
    (id: string) => {
      const sv = savedViews.find((v) => v.id === id)
      if (sv) {
        setFilters(sv.filters)
        setActiveTab(sv.tab)
        toast({
          title: 'Visão Carregada',
          description: `Filtros e lente aplicados: ${sv.name}`,
        })
      }
    },
    [savedViews, toast],
  )

  return (
    <ControlTowerContext.Provider
      value={{
        perspective,
        setPerspective,
        activeTab,
        setActiveTab,
        filters,
        setFilters,
        resetFilters,
        orders,
        processNodes,
        bottlenecks,
        buffers,
        flowSteps,
        events,
        alerts,
        scenarios,
        activeScenarioId,
        setActiveScenarioId,
        impactAnalysis,
        versionHistory,
        filteredOrders,
        filteredNodes,
        filteredBottlenecks,
        filteredAlerts,
        kpis,
        selectedProcess,
        setSelectedProcess,
        selectedOrder,
        setSelectedOrder,
        isSimulatorModalOpen,
        setIsSimulatorModalOpen,
        isComparisonModalOpen,
        setIsComparisonModalOpen,
        isAlertCenterOpen,
        setIsAlertCenterOpen,
        isAIPanelOpen,
        setIsAIPanelOpen,
        isCriticalPathVisible,
        setIsCriticalPathVisible,
        isVersionModalOpen,
        setIsVersionModalOpen,
        activeSimulationDiff,
        simulateOrderMove,
        cancelSimulation,
        applySimulationToScenario,
        sendScenarioForApproval,
        acknowledgeAlert,
        refreshData,
        lastSyncTime,
        isSyncing,
        savedViews,
        saveCurrentView,
        applySavedView,
      }}
    >
      {children}
    </ControlTowerContext.Provider>
  )
}

export const useControlTower = () => {
  const context = useContext(ControlTowerContext)
  if (!context) {
    throw new Error('useControlTower must be used within a ControlTowerProvider')
  }
  return context
}
