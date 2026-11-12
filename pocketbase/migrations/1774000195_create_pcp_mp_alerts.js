/// <reference path="../pb_data/types.d.ts" />
// ---------------------------------------------------------------------------
// 1774000195 — Collection pcp_mp_alerts (alertas contextuais de MP Sidercentro)
// Idempotente: só cria se a collection ainda não existir (nunca destrutivo).
// Padrão pcp_* do projeto: logs de auditoria ficam em pcp_audit_logs.
// ---------------------------------------------------------------------------
migrate(
  (app) => {
    if (app.hasTable('pcp_mp_alerts')) {
      return
    }

    const collection = new Collection({
      name: 'pcp_mp_alerts',
      type: 'base',
      fields: [
        { name: 'alert_type', type: 'text', required: true },
        { name: 'alert_code', type: 'text' },
        { name: 'steel_grade', type: 'text' },
        { name: 'steel_class', type: 'text' },
        { name: 'material_code', type: 'text' },
        { name: 'company', type: 'text' },
        { name: 'center', type: 'text' },
        { name: 'recipient', type: 'text' },
        { name: 'content_ia', type: 'text' },
        { name: 'content_final', type: 'text' },
        { name: 'observation', type: 'text' },
        { name: 'result', type: 'text' },
        { name: 'source_screen', type: 'text' },
        { name: 'user_id', type: 'text' },
        { name: 'user_email', type: 'text' },
        { name: 'user_name', type: 'text' },
        { name: 'user_role', type: 'text' },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    })

    app.save(collection)
  },
  (app) => {
    // Rollback não destrutivo: só remove se existir e estiver vazia de propósito
    try {
      const col = app.findCollectionByNameOrId('pcp_mp_alerts')
      app.delete(col)
    } catch (e) {
      // nada a desfazer
    }
  },
)
