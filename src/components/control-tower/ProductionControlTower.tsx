import React, { useState } from 'react'
import { ControlTowerProvider, useControlTower } from '@/contexts/ControlTowerContext'
import { PerspectiveMode, ViewTab } from '@/types/control-tower'

// Icons
import {
  RefreshCw,
  Zap,
  Columns3,
  Bell,
  BookmarkPlus,
  Layers,
  Sparkles,
  Cpu,
  Database,
  History,
  Maximize2,
  Minimize2,
  Eye,
  Sliders,
  HardHat,
  ShieldCheck,
  LayoutDashboard,
  Network,
  CalendarDays,
  KanbanSquare,
  BarChart3,
  Flame,
  AlertOctagon,
  GitFork,
  Clock,
  LineChart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Sub-components
import { GlobalFilters } from '@/components/control-tower/GlobalFilters'
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
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'

/* =========================================================================
   PERSPECTIVE SELECTOR COMPONENT
   ========================================================================= */
const PerspectiveSelector: React.FC = () => {
  const { perspective, setPerspective, setActiveTab } = useControlTower()

  const handleSelect = (p: PerspectiveMode) => {
    setPerspective(p)
    if (p === 'CHAO_FABRICA') {
      setActiveTab('SHOP_FLOOR')
    } else if (p === 'GERAL') {
      setActiveTab('OVERVIEW')
    } else if (p === 'PROGRAMADOR') {
      setActiveTab('GANTT')
    }
  }

  return (
    <div className="bg-slate-950 px-4 py-2 border-b border-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          Perspectiva Operacional:
        </span>

        <div className="inline-flex bg-slate-900 p-1 rounded-lg border border-slate-800 gap-1">
          {/* Geral */}
          <button
            type="button"
            onClick={() => handleSelect('GERAL')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              perspective === 'GERAL'
                ? 'bg-[#004C97] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Geral (Diretoria / Gestão)</span>
          </button>

          {/* Programador */}
          <button
            type="button"
            onClick={() => handleSelect('PROGRAMADOR')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              perspective === 'PROGRAMADOR'
                ? 'bg-[#004C97] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Programador (PCP Full)</span>
          </button>

          {/* Chão de Fábrica */}
          <button
            type="button"
            onClick={() => handleSelect('CHAO_FABRICA')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              perspective === 'CHAO_FABRICA'
                ? 'bg-[#004C97] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            <span>Chão de Fábrica (Operadores)</span>
          </button>
        </div>
      </div>

      {/* Scope helper badge */}
      <div className="text-[11px] text-slate-400 hidden md:block">
        {perspective === 'GERAL' && (
          <span className="text-slate-400">
            Modo Consulta: Indicadores executivos, aderência, capacidade e gargalos. Sem edição.
          </span>
        )}
        {perspective === 'PROGRAMADOR' && (
          <span className="text-cyan-300 font-mono">
            Modo Completo: Gantt, Simulação D&D, Dependências, IA e Validação.
          </span>
        )}
        {perspective === 'CHAO_FABRICA' && (
          <span className="text-amber-300 font-mono">
            Modo Simplificado: &quot;O que produzir agora? O que vem depois? Quanto falta?&quot;
          </span>
        )}
      </div>
    </div>
  )
}

/* =========================================================================
   VISUALIZATION SELECTOR COMPONENT
   ========================================================================= */
const allTabs: {
  id: ViewTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'OVERVIEW', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'MAP', label: 'Mapa', icon: Network },
  { id: 'GANTT', label: 'Gantt', icon: CalendarDays },
  { id: 'KANBAN', label: 'Kanban', icon: KanbanSquare },
  { id: 'CAPACITY', label: 'Capacidade', icon: BarChart3 },
  { id: 'HEATMAP', label: 'Heatmap', icon: Flame },
  { id: 'BOTTLENECKS', label: 'Gargalos/Buffers', icon: AlertOctagon },
  { id: 'FLOW', label: 'Fluxo', icon: GitFork },
  { id: 'TIMELINE', label: 'Timeline', icon: Clock },
  { id: 'SHOP_FLOOR', label: 'Chão de Fábrica', icon: HardHat },
  { id: 'INDICATORS', label: 'Indicadores', icon: LineChart },
]

const VisualizationSelector: React.FC = () => {
  const { activeTab, setActiveTab, bottlenecks, orders } = useControlTower()

  return (
    <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 min-w-max">
        {allTabs.map((tab) => {
          const isActive = activeTab === tab.id
          const IconComponent = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-[#004C97] text-white border border-blue-400/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <IconComponent
                className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`}
              />
              <span>{tab.label}</span>

              {tab.id === 'BOTTLENECKS' && bottlenecks.length > 0 && (
                <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {bottlenecks.length}
                </span>
              )}

              {tab.id === 'KANBAN' && (
                <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {orders.length}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* =========================================================================
   MAIN CONTROL TOWER SHELL
   ========================================================================= */
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
