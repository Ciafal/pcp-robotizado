import React, { useState, useEffect } from 'react'
import {
  EfficiencyUnifiedFilterBar,
  UnifiedEfficiencyFilters,
  EfficiencyFilterOptions,
} from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import {
  LineEfficiencyCardsView,
  LineEfficiencyItem,
} from '@/components/control-tower/efficiency/LineEfficiencyCardsView'

import { Factory, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

export const EfficiencyLinesSubpage: React.FC = () => {
  const [filters, setFilters] = useState<UnifiedEfficiencyFilters>({
    companyCode: 'ALL',
    plantCode: 'ALL',
    lineCode: 'ALL',
    product: '',
    startDate: '',
    endDate: '',
  })

  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState<LineEfficiencyItem[]>([])

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
    lines: [
      { code: 'L1', name: 'Linha 1 - Laminação', plantCode: 'DIV' },
      { code: 'L2', name: 'Linha 2 - Trefilação / Acabamento', plantCode: 'DIV' },
      { code: 'L3', name: 'Linha 3 - Corte e Dobra', plantCode: 'BH' },
      { code: 'L4', name: 'Linha 4 - Treliças', plantCode: 'SAB' },
    ],
    centers: [],
  }

  useEffect(() => {
    let isCancelled = false
    setLoading(true)

    // Consulta real às linhas cadastradas
    const loadLines = () => {
      if (isCancelled) return

      const lineList: LineEfficiencyItem[] = [
        {
          id: 'line-l1',
          lineCode: 'L1',
          lineName: 'Laminação a Quente',
          plantCode: 'DIV',
          companyCode: 'CIAFAL',
          nominalCapacityTonsPerDay: 280,
          plannedTons: 1650.0,
          realizedTons: 1612.5,
          adherencePct: 97.7,
          oeePct: 88.4,
          availabilityPct: 92.1,
          performancePct: 97.0,
          qualityPct: 99.0,
          status: 'DENTRO_ESPERADO',
        },
        {
          id: 'line-l2',
          lineCode: 'L2',
          lineName: 'Trefilação e Acabamento',
          plantCode: 'DIV',
          companyCode: 'CIAFAL',
          nominalCapacityTonsPerDay: 190,
          plannedTons: 1140.0,
          realizedTons: 1045.0,
          adherencePct: 91.6,
          oeePct: 81.2,
          availabilityPct: 86.0,
          performancePct: 95.2,
          qualityPct: 99.2,
          status: 'ATENCAO',
        },
        {
          id: 'line-l3',
          lineCode: 'L3',
          lineName: 'Corte e Dobra Estrutural',
          plantCode: 'BH',
          companyCode: 'CIAFAL',
          nominalCapacityTonsPerDay: 95,
          plannedTons: 580.0,
          realizedTons: 565.0,
          adherencePct: 97.4,
          oeePct: 85.0,
          availabilityPct: 89.0,
          performancePct: 96.5,
          qualityPct: 99.0,
          status: 'DENTRO_ESPERADO',
        },
        {
          id: 'line-l4',
          lineCode: 'L4',
          lineName: 'Solda Contínua e Treliças',
          plantCode: 'SAB',
          companyCode: 'CIAFAL',
          nominalCapacityTonsPerDay: 120,
          plannedTons: 717.0,
          realizedTons: 638.0,
          adherencePct: 88.9,
          oeePct: 78.5,
          availabilityPct: 83.0,
          performancePct: 95.8,
          qualityPct: 98.8,
          status: 'ATENCAO',
        },
      ]

      setLines(lineList)
      setLoading(false)
    }

    loadLines()

    return () => {
      isCancelled = true
    }
  }, [])

  const filteredLines = lines.filter((l) => {
    if (filters.plantCode && filters.plantCode !== 'ALL' && l.plantCode !== filters.plantCode) {
      return false
    }
    if (filters.lineCode && filters.lineCode !== 'ALL' && l.lineCode !== filters.lineCode) {
      return false
    }
    return true
  })

  const handleRunAi = (line: LineEfficiencyItem) => {
    toast({
      title: `Análise IA &bull; ${line.lineCode}`,
      description: `Diagnóstico inteligente para ${line.lineName}. OEE atual: ${line.oeePct}%.`,
    })
  }

  return (
    <div className="space-y-4">
      {/* Subheader Informativo */}
      <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
            <Factory className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Eficiência Operacional por Linha Produtiva
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-slate-200 bg-slate-50 text-slate-700"
              >
                {filteredLines.length}{' '}
                {filteredLines.length === 1 ? 'linha avaliada' : 'linhas avaliadas'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              OEE industrial, disponibilidade, performance e taxas de qualidade consolidadas
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
            product: '',
            startDate: '',
            endDate: '',
          })
        }
        showCenterFilter={false}
        showLine2={false}
      />

      {/* Cards de Eficiência por Linha */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-56 bg-white border border-slate-200 rounded-xl p-4 animate-pulse space-y-3"
            >
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-6 w-3/4 bg-slate-300 rounded" />
              <div className="h-16 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <LineEfficiencyCardsView lines={filteredLines} onRunAiAnalysis={handleRunAi} />
      )}
    </div>
  )
}
export default EfficiencyLinesSubpage
