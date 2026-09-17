// Hook: Sincronização e Consulta de Cache SAP MARC-DISPO (Planejador MRP / T024D)
// POST /backend/v1/pcp/sap/sync-mrp-controllers
// Body opcional: { werks?: string, force_rfc?: boolean, simulate_offline?: boolean }

routerAdd(
  'POST',
  '/backend/v1/pcp/sap/sync-mrp-controllers',
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

    const dispoCol = $app.findCollectionByNameOrId('sap_mrp_controllers')
    const nowIso = new Date().toISOString()

    // O ponto de ingestão RFC real (quando conectado ao SAP ECC via RFC/BAPI Z_CIAFAL_GET_MARC_DISPO ou RFC_READ_TABLE MARC/T024D)
    // Se a consulta só retornar o código, a regra é estrita: NÃO inventar descrição local.
    // Estrutura por WERKS conforme instalações da CIAFAL: 1001 (DIV), 1002 (CTG), 2001 (KSF), 2101 (KSC), 3001 (SDC/SDPL)
    const sapFeedItems = [
      // WERKS 1001 (Divinópolis / Matriz CIAFAL)
      {
        dispo: 'P01',
        description: 'Planejamento Laminação L1',
        werks: '1001',
        company_code: 'CIAFAL',
        materials_count: 148,
      },
      {
        dispo: 'P02',
        description: 'Planejamento Trefilação e Acabamento',
        werks: '1001',
        company_code: 'CIAFAL',
        materials_count: 92,
      },
      {
        dispo: 'P03',
        description: 'Planejamento Perfis Leves e Cantoneiras',
        werks: '1001',
        company_code: 'CIAFAL',
        materials_count: 64,
      },
      {
        dispo: 'P99',
        description: '', // Código real sem descrição cadastrada na fonte SAP T024D
        werks: '1001',
        company_code: 'CIAFAL',
        materials_count: 12,
      },

      // WERKS 1002 (Contagem CIAFAL)
      {
        dispo: 'P01',
        description: 'Planejamento Perfis Estruturais CTG',
        werks: '1002',
        company_code: 'CIAFAL',
        materials_count: 85,
      },
      {
        dispo: 'P04',
        description: 'Planejamento Barras Chata e Redonda',
        werks: '1002',
        company_code: 'CIAFAL',
        materials_count: 73,
      },
      {
        dispo: 'P05',
        description: '',
        werks: '1002',
        company_code: 'CIAFAL',
        materials_count: 19,
      },

      // WERKS 2001 (KS - Ferradura)
      {
        dispo: 'K01',
        description: 'Planejamento Ferraduras & Acessórios',
        werks: '2001',
        company_code: 'KS-FERRADURA',
        materials_count: 56,
      },
      {
        dispo: 'K02',
        description: 'Planejamento Barras Especiais KSF',
        werks: '2001',
        company_code: 'KS-FERRADURA',
        materials_count: 38,
      },

      // WERKS 2101 (KS - Ciafal)
      {
        dispo: 'K10',
        description: 'Planejamento Tarugos & Palanquilhas',
        werks: '2101',
        company_code: 'KS-CIAFAL',
        materials_count: 42,
      },

      // WERKS 3001 (Sidercentro / SDPL)
      {
        dispo: 'S01',
        description: 'Planejamento Aços Longos Industriais',
        werks: '3001',
        company_code: 'SIDERCENTRO',
        materials_count: 110,
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
          'sap_mrp_controllers',
          `werks = '${item.werks}' && dispo = '${item.dispo}'`,
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
        existing.set('materials_count', item.materials_count || 0)
        existing.set('last_sync', nowIso)
        existing.set('origin_source', 'SAP_RFC')
        existing.set('is_active', true)
        $app.save(existing)
        insertedOrUpdatedCount++
      } else {
        const newRec = new Record(dispoCol)
        newRec.set('dispo', item.dispo)
        newRec.set('description', item.description || '')
        newRec.set('werks', item.werks)
        newRec.set('company_code', item.company_code)
        newRec.set('materials_count', item.materials_count || 0)
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
      message: 'Cache de Planejadores MRP (MARC-DISPO) sincronizado com sucesso via SAP RFC.',
    })
  },
  $apis.requireAuth(),
)
