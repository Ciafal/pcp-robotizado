import React, { useState } from 'react'
import {
  CityAggregation,
  UfAggregation,
  SapItinerario,
  TmsPlannedLoad,
  HeatmapMetric,
  MapLayerToggles,
} from '@/types/tms-mapa-logistico'
import { BRAZIL_STATES_SVG, geoToSvgCoords } from '@/services/tms-brazil-geo'
import { tmsMapaLogisticoService } from '@/services/tms-mapa-logistico-service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MapPin,
  Truck,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react'

interface BrazilLogisticsSvgMapProps {
  ufs: UfAggregation[]
  cities: CityAggregation[]
  itinerarios: SapItinerario[]
  plannedLoads: TmsPlannedLoad[]
  layers: MapLayerToggles
  heatmapMetric: HeatmapMetric
  selectedUf: string
  selectedCity: CityAggregation | null
  onSelectUf: (uf: string) => void
  onSelectCity: (city: CityAggregation) => void
  onSelectLoad: (load: TmsPlannedLoad) => void
}

export const BrazilLogisticsSvgMap: React.FC<BrazilLogisticsSvgMapProps> = ({
  ufs,
  cities,
  itinerarios,
  plannedLoads,
  layers,
  heatmapMetric,
  selectedUf,
  selectedCity,
  onSelectUf,
  onSelectCity,
  onSelectLoad,
}) => {
  // Controle de Zoom e Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Tooltip
  const [hoveredCity, setHoveredCity] = useState<CityAggregation | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Valor máximo da métrica para normalização do mapa de calor
  const maxMetricValue = Math.max(
    1,
    ...ufs.map((u) => tmsMapaLogisticoService.getMetricValue(u, heatmapMetric)),
  )

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev * 1.35, 4))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev / 1.35, 0.8))
  const handleResetZoom = () => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => setIsDragging(false)

  // Origem padrão CIAFAL Matriz (Divinópolis/MG)
  const ciafalOriginCoords = geoToSvgCoords(-20.1438, -44.8917)
  const sidercentroOriginCoords = geoToSvgCoords(-19.4589, -44.2472) // Sete Lagoas

  return (
    <div className="relative w-full h-[540px] bg-slate-900 rounded-lg overflow-hidden border border-slate-800 select-none">
      {/* Controles Flutuantes de Zoom */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1 bg-slate-800/90 backdrop-blur-sm p-1 rounded-md border border-slate-700 shadow-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="h-7 w-7 p-0 text-slate-200 hover:text-white hover:bg-slate-700"
          title="Aproximar (Zoom In)"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="h-7 w-7 p-0 text-slate-200 hover:text-white hover:bg-slate-700"
          title="Afastar (Zoom Out)"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetZoom}
          className="h-7 w-7 p-0 text-slate-200 hover:text-white hover:bg-slate-700"
          title="Redefinir visualização"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Legenda de Concentração de Demanda / Heatmap */}
      {layers.heatmap && (
        <div className="absolute bottom-3 left-3 z-20 bg-slate-800/90 backdrop-blur-sm p-2 rounded-md border border-slate-700 shadow-md text-[11px] text-slate-300">
          <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Concentração: {heatmapMetric.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <span>Baixa</span>
            <div className="w-24 h-2 rounded bg-gradient-to-r from-blue-900 via-amber-600 to-rose-600" />
            <span>
              Alta ({tmsMapaLogisticoService.formatMetricValue(maxMetricValue, heatmapMetric)})
            </span>
          </div>
        </div>
      )}

      {/* SVG Canvas Interativo */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full transition-transform duration-75"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: '50% 50%',
          }}
        >
          <defs>
            {/* Gradientes operacionais para rotas */}
            <linearGradient id="routeGradientSuggested" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="routeGradientPlanned" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Marcadores de seta para rotas */}
            <marker
              id="arrowhead-planned"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
            </marker>
            <marker
              id="arrowhead-suggested"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
            </marker>
          </defs>

          {/* 1. Camada dos Estados (Polígonos do Brasil) */}
          <g id="states-layer">
            {BRAZIL_STATES_SVG.map((state) => {
              const ufAgg = ufs.find((u) => u.uf === state.uf)
              const isSelected = selectedUf === state.uf

              // Cálculo de cor do mapa de calor conforme a métrica selecionada
              let fillColor = '#1e293b' // slate-800 default
              let strokeColor = '#334155' // slate-700
              let fillOpacity = 0.6

              if (ufAgg && layers.heatmap) {
                const metricVal = tmsMapaLogisticoService.getMetricValue(ufAgg, heatmapMetric)
                const ratio = Math.min(1, metricVal / maxMetricValue)
                if (ratio > 0.6) {
                  fillColor = '#e11d48' // rose-600
                  fillOpacity = 0.75
                } else if (ratio > 0.3) {
                  fillColor = '#d97706' // amber-600
                  fillOpacity = 0.65
                } else if (ratio > 0.05) {
                  fillColor = '#2563eb' // blue-600
                  fillOpacity = 0.5
                }
              }

              if (isSelected) {
                strokeColor = '#38bdf8' // sky-400
                fillOpacity = Math.max(fillOpacity, 0.85)
              }

              return (
                <g key={state.uf} className="transition-all">
                  <path
                    d={state.path}
                    fill={fillColor}
                    fillOpacity={fillOpacity}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 3 : 1.2}
                    className="cursor-pointer hover:fill-slate-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectUf(state.uf)
                    }}
                  />
                  {/* Rótulo do Estado */}
                  <text
                    x={state.labelX}
                    y={state.labelY}
                    fill={isSelected ? '#38bdf8' : '#94a3b8'}
                    fontSize="13"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    textAnchor="middle"
                    className="pointer-events-none select-none font-sans"
                  >
                    {state.uf}
                  </text>
                </g>
              )
            })}
          </g>

          {/* 2. Camada de Itinerários SAP & Rotas */}
          {layers.showRoutes && (
            <g id="routes-layer">
              {/* Rotas das Cargas Planejadas no TMS */}
              {layers.plannedLoads &&
                plannedLoads.map((load) => {
                  const originCoords = load.origin_plant.includes('Sidercentro')
                    ? sidercentroOriginCoords
                    : ciafalOriginCoords

                  return (
                    <g key={load.id} className="cursor-pointer" onClick={() => onSelectLoad(load)}>
                      {load.destinations_sequence.map((dest, i) => {
                        const targetCity = cities.find((c) => c.city === dest.city)
                        const targetCoords = targetCity
                          ? geoToSvgCoords(targetCity.latitude, targetCity.longitude)
                          : geoToSvgCoords(-23.5505, -46.6333)

                        return (
                          <line
                            key={`${load.id}-${i}`}
                            x1={originCoords.x}
                            y1={originCoords.y}
                            x2={targetCoords.x}
                            y2={targetCoords.y}
                            stroke="#6366f1"
                            strokeWidth="3.5"
                            strokeDasharray="6 3"
                            markerEnd="url(#arrowhead-planned)"
                            className="hover:stroke-indigo-300 transition-colors"
                          />
                        )
                      })}
                    </g>
                  )
                })}

              {/* Rotas de Itinerários Oficiais Cadastrados */}
              {layers.itineraries &&
                itinerarios.map((itin) => {
                  const originCoords = itin.origin_name.includes('Sidercentro')
                    ? sidercentroOriginCoords
                    : ciafalOriginCoords

                  return (
                    <g key={itin.id}>
                      {itin.cities_covered.slice(1).map((cName, idx) => {
                        const cityMatch = cities.find((c) => c.city === cName)
                        if (!cityMatch) return null
                        const cityCoords = geoToSvgCoords(cityMatch.latitude, cityMatch.longitude)
                        return (
                          <line
                            key={`${itin.id}-${idx}`}
                            x1={originCoords.x}
                            y1={originCoords.y}
                            x2={cityCoords.x}
                            y2={cityCoords.y}
                            stroke="#9333ea"
                            strokeWidth="1.8"
                            strokeOpacity="0.4"
                          />
                        )
                      })}
                    </g>
                  )
                })}
            </g>
          )}

          {/* 3. Camada de Origens Oficiais (CIAFAL e Sidercentro) */}
          <g id="origins-layer">
            {/* CIAFAL Matriz (Divinópolis) */}
            <circle
              cx={ciafalOriginCoords.x}
              cy={ciafalOriginCoords.y}
              r="8"
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth="2.5"
            />
            <text
              x={ciafalOriginCoords.x}
              y={ciafalOriginCoords.y - 12}
              fill="#60a5fa"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
              className="pointer-events-none"
            >
              CIAFAL (Origem)
            </text>

            {/* Sidercentro (Sete Lagoas) */}
            <circle
              cx={sidercentroOriginCoords.x}
              cy={sidercentroOriginCoords.y}
              r="7"
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={sidercentroOriginCoords.x}
              y={sidercentroOriginCoords.y - 10}
              fill="#fbbf24"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
              className="pointer-events-none"
            >
              Sidercentro
            </text>
          </g>

          {/* 4. Camada de Marcadores de Cidades da Carteira */}
          {layers.availableOrders && (
            <g id="cities-layer">
              {cities.map((city) => {
                const coords = geoToSvgCoords(city.latitude, city.longitude)
                const isSelected = selectedCity?.city === city.city
                const hasPendingGeo = !city.has_valid_geo

                // Raio proporcional à tonelagem
                const radius = Math.max(5, Math.min(16, 5 + Math.sqrt(city.total_tons) * 1.3))

                return (
                  <g
                    key={`${city.city}-${city.uf}`}
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      setHoveredCity(city)
                      setTooltipPos({ x: e.clientX, y: e.clientY })
                    }}
                    onMouseLeave={() => setHoveredCity(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectCity(city)
                    }}
                  >
                    {/* Anel de alerta se houver RFID pendente */}
                    {city.has_rfid_alert && layers.logisticsAlerts && (
                      <circle
                        cx={coords.x}
                        cy={coords.y}
                        r={radius + 4}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="3 2"
                        className="animate-pulse"
                      />
                    )}

                    {/* Marcador Principal */}
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r={radius}
                      fill={hasPendingGeo ? '#f43f5e' : isSelected ? '#38bdf8' : '#3b82f6'}
                      fillOpacity="0.85"
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      className="hover:scale-125 transition-transform origin-center"
                    />

                    {/* Rótulo com nome da cidade se zoom >= 1.2 */}
                    {zoomLevel >= 1.15 && (
                      <text
                        x={coords.x}
                        y={coords.y + radius + 11}
                        fill="#f8fafc"
                        fontSize="10"
                        fontWeight="500"
                        textAnchor="middle"
                        className="pointer-events-none drop-shadow"
                      >
                        {city.city}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Tooltip Dinâmico de Cidade (Formato Exato Especificado pelo Usuário) */}
      {hoveredCity && (
        <div
          className="fixed z-50 pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-lg border border-slate-700 shadow-xl max-w-[320px] text-xs animate-in fade-in duration-100"
          style={{
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y - 40}px`,
          }}
        >
          <div className="font-bold text-sm text-sky-400 mb-1 flex items-center justify-between">
            <span>
              {hoveredCity.city}/{hoveredCity.uf}
            </span>
            <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-600">
              Itinerário {hoveredCity.primary_itinerary}
            </Badge>
          </div>

          <div className="space-y-1 text-slate-300 text-xs">
            <div>
              Carteira:{' '}
              <span className="font-semibold text-white">
                {hoveredCity.total_tons.toFixed(1).replace('.', ',')} t
              </span>
            </div>
            <div>
              Pedidos: <span className="font-semibold text-white">{hoveredCity.orders_count}</span>
            </div>
            <div>
              Clientes:{' '}
              <span className="font-semibold text-white">{hoveredCity.customers_count}</span>
            </div>
            <div>
              Cargas potenciais:{' '}
              <span className="font-semibold text-white">{hoveredCity.potential_loads}</span>
            </div>
            <div>
              Itinerário principal:{' '}
              <span className="font-semibold text-white">{hoveredCity.primary_itinerary}</span>
            </div>
            <div>
              Estoque disponível:{' '}
              <span className="font-semibold text-emerald-400">
                {hoveredCity.available_tons.toFixed(1).replace('.', ',')} t
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-700 flex justify-end">
            <button
              type="button"
              onClick={() => onSelectCity(hoveredCity)}
              className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-2 cursor-pointer"
            >
              Ver detalhes →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
