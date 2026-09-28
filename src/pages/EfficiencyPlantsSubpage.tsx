import React, { useState } from 'react'
import {
  EfficiencyUnifiedFilterBar,
  UnifiedEfficiencyFilters,
  EfficiencyFilterOptions,
} from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import {
  PlantEfficiencyCardsView,
  PlantEfficiencyItem,
} from '@/components/control-tower/efficiency/PlantEfficiencyCardsView'
import { Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

export const EfficiencyPlantsSubpage: React.FC = () => {
  const [filters, setFilters] = useState<UnifiedEfficiencyFilters>({
    companyCode: 'ALL',
    plantCode: 'ALL',
    lineCode: 'ALL',
    startDate: '',
    endDate: '',
  })

  const [loading, setLoading] = useState(false)

  const filterOptions: EfficiencyFilterOptions = {
    companies: [
      { code: 'CIAFAL', name: 'CIAFAL Matriz' },
      { code: 'SIDERURGICA', name: 'Siderúrgica CIAFAL' },
    ],
    plants: [
      { code: 'DIV', name: 'Divinópolis (DIV)', companyCode: 'CIAFAL' },
      { code: 'BH', name: 'Belo Horizonte (BH)', companyCode: 'CIAFAL' },
      { code: 'SAB', name: 'Sabará (SAB)', companyCode: 'CIAFAL' },
    ],
    lines: [],
    centers: [],
  }

  // Dados consolidados das 3 plantas industriais
  const plants: PlantEfficiencyItem[] = [
    {
      id: 'plant-div',
      companyCode: 'CIAFAL',
      plantCode: 'DIV',
      plantName: 'Planta Industrial Divinópolis',
      cityState: 'Divinópolis, MG',
      totalLinesCount: 2,
      totalCentersCount: 14,
      plannedTons: 2790.0,
      realizedTons: 2657.5,
      adherencePct: 95.2,
      occupancyPct: 91.8,
      lostCapacityTons: 132.5,
      status: 'DENTRO_ESPERADO',
    },
    {
      id: 'plant-bh',
      companyCode: 'CIAFAL',
      plantCode: 'BH',
      plantName: 'Planta de Corte e Dobra Belo Horizonte',
      cityState: 'Belo Horizonte, MG',
      totalLinesCount: 1,
      totalCentersCount: 6,
      plannedTons: 580.0,
      realizedTons: 565.0,
      adherencePct: 97.4,
      occupancyPct: 88.5,
      lostCapacityTons: 15.0,
      status: 'DENTRO_ESPERADO',
    },
    {
      id: 'plant-sab',
      companyCode: 'CIAFAL',
      plantCode: 'SAB',
      plantName: 'Planta de Telas e Treliças Sabará',
      cityState: 'Sabará, MG',
      totalLinesCount: 1,
      totalCentersCount: 8,
      plannedTons: 717.0,
      realizedTons: 638.0,
      adherencePct: 88.9,
      occupancyPct: 82.0,
      lostCapacityTons: 79.0,
      status: 'ATENCAO',
    },
  ]

  const filteredPlants = plants.filter((p) => {
    if (filters.plantCode && filters.plantCode !== 'ALL' && p.plantCode !== filters.plantCode) {
      return false
    }
    if (
      filters.companyCode &&
      filters.companyCode !== 'ALL' &&
      p.companyCode !== filters.companyCode
    ) {
      return false
    }
    return true
  })

  const handleSelectPlant = (plantCode: string) => {
    toast({
      title: `Planta Selecionada: ${plantCode}`,
      description: `Filtrando linhas e postos da planta ${plantCode}.`,
    })
  }

  return (
    <div className="space-y-4">
      {/* Subheader Informativo */}
      <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Eficiência Operacional por Planta Industrial
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-slate-200 bg-slate-50 text-slate-700"
              >
                {filteredPlants.length} plantas ativas
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Taxa de ocupação global, perdas de capacidade e aderência por sítio fabril
            </p>
          </div>
        </div>
      </div>

      {/* Grade Unificada de Filtros */}
      <EfficiencyUnifiedFilterBar
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        onReset={() =>
          setFilters({
            companyCode: 'ALL',
            plantCode: 'ALL',
            lineCode: 'ALL',
            startDate: '',
            endDate: '',
          })
        }
        showCenterFilter={false}
        showLine2={false}
      />

      {/* Cards de Eficiência por Planta */}
      <PlantEfficiencyCardsView plants={filteredPlants} onSelectPlant={handleSelectPlant} />
    </div>
  )
}
export default EfficiencyPlantsSubpage
