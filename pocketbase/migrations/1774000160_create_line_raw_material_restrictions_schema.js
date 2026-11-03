migrate(
  (app) => {
    // 1. Criar coleção line_raw_material_restrictions de forma idempotente
    if (!app.hasTable('line_raw_material_restrictions')) {
      const collection = new Collection({
        name: 'line_raw_material_restrictions',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // Exclusão física bloqueada, exclusão apenas lógica via deleted/active
        fields: [
          { name: 'center_code', type: 'text', required: true },
          { name: 'line_id', type: 'text', required: false },
          { name: 'line_master_id', type: 'text', required: false },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text', required: true },
          { name: 'bitola_mp', type: 'text', required: false },
          { name: 'restricted_product_gauges', type: 'json', required: true },
          { name: 'valid_from', type: 'date', required: true },
          { name: 'valid_until', type: 'date', required: false },
          { name: 'reason', type: 'text', required: true },
          { name: 'notes', type: 'text', required: false },
          { name: 'active', type: 'bool', required: false },
          { name: 'deleted', type: 'bool', required: false },
          { name: 'deleted_at', type: 'text', required: false },
          { name: 'deleted_by', type: 'text', required: false },
          { name: 'created_by', type: 'text', required: false },
          { name: 'updated_by', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_lrmr_center ON line_raw_material_restrictions (center_code, active, deleted)',
          'CREATE INDEX idx_lrmr_mat ON line_raw_material_restrictions (center_code, material_code, active, deleted)',
        ],
      })

      app.save(collection)
    }
  },
  (app) => {
    // Reversão segura
    try {
      if (app.hasTable('line_raw_material_restrictions')) {
        const col = app.findCollectionByNameOrId('line_raw_material_restrictions')
        app.delete(col)
      }
    } catch (_) {}
  },
)
