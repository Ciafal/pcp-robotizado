/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Registra contagem de teste real para a demanda INV-2026-000002 (id: x1i3gqjcnopoblp)
    if (app.hasTable('pcp_mp_inventory_items') && app.hasTable('pcp_mp_inventory_demands')) {
      const itemsCol = app.findCollectionByNameOrId('pcp_mp_inventory_items')
      const demandsCol = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
      const historyCol = app.hasTable('pcp_mp_inventory_history')
        ? app.findCollectionByNameOrId('pcp_mp_inventory_history')
        : null

      const demandRecord = app.findFirstRecordByFilter(
        'pcp_mp_inventory_demands',
        "control_number = 'INV-2026-000002'",
      )

      if (demandRecord) {
        const demandId = demandRecord.id
        const controlNumber = demandRecord.getString('control_number') || 'INV-2026-000002'
        const nowIso = new Date().toISOString()
        const nowFormatted = '30/09/2026 14:00'

        // 1. Cria contagem física em pcp_mp_inventory_items
        const countRecord = new Record(itemsCol)
        countRecord.set('demand_id', demandId)
        countRecord.set('control_number', controlNumber)
        countRecord.set('inventory_id', demandId)
        countRecord.set('inventory_code', controlNumber)
        countRecord.set('item_control_key', `${controlNumber}-COUNT-COR-8821-${Date.now()}`)
        countRecord.set('company', demandRecord.getString('company') || 'CIAFAL')
        countRecord.set('line', demandRecord.getString('line') || 'L1')
        countRecord.set('center', demandRecord.getString('center') || 'FORNO1')
        countRecord.set(
          'production_order',
          demandRecord.getString('production_order') || 'OP-2025-0891',
        )
        countRecord.set('raw_material_code', demandRecord.getString('material_code') || 'ST930')
        countRecord.set(
          'raw_material_description',
          demandRecord.getString('material_description') || 'Tarugo Laminado ST930 130mm',
        )
        countRecord.set('heat_number', 'COR-8821')
        countRecord.set('run_number', 'COR-8821')
        countRecord.set('produced_gauge_product', 'Tarugo 130mm')
        countRecord.set('gauge', 'Tarugo 130mm')
        countRecord.set('enfornamento_type', 'NORMAL')
        countRecord.set('quantity_tons', 0)
        countRecord.set('calculated_pieces', 40)
        countRecord.set('planned_requirement_tons', 0)
        countRecord.set('sap_pieces_count', 0)
        countRecord.set('wms_physical_location', 'DP07-RUA02-BL04')
        countRecord.set('location_wms', 'DP07-RUA02-BL04')
        countRecord.set('dp07_inventoried_pieces', 40)
        countRecord.set('pieces_count', 40)
        countRecord.set('dp07_observation', 'Contagem física inicial registrada via painel DP07')
        countRecord.set('notes', 'Contagem física inicial registrada via painel DP07')
        countRecord.set('pcp_planned_sequence', 1)
        countRecord.set('schedule_version', 1)
        countRecord.set('status', 'Em Inventário')
        countRecord.set('responsible_user', 'Operador DP07')
        countRecord.set('user_id', 'usr-dp07-operator')
        countRecord.set('user_name', 'Operador DP07')
        countRecord.set('user_role', 'OPERADOR_DP07')
        countRecord.set('entry_date_formatted', nowFormatted)
        countRecord.set('updated_at_timestamp', nowIso)
        countRecord.set('is_active', true)
        countRecord.set('is_count_entry', true)

        app.save(countRecord)

        // 2. Registra evento correspondente em pcp_mp_inventory_history
        if (historyCol) {
          const histRecord = new Record(historyCol)
          histRecord.set('demand_id', demandId)
          histRecord.set('inventory_id', demandId)
          histRecord.set('inventory_item_id', countRecord.id)
          histRecord.set('inventory_order_id', demandId)
          histRecord.set('control_number', controlNumber)
          histRecord.set('event_type', 'LANCAMENTO_ADICIONADO')
          histRecord.set('user_name', 'Operador DP07')
          histRecord.set('user_id', 'usr-dp07-operator')
          histRecord.set('user_role', 'OPERADOR_DP07')
          histRecord.set(
            'description',
            `Contagem física de 40 peças registrada na localização DP07-RUA02-BL04 (Corrida: COR-8821) por Operador DP07.`,
          )
          histRecord.set(
            'summary',
            'Contagem física de 40 peças na localização DP07-RUA02-BL04 (Corrida: COR-8821).',
          )
          histRecord.set('new_value', {
            demand_id: demandId,
            control_number: controlNumber,
            inventory_item_id: countRecord.id,
            run_number: 'COR-8821',
            location_wms: 'DP07-RUA02-BL04',
            pieces_count: 40,
            gauge: 'Tarugo 130mm',
            user_id: 'usr-dp07-operator',
            user_name: 'Operador DP07',
            timestamp: nowIso,
          })
          histRecord.set('timestamp', nowIso)

          app.save(histRecord)
        }

        // 3. Atualiza totais na demanda
        demandRecord.set('status', 'Em inventário')
        demandRecord.set('total_pieces_inventoried', 40)
        const req = demandRecord.getInt('total_pieces_required') || 200
        const div = 40 - req
        demandRecord.set('divergence_pieces', div)
        demandRecord.set('divergence_pct', Number(((div / req) * 100).toFixed(2)))
        app.save(demandRecord)
      }
    }
  },
  (app) => {
    // Reversão limpa
    try {
      app
        .db()
        .newQuery(
          "DELETE FROM pcp_mp_inventory_items WHERE item_control_key LIKE 'INV-2026-000002-COUNT-%'",
        )
        .execute()
    } catch (_) {}
  },
)
