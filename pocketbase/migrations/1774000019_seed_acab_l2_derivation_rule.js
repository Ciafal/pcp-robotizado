migrate(
  (app) => {
    // 1. Atualizar production_lines para ACAB_L2 ter is_derived = true
    try {
      const acabRecord = app.findFirstRecordByData('production_lines', 'code', 'ACAB_L2')
      if (acabRecord) {
        acabRecord.set('is_derived', true)
        app.save(acabRecord)
      }
    } catch (e) {
      console.log('Aviso ao atualizar is_derived em ACAB_L2:', e)
    }

    // 2. Garantir regra canônica de derivação: ACAB_L2 deriva de L2
    try {
      const pcdCol = app.findCollectionByNameOrId('pcp_center_derivations')
      let existingRule = null
      try {
        existingRule = app.findFirstRecordByData('pcp_center_derivations', 'center_code', 'ACAB_L2')
      } catch (_) {}

      if (!existingRule) {
        let acabId = null
        let l2Id = null
        try {
          const acab = app.findFirstRecordByData('production_lines', 'code', 'ACAB_L2')
          acabId = acab.id
        } catch (_) {}
        try {
          const l2 = app.findFirstRecordByData('production_lines', 'code', 'L2')
          l2Id = l2.id
        } catch (_) {}

        const rec = new Record(pcdCol)
        rec.set('center_code', 'ACAB_L2')
        if (acabId) rec.set('center_id', acabId)
        rec.set('source_center_code', 'L2')
        if (l2Id) rec.set('source_center_id', l2Id)
        rec.set('source_center_name', 'Laminador 2')
        rec.set('source_center_sap', 'LAML2')
        rec.set('source_center_company', 'CIAFAL')
        rec.set('source_center_line', 'L2')
        rec.set('matkl_groups', [
          { matkl: '001', description: 'Tubos Industriais Redondos Soldados HF' },
          { matkl: '002', description: 'Tubos Estruturais Quadrados e Retangulares' },
          { matkl: '015', description: 'Perfis U e Vigas I Laminadas Médias' },
        ])
        rec.set('start_date', '2026-01-01 00:00:00.000Z')
        rec.set('end_date', null)
        rec.set('status', 'Ativa')
        rec.set('deleted', false)
        rec.set('created_by', 'Engenharia PCP')
        rec.set('updated_by', 'Engenharia PCP')
        app.save(rec)
      }
    } catch (e) {
      console.log('Aviso ao criar regra canônica de derivação para ACAB_L2:', e)
    }
  },
  (app) => {
    try {
      const existingRule = app.findFirstRecordByData(
        'pcp_center_derivations',
        'center_code',
        'ACAB_L2',
      )
      if (existingRule) {
        app.delete(existingRule)
      }
    } catch (_) {}
  },
)
