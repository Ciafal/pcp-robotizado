/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000144: Reconciliar schema ao vivo das 3 collections de Resumo por Linha:
 * - pcp_line_summary_configs
 * - pcp_summary_schedule_runs
 * - pcp_summary_recipients
 *
 * Alinha com a definição canônica de 1774000139 / 1774000143:
 * Adiciona campos faltantes, ajusta tipos/opções de select e relaxa 'required' em campos não essenciais.
 * Executa ciclo de prova server-side (create -> update -> delete) com o payload real da tela.
 */
migrate(
  (app) => {
    // -------------------------------------------------------------
    // 1. RECONCILIAÇÃO: pcp_line_summary_configs
    // -------------------------------------------------------------
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
      // Reconciliar campos existentes
      let configsChanged = false

      const expectedTextFields = [
        'empresa_code',
        'linha_id',
        'linha_code',
        'linha_nome',
        'centro_code',
        'centro_nome',
        'template_id',
        'template_code',
        'template_nome',
        'responsavel_geracao_id',
        'responsavel_geracao_nome',
        'programador_pcp_id',
        'programador_pcp_nome',
        'programador_substituto_id',
        'programador_substituto_nome',
        'supervisor_pcp_id',
        'supervisor_pcp_nome',
        'data_referencia_str',
        'data_ultima_geracao',
        'data_ultimo_envio',
        'proxima_execucao',
        'observacoes',
        'finalidade',
      ]

      for (let i = 0; i < expectedTextFields.length; i++) {
        const fName = expectedTextFields[i]
        const existingField = lineConfigsCol.fields.getByName(fName)
        if (!existingField) {
          lineConfigsCol.fields.add(new TextField({ name: fName, required: false }))
          configsChanged = true
        } else {
          // Relaxar required para não travar payloads que omitam campos opcionais
          if (fName !== 'empresa_code' && fName !== 'linha_code' && existingField.required) {
            existingField.required = false
            configsChanged = true
          }
        }
      }

      const expectedBoolFields = [
        'geracao_automatica',
        'exigir_aprovacao',
        'envio_automatico_apos_aprovacao',
      ]

      for (let i = 0; i < expectedBoolFields.length; i++) {
        const fName = expectedBoolFields[i]
        const existingField = lineConfigsCol.fields.getByName(fName)
        if (!existingField) {
          lineConfigsCol.fields.add(new BoolField({ name: fName, required: false }))
          configsChanged = true
        } else if (existingField.required) {
          existingField.required = false
          configsChanged = true
        }
      }

      // Campo JSON: parametros_personalizados
      const paramField = lineConfigsCol.fields.getByName('parametros_personalizados')
      if (!paramField) {
        lineConfigsCol.fields.add(
          new JSONField({ name: 'parametros_personalizados', required: false }),
        )
        configsChanged = true
      } else if (paramField.required) {
        paramField.required = false
        configsChanged = true
      }

      // Select: tipo_resumo
      const tipoResumoExpectedValues = [
        'Resumo Mensal PCP',
        'Resumo Semanal PCP',
        'Resumo Diário PCP',
        'Resumo Quinzenal PCP',
        'Resumo Executivo',
        'Resumo Operacional',
      ]
      const tipoResumoField = lineConfigsCol.fields.getByName('tipo_resumo')
      if (!tipoResumoField) {
        lineConfigsCol.fields.add(
          new SelectField({
            name: 'tipo_resumo',
            required: true,
            values: tipoResumoExpectedValues,
            maxSelect: 1,
          }),
        )
        configsChanged = true
      } else {
        // Garantir que todos os valores esperados estão presentes
        const currentVals = new Set(tipoResumoField.values || [])
        let valsChanged = false
        for (let j = 0; j < tipoResumoExpectedValues.length; j++) {
          if (!currentVals.has(tipoResumoExpectedValues[j])) {
            currentVals.add(tipoResumoExpectedValues[j])
            valsChanged = true
          }
        }
        if (valsChanged) {
          tipoResumoField.values = Array.from(currentVals)
          configsChanged = true
        }
      }

      // Select: periodicidade
      const periodicidadeExpectedValues = [
        'diaria',
        'semanal',
        'quinzenal',
        'mensal',
        'trimestral',
        'sob_demanda',
        'personalizada',
      ]
      const periodicidadeField = lineConfigsCol.fields.getByName('periodicidade')
      if (!periodicidadeField) {
        lineConfigsCol.fields.add(
          new SelectField({
            name: 'periodicidade',
            required: true,
            values: periodicidadeExpectedValues,
            maxSelect: 1,
          }),
        )
        configsChanged = true
      } else {
        const currentVals = new Set(periodicidadeField.values || [])
        let valsChanged = false
        for (let j = 0; j < periodicidadeExpectedValues.length; j++) {
          if (!currentVals.has(periodicidadeExpectedValues[j])) {
            currentVals.add(periodicidadeExpectedValues[j])
            valsChanged = true
          }
        }
        if (valsChanged) {
          periodicidadeField.values = Array.from(currentVals)
          configsChanged = true
        }
      }

      // Select: status
      const statusExpectedValues = ['ATIVO', 'INATIVO', 'SUSPENSO']
      const statusField = lineConfigsCol.fields.getByName('status')
      if (!statusField) {
        lineConfigsCol.fields.add(
          new SelectField({
            name: 'status',
            required: true,
            values: statusExpectedValues,
            maxSelect: 1,
          }),
        )
        configsChanged = true
      } else {
        const currentVals = new Set(statusField.values || [])
        let valsChanged = false
        for (let j = 0; j < statusExpectedValues.length; j++) {
          if (!currentVals.has(statusExpectedValues[j])) {
            currentVals.add(statusExpectedValues[j])
            valsChanged = true
          }
        }
        if (valsChanged) {
          statusField.values = Array.from(currentVals)
          configsChanged = true
        }
      }

      // Regras de API
      if (lineConfigsCol.listRule !== '') {
        lineConfigsCol.listRule = ''
        configsChanged = true
      }
      if (lineConfigsCol.viewRule !== '') {
        lineConfigsCol.viewRule = ''
        configsChanged = true
      }
      if (lineConfigsCol.createRule !== '@request.auth.id != ""') {
        lineConfigsCol.createRule = '@request.auth.id != ""'
        configsChanged = true
      }
      if (lineConfigsCol.updateRule !== '@request.auth.id != ""') {
        lineConfigsCol.updateRule = '@request.auth.id != ""'
        configsChanged = true
      }
      if (lineConfigsCol.deleteRule !== '@request.auth.id != ""') {
        lineConfigsCol.deleteRule = '@request.auth.id != ""'
        configsChanged = true
      }

      if (configsChanged) {
        app.save(lineConfigsCol)
        console.log('Coleção pcp_line_summary_configs reconciliada com sucesso.')
      }
    }

    // -------------------------------------------------------------
    // 2. RECONCILIAÇÃO: pcp_summary_schedule_runs
    // -------------------------------------------------------------
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
      let runsChanged = false
      const expectedRunTextFields = [
        'config_id',
        'config_dedup_key',
        'periodo',
        'linha_code',
        'linha_nome',
        'centro_code',
        'template_id_usado',
        'template_codigo_usado',
        'template_versao_usada',
        'resumo_gerado_id',
        'resumo_codigo',
        'erro',
        'iniciado_em',
        'finalizado_em',
      ]
      for (let i = 0; i < expectedRunTextFields.length; i++) {
        const fn = expectedRunTextFields[i]
        const exF = runsCol.fields.getByName(fn)
        if (!exF) {
          runsCol.fields.add(new TextField({ name: fn, required: false }))
          runsChanged = true
        }
      }

      const expectedRunNumFields = ['tentativas', 'tempo_execucao_ms']
      for (let i = 0; i < expectedRunNumFields.length; i++) {
        const fn = expectedRunNumFields[i]
        const exF = runsCol.fields.getByName(fn)
        if (!exF) {
          runsCol.fields.add(new NumberField({ name: fn, required: false }))
          runsChanged = true
        }
      }

      if (!runsCol.fields.getByName('detalhes_execucao')) {
        runsCol.fields.add(new JSONField({ name: 'detalhes_execucao', required: false }))
        runsChanged = true
      }

      if (runsCol.listRule !== '') {
        runsCol.listRule = ''
        runsChanged = true
      }
      if (runsCol.viewRule !== '') {
        runsCol.viewRule = ''
        runsChanged = true
      }
      if (runsCol.createRule !== '@request.auth.id != ""') {
        runsCol.createRule = '@request.auth.id != ""'
        runsChanged = true
      }
      if (runsCol.updateRule !== '@request.auth.id != ""') {
        runsCol.updateRule = '@request.auth.id != ""'
        runsChanged = true
      }
      if (runsCol.deleteRule !== '@request.auth.id != ""') {
        runsCol.deleteRule = '@request.auth.id != ""'
        runsChanged = true
      }

      if (runsChanged) {
        app.save(runsCol)
        console.log('Coleção pcp_summary_schedule_runs reconciliada.')
      }
    }

    // -------------------------------------------------------------
    // 3. RECONCILIAÇÃO: pcp_summary_recipients
    // -------------------------------------------------------------
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
      let recipChanged = false
      const expectedRecipTextFields = [
        'config_id',
        'linha_code',
        'template_code',
        'tipo_resumo',
        'assunto_template',
        'corpo_template',
      ]
      for (let i = 0; i < expectedRecipTextFields.length; i++) {
        const fn = expectedRecipTextFields[i]
        const exF = recipientsCol.fields.getByName(fn)
        if (!exF) {
          recipientsCol.fields.add(new TextField({ name: fn, required: false }))
          recipChanged = true
        }
      }

      const expectedRecipJsonFields = [
        'usuarios_ids',
        'grupos',
        'setores',
        'emails_autorizados',
        'canais',
      ]
      for (let i = 0; i < expectedRecipJsonFields.length; i++) {
        const fn = expectedRecipJsonFields[i]
        const exF = recipientsCol.fields.getByName(fn)
        if (!exF) {
          recipientsCol.fields.add(new JSONField({ name: fn, required: false }))
          recipChanged = true
        }
      }

      const expectedRecipBoolFields = [
        'anexar_pdf',
        'anexar_pdf_executivo',
        'exigir_confirmacao_leitura',
        'enviar_lembrete',
        'exigir_aprovacao_previa',
      ]
      for (let i = 0; i < expectedRecipBoolFields.length; i++) {
        const fn = expectedRecipBoolFields[i]
        const exF = recipientsCol.fields.getByName(fn)
        if (!exF) {
          recipientsCol.fields.add(new BoolField({ name: fn, required: false }))
          recipChanged = true
        }
      }

      if (!recipientsCol.fields.getByName('prazo_leitura_dias')) {
        recipientsCol.fields.add(new NumberField({ name: 'prazo_leitura_dias', required: false }))
        recipChanged = true
      }

      if (recipientsCol.listRule !== '') {
        recipientsCol.listRule = ''
        recipChanged = true
      }
      if (recipientsCol.viewRule !== '') {
        recipientsCol.viewRule = ''
        recipChanged = true
      }
      if (recipientsCol.createRule !== '@request.auth.id != ""') {
        recipientsCol.createRule = '@request.auth.id != ""'
        recipChanged = true
      }
      if (recipientsCol.updateRule !== '@request.auth.id != ""') {
        recipientsCol.updateRule = '@request.auth.id != ""'
        recipChanged = true
      }
      if (recipientsCol.deleteRule !== '@request.auth.id != ""') {
        recipientsCol.deleteRule = '@request.auth.id != ""'
        recipChanged = true
      }

      if (recipChanged) {
        app.save(recipientsCol)
        console.log('Coleção pcp_summary_recipients reconciliada.')
      }
    }

    // -------------------------------------------------------------
    // 4. CICLO DE PROVA SERVER-SIDE (CREATE -> UPDATE -> DELETE)
    // -------------------------------------------------------------
    // Testa se a collection aceita o payload idêntico ao montado pela tela LineConfigTab.tsx
    const colProof = app.findCollectionByNameOrId('pcp_line_summary_configs')
    let testRecord = null
    try {
      testRecord = new Record(colProof, {
        empresa_code: 'CIAFAL',
        linha_id: '',
        linha_code: 'TESTE-MIG-144',
        linha_nome: 'Linha Teste Migração 144',
        centro_code: 'SDPL',
        centro_nome: 'Sidercentro',
        template_id: '',
        template_code: '',
        template_nome: '',
        tipo_resumo: 'Resumo Mensal PCP',
        responsavel_geracao_id: 's2t7qjmxl2vjgs5',
        responsavel_geracao_nome: 'Administrador Geral CIAFAL',
        programador_pcp_id: 'kfaupzjrg6m2axh',
        programador_pcp_nome: 'Lucas Ferreira (PCP)',
        programador_substituto_id: '',
        programador_substituto_nome: '',
        supervisor_pcp_id: '',
        supervisor_pcp_nome: '',
        geracao_automatica: true,
        exigir_aprovacao: true,
        envio_automatico_apos_aprovacao: false,
        periodicidade: 'mensal',
        parametros_personalizados: {
          intervalo_dias: 30,
          horario: '08:00',
          dia_do_mes: 1,
        },
        data_referencia_str: '',
        status: 'ATIVO',
        observacoes: 'Registro de prova idempotente da migration 1774000144',
        finalidade: 'Validar aceitação de schema server-side',
      })

      app.save(testRecord)
      console.log('CICLO PROVA 144: Registro criado com sucesso, id:', testRecord.id)

      // Teste UPDATE
      testRecord.set('status', 'INATIVO')
      testRecord.set('observacoes', 'Atualizado no ciclo de prova 144')
      app.save(testRecord)
      console.log(
        'CICLO PROVA 144: Registro atualizado com sucesso, status:',
        testRecord.getString('status'),
      )

      // Teste DELETE
      app.delete(testRecord)
      testRecord = null
      console.log(
        'CICLO PROVA 144: Registro deletado com sucesso. Prova server-side 100% aprovada!',
      )
    } catch (err) {
      console.error('CICLO PROVA 144 FALHOU:', err)
      if (err && err.data) {
        console.error('Detalhe da validação dos campos:', JSON.stringify(err.data))
      }
      // Se sobrou registro criado em caso de erro no update, tenta limpar
      if (testRecord && testRecord.id) {
        try {
          app.delete(testRecord)
        } catch (_) {}
      }
      throw err // Repassa o erro para acusar claramente se o schema rejeitar
    }
  },
  (app) => {
    // Reversão segura se necessário (não apaga dados de produção)
    console.log('Rollback migration 1774000144 executado')
  },
)
