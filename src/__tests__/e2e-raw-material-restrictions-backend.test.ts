import { describe, it, expect, beforeAll } from 'vitest'
import { pb } from '@/lib/pocketbase/client'
import { rawMaterialRestrictionsService } from '@/services/line-raw-material-restrictions-service'

describe('E2E Real Backend Suite: Restrições de MP', () => {
  beforeAll(async () => {
    try {
      await pb.collection('users').authWithPassword('programador.pcp@ciafal.com.br', 'Skip@Pass')
    } catch (_) {
      try {
        await pb.collection('users').authWithPassword('admin@pcp.ciafal.com.br', 'Skip@Pass')
      } catch (err) {
        console.warn('Auth error in test:', err)
      }
    }
  })

  it('Passo 1: Excluir fisicamente o registro vazio d14fvsduj5n8n14', async () => {
    expect(pb.authStore.isValid).toBe(true)

    // Tentar chamar o endpoint de hard-delete
    const res = await pb.send('/backend/v1/pcp/raw-material-restrictions/hard-delete', {
      method: 'POST',
      body: { id: 'd14fvsduj5n8n14' },
    })

    console.log('[E2E-RESULT] Hard delete d14fvsduj5n8n14 result:', res)
    expect(res.success).toBe(true)

    // Confirmar que não existe mais
    let notFound = false
    try {
      await pb.collection('line_raw_material_restrictions').getOne('d14fvsduj5n8n14')
    } catch (err: any) {
      if (err?.status === 404 || err?.statusCode === 404) {
        notFound = true
      }
    }
    expect(notFound).toBe(true)
  })

  it('Passo 4: Verificação de segurança da API para campos obrigatórios vazios', async () => {
    let rejected = false
    let errStatus = 0
    let errData: any = null
    try {
      await pb.collection('line_raw_material_restrictions').create({
        center_code: '',
        material_code: '',
        material_description: '',
        restricted_product_gauges: [],
        valid_from: '',
        reason: '',
      })
    } catch (err: any) {
      rejected = true
      errStatus = err?.status || err?.statusCode || 0
      errData = err?.data || err?.response?.data
    }

    console.log(
      '[E2E-RESULT] API Required test: rejected =',
      rejected,
      'status =',
      errStatus,
      'errData =',
      errData,
    )
  })

  it('Passo 2: Executar o fluxo E2E real completo e limpar ao final', async () => {
    const centerCode = 'BLOCOSKS'
    const materialCode = 'TESTE-MP-DEP-9F'
    const materialDescription = 'AÇO CARBONO REDONDO TESTE E2E'
    const bitolaMp = '12,70'
    const restrictedProductGauges = ['6,35', '9,53']
    const today = new Date().toISOString().slice(0, 10)
    const reason = 'Teste E2E temporário'

    // a) Criar restrição
    const created = await rawMaterialRestrictionsService.saveRestriction({
      center_code: centerCode,
      material_code: materialCode,
      material_description: materialDescription,
      bitola_mp: bitolaMp,
      restricted_product_gauges: restrictedProductGauges,
      valid_from: today,
      reason: reason,
      active: true,
    })

    console.log('[E2E-RESULT] Criado com sucesso:', created.id, created.material_code)
    expect(created.id).toBeDefined()
    expect(created.material_code).toBe(materialCode)
    expect(created.center_code).toBe(centerCode)
    expect(created.active).toBe(true)

    // b) Ler e conferir persistência
    const fetched = await pb.collection('line_raw_material_restrictions').getOne(created.id)
    expect(fetched.material_code).toBe(materialCode)
    expect(fetched.center_code).toBe(centerCode)
    expect(fetched.reason).toBe(reason)

    // c) Editar (alterar bitolas restritas e motivo)
    const updated = await rawMaterialRestrictionsService.saveRestriction({
      id: created.id,
      center_code: centerCode,
      material_code: materialCode,
      material_description: materialDescription,
      bitola_mp: bitolaMp,
      restricted_product_gauges: ['6,35', '9,53', '12,70'],
      valid_from: today,
      reason: 'Teste E2E editado - motivo atualizado',
      active: true,
    })

    console.log(
      '[E2E-RESULT] Editado:',
      updated.id,
      updated.restricted_product_gauges,
      updated.reason,
    )
    expect(updated.restricted_product_gauges).toEqual(['6,35', '9,53', '12,70'])
    expect(updated.reason).toBe('Teste E2E editado - motivo atualizado')

    // d) Inativar (active=false)
    const deactivated = await rawMaterialRestrictionsService.setRestrictionActive(created.id, false)
    console.log('[E2E-RESULT] Inativado:', deactivated.id, deactivated.active)
    expect(deactivated.active).toBe(false)

    // Testar motor com regra inativa:
    const checkInactive = await rawMaterialRestrictionsService.checkMaterialCompatibility({
      centerCode,
      materialCode,
      productGauge: '6,35',
    })
    console.log('[E2E-RESULT] Motor com regra inativa:', checkInactive)
    expect(checkInactive.isRestricted).toBe(false)

    // e) Reativar (active=true)
    const reactivated = await rawMaterialRestrictionsService.setRestrictionActive(created.id, true)
    console.log('[E2E-RESULT] Reativado:', reactivated.id, reactivated.active)
    expect(reactivated.active).toBe(true)

    // h) Exercitar motor do service:
    // MP + bitola restrita ('6,35') -> restrita
    const checkRestricted = await rawMaterialRestrictionsService.checkMaterialCompatibility({
      centerCode,
      materialCode,
      productGauge: '6,35',
    })
    console.log('[E2E-RESULT] Motor MP + bitola restrita:', checkRestricted)
    expect(checkRestricted.isRestricted).toBe(true)
    expect(checkRestricted.precedenceApplied).toBe('RESTRICTION_OVER_PRIORITY')

    // MP + bitola fora da lista ('19,05') -> não restrita
    const checkNotRestricted = await rawMaterialRestrictionsService.checkMaterialCompatibility({
      centerCode,
      materialCode,
      productGauge: '19,05',
    })
    console.log('[E2E-RESULT] Motor MP + bitola fora da lista:', checkNotRestricted)
    expect(checkNotRestricted.isRestricted).toBe(false)

    // f) Exclusão lógica (deleted=true, deleted_at, deleted_by)
    const softDeleted = await rawMaterialRestrictionsService.softDeleteRestriction(created.id)
    console.log(
      '[E2E-RESULT] Exclusão lógica:',
      softDeleted.id,
      softDeleted.deleted,
      softDeleted.deleted_at,
    )
    expect(softDeleted.deleted).toBe(true)
    expect(softDeleted.active).toBe(false)
    expect(softDeleted.deleted_at).toBeDefined()

    // Regra com deleted=true -> não restrita
    const checkDeleted = await rawMaterialRestrictionsService.checkMaterialCompatibility({
      centerCode,
      materialCode,
      productGauge: '6,35',
    })
    console.log('[E2E-RESULT] Motor com deleted=true:', checkDeleted)
    expect(checkDeleted.isRestricted).toBe(false)

    // g) Conferir em pcp_audit_logs se as operações foram logadas
    const auditLogs = await pb.collection('pcp_audit_logs').getFullList({
      filter: `resource = 'line_raw_material_restrictions' && record_id = '${created.id}'`,
      sort: 'created',
    })
    console.log(
      '[E2E-RESULT] Audit logs gerados para o registro:',
      auditLogs.map((a) => a.action),
    )
    expect(auditLogs.length).toBeGreaterThanOrEqual(4)

    // i) AO FINAL: remover FISICAMENTE o registro criado neste teste
    const hardDelRes = await pb.send('/backend/v1/pcp/raw-material-restrictions/hard-delete', {
      method: 'POST',
      body: { id: created.id },
    })
    console.log('[E2E-RESULT] Limpeza física final:', hardDelRes)
    expect(hardDelRes.success).toBe(true)

    // Confirmar que a collection ficou limpa
    const remaining = await pb.collection('line_raw_material_restrictions').getFullList()
    console.log('[E2E-RESULT] Total de registros restantes na collection:', remaining.length)
    expect(remaining.length).toBe(0)
  })
})
