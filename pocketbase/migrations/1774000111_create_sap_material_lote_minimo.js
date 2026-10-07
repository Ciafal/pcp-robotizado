migrate(
  (app) => {
    // 1. Criar réplica/cache sap_material_lote_minimo no HUB CIAFAL
    if (!app.hasTable('sap_material_lote_minimo')) {
      const col = new Collection({
        name: 'sap_material_lote_minimo',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'codigo_material', type: 'text', required: true, min: 1 },
          { name: 'descricao_material', type: 'text', required: false },
          { name: 'lote_minimo', type: 'number', required: true },
          { name: 'unidade_medida', type: 'text', required: false },
          { name: 'last_sync', type: 'date', required: false },
          { name: 'rfc_execucao', type: 'text', required: false },
          { name: 'origem', type: 'text', required: false },
          { name: 'valor_anterior', type: 'number', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_smlm_codigo ON sap_material_lote_minimo (codigo_material)',
          'CREATE INDEX idx_smlm_sync ON sap_material_lote_minimo (last_sync)',
        ],
      })
      app.save(col)
    }

    // 2. Criar coleção de histórico/auditoria de sincronização de lote mínimo SAP RFC
    if (!app.hasTable('sap_material_lote_minimo_logs')) {
      const logCol = new Collection({
        name: 'sap_material_lote_minimo_logs',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'codigo_material', type: 'text', required: true },
          { name: 'valor_anterior', type: 'number', required: false },
          { name: 'novo_valor', type: 'number', required: true },
          { name: 'data_hora', type: 'date', required: true },
          { name: 'rfc_execucao', type: 'text', required: false },
          { name: 'resultado', type: 'text', required: false },
          { name: 'origem', type: 'text', required: true }, // "Integração SAP RFC"
          { name: 'payload_snapshot', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_smlml_mat ON sap_material_lote_minimo_logs (codigo_material)',
          'CREATE INDEX idx_smlml_dt ON sap_material_lote_minimo_logs (data_hora)',
        ],
      })
      app.save(logCol)
    }
  },
  (app) => {
    try {
      const logCol = app.findCollectionByNameOrId('sap_material_lote_minimo_logs')
      if (logCol) app.delete(logCol)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('sap_material_lote_minimo')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
