import { describe, it, expect, beforeAll } from 'vitest'
import { pb } from '@/lib/pocketbase/client'
import { lineMasterService } from '@/services/line-master'

describe('Backend Governança Hierarquia de Linhas e Centros (Etapa 1)', () => {
  let adminAuth = false

  beforeAll(async () => {
    // Autenticar com o usuário seed administrador oficial CIAFAL
    try {
      if (!pb.authStore.isValid) {
        try {
          await pb
            .collection('users')
            .authWithPassword('programador.pcp@ciafal.com.br', 'Skip@Pass')
        } catch (e1) {
          console.warn('Falha ao autenticar programador.pcp:', e1)
          try {
            await pb.collection('users').authWithPassword('admin@pcp.ciafal.com.br', 'Skip@Pass')
          } catch (e2) {
            console.warn('Falha ao autenticar admin:', e2)
          }
        }
      }
      adminAuth = pb.authStore.isValid
      console.log('TEST_POCKETBASE_AUTH_STATE:', {
        isValid: pb.authStore.isValid,
        token: pb.authStore.token ? 'PRESENT' : 'EMPTY',
        user: (pb.authStore.record as any)?.email,
      })
    } catch (err) {
      console.warn('Erro geral de auth:', err)
      adminAuth = pb.authStore.isValid
    }
  })

  it('1. Endpoint /check-center-usage identifica corretamente centro COM histórico (L1 ou ENF_L1)', async () => {
    const res = await lineMasterService.checkCenterUsageOnServer({
      centerCode: 'L1',
    })

    expect(res).toBeDefined()
    expect(res.centerCode).toBe('L1')
    expect(res.hasHistory).toBe(true)
    expect(res.historyCount).toBeGreaterThan(0)
    expect(res.canRemove).toBe(false)
    expect(res.details.length).toBeGreaterThan(0)
    expect(res.message).toContain('Exclusão física não permitida')
  })

  it('2. Endpoint /check-center-usage identifica centro fictício SEM histórico como elegível para remoção', async () => {
    const res = await lineMasterService.checkCenterUsageOnServer({
      centerCode: 'CENTRO_FICTICIO_ZERO_HISTORICO_999',
    })

    expect(res).toBeDefined()
    expect(res.hasHistory).toBe(false)
    expect(res.historyCount).toBe(0)
    expect(res.canRemove).toBe(true)
    expect(res.message).toContain('Remoção do vínculo permitida')
  })

  it('3. Backend rejeita remoção (/remove-center) de centro COM histórico', async () => {
    try {
      await lineMasterService.removeCenterViaHook({
        centerCode: 'L1',
        lineCode: 'L1',
        motivo: 'Tentativa indevida de exclusão com histórico',
      })
      // Se não lançou erro, falha o teste
      expect.unreachable('A API deveria ter rejeitado a remoção com histórico')
    } catch (err: any) {
      expect(err).toBeDefined()
      expect(err.status || err.statusCode || err.response?.status).toBe(400)
      const errMsg = err.data?.error || err.message || ''
      expect(errMsg).toMatch(/Não é permitido remover este Centro|histórico/i)
    }
  })

  it('4. Backend permite desativação (/deactivate-center) e reativação (/reactivate-center) de vínculo com auditoria imutável', async () => {
    // Buscar ou criar uma dependência temporária de teste em line_sequencing_dependencies
    const lines = await pb.collection('production_lines').getFullList({ filter: "code = 'L1'" })
    expect(lines.length).toBeGreaterThan(0)
    const lineL1 = lines[0]

    // Criar uma linha/centro auxiliar de teste sem histórico
    const testCenter = await pb.collection('production_lines').create({
      code: 'CENTRO_TEST_QA_01',
      name: 'Centro Teste Automatizado QA',
      status: 'idle',
      is_active: true,
      target_rate: 100,
      current_rate: 0,
      efficiency: 95,
      shifts_count: 3,
      nominal_capacity: 50,
      capacity_unit: 't/h',
    })

    // Criar vínculo de hierarquia
    const testDep = await pb.collection('line_sequencing_dependencies').create({
      line_id: lineL1.id,
      next_line_id: testCenter.id,
      sequence_order: 99,
      relation_nature: 'MANDATORY',
      dependency_type: 'TRANSFER_BATCH',
      active: true,
      status: 'ATIVO',
      notes: 'Vínculo de teste QA',
    })

    try {
      // 4.1 Desativar Centro na Hierarquia
      const deactRes = await lineMasterService.deactivateCenterInHierarchy({
        lineId: lineL1.id,
        lineCode: lineL1.code,
        centerId: testCenter.id,
        centerCode: testCenter.code,
        centerName: testCenter.name,
        dependencyId: testDep.id,
        motivo: 'Teste automatizado de desativação lógica',
      })

      expect(deactRes.success).toBe(true)
      expect(deactRes.operation).toBe('DESATIVACAO_CENTRO_HIERARQUIA')

      // Verificar persistência no banco
      const updatedDep = await pb.collection('line_sequencing_dependencies').getOne(testDep.id)
      expect(updatedDep.active).toBe(false)
      expect((updatedDep as any).status).toBe('INATIVO')

      const updatedCenter = await pb.collection('production_lines').getOne(testCenter.id)
      expect(updatedCenter.is_active).toBe(false)

      // 4.2 Reativar Centro na Hierarquia
      const reactRes = await lineMasterService.reactivateCenterInHierarchy({
        lineId: lineL1.id,
        lineCode: lineL1.code,
        centerId: testCenter.id,
        centerCode: testCenter.code,
        centerName: testCenter.name,
        dependencyId: testDep.id,
        motivo: 'Teste automatizado de reativação lógica',
      })

      expect(reactRes.success).toBe(true)
      expect(reactRes.operation).toBe('REATIVACAO_CENTRO_HIERARQUIA')

      // Verificar reativação no banco
      const reactivatedDep = await pb.collection('line_sequencing_dependencies').getOne(testDep.id)
      expect(reactivatedDep.active).toBe(true)
      expect((reactivatedDep as any).status).toBe('ATIVO')

      const reactivatedCenter = await pb.collection('production_lines').getOne(testCenter.id)
      expect(reactivatedCenter.is_active).toBe(true)

      // 4.3 Remover vínculo de Centro SEM histórico (deve ter sucesso)
      const removeRes = await lineMasterService.removeCenterViaHook({
        lineId: lineL1.id,
        lineCode: lineL1.code,
        centerId: testCenter.id,
        centerCode: testCenter.code,
        centerName: testCenter.name,
        dependencyId: testDep.id,
        motivo: 'Teste de remoção de centro sem histórico',
      })

      expect(removeRes.success).toBe(true)
      expect(removeRes.operation).toBe('REMOCAO_CENTRO_HIERARQUIA')

      // Conferir exclusão do vínculo
      let depStillExists = true
      try {
        await pb.collection('line_sequencing_dependencies').getOne(testDep.id)
      } catch (_) {
        depStillExists = false
      }
      expect(depStillExists).toBe(false)

      // O cadastro mestre (testCenter) deve CONTINUAR existindo no banco
      const masterStillExists = await pb.collection('production_lines').getOne(testCenter.id)
      expect(masterStillExists.id).toBe(testCenter.id)

      // 4.4 Verificar logs de auditoria em pcp_audit_logs
      const auditRecords = await pb.collection('pcp_audit_logs').getFullList({
        filter: `details.centro_code = '${testCenter.code}'`,
        sort: '-created',
      })

      expect(auditRecords.length).toBeGreaterThanOrEqual(3)
      const actions = auditRecords.map((a: any) => a.action)
      expect(actions).toContain('DESATIVACAO_CENTRO_HIERARQUIA')
      expect(actions).toContain('REATIVACAO_CENTRO_HIERARQUIA')
      expect(actions).toContain('REMOCAO_CENTRO_HIERARQUIA')
    } finally {
      // Limpeza segura da linha/centro de teste
      try {
        await pb.collection('production_lines').delete(testCenter.id)
      } catch {
        /* intentionally ignored */
      }
    }
  })
})
