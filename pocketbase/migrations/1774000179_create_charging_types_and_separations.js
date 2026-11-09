migrate(
  (app) => {
    // 1. Coleção para Tipos de Enfornamento vinculada ao Centro (Ficha Mestre Expandida)
    if (!app.hasTable('line_furnace_charging_types')) {
      const colEnfornamento = new Collection({
        name: 'line_furnace_charging_types',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'center_code', type: 'text', required: true },
          { name: 'line_id', type: 'text' },
          { name: 'line_master_id', type: 'text' },
          { name: 'charging_type', type: 'text', required: true },
          { name: 'raw_material_code', type: 'text', required: true },
          { name: 'raw_material_description', type: 'text' },
          { name: 'min_weight_t', type: 'number' },
          { name: 'max_weight_t', type: 'number' },
          { name: 'min_thickness_mm', type: 'number' },
          { name: 'max_thickness_mm', type: 'number' },
          { name: 'min_length_mm', type: 'number' },
          { name: 'max_length_mm', type: 'number' },
          { name: 'min_width_mm', type: 'number' },
          { name: 'max_width_mm', type: 'number' },
          { name: 'active', type: 'bool' },
          { name: 'deleted', type: 'bool' },
          { name: 'deleted_at', type: 'text' },
          { name: 'deleted_by', type: 'text' },
          { name: 'created_by', type: 'text' },
          { name: 'updated_by', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_lfct_center ON line_furnace_charging_types (center_code)',
          'CREATE INDEX idx_lfct_deleted ON line_furnace_charging_types (deleted)',
        ],
      })
      app.save(colEnfornamento)
    }

    // 2. Coleção para Separação de Carga vinculada ao Centro (Ficha Mestre Expandida - Tabela Linear)
    if (!app.hasTable('line_charge_separations')) {
      const colSeparacao = new Collection({
        name: 'line_charge_separations',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'center_code', type: 'text', required: true },
          { name: 'line_id', type: 'text' },
          { name: 'line_master_id', type: 'text' },
          { name: 'charging_load_type', type: 'text', required: true }, // Carga que irá enfornar
          { name: 'charged_load_type', type: 'text', required: true }, // Carga enfornada
          { name: 'separator_blocks_qty', type: 'number', required: true }, // Qtd blocos separadores (inteiro >= 0)
          { name: 'blocks_arrangement', type: 'text' }, // Disposição dos blocos (ex.: "4 em pé + 4 deitados")
          { name: 'notes', type: 'text' }, // Observação opcional
          { name: 'active', type: 'bool' },
          { name: 'deleted', type: 'bool' },
          { name: 'deleted_at', type: 'text' },
          { name: 'deleted_by', type: 'text' },
          { name: 'created_by', type: 'text' },
          { name: 'updated_by', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_lcs_center ON line_charge_separations (center_code)',
          'CREATE INDEX idx_lcs_combo ON line_charge_separations (center_code, charging_load_type, charged_load_type)',
          'CREATE INDEX idx_lcs_deleted ON line_charge_separations (deleted)',
        ],
      })
      app.save(colSeparacao)
    }
  },
  (app) => {
    if (app.hasTable('line_charge_separations')) {
      const col2 = app.findCollectionByNameOrId('line_charge_separations')
      app.delete(col2)
    }
    if (app.hasTable('line_furnace_charging_types')) {
      const col1 = app.findCollectionByNameOrId('line_furnace_charging_types')
      app.delete(col1)
    }
  },
)
