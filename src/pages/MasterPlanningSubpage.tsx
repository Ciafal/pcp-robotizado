import React from 'react'
import { MasterPlanningPage } from '@/components/control-tower/MasterPlanningPage'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'

interface MasterPlanningSubpageProps {
  initialHorizon?: 'ANUAL' | 'MENSAL' | 'SEMANAL'
  title?: string
  subtitle?: string
}

export const MasterPlanningSubpage: React.FC<MasterPlanningSubpageProps> = ({
  initialHorizon = 'MENSAL',
  title = 'Planejamento Mestre de Produção (PMP / S&OP)',
  subtitle = 'Visão consolidada de capacidade estratégica, balanceamento de demanda comercial e planos de horizonte.',
}) => {
  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      <ControlTowerHeader
        title={title}
        subtitle={subtitle}
        breadcrumbSubmodule={`Planejamento Mestre > ${initialHorizon}`}
      />
      <MasterPlanningPage initialHorizon={initialHorizon} />
    </div>
  )
}
export default MasterPlanningSubpage
