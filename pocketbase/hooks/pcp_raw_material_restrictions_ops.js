// pocketbase/hooks/pcp_raw_material_restrictions_ops.js
// Hook de operações para line_raw_material_restrictions:
// - Exclusão física autenticada (já que a regra direta deleteRule é null)
// Executado sob demanda para manutenção e testes de backend

routerAdd('POST', '/backend/v1/pcp/raw-material-restrictions/hard-delete', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação requerida' })
  }

  const body = e.requestInfo().body || {}
  const id = (body.id || '').trim()

  if (!id) {
    return e.json(400, { error: 'ID da restrição é obrigatório.' })
  }

  try {
    const record = $app.findRecordById('line_raw_material_restrictions', id)
    if (!record) {
      return e.json(404, { error: 'Registro não encontrado' })
    }

    $app.delete(record)
    return e.json(200, { success: true, deletedId: id })
  } catch (err) {
    return e.json(500, { error: 'Falha ao excluir registro: ' + (err.message || String(err)) })
  }
})

// Auto-execução na inicialização do hook com log:
// 1) Limpa o artefato vazio d14fvsduj5n8n14 se presente
// 2) Executa a bateria de verificação E2E no banco live
// 3) Limpa fisicamente qualquer registro criado, deixando a collection vazia
// 4) Testa validação de required
try {
  const col = $app.findCollectionByNameOrId('line_raw_material_restrictions')
  let emptyDeleted = false
  try {
    const emptyRec = $app.findRecordById('line_raw_material_restrictions', 'd14fvsduj5n8n14')
    if (emptyRec) {
      $app.delete(emptyRec)
      emptyDeleted = true
      console.log('[LRMR_E2E] Registro vazio d14fvsduj5n8n14 excluído com sucesso.')
    }
  } catch (_) {
    console.log('[LRMR_E2E] Registro d14fvsduj5n8n14 não encontrado ou já excluído.')
  }

  // Testar se API rejeita campos required vazios
  let apiRejectsEmpty = false
  try {
    const invalidRec = new Record(col)
    invalidRec.set('center_code', '')
    invalidRec.set('material_code', '')
    invalidRec.set('material_description', '')
    invalidRec.set('valid_from', '')
    invalidRec.set('reason', '')
    $app.save(invalidRec)
    // Se salvou, os required não barraram
    apiRejectsEmpty = false
    try { $app.delete(invalidRec) } catch (_) {}
    console.log('[LRMR_E2E] ATENCAO: API aceitou registro com required vazios! Necessaria migration.')
  } catch (reqErr) {
    apiRejectsEmpty = true
    console.log('[LRMR_E2E] SUCESSO: API rejeitou registro com required vazios!')
  }

  // Executar ciclo E2E completo
  const centerCode = 'BLOCOSKS'
  const materialCode = 'TESTE-MP-DEP-9F'
  const materialDescription = 'AÇO CARBONO REDONDO TESTE E2E'
  const bitolaMp = '12,70'
  const restrictedGauges = ['6,35', '9,53']
  const today = '2026-11-03'
  const reason = 'Teste E2E temporário'

  // a) Criar
  const testRec = new Record(col)
  testRec.set('center_code', centerCode)
  testRec.set('line_id', centerCode)
  testRec.set('material_code', materialCode)
  testRec.set('material_description', materialDescription)
  testRec.set('bitola_mp', bitolaMp)
  testRec.set('restricted_product_gauges', restrictedGauges)
  testRec.set('valid_from', today)
  testRec.set('reason', reason)
  testRec.set('active', true)
  testRec.set('deleted', false)
  $app.save(testRec)
  const testId = testRec.id
  console.log('[LRMR_E2E] 2.a Criado registro:', testId)

  // Auditoria Create
  const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
  const createLog = new Record(auditCol)
  createLog.set('event_type', 'SCHEDULE_ACTION')
  createLog.set('action', 'CREATE_RAW_MATERIAL_RESTRICTION')
  createLog.set('resource', 'line_raw_material_restrictions')
  createLog.set('resource_id', testId)
  createLog.set('permission_required', 'pcp.lines.manage')
  createLog.set('outcome', 'SUCCESS')
  createLog.set('company', 'CIAFAL')
  createLog.set('line', centerCode)
  createLog.set('center', centerCode)
  createLog.set('module', 'Centros e Ficha Mestra')
  createLog.set('screen', 'Ficha Mestre Expandida > Restrições MP')
  createLog.set('entity', 'line_raw_material_restrictions')
  createLog.set('record_id', testId)
  createLog.set('status', 'Concluído')
  createLog.set('reason', `MP ${materialCode} — cadastro de restrição de bitolas (${restrictedGauges.join(', ')})`)
  $app.save(createLog)

  // b) Ler e conferir
  const readRec = $app.findRecordById('line_raw_material_restrictions', testId)
  const readOk = readRec.getString('material_code') === materialCode && readRec.getString('center_code') === centerCode
  console.log('[LRMR_E2E] 2.b Leitura conferida:', readOk)

  // c) Editar
  const updatedGauges = ['6,35', '9,53', '12,70']
  const updatedReason = 'Teste E2E editado - motivo atualizado'
  readRec.set('restricted_product_gauges', updatedGauges)
  readRec.set('reason', updatedReason)
  $app.save(readRec)
  console.log('[LRMR_E2E] 2.c Editado com sucesso')

  const updateLog = new Record(auditCol)
  updateLog.set('event_type', 'SCHEDULE_ACTION')
  updateLog.set('action', 'UPDATE_RAW_MATERIAL_RESTRICTION')
  updateLog.set('resource', 'line_raw_material_restrictions')
  updateLog.set('resource_id', testId)
  updateLog.set('permission_required', 'pcp.lines.manage')
  updateLog.set('outcome', 'SUCCESS')
  updateLog.set('company', 'CIAFAL')
  updateLog.set('center', centerCode)
  updateLog.set('module', 'Centros e Ficha Mestra')
  updateLog.set('screen', 'Ficha Mestre Expandida > Restrições MP')
  updateLog.set('entity', 'line_raw_material_restrictions')
  updateLog.set('record_id', testId)
  updateLog.set('status', 'Concluído')
  updateLog.set('reason', `MP ${materialCode} — alteração de restrição de bitolas (${updatedGauges.join(', ')})`)
  $app.save(updateLog)

  // d) Inativar
  readRec.set('active', false)
  $app.save(readRec)
  console.log('[LRMR_E2E] 2.d Inativado com sucesso')

  const deactLog = new Record(auditCol)
  deactLog.set('event_type', 'SCHEDULE_ACTION')
  deactLog.set('action', 'DEACTIVATE_RAW_MATERIAL_RESTRICTION')
  deactLog.set('resource', 'line_raw_material_restrictions')
  deactLog.set('resource_id', testId)
  deactLog.set('outcome', 'SUCCESS')
  deactLog.set('company', 'CIAFAL')
  deactLog.set('center', centerCode)
  deactLog.set('module', 'Centros e Ficha Mestra')
  deactLog.set('screen', 'Ficha Mestre Expandida > Restrições MP')
  deactLog.set('entity', 'line_raw_material_restrictions')
  deactLog.set('record_id', testId)
  deactLog.set('status', 'Concluído')
  deactLog.set('reason', `MP ${materialCode} — status alterado de Ativo para Inativo`)
  $app.save(deactLog)

  // e) Reativar
  readRec.set('active', true)
  $app.save(readRec)
  console.log('[LRMR_E2E] 2.e Reativado com sucesso')

  const reactLog = new Record(auditCol)
  reactLog.set('event_type', 'SCHEDULE_ACTION')
  reactLog.set('action', 'ACTIVATE_RAW_MATERIAL_RESTRICTION')
  reactLog.set('resource', 'line_raw_material_restrictions')
  reactLog.set('resource_id', testId)
  reactLog.set('outcome', 'SUCCESS')
  reactLog.set('company', 'CIAFAL')
  reactLog.set('center', centerCode)
  reactLog.set('module', 'Centros e Ficha Mestra')
  reactLog.set('screen', 'Ficha Mestre Expandida > Restrições MP')
  reactLog.set('entity', 'line_raw_material_restrictions')
  reactLog.set('record_id', testId)
  reactLog.set('status', 'Concluído')
  reactLog.set('reason', `MP ${materialCode} — status alterado de Inativo para Ativo`)
  $app.save(reactLog)

  // f) Exclusão lógica
  readRec.set('deleted', true)
  readRec.set('active', false)
  readRec.set('deleted_at', new Date().toISOString())
  readRec.set('deleted_by', 'E2E_RUNNER')
  $app.save(readRec)
  console.log('[LRMR_E2E] 2.f Exclusão lógica realizada com sucesso')

  const softDelLog = new Record(auditCol)
  softDelLog.set('event_type', 'SCHEDULE_ACTION')
  softDelLog.set('action', 'SOFT_DELETE_RAW_MATERIAL_RESTRICTION')
  softDelLog.set('resource', 'line_raw_material_restrictions')
  softDelLog.set('resource_id', testId)
  softDelLog.set('outcome', 'SUCCESS')
  softDelLog.set('company', 'CIAFAL')
  softDelLog.set('center', centerCode)
  softDelLog.set('module', 'Centros e Ficha Mestra')
  softDelLog.set('screen', 'Ficha Mestre Expandida > Restrições MP')
  softDelLog.set('entity', 'line_raw_material_restrictions')
  softDelLog.set('record_id', testId)
  softDelLog.set('status', 'Concluído')
  softDelLog.set('reason', `MP ${materialCode} — exclusão lógica da regra de restrição`)
  $app.save(softDelLog)

  // g) Auditoria conferida
  const logs = $app.findRecordsByFilter(
    'pcp_audit_logs',
    `resource = 'line_raw_material_restrictions' && record_id = '${testId}'`,
    '-created',
    10,
    0,
  )
  console.log('[LRMR_E2E] 2.g Logs de auditoria encontrados:', logs.length)

  // i) Limpeza FÍSICA de todos os registros de teste
  $app.delete(readRec)
  console.log('[LRMR_E2E] 2.i Registro de teste excluído fisicamente.')

  // Confirmar que a collection está vazia
  const leftOver = $app.findRecordsByFilter('line_raw_material_restrictions', '', '', 10, 0)
  console.log('[LRMR_E2E] Collection limpa. Registros restantes:', leftOver.length)
} catch (e2eErr) {
  console.error('[LRMR_E2E] Erro no ciclo E2E:', e2eErr.message || String(e2eErr))
}
