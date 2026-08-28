import React, { useState } from 'react'
import { ControlTowerProvider, useControlTower } from '@/contexts/ControlTowerContext'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'
import { PerspectiveSelector } from '@/components/control-tower/PerspectiveSelector'
import { VisualizationSelector } from '@/components/control-tower/VisualizationSelector'
import { GlobalFilters } from '@/components/control-tower/GlobalFilters'

// Visualizações
import { ProductionOverview } from '@/components/control-tower/ProductionOverview'
import { IntegrationMap } from '@/components/control-tower/IntegrationMap'
import { ProductionGantt } from '@/components/control-tower/ProductionGantt'
import { ProductionKanban } from '@/components/control-tower/ProductionKanban'
import { CapacityLoadChart } from '@/components/control-tower/CapacityLoadChart'
import { CapacityHeatmap } from '@/components/control-tower/CapacityHeatmap'
import { BottleneckBufferBoard } from '@/components/control-tower/BottleneckBufferBoard'
import { ProductionFlow } from '@/components/control-tower/ProductionFlow'
import { EventTimeline } from '@/components/control-tower/EventTimeline'
import { ShopFloorView } from '@/components/control-tower/ShopFloorView'
import { ConsolidatedIndicators } from '@/components/control-tower/ConsolidatedIndicators'

// Modais & Drawers
import { ProcessDrawer } from '@/components/control-tower/ProcessDrawer'
import { OrderDrawer } from '@/components/control-tower/OrderDrawer'
import { ScenarioSimulator } from '@/components/control-tower/ScenarioSimulator'
import { ScenarioComparison } from '@/components/control-tower/ScenarioComparison'
import { AISequencingPanel } from '@/components/control-tower/AISequencingPanel'
import { AlertCenter } from '@/components/control-tower/AlertCenter'
import { VersionComparisonModal } from '@/components/control-tower/VersionComparisonModal'

const ControlTowerInner: React.FC = () => {
  const { activeTab } = useControlTower()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-[#004C97] selection:text-white">
      {/* Cabeçalho Oficial da Torre de Controle */}
      <ControlTowerHeader isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} />

      {/* Seletor de Perspectiva (Geral / Programador / Chão de Fábrica) */}
      <PerspectiveSelector />

      {/* Barra de Seleção de Visualizações Especializadas */}
      <VisualizationSelector />

      {/* Filtros Globais Compartilhados */}
      <GlobalFilters />

      {/* Área Central de Visualização Ativa */}
      <main className="flex-1 overflow-auto bg-slate-950">
        {activeTab === 'OVERVIEW' && <ProductionOverview />}
        {activeTab === 'MAP' && <IntegrationMap />}
        {activeTab === 'GANTT' && <ProductionGantt />}
        {activeTab === 'KANBAN' && <ProductionKanban />}
        {activeTab === 'CAPACITY' && <CapacityLoadChart />}
        {activeTab === 'HEATMAP' && <CapacityHeatmap />}
        {activeTab === 'BOTTLENECKS' && <BottleneckBufferBoard />}
        {activeTab === 'FLOW' && <ProductionFlow />}
        {activeTab === 'TIMELINE' && <EventTimeline />}
        {activeTab === 'SHOP_FLOOR' && <ShopFloorView />}
        {activeTab === 'INDICATORS' && <ConsolidatedIndicators />}
      </main>

      {/* Drawers e Modais Globais (Sincronizados) */}
      <ProcessDrawer />
      <OrderDrawer />
      <ScenarioSimulator />
      <ScenarioComparison />
      <AISequencingPanel />
      <AlertCenter />
      <VersionComparisonModal />
    </div>
  )
}

export const ProductionControlTower: React.FC = () => {
  return (
    <ControlTowerProvider>
      <ControlTowerInner />
    </ControlTowerProvider>
  )
}
