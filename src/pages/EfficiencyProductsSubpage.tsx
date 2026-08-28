import React from 'react'
import { EfficiencyModuleView } from '@/components/control-tower/EfficiencyModuleView'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'

export const EfficiencyProductsSubpage: React.FC = () => {
  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      <ControlTowerHeader
        title="Eficiência por Produto"
        subtitle="Monitoramento detalhado de ritmo por produto, faixas mínimas, esperadas e alertas preventivos."
        breadcrumbSubmodule="Eficiência > Produtos"
      />
      <EfficiencyModuleView initialTab="produtos" />
    </div>
  )
}
export default EfficiencyProductsSubpage
