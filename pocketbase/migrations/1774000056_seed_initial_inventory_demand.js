/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Cria Demanda de Homologação Real INV-2026-000001 se não existir
    const demandsCol = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
    const gaugesCol = app.findCollectionByNameOrId('pcp_mp_inventory_gauges')
    const runsCol = app.findCollectionByNameOrId('pcp_mp_inventory_runs')
    const entriesCol = app.findCollectionByNameOrId('pcp_mp_inventory_entries')
    const auditCol = app.findCollectionByNameOrId('pcp_mp_inventory_audit_events')

    let demandRecord = null
    try {
      demandRecord = app.findFirstRecordByData(
        'pcp_mp_inventory_demands',
        'control_number',
        'INV-2026-000001',
      )
    } catch (_) {}

    if (!demandRecord) {
      demandRecord = new Record(demandsCol)
      demandRecord.set('control_number', 'INV-2026-000001')
      demandRecord.set('company', 'CIAFAL')
      demandRecord.set('line', 'L1')
      demandRecord.set('center', 'FORNOL1')
      demandRecord.set('storage_deposit', 'DP07')
      demandRecord.set('material_code', 'TAR-130-1020')
      demandRecord.set('material_description', 'Tarugo SAE 1020 130mm x 12m')
      demandRecord.set('unit_of_measure', 'pçs')
      demandRecord.set('sap_stock', 80)
      demandRecord.set('sap_last_sync', '27/09/2026 10:00')
      demandRecord.set('sap_query_status', 'SINCRONIZADO')
      demandRecord.set('priority', 'Normal')
      demandRecord.set('status', 'Em inventário')
      demandRecord.set('observation', 'Conferência de lote frio para turno da tarde')
      demandRecord.set('requester_id', 'usr-pcp')
      demandRecord.set('requester_name', 'Lucas Ferreira (PCP)')
      demandRecord.set('requester_role', 'PCP_PROGRAMMER')
      demandRecord.set('generation_date_formatted', '27/09/2026 10:00')
      demandRecord.set('total_pieces_required', 80)
      demandRecord.set('total_pieces_inventoried', 40)
      demandRecord.set('divergence_pieces', -40)
      demandRecord.set('divergence_pct', -50)
      app.save(demandRecord)

      // Gauge
      const gaugeRec = new Record(gaugesCol)
      gaugeRec.set('demand_id', demandRecord.id)
      gaugeRec.set('control_number', 'INV-2026-000001')
      gaugeRec.set('gauge', 'Tarugo 130mm')
      gaugeRec.set('application', 'Laminação L1')
      gaugeRec.set('quantity_required', 80)
      gaugeRec.set('unit_of_measure', 'pçs')
      gaugeRec.set('suggested_run', '458921')
      gaugeRec.set('run_stock', 80)
      app.save(gaugeRec)

      // Run
      const runRec = new Record(runsCol)
      runRec.set('demand_id', demandRecord.id)
      runRec.set('control_number', 'INV-2026-000001')
      runRec.set('run_number', '458921')
      runRec.set('batch_number', 'LOT-458921')
      runRec.set('gauge', 'Tarugo 130mm')
      runRec.set('application', 'Laminação L1')
      runRec.set('sap_stock_pieces', 80)
      runRec.set('suggested_pieces', 80)
      runRec.set('selected_pieces', 80)
      runRec.set('inventoried_pieces', 40)
      app.save(runRec)

      // Entry
      const entryRec = new Record(entriesCol)
      entryRec.set('demand_id', demandRecord.id)
      entryRec.set('run_id', runRec.id)
      entryRec.set('control_number', 'INV-2026-000001')
      entryRec.set('run_number', '458921')
      entryRec.set('gauge', 'Tarugo 130mm')
      entryRec.set('location_wms', 'DP07-RUA02-BL04')
      entryRec.set('pieces_count', 40)
      entryRec.set('entry_date_formatted', '27/09/2026 10:35')
      entryRec.set('user_id', 'usr-op')
      entryRec.set('user_name', 'Roberto Silva (Operação)')
      entryRec.set('user_role', 'PRODUCTION_VIEWER')
      entryRec.set('notes', 'Primeiro lote conferido fisicamente')
      entryRec.set('is_active', true)
      app.save(entryRec)

      // Audit Events (Timeline)
      const auditRec1 = new Record(auditCol)
      auditRec1.set('demand_id', demandRecord.id)
      auditRec1.set('control_number', 'INV-2026-000001')
      auditRec1.set('event_type', 'DEMANDA_GERADA')
      auditRec1.set(
        'event_description',
        'Demanda de inventário INV-2026-000001 gerada com sucesso para material TAR-130-1020 (80 peças previstas).',
      )
      auditRec1.set('run_number', '458921')
      auditRec1.set('location_wms', 'DP07')
      auditRec1.set('pieces_count', 80)
      auditRec1.set('origin', 'USUARIO')
      auditRec1.set('result', 'SUCESSO')
      auditRec1.set('user_id', 'usr-pcp')
      auditRec1.set('user_name', 'Lucas Ferreira (PCP)')
      auditRec1.set('user_role', 'PCP_PROGRAMMER')
      auditRec1.set('event_timestamp_formatted', '27/09/2026 10:00')
      app.save(auditRec1)

      const auditRec2 = new Record(auditCol)
      auditRec2.set('demand_id', demandRecord.id)
      auditRec2.set('control_number', 'INV-2026-000001')
      auditRec2.set('event_type', 'INVENTARIO_INICIADO')
      auditRec2.set(
        'event_description',
        'Inventário da demanda INV-2026-000001 iniciado pelo operador Roberto Silva (Operação).',
      )
      auditRec2.set('user_id', 'usr-op')
      auditRec2.set('user_name', 'Roberto Silva (Operação)')
      auditRec2.set('user_role', 'PRODUCTION_VIEWER')
      auditRec2.set('event_timestamp_formatted', '27/09/2026 10:30')
      app.save(auditRec2)

      const auditRec3 = new Record(auditCol)
      auditRec3.set('demand_id', demandRecord.id)
      auditRec3.set('control_number', 'INV-2026-000001')
      auditRec3.set('event_type', 'LANCAMENTO_ADICIONADO')
      auditRec3.set(
        'event_description',
        'Contagem física de 40 peças na localização DP07-RUA02-BL04 (Corrida: 458921).',
      )
      auditRec3.set('run_number', '458921')
      auditRec3.set('location_wms', 'DP07-RUA02-BL04')
      auditRec3.set('pieces_count', 40)
      auditRec3.set('previous_value', '—')
      auditRec3.set('new_value', '40 pçs')
      auditRec3.set('origin', 'USUARIO')
      auditRec3.set('result', 'SUCESSO')
      auditRec3.set('user_id', 'usr-op')
      auditRec3.set('user_name', 'Roberto Silva (Operação)')
      auditRec3.set('user_role', 'PRODUCTION_VIEWER')
      auditRec3.set('event_timestamp_formatted', '27/09/2026 10:35')
      app.save(auditRec3)
    }
  },
  (app) => {
    // Revert opcional
  },
)
