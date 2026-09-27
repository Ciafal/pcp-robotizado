migrate(
  (app) => {
    // 1. Campos adicionais na coleção line_productivity_rates (Tópico Produtividade):
    // - Comprimento máximo (m): max_length_m (number)
    // - Comprimento mínimo (m): min_length_m (number)
    // - kg/metro (kg/m): kg_per_meter (number)
    const prodCol = app.findCollectionByNameOrId('line_productivity_rates')
    if (prodCol) {
      if (!prodCol.fields.getByName('max_length_m')) {
        prodCol.fields.add(new NumberField({ name: 'max_length_m', required: false }))
      }
      if (!prodCol.fields.getByName('min_length_m')) {
        prodCol.fields.add(new NumberField({ name: 'min_length_m', required: false }))
      }
      if (!prodCol.fields.getByName('kg_per_meter')) {
        prodCol.fields.add(new NumberField({ name: 'kg_per_meter', required: false }))
      }
      app.save(prodCol)
    }

    // 2. Nova coleção: line_raw_material_applications ("Matéria-prima por aplicação")
    // Múltiplas matérias-primas e múltiplas aplicações para o mesmo centro/produto
    // Relacionamentos estruturados para suportar Fase 2 (Programação Mensal, validação 1:N bitolas/aplicações)
    if (!app.hasTable('line_raw_material_applications')) {
      const lineCol = app.findCollectionByNameOrId('production_lines')
      const masterCol = app.findCollectionByNameOrId('line_masters')

      const appCol = new Collection({
        name: 'line_raw_material_applications',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'", // Proibido exclusão física em operação
        fields: [
          {
            name: 'line_id',
            type: 'relation',
            collectionId: lineCol.id,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'line_master_id',
            type: 'relation',
            collectionId: masterCol.id,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'center_code', type: 'text', required: true },
          { name: 'product_code', type: 'text', required: true }, // Produto acabado / referência
          { name: 'product_description', type: 'text' },
          { name: 'raw_material_code', type: 'text', required: true }, // Código MP obrigatório
          { name: 'raw_material_description', type: 'text' },
          { name: 'supplier', type: 'text' }, // Fornecedor
          { name: 'supplier_id', type: 'text' }, // Código SAP do fornecedor se houver
          { name: 'application', type: 'text', required: true }, // Aplicação / bitola
          { name: 'bitola_ref', type: 'text' }, // Referência ZPPT052-APLICACAO onde couber
          { name: 'steel_type', type: 'text' }, // Tipo de Aço
          // Pesos (kg)
          { name: 'average_weight_kg', type: 'number' },
          { name: 'max_weight_kg', type: 'number' },
          { name: 'min_weight_kg', type: 'number' },
          // Comprimentos (m)
          { name: 'rolled_length_m', type: 'number' },
          { name: 'multiple_length_m', type: 'number' },
          { name: 'max_mp_length_m', type: 'number' },
          { name: 'min_mp_length_m', type: 'number' },
          // Redução calculada: razão 1:X (armazenando X) e percentual (%)
          { name: 'reduction_ratio_x', type: 'number' },
          { name: 'reduction_ratio_text', type: 'text' }, // ex. "1:5" ou "1:5,00"
          { name: 'reduction_percentage', type: 'number' }, // ex. 80.00
          // Flags de sequenciamento e controle técnico
          { name: 'first_run', type: 'bool' }, // 1ª corrida: Sim/Não
          { name: 'allow_out_of_standard_mp', type: 'bool' }, // Permitir fora padrão MP: Sim/Não
          {
            name: 'status',
            type: 'select',
            values: ['Ativo', 'Inativo'],
            required: true,
            maxSelect: 1,
          },
          { name: 'notes', type: 'text' },
          { name: 'created_by_user_id', type: 'text' },
          { name: 'created_by_user_name', type: 'text' },
          { name: 'updated_by_user_id', type: 'text' },
          { name: 'updated_by_user_name', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_lrma_line ON line_raw_material_applications (line_id, status)',
          'CREATE INDEX idx_lrma_center_prod ON line_raw_material_applications (center_code, product_code)',
          'CREATE INDEX idx_lrma_mp ON line_raw_material_applications (raw_material_code)',
          'CREATE INDEX idx_lrma_app ON line_raw_material_applications (application)',
          'CREATE INDEX idx_lrma_status ON line_raw_material_applications (status)',
          'CREATE INDEX idx_lrma_first_run ON line_raw_material_applications (first_run)',
          'CREATE INDEX idx_lrma_allow_out ON line_raw_material_applications (allow_out_of_standard_mp)',
        ],
      })
      app.save(appCol)
    }

    // 3. Coleção de Rastreabilidade e Validação para Fase 2:
    // pcp_monthly_schedule_mp_validations
    // Rastreia a especificação técnica usada no momento de cada validação da Programação Mensal
    if (!app.hasTable('pcp_monthly_schedule_mp_validations')) {
      const valCol = new Collection({
        name: 'pcp_monthly_schedule_mp_validations',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: null, // append-only
        deleteRule: null, // append-only
        fields: [
          { name: 'schedule_id', type: 'text' },
          { name: 'monthly_period', type: 'text' }, // YYYY-MM
          { name: 'center_code', type: 'text', required: true },
          { name: 'product_code', type: 'text', required: true },
          { name: 'raw_material_code', type: 'text', required: true },
          { name: 'application', type: 'text', required: true },
          { name: 'mp_application_id', type: 'text' },
          { name: 'line_master_version', type: 'number' },
          {
            name: 'validation_result',
            type: 'select',
            values: [
              'APPROVED',
              'REJECTED_INACTIVE',
              'REJECTED_OUT_OF_STANDARD',
              'APPROVED_WITH_EXCEPTION',
            ],
            required: true,
            maxSelect: 1,
          },
          { name: 'evaluated_parameters_json', type: 'json' },
          { name: 'exception_used', type: 'bool' },
          { name: 'exception_alert_message', type: 'text' },
          { name: 'user_id', type: 'text' },
          { name: 'user_name', type: 'text' },
          { name: 'user_role', type: 'text' },
          { name: 'validated_at_formatted', type: 'text' }, // dd/mm/aaaa hh:mm
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pms_mp_val_center ON pcp_monthly_schedule_mp_validations (center_code, product_code)',
          'CREATE INDEX idx_pms_mp_val_mp ON pcp_monthly_schedule_mp_validations (raw_material_code)',
          'CREATE INDEX idx_pms_mp_val_res ON pcp_monthly_schedule_mp_validations (validation_result)',
        ],
      })
      app.save(valCol)
    }
  },
  (app) => {
    try {
      const valCol = app.findCollectionByNameOrId('pcp_monthly_schedule_mp_validations')
      if (valCol) app.delete(valCol)
    } catch (_) {}

    try {
      const appCol = app.findCollectionByNameOrId('line_raw_material_applications')
      if (appCol) app.delete(appCol)
    } catch (_) {}

    try {
      const prodCol = app.findCollectionByNameOrId('line_productivity_rates')
      if (prodCol) {
        if (prodCol.fields.getByName('max_length_m')) prodCol.fields.removeByName('max_length_m')
        if (prodCol.fields.getByName('min_length_m')) prodCol.fields.removeByName('min_length_m')
        if (prodCol.fields.getByName('kg_per_meter')) prodCol.fields.removeByName('kg_per_meter')
        app.save(prodCol)
      }
    } catch (_) {}
  },
)
