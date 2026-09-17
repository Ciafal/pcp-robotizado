migrate(
  (app) => {
    // 1. Criar coleção sap_mrp_groups (Cache SAP MARC-DISGR)
    let mrpCol
    try {
      mrpCol = app.findCollectionByNameOrId('sap_mrp_groups')
    } catch (_) {
      mrpCol = new Collection({
        name: 'sap_mrp_groups',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'disgr', type: 'text', required: true, min: 1, max: 10 },
          { name: 'description', type: 'text', required: false },
          { name: 'werks', type: 'text', required: true, min: 1, max: 10 },
          { name: 'company_code', type: 'text', required: false },
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
          'CREATE INDEX idx_smg_werks_disgr ON sap_mrp_groups (werks, disgr)',
          'CREATE INDEX idx_smg_disgr ON sap_mrp_groups (disgr)',
          'CREATE INDEX idx_smg_werks ON sap_mrp_groups (werks)',
        ],
      })
      app.save(mrpCol)
    }

    // 2. Adicionar campos na line_bottleneck_matrix para persistência real de Grupo MRP (MARC-DISGR)
    // e estruturação para o 2º parâmetro SAP futuro (sem UI nem regra ativa agora)
    const lbmCol = app.findCollectionByNameOrId('line_bottleneck_matrix')
    if (!lbmCol.fields.getByName('mrp_group_code')) {
      lbmCol.fields.add(new TextField({ name: 'mrp_group_code' }))
    }
    if (!lbmCol.fields.getByName('mrp_group_description')) {
      lbmCol.fields.add(new TextField({ name: 'mrp_group_description' }))
    }
    if (!lbmCol.fields.getByName('werks')) {
      lbmCol.fields.add(new TextField({ name: 'werks' }))
    }
    if (!lbmCol.fields.getByName('sap_param2_code')) {
      lbmCol.fields.add(new TextField({ name: 'sap_param2_code' }))
    }
    if (!lbmCol.fields.getByName('is_homologated')) {
      lbmCol.fields.add(new BoolField({ name: 'is_homologated' }))
    }
    app.save(lbmCol)

    // 3. Atualizar matrizes existentes de L1 e L2 para terem is_homologated = true por padrão
    try {
      app
        .db()
        .newQuery(
          'UPDATE line_bottleneck_matrix SET is_homologated = 1 WHERE is_homologated IS NULL',
        )
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const mrpCol = app.findCollectionByNameOrId('sap_mrp_groups')
      app.delete(mrpCol)
    } catch (_) {}
  },
)
