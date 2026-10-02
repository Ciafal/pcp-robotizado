migrate(
  (app) => {
    // 1. checklist_fechamento_modelos — cadastro mestre das atividades
    if (!app.hasTable('checklist_fechamento_modelos')) {
      const modelosCol = new Collection({
        name: 'checklist_fechamento_modelos',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // Proibido exclusão física — preservar histórico
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'sequencia', type: 'number' },
          { name: 'titulo', type: 'text', required: true },
          { name: 'descricao_detalhada', type: 'text' },
          { name: 'categoria', type: 'text' },
          { name: 'linha_centro_relacionado', type: 'text' },
          { name: 'empresa', type: 'text' },
          { name: 'transacao_sap', type: 'text' },
          { name: 'deposito_sap', type: 'text' },
          {
            name: 'frequencia',
            type: 'select',
            values: ['diaria', 'semanal', 'mensal', 'somente_fechamento'],
            maxSelect: 1,
          },
          { name: 'obrigatoria', type: 'bool' },
          { name: 'responsavel_padrao', type: 'text' },
          { name: 'area_responsavel', type: 'text' },
          { name: 'prazo_relativo_fechamento', type: 'text' },
          { name: 'manual_documento_referencia', type: 'text' },
          { name: 'regra_validacao', type: 'text' },
          { name: 'campo_observacao', type: 'text' },
          { name: 'permite_evidencia', type: 'bool' },
          { name: 'ativa', type: 'bool' },
          { name: 'data_inicio_vigencia', type: 'text' },
          { name: 'data_fim_vigencia', type: 'text' },
          {
            name: 'fonte_dados',
            type: 'select',
            values: ['Manual', 'SAP RFC', 'MES', 'Integração HUB'],
            maxSelect: 1,
          },
          { name: 'status_regra', type: 'text' }, // Ex: "Oficial", "Regra em validação", "Pendente de validação de processo"
          { name: 'metadata', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_cfm_codigo ON checklist_fechamento_modelos (codigo)',
          'CREATE INDEX idx_cfm_ativa ON checklist_fechamento_modelos (ativa)',
          'CREATE INDEX idx_cfm_seq ON checklist_fechamento_modelos (sequencia)',
        ],
      })
      app.save(modelosCol)
    }

    // 2. checklist_fechamento_feriados — calendário de feriados corporativos
    if (!app.hasTable('checklist_fechamento_feriados')) {
      const feriadosCol = new Collection({
        name: 'checklist_fechamento_feriados',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'data', type: 'text', required: true }, // YYYY-MM-DD
          { name: 'descricao', type: 'text', required: true },
          {
            name: 'tipo',
            type: 'select',
            values: ['Nacional', 'Estadual', 'Municipal', 'Corporativo', 'Ponte'],
            maxSelect: 1,
          },
          { name: 'ano', type: 'number' },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_cff_data ON checklist_fechamento_feriados (data)',
          'CREATE INDEX idx_cff_ano ON checklist_fechamento_feriados (ano)',
        ],
      })
      app.save(feriadosCol)
    }

    // 3. checklist_fechamento_execucoes — competências mensais
    if (!app.hasTable('checklist_fechamento_execucoes')) {
      const execucoesCol = new Collection({
        name: 'checklist_fechamento_execucoes',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // NUNCA apagar execuções realizadas
        fields: [
          { name: 'competencia', type: 'text', required: true }, // MM/AAAA
          { name: 'ano', type: 'number' },
          { name: 'mes', type: 'number' },
          { name: 'empresa', type: 'text' },
          { name: 'linha_centro', type: 'text' },
          { name: 'responsavel', type: 'text' },
          { name: 'responsavel_id', type: 'text' },
          { name: 'data_inicio', type: 'text' },
          { name: 'data_limite', type: 'text' }, // 2º dia útil do mês seguinte
          {
            name: 'status_geral',
            type: 'select',
            values: ['Pendente', 'Em andamento', 'Com erro', 'Aguardando fechamento', 'Fechado'],
            maxSelect: 1,
          },
          { name: 'data_fechamento', type: 'text' },
          { name: 'fechado_por', type: 'text' },
          { name: 'percentual_concluido', type: 'number' },
          { name: 'total_atividades', type: 'number' },
          { name: 'total_ok', type: 'number' },
          { name: 'total_erro', type: 'number' },
          { name: 'total_pendente', type: 'number' },
          { name: 'total_obrigatorias', type: 'number' },
          { name: 'ordens_fechadas', type: 'number' },
          { name: 'ordens_pendentes', type: 'number' },
          { name: 'snapshot_regras', type: 'json' }, // Snapshot das regras vigentes na geração
          { name: 'observacoes_gerais', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_cfe_comp_emp ON checklist_fechamento_execucoes (competencia, empresa)',
          'CREATE INDEX idx_cfe_status ON checklist_fechamento_execucoes (status_geral)',
        ],
      })
      app.save(execucoesCol)
    }

    // 4. checklist_fechamento_itens — instâncias de atividades por fechamento
    if (!app.hasTable('checklist_fechamento_itens')) {
      const itensCol = new Collection({
        name: 'checklist_fechamento_itens',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // Preservação integral
        fields: [
          { name: 'execucao_id', type: 'text', required: true },
          { name: 'competencia', type: 'text', required: true },
          { name: 'modelo_id', type: 'text' },
          { name: 'codigo', type: 'text', required: true },
          { name: 'sequencia', type: 'number' },
          { name: 'titulo', type: 'text', required: true },
          { name: 'descricao_detalhada', type: 'text' },
          { name: 'categoria', type: 'text' },
          { name: 'linha_centro_relacionado', type: 'text' },
          { name: 'empresa', type: 'text' },
          { name: 'transacao_sap', type: 'text' },
          { name: 'deposito_sap', type: 'text' },
          { name: 'obrigatoria', type: 'bool' },
          { name: 'responsavel_padrao', type: 'text' },
          { name: 'area_responsavel', type: 'text' },
          { name: 'manual_documento_referencia', type: 'text' },
          { name: 'regra_validacao', type: 'text' },
          { name: 'status_regra', type: 'text' },
          { name: 'fonte_dados', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['OK', 'ERRO', 'PENDENTE'],
            maxSelect: 1,
          },
          { name: 'observacao', type: 'text' },
          { name: 'quantidade_divergencias', type: 'number' },
          { name: 'ordem_material_lote', type: 'text' },
          { name: 'acao_corretiva', type: 'text' },
          { name: 'executado_por', type: 'text' },
          { name: 'data_hora_execucao', type: 'text' },
          { name: 'necessita_inventario', type: 'bool' },
          { name: 'historico_alteracoes', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cfi_exec ON checklist_fechamento_itens (execucao_id)',
          'CREATE INDEX idx_cfi_comp ON checklist_fechamento_itens (competencia)',
          'CREATE INDEX idx_cfi_status ON checklist_fechamento_itens (status)',
          'CREATE INDEX idx_cfi_cod ON checklist_fechamento_itens (codigo)',
        ],
      })
      app.save(itensCol)
    }

    // 5. checklist_fechamento_ocorrencias — ocorrências, divergências e ações corretivas
    if (!app.hasTable('checklist_fechamento_ocorrencias')) {
      const ocorrenciasCol = new Collection({
        name: 'checklist_fechamento_ocorrencias',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null,
        fields: [
          { name: 'execucao_id', type: 'text', required: true },
          { name: 'item_id', type: 'text', required: true },
          { name: 'codigo_atividade', type: 'text' },
          { name: 'competencia', type: 'text', required: true },
          {
            name: 'tipo',
            type: 'select',
            values: [
              'DIVERGENCIA',
              'SOLICITACAO_INVENTARIO',
              'ACAO_CORRETIVA',
              'COMENTARIO',
              'ERRO_SAP',
              'AJUSTE_RETROATIVO',
            ],
            maxSelect: 1,
          },
          { name: 'descricao', type: 'text', required: true },
          { name: 'ordem', type: 'text' },
          { name: 'material', type: 'text' },
          { name: 'lote', type: 'text' },
          { name: 'deposito', type: 'text' },
          { name: 'quantidade_divergente', type: 'number' },
          { name: 'saldo_sap', type: 'number' },
          { name: 'saldo_fisico', type: 'number' },
          { name: 'responsavel', type: 'text' },
          { name: 'acao_adotada', type: 'text' },
          { name: 'data_correcao', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['Aberta', 'Em tratamento', 'Solucionada', 'Cancelada'],
            maxSelect: 1,
          },
          { name: 'timeline_movimentos', type: 'json' }, // Para "Rastrear divergência"
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cfo_item ON checklist_fechamento_ocorrencias (item_id)',
          'CREATE INDEX idx_cfo_exec ON checklist_fechamento_ocorrencias (execucao_id)',
          'CREATE INDEX idx_cfo_tipo ON checklist_fechamento_ocorrencias (tipo)',
        ],
      })
      app.save(ocorrenciasCol)
    }

    // 6. checklist_fechamento_evidencias — arquivos e comprovantes
    if (!app.hasTable('checklist_fechamento_evidencias')) {
      const evidenciasCol = new Collection({
        name: 'checklist_fechamento_evidencias',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null,
        fields: [
          { name: 'execucao_id', type: 'text', required: true },
          { name: 'item_id', type: 'text', required: true },
          { name: 'ocorrencia_id', type: 'text' },
          { name: 'codigo_atividade', type: 'text' },
          { name: 'titulo', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'url_ou_caminho', type: 'text' },
          { name: 'arquivo', type: 'file', maxSize: 20971520 }, // 20MB
          { name: 'nome_arquivo', type: 'text' },
          { name: 'tamanho_bytes', type: 'number' },
          { name: 'tipo_mime', type: 'text' },
          { name: 'usuario_nome', type: 'text' },
          { name: 'usuario_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cfev_item ON checklist_fechamento_evidencias (item_id)',
          'CREATE INDEX idx_cfev_exec ON checklist_fechamento_evidencias (execucao_id)',
        ],
      })
      app.save(evidenciasCol)
    }

    // 7. fechamento_comunicacoes e fechamento_destinatarios (estrutura para etapa 1/2)
    if (!app.hasTable('fechamento_destinatarios')) {
      const destCol = new Collection({
        name: 'fechamento_destinatarios',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          {
            name: 'grupo',
            type: 'select',
            values: ['Contabilidade', 'Produção', 'PCP', 'Diretoria', 'Outro'],
            maxSelect: 1,
          },
          { name: 'nome', type: 'text', required: true },
          { name: 'usuario', type: 'text' },
          { name: 'email', type: 'email', required: true },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_fd_email ON fechamento_destinatarios (email)'],
      })
      app.save(destCol)
    }

    if (!app.hasTable('fechamento_comunicacoes')) {
      const commCol = new Collection({
        name: 'fechamento_comunicacoes',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null,
        fields: [
          { name: 'execucao_id', type: 'text', required: true },
          { name: 'competencia', type: 'text', required: true },
          { name: 'assunto', type: 'text', required: true },
          { name: 'corpo_mensagem', type: 'text' },
          { name: 'destinatarios_json', type: 'json' },
          { name: 'data_envio', type: 'text' },
          { name: 'enviado_por', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['Rascunho', 'Enviado', 'Erro'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_fc_exec ON fechamento_comunicacoes (execucao_id)'],
      })
      app.save(commCol)
    }

    // 8. SEMEAR FERIADOS NACIONAIS / CORPORATIVOS 2026 (base de cálculo de dias úteis)
    const feriadosCol = app.findCollectionByNameOrId('checklist_fechamento_feriados')
    const feriadosIniciais = [
      { data: '2026-01-01', descricao: 'Confraternização Universal', tipo: 'Nacional', ano: 2026 },
      { data: '2026-02-16', descricao: 'Carnaval (Segunda-feira)', tipo: 'Corporativo', ano: 2026 },
      { data: '2026-02-17', descricao: 'Carnaval (Terça-feira)', tipo: 'Corporativo', ano: 2026 },
      { data: '2026-04-03', descricao: 'Sexta-feira Santa', tipo: 'Nacional', ano: 2026 },
      { data: '2026-04-21', descricao: 'Tiradentes', tipo: 'Nacional', ano: 2026 },
      { data: '2026-05-01', descricao: 'Dia do Trabalho', tipo: 'Nacional', ano: 2026 },
      { data: '2026-06-04', descricao: 'Corpus Christi', tipo: 'Corporativo', ano: 2026 },
      { data: '2026-09-07', descricao: 'Independência do Brasil', tipo: 'Nacional', ano: 2026 },
      { data: '2026-10-12', descricao: 'Nossa Senhora Aparecida', tipo: 'Nacional', ano: 2026 },
      { data: '2026-11-02', descricao: 'Finados', tipo: 'Nacional', ano: 2026 },
      { data: '2026-11-15', descricao: 'Proclamação da República', tipo: 'Nacional', ano: 2026 },
      { data: '2026-11-20', descricao: 'Dia da Consciência Negra', tipo: 'Nacional', ano: 2026 },
      { data: '2026-12-25', descricao: 'Natal', tipo: 'Nacional', ano: 2026 },
    ]

    for (const f of feriadosIniciais) {
      try {
        app.findFirstRecordByData('checklist_fechamento_feriados', 'data', f.data)
      } catch (_) {
        const rec = new Record(feriadosCol)
        rec.set('data', f.data)
        rec.set('descricao', f.descricao)
        rec.set('tipo', f.tipo)
        rec.set('ano', f.ano)
        rec.set('ativo', true)
        app.save(rec)
      }
    }

    // 9. SEMEAR O CADASTRO MESTRE (25 ATIVIDADES INICIAIS EXTRAÍDAS DO MANUAL)
    const modelosCol = app.findCollectionByNameOrId('checklist_fechamento_modelos')
    const atividades = [
      {
        codigo: '1.1',
        sequencia: 1,
        titulo: 'Orientação do Fechamento',
        descricao_detalhada:
          'Card informativo orientando a finalidade do fechamento, impacto para a Contabilidade, necessidade de validar estoques, ordens, movimentações, apontamentos, transações, perdas, paradas e saldos.',
        categoria: 'Orientação',
        linha_centro_relacionado: 'Geral',
        empresa: 'CIAFAL',
        transacao_sap: 'N/A',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: false, // NÃO é atividade operacional obrigatória
        responsavel_padrao: 'PCP / Controle de Produção',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '1º dia útil',
        manual_documento_referencia: 'CHECK-LIST FECHAMENTO DO CONTROLE DE PRODUÇÃO',
        regra_validacao:
          'Leitura e ciência dos requisitos gerais de fechamento contábil e de produção.',
        campo_observacao: '',
        permite_evidencia: false,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.2',
        sequencia: 2,
        titulo: 'CO1P e COGI — Pendências de Processamento Posterior',
        descricao_detalhada:
          'Validar que não existam pendências de processamento posterior antes do fechamento. Se houver pendência: status Erro ou Pendente; registrar quantidade de pendências, material, ordem, mensagem SAP, responsável, ação adotada, evidência, data da correção. OK somente após eliminar pendências.',
        categoria: 'Processamento SAP',
        linha_centro_relacionado: 'Geral',
        empresa: 'CIAFAL',
        transacao_sap: 'CO1P / COGI',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção',
        area_responsavel: 'PCP / Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.2 / IT-001',
        regra_validacao:
          'Quantidade total de pendências em CO1P e COGI deve ser rigorosamente zero.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'SAP RFC',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.3',
        sequencia: 3,
        titulo: 'ZPP53 / DP06 — Devolvido L2',
        descricao_detalhada:
          'Validar ZPP53, DP06 — Quarentena L2 e MB52; peças devolvidas não tratadas; registrar material, lote, quantidade, diferença, origem provável, responsável, necessidade de inventário; ação "Solicitar inventário". OK somente quando pendência solucionada.',
        categoria: 'Devoluções & Quarentena',
        linha_centro_relacionado: 'L2 / Acabamento L2',
        empresa: 'CIAFAL',
        transacao_sap: 'ZPP53 / MB52',
        deposito_sap: 'DP06',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção / Qualidade',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.3',
        regra_validacao:
          'Nenhuma peça devolvida sem tratamento ou pendência sem ação/inventário solucionado.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.4',
        sequencia: 4,
        titulo: 'ZPP66 / DP11 — Devolvido L1',
        descricao_detalhada:
          'Validar ZPP66, DP11 — Quarentena L1 e MB52; peças devolvidas não tratadas; registrar material, lote, quantidade, diferença, origem provável, responsável, necessidade de inventário; ação "Solicitar inventário". OK somente quando pendência solucionada.',
        categoria: 'Devoluções & Quarentena',
        linha_centro_relacionado: 'L1 / Acabamento L1',
        empresa: 'CIAFAL',
        transacao_sap: 'ZPP66 / MB52',
        deposito_sap: 'DP11',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção / Qualidade',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.4',
        regra_validacao: 'Pendências tratadas ou inventariadas com justificativa e regularização.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.5',
        sequencia: 5,
        titulo: 'ZPP_04 — Fechamento L1 / SEM L1',
        descricao_detalhada:
          'Parâmetro "FORNO L1 + SEM L1", período = mês do fechamento. Rendimento metálico esperado 94% a 97% (abaixo de 94% → possível produção não lançada, ressalva de ordens com mais de 3% de sucata; acima de 97% → possível ausência de lançamento de perdas). Carepa: ordens abaixo de 90 t → ~3% aceitável; acima de 90 t → 1% a 3%. Aparas: validar lançamentos de todos os turnos; perda abaixo de 1% → lançamento faltante possível; acima de 3% → investigar. Alerta de IA para valores fora dos parâmetros — a IA NÃO altera resultado da ordem automaticamente.',
        categoria: 'Rendimento & Fechamento',
        linha_centro_relacionado: 'L1',
        empresa: 'CIAFAL',
        transacao_sap: 'ZPP_04',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção / Engenharia',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.5',
        regra_validacao:
          'Rendimento metálico L1 entre 94% e 97%. Carepa e aparas dentro dos padrões por faixa de tonelagem.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.6',
        sequencia: 6,
        titulo: 'ZPP_04 — Fechamento L2',
        descricao_detalhada:
          'Parâmetros "FORNO L2 + BAL2". Rendimento por origem/material: Arcelor 91%–94%; Ciafal 95%–96,7%; Vallourec 93%–94,5%. Ressalva: "ordens Vallourec podem utilizar rendimento teórico conforme procedimento específico". Carepa: menor que 0,5% → abaixo do esperado; maior que 2% → acima. Aparas: referência 2%–3%.',
        categoria: 'Rendimento & Fechamento',
        linha_centro_relacionado: 'L2',
        empresa: 'CIAFAL',
        transacao_sap: 'ZPP_04',
        deposito_sap: 'BAL2',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção / Engenharia',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.6',
        regra_validacao:
          'Rendimento aderente às faixas de origem (Arcelor 91%-94%, Ciafal 95%-96,7%, Vallourec 93%-94,5%). Carepa entre 0,5% e 2%.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.7',
        sequencia: 7,
        titulo: 'ZPP_05 — Acabamento L2',
        descricao_detalhada:
          'Parâmetro "ACABL2 — ACABAMENTO L2", fechamento ≈100% (aceitar 99,999%, 100%, 100,01% como variação de arredondamento). Para corrida com produção distribuída entre dois meses: permitir identificar a ordem, consultar sem limitação de período e revalidar — botão "Analisar ordem entre períodos".',
        categoria: 'Rendimento & Fechamento',
        linha_centro_relacionado: 'Acabamento L2',
        empresa: 'CIAFAL',
        transacao_sap: 'ZPP_05',
        deposito_sap: 'ACABL2',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.7',
        regra_validacao: 'Fechamento de Acabamento L2 em torno de 100% (faixa 99,999% a 100,01%).',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.8',
        sequencia: 8,
        titulo: 'Saldos DP09 — Acabamento L1',
        descricao_detalhada:
          'Verificar "saldinhos" no SAP e no estoque físico; relacionar com Acabamento L1; registrar material, lote, saldo SAP, saldo físico, diferença, ação de acerto, responsável.',
        categoria: 'Saldos de Depósito',
        linha_centro_relacionado: 'Acabamento L1',
        empresa: 'CIAFAL',
        transacao_sap: 'MB52',
        deposito_sap: 'DP09',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção / Estoque',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.8',
        regra_validacao:
          'Conciliação entre saldo contábil SAP e saldo físico no DP09 com diferenças justificadas/acertadas.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.9',
        sequencia: 9,
        titulo: 'Saldos DP04 — Validação Estoque / Acabamento / Preparação L2',
        descricao_detalhada: 'Validar DP04 com Estoque, Acabamento L2, Preparação L2.',
        categoria: 'Saldos de Depósito',
        linha_centro_relacionado: 'L2 / Preparação / Acabamento',
        empresa: 'CIAFAL',
        transacao_sap: 'MB52',
        deposito_sap: 'DP04',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.9',
        regra_validacao:
          'Saldos do DP04 conferidos entre áreas envolvidas sem desvios não explicados.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.10',
        sequencia: 10,
        titulo: 'Saldos DP08 — Forno L1 e Enfornamento',
        descricao_detalhada:
          'Comparar ZPP_15 status "FORNO" × MB52 × saldo DP08 (material, lote, quantidade). Saldo DP08 no fechamento deve corresponder às corridas usadas para enfornamento das ordens pertinentes.',
        categoria: 'Saldos de Depósito',
        linha_centro_relacionado: 'Forno L1',
        empresa: 'CIAFAL',
        transacao_sap: 'ZPP_15 / MB52',
        deposito_sap: 'DP08',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.10',
        regra_validacao: 'Saldo DP08 coincidente com as corridas enfornadas ativas e confirmadas.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.11',
        sequencia: 11,
        titulo: 'Saldos DP03 — Conciliação ZPP56 × MB52 DP03 × ZPP43',
        descricao_detalhada:
          'Conciliação ZPP56 × MB52 DP03 × ZPP43. Diferença → análise detalhada com MB51, ordem, movimentos, lote, material, usuário do movimento, data/hora. Rastrear movimentos 311 (entrada DP03), 261 (consumo/saída p/ ordem), cancelamentos, estornos, status devolvido, ordens MTO. Função "Rastrear divergência" = linha do tempo dos movimentos. IMPORTANTE: o manual registra dúvida sobre a sequência exata da movimentação devolvido (DP03, DP06, DP02, DP12) — NÃO transformar em regra automática; marcar como "Pendente de validação de processo".',
        categoria: 'Saldos de Depósito',
        linha_centro_relacionado: 'Geral',
        empresa: 'CIAFAL',
        transacao_sap: 'ZPP56 / MB52 / ZPP43 / MB51',
        deposito_sap: 'DP03',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.11',
        regra_validacao:
          'Divergências rastreadas na linha do tempo; sequência de devolução mantida sob validação humana.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Pendente de validação de processo',
      },
      {
        codigo: '1.12',
        sequencia: 12,
        titulo: 'Saldos DP07 — Erros de Depósito Identificados pelo Estoque',
        descricao_detalhada:
          'Registrar erros de depósito identificados pelo Estoque; permitir registro manual enquanto integração não existe; marcar correção; anexar evidência.',
        categoria: 'Saldos de Depósito',
        linha_centro_relacionado: 'Estoque de MP / DP07',
        empresa: 'CIAFAL',
        transacao_sap: 'MB52',
        deposito_sap: 'DP07',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Estoque / Controle de Produção',
        area_responsavel: 'Estoque',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.12',
        regra_validacao:
          'Todos os erros de depósito identificados registrados, tratados e com evidência anexada.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.13',
        sequencia: 13,
        titulo: 'DP06 x ZPP53 — Comparativo Semanal e Fechamento',
        descricao_detalhada:
          'Comparar saldo DP06 com pendências ZPP53. Frequência SEMANAL + obrigatória no fechamento mensal. OK somente com diferenças zeradas/tratadas. Permitir solicitar inventário.',
        categoria: 'Conciliação Semanal/Mensal',
        linha_centro_relacionado: 'L2',
        empresa: 'CIAFAL',
        transacao_sap: 'ZPP53 / MB52',
        deposito_sap: 'DP06',
        frequencia: 'semanal',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: 'Semanal / 2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.13',
        regra_validacao:
          'Diferenças entre DP06 e ZPP53 zeradas ou tratadas com solicitação de inventário formalizada.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.14',
        sequencia: 14,
        titulo: 'DP11 x ZPP66 — Comparativo Semanal e Fechamento',
        descricao_detalhada:
          'Mesma regra: comparar saldo DP11 com pendências ZPP66. Frequência SEMANAL + obrigatória no fechamento mensal. OK somente com diferenças zeradas/tratadas. Permitir solicitar inventário.',
        categoria: 'Conciliação Semanal/Mensal',
        linha_centro_relacionado: 'L1',
        empresa: 'CIAFAL',
        transacao_sap: 'ZPP66 / MB52',
        deposito_sap: 'DP11',
        frequencia: 'semanal',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: 'Semanal / 2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.14',
        regra_validacao:
          'Diferenças entre DP11 e ZPP66 zeradas ou tratadas com solicitação de inventário formalizada.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.15',
        sequencia: 15,
        titulo: 'COOIS — Ordens Criadas sem Apontamentos',
        descricao_detalhada:
          'Ordens criadas, sem apontamentos, ainda abertas; identificar quais podem ser encerradas tecnicamente. Mostrar ordem, material, centro, data criação, status, qtd planejada, qtd apontada, situação.',
        categoria: 'Ordens & Encerramento',
        linha_centro_relacionado: 'Geral',
        empresa: 'CIAFAL',
        transacao_sap: 'COOIS',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'PCP / Controle de Produção',
        area_responsavel: 'PCP',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.15',
        regra_validacao: 'Revisão de todas as ordens sem apontamento para TECO ou reprogramação.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.16',
        sequencia: 16,
        titulo: 'Perdas L1 — Sucata, Aparas e Carepa',
        descricao_detalhada:
          'Conferir Sucata e Aparas L1; validar lançamentos de todos os turnos da laminação; relacionar com carepa das ordens L1.',
        categoria: 'Perdas & Rendimento',
        linha_centro_relacionado: 'L1',
        empresa: 'CIAFAL',
        transacao_sap: 'ZPP_04 / MB51',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.16',
        regra_validacao:
          'Validação cruzada dos lançamentos de todos os turnos da laminação com as perdas apontadas.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.17',
        sequencia: 17,
        titulo: 'Paradas L1 e L2 — Validação de Apontamentos',
        descricao_detalhada:
          'Validar lançamentos de paradas; documentos de referência IT-007 e IT-002; preparado para integração futura MES 4.0/SAP.',
        categoria: 'Paradas Operacionais',
        linha_centro_relacionado: 'L1 / L2',
        empresa: 'CIAFAL',
        transacao_sap: 'MES / SAP',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção / Manutenção',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'IT-007 / IT-002',
        regra_validacao:
          'Lançamentos de paradas conferidos com apontamentos reais e justificativas técnicas.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'MES',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.18',
        sequencia: 18,
        titulo: 'Combustível Forno L1 e L2 — Óleo e Gás',
        descricao_detalhada:
          'Conferir óleo e gás por linha; registrar divergências e justificativas.',
        categoria: 'Consumo Energético',
        linha_centro_relacionado: 'Forno L1 / Forno L2',
        empresa: 'CIAFAL',
        transacao_sap: 'MB51',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção / Utilidades',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.18',
        regra_validacao:
          'Consumos de combustível compatíveis com volume de enfornamento e curvas térmicas.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.19',
        sequencia: 19,
        titulo: 'ZPP_17 — Movimentos de Mercadorias das Ordens',
        descricao_detalhada:
          'Movimentos de mercadorias das ordens. Rotina ainda em elaboração e a transação pode apresentar divergências ao reportar erros — NÃO reprovação automática definitiva; exibir aviso "Regra em validação"; exigir revisão humana.',
        categoria: 'Movimentações SAP',
        linha_centro_relacionado: 'Geral',
        empresa: 'CIAFAL',
        transacao_sap: 'ZPP_17',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.19',
        regra_validacao:
          'Revisão humana obrigatória. Nenhuma reprovação automática sem parecer do analista.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Regra em validação',
      },
      {
        codigo: '1.20',
        sequencia: 20,
        titulo: 'Operações 20/30 L1 — Comparativo de Apontamentos',
        descricao_detalhada:
          'Comparar saldos/apontamentos das operações 20 e 30; diferentes → possível duplicidade; registrar ordem, operação, apontamento, data, quantidade, responsável, necessidade de estorno; encaminhar análise ao Supervisor do Acabamento L1.',
        categoria: 'Apontamentos Operacionais',
        linha_centro_relacionado: 'L1 / Acabamento L1',
        empresa: 'CIAFAL',
        transacao_sap: 'CO03 / COOIS',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Supervisor Acabamento L1 / PCP',
        area_responsavel: 'Acabamento L1',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.20',
        regra_validacao:
          'Apontamentos coerentes entre as etapas 20 e 30 sem duplicidades não estornadas.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.21',
        sequencia: 21,
        titulo: 'ZCO06 — Ordens Encerradas Tecnicamente Pós-Virada',
        descricao_detalhada:
          'Ordens encerradas tecnicamente após a virada do período; registrar necessidade de retroagir data de encerramento técnico; durante o fechamento, sinalizar recomendação de não encerrar tecnicamente ordens do novo mês; registrar ordem, data original, nova data, responsável, resultado.',
        categoria: 'Ordens & Encerramento',
        linha_centro_relacionado: 'Geral',
        empresa: 'CIAFAL',
        transacao_sap: 'ZCO06',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção / Contabilidade',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.21',
        regra_validacao:
          'Datas de encerramento técnico retroagidas conforme competência contábil aplicável.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.22',
        sequencia: 22,
        titulo: 'COHV — Encerramento Técnico em Massa',
        descricao_detalhada:
          'Registrar ordens selecionadas, quantidade, centro, usuário, data, resultado. O HUB NÃO executa encerramentos SAP automaticamente — sempre registro manual até RFC formal.',
        categoria: 'Ordens & Encerramento',
        linha_centro_relacionado: 'Geral',
        empresa: 'CIAFAL',
        transacao_sap: 'COHV',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.22',
        regra_validacao:
          'Ordens elegíveis confirmadas e registradas manualmente após execução na COHV do SAP.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.23',
        sequencia: 23,
        titulo: 'Ordens Preparação L2 — Encerramento e Abertura',
        descricao_detalhada:
          'Encerramento técnico do mês, criação das novas ordens, quantidades conforme Programação Mensal L2 (relacionar futuramente com programação vigente).',
        categoria: 'Ordens & Encerramento',
        linha_centro_relacionado: 'Preparação L2',
        empresa: 'CIAFAL',
        transacao_sap: 'CO02 / CO01',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'PCP / Preparação L2',
        area_responsavel: 'PCP',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.23',
        regra_validacao:
          'Ordens de preparação do mês findo encerradas e novos lotes abertos conforme meta mensal.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.23.1',
        sequencia: 24,
        titulo: 'Ordens OXI L2 — Monitoramento e Saldo Transitório DP04',
        descricao_detalhada:
          'Referência ZPP49 — Oxicorte L2; monitorar OXIL2 liberadas; destacar com necessidade real de apontamento, sem saldo restante, antigas ainda liberadas, potencialmente encerráveis; confrontar MB52/DP04 para materiais ST930*; saldo de tarugos 130 × 130 mm no DP04 deve ser transitório — corridas de semanas anteriores com saldo geram alerta (Estoque, Preparação, inventário, regularização); corridas da semana atual podem permanecer em andamento.',
        categoria: 'Oxicorte & Tarugos',
        linha_centro_relacionado: 'Preparação L2 / Oxicorte',
        empresa: 'CIAFAL',
        transacao_sap: 'ZPP49 / MB52',
        deposito_sap: 'DP04',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção / Preparação L2',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.23.1 / ZPP49',
        regra_validacao:
          'Sem saldo de semanas anteriores retido indevidamente no DP04; ordens sem saldo restante encerradas.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.24',
        sequencia: 25,
        titulo: 'Endireitadeira L1 — Encerramento Técnico e Saldos',
        descricao_detalhada:
          'Encerramento técnico; novas ordens somente para saldos efetivamente existentes em estoque.',
        categoria: 'Ordens & Encerramento',
        linha_centro_relacionado: 'Endireitadeira L1',
        empresa: 'CIAFAL',
        transacao_sap: 'CO02 / MB52',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção / PCP',
        area_responsavel: 'Controle de Produção',
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.24',
        regra_validacao: 'Encerramento confirmado; novas ordens apenas com lastro de estoque real.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
      {
        codigo: '1.25',
        sequencia: 26,
        titulo: 'Dados IBGE — Envio da Produção Mensal',
        descricao_detalhada:
          'Após comunicação à Contabilidade, "Enviar dados de produção para IBGE"; registrar competência, data, responsável, arquivo/evidência, destinatário, confirmação de envio.',
        categoria: 'Relatórios Externos',
        linha_centro_relacionado: 'Geral',
        empresa: 'CIAFAL',
        transacao_sap: 'Relatório Produção',
        deposito_sap: 'N/A',
        frequencia: 'somente_fechamento',
        obrigatoria: true,
        responsavel_padrao: 'Controle de Produção / PCP',
        area_responsavel: 'PCP',
        prazo_relativo_fechamento: 'Após envio Contabilidade',
        manual_documento_referencia: 'MANUAL FECHAMENTO ITEM 1.25',
        regra_validacao: 'Confirmação e evidência do envio oficial da produção mensal para o IBGE.',
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: '2026-01-01',
        fonte_dados: 'Manual',
        status_regra: 'Oficial',
      },
    ]

    for (const a of atividades) {
      try {
        app.findFirstRecordByData('checklist_fechamento_modelos', 'codigo', a.codigo)
      } catch (_) {
        const rec = new Record(modelosCol)
        rec.set('codigo', a.codigo)
        rec.set('sequencia', a.sequencia)
        rec.set('titulo', a.titulo)
        rec.set('descricao_detalhada', a.descricao_detalhada)
        rec.set('categoria', a.categoria)
        rec.set('linha_centro_relacionado', a.linha_centro_relacionado)
        rec.set('empresa', a.empresa)
        rec.set('transacao_sap', a.transacao_sap)
        rec.set('deposito_sap', a.deposito_sap)
        rec.set('frequencia', a.frequencia)
        rec.set('obrigatoria', a.obrigatoria)
        rec.set('responsavel_padrao', a.responsavel_padrao)
        rec.set('area_responsavel', a.area_responsavel)
        rec.set('prazo_relativo_fechamento', a.prazo_relativo_fechamento)
        rec.set('manual_documento_referencia', a.manual_documento_referencia)
        rec.set('regra_validacao', a.regra_validacao)
        rec.set('campo_observacao', a.campo_observacao)
        rec.set('permite_evidencia', a.permite_evidencia)
        rec.set('ativa', a.ativa)
        rec.set('data_inicio_vigencia', a.data_inicio_vigencia)
        rec.set('fonte_dados', a.fonte_dados)
        rec.set('status_regra', a.status_regra)
        rec.set('metadata', {})
        app.save(rec)
      }
    }
  },
  (app) => {
    // Rollback defensivo
    try {
      app.delete(app.findCollectionByNameOrId('fechamento_comunicacoes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('fechamento_destinatarios'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('checklist_fechamento_evidencias'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('checklist_fechamento_ocorrencias'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('checklist_fechamento_itens'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('checklist_fechamento_execucoes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('checklist_fechamento_feriados'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('checklist_fechamento_modelos'))
    } catch (_) {}
  },
)
