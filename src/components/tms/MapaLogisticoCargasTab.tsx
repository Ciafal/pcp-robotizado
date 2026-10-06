import React, { useState, useEffect, useMemo } from 'react'
import {
  SapSalesOrderItem,
  SapItinerario,
  TmsPlannedLoad,
  TmsFiltersState,
  CityAggregation,
  UfAggregation,
  ConsolidationOpportunity,
  AiMapInsight,
  HeatmapMetric,
  MapLayerToggles,
} from '@/types/tms-mapa-logistico'
import { tmsMapaLogisticoService } from '@/services/tms-mapa-logistico-service'
import { TmsExecutiveCards } from './TmsExecutiveCards'
import { TmsFilterBar } from './TmsFilterBar'
import { TmsMapLayers } from './TmsMapLayers'
import { BrazilLogisticsSvgMap } from './BrazilLogisticsSvgMap'
import { TmsCityDetailDrawer } from './TmsCityDetailDrawer'
import { TmsDemandDestinationsPanel } from './TmsDemandDestinationsPanel'
import { TmsAiInsightsPanel } from './TmsAiInsightsPanel'
import { TmsOpportunitiesSection } from './TmsOpportunitiesSection'
import { TmsLoadDetailModal } from './TmsLoadDetailModal'
import { TmsSimulateLoadModal } from './TmsSimulateLoadModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Flame, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

interface MapaLogisticoCargasTabProps {
  onNavigateToPlanning?: (selectedOrders?: SapSalesOrderItem[]) => void
}

