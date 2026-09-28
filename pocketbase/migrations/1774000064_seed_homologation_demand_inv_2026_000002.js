migrate(
  (app) => {
    // Verifica se já existe demanda para CIAFAL / L1 / FORNO1 / DP07
    try {
      const existing = app.findFirstRecordByData(
        'pcp_mp_inventory_demands',
        'control_number',
        'INV-2026-000002',
      )
      if (existing) {
        return // Já seeded
      }
    } catch (_) {
      // prossegue com o seed
    }

    const demandsCol = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
    const itemsCol = app.findCollectionByNameOrId('pcp_mp_inventory_items')
    const historyCol = app.findCollectionByNameOrId('pcp_mp_inventory_history')

    const demandRecord = new Record(demandsCol)
    demandRecord.set('control_number', 'INV-2026-000002')
    demandRecord.set('company', 'CIAFAL')
    demandRecord.set('line', 'L1')
    demandRecord.set('center', 'FORNO1')
    demandRecord.set('storage_deposit', 'DP07')
    demandRecord.set('production_order', 'OP-2025-0891')
    demandRecord.set('material_code', 'ST930')
    demandRecord.set('material_description', 'Tarugo Laminado ST930 130mm')
    demandRecord.set('unit_of_measure', 'pçs')
    demandRecord.set('sap_stock', 200)
    demandRecord.set('sap_last_sync', '28/09/2026 14:00')
    demandRecord.set('sap_query_status', 'SINCRONIZADO')
    demandRecord.set('priority', 'Normal')
    demandRecord.set('status', 'Gerada')
    demandRecord.set('gauge', '50x50 mm')
    demandRecord.set('application', 'Tubo Industrial Quadrado')
    demandRecord.set('observation', 'Homologação oficial A–F CIAFAL L1 FORNO1 DP07')
    demandRecord.set('requester_id', 'usr-pcp')
    demandRecord.set('requester_name', 'Programador PCP')
    demandRecord.set('requester_role', 'PCP_PROGRAMMER')
    demandRecord.set('generation_date_formatted', '28/09/2026 14:00')
    demandRecord.set('total_pieces_required', 200)
    demandRecord.set('total_pieces_inventoried', 0)
    demandRecord.set('divergence_pieces', -200)
    demandRecord.set('divergence_pct', -100)
    demandRecord.set('materials_summary', [
      {
        material_code: 'ST930',
        material_description: 'Tarugo Laminado ST930 130mm',
        heat_number: 'COR-8821',
        quantity_tons: 24,
        calculated_pieces: 200,
        unit_weight_t: 0.12,
        unit_weight_kg: 120,
        weight_origin: 'LOCAL_CADASTRO',
      },
    ])

    app.save(demandRecord)

    // Cria item em pcp_mp_inventory_items
    const itemRecord = new Record(itemsCol)
    itemRecord.set('demand_id', demandRecord.id)
    itemRecord.set('control_number', 'INV-2026-000002')
    itemRecord.set('inventory_id', demandRecord.id)
    itemRecord.set('inventory_code', 'INV-2026-000002')
    itemRecord.set('item_control_key', 'INV-2026-000002-ST930-COR-8821')
    itemRecord.set('company', 'CIAFAL')
    itemRecord.set('line', 'L1')
    itemRecord.set('center', 'FORNO1')
    itemRecord.set('storage_deposit', 'DP07')
    itemRecord.set('production_order', 'OP-2025-0891')
    itemRecord.set('raw_material_code', 'ST930')
    itemRecord.set('raw_material_description', 'Tarugo Laminado ST930 130mm')
    itemRecord.set('heat_number', 'COR-8821')
    itemRecord.set('produced_gauge_product', '50x50 mm')
    itemRecord.set('enfornamento_type', 'NORMAL')
    itemRecord.set('quantity_tons', 24)
    itemRecord.set('unit_weight_t', 0.12)
    itemRecord.set('unit_weight_kg', 120)
    itemRecord.set('weight_origin', 'LOCAL_CADASTRO')
    itemRecord.set('calculated_pieces', 200)
    itemRecord.set('planned_requirement_tons', 24)
    itemRecord.set('sap_pieces_count', 200)
    itemRecord.set('wms_physical_location', 'DP07')
    itemRecord.set('pcp_planned_sequence', 1)
    itemRecord.set('schedule_version', 1)
    itemRecord.set('status', 'Aguardando Inventário')

    app.save(itemRecord)

    // Registra histórico de auditoria inicial
    try {
      const histRecord = new Record(historyCol)
      histRecord.set('inventory_id', demandRecord.id)
      histRecord.set('event_type', 'DEMANDA_GERADA')
      histRecord.set('user_name', 'Programador PCP')
      histRecord.set('user_id', 'usr-pcp')
      histRecord.set('timestamp', new Date().toISOString())
      histRecord.set(
        'description',
        'Demanda INV-2026-000002 gerada com sucesso para OP OP-2025-0891. Materiais: [ST930 (Corrida: COR-8821, 24 t / 200 pçs)].',
      )
      histRecord.set('new_value', {
        control_number: 'INV-2026-000002',
        company: 'CIAFAL',
        line: 'L1',
        center: 'FORNO1',
        storage_deposit: 'DP07',
        production_order: 'OP-2025-0891',
        priority: 'Normal',
        materials: [
          {
            material_code: 'ST930',
            heat_number: 'COR-8821',
            quantity_tons: 24,
            calculated_pieces: 200,
          },
        ],
      })
      app.save(histRecord)
    } catch (_) {
      // auditoria opcional
    }
  },
  (app) => {
    try {
      const demand = app.findFirstRecordByData(
        'pcp_mp_inventory_demands',
        'control_number',
        'INV-2026-000002',
      )
      if (demand) {
        // Remove itens vinculados
        try {
          const items = app.findRecordsByFilter(
            'pcp_mp_inventory_items',
            `control_number = 'INV-2026-000002'`,
          )
          for (const it of items) {
            app.delete(it)
          }
        } catch (_) {}
        app.delete(demand)
      }
    } catch (_) {}
  },
)
