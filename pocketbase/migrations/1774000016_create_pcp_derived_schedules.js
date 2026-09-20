migrate(
  (app) => {
    let existingCol = null
    try {
      existingCol = app.findCollectionByNameOrId('pcp_derived_schedules')
    } catch (_) {}

    if (existingCol) {
      return
    }

    const collection = new Collection({
      name: 'pcp_derived_schedules',
      type: 'base',
      listRule: "@request.auth.id != '' || @request.auth.id = ''",
      viewRule: "@request.auth.id != '' || @request.auth.id = ''",
      createRule: "@request.auth.id != '' || @request.auth.id = ''",
      updateRule: "@request.auth.id != '' || @request.auth.id = ''",
      deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
      fields: [
        { name: 'origem_programacao_id', type: 'text', required: true },
        { name: 'derivada_programacao_id', type: 'text', required: true },
        { name: 'centro_origem', type: 'text', required: true },
        { name: 'centro_destino', type: 'text', required: true },
        { name: 'matkl', type: 'text', required: false },
        { name: 'regra_id', type: 'text', required: false },
        { name: 'versao_origem', type: 'number', required: false },
        { name: 'quantidade_origem', type: 'number', required: false },
        { name: 'quantidade_derivada', type: 'number', required: false },
        { name: 'data_hora_criacao', type: 'text', required: false },
        { name: 'usuario_criacao', type: 'text', required: false },
        {
          name: 'tipo_geracao',
          type: 'select',
          values: ['MANUAL', 'AUTOMATICA'],
          maxSelect: 1,
          required: false,
        },
        {
          name: 'derivation_status',
          type: 'select',
          values: ['ATIVA', 'ORIGEM_CANCELADA', 'REVISAO_NECESSARIA', 'DESVINCULADA'],
          maxSelect: 1,
          required: false,
        },
        { name: 'analise_ia', type: 'json', required: false },
        { name: 'metadata', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pds_origem ON pcp_derived_schedules (origem_programacao_id)',
        'CREATE INDEX idx_pds_derivada ON pcp_derived_schedules (derivada_programacao_id)',
        'CREATE INDEX idx_pds_centros ON pcp_derived_schedules (centro_origem, centro_destino)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('pcp_derived_schedules')
      app.delete(col)
    } catch (_) {}
  },
)
