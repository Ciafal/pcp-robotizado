/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000172 (IDEMPOTENTE):
 * 1. Cria a collection pcp_report_sendings (histórico de envios do relatório
 *    Previsto x Realizado) — apenas se ainda não existir.
 * 2. Garante o valor 'REPORT' no select 'type' de pcp_internal_notifications.
 */
migrate(
  (app) => {
    if (!app.hasTable('pcp_report_sendings')) {
      const col = new Collection({
        name: 'pcp_report_sendings',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'sending_code', type: 'text', required: true },
          {
            name: 'channel',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['EMAIL', 'HUB', 'AMBOS'],
          },
          {
            name: 'report_type',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['sintetico', 'analitico', 'completo'],
          },
          { name: 'period_label', type: 'text' },
          { name: 'subject', type: 'text' },
          { name: 'message', type: 'text' },
          { name: 'attach_pdf', type: 'bool' },
          { name: 'include_ai', type: 'bool' },
          { name: 'request_read_receipt', type: 'bool' },
          { name: 'recipient_name', type: 'text' },
          { name: 'recipient_email', type: 'text', required: true },
          { name: 'recipient_user_id', type: 'text' },
          { name: 'is_external', type: 'bool' },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['ENVIADO', 'ENTREGUE', 'VISUALIZADO', 'LEITURA_CONFIRMADA', 'FALHA_ENTREGA'],
          },
          { name: 'status_detail', type: 'text' },
          { name: 'error_message', type: 'text' },
          { name: 'read_confirmed_at', type: 'text' },
          { name: 'sent_by_user_id', type: 'text' },
          { name: 'sent_by_name', type: 'text' },
          { name: 'sent_by_email', type: 'text' },
          { name: 'line_code', type: 'text' },
          { name: 'filters', type: 'json' },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pxr_sending_code ON pcp_report_sendings (sending_code)',
          'CREATE INDEX idx_pxr_sending_recipient ON pcp_report_sendings (recipient_email)',
        ],
      })
      app.save(col)
      console.log('Collection pcp_report_sendings criada.')
    }

    // Valor 'REPORT' em pcp_internal_notifications.type (idempotente)
    try {
      if (app.hasTable('pcp_internal_notifications')) {
        const notifCol = app.findCollectionByNameOrId('pcp_internal_notifications')
        const typeField = notifCol.fields.getByName('type')
        if (typeField && Array.isArray(typeField.values)) {
          const current = [...typeField.values]
          if (!current.includes('REPORT')) {
            current.push('REPORT')
            typeField.values = current
            app.save(notifCol)
            console.log("Valor 'REPORT' adicionado a pcp_internal_notifications.type.")
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao atualizar pcp_internal_notifications.type:', err)
    }
  },
  (app) => {
    try {
      if (app.hasTable('pcp_internal_notifications')) {
        const col = app.findCollectionByNameOrId('pcp_internal_notifications')
        const typeField = col.fields.getByName('type')
        if (typeField && Array.isArray(typeField.values)) {
          typeField.values = typeField.values.filter((v) => v !== 'REPORT')
          app.save(col)
        }
      }
    } catch (_) {}
    try {
      if (app.hasTable('pcp_report_sendings')) {
        app.delete(app.findCollectionByNameOrId('pcp_report_sendings'))
      }
    } catch (_) {}
  },
)
