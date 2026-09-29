/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Garante collection pcp_mp_inventory_history caso não exista
    if (!app.hasTable('pcp_mp_inventory_history')) {
      const historyCollection = new Collection({
        id: 'pcp_mp_inv_hist',
        name: 'pcp_mp_inventory_history',
        type: 'base',
        system: false,
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        schema: [
          {
            name: 'inventory_order_id',
            type: 'text',
            required: false,
            presentable: false,
            unique: false,
          },
          {
            name: 'demand_id',
            type: 'text',
            required: false,
            presentable: false,
            unique: false,
          },
          {
            name: 'control_number',
            type: 'text',
            required: false,
            presentable: false,
            unique: false,
          },
          {
            name: 'event_type',
            type: 'text',
            required: true,
            presentable: false,
            unique: false,
          },
          {
            name: 'user_name',
            type: 'text',
            required: false,
            presentable: false,
            unique: false,
          },
          {
            name: 'user_role',
            type: 'text',
            required: false,
            presentable: false,
            unique: false,
          },
          {
            name: 'summary',
            type: 'text',
            required: true,
            presentable: false,
            unique: false,
          },
          {
            name: 'details',
            type: 'json',
            required: false,
            presentable: false,
            unique: false,
          },
          {
            name: 'timestamp',
            type: 'date',
            required: false,
            presentable: false,
            unique: false,
          },
        ],
        indexes: [],
      })
      app.save(historyCollection)
    }

    // Garante unique index em control_number na tabela pcp_mp_inventory_demands
    if (app.hasTable('pcp_mp_inventory_demands')) {
      try {
        app
          .db()
          .newQuery(
            'CREATE UNIQUE INDEX IF NOT EXISTS `idx_unique_mp_demands_ctrl` ON `pcp_mp_inventory_demands` (`control_number`)',
          )
          .execute()
      } catch (e) {
        // index already exists or table has constraint
      }
    }
  },
  (app) => {
    // Revert
  },
)
