migrate(
  (app) => {
    // 1. Collection pcp_indicadores (Definição de indicadores oficiais e suas metas/regras)
    let indicadoresCol
    try {
      indicadoresCol = app.findCollectionByNameOrId('pcp_indicadores')
    } catch (e) {
      indicadoresCol = null
    }

    if (!indicadoresCol) {
      indicadoresCol = new Collection({
        name: 'pcp_indicadores',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'unidade', type: 'text', required: true },
          { name: 'meta', type: 'number', required: true },
          {
            name: 'regra_comparacao',
            type: 'select',
            required: true,
            values: ['>=', '<=', '='],
            maxSelect: 1,
          },
          {
            name: 'tipo_indicador',
            type: 'select',
            values: [
              'PROGRAMACAO',
              'EFICIENCIA',
              'CARTEIRA',
              'CAPACIDADE',
              'QUALIDADE',
              'MATERIA_PRIMA',
            ],
            maxSelect: 1,
          },
          { name: 'vigencia_inicio', type: 'date' },
          { name: 'vigencia_fim', type: 'date' },
          { name: 'empresa', type: 'text' },
          { name: 'linha', type: 'text' },
          { name: 'centro', type: 'text' },
          { name: 'status_ativo', type: 'bool' },
          { name: 'ordem_exibicao', type: 'number' },
          { name: 'fonte_dados_tipo', type: 'text' },
          { name: 'fonte_dados_descricao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_pcp_indicadores_codigo ON pcp_indicadores (codigo)'],
      })
      app.save(indicadoresCol)
    }

    // 2. Collection pcp_indicador_metas_log (Auditoria e rastreabilidade específica de alterações de metas/regras)
    let metasLogCol
    try {
      metasLogCol = app.findCollectionByNameOrId('pcp_indicador_metas_log')
    } catch (e) {
      metasLogCol = null
    }

    if (!metasLogCol) {
      metasLogCol = new Collection({
        name: 'pcp_indicador_metas_log',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'indicador_id', type: 'text', required: true },
          { name: 'indicador_codigo', type: 'text', required: true },
          { name: 'indicador_nome', type: 'text' },
          { name: 'meta_anterior', type: 'number' },
          { name: 'meta_nova', type: 'number' },
          { name: 'regra_anterior', type: 'text' },
          { name: 'regra_nova', type: 'text' },
          { name: 'status_anterior', type: 'bool' },
          { name: 'status_novo', type: 'bool' },
          { name: 'usuario_id', type: 'text' },
          { name: 'usuario_nome', type: 'text' },
          { name: 'usuario_email', type: 'text' },
          { name: 'justificativa', type: 'text' },
          { name: 'vigencia_inicio', type: 'date' },
          { name: 'vigencia_fim', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pcp_indicador_metas_log_indicador ON pcp_indicador_metas_log (indicador_codigo, created DESC)',
        ],
      })
      app.save(metasLogCol)
    }

    // 3. Seed dos 8 Indicadores Oficiais
    const initialIndicadores = [
      {
        codigo: 'IND_01_ADERENCIA_PROG',
        nome: 'Aderência à Programação',
        descricao:
          'Percentual de cumprimento das ordens programadas versus realizadas na semana/mês',
        unidade: '%',
        meta: 95.0,
        regra_comparacao: '>=',
        tipo_indicador: 'PROGRAMACAO',
        vigencia_inicio: '2026-01-01 00:00:00.000Z',
        status_ativo: true,
        ordem_exibicao: 1,
        fonte_dados_tipo: 'PCP_WEEKLY_SCHEDULES',
        fonte_dados_descricao: 'weekly_schedules (planejado x realizado) e apontamentos MES',
      },
      {
        codigo: 'IND_02_ASSERTIVIDADE_PROG',
        nome: 'Assertividade da Programação PCP',
        descricao: 'Acurácia temporal e de sequência da programação executada pelo chão de fábrica',
        unidade: '%',
        meta: 90.0,
        regra_comparacao: '>=',
        tipo_indicador: 'PROGRAMACAO',
        vigencia_inicio: '2026-01-01 00:00:00.000Z',
        status_ativo: true,
        ordem_exibicao: 2,
        fonte_dados_tipo: 'PCP_WEEKLY_SCHEDULES',
        fonte_dados_descricao: 'weekly_schedules e pcp_production_orders',
      },
      {
        codigo: 'IND_03_ATENDIMENTO_CARTEIRA',
        nome: 'Atendimento da Carteira Programada',
        descricao: 'Percentual de pedidos de carteira atendidos dentro do prazo programado',
        unidade: '%',
        meta: 92.0,
        regra_comparacao: '>=',
        tipo_indicador: 'CARTEIRA',
        vigencia_inicio: '2026-01-01 00:00:00.000Z',
        status_ativo: true,
        ordem_exibicao: 3,
        fonte_dados_tipo: 'CARTEIRA_ITEMS',
        fonte_dados_descricao: 'carteira_items e apontamentos de expedição',
      },
      {
        codigo: 'IND_04_UTILIZACAO_CAPACIDADE',
        nome: 'Utilização da Capacidade',
        descricao: 'Taxa de aproveitamento da capacidade nominal das linhas produtivas',
        unidade: '%',
        meta: 85.0,
        regra_comparacao: '>=',
        tipo_indicador: 'CAPACIDADE',
        vigencia_inicio: '2026-01-01 00:00:00.000Z',
        status_ativo: true,
        ordem_exibicao: 4,
        fonte_dados_tipo: 'LINE_MASTERS_SCHEDULES',
        fonte_dados_descricao:
          'Capacidade nominal de line_masters e horas produzidas weekly_schedules',
      },
      {
        codigo: 'IND_05_CUMPRIMENTO_PLANO',
        nome: 'Cumprimento do Plano de Produção',
        descricao: 'Aderência em volume do plano mestre de produção consolidado mensal',
        unidade: '%',
        meta: 95.0,
        regra_comparacao: '>=',
        tipo_indicador: 'EFICIENCIA',
        vigencia_inicio: '2026-01-01 00:00:00.000Z',
        status_ativo: true,
        ordem_exibicao: 5,
        fonte_dados_tipo: 'MASTER_PLANS',
        fonte_dados_descricao: 'master_plans e master_plan_items',
      },
      {
        codigo: 'IND_06_TEMPO_SETUP',
        nome: 'Tempo de Setup/Acerto',
        descricao: 'Tempo total gasto em trocas de ferramenta, bitola e acerto de linha',
        unidade: 'h',
        meta: 20.0,
        regra_comparacao: '<=',
        tipo_indicador: 'EFICIENCIA',
        vigencia_inicio: '2026-01-01 00:00:00.000Z',
        status_ativo: true,
        ordem_exibicao: 6,
        fonte_dados_tipo: 'WEEKLY_SCHEDULES_STOPS',
        fonte_dados_descricao: 'weekly_schedules itens SETUP e pcp_production_stops',
      },
      {
        codigo: 'IND_07_FALTA_MP',
        nome: 'Programação Impactada por Falta de MP',
        descricao:
          'Percentual de itens reprogramados ou paradas causadas por indisponibilidade de matéria-prima',
        unidade: '%',
        meta: 3.0,
        regra_comparacao: '<=',
        tipo_indicador: 'MATERIA_PRIMA',
        vigencia_inicio: '2026-01-01 00:00:00.000Z',
        status_ativo: true,
        ordem_exibicao: 7,
        fonte_dados_tipo: 'MP_OCCURRENCES_STOPS',
        fonte_dados_descricao: 'pcp_mp_inventory_occurrences e paradas por MP',
      },
      {
        codigo: 'IND_08_RETRABALHO_REPROGRAMACAO',
        nome: 'Retrabalho / Reprogramação',
        descricao: 'Índice de retrabalho ou reprogramação forçada de ordens no período',
        unidade: '%',
        meta: 4.0,
        regra_comparacao: '<=',
        tipo_indicador: 'QUALIDADE',
        vigencia_inicio: '2026-01-01 00:00:00.000Z',
        status_ativo: true,
        ordem_exibicao: 8,
        fonte_dados_tipo: 'PCP_DEVIATIONS_REASONS',
        fonte_dados_descricao: 'pcp_version_diffs e pcp_change_justifications',
      },
    ]

    const col = app.findCollectionByNameOrId('pcp_indicadores')
    for (let i = 0; i < initialIndicadores.length; i++) {
      const item = initialIndicadores[i]
      let existing = null
      try {
        existing = app.findFirstRecordByFilter('pcp_indicadores', "codigo = '" + item.codigo + "'")
      } catch (e) {
        existing = null
      }

      if (!existing) {
        const record = new Record(col)
        record.set('codigo', item.codigo)
        record.set('nome', item.nome)
        record.set('descricao', item.descricao)
        record.set('unidade', item.unidade)
        record.set('meta', item.meta)
        record.set('regra_comparacao', item.regra_comparacao)
        record.set('tipo_indicador', item.tipo_indicador)
        record.set('vigencia_inicio', item.vigencia_inicio)
        record.set('status_ativo', item.status_ativo)
        record.set('ordem_exibicao', item.ordem_exibicao)
        record.set('fonte_dados_tipo', item.fonte_dados_tipo)
        record.set('fonte_dados_descricao', item.fonte_dados_descricao)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const metasLog = app.findCollectionByNameOrId('pcp_indicador_metas_log')
      if (metasLog) app.delete(metasLog)
    } catch (e) {}

    try {
      const col = app.findCollectionByNameOrId('pcp_indicadores')
      if (col) app.delete(col)
    } catch (e) {}
  },
)
