migrate(
  (app) => {
    try {
      app
        .db()
        .newQuery("DELETE FROM pcp_mp_inventory_demands WHERE control_number = 'INV-2026-000001'")
        .execute()
    } catch (err) {
      console.warn('Erro ao remover INV-2026-000001 de pcp_mp_inventory_demands:', err)
    }
    try {
      app
        .db()
        .newQuery(
          "DELETE FROM pcp_mp_inventory_items WHERE control_number = 'INV-2026-000001' OR inventory_code = 'INV-2026-000001'",
        )
        .execute()
    } catch (err) {
      console.warn('Erro ao remover INV-2026-000001 de pcp_mp_inventory_items:', err)
    }
    try {
      app
        .db()
        .newQuery("DELETE FROM pcp_mp_inventory_entries WHERE control_number = 'INV-2026-000001'")
        .execute()
    } catch (err) {
      console.warn('Erro ao remover INV-2026-000001 de pcp_mp_inventory_entries:', err)
    }
    try {
      app
        .db()
        .newQuery(
          "DELETE FROM pcp_mp_inventory_history WHERE new_value LIKE '%INV-2026-000001%' OR description LIKE '%INV-2026-000001%'",
        )
        .execute()
    } catch (err) {
      console.warn('Erro ao remover INV-2026-000001 de pcp_mp_inventory_history:', err)
    }
    try {
      app
        .db()
        .newQuery(
          "DELETE FROM pcp_mp_inventory_audit_events WHERE control_number = 'INV-2026-000001'",
        )
        .execute()
    } catch (err) {
      console.warn('Erro ao remover INV-2026-000001 de pcp_mp_inventory_audit_events:', err)
    }
  },
  (app) => {
    // down: no-op (seed fictício removido)
  },
)
