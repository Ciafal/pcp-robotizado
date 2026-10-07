migrate(
  (app) => {
    // 1. Criar coleção mto_requirements (estrutura com grupos técnicos e auditoria futura)
    if (!app.hasTable('mto_requirements')) {
      const col = new Collection({
        name: 'mto_requirements',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          // Identificação e Chaves de Relacionamento 1:N
          { name: 'requisito_id', type: 'text', required: true, min: 1 }, // ex: "REQ-01", "REQ-02"
          { name: 'requisito_numero', type: 'number', required: false }, // 1, 2, ...
          { name: 'pedido_numero', type: 'text', required: true, min: 1 }, // ex: "50000499"
          { name: 'item_pedido', type: 'text', required: true, min: 1 }, // ex: "10"
          { name: 'codigo_documento', type: 'text', required: false },
          { name: 'cliente_nome', type: 'text', required: false },
          { name: 'produto', type: 'text', required: false },
          { name: 'aplicacao', type: 'text', required: false },
          { name: 'classe_aco', type: 'text', required: false },
          { name: 'responsavel_consulta', type: 'text', required: false },
          { name: 'norma_aplicavel', type: 'text', required: false },
          { name: 'numero_pecas', type: 'number', required: false },
          { name: 'quantidade', type: 'number', required: false },
          { name: 'data_consulta', type: 'text', required: false },
          { name: 'descricao_material', type: 'text', required: false },

          // Grupo 2: Requisitos do Produto (condição é texto livre)
          { name: 'condicao', type: 'text', required: false },

          // Grupos Técnicos Estruturados Separados (JSON por grupo para auditoria/integração)
          { name: 'composicao_quimica', type: 'json', required: false },
          { name: 'dimensoes_tolerancias', type: 'json', required: false },
          { name: 'comprimento', type: 'json', required: false },
          { name: 'garantias_superficie', type: 'json', required: false },
          { name: 'garantias_internas', type: 'json', required: false },
          { name: 'garantias_especificas', type: 'json', required: false },
          { name: 'politica_qualidade', type: 'text', required: false },

          // Auditoria e Rastreabilidade
          { name: 'origem_dados', type: 'text', required: false },
          { name: 'criado_por_usuario', type: 'text', required: false },
          { name: 'atualizado_por_usuario', type: 'text', required: false },
          { name: 'auditoria_historico', type: 'json', required: false },

          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mto_req_ped_item ON mto_requirements (pedido_numero, item_pedido)',
          'CREATE INDEX idx_mto_req_ped ON mto_requirements (pedido_numero)',
          'CREATE INDEX idx_mto_req_doc ON mto_requirements (codigo_documento)',
        ],
      })
      app.save(col)
    }

    // 2. Criar coleção de auditoria/log de requisitos MTO
    if (!app.hasTable('mto_requirements_logs')) {
      const logCol = new Collection({
        name: 'mto_requirements_logs',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'pedido_numero', type: 'text', required: true },
          { name: 'item_pedido', type: 'text', required: true },
          { name: 'requisito_id', type: 'text', required: false },
          { name: 'acao', type: 'text', required: true }, // CRIACAO, EDICAO, IMPORTACAO
          { name: 'origem', type: 'text', required: true },
          { name: 'usuario', type: 'text', required: false },
          { name: 'valores_anteriores', type: 'json', required: false },
          { name: 'valores_posteriores', type: 'json', required: false },
          { name: 'data_hora', type: 'text', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mto_log_ped_item ON mto_requirements_logs (pedido_numero, item_pedido)',
        ],
      })
      app.save(logCol)
    }
  },
  (app) => {
    try {
      const logCol = app.findCollectionByNameOrId('mto_requirements_logs')
      if (logCol) app.delete(logCol)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('mto_requirements')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
