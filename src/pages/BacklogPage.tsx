import React from 'react'
import { BacklogModuleView } from '@/components/control-tower/BacklogModuleView'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'

export const BacklogPage: React.FC = () => {
  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      <ControlTowerHeader
        title="Carteira de Pedidos, Rentabilidade & Estoque WMS"
        subtitle="Integração comercial CRM ↔ PCP ↔ WMS: análise de margem, cobertura física e saldo projetado."
        breadcrumbSubmodule="Carteira de Pedidos"
      />
      <BacklogModuleView />
    </div>
  )
}
export default BacklogPage
