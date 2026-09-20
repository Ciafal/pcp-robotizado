/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collectionName = 'pcp_derived_schedules'

    try {
      app.findCollectionByNameOrId(collectionName)
      return // Já existe
    } catch {
      // Não existe, criar coleção
    }

    const collection = new Collection({
      name: collectionName,
      type: 'base',
      system: false,
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'origem_programacao_id',
          type: 'text',
          required: true,
        },
        {
          name: 'derivada_programacao_id',
          type: 'text',
          required: true,
        },
        {
          name: 'centro_origem',
          type: 'text',
          required: true,
        },
        {
          name: 'centro_destino',
          type: 'text',
          required: true,
        },
        {
          name: 'matkl',
          type: 'text',
          required: false,
        },
        {
          name: 'regra_id',
          type: 'text',
          required: false,
        },
        {
          name: 'versao_origem',
          type: 'number',
          required: false,
        },
        {
          name: 'quantidade_origem',
          type: 'number',
          required: false,
        },
        {
          name: 'quantidade_derivada',
          type: 'number',
          required: false,
        },
        {
          name: 'usuario_criacao',
          type: 'text',
          required: false,
        },
        {
          name: 'tipo_geracao',
          type: 'select',
          values: ['MANUAL', 'AUTOMATICA'],
          required: true,
        },
        {
          name: 'derivation_status',
          type: 'select',
          values: ['ATIVA', 'ORIGEM_CANCELADA', 'REVISAO_NECESSARIA', 'DESVINCULADA'],
          required: true,
        },
        {
          name: 'metadata',
          type: 'json',
          required: false,
        },
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
    } catch {
      // Ignorar se já não existir
    }
  },
)
