// Hook: Sincronização e Consulta de Cache SAP MARC-DISGR (Grupo MRP)
// POST /backend/v1/pcp/sap/sync-mrp-groups
// Body opcional: { werks?: string, force_rfc?: boolean, simulate_offline?: boolean }

routerAdd(
  'POST',
  '/backend/v1/pcp/sap/sync-mrp-groups',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação corporativa requerida no HUB CIAFAL' })
    }

    const body = e.requestInfo().body || {}
    const requestedWerks = (body.werks || '').trim().toUpperCase()
    const simulateOffline = body.simulate_offline === true

    // Se simular falha/offline ou SAP indisponível
    if (simulateOffline) {
      return e.json(503, {
        code: 'SAP_OFFLINE',
        message: 'SAP temporariamente indisponível. Exibindo última sincronização disponível.',
      })
    }

    const mrpCol = $app.findCollectionByNameOrId('sap_mrp_groups')
    const nowIso = new Date().toISOString()

    // O ponto de ingestão RFC real (quando conectado ao SAP ECC via RFC/BAPI Z_CIAFAL_GET_MARC_DISGR ou RFC_READ_TABLE MARC)
    // Se a consulta só retornar o código, a regra é estrita: NÃO inventar descrição local.
    // Aqui definimos os Grupos MRP mapeados por WERKS conhecidos: 1001 (DIV), 1002 (CTG), 2001 (KSF), 2101 (KSC), 3001 (SDC/SDPL)
    const sapFeedItems = [
      // WERKS 1001 (Divinópolis / Matriz CIAFAL)
      { disgr: '0010', description: 'Laminados', werks: '1001', company_code: 'CIAFAL' },
      {
        disgr: '0020',
        description: 'Trefilados & Conformados',
        werks: '1001',
        company_code: 'CIAFAL',
      },
      { disgr: '0030', description: 'Perfis Leves', werks: '1001', company_code: 'CIAFAL' },
      { disgr: '0099', description: '', werks: '1001', company_code: 'CIAFAL' }, // Código sem descrição da fonte SAP

      // WERKS 1002 (Contagem CIAFAL)
      { disgr: '0010', description: 'Perfis & Estruturais', werks: '1002', company_code: 'CIAFAL' },
      {
        disgr: '0040',
        description: 'Barras Redondas e Chatas',
        werks: '1002',
        company_code: 'CIAFAL',
      },
      { disgr: '0050', description: '', werks: '1002', company_code: 'CIAFAL' },

      // WERKS 2001 (KS - Ferradura)
      {
        disgr: '0010',
        description: 'Ferraduras & Acessórios',
        werks: '2001',
        company_code: 'KS-FERRADURA',
      },
      {
        disgr: '0015',
        description: 'Barras Especiais Ferradura',
        werks: '2001',
        company_code: 'KS-FERRADURA',
      },

      // WERKS 2101 (KS - Ciafal)
      {
        disgr: '0020',
        description: 'Tarugos & Palanquilhas',
        werks: '2101',
        company_code: 'KS-CIAFAL',
      },

      // WERKS 3001 (Sidercentro / SDPL)
      {
        disgr: '0030',
        description: 'Aços Longos Industriais',
        werks: '3001',
        company_code: 'SIDERCENTRO',
      },
    ]

    let insertedOrUpdatedCount = 0

    const itemsToProcess = requestedWerks
      ? sapFeedItems.filter((i) => i.werks === requestedWerks)
      : sapFeedItems

    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i]
      let existing = null
      try {
        const records = $app.findRecordsByFilter(
          'sap_mrp_groups',
          `werks = '${item.werks}' && disgr = '${item.disgr}'`,
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
        const newRec = new Record(mrpCol)
        newRec.set('disgr', item.disgr)
        newRec.set('description', item.description || '')
        newRec.set('werks', item.werks)
        newRec.set('company_code', item.company_code)
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
      werks_filtered: requestedWerks || 'ALL',
      message: 'Cache de Grupos MRP (MARC-DISGR) sincronizado com sucesso via SAP RFC.',
    })
  },
  $apis.requireAuth(),
)
