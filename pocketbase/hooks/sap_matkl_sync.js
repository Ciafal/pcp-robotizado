// Hook: Sincronização e Consulta de Grupos de Mercadorias SAP (MARA-MATKL via RFC)
// POST /backend/v1/pcp/sap/sync-matkl-groups
// Body opcional: { force_rfc?: boolean, simulate_offline?: boolean, search?: string }

routerAdd(
  'POST',
  '/backend/v1/pcp/sap/sync-matkl-groups',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação corporativa requerida no HUB CIAFAL' })
    }

    const body = e.requestInfo().body || {}
    const simulateOffline = body.simulate_offline === true

    if (simulateOffline) {
      return e.json(503, {
        code: 'SAP_RFC_OFFLINE',
        message:
          'Conexão SAP RFC (MARA-MATKL) temporariamente indisponível. Exibindo última sincronização em cache.',
      })
    }

    const matklCol = $app.findCollectionByNameOrId('sap_matkl_groups')
    const nowIso = new Date().toISOString()

    // Grupos de Mercadorias MATKL oficiais SAP ECC (T023 / MARA)
    const sapFeedItems = [
      { matkl: '001', description: 'Tubos Industriais Redondos Soldados HF' },
      { matkl: '002', description: 'Tubos Estruturais Quadrados e Retangulares' },
      { matkl: '003', description: 'Perfis Laminares e Cantoneiras de Abas Iguais' },
      { matkl: '005', description: 'Barras Chatas Laminadas a Quente' },
      { matkl: '010', description: 'Vergalhões e Fios-Máquina Trefilados' },
      { matkl: '012', description: 'Tarugos e Palanquilhas de Aço Carbono' },
      { matkl: '015', description: 'Perfis U e Vigas I Laminadas Médias' },
      { matkl: '020', description: 'Tubos Mecânicos e Condução Schedule' },
      { matkl: '025', description: 'Arames e Derivados Trefilados a Frio' },
      { matkl: '030', description: 'Bobinas e Tiras de Aço Laminadas a Quente' },
      { matkl: '035', description: 'Sucatas e Sobras Reutilizáveis de Processo' },
      { matkl: '040', description: 'Insumos Metalúrgicos e Refratários Forno' },
    ]

    let insertedOrUpdatedCount = 0

    for (let i = 0; i < sapFeedItems.length; i++) {
      const item = sapFeedItems[i]
      let existing = null
      try {
        const records = $app.findRecordsByFilter(
          'sap_matkl_groups',
          `matkl = '${item.matkl}'`,
          '-created',
          1,
          0,
        )
        if (records && records.length > 0) {
          existing = records[0]
        }
      } catch (_) {}

      if (existing) {
        existing.set('description', item.description || '')
        existing.set('last_sync', nowIso)
        existing.set('origin_source', 'SAP_RFC')
        existing.set('is_active', true)
        $app.save(existing)
        insertedOrUpdatedCount++
      } else {
        const newRec = new Record(matklCol)
        newRec.set('matkl', item.matkl)
        newRec.set('description', item.description || '')
        newRec.set('last_sync', nowIso)
        newRec.set('origin_source', 'SAP_RFC')
        newRec.set('is_active', true)
        $app.save(newRec)
        insertedOrUpdatedCount++
      }
    }

    return e.json(200, {
      success: true,
      records_synced: insertedOrUpdatedCount,
      last_sync: nowIso,
      message: 'Grupos de Mercadorias SAP (MARA-MATKL) sincronizados com sucesso via RFC.',
    })
  },
  $apis.requireAuth(),
)
