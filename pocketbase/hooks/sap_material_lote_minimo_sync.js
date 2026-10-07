// Hook: Sincronização Parametrizada do Lote Mínimo SAP por Código de Material
// POST /backend/v1/pcp/sap/sync-material-lote-minimo
// Body: {
//   mapping_config?: { rfc_name?: string, material_code_field?: string, min_lot_field?: string, uom_field?: string },
//   items?: Array<{ codigo_material: string, lote_minimo: number, unidade_medida?: string, descricao_material?: string }>,
//   rfc_execution_id?: string
// }

routerAdd(
  'POST',
  '/backend/v1/pcp/sap/sync-material-lote-minimo',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação requerida no HUB CIAFAL' })
    }

    const body = e.requestInfo().body || {}
    const items = Array.isArray(body.items) ? body.items : []
    const mappingConfig = body.mapping_config || {
      rfc_name: 'Z_RFC_MATERIAL_LOTE_MINIMO',
      material_code_field: 'MATNR',
      min_lot_field: 'BSTMI',
      uom_field: 'MEINS',
    }
    const rfcExecution = body.rfc_execution_id || mappingConfig.rfc_name || 'SAP_RFC_SYNC'
    const nowIso = new Date().toISOString()

    const col = $app.findCollectionByNameOrId('sap_material_lote_minimo')
    const logCol = $app.findCollectionByNameOrId('sap_material_lote_minimo_logs')

    let updatedCount = 0
    let insertedCount = 0

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const matCode = String(it.codigo_material || '')
        .trim()
        .toUpperCase()
      if (!matCode) continue

      const novoLoteMinimo = Number(it.lote_minimo)
      if (isNaN(novoLoteMinimo) || novoLoteMinimo <= 0) continue

      let existing = null
      try {
        const records = $app.findRecordsByFilter(
          'sap_material_lote_minimo',
          `codigo_material = '${matCode}'`,
          '-created',
          1,
          0,
        )
        if (records && records.length > 0) {
          existing = records[0]
        }
      } catch (_) {}

      const valorAnterior = existing ? Number(existing.get('lote_minimo') || 0) : null

      if (existing) {
        existing.set('valor_anterior', valorAnterior)
        existing.set('lote_minimo', novoLoteMinimo)
        if (it.descricao_material) existing.set('descricao_material', it.descricao_material)
        if (it.unidade_medida) existing.set('unidade_medida', it.unidade_medida)
        existing.set('last_sync', nowIso)
        existing.set('rfc_execucao', rfcExecution)
        existing.set('origem', 'SAP / RFC')
        $app.save(existing)
        updatedCount++
      } else {
        const newRec = new Record(col)
        newRec.set('codigo_material', matCode)
        newRec.set('descricao_material', it.descricao_material || '')
        newRec.set('lote_minimo', novoLoteMinimo)
        newRec.set('unidade_medida', it.unidade_medida || 't')
        newRec.set('valor_anterior', null)
        newRec.set('last_sync', nowIso)
        newRec.set('rfc_execucao', rfcExecution)
        newRec.set('origem', 'SAP / RFC')
        $app.save(newRec)
        insertedCount++
      }

      // Gravação imutável de log de auditoria
      try {
        const logRec = new Record(logCol)
        logRec.set('codigo_material', matCode)
        logRec.set('valor_anterior', valorAnterior)
        logRec.set('novo_valor', novoLoteMinimo)
        logRec.set('data_hora', nowIso)
        logRec.set('rfc_execucao', rfcExecution)
        logRec.set('resultado', 'SUCESSO')
        logRec.set('origem', 'Integração SAP RFC')
        logRec.set('payload_snapshot', {
          mapping_config: mappingConfig,
          item_raw: it,
        })
        $app.save(logRec)
      } catch (logErr) {
        // log defensivo sem interromper
      }
    }

    return e.json(200, {
      success: true,
      records_inserted: insertedCount,
      records_updated: updatedCount,
      total_processed: items.length,
      last_sync: nowIso,
      rfc_execucao: rfcExecution,
      origem: 'Integração SAP RFC',
    })
  },
  $apis.requireAuth(),
)
