import React from 'react'
import { EfficiencyModuleView } from '@/components/control-tower/EfficiencyModuleView'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'

export const EfficiencyPage: React.FC = () => {
  return (
    <div className="space-y-4 p-3 sm:p-5 lg:p-6 max-w-[1920px] mx-auto text-slate-900 bg-slate-50 min-h-screen">
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
