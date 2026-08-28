import React, { useState } from 'react'
import {
  CalendarDays,
  Network,
  Kanban,
  Gauge,
  Flame,
  AlertTriangle,
  GitCommit,
  Clock,
  Sparkles,
  PlayCircle,
  FileCheck,
  Building2,
  Factory,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductionGantt } from '@/components/control-tower/ProductionGantt'
import { IntegrationMap } from '@/components/control-tower/IntegrationMap'
import { ProductionKanban } from '@/components/control-tower/ProductionKanban'
import { CapacityLoadChart } from '@/components/control-tower/CapacityLoadChart'
import { CapacityHeatmap } from '@/components/control-tower/CapacityHeatmap'
import { BottleneckBufferBoard } from '@/components/control-tower/BottleneckBufferBoard'
import { ProductionFlow } from '@/components/control-tower/ProductionFlow'
import { EventTimeline } from '@/components/control-tower/EventTimeline'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'
import { OrderDrawer } from '@/components/control-tower/OrderDrawer'
import { ProcessDrawer } from '@/components/control-tower/ProcessDrawer'
import { AISequencingPanel } from '@/components/control-tower/AISequencingPanel'
import { ScenarioSimulator } from '@/components/control-tower/ScenarioSimulator'
import { ScenarioComparison } from '@/components/control-tower/ScenarioComparison'
import { AlertCenter } from '@/components/control-tower/AlertCenter'
import { VersionComparisonModal } from '@/components/control-tower/VersionComparisonModal'

export const SequencingPage: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    filters,
    setCompanyScope,
    setPlantScope,
    setLineScope,
    companies,
    availablePlants,
    availableLines,
    selectedOrder,
    setSelectedOrder,
    selectedProcess,
    setSelectedProcess,
    isSimulatorModalOpen,
    setIsSimulatorModalOpen,
    isComparisonModalOpen,
    setIsComparisonModalOpen,
    isAlertCenterOpen,
    setIsAlertCenterOpen,
    isAIPanelOpen,
    setIsAIPanelOpen,
    isVersionModalOpen,
    setIsVersionModalOpen,
    sendScenarioForApproval,
    effectiveRules,
  } = useControlTower()

  const isCompanyLevel = filters.plantCode === 'ALL' && filters.lineCode === 'ALL'
  const isPlantLevel = filters.plantCode !== 'ALL' && filters.lineCode === 'ALL'
  const isLineLevel = filters.lineCode !== 'ALL'

  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      {/* Header Central com Breadcrumb, Escopo e Sincronização */}
      <ControlTowerHeader
        title="Central de Sequenciamento & Programação Técnica"
        subtitle="Ambiente técnico de sequenciamento, simulação drag-and-drop, capacidade e restrições."
        breadcrumbSubmodule="Sequenciamento"
      />

      {/* Barra Principal de Visualizações Técnicas do Programador */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={activeTab === 'GANTT' || activeTab === 'OVERVIEW' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('GANTT')}
            className={`h-8 gap-1.5 text-xs ${
              activeTab === 'GANTT' || activeTab === 'OVERVIEW'
                ? 'bg-pantone-2945 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Gantt</span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'MAP' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('MAP')}
            className={`h-8 gap-1.5 text-xs ${
              activeTab === 'MAP'
                ? 'bg-pantone-2945 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Mapa</span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'KANBAN' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('KANBAN')}
            className={`h-8 gap-1.5 text-xs ${
              activeTab === 'KANBAN'
                ? 'bg-pantone-2945 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Kanban</span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'CAPACITY' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('CAPACITY')}
            className={`h-8 gap-1.5 text-xs ${
              activeTab === 'CAPACITY'
                ? 'bg-pantone-2945 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Capacidade</span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'HEATMAP' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('HEATMAP')}
            className={`h-8 gap-1.5 text-xs ${
              activeTab === 'HEATMAP'
                ? 'bg-pantone-2945 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Heatmap</span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'BOTTLENECKS' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('BOTTLENECKS')}
            className={`h-8 gap-1.5 text-xs ${
              activeTab === 'BOTTLENECKS'
                ? 'bg-pantone-2945 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Gargalos & Buffers</span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'FLOW' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('FLOW')}
            className={`h-8 gap-1.5 text-xs ${
              activeTab === 'FLOW'
                ? 'bg-pantone-2945 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Fluxo</span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'TIMELINE' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('TIMELINE')}
            className={`h-8 gap-1.5 text-xs ${
              activeTab === 'TIMELINE'
                ? 'bg-pantone-2945 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </Button>
        </div>

        {/* Ações Técnicas: Homologar / Comparar Cenários */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsComparisonModalOpen(true)}
            className="h-7 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
          >
            <Layers className="w-3.5 h-3.5 mr-1 text-cyan-400" />
            Comparar Cenários
          </Button>

          <Button
            size="sm"
            onClick={() => sendScenarioForApproval('Sequenciamento técnico otimizado pelo PCP')}
            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            <FileCheck className="w-3.5 h-3.5 mr-1" />
            Enviar para Aprovação
          </Button>
        </div>
      </div>

      {/* Renderização do Conteúdo Selecionado */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm">
        {(activeTab === 'GANTT' || activeTab === 'OVERVIEW') && <ProductionGantt />}
        {activeTab === 'MAP' && <IntegrationMap />}
        {activeTab === 'KANBAN' && <ProductionKanban />}
        {activeTab === 'CAPACITY' && <CapacityLoadChart />}
        {activeTab === 'HEATMAP' && <CapacityHeatmap />}
        {activeTab === 'BOTTLENECKS' && <BottleneckBufferBoard />}
        {activeTab === 'FLOW' && <ProductionFlow />}
        {activeTab === 'TIMELINE' && <EventTimeline />}
      </div>

      {/* Drawers e Modais */}
      <OrderDrawer
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
      <ProcessDrawer
        process={selectedProcess}
        isOpen={!!selectedProcess}
        onClose={() => setSelectedProcess(null)}
      />

      {/* Modais de IA e Simulação */}
      <AISequencingPanel isOpen={isAIPanelOpen} onClose={() => setIsAIPanelOpen(false)} />
      <ScenarioSimulator
        isOpen={isSimulatorModalOpen}
        onClose={() => setIsSimulatorModalOpen(false)}
      />
      <ScenarioComparison
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
      />
      <AlertCenter isOpen={isAlertCenterOpen} onClose={() => setIsAlertCenterOpen(false)} />
      <VersionComparisonModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
      />
    </div>
  )
}
