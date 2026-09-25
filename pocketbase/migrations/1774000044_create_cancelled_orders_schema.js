migrate(
  (app) => {
    // 1. Coleção de Categorias e Motivos Gerenciais Parametrizáveis
    if (!app.hasTable('pcp_cancellation_reasons_catalog')) {
      const reasonsCol = new Collection({
        name: 'pcp_cancellation_reasons_catalog',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'category', type: 'text', required: true },
          { name: 'reason', type: 'text', required: true },
          { name: 'default_probable_responsibility', type: 'text' },
          { name: 'active', type: 'bool' },
          { name: 'sort_order', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_canc_reasons_cat ON pcp_cancellation_reasons_catalog (category)',
          'CREATE INDEX idx_canc_reasons_reason ON pcp_cancellation_reasons_catalog (reason)',
        ],
      })
      app.save(reasonsCol)
    }

    // 2. Coleção Oficial de Pedidos Cancelados
    if (!app.hasTable('pcp_cancelled_orders')) {
      const ordersCol = new Collection({
        name: 'pcp_cancelled_orders',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'empresa', type: 'text', required: true },
          { name: 'centro', type: 'text', required: true },
          { name: 'linha', type: 'text', required: true },
          { name: 'ordem_venda', type: 'text', required: true },
          { name: 'item_ordem', type: 'text', required: true },
          { name: 'data_ordem', type: 'text', required: true },
          { name: 'cliente_codigo', type: 'text' },
          { name: 'cliente_nome', type: 'text', required: true },
          { name: 'representante_vendedor', type: 'text' },
          { name: 'material_codigo', type: 'text', required: true },
          { name: 'material_descricao', type: 'text', required: true },
          { name: 'familia', type: 'text' },
          { name: 'curva_abc', type: 'text' },
          { name: 'tipo_carteira', type: 'text' },
          { name: 'quantidade_original_ov_t', type: 'number' },
          { name: 'quantidade_faturada_t', type: 'number' },
          { name: 'saldo_cancelado_t', type: 'number', required: true },
          { name: 'unidade_medida', type: 'text' },
          { name: 'estoque_disponivel_data_t', type: 'number' },
          { name: 'preco_liquido', type: 'number' },
          { name: 'valor_cancelado_brl', type: 'number', required: true },
          { name: 'condicao_pagamento', type: 'text' },
          { name: 'prazo', type: 'text' },
          { name: 'status_faturamento', type: 'text' },
          { name: 'data_desejada_cliente', type: 'text' },
          { name: 'data_prevista_producao', type: 'text' },
          { name: 'data_efetiva_producao', type: 'text' },
          { name: 'status_recusa', type: 'text' },
          { name: 'motivo_original_sap', type: 'text', required: true },
          { name: 'categoria_motivo', type: 'text' },
          { name: 'observacao', type: 'text' },
          { name: 'data_hora_cancelamento', type: 'text' },
          { name: 'usuario_operacao', type: 'text' },
          { name: 'is_demo', type: 'bool' },
          // Análise da IA
          { name: 'has_ai_inconsistency', type: 'bool' },
          { name: 'ai_verification_status', type: 'text' },
          { name: 'ai_probable_cause', type: 'text' },
          { name: 'ai_suggested_responsibility', type: 'text' },
          { name: 'ai_confidence_level', type: 'text' }, // Alta, Média, Baixa, Dados insuficientes
          { name: 'ai_avoidable_status', type: 'text' }, // Potencialmente evitável, Provavelmente não evitável, Necessita investigação
          { name: 'ai_priority', type: 'text' }, // Crítica, Alta, Média, Baixa
          { name: 'ai_action_suggested', type: 'text' },
          { name: 'ai_analysis_payload', type: 'json' },
          // Validação e Governança Humana
          { name: 'analysis_status', type: 'text' }, // Pendente, Em Análise, Validado, Rejeitado, Ação Criada
          { name: 'validated_cause', type: 'text' },
          { name: 'validated_responsibility', type: 'text' },
          { name: 'validated_by_user_name', type: 'text' },
          { name: 'validated_at', type: 'text' },
          { name: 'human_notes', type: 'text' },
          { name: 'action_plan_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_canc_orders_num ON pcp_cancelled_orders (ordem_venda, item_ordem)',
          'CREATE INDEX idx_canc_orders_mat ON pcp_cancelled_orders (material_codigo)',
          'CREATE INDEX idx_canc_orders_cli ON pcp_cancelled_orders (cliente_codigo)',
          'CREATE INDEX idx_canc_orders_line ON pcp_cancelled_orders (linha, centro)',
          'CREATE INDEX idx_canc_orders_dt ON pcp_cancelled_orders (data_ordem)',
        ],
      })
      app.save(ordersCol)
    }

    // 3. Coleção de Ações / 5W2H de Pedidos Cancelados
    if (!app.hasTable('pcp_cancelled_action_plans')) {
      const actionPlanCol = new Collection({
        name: 'pcp_cancelled_action_plans',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'order_id', type: 'text', required: true },
          { name: 'ordem_venda', type: 'text', required: true },
          { name: 'item_ordem', type: 'text', required: true },
          { name: 'cliente_nome', type: 'text' },
          { name: 'material_codigo', type: 'text' },
          { name: 'motivo_original', type: 'text' },
          { name: 'causa_provavel', type: 'text' },
          { name: 'evidencias', type: 'text' },
          { name: 'centro_linha', type: 'text' },
          { name: 'impacto_toneladas', type: 'number' },
          { name: 'impacto_financeiro_brl', type: 'number' },
          { name: 'what_acao', type: 'text', required: true },
          { name: 'why_motivo', type: 'text' },
          { name: 'who_responsavel', type: 'text', required: true },
          { name: 'when_prazo', type: 'text', required: true },
          { name: 'where_local', type: 'text' },
          { name: 'how_como', type: 'text' },
          { name: 'how_much_custo', type: 'text' },
          { name: 'status', type: 'text' }, // Aberto, Em Andamento, Concluído, Cancelado
          { name: 'created_by_name', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_canc_action_code ON pcp_cancelled_action_plans (code)',
          'CREATE INDEX idx_canc_action_order ON pcp_cancelled_action_plans (ordem_venda)',
        ],
      })
      app.save(actionPlanCol)
    }
  },
  (app) => {
    try {
      const c1 = app.findCollectionByNameOrId('pcp_cancelled_action_plans')
      app.delete(c1)
    } catch (_) {}
    try {
      const c2 = app.findCollectionByNameOrId('pcp_cancelled_orders')
      app.delete(c2)
    } catch (_) {}
    try {
      const c3 = app.findCollectionByNameOrId('pcp_cancellation_reasons_catalog')
      app.delete(c3)
    } catch (_) {}
  },
)
