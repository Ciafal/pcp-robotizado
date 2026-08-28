import React from 'react'
import { EfficiencyModuleView } from '@/components/control-tower/EfficiencyModuleView'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'

export const EfficiencyLinesSubpage: React.FC = () => {
  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      <ControlTowerHeader
        title="Eficiência por Linha Produtiva"
        subtitle="OEE desagregado, disponibilidade, performance e restrições estruturais de setup por linha."
        breadcrumbSubmodule="Eficiência > Linhas"
      />
      <EfficiencyModuleView initialTab="linhas" />
    </div>
  )
}
export default EfficiencyLinesSubpage
