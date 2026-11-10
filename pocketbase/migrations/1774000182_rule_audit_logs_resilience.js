/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000182: Garante a existência e os campos da coleção rule_audit_logs
 * Idempotente: se já existir, apenas verifica/adiciona campos faltantes.
 */
migrate(
  (app) => {
    let col
    if (!app.hasTable('rule_audit_logs')) {
      const userCol = app.findCollectionByNameOrId('_pb_users_auth_')

      col = new Collection({
        name: 'rule_audit_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'parameter_name', type: 'text', required: true },
          { name: 'entity_type', type: 'text', required: true }, // SETUP, STOP, COOLING, SEQUENCING, RULE_PACK, CP_SAT
          { name: 'entity_id', type: 'text' },
          { name: 'field_name', type: 'text' },
          { name: 'rule_identifier', type: 'text' },
          { name: 'previous_value', type: 'text' },
          { name: 'new_value', type: 'text' },
          { name: 'user_id', type: 'relation', collectionId: userCol.id, maxSelect: 1 },
          { name: 'user_name', type: 'text', required: true },
          { name: 'user_email', type: 'text' },
          { name: 'change_date', type: 'text', required: true },
          { name: 'reason', type: 'text', required: true },
          {
            name: 'origin',
            type: 'select',
            values: ['SAP', 'MES', 'MANUAL', 'IA_OPTIMIZER', 'ENGENHARIA'],
            maxSelect: 1,
          },
          {
            name: 'mes_validation_status',
            type: 'select',
            values: ['VALIDADO', 'PENDENTE', 'NAO_APLICAVEL', 'DIVERGENCIA'],
            maxSelect: 1,
          },
          { name: 'ai_recommendation', type: 'text' },
          { name: 'approver_id', type: 'relation', collectionId: userCol.id, maxSelect: 1 },
          { name: 'approver_name', type: 'text' },
          { name: 'published_at', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_rule_audit_entity ON rule_audit_logs (entity_type, created DESC)',
          'CREATE INDEX idx_rule_audit_param ON rule_audit_logs (parameter_name)',
        ],
      })
      app.save(col)
    } else {
      col = app.findCollectionByNameOrId('rule_audit_logs')
      let changed = false

      // Assegurar campos adicionais opcionais sem quebrar schema existente
      const existingFieldNames = col.fields.map((f) => f.name)
      if (!existingFieldNames.includes('field_name')) {
        col.fields.add(new TextField({ name: 'field_name' }))
        changed = true
      }
      if (!existingFieldNames.includes('rule_identifier')) {
        col.fields.add(new TextField({ name: 'rule_identifier' }))
        changed = true
      }

      if (changed) {
        app.save(col)
      }
    }
  },
  (app) => {
    // Reversão no-op para preservar dados em produção
  },
)
