import React from 'react'
import { EfficiencyModuleView } from '@/components/control-tower/EfficiencyModuleView'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'

export const EfficiencyPlantsSubpage: React.FC = () => {
  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      <ControlTowerHeader
        title="Eficiência por Planta Industrial"
        subtitle="Aderência global, ocupação fabril, perdas estruturais de capacidade e balanceamento entre plantas."
        breadcrumbSubmodule="Eficiência > Plantas"
      />
      <EfficiencyModuleView initialTab="plantas" />
    </div>
  )
}
export default EfficiencyPlantsSubpage
