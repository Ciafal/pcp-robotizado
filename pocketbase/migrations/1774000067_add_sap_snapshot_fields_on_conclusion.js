migrate(
  (app) => {
    // Migration idempotente para campos de snapshot SAP na conclusão
    // Tabela: pcp_mp_inventory_demands
    if (app.hasTable('pcp_mp_inventory_demands')) {
      const demandsCol = app.findCollectionByNameOrId('pcp_mp_inventory_demands')

      // 1. sap_snapshot_balance: saldo oficial do SAP congelado na conclusão
      if (!demandsCol.fields.getByName('sap_snapshot_balance')) {
        demandsCol.fields.add(
          new NumberField({
            name: 'sap_snapshot_balance',
            required: false,
          }),
        )
      }

      // 2. sap_snapshot_at: data/hora do snapshot SAP no encerramento (dd/mm/aaaa, HH:mm ou ISO)
      if (!demandsCol.fields.getByName('sap_snapshot_at')) {
        demandsCol.fields.add(
          new TextField({
            name: 'sap_snapshot_at',
            required: false,
          }),
        )
      }

      // 3. sap_snapshot_status: SINCRONIZADO | INDISPONIVEL | CONCILIADO
      if (!demandsCol.fields.getByName('sap_snapshot_status')) {
        demandsCol.fields.add(
          new TextField({
            name: 'sap_snapshot_status',
            required: false,
          }),
        )
      }

      // 4. sap_snapshot_divergence: divergência entre inventariado e saldo SAP no momento da conclusão
      if (!demandsCol.fields.getByName('sap_snapshot_divergence')) {
        demandsCol.fields.add(
          new NumberField({
            name: 'sap_snapshot_divergence',
            required: false,
          }),
        )
      }

      app.save(demandsCol)
    }

    // Tabela: pcp_mp_inventory_items (para conciliação por item/corrida)
    if (app.hasTable('pcp_mp_inventory_items')) {
      const itemsCol = app.findCollectionByNameOrId('pcp_mp_inventory_items')

      if (!itemsCol.fields.getByName('sap_snapshot_balance')) {
        itemsCol.fields.add(
          new NumberField({
            name: 'sap_snapshot_balance',
            required: false,
          }),
        )
      }

      if (!itemsCol.fields.getByName('sap_snapshot_at')) {
        itemsCol.fields.add(
          new TextField({
            name: 'sap_snapshot_at',
            required: false,
          }),
        )
      }

      app.save(itemsCol)
    }
  },
  (app) => {
    if (app.hasTable('pcp_mp_inventory_demands')) {
      const demandsCol = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
      const f1 = demandsCol.fields.getByName('sap_snapshot_balance')
      if (f1) demandsCol.fields.remove(f1)
      const f2 = demandsCol.fields.getByName('sap_snapshot_at')
      if (f2) demandsCol.fields.remove(f2)
      const f3 = demandsCol.fields.getByName('sap_snapshot_status')
      if (f3) demandsCol.fields.remove(f3)
      const f4 = demandsCol.fields.getByName('sap_snapshot_divergence')
      if (f4) demandsCol.fields.remove(f4)
      app.save(demandsCol)
    }
  },
)
