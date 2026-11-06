/**
 * Página: Pedidos em Carteira
 * Módulo: PCP Robotizado > Análise de Carteira (HUB CIAFAL)
 */

import React from 'react'
import { PedidosCarteiraView } from '@/components/carteira-views/PedidosCarteiraView'
import { LocalErrorBoundary } from '@/components/common/LocalErrorBoundary'

export const PedidosCarteiraPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <LocalErrorBoundary>
        <PedidosCarteiraView />
      </LocalErrorBoundary>
    </div>
  )
}

export default PedidosCarteiraPage
