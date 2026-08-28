import React from 'react'
import { EfficiencyModuleView } from '@/components/control-tower/EfficiencyModuleView'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'

export const EfficiencyAssertivenessSubpage: React.FC = () => {
  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      <ControlTowerHeader
        title="Assertividade da Programação PCP"
        subtitle="Métrica de confiabilidade, divergência entre planejado e realizado e taxonomia de causas com IA."
        breadcrumbSubmodule="Eficiência > Assertividade"
      />
      <EfficiencyModuleView initialTab="assertividade" />
    </div>
  )
}
export default EfficiencyAssertivenessSubpage
