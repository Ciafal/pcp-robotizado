/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Corrige os registros de contagem existentes (is_count_entry = true) vinculados a demandas Canceladas
    // No caso da demanda INV-2026-000003 (yqc8b7mx8w8ohgq) e quaisquer outras demandas com status Cancelado:
    // Suas contagens físicas devem ter status = 'Cancelado' e cancelled_reason = motivo do cancelamento da demanda pai.
    try {
      const demands = app.findRecordsByFilter(
        'pcp_mp_inventory_demands',
        "status = 'Cancelado' || status = 'Cancelada'",
        '-created',
        100,
        0,
      )

      for (const demand of demands) {
        const demandId = demand.getString('id')
        const controlNumber = demand.getString('control_number')
        const reason = demand.getString('cancellation_reason') || 'Inventário cancelado'

        let filter = `demand_id = '${demandId}' && is_count_entry = true && status != 'Cancelado'`
        if (controlNumber) {
          filter = `(demand_id = '${demandId}' || control_number = '${controlNumber}') && is_count_entry = true && status != 'Cancelado'`
        }

        const countItems = app.findRecordsByFilter(
          'pcp_mp_inventory_items',
          filter,
          '-created',
          200,
          0,
        )

        for (const item of countItems) {
          item.set('status', 'Cancelado')
          item.set('cancelled_reason', reason)
          app.save(item)
        }
      }
    } catch (err) {
      console.warn(
        'Erro ao atualizar contagens canceladas em 1774000080_sync_cancelled_inventory_items:',
        err,
      )
    }
  },
  (app) => {
    // Reversão
  },
)
