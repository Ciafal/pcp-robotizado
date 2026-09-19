/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Coleção pcp_production_orders (Ordens de Produção)
    const ordersCol = new Collection({
      name: 'pcp_production_orders',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'op_number', type: 'text', required: true },
        { name: 'empresa_code', type: 'text', required: true },
        { name: 'centro_code', type: 'text', required: true },
        { name: 'linha_code', type: 'text', required: true },
        { name: 'work_center', type: 'text' },
        { name: 'material_code', type: 'text', required: true },
        { name: 'material_description', type: 'text', required: true },
        { name: 'family_code', type: 'text' },
        { name: 'steel_grade', type: 'text' },
        { name: 'gauge_dimension', type: 'text' },
        { name: 'product_name', type: 'text' },
        { name: 'mrp_planner', type: 'text' },
        { name: 'programming_type', type: 'text' },
        { name: 'quantity_planned_tons', type: 'number' },
        { name: 'quantity_produced_tons', type: 'number' },
        { name: 'quantity_posted_tons', type: 'number' },
        { name: 'quantity_sap_tons', type: 'number' },
        { name: 'balance_tons', type: 'number' },
        { name: 'yield_planned_pct', type: 'number' },
        { name: 'yield_realized_pct', type: 'number' },
        { name: 'planned_start_date', type: 'text' },
        { name: 'planned_end_date', type: 'text' },
        { name: 'real_start_date', type: 'text' },
        { name: 'real_end_date', type: 'text' },
        {
          name: 'status_op',
          type: 'select',
          values: [
            'PROGRAMADA',
            'EM_PRODUCAO',
            'PARCIALMENTE_APONTADA',
            'CONCLUIDA_FISICAMENTE',
            'AGUARDANDO_FECHAMENTO',
            'ENCERRADA',
            'CANCELADA',
          ],
          maxSelect: 1,
        },
        {
          name: 'status_mes',
          type: 'select',
          values: [
            'NAO_INICIADO',
            'EM_EXECUCAO',
            'PARADA_OPERACIONAL',
            'INTERROMPIDO',
            'FINALIZADO_OPERADOR',
            'SEM_COMUNICACAO',
          ],
          maxSelect: 1,
        },
        {
          name: 'status_sap',
          type: 'select',
          values: [
            'CRIADA_LIBERADA',
            'INTEGRADA_ZPPT010',
            'CONFIRMADA_TOTAL',
            'CONFIRMADA_PARCIAL',
            'ERRO_INTEGRACAO',
            'REJEITADA_SAP',
            'FECHADA_TECNICAMENTE',
          ],
          maxSelect: 1,
        },
        {
          name: 'status_fechamento',
          type: 'select',
          values: ['APTA', 'PENDENTE_DE_FECHAMENTO', 'FECHADA', 'BLOQUEADA'],
          maxSelect: 1,
        },
        {
          name: 'visual_status',
          type: 'select',
          values: ['NORMAL', 'ATENCAO', 'DESVIO', 'CRITICO', 'AGUARDANDO', 'CONCLUIDO'],
          maxSelect: 1,
        },
        {
          name: 'ai_risk_score',
          type: 'select',
          values: ['NORMAL', 'ATENCAO', 'ALTO_RISCO', 'CRITICO'],
          maxSelect: 1,
        },
        { name: 'ai_risk_reason', type: 'text' },
        { name: 'has_pendency', type: 'bool' },
        { name: 'has_deviation', type: 'bool' },
        { name: 'deviation_reason', type: 'text' },
        { name: 'last_posting_at', type: 'text' },
        { name: 'operator_leader', type: 'text' },
        { name: 'flow_status_json', type: 'json' },
        { name: 'timeline_json', type: 'json' },
        { name: 'checklist_fechamento_json', type: 'json' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pcp_po_op ON pcp_production_orders (op_number)',
        'CREATE INDEX idx_pcp_po_centro ON pcp_production_orders (centro_code)',
        'CREATE INDEX idx_pcp_po_status ON pcp_production_orders (status_op)',
        'CREATE INDEX idx_pcp_po_fech ON pcp_production_orders (status_fechamento)',
        'CREATE INDEX idx_pcp_po_mat ON pcp_production_orders (material_code)',
      ],
    })
    app.save(ordersCol)

    // 2. Coleção pcp_production_postings (Apontamentos ZPPT010)
    const postingsCol = new Collection({
      name: 'pcp_production_postings',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'posting_code', type: 'text', required: true },
        { name: 'op_number', type: 'text', required: true },
        { name: 'posting_date', type: 'text', required: true },
        { name: 'posting_time', type: 'text', required: true },
        { name: 'empresa_code', type: 'text' },
        { name: 'centro_code', type: 'text' },
        { name: 'linha_code', type: 'text' },
        { name: 'work_center', type: 'text' },
        { name: 'shift_code', type: 'text' },
        { name: 'operation_code', type: 'text' },
        { name: 'posting_type', type: 'text' },
        { name: 'quantity_tons', type: 'number' },
        { name: 'unit', type: 'text' },
        { name: 'operator_name', type: 'text' },
        {
          name: 'data_origin',
          type: 'select',
          values: ['PCP', 'MES', 'SAP', 'IA', 'USUARIO'],
          maxSelect: 1,
        },
        {
          name: 'status_mes',
          type: 'select',
          values: ['RECEBIDO', 'EM_PROCESSAMENTO', 'VALIDADO_MES', 'REJEITADO_MES'],
          maxSelect: 1,
        },
        {
          name: 'status_sap',
          type: 'select',
          values: [
            'RECEBIDO',
            'EM_PROCESSAMENTO',
            'ENVIADO_SAP',
            'PROCESSADO_SAP',
            'REJEITADO_SAP',
            'AGUARDANDO_CORRECAO',
            'CORRIGIDO',
            'REPROCESSANDO',
          ],
          maxSelect: 1,
        },
        { name: 'sap_message', type: 'text' },
        { name: 'sap_document_number', type: 'text' },
        { name: 'retry_attempts', type: 'number' },
        { name: 'last_retry_at', type: 'text' },
        { name: 'has_pendency', type: 'bool' },
        { name: 'pendency_reason', type: 'text' },
        { name: 'required_action', type: 'text' },
        { name: 'zppt010_payload', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pcp_post_code ON pcp_production_postings (posting_code)',
        'CREATE INDEX idx_pcp_post_op ON pcp_production_postings (op_number)',
        'CREATE INDEX idx_pcp_post_sap ON pcp_production_postings (status_sap)',
        'CREATE INDEX idx_pcp_post_dt ON pcp_production_postings (posting_date)',
      ],
    })
    app.save(postingsCol)

    // 3. Coleção pcp_closing_pendencies (Pendências de Fechamento)
    const pendenciesCol = new Collection({
      name: 'pcp_closing_pendencies',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'pendency_code', type: 'text', required: true },
        { name: 'op_number', type: 'text', required: true },
        { name: 'centro_code', type: 'text', required: true },
        { name: 'linha_code', type: 'text' },
        { name: 'material_code', type: 'text' },
        { name: 'material_description', type: 'text' },
        { name: 'problem_category', type: 'text', required: true },
        { name: 'problem_description', type: 'text', required: true },
        { name: 'business_impact', type: 'text' },
        { name: 'responsible_role_or_user', type: 'text' },
        { name: 'detected_at', type: 'text' },
        { name: 'pending_duration_text', type: 'text' },
        {
          name: 'criticality',
          type: 'select',
          values: ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'],
          maxSelect: 1,
        },
        { name: 'required_action', type: 'text' },
        {
          name: 'resolution_status',
          type: 'select',
          values: ['PENDENTE', 'EM_TRATAMENTO', 'CONCILIADO', 'JUSTIFICADO', 'ENCERRADO'],
          maxSelect: 1,
        },
        { name: 'resolution_notes', type: 'text' },
        { name: 'checklist_item_affected', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pcp_cp_code ON pcp_closing_pendencies (pendency_code)',
        'CREATE INDEX idx_pcp_cp_op ON pcp_closing_pendencies (op_number)',
        'CREATE INDEX idx_pcp_cp_crit ON pcp_closing_pendencies (criticality)',
        'CREATE INDEX idx_pcp_cp_status ON pcp_closing_pendencies (resolution_status)',
      ],
    })
    app.save(pendenciesCol)

    // 4. Coleção pcp_production_stops (Paradas do MES)
    const stopsCol = new Collection({
      name: 'pcp_production_stops',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'stop_code', type: 'text', required: true },
        { name: 'op_number', type: 'text' },
        { name: 'linha_code', type: 'text', required: true },
        { name: 'centro_code', type: 'text' },
        { name: 'start_datetime', type: 'text', required: true },
        { name: 'end_datetime', type: 'text' },
        { name: 'duration_minutes', type: 'number' },
        { name: 'reason_reported', type: 'text' },
        { name: 'technical_cause_confirmed', type: 'text' },
        { name: 'category', type: 'text' },
        { name: 'maintenance_order_ref', type: 'text' },
        { name: 'maintenance_note_ref', type: 'text' },
        { name: 'operator_name', type: 'text' },
        { name: 'is_open', type: 'bool' },
        { name: 'correlation_notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pcp_stops_code ON pcp_production_stops (stop_code)',
        'CREATE INDEX idx_pcp_stops_op ON pcp_production_stops (op_number)',
        'CREATE INDEX idx_pcp_stops_lin ON pcp_production_stops (linha_code)',
      ],
    })
    app.save(stopsCol)

    // 5. Coleção pcp_zpp01_config (Parametrização de Centros e Blocos ZPP_01)
    const zppConfigCol = new Collection({
      name: 'pcp_zpp01_config',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'group_code', type: 'text', required: true },
        { name: 'group_label', type: 'text', required: true },
        { name: 'column_code', type: 'text', required: true },
        { name: 'column_label', type: 'text', required: true },
        { name: 'center_code', type: 'text', required: true },
        { name: 'line_code', type: 'text' },
        { name: 'company_code', type: 'text' },
        { name: 'is_active', type: 'bool' },
        { name: 'order_seq', type: 'number' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_zpp_cfg_grp_col ON pcp_zpp01_config (group_code, column_code)',
        'CREATE INDEX idx_zpp_cfg_active ON pcp_zpp01_config (is_active)',
      ],
    })
    app.save(zppConfigCol)

    // 6. Cadastrar Permissões RBAC pcp.production.*
    const permsCol = app.findCollectionByNameOrId('pcp_permissions')
    const productionPerms = [
      {
        key: 'pcp.production.view',
        name: 'Visualizar Controle de Produção',
        category: 'CONTROLE_DE_PRODUCAO',
        description: 'Consulta painéis, ordens, apontamentos e relatórios de produção.',
        is_critical: false,
      },
      {
        key: 'pcp.production.close',
        name: 'Tratar Fechamento e Pendências',
        category: 'CONTROLE_DE_PRODUCAO',
        description: 'Tratar pendências de fechamento, conciliações e liberação de OPs.',
        is_critical: true,
      },
      {
        key: 'pcp.production.admin',
        name: 'Administrar Controle de Produção',
        category: 'CONTROLE_DE_PRODUCAO',
        description: 'Parametrização ZPP_01, reprocessamento SAP e governança de produção.',
        is_critical: true,
      },
    ]

    for (const p of productionPerms) {
      try {
        app.findFirstRecordByData('pcp_permissions', 'key', p.key)
      } catch (_) {
        const rec = new Record(permsCol)
        rec.set('key', p.key)
        rec.set('name', p.name)
        rec.set('category', p.category)
        rec.set('description', p.description)
        rec.set('is_critical', p.is_critical)
        app.save(rec)
      }
    }

    // 7. Agente Nativo Skip Cloud: ciafal-production-agent
    $ai.agents.define(app, {
      slug: 'ciafal-production-agent',
      name: 'Agente Especialista em Controle de Produção CIAFAL',
      description:
        'Agente analítico de produção para detecção de desvios, causas de não fechamento, consistência MES x SAP, cálculo de score de risco e análise executiva de período.',
      systemPrompt:
        'Você é o Agente Especialista em Controle de Produção do HUB CIAFAL (indústria siderúrgica e conformação mecânica).\n' +
        'DIRETRIZES FUNDAMENTAIS:\n' +
        '1. SEPARAÇÃO OBRIGATÓRIA EM 3 BLOCOS:\n' +
        '   - FATO: dados objetivos verificáveis (OP, centro, tonelada programada vs realizada, rendimento %, horários, status SAP).\n' +
        '   - HIPÓTESE DA IA: interpretações probabilísticas e correlações (ex: possível desgaste de cilindro, perda térmica). NUNCA apresente hipótese como fato provado.\n' +
        '   - AÇÃO SUGERIDA: ação prática com responsável claro (ex: acionar Manutenção Mecânica, estornar apontamento duplicado no SAP).\n' +
        '2. LÓGICA DE CONCILIAÇÃO:\n' +
        '   - Quanto o PCP programou? Quanto o MES registrou? Quanto foi apontado? Quanto chegou ao SAP? Qual a diferença e o impacto?\n' +
        '   - Correlação com paradas de linha: "CORRELAÇÃO NÃO SIGNIFICA CAUSA CONFIRMADA".\n' +
        '3. RESUMO EXECUTIVO DO PERÍODO (11 SEÇÕES OBRIGATÓRIAS QUANDO SOLICITADO):\n' +
        '   1. Panorama Geral de Produção\n' +
        '   2. Aderência ao Programado (Volume e Mix)\n' +
        '   3. Rendimento Metálico e Perdas\n' +
        '   4. Produtividade e Ritmo Operacional (t/h)\n' +
        '   5. Principais Paradas e Interrupções\n' +
        '   6. Gargalos e Restrições Identificados\n' +
        '   7. OPs Críticas e Em Risco\n' +
        '   8. Status de Apontamentos e Integração SAP (ZPPT010)\n' +
        '   9. Pendências de Fechamento e Causas-Raiz\n' +
        '   10. Padrões Recorrentes e Anomalias Detectadas\n' +
        '   11. Plano de Ação Recomendado (Priorizado)\n' +
        '4. Sempre use unidades corretas: "t" (toneladas), "t/h", "h", "%" e números no formato pt-BR.',
      tier: 'fast',
      tools: [
        { collection: 'pcp_production_orders', perms: { list: true, read: true } },
        { collection: 'pcp_production_postings', perms: { list: true, read: true } },
        { collection: 'pcp_closing_pendencies', perms: { list: true, read: true } },
        { collection: 'pcp_production_stops', perms: { list: true, read: true } },
        { collection: 'weekly_schedules', perms: { list: true, read: true } },
        { collection: 'production_lines', perms: { list: true, read: true } },
        { collection: 'pcp_alerts', perms: { list: true, read: true, create: true } },
        { collection: 'pcp_audit_logs', perms: { list: true, read: true, create: true } },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text:
              'Regras de Produção e Fechamento CIAFAL:\n' +
              '- Uma OP só pode ser encerrada se cumprir os 10 requisitos do checklist de fechamento.\n' +
              '- Status MES (chão de fábrica) e status SAP (ERP oficial) são independentes e nunca devem ser fundidos.\n' +
              '- Origens dos dados: PCP (programação), MES (operação física), SAP (oficial), IA (análise preditiva), USUÁRIO (intervenção manual auditada).\n' +
              '- ZPPT010 é a estrutura padrão de apontamento de ordens para confirmação SAP.',
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'ciafal-production-agent')
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_zpp01_config'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_production_stops'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_closing_pendencies'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_production_postings'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_production_orders'))
    } catch (_) {}
  },
)
