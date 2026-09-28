import React from 'react'
import { EfficiencyUnifiedFilterBar, UnifiedEfficiencyFilters } from './EfficiencyUnifiedFilterBar'
import { CenterEfficiencyFilters } from '@/services/efficiency-center-service'

interface EfficiencyCenterFiltersBarProps {
  initialFilters: CenterEfficiencyFilters
  options: {
    companies: { code: string; name: string }[]
    plants: { code: string; name: string; companyCode: string }[]
    lines: { code: string; name: string; plantCode: string }[]
    centers: { code: string; name: string; lineCode: string }[]
  }
  onApplyFilters: (filters: CenterEfficiencyFilters) => void
  onResetFilters: () => void
  isLoading?: boolean
}

export const EfficiencyCenterFiltersBar: React.FC<EfficiencyCenterFiltersBarProps> = ({
  initialFilters,
  options,
  onApplyFilters,
  onResetFilters,
  isLoading = false,
}) => {
  const unifiedFilters: UnifiedEfficiencyFilters = {
    companyCode: initialFilters.companyCode || 'ALL',
    plantCode: initialFilters.plantCode || 'ALL',
    lineCode: initialFilters.lineCode || 'ALL',
    centerCode: initialFilters.centerCode || 'ALL',
    startDate: initialFilters.startDate || '',
    endDate: initialFilters.endDate || '',
    product: initialFilters.product || '',
    search: initialFilters.order || '',
    status: initialFilters.status || 'ALL',
  }

  const handleChange = (next: UnifiedEfficiencyFilters) => {
    onApplyFilters({
      companyCode: next.companyCode,
      plantCode: next.plantCode,
      lineCode: next.lineCode,
      centerCode: next.centerCode,
      startDate: next.startDate,
      endDate: next.endDate,
      product: next.product,
      order: next.search,
      status: next.status as any,
    })
  }

  return (
    <EfficiencyUnifiedFilterBar
      filters={unifiedFilters}
      options={options}
      onChange={handleChange}
      onReset={onResetFilters}
      isLoading={isLoading}
      showCenterFilter={true}
      showLine2={true}
    />
  )
}
