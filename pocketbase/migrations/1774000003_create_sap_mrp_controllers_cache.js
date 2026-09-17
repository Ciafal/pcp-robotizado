migrate(
  (app) => {
    // 1. Criar coleção sap_mrp_controllers (Cache SAP MARC-DISPO / T024D)
    let dispoCol
    try {
      dispoCol = app.findCollectionByNameOrId('sap_mrp_controllers')
    } catch (_) {
      dispoCol = new Collection({
        name: 'sap_mrp_controllers',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'dispo', type: 'text', required: true, min: 1, max: 10 },
          { name: 'description', type: 'text', required: false },
          { name: 'werks', type: 'text', required: true, min: 1, max: 10 },
          { name: 'company_code', type: 'text', required: false },
          { name: 'materials_count', type: 'number', required: false },
          { name: 'last_sync', type: 'date', required: false },
          {
            name: 'origin_source',
            type: 'select',
            values: ['SAP_RFC', 'CACHE'],
            maxSelect: 1,
            required: false,
          },
          { name: 'is_active', type: 'bool', required: false },
          { name: 'raw_sap_payload', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_smc_werks_dispo ON sap_mrp_controllers (werks, dispo)',
          'CREATE INDEX idx_smc_dispo ON sap_mrp_controllers (dispo)',
          'CREATE INDEX idx_smc_werks ON sap_mrp_controllers (werks)',
        ],
      })
      app.save(dispoCol)
    }

    // 2. Adicionar campos na line_bottleneck_matrix para persistência real de Planejador MRP (MARC-DISPO)
    // Mantendo os campos anteriores (mrp_group_code / MARC-DISGR) intactos para compatibilidade e auditoria
    const lbmCol = app.findCollectionByNameOrId('line_bottleneck_matrix')
    if (!lbmCol.fields.getByName('mrp_controller_code')) {
      lbmCol.fields.add(new TextField({ name: 'mrp_controller_code' }))
    }
    if (!lbmCol.fields.getByName('mrp_controller_description')) {
      lbmCol.fields.add(new TextField({ name: 'mrp_controller_description' }))
    }
    if (!lbmCol.fields.getByName('mrp_controllers_json')) {
      lbmCol.fields.add(new JSONField({ name: 'mrp_controllers_json' }))
    }
    if (!lbmCol.fields.getByName('company_code')) {
      lbmCol.fields.add(new TextField({ name: 'company_code' }))
    }
    if (!lbmCol.fields.getByName('matrix_name')) {
      lbmCol.fields.add(new TextField({ name: 'matrix_name' }))
    }
    app.save(lbmCol)

    // 3. Atualizar matrizes existentes que possuem WERKS nulo com WERKS padrão 1001 e empresa CIAFAL
    try {
      app
        .db()
        .newQuery(
          "UPDATE line_bottleneck_matrix SET werks = '1001', company_code = 'CIAFAL', matrix_name = (gauge_dimension || ' • ' || steel_grade) WHERE werks IS NULL OR werks = ''",
        )
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const dispoCol = app.findCollectionByNameOrId('sap_mrp_controllers')
      app.delete(dispoCol)
    } catch (_) {}
  },
)
