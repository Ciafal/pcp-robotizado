import React from 'react'
import { ProductionControlTower } from '@/components/control-tower/ProductionControlTower'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

export const SchedulesPage: React.FC = () => {
  return (
    <PermissionGuard permission="pcp.approval.view">
      <ProductionControlTower />
    </PermissionGuard>
  )
}

export default SchedulesPage
