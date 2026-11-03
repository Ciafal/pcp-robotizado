// pocketbase/hooks/pcp_raw_material_restrictions_ops.js
// Hook de operações para line_raw_material_restrictions:
// - Exclusão física autenticada (já que a regra direta deleteRule é restrita)
// Executado sob demanda para manutenção autorizada

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
