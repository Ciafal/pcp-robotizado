/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Coleção: pcp_integration_logs (Log Técnico de Integração separado do Log Funcional)
    if (!app.hasTable('pcp_integration_logs')) {
      const col = new Collection({
        name: 'pcp_integration_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'origin_system', type: 'text', required: true }, // SAP, WMS, PCP, MES, NOTIFICATION
          { name: 'target_system', type: 'text' }, // HUB_PCP, DP07, SAP, etc
          { name: 'operation', type: 'text', required: true }, // SYNC_STOCK, GET_LOCATION, DISPATCH_READY, SEND_ALERT, etc
          {
            name: 'status',
            type: 'select',
            values: ['SUCCESS', 'ERROR', 'TIMEOUT', 'UNAVAILABLE', 'DEGRADED'],
            maxSelect: 1,
            required: true,
          },
          { name: 'response_time_ms', type: 'number' },
          { name: 'records_processed', type: 'number' },
          { name: 'technical_message', type: 'text' },
          { name: 'error_details', type: 'text' },
          { name: 'endpoint', type: 'text' },
          { name: 'payload_snapshot', type: 'json' },
          { name: 'user_name', type: 'text' },
          { name: 'timestamp', type: 'text', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pcp_int_logs_sys ON pcp_integration_logs (origin_system)',
          'CREATE INDEX idx_pcp_int_logs_time ON pcp_integration_logs (timestamp)',
          'CREATE INDEX idx_pcp_int_logs_stat ON pcp_integration_logs (status)',
        ],
      })
      app.save(col)
    }

    // 2. Coleção: pcp_internal_notifications (Central Interna de Notificações PCP / DP07)
    if (!app.hasTable('pcp_internal_notifications')) {
      const colNotif = new Collection({
        name: 'pcp_internal_notifications',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'notification_code', type: 'text', required: true },
          {
            name: 'target_audience',
            type: 'select',
            values: ['DP07', 'PCP', 'ALL', 'MES'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'type',
            type: 'select',
            values: [
              'RISCO_ATRASO',
              'NOVO_INVENTARIO',
              'DIVERGENCIA',
              'QTD_INSUFICIENTE',
              'MUDANCA_SEQUENCIA',
              'MATERIAL_NAO_LOCALIZADO',
              'INVENTARIO_PRONTO',
              'PROGRAMACAO_ALTERADA',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'title', type: 'text', required: true },
          { name: 'message', type: 'text', required: true },
          { name: 'order_number', type: 'text' },
          { name: 'material_code', type: 'text' },
          { name: 'heat_number', type: 'text' },
          { name: 'line', type: 'text' },
          { name: 'expected_time', type: 'text' },
          { name: 'required_pieces', type: 'number' },
          { name: 'inventoried_pieces', type: 'number' },
          { name: 'missing_pieces', type: 'number' },
          { name: 'action_url', type: 'text' },
          {
            name: 'severity',
            type: 'select',
            values: ['CRITICAL', 'WARNING', 'INFO'],
            maxSelect: 1,
            required: true,
          },
          { name: 'is_read', type: 'bool' },
          { name: 'external_dispatch_channels', type: 'json' }, // { email: 'PENDING_INTEGRATION', teams: 'PENDING_INTEGRATION', telegram: 'PENDING_INTEGRATION' }
          { name: 'timestamp', type: 'text', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pcp_notif_code ON pcp_internal_notifications (notification_code)',
          'CREATE INDEX idx_pcp_notif_target ON pcp_internal_notifications (target_audience)',
          'CREATE INDEX idx_pcp_notif_read ON pcp_internal_notifications (is_read)',
        ],
      })
      app.save(colNotif)
    }

    // 3. Adicionar campo record_version em pcp_mp_inventory_items para controle de concorrência
    if (app.hasTable('pcp_mp_inventory_items')) {
      const itemsCol = app.findCollectionByNameOrId('pcp_mp_inventory_items')
      if (!itemsCol.fields.getByName('record_version')) {
        itemsCol.fields.add(new NumberField({ name: 'record_version', min: 1 }))
        app.save(itemsCol)
      }
    }
  },
  (app) => {
    try {
      if (app.hasTable('pcp_internal_notifications')) {
        app.delete(app.findCollectionByNameOrId('pcp_internal_notifications'))
      }
      if (app.hasTable('pcp_integration_logs')) {
        app.delete(app.findCollectionByNameOrId('pcp_integration_logs'))
      }
    } catch (_) {}
  },
)
