migrate(
  (app) => {
    // 1. mp_sdc_stock_sources (Matriz: Fonte de estoque por empresa/operação - Parametrização dinâmica de depósitos)
    let sdcStockSourcesCol
    try {
      sdcStockSourcesCol = app.findCollectionByNameOrId('mp_sdc_stock_sources')
    } catch (_) {
      sdcStockSourcesCol = new Collection({
        name: 'mp_sdc_stock_sources',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'company_code', type: 'text', required: true }, // 'CIAFAL', 'SIDERCENTRO_SDC', 'KS'
          { name: 'company_name', type: 'text', required: true },
          { name: 'plant_center', type: 'text', required: true }, // 'CFPL', 'SDC1', 'KS01'
          { name: 'storage_deposit', type: 'text', required: true }, // 'DS03', 'DP04', 'DP07', 'DP18', 'DP20', 'KS_DEP'
          { name: 'deposit_description', type: 'text' },
          { name: 'operation_type', type: 'text', required: true }, // 'ESTOQUE_SDC', 'ESTOQUE_CIAFAL', 'ESTOQUE_KS', 'PLACAS_FINAS', 'SUCATA_UTILIZAVEL', 'ENTRADAS_PROGRAMADAS'
          { name: 'mp_owner', type: 'text', required: true }, // 'SIDERCENTRO', 'CIAFAL', 'COMPARTILHAVEL', 'TERCEIROS'
          { name: 'stock_type', type: 'text', required: true }, // 'PROPRIO_SDC', 'CIAFAL_ELEGIVEL', 'KS_ELEGIVEL', 'RECLASSIFICAVEL', 'BLOQUEADO'
          { name: 'utilization_rule', type: 'text' }, // 'LIBERADO_SDC', 'AVALIACAO_TECNICA', 'CESSAO_RESTRITA'
          { name: 'valid_from', type: 'date' },
          { name: 'valid_until', type: 'date' },
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_sdc_src_comp_dep ON mp_sdc_stock_sources (company_code, plant_center, storage_deposit)',
          'CREATE INDEX idx_mp_sdc_src_owner ON mp_sdc_stock_sources (mp_owner, stock_type)',
        ],
      })
      app.save(sdcStockSourcesCol)
    }

    // 2. mp_sdc_pools (Pools de Matéria-Prima com regras de substituição, restrições e vigência)
    let sdcPoolsCol
    try {
      sdcPoolsCol = app.findCollectionByNameOrId('mp_sdc_pools')
    } catch (_) {
      sdcPoolsCol = new Collection({
        name: 'mp_sdc_pools',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'pool_code', type: 'text', required: true }, // 'POOL_AC_B', 'POOL_A_C', 'POOL_AC_1020', 'POOL_AC_IF_Z', 'POOL_A_C_1020', 'POOL_A_B_C'
          { name: 'pool_name', type: 'text', required: true },
          { name: 'participating_steels_json', type: 'json' }, // ['AC', 'Classe B']
          { name: 'participating_classes_json', type: 'json' }, // ['CLASSE_A', 'CLASSE_C']
          { name: 'target_line', type: 'text' }, // 'L1', 'L2', 'SDC_CORTE_DOBRA', 'TODAS'
          { name: 'target_product_family', type: 'text' },
          { name: 'substitution_rule_description', type: 'text', required: true },
          { name: 'consumption_priority_json', type: 'json' }, // ['AC', 'Classe B', '1020']
          { name: 'technical_restrictions', type: 'text' },
          { name: 'requires_quality_validation', type: 'bool' },
          { name: 'valid_from', type: 'date' },
          { name: 'valid_until', type: 'date' },
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_sdc_pool_code ON mp_sdc_pools (pool_code)',
          'CREATE INDEX idx_mp_sdc_pool_active ON mp_sdc_pools (is_active)',
        ],
      })
      app.save(sdcPoolsCol)
    }

    // 3. mp_sdc_min_stock_parameters (Estoque Mínimo de Segurança Parametrizável por Operação/Aço/Pool/Linha)
    let sdcMinStockCol
    try {
      sdcMinStockCol = app.findCollectionByNameOrId('mp_sdc_min_stock_parameters')
    } catch (_) {
      sdcMinStockCol = new Collection({
        name: 'mp_sdc_min_stock_parameters',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'company_code', type: 'text', required: true }, // 'SIDERCENTRO_SDC'
          { name: 'operation_code', type: 'text', required: true }, // 'CORTE_DOBRA', 'LAMINACAO'
          { name: 'steel_grade', type: 'text' }, // 'AC', '1020', '1045', '1522', 'IF', etc.
          { name: 'steel_class', type: 'text' }, // 'CLASSE_A', 'CLASSE_B', 'CLASSE_C', 'CLASSE_D', 'CLASSE_Z', 'FX'
          { name: 'pool_code', type: 'text' }, // 'POOL_AC_B'
          { name: 'line_code', type: 'text' }, // 'L1', 'L2', 'SDC'
          { name: 'min_stock_tons', type: 'number', required: true },
          { name: 'reorder_point_tons', type: 'number' },
          { name: 'valid_from', type: 'date' },
          { name: 'valid_until', type: 'date' },
          { name: 'responsible_name', type: 'text', required: true },
          { name: 'justification_origin', type: 'text', required: true },
          { name: 'rule_source_authority', type: 'text' },
          { name: 'version', type: 'number' },
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_sdc_min_steel ON mp_sdc_min_stock_parameters (steel_grade, is_active)',
          'CREATE INDEX idx_mp_sdc_min_pool ON mp_sdc_min_stock_parameters (pool_code, is_active)',
        ],
      })
      app.save(sdcMinStockCol)
    }

    // 4. mp_sdc_daily_consumption (Programação Diária de Consumo SDC e Vínculo com Ordens Oficiais)
    let sdcDailyConsumptionCol
    try {
      sdcDailyConsumptionCol = app.findCollectionByNameOrId('mp_sdc_daily_consumption')
    } catch (_) {
      sdcDailyConsumptionCol = new Collection({
        name: 'mp_sdc_daily_consumption',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'consumption_date', type: 'date', required: true },
          { name: 'week_ref', type: 'text', required: true }, // 'W34', 'W35'
          { name: 'steel_grade', type: 'text', required: true },
          { name: 'steel_class', type: 'text' },
          { name: 'pool_code', type: 'text' },
          { name: 'programmed_tons', type: 'number', required: true },
          { name: 'realized_tons', type: 'number' },
          { name: 'variance_tons', type: 'number' },
          { name: 'need_origin', type: 'text', required: true }, // 'PROGRAMACAO_OFICIAL_PCP', 'ORDEM_SAP_PP', 'AJUSTE_SDC'
          { name: 'production_order_ref', type: 'text' },
          { name: 'sap_order_ref', type: 'text' },
          { name: 'yielding_rate_applied', type: 'number' },
          { name: 'scrap_loss_rate', type: 'number' },
          { name: 'compatible_steels_json', type: 'json' }, // Aços que podem atender a data
          { name: 'allocated_steel', type: 'text' },
          { name: 'status', type: 'text' }, // 'PROGRAMADO', 'EM_CORTE', 'CONSUMIDO', 'REMARCADO'
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_sdc_cns_date ON mp_sdc_daily_consumption (consumption_date, steel_grade)',
          'CREATE INDEX idx_mp_sdc_cns_week ON mp_sdc_daily_consumption (week_ref, steel_grade)',
        ],
      })
      app.save(sdcDailyConsumptionCol)
    }

    // 5. mp_sdc_l2_planned_vs_realized (Aderência e Produção Prevista L2 com impacto no estoque SDC)
    let sdcL2PxRCol
    try {
      sdcL2PxRCol = app.findCollectionByNameOrId('mp_sdc_l2_planned_vs_realized')
    } catch (_) {
      sdcL2PxRCol = new Collection({
        name: 'mp_sdc_l2_planned_vs_realized',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'period_ref', type: 'text', required: true }, // 'W34', '2026-08'
          { name: 'steel_grade', type: 'text', required: true },
          { name: 'steel_class', type: 'text' },
          { name: 'planned_l2_tons', type: 'number', required: true },
          { name: 'realized_l2_tons', type: 'number', required: true },
          { name: 'deviation_tons', type: 'number' },
          { name: 'adherence_pct', type: 'number', required: true },
          { name: 'useful_yield_factor', type: 'number' }, // Ex: 0.95
          { name: 'useful_tons_for_sdc', type: 'number' },
          { name: 'availability_date', type: 'date' },
          { name: 'impact_on_sdc_coverage_days', type: 'number' },
          { name: 'traffic_light', type: 'text', required: true }, // 'VERDE', 'AMARELO', 'LARANJA', 'VERMELHO'
          { name: 'operational_risk_summary', type: 'text' },
          { name: 'human_notes', type: 'text' },
          { name: 'is_official_sync', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_sdc_l2_prd ON mp_sdc_l2_planned_vs_realized (period_ref, steel_grade)',
        ],
      })
      app.save(sdcL2PxRCol)
    }

    // 6. Atualizar e Enriquecer Agente de IA com as competências de MP Sidercentro
    try {
      $ai.agents.define(app, {
        slug: 'ciafal-mp-analyst-agent',
        name: 'Agente Especialista em Matéria-Prima CIAFAL',
        description:
          'Agente de IA especializado na análise contínua de estoques de MP, projeções de ruptura, simulação de compras, balanço por destino/industrializadores (Arcelor/TB-002) e gestão dedicada da Sidercentro (SDC, DS03, DP04, KS, L2, Pools compostos).',
        systemPrompt:
          'Você é o Engenheiro Especialista em Matéria-Prima e PCP do HUB CIAFAL (atendendo operações próprias, Arcelor e Sidercentro/SDC). Para a Sidercentro: separe rigorosamente Estoque SDC (DS03), Estoque CIAFAL elegível (DP04), KS elegível, Sucata utilizável e Entradas programadas. Diferencie MP CIAFAL própria de MP Sidercentro e MP compartilhável/reclassificável. Resolva Pools de MP (AC+B, A+C, AC+1020, AC/IF/Classe Z, etc.) obedecendo regras técnicas vigentes. Calcule cobertura estatística e cronológica pela programação diária/semanal/mensal, detectando rupturas projetadas com data, tonelagem faltante e ordens impactadas. Avalie aderência da produção L2 cruzando com projeção real de estoque (aderência percentual != risco operacional). Nunca deixe saldos negativos sem plano de ação. Integre com Otimizar Aplicações e Planos de Corte sem aplicar alterações sem aprovação.',
        tier: 'fast',
        tools: [
          { collection: 'mp_sdc_stock_sources', perms: { read: true, list: true } },
          { collection: 'mp_sdc_pools', perms: { read: true, list: true } },
          { collection: 'mp_sdc_min_stock_parameters', perms: { read: true, list: true } },
          { collection: 'mp_sdc_daily_consumption', perms: { read: true, list: true } },
          { collection: 'mp_sdc_l2_planned_vs_realized', perms: { read: true, list: true } },
          { collection: 'mp_industrializer_contracts', perms: { read: true, list: true } },
          { collection: 'mp_industrializer_matrix', perms: { read: true, list: true } },
          { collection: 'mp_industrializer_inventory', perms: { read: true, list: true } },
          { collection: 'mp_industrializer_transit', perms: { read: true, list: true } },
          { collection: 'mp_industrializer_communications', perms: { read: true, list: true } },
          { collection: 'mp_industrializer_actions', perms: { read: true, list: true } },
          { collection: 'mp_industrializer_snapshots', perms: { read: true, list: true } },
          { collection: 'mp_destinations_inventory', perms: { read: true, list: true } },
          { collection: 'mp_special_steels_projection', perms: { read: true, list: true } },
          { collection: 'mp_l1_requirements_matrix', perms: { read: true, list: true } },
          { collection: 'mp_utilization_history', perms: { read: true, list: true } },
          { collection: 'mp_future_inventory_projection', perms: { read: true, list: true } },
          { collection: 'mp_purchase_orders', perms: { read: true, list: true } },
          { collection: 'mp_dimensional_inventory', perms: { read: true, list: true } },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text: 'Diretrizes Oficiais CIAFAL MP Sidercentro (SDC): Saldo SDC = Estoque SDC (DS03) + Estoque CIAFAL Elegível (DP04) + KS Elegível + Sucata utilizável + Entradas válidas. Não misturar estoque CIAFAL sem regra explícita de cessão/elegibilidade. Projeção: Saldo N+1 = Saldo N + Produção L2 útil + Recebimentos - Consumo SDC. Suporte a famílias AC, Classe B, Classe A, Classe C, Classe D, Classe Z, FX, IF, 1522, 1524, 1010, 1020, 1030, 1045, 8620, 4140, 4340. Pools compostos resolvidos por regras técnicas vigentes. Dupla cobertura: Estatística (dias) vs Cronológica (até DD/MM/AAAA). Homologação legada contra "Análise de matéria-prima.xlsx" com zero divergências não justificadas.',
            },
          },
        ],
      })
    } catch (e) {
      console.log('Skip AI Agent Sidercentro update skipped or not supported:', e)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('mp_sdc_l2_planned_vs_realized'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_sdc_daily_consumption'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_sdc_min_stock_parameters'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_sdc_pools'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_sdc_stock_sources'))
    } catch (_) {}
  },
)
