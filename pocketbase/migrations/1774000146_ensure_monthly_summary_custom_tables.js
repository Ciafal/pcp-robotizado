migrate(
  (app) => {
    // 1. Assegurar campo custom_tables na collection pcp_monthly_summary_templates
    try {
      const templatesCol = app.findCollectionByNameOrId('pcp_monthly_summary_templates')
      if (templatesCol) {
        let changed = false
        if (!templatesCol.fields.getByName('custom_tables')) {
          templatesCol.fields.add(new JSONField({ name: 'custom_tables' }))
          changed = true
        }
        if (changed) {
          app.save(templatesCol)
        }
      }
    } catch (e) {
      console.warn('Campo custom_tables já existe ou não foi possível atualizar templates:', e)
    }

    // 2. Criar collection pcp_monthly_summary_tables para persistência atômica e catálogo de tabelas se não existir
    let tableCol = null
    try {
      tableCol = app.findCollectionByNameOrId('pcp_monthly_summary_tables')
    } catch (_) {}

    if (!tableCol) {
      tableCol = new Collection({
        name: 'pcp_monthly_summary_tables',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'table_id', type: 'text', required: true },
          { name: 'template_id', type: 'text', required: false },
          { name: 'template_code', type: 'text', required: false },
          { name: 'section_key', type: 'text', required: false },
          { name: 'name', type: 'text', required: true },
          { name: 'display_title', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'data_source', type: 'text', required: false },
          { name: 'show_title', type: 'bool', required: false },
          { name: 'allow_ai_completion', type: 'bool', required: false },
          { name: 'allow_manual_edit', type: 'bool', required: false },
          { name: 'ai_fill_instructions', type: 'text', required: false },
          { name: 'is_dynamic', type: 'bool', required: false },
          { name: 'columns', type: 'json', required: false },
          { name: 'rows', type: 'json', required: false },
          { name: 'totalizer', type: 'json', required: false },
          { name: 'initial_rows_count', type: 'number', required: false },
          { name: 'initial_cols_count', type: 'number', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pmst_table_id ON pcp_monthly_summary_tables (table_id)',
          'CREATE INDEX idx_pmst_tpl_sec ON pcp_monthly_summary_tables (template_id, section_key)',
        ],
      })
      app.save(tableCol)
    }
  },
  (app) => {
    try {
      const tableCol = app.findCollectionByNameOrId('pcp_monthly_summary_tables')
      if (tableCol) {
        app.delete(tableCol)
      }
    } catch (_) {}
  },
)
