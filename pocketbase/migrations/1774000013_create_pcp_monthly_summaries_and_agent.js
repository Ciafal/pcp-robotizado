/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Coleção: pcp_monthly_summaries
    // Resumo Mensal de Entregas PCP com 18 seções mínimas estruturadas, versionamento e workflow
    const summariesCol = new Collection({
      name: 'pcp_monthly_summaries',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'summary_code', type: 'text', required: true },
        { name: 'empresa_code', type: 'text', required: true },
        { name: 'centro_code', type: 'text', required: true },
        { name: 'centro_nome', type: 'text' },
        { name: 'linha_code', type: 'text', required: true },
        { name: 'linha_nome', type: 'text' },
        { name: 'ano', type: 'number', required: true },
        { name: 'mes', type: 'number', required: true },
        { name: 'mes_ano', type: 'text', required: true },
        { name: 'version_number', type: 'number', required: true },
        { name: 'version_tag', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'RASCUNHO_IA',
            'EM_EDICAO_PCP',
            'AGUARDANDO_APROVACAO',
            'APROVADO',
            'PUBLICADO',
            'ENVIADO',
          ],
          maxSelect: 1,
        },
        {
          name: 'responsavel_pcp_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'responsavel_pcp_nome', type: 'text' },
        { name: 'responsavel_pcp_email', type: 'text' },
        { name: 'data_entrega', type: 'text' },
        { name: 'dia_util', type: 'text' },
        { name: 'origem_programacao_ref', type: 'text' },
        { name: 'sections_data', type: 'json' },
        { name: 'revisions_history', type: 'json' },
        { name: 'data_verification_report', type: 'json' },
        { name: 'approvals_data', type: 'json' },
        { name: 'reading_confirmations', type: 'json' },
        { name: 'read_count', type: 'number' },
        { name: 'total_recipients_count', type: 'number' },
        { name: 'agenda_event_id', type: 'text' },
        { name: 'email_dispatched_at', type: 'text' },
        { name: 'email_recipients', type: 'json' },
        { name: 'pdf_generated_at', type: 'text' },
        { name: 'published_at', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pms_code ON pcp_monthly_summaries (summary_code)',
        'CREATE INDEX idx_pms_filter ON pcp_monthly_summaries (empresa_code, centro_code, linha_code, ano, mes)',
        'CREATE INDEX idx_pms_status ON pcp_monthly_summaries (status)',
      ],
    })
    app.save(summariesCol)

    // 2. Coleção: pcp_corporate_calendar_events
    // Eventos publicados na Agenda Corporativa HUB CIAFAL
    const agendaCol = new Collection({
      name: 'pcp_corporate_calendar_events',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'event_code', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'event_type', type: 'text', required: true },
        { name: 'summary_id', type: 'relation', collectionId: summariesCol.id, maxSelect: 1 },
        { name: 'summary_code', type: 'text' },
        { name: 'empresa_code', type: 'text' },
        { name: 'centro_code', type: 'text' },
        { name: 'linha_code', type: 'text' },
        { name: 'periodo_ref', type: 'text' },
        { name: 'version_tag', type: 'text' },
        { name: 'data_entrega', type: 'text' },
        { name: 'responsavel_nome', type: 'text' },
        { name: 'report_link', type: 'text' },
        { name: 'pdf_link', type: 'text' },
        { name: 'alerts_summary', type: 'text' },
        { name: 'prazo_leitura', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['ATIVO', 'CONCLUIDO', 'EXPIRADO', 'CANCELADO'],
          maxSelect: 1,
        },
        { name: 'target_groups', type: 'json' },
        { name: 'readers_status', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pcce_code ON pcp_corporate_calendar_events (event_code)',
        'CREATE INDEX idx_pcce_summary ON pcp_corporate_calendar_events (summary_code)',
      ],
    })
    app.save(agendaCol)

    // 3. Declarar Agente Nativo Skip Cloud: ciafal-pcp-summary-agent
    // Atende ao requisito do plano: criar agente nativo via migration
    $ai.agents.define(app, {
      slug: 'ciafal-pcp-summary-agent',
      name: 'Agente Especialista em Resumos Mensais PCP CIAFAL',
      description:
        'Agente nativo Skip Cloud para consolidação, revisão textual assistida e auditoria analítica dos Resumos Mensais de Entregas PCP nas linhas L1, L2, SDC e Matriz.',
      systemPrompt:
        'Você é o Agente Especialista em Resumos Mensais de Entregas PCP do HUB CIAFAL.\n' +
        'DIRETRIZES DE SEGURANÇA E PRECISÃO:\n' +
        '1. NUNCA altere números, toneladas (t), códigos SAP de materiais, datas (DD/MM/AAAA), percentuais (%), nomes de centros ou versões.\n' +
        '2. Se detectar inconsistência de dados ou dados divergentes da fonte, apenas SINALIZE no parecer em formato de alerta sem reescrever o dado bruto.\n' +
        '3. Modos de revisão solicitados: Corrigir português, Melhorar clareza, Tornar mais executivo, Resumir, Expandir análise, Verificar inconsistências, Comparar com dados de origem.\n' +
        '4. Sempre retorne uma sugestão clara comparável com o original, destacando os trechos aprimorados.\n' +
        '5. Diferenciação por linha:\n' +
        '   - Linha L1: enfoque em carteira, industrializados (Arcelor/TB-002), sequenciamento, produtividade (t/h), bitolas, paradas e aços.\n' +
        '   - Linha L2: enfoque em MP para L1 e SDC, tarugos, aços especiais (525kg/510kg), redondos especiais, períodos de laminação e prognóstico por família.\n' +
        '   - Linha SDC: enfoque em carteira negativa, cobertura temporal, estoque projetado, curva ABC, saldo, dias de estoque, ruptura estimada e dependência de MP gerada pela L2.\n' +
        '6. Adote o padrão de linguagem CIAFAL: tom técnico, executivo, objetivo, sem floreios subjetivos.',
      tier: 'fast',
      tools: [
        { collection: 'pcp_monthly_summaries', perms: { list: true, read: true } },
        { collection: 'weekly_schedules', perms: { list: true, read: true } },
        { collection: 'carteira_items', perms: { list: true, read: true } },
        { collection: 'production_lines', perms: { list: true, read: true } },
        { collection: 'line_masters', perms: { list: true, read: true } },
        { collection: 'inventory_items', perms: { list: true, read: true } },
        { collection: 'production_deviations', perms: { list: true, read: true } },
        { collection: 'pcp_audit_logs', perms: { list: true, read: true, create: true } },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text:
              'Diretrizes de Governança para Resumo Mensal CIAFAL:\n' +
              '- Unidade oficial de massa: "t" (tonelada métrica). Não usar "ton".\n' +
              '- Formatação numérica: 1.250,50 t e percentuais 94,6%.\n' +
              '- Datas no padrão pt-BR: DD/MM/AAAA.\n' +
              '- Versionamento V1, V2, V3 com histórico imutável após aprovação.\n' +
              '- Rastreabilidade por linha: L1 (tubos e perfis leves), L2 (estruturais pesados e MP para L1/SDC), SDC (Sidercentro - estoque projetado e carteira negativa).\n' +
              '- Revisão com IA nunca altera dados transacionais — toda alteração requer aprovação humana explícita.',
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'ciafal-pcp-summary-agent')
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_corporate_calendar_events'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_monthly_summaries'))
    } catch (_) {}
  },
)
