/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const cols = [
      'pcp_mp_inventory_demands',
      'pcp_mp_inventory_gauges',
      'pcp_mp_inventory_runs',
      'pcp_mp_inventory_entries',
      'pcp_mp_inventory_audit_events',
    ]

    for (let i = 0; i < cols.length; i++) {
      const colName = cols[i]
      if (app.hasTable(colName)) {
        const col = app.findCollectionByNameOrId(colName)
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id != ''"
        col.deleteRule = "@request.auth.id != ''"
        app.save(col)
      }
    }
  },
  (app) => {
    // Revert no-op
  },
)
