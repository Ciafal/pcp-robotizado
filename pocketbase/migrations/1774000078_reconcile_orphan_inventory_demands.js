/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Reconciliação de integridade referencial:
    // Garante que cabeçalhos prévios existam em pcp_mp_inventory_demands
    // para itens órfãos com control_number INV-2026-000003 e INV-2026-000005.
    if (!app.hasTable('pcp_mp_inventory_demands')) {
      return
    }

    const demandsCol = app.findCollectionByNameOrId('pcp_mp_inventory_demands')

    // 1. Reconciliar INV-2026-000003 se não existir
    try {
      const existing3 = app.findFirstRecordByFilter(
        'pcp_mp_inventory_demands',
        "control_number = 'INV-2026-000003'",
      )
      if (!existing3) {
        const rec3 = new Record(demandsCol)
        rec3.set('control_number', 'INV-2026-000003')
        rec3.set('company', 'CIAFAL')
        rec3.set('line', 'ENF_L1')
        rec3.set('center', 'FORNO1')
        rec3.set('storage_deposit', 'DP07')
        rec3.set('production_order', '4500012338')
        rec3.set('priority', 'Normal')
        rec3.set('status', 'Aberto')
        rec3.set('requester_name', 'Planejador PCP')
        rec3.set('cycle_count', 1)
        rec3.set('total_pieces_required', 0)
        rec3.set('total_pieces_inventoried', 0)
        rec3.set('divergence_pieces', 0)
        rec3.set('divergence_pct', 0)
        rec3.set('materials_summary', [])
        app.save(rec3)

        // Se houver itens apontando para outro ID, atualiza para o ID novo
        if (app.hasTable('pcp_mp_inventory_items')) {
          app
            .db()
            .newQuery(
              "UPDATE pcp_mp_inventory_items SET demand_id = {:demandId} WHERE control_number = 'INV-2026-000003'",
            )
            .bind({ demandId: rec3.id })
            .execute()
        }
      }
    } catch (_) {}

    // 2. Reconciliar INV-2026-000005 se não existir
    try {
      const existing5 = app.findFirstRecordByFilter(
        'pcp_mp_inventory_demands',
        "control_number = 'INV-2026-000005'",
      )
      if (!existing5) {
        const rec5 = new Record(demandsCol)
        rec5.set('control_number', 'INV-2026-000005')
        rec5.set('company', 'CIAFAL')
        rec5.set('line', 'ENF_L1')
        rec5.set('center', 'FORNO1')
        rec5.set('storage_deposit', 'DP07')
        rec5.set('production_order', '4500012338')
        rec5.set('priority', 'Alta')
        rec5.set('status', 'Aberto')
        rec5.set('requester_name', 'Planejador PCP')
        rec5.set('cycle_count', 1)
        rec5.set('total_pieces_required', 0)
        rec5.set('total_pieces_inventoried', 0)
        rec5.set('divergence_pieces', 0)
        rec5.set('divergence_pct', 0)
        rec5.set('materials_summary', [])
        app.save(rec5)

        if (app.hasTable('pcp_mp_inventory_items')) {
          app
            .db()
            .newQuery(
              "UPDATE pcp_mp_inventory_items SET demand_id = {:demandId} WHERE control_number = 'INV-2026-000005'",
            )
            .bind({ demandId: rec5.id })
            .execute()
        }
      }
    } catch (_) {}
  },
  (_) => {
    // Sem ação de rollback destrutiva necessária
  },
)
