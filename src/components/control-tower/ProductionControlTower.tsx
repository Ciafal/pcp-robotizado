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

/* =========================================================================
   HEADER COMPONENT
   ========================================================================= */
const ControlTowerHeader: React.FC<{
  isFullscreen: boolean
  toggleFullscreen: () => void
}> = ({ isFullscreen, toggleFullscreen }) => {
  const {
    lastSyncTime,
    isSyncing,
    refreshData,
    setIsSimulatorModalOpen,
    setIsComparisonModalOpen,
    setIsAlertCenterOpen,
    setIsAIPanelOpen,
    setIsVersionModalOpen,
    alerts,
    savedViews,
    saveCurrentView,
    applySavedView,
  } = useControlTower()

  const [isSaveViewOpen, setIsSaveViewOpen] = useState(false)
  const [viewNameInput, setViewNameInput] = useState('')

  const activeAlertsCount = alerts.filter((a) => !a.acknowledged).length

  const handleSaveViewSubmit = () => {
    if (viewNameInput.trim()) {
      saveCurrentView(viewNameInput.trim())
      setViewNameInput('')
      setIsSaveViewOpen(false)
    }
  }

  return (
    <div className="bg-slate-950 border-b border-slate-800 p-4 space-y-3">
      {/* Breadcrumb & SAP Status Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="hover:text-slate-300 cursor-pointer">PCP Robotizado</span>
          <span className="text-slate-600">&gt;</span>
          <span className="hover:text-slate-300 cursor-pointer">Sequenciamento</span>
          <span className="text-slate-600">&gt;</span>
          <span className="text-white font-semibold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#004C97]" /> Central Produtiva
          </span>
        </div>

        {/* Sync & SAP Connection Indicators */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="text-slate-400">
            Última sincronização SAP: <strong className="text-slate-200">{lastSyncTime}</strong>
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              SAP conectado
            </span>
            <span className="flex items-center gap-1 text-cyan-300 bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded-full font-mono text-[10px]">
              <Database className="w-3 h-3 text-cyan-400" />
              Dados sincronizados
            </span>
            <span className="flex items-center gap-1 text-blue-300 bg-blue-950/60 border border-blue-800/80 px-2 py-0.5 rounded-full font-mono text-[10px]">
              <Cpu className="w-3 h-3 text-blue-400" />
              Motor de IA disponível
            </span>
          </div>
        </div>
      </div>

      {/* Main Title & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Central de Sequenciamento Produtivo
            <Badge className="bg-[#004C97] text-white border-blue-400/30 text-[10px] font-bold uppercase tracking-wider">
              Torre de Controle Operacional
            </Badge>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Sincronização de linhas, recursos, materiais e processos produtivos CIAFAL
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Atualizar */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isSyncing}
            className="border-slate-800 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800 text-xs h-8 gap-1.5"
            title="Sincronizar dados em tempo real com o SAP ECC"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          {/* Simular Cenário */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSimulatorModalOpen(true)}
            className="border-slate-800 bg-slate-900 text-amber-400 hover:text-amber-300 hover:bg-slate-800 text-xs h-8 gap-1.5 font-semibold"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simular Cenário</span>
          </Button>

          {/* Comparar Cenários */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsComparisonModalOpen(true)}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-8 gap-1.5"
          >
            <Columns3 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Comparar Cenários</span>
          </Button>

          {/* Análise IA */}
          <Button
            size="sm"
            onClick={() => setIsAIPanelOpen(true)}
            className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs h-8 gap-1.5 font-bold shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Analisar com IA</span>
          </Button>

          {/* Alertas */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAlertCenterOpen(true)}
            className="relative border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-8 gap-1.5"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Alertas</span>
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {activeAlertsCount}
              </span>
            )}
          </Button>

          {/* Salvar Visão */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-xs h-8 gap-1.5"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline">Salvar Visão</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-950 border-slate-800 text-slate-200 text-xs w-56">
              <DropdownMenuLabel className="text-white text-xs">Visões Favoritas</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              {savedViews.map((sv) => (
                <DropdownMenuItem
                  key={sv.id}
                  onClick={() => applySavedView(sv.id)}
                  className="cursor-pointer hover:bg-slate-900 focus:bg-slate-900 text-slate-300 flex items-center justify-between"
                >
                  <span className="truncate">{sv.name}</span>
                  <Badge variant="outline" className="text-[9px] border-slate-700">
                    {sv.tab}
                  </Badge>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                onClick={() => setIsSaveViewOpen(true)}
                className="cursor-pointer text-cyan-400 hover:text-cyan-300 hover:bg-slate-900 focus:bg-slate-900 font-semibold"
              >
                + Salvar visão atual como favorita...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Histórico & Versionamento */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVersionModalOpen(true)}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-xs h-8 gap-1.5"
            title="Histórico de Versões e Trilha de Homologação"
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xl:inline">Versões</span>
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-slate-400 hover:text-white hover:bg-slate-900 h-8 w-8 p-0"
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Modal para Salvar Visão */}
      <Dialog open={isSaveViewOpen} onOpenChange={setIsSaveViewOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-emerald-400" /> Salvar Visão Personalizada
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Grave a combinação atual de filtros, linha e lente ativa para acesso rápido no futuro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs text-slate-300">Nome da Visão</Label>
            <Input
              value={viewNameInput}
              onChange={(e) => setViewNameInput(e.target.value)}
              placeholder="ex.: Programador L1 - 48h com Gargalos"
              className="bg-slate-900 border-slate-700 text-white text-xs"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSaveViewOpen(false)}
              className="border-slate-800 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveViewSubmit}
              className="bg-[#004C97] hover:bg-[#003B75] text-white font-bold"
            >
              Gravar Visão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
