migrate(
  (app) => {
    // 1. Coleção de Parâmetros de Saldos Residuais da Carteira de Pedidos (PCP Robotizado)
    if (!app.hasTable('pcp_pedidos_saldo_residual_params')) {
      const col = new Collection({
        name: 'pcp_pedidos_saldo_residual_params',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'operador_saldo', type: 'text', required: true }, // 'MENOR' | 'MENOR_IGUAL' | 'MAIOR' | 'MAIOR_IGUAL' | 'ENTRE'
          { name: 'valor_saldo_t', type: 'number', required: true },
          { name: 'valor_saldo_max_t', type: 'number' },
          { name: 'operador_percentual', type: 'text', required: true }, // 'MENOR' | 'MENOR_IGUAL' | 'MAIOR' | 'MAIOR_IGUAL' | 'ENTRE'
          { name: 'valor_percentual', type: 'number', required: true },
          { name: 'valor_percentual_max', type: 'number' },
          { name: 'relacao_logica', type: 'text', required: true }, // 'OU' | 'E'
          { name: 'ativo', type: 'bool' },
          { name: 'responsavel_nome', type: 'text' },
          { name: 'responsavel_email', type: 'text' },
          { name: 'justificativa', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_pp_srp_ativo ON pcp_pedidos_saldo_residual_params (ativo)'],
      })
      app.save(col)
    }
  },
  (app) => {
    if (app.hasTable('pcp_pedidos_saldo_residual_params')) {
      const col = app.findCollectionByNameOrId('pcp_pedidos_saldo_residual_params')
      app.delete(col)
    }
  },
)
