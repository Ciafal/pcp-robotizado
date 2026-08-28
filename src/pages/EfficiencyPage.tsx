import React from 'react'
import { EfficiencyModuleView } from '@/components/control-tower/EfficiencyModuleView'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'

export const EfficiencyPage: React.FC = () => {
  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      <ControlTowerHeader
        title="Eficiência Operacional & Assertividade do PCP"
        subtitle="Monitoramento de perdas, aderência por produto, linha, planta e aprendizado contínuo de desvios."
        breadcrumbSubmodule="Eficiência"
      />
      <EfficiencyModuleView />
    </div>
  )
}
export default EfficiencyPage
