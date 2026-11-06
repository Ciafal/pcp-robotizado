/**
 * Página: Pedidos com Saldos Residuais
 * Módulo: PCP Robotizado > Análise de Carteira (HUB CIAFAL)
 */

import React from 'react'
import { PedidosSaldosResiduaisView } from '@/components/carteira-views/PedidosSaldosResiduaisView'
import { LocalErrorBoundary } from '@/components/common/LocalErrorBoundary'

export const PedidosSaldosResiduaisPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <LocalErrorBoundary>
        <PedidosSaldosResiduaisView />
      </LocalErrorBoundary>
    </div>
  )
}

export default PedidosSaldosResiduaisPage
