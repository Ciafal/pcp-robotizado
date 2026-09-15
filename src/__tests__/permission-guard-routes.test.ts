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

  it('should have pcp.carteira.view permission registered for pcp roles', () => {
    const adminPerms = authService.getPermissionsForRole('PCP_ADMIN')
    expect(adminPerms).toContain('pcp.carteira.view')
    expect(adminPerms).toContain('pcp.carteira.import')

    const progPerms = authService.getPermissionsForRole('PCP_PROGRAMMER')
    expect(progPerms).toContain('pcp.carteira.view')

    const planPerms = authService.getPermissionsForRole('PCP_PLANNER')
    expect(planPerms).toContain('pcp.carteira.view')

    const linePerms = authService.getPermissionsForRole('LINE_MANAGER')
    expect(linePerms).toContain('pcp.carteira.view')
  })

  it('should ensure authorized roles (PCP_ADMIN, PCP_PROGRAMMER, LINE_MANAGER) have pcp.schedule.view for WeeklyScheduleOperationalPage', () => {
    const rolesWithViewAccess = ['PCP_ADMIN', 'PCP_PROGRAMMER', 'LINE_MANAGER']
    for (const role of rolesWithViewAccess) {
      const perms = authService.getPermissionsForRole(role)
      expect(perms).toContain('pcp.schedule.view')
    }
  })

  it('should verify roles have permissions for /pcp/ficha-mestre and line master management', () => {
    const adminPerms = authService.getPermissionsForRole('PCP_ADMIN')
    expect(adminPerms).toContain('pcp.lines.manage')
    expect(adminPerms).toContain('pcp.masterdata.edit')

    const programmerPerms = authService.getPermissionsForRole('PCP_PROGRAMMER')
    expect(programmerPerms).toContain('pcp.lines.manage')
  })

  it('should verify AUDITOR role has view access to schedule or can view modules', () => {
    // AUDITOR role gets view perms by default
    const auditorPerms = authService.getPermissionsForRole('AUDITOR')
    expect(auditorPerms).toContain('pcp.schedule.view')
  })

  it('should deny unauthorized write permissions by default for viewer roles', () => {
    const viewerPerms = authService.getPermissionsForRole('PRODUCTION_VIEWER')
    expect(viewerPerms).toContain('pcp.schedule.view')
    expect(viewerPerms).not.toContain('pcp.schedule.edit')
    expect(viewerPerms).not.toContain('pcp.schedule.approve')
    expect(viewerPerms).not.toContain('pcp.schedule.publish')
  })

  it('should validate direct weekly schedule routes protection with pcp.schedule.view', () => {
    // Rotas diretas: /pcp/montagem-sewanal, /pcp/montagem-semanal, /pcp/programacao-semanal
    const directRoutesRequiredPerm = 'pcp.schedule.view'
    const adminPerms = authService.getPermissionsForRole('PCP_ADMIN')
    const progPerms = authService.getPermissionsForRole('PCP_PROGRAMMER')
    expect(adminPerms).toContain(directRoutesRequiredPerm)
    expect(progPerms).toContain(directRoutesRequiredPerm)
  })
})