export const MapaLogisticoCargasTab: React.FC<MapaLogisticoCargasTabProps> = ({
  onNavigateToPlanning,
}) => {
  // Estado base dos dados vindos das coleções reais
  const [salesOrders, setSalesOrders] = useState<SapSalesOrderItem[]>([])
  const [itinerarios, setItinerarios] = useState<SapItinerario[]>([])
  const [plannedLoads, setPlannedLoads] = useState<TmsPlannedLoad[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Filtros aplicados
  const [filters, setFilters] = useState<TmsFiltersState>({
    company: '',
    center: '',
    origin: '',
    region: '',
    uf: '',
    city: '',
    customer: '',
    itinerary: '',
    material: '',
    materialGroup: '',
    orderStatus: '',
    creditStatus: '',
    priority: '',
    futureStockMode: 'CURRENT_AND_FUTURE',
    startDate: '',
    endDate: '',
  })

  // Camadas de exibição ligadas/desligadas
  const [layers, setLayers] = useState<MapLayerToggles>({
    heatmap: true,
    availableOrders: true,
    clients: true,
    itineraries: true,
    suggestedLoads: true,
    plannedLoads: true,
    availableStock: true,
    logisticsAlerts: true,
    showRoutes: true,
  })

  // Métrica do Mapa de Calor (padrão: toneladas)
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('tons')

  // Interação e Seleção Geográfica
  const [selectedUf, setSelectedUf] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<CityAggregation | null>(null)
  const [selectedLoad, setSelectedLoad] = useState<TmsPlannedLoad | null>(null)

  // Seleção múltipla de pedidos para Simulação de Carga
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false)
  const [opportunityToSimulate, setOpportunityToSimulate] =
    useState<ConsolidationOpportunity | null>(null)
  const [ordersForSimulation, setOrdersForSimulation] = useState<SapSalesOrderItem[]>([])

  // Notificação de sucesso de carga criada
  const [createdFeedback, setCreatedFeedback] = useState<string | null>(null)

  // Carregamento dos dados reais do backend
  const loadData = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [ordersData, itinData, loadsData] = await Promise.all([
        tmsMapaLogisticoService.getSalesOrders(),
        tmsMapaLogisticoService.getItinerarios(),
        tmsMapaLogisticoService.getPlannedLoads(),
      ])

      setSalesOrders(ordersData)
      setItinerarios(itinData)
      setPlannedLoads(loadsData)
    } catch (err: any) {
      console.error('Erro ao carregar dados do Mapa Logístico:', err)
      setErrorMessage(err?.message || 'Falha ao carregar dados do TMS')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtragem dos pedidos da carteira SAP
  const filteredOrders = useMemo(() => {
    return tmsMapaLogisticoService.filterSalesOrders(salesOrders, filters)
  }, [salesOrders, filters])

  // Agregações por Cidade e por UF
  const aggregatedCities = useMemo(() => {
    return tmsMapaLogisticoService.aggregateByCity(filteredOrders)
  }, [filteredOrders])

  const aggregatedUfs = useMemo(() => {
    return tmsMapaLogisticoService.aggregateByUf(aggregatedCities)
  }, [aggregatedCities])

  // Oportunidades de consolidação detectadas proativamente pela IA
  const consolidationOpportunities = useMemo(() => {
    return tmsMapaLogisticoService.detectConsolidationOpportunities(filteredOrders, itinerarios)
  }, [filteredOrders, itinerarios])

  // Insights analíticos da IA Logística com rastreabilidade
  const aiInsights = useMemo(() => {
    return tmsMapaLogisticoService.generateAiInsights(
      filteredOrders,
      aggregatedUfs,
      consolidationOpportunities,
    )
  }, [filteredOrders, aggregatedUfs, consolidationOpportunities])

  // Totais para os Cards Superiores
  const summaryMetrics = useMemo(() => {
    const totalTons = filteredOrders.reduce((acc, o) => acc + o.weight_tons, 0)
    const totalOrders = filteredOrders.length
    const uniqueClients = new Set(filteredOrders.map((o) => o.customer_name)).size
    const potentialLoads = Math.max(1, Math.ceil(totalTons / 30))
    const statesCount = aggregatedUfs.length
    const avgOccupancy = totalOrders > 0 ? 87 : 0

    return {
      totalTons,
      totalOrders,
      totalCustomers: uniqueClients,
      potentialLoads,
      statesCount,
      averageOccupancyPct: avgOccupancy,
    }
  }, [filteredOrders, aggregatedUfs])

  // Opções para comboboxes de filtros extraídas da carteira
  const companiesList = useMemo(() => {
    return Array.from(new Set(salesOrders.map((o) => o.company_name).filter(Boolean)))
  }, [salesOrders])

  const shippingCentersList = useMemo(() => {
    return Array.from(new Set(salesOrders.map((o) => o.shipping_center_code).filter(Boolean)))
  }, [salesOrders])

  const materialsGroupsList = useMemo(() => {
    return Array.from(new Set(salesOrders.map((o) => o.material_group).filter(Boolean)))
  }, [salesOrders])

  // Handlers de Filtros e Camadas
  const handleFilterChange = (key: keyof TmsFiltersState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetFilters = () => {
    setFilters({
      company: '',
      center: '',
      origin: '',
      region: '',
      uf: '',
      city: '',
      customer: '',
      itinerary: '',
      material: '',
      materialGroup: '',
      orderStatus: '',
      creditStatus: '',
      priority: '',
      futureStockMode: 'CURRENT_AND_FUTURE',
      startDate: '',
      endDate: '',
    })
    setSelectedUf('')
    setSelectedCity(null)
  }

  const handleToggleLayer = (layerKey: keyof MapLayerToggles) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }))
  }

  // Interação de Seleção de Pedidos e Simulação
  const handleToggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    )
  }

  const handleSelectAllCityOrders = (cityOrders: SapSalesOrderItem[]) => {
    const cityIds = cityOrders.map((o) => o.id)
    const allSelected = cityIds.every((id) => selectedOrderIds.includes(id))

    if (allSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !cityIds.includes(id)))
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...cityIds])))
    }
  }

  const handleStartSimulation = (
    orders: SapSalesOrderItem[],
    oppSource?: ConsolidationOpportunity,
  ) => {
    setOrdersForSimulation(orders)
    setOpportunitySource(oppSource || null)
    setIsSimulationModalOpen(true)
  }

  const setOpportunitySource = (opp: ConsolidationOpportunity | null) => {
    setOpportunityToSimulate(opp)
  }

  const handleConfirmLoadCreation = async (createdLoadData: any) => {
    try {
      const saved = await tmsMapaLogisticoService.savePlannedLoad(createdLoadData)

      // Registra log de auditoria imutável
      await tmsMapaLogisticoService.logAudit('LOAD_PROPOSED_FROM_MAP', {
        load_number: saved.load_number,
        orders_count: createdLoadData.total_orders_count,
        total_weight: createdLoadData.total_weight_tons,
        itinerary: createdLoadData.itinerary_code,
      })

      // Atualiza lista de cargas na tela imediatamente
      setPlannedLoads((prev) => [saved, ...prev])
      setCreatedFeedback(`Carga ${saved.load_number} criada com sucesso e plotada no mapa!`)
      setTimeout(() => setCreatedFeedback(null), 5000)

      if (onNavigateToPlanning) {
        onNavigateToPlanning(ordersForSimulation)
      }
    } catch (err: any) {
      console.error('Erro ao salvar carga simulada:', err)
      alert(`Falha ao gravar carga: ${err?.message || 'Erro desconhecido'}`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Feedback de sucesso */}
      {createdFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{createdFeedback}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCreatedFeedback(null)}
            className="h-6 text-emerald-800"
          >
            Fechar
          </Button>
        </div>
      )}

      {/* 1. Cards Superiores Executivos Dinâmicos */}
      <TmsExecutiveCards
        totalTons={summaryMetrics.totalTons}
        totalOrders={summaryMetrics.totalOrders}
        totalCustomers={summaryMetrics.totalCustomers}
        potentialLoads={summaryMetrics.potentialLoads}
        statesCount={summaryMetrics.statesCount}
        averageOccupancyPct={summaryMetrics.averageOccupancyPct}
      />

      {/* 2. Barra de Filtros Compacta */}
      <TmsFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        itinerarios={itinerarios}
        companies={companiesList}
        shippingCenters={shippingCentersList}
        materialsGroups={materialsGroupsList}
        totalFilteredCount={filteredOrders.length}
      />

      {/* 3. Seletor de Camadas e Seletor de Métrica do Heatmap */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex-1">
          <TmsMapLayers layers={layers} onToggleLayer={handleToggleLayer} />
        </div>

        {/* Seletor de Variável do Mapa de Calor */}
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-xs shrink-0 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Métrica do Calor:</span>
          </div>

          <Select
            value={heatmapMetric}
            onValueChange={(val) => setHeatmapMetric(val as HeatmapMetric)}
          >
            <SelectTrigger className="h-7 text-xs w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tons">Toneladas Disponíveis</SelectItem>
              <SelectItem value="orders_count">Número de Pedidos</SelectItem>
              <SelectItem value="customers_count">Número de Clientes</SelectItem>
              <SelectItem value="order_value">Valor da Carteira (R$)</SelectItem>
              <SelectItem value="items_count">Quantidade de Itens</SelectItem>
              <SelectItem value="potential_loads">Cargas Potenciais</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-7 w-7 p-0 ml-1 text-slate-500"
            title="Atualizar dados do SAP"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 4. Canvas Principal do Mapa com Detalhamento Lateral */}
      <div className="relative">
        <BrazilLogisticsSvgMap
          ufs={aggregatedUfs}
          cities={aggregatedCities}
          itinerarios={itinerarios}
          plannedLoads={plannedLoads}
          layers={layers}
          heatmapMetric={heatmapMetric}
          selectedUf={selectedUf}
          selectedCity={selectedCity}
          onSelectUf={(uf) => {
            setSelectedUf(uf)
            handleFilterChange('uf', uf)
          }}
          onSelectCity={(city) => setSelectedCity(city)}
          onSelectLoad={(load) => setSelectedLoad(load)}
        />

        {/* Detalhamento Lateral da Cidade */}
        <TmsCityDetailDrawer
          city={selectedCity}
          onClose={() => setSelectedCity(null)}
          selectedOrderIds={selectedOrderIds}
          onToggleOrderSelection={handleToggleOrderSelection}
          onSelectAllCityOrders={handleSelectAllCityOrders}
          onSimulateLoad={(orders) => handleStartSimulation(orders)}
        />
      </div>

      {/* 5. Painel "Onde está a demanda?" e Análise de IA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <TmsDemandDestinationsPanel
            ufs={aggregatedUfs}
            selectedUf={selectedUf}
            onSelectUf={(uf) => {
              setSelectedUf(uf)
              handleFilterChange('uf', uf)
            }}
          />
        </div>

        <div className="lg:col-span-2">
          <TmsAiInsightsPanel
            insights={aiInsights}
            onActionClick={(ins) => {
              if (ins.action_label?.includes('Filtrar')) {
                handleFilterChange('uf', ins.traceability_data.uf)
              } else if (ins.action_label?.includes('Simular') && consolidationOpportunities[0]) {
                handleStartSimulation(
                  consolidationOpportunities[0].orders,
                  consolidationOpportunities[0],
                )
              } else if (ins.action_label?.includes('Pré-Planejamento')) {
                const futureOrders = filteredOrders.filter((o) => o.stock_future_tons > 0)
                handleStartSimulation(futureOrders)
              }
            }}
          />
        </div>
      </div>

      {/* 6. Oportunidades de Consolidação de Cargas da IA */}
      <TmsOpportunitiesSection
        opportunities={consolidationOpportunities}
        onSimulateOpportunity={(opp) => handleStartSimulation(opp.orders, opp)}
        onViewComposition={(opp) => {
          if (opp.orders[0]) {
            const cityMatch = aggregatedCities.find((c) => c.city === opp.orders[0].city)
            if (cityMatch) setSelectedCity(cityMatch)
          }
        }}
      />

      {/* 7. Modais de Detalhe e Simulação */}
      <TmsLoadDetailModal load={selectedLoad} onClose={() => setSelectedLoad(null)} />

      <TmsSimulateLoadModal
        isOpen={isSimulationModalOpen}
        onClose={() => setIsSimulationModalOpen(false)}
        ordersToSimulate={ordersForSimulation}
        opportunitySource={opportunityToSimulate}
        onConfirmCreation={handleConfirmLoadCreation}
      />
    </div>
  )
}
