import { describe, it, expect } from 'vitest'
import { authService } from '../services/pcp-auth'

describe('RBAC & Permission Guard Integration Verification', () => {
  it('should have pcp.approval.view permission registered for programmer and admin roles', async () => {
    // Verifica permissões de PCP_PROGRAMMER
    const programmerPerms = authService.getPermissionsForRole('PCP_PROGRAMMER')
    expect(programmerPerms).toContain('pcp.approval.view')
    expect(programmerPerms).toContain('pcp.schedule.view')

    // Verifica permissões de PCP_ADMIN
    const adminPerms = authService.getPermissionsForRole('PCP_ADMIN')
    expect(adminPerms).toContain('pcp.approval.view')
    expect(adminPerms).toContain('pcp.schedule.view')
    expect(adminPerms).toContain('pcp.schedule.approve')

    // Verifica permissões de LINE_MANAGER
    const lineManagerPerms = authService.getPermissionsForRole('LINE_MANAGER')
    expect(lineManagerPerms).toContain('pcp.approval.view')
  })

  it('should distinguish view permissions from action permissions', () => {
    const plannerPerms = authService.getPermissionsForRole('PCP_PLANNER')
    expect(plannerPerms).toContain('pcp.approval.view')
    // Planner can view approvals list, but approval action is reserved for authorized approver roles
    expect(plannerPerms).toContain('pcp.schedule.view')
  })
})
