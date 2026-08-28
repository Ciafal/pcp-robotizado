migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const permissionsCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolesCol = app.findCollectionByNameOrId('pcp_roles')
    const rolePermsCol = app.findCollectionByNameOrId('pcp_role_permissions')

    // 1. executive_analyses: Registro de Governança das Análises Executivas Geradas
    let analysesCol
    try {
      analysesCol = app.findCollectionByNameOrId('executive_analyses')
    } catch (_) {
      analysesCol = new Collection({
        name: 'executive_analyses',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'analysis_code', type: 'text', required: true },
          { name: 'user_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'user_email', type: 'text' },
          { name: 'scope_applied', type: 'text' },
          { name: 'period_filter', type: 'text' },
          { name: 'line_code_filter', type: 'text' },
          { name: 'model_version', type: 'text' },
          { name: 'prompt_version', type: 'text' },
          { name: 'confidence_level', type: 'text' }, // ALTA | MEDIA | BAIXA | 87%
          { name: 'sources_used', type: 'json' }, // Origens consultadas: tabelas, períodos, timestamps
          { name: 'deterministic_kpis_snapshot', type: 'json' }, // Métricas determinísticas no momento do cálculo
          { name: 'executive_summary_payload', type: 'json' }, // { situacao, evidencias, tendencia, impacto, recomendacao }
          { name: 'investigation_findings', type: 'json' }, // Fatos, Hipóteses, Evidências, Causa Provável, Causa Comprovada
          { name: 'recommendations_payload', type: 'json' }, // Recomendações determinísticas e de IA
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_exec_analysis_code ON executive_analyses (analysis_code)',
          'CREATE INDEX idx_exec_analysis_user ON executive_analyses (user_id)',
          'CREATE INDEX idx_exec_analysis_created ON executive_analyses (created DESC)',
        ],
      })
      app.save(analysesCol)
    }

    // 2. executive_actions: Plano de Ação vinculado (Análise → Decisão → Ação → Responsável → Prazo → Resultado → Eficácia)
    let actionsCol
    try {
      actionsCol = app.findCollectionByNameOrId('executive_actions')
    } catch (_) {
      actionsCol = new Collection({
        name: 'executive_actions',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'text' },
          {
            name: 'action_type',
            type: 'select',
            values: [
              'PLANO_ACAO',
              'DEMANDA',
              'PROJETO',
              'INVESTIGACAO',
              'ALERTA',
              'TAREFA',
              'REUNIAO',
              'ACOMPANHAMENTO',
            ],
            required: true,
            maxSelect: 1,
          },
          {
            name: 'priority',
            type: 'select',
            values: ['CRITICA', 'ALTA', 'MEDIA', 'MONITORAR'],
            required: true,
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            values: ['NAO_INICIADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA', 'ATRASADA'],
            required: true,
            maxSelect: 1,
          },
          { name: 'analysis_ref_id', type: 'relation', collectionId: analysesCol.id, maxSelect: 1 },
          { name: 'analysis_code', type: 'text' },
          { name: 'decision_rationale', type: 'text' },
          { name: 'responsible_name', type: 'text', required: true },
          {
            name: 'responsible_user_id',
            type: 'relation',
            collectionId: usersCol.id,
            maxSelect: 1,
          },
          { name: 'deadline', type: 'text', required: true }, // YYYY-MM-DD
          { name: 'expected_result', type: 'text' },
          { name: 'actual_result', type: 'text' },
          {
            name: 'efficacy_status',
            type: 'select',
            values: ['PENDENTE_AVALIACAO', 'EFICAZ', 'PARCIALMENTE_EFICAZ', 'INEFICAZ'],
            maxSelect: 1,
          },
          { name: 'line_code', type: 'text' },
          { name: 'created_by_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_exec_action_code ON executive_actions (code)',
          'CREATE INDEX idx_exec_action_status ON executive_actions (status)',
          'CREATE INDEX idx_exec_action_analysis ON executive_actions (analysis_ref_id)',
          'CREATE INDEX idx_exec_action_deadline ON executive_actions (deadline)',
        ],
      })
      app.save(actionsCol)
    }

    // 3. executive_briefings: Histórico de Briefings Executivos Gerados (Diário/Semanal/Mensal)
    let briefingsCol
    try {
      briefingsCol = app.findCollectionByNameOrId('executive_briefings')
    } catch (_) {
      briefingsCol = new Collection({
        name: 'executive_briefings',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'title', type: 'text', required: true },
          {
            name: 'cadence',
            type: 'select',
            values: ['DIARIO', 'SEMANAL', 'MENSAL', 'SOB_DEMANDA'],
            required: true,
            maxSelect: 1,
          },
          { name: 'period_ref', type: 'text', required: true },
          { name: 'generated_by_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'generated_by_name', type: 'text' },
          { name: 'summary_markdown', type: 'text' },
          { name: 'kpi_highlights', type: 'json' },
          { name: 'deviations_summary', type: 'json' },
          { name: 'risks_and_opportunities', type: 'json' },
          { name: 'pending_decisions', type: 'json' },
          { name: 'overdue_actions', type: 'json' },
          { name: 'ai_recommendations', type: 'json' },
          { name: 'export_format', type: 'text' }, // PDF | PPTX | EMAIL
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_exec_briefing_code ON executive_briefings (code)',
          'CREATE INDEX idx_exec_briefing_created ON executive_briefings (created DESC)',
          'CREATE INDEX idx_exec_briefing_cadence ON executive_briefings (cadence)',
        ],
      })
      app.save(briefingsCol)
    }

    // 4. Novas Permissões Granulares para o Cockpit Executivo
    const executivePermissions = [
      {
        key: 'pcp.executive.view',
        name: 'Visualizar Cockpit Executivo',
        category: 'Cockpit Executivo',
        is_critical: false,
        description:
          'Permite visualizar o Cockpit Executivo e Análise Corporativa Integrada com IA no HUB CIAFAL',
      },
      {
        key: 'pcp.executive.ask_ai',
        name: 'Consultar Assistente Executivo com IA',
        category: 'Cockpit Executivo',
        is_critical: false,
        description:
          'Permite formular perguntas em linguagem natural ao Agente Corporativo nativo do Skip Cloud',
      },
      {
        key: 'pcp.executive.investigate',
        name: 'Investigar Anomalias e Causalidade com IA',
        category: 'Cockpit Executivo',
        is_critical: false,
        description:
          'Permite abrir investigações com estratificação de Pareto, tendências e separação Fato/Hipótese',
      },
      {
        key: 'pcp.executive.actions.manage',
        name: 'Gerenciar Ações e Decisões Vinculadas',
        category: 'Cockpit Executivo',
        is_critical: false,
        description:
          'Permite criar, atualizar e acompanhar eficácia de planos de ação derivados de análises executivas',
      },
      {
        key: 'pcp.executive.export',
        name: 'Exportar Relatórios e Briefing Executivo',
        category: 'Cockpit Executivo',
        is_critical: false,
        description:
          'Permite exportar o Briefing Executivo CIAFAL em PDF e relatórios estruturados',
      },
      {
        key: 'pcp.executive.manage_briefing',
        name: 'Configurar e Gerar Briefings Periódicos',
        category: 'Cockpit Executivo',
        is_critical: true,
        description:
          'Permite criar e gerenciar a rotina de briefings diários, semanais e mensais da diretoria',
      },
    ]

    const permMap = {}
    for (const p of executivePermissions) {
      try {
        const existing = app.findFirstRecordByData('pcp_permissions', 'key', p.key)
        permMap[p.key] = existing
      } catch (_) {
        const rec = new Record(permissionsCol)
        rec.set('key', p.key)
        rec.set('name', p.name)
        rec.set('category', p.category)
        rec.set('is_critical', p.is_critical)
        rec.set('description', p.description)
        app.save(rec)
        permMap[p.key] = rec
      }
    }

    // 5. Atribuir aos Perfis do HUB CIAFAL
    const roleMappings = {
      PCP_ADMIN: [
        'pcp.executive.view',
        'pcp.executive.ask_ai',
        'pcp.executive.investigate',
        'pcp.executive.actions.manage',
        'pcp.executive.export',
        'pcp.executive.manage_briefing',
      ],
      EXECUTIVE_VIEWER: [
        'pcp.executive.view',
        'pcp.executive.ask_ai',
        'pcp.executive.investigate',
        'pcp.executive.actions.manage',
        'pcp.executive.export',
        'pcp.executive.manage_briefing',
      ],
      PCP_PROGRAMMER: [
        'pcp.executive.view',
        'pcp.executive.ask_ai',
        'pcp.executive.investigate',
        'pcp.executive.actions.manage',
        'pcp.executive.export',
      ],
      LINE_MANAGER: [
        'pcp.executive.view',
        'pcp.executive.ask_ai',
        'pcp.executive.investigate',
        'pcp.executive.actions.manage',
        'pcp.executive.export',
      ],
      AUDITOR: ['pcp.executive.view', 'pcp.executive.investigate', 'pcp.executive.export'],
      PRODUCTION_VIEWER: ['pcp.executive.view'],
    }

    for (const [rCode, keys] of Object.entries(roleMappings)) {
      try {
        const roleRec = app.findFirstRecordByData('pcp_roles', 'code', rCode)
        for (const k of keys) {
          const permRec = permMap[k]
          if (!permRec) continue
          const existing = app.findRecordsByFilter(
            'pcp_role_permissions',
            `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const rp = new Record(rolePermsCol)
            rp.set('role_id', roleRec.id)
            rp.set('permission_id', permRec.id)
            app.save(rp)
          }
        }
      } catch (_) {}
    }

    // 6. Definir o Agente Nativo Skip Cloud para Análise Executiva Corporativa
    // Slugs permitidos: kebab-case. Usa coleções autorizadas no modo user para respeitar RLS.
    $ai.agents.define(app, {
      slug: 'ciafal-executive-agent',
      name: 'Agente Corporativo CIAFAL',
      description:
        'Agente executivo com IA para análise transversal de produção, capacidade, estoques, desvios e planos de ação no HUB CIAFAL.',
      systemPrompt:
        'Você é o Agente Executivo e Corporativo de Inteligência do HUB CIAFAL (PCP Robotizado).\n' +
        'Suas respostas devem ser estritamente fundamentadas nos dados industriais reais aos quais o usuário autenticado possui acesso.\n' +
        'DIRETRIZES OBRIGATÓRIAS CIAFAL:\n' +
        '1. NUNCA calcule métricas críticas ou faça matemática livre: use os dados determinísticos das coleções e das análises consolidadas.\n' +
        '2. Estruture respostas executivas em: Situação Atual, Evidências, Tendência, Impacto e Recomendação.\n' +
        '3. Sempre diferencie com clareza Fato vs. Hipótese e Causalidade vs. Correlação (use: "Correlação identificada — causalidade ainda não comprovada").\n' +
        '4. Nunca use a unidade "ton" — use rigorosamente "t", "kg", "h", "%". Use formatação brasileira de números (ex.: 1.250,5 t).\n' +
        '5. Módulos que não são o PCP Robotizado (CRM, MES, WMS Inteligente, SGQ, CMMS, HCM, TMS) não possuem dados integrados nesta fase — reporte claramente "Módulo sem dados / integração pendente".\n' +
        '6. Recomendações devem conter: Justificativa, Evidência, Resultado Esperado, Nível de Confiança e Responsável Sugerido.\n' +
        '7. A IA NUNCA executa decisões críticas automaticamente — apenas sugere ações sujeitas a aprovação humana.',
      tier: 'fast',
      tools: [
        { collection: 'production_lines', perms: { list: true, read: true } },
        { collection: 'production_capacity_logs', perms: { list: true, read: true } },
        { collection: 'pcp_alerts', perms: { list: true, read: true } },
        { collection: 'inventory_items', perms: { list: true, read: true } },
        { collection: 'pcp_schedules', perms: { list: true, read: true } },
        { collection: 'optimization_scenarios', perms: { list: true, read: true } },
        { collection: 'scenario_items', perms: { list: true, read: true } },
        { collection: 'production_deviations', perms: { list: true, read: true } },
        { collection: 'executive_analyses', perms: { list: true, read: true, create: true } },
        {
          collection: 'executive_actions',
          perms: { list: true, read: true, create: true, update: true },
        },
        { collection: 'executive_briefings', perms: { list: true, read: true, create: true } },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text:
              'Política Corporativa CIAFAL de Governança Executiva:\n' +
              '- Unidade de medida de massa oficial: t (tonelada métrica). Proibido usar ton.\n' +
              '- Formato numérico oficial: 1.250,5 t (ponto milhar, vírgula decimal).\n' +
              '- Linhas industriais principais: L01 (Laminação 01 - Divinópolis), L02 (Trefilação 02 - Contagem), L03 (Corte e Dobra 03), L04 (Tratamento Térmico 04).\n' +
              '- Meta padrão corporativa de OEE: 85%.\n' +
              '- Meta de aderência à programação: 90%.\n' +
              '- Buffer térmico mínimo de segurança: 15 t entre Laminação e Trefilação.\n' +
              '- Ações executivas possuem ciclo de vida formal: Análise -> Decisão -> Ação -> Responsável -> Prazo -> Resultado -> Eficácia.',
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'ciafal-executive-agent')
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('executive_briefings'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('executive_actions'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('executive_analyses'))
    } catch (_) {}
  },
)
