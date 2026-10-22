migrate(
  (app) => {
    // 1. Coleção sap_model_types (Tipos de Código Modelo)
    let modelTypesCol = null
    try {
      modelTypesCol = app.findCollectionByNameOrId('sap_model_types')
    } catch (_) {}

    if (!modelTypesCol) {
      modelTypesCol = new Collection({
        name: 'sap_model_types',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null, // Proibida exclusão física para governança e auditoria
        fields: [
          { name: 'tipo_codigo_modelo', type: 'text', required: true },
          { name: 'descricao', type: 'text', required: false },
          { name: 'centro', type: 'text', required: true },
          { name: 'centro_trabalho', type: 'text', required: true },
          { name: 'tipo_material', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Ativo', 'Inativo', 'ATIVO', 'INATIVO'],
            maxSelect: 1,
          },
          { name: 'criado_por', type: 'text', required: false },
          { name: 'atualizado_por', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_smt_tipo ON sap_model_types (tipo_codigo_modelo)',
          'CREATE INDEX idx_smt_centro ON sap_model_types (centro)',
          'CREATE INDEX idx_smt_arbpl ON sap_model_types (centro_trabalho)',
          'CREATE INDEX idx_smt_mtart ON sap_model_types (tipo_material)',
          'CREATE INDEX idx_smt_status ON sap_model_types (status)',
          'CREATE INDEX idx_smt_combo ON sap_model_types (centro, centro_trabalho, tipo_material, status)',
        ],
      })
      app.save(modelTypesCol)
    }

    // 2. Coleção sap_model_type_items (Códigos Modelo Vinculados)
    let modelItemsCol = null
    try {
      modelItemsCol = app.findCollectionByNameOrId('sap_model_type_items')
    } catch (_) {}

    if (!modelItemsCol) {
      modelItemsCol = new Collection({
        name: 'sap_model_type_items',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          {
            name: 'tipo_codigo_modelo_id',
            type: 'relation',
            required: true,
            collectionId: modelTypesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'codigo_material', type: 'text', required: true },
          { name: 'descricao', type: 'text', required: false },
          { name: 'centro', type: 'text', required: false },
          { name: 'centro_trabalho', type: 'text', required: false },
          { name: 'tipo_material', type: 'text', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Ativo', 'Inativo', 'ATIVO', 'INATIVO'],
            maxSelect: 1,
          },
          { name: 'data_inclusao', type: 'text', required: false },
          { name: 'usuario_responsavel', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_smti_parent ON sap_model_type_items (tipo_codigo_modelo_id)',
          'CREATE INDEX idx_smti_matnr ON sap_model_type_items (codigo_material)',
          'CREATE INDEX idx_smti_status ON sap_model_type_items (status)',
        ],
      })
      app.save(modelItemsCol)
    }

    // 3. Registrar ou garantir permissões RBAC no pcp_permissions
    try {
      const permsCol = app.findCollectionByNameOrId('pcp_permissions')
      const permissionsToSeed = [
        {
          key: 'pcp.sap_validation.models.view',
          name: 'Visualizar Códigos Modelos Padrão',
          category: 'Cadastros',
          description: 'Acesso à consulta dos tipos e códigos modelos padrão cadastrados no PCP',
          is_critical: false,
        },
        {
          key: 'pcp.sap_validation.models.manage',
          name: 'Gerenciar Códigos Modelos Padrão',
          category: 'Cadastros',
          description:
            'Cadastrar, editar, vincular códigos SAP e ativar/inativar tipos de código modelo',
          is_critical: false,
        },
      ]

      for (let i = 0; i < permissionsToSeed.length; i++) {
        const p = permissionsToSeed[i]
        try {
          app.findFirstRecordByData('pcp_permissions', 'key', p.key)
        } catch (_) {
          const rec = new Record(permsCol)
          rec.set('key', p.key)
          rec.set('name', p.name)
          rec.set('category', p.category)
          rec.set('description', p.description)
          rec.set('is_critical', p.is_critical)
          app.save(rec)
        }
      }
    } catch (_) {}

    // 4. Seed inicial homologado para teste e demonstração
    try {
      const typesCount = app.findRecordsByFilter(
        'sap_model_types',
        'tipo_codigo_modelo != ""',
        '-created',
        1,
        0,
      )
      if (!typesCount || typesCount.length === 0) {
        const recType = new Record(modelTypesCol)
        recType.set('tipo_codigo_modelo', 'Produto acabado L1')
        recType.set('descricao', 'Modelo de referência para perfis e tubos acabados na Linha 1')
        recType.set('centro', '1001')
        recType.set('centro_trabalho', 'WC-DIV-L1')
        recType.set('tipo_material', 'ZFER')
        recType.set('status', 'Ativo')
        recType.set('criado_por', 'PCP Engenharia')
        recType.set('atualizado_por', 'PCP Engenharia')
        app.save(recType)

        const recItem1 = new Record(modelItemsCol)
        recItem1.set('tipo_codigo_modelo_id', recType.id)
        recItem1.set('codigo_material', '10004521')
        recItem1.set('descricao', 'TUBO RETANGULAR 50X30X2,00MM SAE 1020')
        recItem1.set('centro', '1001')
        recItem1.set('centro_trabalho', 'WC-DIV-L1')
        recItem1.set('tipo_material', 'ZFER')
        recItem1.set('status', 'Ativo')
        recItem1.set('data_inclusao', new Date().toISOString())
        recItem1.set('usuario_responsavel', 'PCP Engenharia')
        app.save(recItem1)

        const recItem2 = new Record(modelItemsCol)
        recItem2.set('tipo_codigo_modelo_id', recType.id)
        recItem2.set('codigo_material', '10004522')
        recItem2.set('descricao', 'TUBO QUADRADO 40X40X2,65MM SAE 1020')
        recItem2.set('centro', '1001')
        recItem2.set('centro_trabalho', 'WC-DIV-L1')
        recItem2.set('tipo_material', 'ZFER')
        recItem2.set('status', 'Ativo')
        recItem2.set('data_inclusao', new Date().toISOString())
        recItem2.set('usuario_responsavel', 'PCP Engenharia')
        app.save(recItem2)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const colItems = app.findCollectionByNameOrId('sap_model_type_items')
      app.delete(colItems)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('sap_model_types')
      app.delete(col)
    } catch (_) {}
  },
)
