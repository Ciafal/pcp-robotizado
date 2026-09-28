import React from 'react'
import { EfficiencyModuleView } from '@/components/control-tower/EfficiencyModuleView'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'

export const EfficiencyPage: React.FC = () => {
  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      <ControlTowerHeader
        title="Previsto x Realizado"
        subtitle="Comparação entre programação planejada e produção realizada por centro e linha."
        breadcrumbSubmodule="Previsto x Realizado"
      />
      <EfficiencyModuleView />
    </div>
  )
}
export default EfficiencyPage
