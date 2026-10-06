migrate(
  (app) => {
    // 1. Atualizar pcp_indicadores adicionando campo sentido_indicador se ainda não existir
    let indCol = null
    try {
      indCol = app.findCollectionByNameOrId('pcp_indicadores')
    } catch (e) {
      indCol = null
    }

    if (indCol) {
      if (!indCol.fields.getByName('sentido_indicador')) {
        indCol.fields.add(
          new SelectField({
            name: 'sentido_indicador',
            type: 'select',
            values: ['MAIOR_MELHOR', 'MENOR_MELHOR', 'FAIXA_ACEITAVEL'],
            maxSelect: 1,
            required: false,
          }),
        )
      }
      if (!indCol.fields.getByName('faixa_minima')) {
        indCol.fields.add(
          new NumberField({
            name: 'faixa_minima',
            type: 'number',
          }),
        )
      }
      if (!indCol.fields.getByName('faixa_maxima')) {
        indCol.fields.add(
          new NumberField({
            name: 'faixa_maxima',
            type: 'number',
          }),
        )
      }
      app.save(indCol)

      // Atualizar valores padrão de sentido para os indicadores oficiais existentes
      try {
        const records = app.findRecordsByFilter('pcp_indicadores', '1=1', '', 100, 0)
        for (let i = 0; i < records.length; i++) {
          const rec = records[i]
          const cod = rec.getString('codigo')
          const regra = rec.getString('regra_comparacao')
          let sentido = 'MAIOR_MELHOR'
          if (regra === '<=') {
            sentido = 'MENOR_MELHOR'
          } else if (regra === '=') {
            sentido = 'FAIXA_ACEITAVEL'
          }
          if (
            cod === 'IND_06_TEMPO_SETUP' ||
            cod === 'IND_07_FALTA_MP' ||
            cod === 'IND_08_RETRABALHO_REPROGRAMACAO'
          ) {
            sentido = 'MENOR_MELHOR'
          }
          rec.set('sentido_indicador', sentido)
          app.save(rec)
        }
      } catch (err) {
        console.warn('Não foi possível atualizar sentido_indicador nos registros existentes:', err)
      }
    }

    // 2. Collection pcp_indicadores_analises (Análise de Causa Raiz: 5 Porquês, Ishikawa, Causa Raiz, IA)
    let analisesCol = null
    try {
      analisesCol = app.findCollectionByNameOrId('pcp_indicadores_analises')
    } catch (e) {
      analisesCol = null
    }

    if (!analisesCol) {
      analisesCol = new Collection({
        name: 'pcp_indicadores_analises',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'indicador_id', type: 'text', required: true },
          { name: 'indicador_codigo', type: 'text', required: true },
          { name: 'indicador_nome', type: 'text', required: true },
          { name: 'exercicio', type: 'number', required: true },
          { name: 'periodo_analisado', type: 'text', required: true },
          { name: 'mes_index', type: 'number' },
          { name: 'meta', type: 'number', required: true },
          { name: 'realizado', type: 'number', required: true },
          { name: 'desvio_absoluto', type: 'number' },
          { name: 'desvio_percentual', type: 'number' },
          { name: 'tendencia', type: 'text' },
          { name: 'centro', type: 'text' },
          { name: 'linha', type: 'text' },
          { name: 'data_analise', type: 'date', required: true },
          { name: 'usuario_responsavel_id', type: 'text' },
          { name: 'usuario_responsavel_nome', type: 'text' },
          { name: 'usuario_responsavel_email', type: 'text' },
          { name: 'supervisor_nome', type: 'text' },
          { name: 'aprovador_nome', type: 'text' },
          { name: 'descricao_problema', type: 'text' },
          { name: 'ia_evidencias', type: 'json' },
          { name: 'ia_hipoteses', type: 'json' },
          { name: 'ia_dados_faltantes', type: 'json' },
          { name: 'cinco_porques', type: 'json' },
          { name: 'ishikawa_6m', type: 'json' },
          { name: 'causa_raiz', type: 'text' },
          { name: 'metodo_utilizado', type: 'text' },
          { name: 'evidencia_causa_raiz', type: 'text' },
          { name: 'responsavel_validacao', type: 'text' },
          { name: 'data_validacao', type: 'date' },
          { name: 'observacao_validacao', type: 'text' },
          {
            name: 'status_causa_raiz',
            type: 'select',
            values: ['EM_INVESTIGACAO', 'CAUSA_PROVAVEL', 'CAUSA_CONFIRMADA', 'NAO_CONFIRMADA'],
            maxSelect: 1,
          },
          {
            name: 'etapa_atual',
            type: 'number',
          },
          {
            name: 'status_workflow',
            type: 'select',
            values: ['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pcp_ind_analises_codigo ON pcp_indicadores_analises (codigo)',
          'CREATE INDEX idx_pcp_ind_analises_ind ON pcp_indicadores_analises (indicador_codigo, exercicio)',
        ],
      })
      app.save(analisesCol)
    }

    // 3. Collection pcp_indicadores_acoes (Plano 5W2H e Avaliação de Eficácia)
    let acoesCol = null
    try {
      acoesCol = app.findCollectionByNameOrId('pcp_indicadores_acoes')
    } catch (e) {
      acoesCol = null
    }

    if (!acoesCol) {
      acoesCol = new Collection({
        name: 'pcp_indicadores_acoes',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'analise_id', type: 'text', required: true },
          { name: 'analise_codigo', type: 'text', required: true },
          { name: 'indicador_id', type: 'text', required: true },
          { name: 'indicador_codigo', type: 'text', required: true },
          { name: 'indicador_nome', type: 'text', required: true },
          { name: 'exercicio', type: 'number', required: true },
          { name: 'periodo_analisado', type: 'text' },
          { name: 'centro', type: 'text' },
          { name: 'linha', type: 'text' },
          { name: 'desvio_resumo', type: 'text' },
          { name: 'causa_raiz_vinculada', type: 'text' },
          // 5W2H
          { name: 'what_acao', type: 'text', required: true },
          { name: 'why_motivo', type: 'text' },
          { name: 'where_local', type: 'text' },
          { name: 'when_inicio', type: 'date' },
          { name: 'when_prazo', type: 'date', required: true },
          { name: 'who_responsavel_id', type: 'text' },
          { name: 'who_responsavel_nome', type: 'text', required: true },
          { name: 'who_responsavel_email', type: 'text' },
          { name: 'supervisor_nome', type: 'text' },
          { name: 'aprovador_nome', type: 'text' },
          { name: 'how_como', type: 'text' },
          { name: 'how_much_custo_previsto', type: 'number' },
          { name: 'how_much_custo_realizado', type: 'number' },
          {
            name: 'prioridade',
            type: 'select',
            values: ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'status',
            type: 'select',
            values: [
              'NAO_INICIADA',
              'EM_ANDAMENTO',
              'AGUARDANDO',
              'ATRASADA',
              'CONCLUIDA',
              'CANCELADA',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'percentual_concluido', type: 'number' },
          { name: 'evidencia_conclusao', type: 'text' },
          { name: 'observacao', type: 'text' },
          { name: 'data_real_conclusao', type: 'date' },
          // Avaliação de Eficácia
          {
            name: 'situacao_eficacia',
            type: 'select',
            values: ['AGUARDANDO_AVALIACAO', 'EFICAZ', 'PARCIALMENTE_EFICAZ', 'INEFICAZ'],
            maxSelect: 1,
          },
          { name: 'data_avaliacao_eficacia', type: 'date' },
          { name: 'indicador_antes', type: 'number' },
          { name: 'indicador_apos', type: 'number' },
          { name: 'evidencias_eficacia', type: 'text' },
          { name: 'comentario_eficacia', type: 'text' },
          { name: 'responsavel_avaliacao_eficacia', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pcp_ind_acoes_codigo ON pcp_indicadores_acoes (codigo)',
          'CREATE INDEX idx_pcp_ind_acoes_analise ON pcp_indicadores_acoes (analise_codigo)',
          'CREATE INDEX idx_pcp_ind_acoes_status ON pcp_indicadores_acoes (status, when_prazo)',
          'CREATE INDEX idx_pcp_ind_acoes_ind ON pcp_indicadores_acoes (indicador_codigo, exercicio)',
        ],
      })
      app.save(acoesCol)
    }

    // 4. Collection pcp_indicadores_audit_logs (Auditoria imutável detalhada de ações e análises)
    let indAuditCol = null
    try {
      indAuditCol = app.findCollectionByNameOrId('pcp_indicadores_audit_logs')
    } catch (e) {
      indAuditCol = null
    }

    if (!indAuditCol) {
      indAuditCol = new Collection({
        name: 'pcp_indicadores_audit_logs',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'entidade', type: 'text', required: true }, // 'ANALISE' | 'ACAO' | 'INDICADOR'
          { name: 'entidade_id', type: 'text', required: true },
          { name: 'entidade_codigo', type: 'text', required: true },
          { name: 'indicador_codigo', type: 'text' },
          { name: 'acao', type: 'text', required: true },
          { name: 'usuario_id', type: 'text' },
          { name: 'usuario_nome', type: 'text' },
          { name: 'usuario_email', type: 'text' },
          { name: 'origem_alteracao', type: 'text' },
          { name: 'dado_anterior', type: 'json' },
          { name: 'dado_posterior', type: 'json' },
          { name: 'motivo_justificativa', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pcp_ind_audit_ent ON pcp_indicadores_audit_logs (entidade, entidade_codigo, created DESC)',
        ],
      })
      app.save(indAuditCol)
    }
  },
  (app) => {
    try {
      const colAudit = app.findCollectionByNameOrId('pcp_indicadores_audit_logs')
      if (colAudit) app.delete(colAudit)
    } catch (e) {}
    try {
      const colAcoes = app.findCollectionByNameOrId('pcp_indicadores_acoes')
      if (colAcoes) app.delete(colAcoes)
    } catch (e) {}
    try {
      const colAnalises = app.findCollectionByNameOrId('pcp_indicadores_analises')
      if (colAnalises) app.delete(colAnalises)
    } catch (e) {}
  },
)
