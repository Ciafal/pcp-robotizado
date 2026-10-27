migrate(
  (app) => {
    // 1. Collection: pcp_line_summary_configs
    let lineConfigsCol = null
    try {
      lineConfigsCol = app.findCollectionByNameOrId('pcp_line_summary_configs')
    } catch (_) {}

    if (!lineConfigsCol) {
      lineConfigsCol = new Collection({
        name: 'pcp_line_summary_configs',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'empresa_code', type: 'text', required: true },
          { name: 'linha_id', type: 'text', required: false },
          { name: 'linha_code', type: 'text', required: true },
          { name: 'linha_nome', type: 'text', required: false },
          { name: 'centro_code', type: 'text', required: false },
          { name: 'centro_nome', type: 'text', required: false },
          { name: 'template_id', type: 'text', required: false },
          { name: 'template_code', type: 'text', required: false },
          { name: 'template_nome', type: 'text', required: false },
          {
            name: 'tipo_resumo',
            type: 'select',
            required: true,
            values: [
              'Resumo Mensal PCP',
              'Resumo Semanal PCP',
              'Resumo Diário PCP',
              'Resumo Quinzenal PCP',
              'Resumo Executivo',
              'Resumo Operacional',
            ],
            maxSelect: 1,
          },
          { name: 'responsavel_geracao_id', type: 'text', required: false },
          { name: 'responsavel_geracao_nome', type: 'text', required: false },
          { name: 'programador_pcp_id', type: 'text', required: false },
          { name: 'programador_pcp_nome', type: 'text', required: false },
          { name: 'programador_substituto_id', type: 'text', required: false },
          { name: 'programador_substituto_nome', type: 'text', required: false },
          { name: 'supervisor_pcp_id', type: 'text', required: false },
          { name: 'supervisor_pcp_nome', type: 'text', required: false },
          { name: 'geracao_automatica', type: 'bool', required: false },
          { name: 'exigir_aprovacao', type: 'bool', required: false },
          { name: 'envio_automatico_apos_aprovacao', type: 'bool', required: false },
          {
            name: 'periodicidade',
            type: 'select',
            required: true,
            values: [
              'diaria',
              'semanal',
              'quinzenal',
              'mensal',
              'trimestral',
              'sob_demanda',
              'personalizada',
            ],
            maxSelect: 1,
          },
          { name: 'parametros_personalizados', type: 'json', required: false },
          { name: 'data_referencia_str', type: 'text', required: false },
          { name: 'data_ultima_geracao', type: 'text', required: false },
          { name: 'data_ultimo_envio', type: 'text', required: false },
          { name: 'proxima_execucao', type: 'text', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ATIVO', 'INATIVO', 'SUSPENSO'],
            maxSelect: 1,
          },
          { name: 'observacoes', type: 'text', required: false },
          { name: 'finalidade', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_plsc_linha ON pcp_line_summary_configs (linha_code, status)',
          'CREATE INDEX idx_plsc_exec ON pcp_line_summary_configs (status, geracao_automatica, proxima_execucao)',
          'CREATE INDEX idx_plsc_centro ON pcp_line_summary_configs (centro_code, empresa_code)',
        ],
      })
      app.save(lineConfigsCol)
    } else {
      // Garantir regras abertas para PCP_PROGRAMMER e autenticados
      lineConfigsCol.listRule = ''
      lineConfigsCol.viewRule = ''
      lineConfigsCol.createRule = '@request.auth.id != ""'
      lineConfigsCol.updateRule = '@request.auth.id != ""'
      lineConfigsCol.deleteRule = '@request.auth.id != ""'
      app.save(lineConfigsCol)
    }

    // 2. Collection: pcp_summary_schedule_runs
    let runsCol = null
    try {
      runsCol = app.findCollectionByNameOrId('pcp_summary_schedule_runs')
    } catch (_) {}

    if (!runsCol) {
      runsCol = new Collection({
        name: 'pcp_summary_schedule_runs',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'config_id', type: 'text', required: true },
          { name: 'config_dedup_key', type: 'text', required: true },
          { name: 'periodo', type: 'text', required: true },
          { name: 'linha_code', type: 'text', required: true },
          { name: 'linha_nome', type: 'text', required: false },
          { name: 'centro_code', type: 'text', required: false },
          { name: 'template_id_usado', type: 'text', required: false },
          { name: 'template_codigo_usado', type: 'text', required: false },
          { name: 'template_versao_usada', type: 'text', required: false },
          { name: 'resumo_gerado_id', type: 'text', required: false },
          { name: 'resumo_codigo', type: 'text', required: false },
          { name: 'tentativas', type: 'number', required: false },
          { name: 'erro', type: 'text', required: false },
          {
            name: 'origem',
            type: 'select',
            required: true,
            values: ['manual', 'automatica', 'reprocessamento'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['PENDENTE', 'EM_EXECUCAO', 'SUCESSO', 'FALHA', 'REPROCESSADO', 'CANCELADO'],
            maxSelect: 1,
          },
          { name: 'iniciado_em', type: 'text', required: false },
          { name: 'finalizado_em', type: 'text', required: false },
          { name: 'tempo_execucao_ms', type: 'number', required: false },
          { name: 'detalhes_execucao', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pssr_dedup ON pcp_summary_schedule_runs (config_dedup_key)',
          'CREATE INDEX idx_pssr_config_status ON pcp_summary_schedule_runs (config_id, status)',
          'CREATE INDEX idx_pssr_periodo ON pcp_summary_schedule_runs (periodo, linha_code)',
        ],
      })
      app.save(runsCol)
    } else {
      runsCol.listRule = ''
      runsCol.viewRule = ''
      runsCol.createRule = '@request.auth.id != ""'
      runsCol.updateRule = '@request.auth.id != ""'
      runsCol.deleteRule = '@request.auth.id != ""'
      app.save(runsCol)
    }

    // 3. Collection: pcp_summary_recipients
    let recipientsCol = null
    try {
      recipientsCol = app.findCollectionByNameOrId('pcp_summary_recipients')
    } catch (_) {}

    if (!recipientsCol) {
      recipientsCol = new Collection({
        name: 'pcp_summary_recipients',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'config_id', type: 'text', required: false },
          { name: 'linha_code', type: 'text', required: false },
          { name: 'template_code', type: 'text', required: false },
          { name: 'tipo_resumo', type: 'text', required: false },
          { name: 'usuarios_ids', type: 'json', required: false },
          { name: 'grupos', type: 'json', required: false },
          { name: 'setores', type: 'json', required: false },
          { name: 'emails_autorizados', type: 'json', required: false },
          { name: 'assunto_template', type: 'text', required: false },
          { name: 'corpo_template', type: 'text', required: false },
          { name: 'anexar_pdf', type: 'bool', required: false },
          { name: 'anexar_pdf_executivo', type: 'bool', required: false },
          { name: 'exigir_confirmacao_leitura', type: 'bool', required: false },
          { name: 'enviar_lembrete', type: 'bool', required: false },
          { name: 'prazo_leitura_dias', type: 'number', required: false },
          { name: 'exigir_aprovacao_previa', type: 'bool', required: false },
          { name: 'canais', type: 'json', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ATIVO', 'INATIVO'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_precip_config ON pcp_summary_recipients (config_id, status)',
          'CREATE INDEX idx_precip_linha ON pcp_summary_recipients (linha_code, template_code)',
        ],
      })
      app.save(recipientsCol)
    } else {
      recipientsCol.listRule = ''
      recipientsCol.viewRule = ''
      recipientsCol.createRule = '@request.auth.id != ""'
      recipientsCol.updateRule = '@request.auth.id != ""'
      recipientsCol.deleteRule = '@request.auth.id != ""'
      app.save(recipientsCol)
    }
  },
  (app) => {},
)
