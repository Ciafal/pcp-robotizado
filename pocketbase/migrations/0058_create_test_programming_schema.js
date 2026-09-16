migrate(
  (app) => {
    // 1. Coleção test_programming
    const testProgCollection = new Collection({
      name: 'test_programming',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'test_id', type: 'text', required: true },
        { name: 'request_date', type: 'text', required: true },
        { name: 'expected_date', type: 'text', required: true },
        { name: 'company', type: 'text', required: true },
        { name: 'production_line', type: 'text', required: true },
        { name: 'work_center', type: 'text' },
        { name: 'requesting_sector', type: 'text', required: true },
        { name: 'requester_name', type: 'text', required: true },
        { name: 'requester_user_id', type: 'text' },
        { name: 'technical_lead', type: 'text', required: true },
        { name: 'industrial_approver', type: 'text' },
        { name: 'pcp_approver', type: 'text' },
        { name: 'test_type', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'objective', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'justification', type: 'text', required: true },
        {
          name: 'test_category',
          type: 'select',
          required: true,
          values: ['EQUIPAMENTO', 'MATERIA_PRIMA', 'RECEITA_LAMINACAO'],
          maxSelect: 1,
        },
        { name: 'dynamic_category_data', type: 'json' },
        {
          name: 'schedule_impact_type',
          type: 'select',
          required: true,
          values: ['PARADA_TOTAL', 'REDUCAO_RITMO', 'SEM_IMPACTO'],
          maxSelect: 1,
        },
        { name: 'impact_data', type: 'json' },
        { name: 'efficacy_criteria', type: 'json' },
        {
          name: 'efficacy_eval_timing',
          type: 'select',
          values: ['Imediatamente', 'Após 1 turno', '24h', '7 dias', '30 dias', 'data específica'],
          maxSelect: 1,
        },
        { name: 'efficacy_eval_specific_date', type: 'text' },
        {
          name: 'doc_or_target_revision',
          type: 'select',
          values: [
            'Não',
            'Documento',
            'Procedimento',
            'Instrução de Trabalho',
            'Receita AOM',
            'Parâmetro Industrial',
            'Ficha Mestra',
            'Meta',
            'Indicador',
            'Outro',
          ],
          maxSelect: 1,
        },
        { name: 'revision_details', type: 'json' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'Rascunho',
            'Enviado para Aprovação Industrial',
            'Em Aprovação Industrial',
            'Solicitação de Ajustes',
            'Aprovado pela Indústria',
            'Reprovado pela Indústria',
            'Aguardando Aprovação PCP',
            'Em Análise PCP',
            'Aprovado PCP',
            'Reprovado PCP',
            'Solicitação de Reprogramação',
            'Programado',
            'Próximo da Execução',
            'Em Execução',
            'Executado',
            'Aguardando Resultado',
            'Resultado Registrado',
            'Aguardando Avaliação de Eficácia',
            'Em Avaliação de Eficácia',
            'Ação Necessária',
            'Em Tratamento',
            'Concluído',
            'Cancelado',
          ],
          maxSelect: 1,
        },
        { name: 'industrial_approval_decision', type: 'json' },
        { name: 'pcp_approval_decision', type: 'json' },
        { name: 'execution_result', type: 'json' },
        { name: 'efficacy_evaluation', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_tp_test_id ON test_programming (test_id)',
        'CREATE INDEX idx_tp_status ON test_programming (status)',
        'CREATE INDEX idx_tp_line ON test_programming (production_line)',
        'CREATE INDEX idx_tp_category ON test_programming (test_category)',
      ],
    })
    app.save(testProgCollection)

    // 2. Coleção test_programming_log
    const testLogCollection = new Collection({
      name: 'test_programming_log',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'test_programming_id', type: 'text', required: true },
        { name: 'test_id', type: 'text', required: true },
        { name: 'date', type: 'text', required: true },
        { name: 'time', type: 'text', required: true },
        { name: 'user_name', type: 'text', required: true },
        { name: 'user_id', type: 'text' },
        { name: 'user_role', type: 'text' },
        { name: 'action', type: 'text', required: true },
        { name: 'previous_value', type: 'text' },
        { name: 'new_value', type: 'text' },
        { name: 'reason', type: 'text' },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_tpl_test_id ON test_programming_log (test_id)',
        'CREATE INDEX idx_tpl_tp_id ON test_programming_log (test_programming_id)',
        'CREATE INDEX idx_tpl_action ON test_programming_log (action)',
      ],
    })
    app.save(testLogCollection)
  },
  (app) => {
    try {
      const logCol = app.findCollectionByNameOrId('test_programming_log')
      app.delete(logCol)
    } catch (_) {}
    try {
      const progCol = app.findCollectionByNameOrId('test_programming')
      app.delete(progCol)
    } catch (_) {}
  },
)
