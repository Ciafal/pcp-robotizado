migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pcp_audit_logs')

    // Adicionar campos requeridos para a auditoria transacional completa
    const fieldsToAdd = [
      { name: 'event_id', type: 'text' },
      { name: 'login', type: 'text' },
      { name: 'profile', type: 'text' },
      { name: 'company', type: 'text' },
      { name: 'line', type: 'text' },
      { name: 'center', type: 'text' },
      { name: 'module', type: 'text' },
      { name: 'screen', type: 'text' },
      { name: 'entity', type: 'text' },
      { name: 'record_id', type: 'text' },
      { name: 'source', type: 'text' },
      { name: 'status', type: 'text' },
      { name: 'reason_id', type: 'text' },
      { name: 'reason', type: 'text' },
      { name: 'justification', type: 'text' },
      { name: 'correlation_id', type: 'text' },
      { name: 'schedule_version', type: 'text' },
      { name: 'changes', type: 'json' },
      { name: 'technical_details', type: 'json' },
    ]

    for (const f of fieldsToAdd) {
      if (!col.fields.getByName(f.name)) {
        if (f.type === 'text') {
          col.fields.add(new TextField({ name: f.name }))
        } else if (f.type === 'json') {
          col.fields.add(new JSONField({ name: f.name }))
        }
      }
    }

    // Garantir regras: create liberado para usuários autenticados, update e delete restritos (imutável)
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.createRule = "@request.auth.id != ''"
    col.updateRule = null
    col.deleteRule = null

    app.save(col)

    // Adicionar índices úteis para performance de busca da trilha de auditoria
    try {
      col.addIndex('idx_pcp_audit_event_id', false, 'event_id', '')
      col.addIndex('idx_pcp_audit_company', false, 'company', '')
      col.addIndex('idx_pcp_audit_line', false, 'line', '')
      col.addIndex('idx_pcp_audit_module', false, 'module', '')
      col.addIndex('idx_pcp_audit_source', false, 'source', '')
      col.addIndex('idx_pcp_audit_status', false, 'status', '')
      col.addIndex('idx_pcp_audit_record_id', false, 'record_id', '')
      col.addIndex('idx_pcp_audit_correlation', false, 'correlation_id', '')
      app.save(col)
    } catch (idxErr) {
      console.log('Aviso ao criar índices complementares:', idxErr)
    }
  },
  (app) => {
    // Revert: não remove campos para não causar perda de dados em rollback rápido
  },
)
