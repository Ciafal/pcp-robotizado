migrate(
  (app) => {
    // 1. Coleção de Parâmetros de Saldos Residuais por Depósito
    if (!app.hasTable('pcp_residual_balance_parameters')) {
      const colParams = new Collection({
        name: 'pcp_residual_balance_parameters',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'deposito', type: 'text', required: true },
          { name: 'deposito_nome', type: 'text', required: false },
          { name: 'descricao', type: 'text', required: true },
          {
            name: 'tipo_regra',
            type: 'select',
            required: true,
            values: [
              'MENOR_OU_IGUAL',
              'MENOR_QUE',
              'MAIOR_OU_IGUAL',
              'MAIOR_QUE',
              'FAIXA_QUANTIDADE',
            ],
          },
          { name: 'quantidade', type: 'number', required: false },
          { name: 'quantidade_min', type: 'number', required: false },
          { name: 'quantidade_max', type: 'number', required: false },
          { name: 'unidade_medida', type: 'text', required: true },
          { name: 'acao_recomendada', type: 'text', required: true },
          { name: 'acao_detalhe', type: 'text', required: false },
          { name: 'responsavel_acao', type: 'text', required: false },
          { name: 'prazo_valor', type: 'number', required: false },
          {
            name: 'prazo_unidade',
            type: 'select',
            required: false,
            values: ['HORAS', 'DIAS'],
          },
          {
            name: 'criticidade',
            type: 'select',
            required: true,
            values: ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'],
          },
          { name: 'ativo', type: 'bool', required: false },
          { name: 'excluido_logico', type: 'bool', required: false },
          { name: 'criado_por_id', type: 'text', required: false },
          { name: 'criado_por_nome', type: 'text', required: false },
          { name: 'atualizado_por_id', type: 'text', required: false },
          { name: 'atualizado_por_nome', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_prbp_dep ON pcp_residual_balance_parameters (deposito)',
          'CREATE INDEX idx_prbp_ativo ON pcp_residual_balance_parameters (ativo)',
          'CREATE INDEX idx_prbp_crit ON pcp_residual_balance_parameters (criticidade)',
          'CREATE INDEX idx_prbp_del ON pcp_residual_balance_parameters (excluido_logico)',
        ],
      })
      app.save(colParams)
    }

    // 2. Coleção de Registros de Saldos Residuais Identificados / Snapshot
    if (!app.hasTable('pcp_residual_balances')) {
      const colSaldos = new Collection({
        name: 'pcp_residual_balances',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'deposito', type: 'text', required: true },
          { name: 'deposito_nome', type: 'text', required: false },
          { name: 'material_codigo', type: 'text', required: true },
          { name: 'material_descricao', type: 'text', required: false },
          { name: 'lote', type: 'text', required: true },
          { name: 'quantidade_atual', type: 'number', required: true },
          { name: 'unidade_medida', type: 'text', required: true },
          { name: 'limite_parametrizado', type: 'number', required: false },
          { name: 'diferenca', type: 'number', required: false },
          { name: 'data_identificacao', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'DENTRO_PARAMETRO',
              'SALDO_RESIDUAL_IDENTIFICADO',
              'ACAO_NECESSARIA',
              'EM_TRATAMENTO',
              'REGULARIZADO',
              'REGULARIZADO_AUTOMATICO',
            ],
          },
          { name: 'regra_aplicada_id', type: 'text', required: false },
          { name: 'regra_aplicada_descricao', type: 'text', required: false },
          { name: 'regras_atingidas', type: 'json', required: false },
          { name: 'acao_recomendada', type: 'text', required: false },
          { name: 'responsavel_acao', type: 'text', required: false },
          { name: 'criticidade', type: 'text', required: false },
          { name: 'prazo_display', type: 'text', required: false },
          { name: 'ultima_atualizacao_origem', type: 'text', required: false },
          { name: 'quantidade_anterior', type: 'number', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_prb_dep ON pcp_residual_balances (deposito)',
          'CREATE INDEX idx_prb_mat ON pcp_residual_balances (material_codigo)',
          'CREATE INDEX idx_prb_lote ON pcp_residual_balances (lote)',
          'CREATE INDEX idx_prb_status ON pcp_residual_balances (status)',
          'CREATE INDEX idx_prb_dep_lote ON pcp_residual_balances (deposito, lote)',
        ],
      })
      app.save(colSaldos)
    }

    // 3. Coleção de Histórico e Ações de Tratamento de Saldos Residuais
    if (!app.hasTable('pcp_residual_balance_actions')) {
      const colActions = new Collection({
        name: 'pcp_residual_balance_actions',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'saldo_id', type: 'text', required: true },
          { name: 'deposito', type: 'text', required: true },
          { name: 'material_codigo', type: 'text', required: true },
          { name: 'material_descricao', type: 'text', required: false },
          { name: 'lote', type: 'text', required: true },
          { name: 'quantidade_residual', type: 'number', required: true },
          { name: 'unidade_medida', type: 'text', required: true },
          { name: 'regra_aplicada', type: 'text', required: false },
          { name: 'acao_prevista', type: 'text', required: false },
          { name: 'acao_realizada', type: 'text', required: true },
          { name: 'responsavel', type: 'text', required: true },
          { name: 'data_acao', type: 'text', required: true },
          { name: 'status_anterior', type: 'text', required: false },
          { name: 'status_novo', type: 'text', required: true },
          { name: 'observacao', type: 'text', required: false },
          { name: 'usuario_id', type: 'text', required: false },
          { name: 'usuario_nome', type: 'text', required: false },
          { name: 'usuario_email', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_prba_saldo ON pcp_residual_balance_actions (saldo_id)',
          'CREATE INDEX idx_prba_dep_lote ON pcp_residual_balance_actions (deposito, lote)',
          'CREATE INDEX idx_prba_dt ON pcp_residual_balance_actions (data_acao)',
        ],
      })
      app.save(colActions)
    }

    // 4. Cadastrar Permissões RBAC na tabela pcp_permissions se ela existir
    if (app.hasTable('pcp_permissions')) {
      const permsCol = app.findCollectionByNameOrId('pcp_permissions')
      const newPerms = [
        {
          name: 'Consultar Saldos Residuais',
          key: 'pcp.residual_balances.view',
          category: 'Controle de Produção',
          description:
            'Permite consultar visão geral de depósitos, relação detalhada e histórico de saldos residuais.',
          is_critical: false,
        },
        {
          name: 'Registrar Tratamento de Saldos Residuais',
          key: 'pcp.residual_balances.treat',
          category: 'Controle de Produção',
          description:
            'Permite registrar ações operacionais e alterar status para Ação necessária ou Em tratamento.',
          is_critical: false,
        },
        {
          name: 'Gerenciar Parâmetros de Saldos Residuais',
          key: 'pcp.residual_balances.parameters',
          category: 'Controle de Produção',
          description:
            'Permite cadastrar, editar, ativar/inativar e excluir logicamente parâmetros de saldos residuais por depósito.',
          is_critical: true,
        },
        {
          name: 'Regularizar Saldos Residuais',
          key: 'pcp.residual_balances.regularize',
          category: 'Controle de Produção',
          description:
            'Permite dar quitação formal e regularizar saldos residuais exigindo responsável e ação realizada.',
          is_critical: true,
        },
      ]

      newPerms.forEach((p) => {
        try {
          const existing = app.findFirstRecordByFilter('pcp_permissions', `key = '${p.key}'`)
          if (!existing) {
            const rec = new Record(permsCol)
            rec.set('name', p.name)
            rec.set('key', p.key)
            rec.set('category', p.category)
            rec.set('description', p.description)
            rec.set('is_critical', p.is_critical)
            app.save(rec)
          }
        } catch (_) {}
      })
    }

    // 5. Cadastrar no catálogo de integrações SAP (sap_integration_catalog) se existir
    if (app.hasTable('sap_integration_catalog')) {
      const catCol = app.findCollectionByNameOrId('sap_integration_catalog')
      const entryCode = 'RFC_SAP_RESIDUAL_STOCK_BALANCES'
      try {
        const existing = app.findFirstRecordByFilter(
          'sap_integration_catalog',
          `code = '${entryCode}'`,
        )
        if (!existing) {
          const rec = new Record(catCol)
          rec.set('code', entryCode)
          rec.set(
            'description',
            'Consulta RFC/BAPI de Saldos de Estoque por Depósito e Lote (Equivalente MMBE/MARD)',
          )
          rec.set('function_name', 'BAPI_MATERIAL_STOCK_REQ_LIST')
          rec.set('integration_type', 'RFC_BAPI')
          rec.set('standard_or_z', 'STANDARD')
          rec.set('source_object', 'MARD / MCHB / T001L')
          rec.set('active', true)
          rec.set('last_status', 'INDISPONIVEL')
          rec.set(
            'last_error_message',
            'Pendente de homologação de endpoint RFC SAP no Gateway CIAFAL',
          )
          app.save(rec)
        }
      } catch (_) {}
    }
  },
  (app) => {
    try {
      const c3 = app.findCollectionByNameOrId('pcp_residual_balance_actions')
      if (c3) app.delete(c3)
    } catch (_) {}
    try {
      const c2 = app.findCollectionByNameOrId('pcp_residual_balances')
      if (c2) app.delete(c2)
    } catch (_) {}
    try {
      const c1 = app.findCollectionByNameOrId('pcp_residual_balance_parameters')
      if (c1) app.delete(c1)
    } catch (_) {}
  },
)
