import React, { useState } from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { ProductionProcessNode } from '@/types/control-tower'
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Layers,
  ArrowRight,
  AlertTriangle,
  Flame,
  HardHat,
  PackageCheck,
  RotateCcw,
  SlidersHorizontal,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const IntegrationMap: React.FC = () => {
  const {
    processNodes,
    filteredNodes,
    setSelectedProcess,
    setIsAIPanelOpen,
    setIsSimulatorModalOpen,
  } = useControlTower()

  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [highlightPath, setHighlightPath] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.4, z + 0.1))
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.7, z - 0.1))
  const handleResetZoom = () => setZoomLevel(1)

  // Identificar se nó está destacado no caminho
  const isNodeHighlighted = (node: ProductionProcessNode) => {
    if (!highlightPath) return true
    if (node.code === highlightPath) return true
    if (node.downstreamProcessCodes.includes(highlightPath)) return true
    if (node.upstreamProcessCodes.includes(highlightPath)) return true
    return false
  }

  return (
    <div className="p-4 space-y-4">
      {/* Barra de Ferramentas do Mapa */}
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-[#004C97]" />
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              Rede de Fluxo Produtivo Integrada
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <Button
              size="sm"
              variant={selectedCategory === 'ALL' ? 'default' : 'ghost'}
              onClick={() => setSelectedCategory('ALL')}
              className={`h-6 text-[11px] px-2 ${
                selectedCategory === 'ALL' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              Todos os Processos
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === 'BOTTLENECK' ? 'default' : 'ghost'}
              onClick={() => setSelectedCategory('BOTTLENECK')}
              className={`h-6 text-[11px] px-2 ${
                selectedCategory === 'BOTTLENECK'
                  ? 'bg-rose-900 text-rose-200 border border-rose-700'
                  : 'text-slate-400'
              }`}
            >
              Destacar Gargalos
            </Button>
          </div>
        </div>

        {/* Zoom e Controles */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-mono mr-1">
            Zoom: {Math.round(zoomLevel * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            className="h-7 w-7 p-0 border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            className="h-7 w-7 p-0 border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
            title="Diminuir Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetZoom}
            className="h-7 text-[11px] text-slate-400 hover:text-white"
          >
            Reset
          </Button>
          {highlightPath && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHighlightPath(null)}
              className="h-7 text-[11px] border-slate-800 bg-slate-900 text-amber-400"
            >
              Limpar Rota
            </Button>
          )}
        </div>
      </div>

      {/* Área Gráfica do Mapa Interativo */}
      <div className="relative bg-slate-950 border border-slate-850 rounded-xl min-h-[560px] overflow-auto p-6 shadow-inner">
        {/* Grade de Fundo Dark Industrial */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #334155 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        ></div>

        <div
          className="transition-transform origin-top-left"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Legenda de Fluxo */}
          <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 max-w-fit">
            <span className="font-semibold text-slate-200">Estrutura de Rede:</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-blue-600"></span> Estoque/Pátio
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-600"></span> Forno/Aquecimento
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-cyan-600"></span> Linha Principal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span> Acabamento
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-purple-600"></span> Retrabalho
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-indigo-600"></span> Expedição
            </span>
          </div>

          {/* Grid de Nós de Processo Produtivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredNodes.map((node) => {
              const isBottleneck = node.isBottleneck
              const isCritical = isBottleneck && node.bottleneckSeverity === 'CRITICAL'
              const highlighted = isNodeHighlighted(node)
              const matchesCategory =
                selectedCategory === 'ALL' || (selectedCategory === 'BOTTLENECK' && isBottleneck)

              if (!matchesCategory) return null

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedProcess(node)}
                  className={`relative p-3.5 rounded-xl border transition-all cursor-pointer select-none group ${
                    highlighted
                      ? isCritical
                        ? 'bg-rose-950/40 border-rose-600 shadow-lg shadow-rose-950/40'
                        : isBottleneck
                          ? 'bg-amber-950/30 border-amber-600 shadow-md'
                          : 'bg-slate-900/90 border-slate-700 hover:border-[#004C97] hover:shadow-lg'
                      : 'bg-slate-950/40 border-slate-850 opacity-40'
                  }`}
                >
                  {/* Top Header Node */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-cyan-300">
                          {node.code}
                        </span>
                        <Badge
                          className={`text-[9px] px-1.5 py-0 uppercase ${
                            node.type === 'SUPPLY'
                              ? 'bg-blue-950 text-blue-300 border-blue-700'
                              : node.type === 'FURNACE'
                                ? 'bg-amber-950 text-amber-300 border-amber-700'
                                : node.type === 'FINISHING'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                  : node.type === 'REWORK'
                                    ? 'bg-purple-950 text-purple-300 border-purple-700'
                                    : 'bg-slate-800 text-slate-200 border-slate-700'
                          }`}
                        >
                          {node.type}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-white text-xs mt-0.5">{node.name}</h4>
                    </div>

                    <Badge
                      className={`text-[9px] uppercase font-semibold ${
                        node.currentStatus === 'running'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                          : node.currentStatus === 'maintenance'
                            ? 'bg-rose-950 text-rose-400 border-rose-700'
                            : 'bg-amber-950 text-amber-400 border-amber-700'
                      }`}
                    >
                      {node.currentStatus}
                    </Badge>
                  </div>

                  {/* Informações de Campanha e Material */}
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-[11px] mb-2.5">
                    <div className="text-slate-400 truncate">
                      Campanha: <strong className="text-slate-200">{node.activeCampaign}</strong>
                    </div>
                    <div className="text-slate-400 truncate">
                      Material: <strong className="text-cyan-300">{node.activeMaterial}</strong>
                    </div>
                  </div>

                  {/* Métricas Principais do Nó */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] mb-2.5">
                    <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">Produzido / Previsto</span>
                      <span className="font-mono font-bold text-white">
                        {node.producedTonsToday} / {node.plannedTonsToday} t
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">Ocupação / Cadência</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {node.occupancyPct}%{' '}
                        <span className="text-slate-400 font-normal">
                          ({node.currentRateTonsPerHour} t/h)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Buffer Downstream & Alerta */}
                  <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Buffer Downstream:</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {node.downstreamBufferTons} t ({node.downstreamBufferHours}h)
                      </span>
                    </div>

                    {node.isBottleneck && (
                      <div className="bg-rose-950/50 border border-rose-800/80 text-rose-200 p-1.5 rounded text-[10px] flex items-start gap-1 mt-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">
                          <strong>Gargalo Ativo:</strong> {node.bottleneckReason}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ações Rápidas no Hover */}
                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setHighlightPath(node.code)
                      }}
                      className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                    >
                      Destacar Caminho
                    </button>

                    <span className="text-slate-500 group-hover:text-slate-300 transition-all flex items-center gap-0.5">
                      Ver detalhes <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
