import React from 'react'
import { MapLayerToggles } from '@/types/tms-mapa-logistico'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Layers } from 'lucide-react'

interface TmsMapLayersProps {
  layers: MapLayerToggles
  onToggleLayer: (layerKey: keyof MapLayerToggles) => void
}

export const TmsMapLayers: React.FC<TmsMapLayersProps> = ({ layers, onToggleLayer }) => {
  const layerItems: Array<{
    key: keyof MapLayerToggles
    label: string
    colorIndicator?: string
  }> = [
    { key: 'heatmap', label: 'Mapa de calor', colorIndicator: 'bg-amber-500' },
    { key: 'availableOrders', label: 'Pedidos disponíveis', colorIndicator: 'bg-blue-600' },
    { key: 'clients', label: 'Clientes', colorIndicator: 'bg-emerald-600' },
    { key: 'itineraries', label: 'Itinerários SAP', colorIndicator: 'bg-purple-600' },
    { key: 'suggestedLoads', label: 'Cargas sugeridas IA', colorIndicator: 'bg-teal-500' },
    { key: 'plannedLoads', label: 'Cargas planejadas', colorIndicator: 'bg-indigo-600' },
    { key: 'availableStock', label: 'Estoque disponível', colorIndicator: 'bg-green-600' },
    { key: 'logisticsAlerts', label: 'Alertas logísticos', colorIndicator: 'bg-rose-500' },
    { key: 'showRoutes', label: 'Exibir rotas', colorIndicator: 'bg-cyan-600' },
  ]

  return (
    <div className="bg-white/95 backdrop-blur-sm border rounded-lg p-2.5 shadow-sm text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-2 pb-1.5 border-b border-slate-100">
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        <span>Camadas Operacionais</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-x-3 gap-y-1.5">
        {layerItems.map((item) => (
          <div key={item.key} className="flex items-center space-x-1.5">
            <Checkbox
              id={`layer-${item.key}`}
              checked={layers[item.key]}
              onCheckedChange={() => onToggleLayer(item.key)}
              className="h-3.5 w-3.5 rounded-sm"
            />
            <Label
              htmlFor={`layer-${item.key}`}
              className="text-[11px] font-medium text-slate-700 cursor-pointer flex items-center gap-1 select-none"
            >
              {item.colorIndicator && (
                <span className={`w-2 h-2 rounded-full inline-block ${item.colorIndicator}`} />
              )}
              {item.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
