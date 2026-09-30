/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Criação idempotente da coleção line_theoretical_losses ("Perdas Teóricas" da Ficha Mestra)
    if (!app.hasTable('line_theoretical_losses')) {
      const lineCol = app.findCollectionByNameOrId('production_lines')
      const masterCol = app.findCollectionByNameOrId('line_masters')

      const lossesCol = new Collection({
        name: 'line_theoretical_losses',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          {
            name: 'line_id',
            type: 'relation',
            collectionId: lineCol ? lineCol.id : undefined,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'line_master_id',
            type: 'relation',
            collectionId: masterCol ? masterCol.id : undefined,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'center_code', type: 'text', required: true },
          { name: 'raw_material_type', type: 'text', required: true },
          { name: 'raw_material_code', type: 'text', required: true },
          { name: 'raw_material_description', type: 'text', required: true },
          { name: 'bitola', type: 'text', required: true },
          { name: 'application', type: 'text', required: true },
          { name: 'rm_pct', type: 'number', required: true },
          { name: 'carepa_pct', type: 'number', required: true },
          { name: 'apara_pct', type: 'number', required: true },
          { name: 'deleted', type: 'bool', required: false },
          { name: 'deleted_at', type: 'text', required: false },
          { name: 'deleted_by', type: 'text', required: false },
          { name: 'created_by_user_id', type: 'text', required: false },
          { name: 'created_by_user_name', type: 'text', required: false },
          { name: 'updated_by_user_id', type: 'text', required: false },
          { name: 'updated_by_user_name', type: 'text', required: false },
          { name: 'notes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ltl_line ON line_theoretical_losses (line_id, deleted)',
          'CREATE INDEX idx_ltl_center ON line_theoretical_losses (center_code, deleted)',
          'CREATE INDEX idx_ltl_mp ON line_theoretical_losses (raw_material_code)',
          'CREATE INDEX idx_ltl_bitola ON line_theoretical_losses (bitola)',
          'CREATE INDEX idx_ltl_app ON line_theoretical_losses (application)',
        ],
      })
      app.save(lossesCol)
    }
  },
  (app) => {
    try {
      if (app.hasTable('line_theoretical_losses')) {
        const lossesCol = app.findCollectionByNameOrId('line_theoretical_losses')
        if (lossesCol) app.delete(lossesCol)
      }
    } catch (_) {}
  },
)
