migrate(
  (app) => {
    // 1. mp_industrializer_contracts (Contratos e Parâmetros Versionados por Cliente Industrializador)
    let indContractsCol
    try {
      indContractsCol = app.findCollectionByNameOrId('mp_industrializer_contracts')
    } catch (_) {
      indContractsCol = new Collection({
        name: 'mp_industrializer_contracts',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'contract_code', type: 'text', required: true },
          { name: 'client_code', type: 'text', required: true },
          { name: 'client_name', type: 'text', required: true },
          { name: 'line_code', type: 'text', required: true },
          { name: 'product_group', type: 'text' },
          { name: 'metallic_yield_rate', type: 'number', required: true }, // Ex: 0.93 (93%)
          { name: 'monthly_order_avg_tons', type: 'number' }, // Ex: 6000
          { name: 'source_authority', type: 'text' }, // Ex: 'Contrato Vigente CIAFAL-Arcelor 2026'
          { name: 'technical_doc_ref', type: 'text' }, // Ex: 'TB-002 Rev.05'
          { name: 'version', type: 'number', required: true },
          { name: 'valid_from', type: 'date' },
          { name: 'valid_until', type: 'date' },
          { name: 'responsible_name', type: 'text' },
          { name: 'status', type: 'text' }, // ATIVO, EM_REVISAO, HISTORICO
          { name: 'schedule_check_routine_days', type: 'text' }, // 'SEG_QUA_SEX'
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_ind_ctr_code_ver ON mp_industrializer_contracts (contract_code, version)',
          'CREATE INDEX idx_mp_ind_ctr_client ON mp_industrializer_contracts (client_code, line_code)',
        ],
      })
      app.save(indContractsCol)
    }

    // 2. mp_industrializer_matrix (Matriz de MP do Industrializador: SAP, Família, Dimensões, Depósitos e Compatibilidade)
    let indMatrixCol
    try {
      indMatrixCol = app.findCollectionByNameOrId('mp_industrializer_matrix')
    } catch (_) {
      indMatrixCol = new Collection({
        name: 'mp_industrializer_matrix',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'client_code', type: 'text', required: true },
          { name: 'client_name', type: 'text', required: true },
          { name: 'sap_material_code', type: 'text', required: true },
          { name: 'sap_description', type: 'text' },
          { name: 'material_family', type: 'text' },
          { name: 'steel_grade', type: 'text', required: true },
          { name: 'dimension_section', type: 'text', required: true }, // '130x130', '150x150', etc.
          { name: 'dimension_display', type: 'text' }, // 'Tarugo 130x130 mm'
          { name: 'billet_length_mm', type: 'number' }, // Ex: 6000
          { name: 'billet_unit_weight_kg', type: 'number' }, // Ex: 525, 780
          { name: 'standard_depot', type: 'text' }, // DP07, DP18, DP20
          { name: 'consuming_line', type: 'text', required: true }, // L1
          { name: 'meta_productivity_threshold_th', type: 'number' }, // TB-002: 18.0 t/h
          { name: 'eligibility_rule_text', type: 'text' },
          { name: 'technical_doc_ref', type: 'text' }, // 'TB-002'
          { name: 'version', type: 'number' },
          { name: 'status', type: 'text' }, // 'ATIVO'
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_ind_mat_client ON mp_industrializer_matrix (client_code, consuming_line)',
          'CREATE INDEX idx_mp_ind_mat_sap ON mp_industrializer_matrix (sap_material_code, dimension_section)',
        ],
      })
      app.save(indMatrixCol)
    }

    // 3. mp_industrializer_inventory (Estoque SAP ECC por Centro CFPL e Depósitos DP07, DP18, DP20, Portaria e Descarga)
    let indInventoryCol
    try {
      indInventoryCol = app.findCollectionByNameOrId('mp_industrializer_inventory')
    } catch (_) {
      indInventoryCol = new Collection({
        name: 'mp_industrializer_inventory',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'client_code', type: 'text', required: true },
          { name: 'center_code', type: 'text', required: true }, // 'CFPL'
          { name: 'dimension_section', type: 'text', required: true }, // '130x130', '150x150'
          { name: 'steel_grade', type: 'text', required: true },
          { name: 'dp18_whole_tons', type: 'number' }, // Tarugos inteiros
          { name: 'dp07_cut_ready_tons', type: 'number' }, // Tarugos cortados prontos
          { name: 'dp20_ks_pointed_tons', type: 'number' }, // Tarugos apontados KS aguardando transferência
          { name: 'awaiting_unloading_tons', type: 'number' }, // Carretas na portaria/descarga
          { name: 'in_transit_tons', type: 'number' }, // Em trânsito das usinas
          { name: 'received_tons', type: 'number' }, // Quantidade já recebida
          { name: 'remaining_to_receive_tons', type: 'number' }, // Quantidade a receber do plano
          { name: 'total_physical_ciafal_tons', type: 'number', required: true }, // DP18 + DP07 + DP20 + Descarga
          { name: 'total_ciafal_plus_transit_tons', type: 'number', required: true },
          { name: 'data_source_official', type: 'text' }, // 'SAP ECC MB52 (Direto)'
          { name: 'last_sync_timestamp', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_ind_inv_client ON mp_industrializer_inventory (client_code, dimension_section)',
        ],
      })
      app.save(indInventoryCol)
    }

    // 4. mp_industrializer_transit (MP em Trânsito e Carretas com Rastreabilidade de Origem)
    let indTransitCol
    try {
      indTransitCol = app.findCollectionByNameOrId('mp_industrializer_transit')
    } catch (_) {
      indTransitCol = new Collection({
        name: 'mp_industrializer_transit',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'client_code', type: 'text', required: true },
          { name: 'supplier_mill', type: 'text', required: true }, // Usina / Fornecedor
          { name: 'material_code', type: 'text' },
          { name: 'steel_grade', type: 'text', required: true },
          { name: 'dimension_section', type: 'text', required: true }, // '130x130', '150x150'
          { name: 'quantity_tons', type: 'number', required: true },
          { name: 'vehicle_plate', type: 'text' },
          { name: 'invoice_number', type: 'text' },
          { name: 'departure_date', type: 'date' },
          { name: 'expected_arrival_date', type: 'date', required: true },
          { name: 'status', type: 'text', required: true }, // EM_TRANSITO, PORTARIA, AGUARDANDO_DESCARGA, RECEBIDA, DISPONIVEL
          { name: 'source_system', type: 'text' }, // API_FORNECEDOR, TMS, EDI_ARQUIVO, EMAIL_INTEGRADO, CONTINGENCIA_MANUAL
          { name: 'driver_info', type: 'text' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_ind_trn_client ON mp_industrializer_transit (client_code, status)',
          'CREATE INDEX idx_mp_ind_trn_date ON mp_industrializer_transit (expected_arrival_date, dimension_section)',
        ],
      })
      app.save(indTransitCol)
    }

    // 5. mp_industrializer_communications (Comunicados Eletrônicos Automáticos de MP, Aprovação PCP e Registro de Auditoria)
    let indCommsCol
    try {
      indCommsCol = app.findCollectionByNameOrId('mp_industrializer_communications')
    } catch (_) {
      indCommsCol = new Collection({
        name: 'mp_industrializer_communications',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'communication_code', type: 'text', required: true },
          { name: 'client_code', type: 'text', required: true },
          { name: 'subject', type: 'text', required: true },
          { name: 'mode', type: 'text', required: true }, // 'MODO_REVISAO_PCP' ou 'MODO_ENVIO_AUTOMATICO'
          { name: 'approval_status', type: 'text', required: true }, // RASCUNHO, AGUARDANDO_APROVACAO_PCP, APROVADO, ENVIADO, CANCELADO
          { name: 'approved_by_user', type: 'text' },
          { name: 'approved_at', type: 'date' },
          { name: 'sent_at', type: 'date' },
          { name: 'recipients_roles_json', type: 'json' }, // { comercial: true, pcp: true, estoque: true, industria: true }
          { name: 'recipients_emails_json', type: 'json' },
          { name: 'schedule_version_ref', type: 'text' },
          { name: 'ai_summary_text', type: 'text' },
          { name: 'full_body_html', type: 'text' },
          { name: 'rupture_detected', type: 'bool' },
          { name: 'rupture_date', type: 'date' },
          { name: 'linked_to_meeting_minutes', type: 'bool' },
          { name: 'meeting_minutes_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_ind_comm_code ON mp_industrializer_communications (communication_code)',
          'CREATE INDEX idx_mp_ind_comm_client ON mp_industrializer_communications (client_code, approval_status)',
          'CREATE INDEX idx_mp_ind_comm_date ON mp_industrializer_communications (sent_at DESC)',
        ],
      })
      app.save(indCommsCol)
    }

    // 6. mp_industrializer_actions (Plano de Ação Automático de Mitigação de Ruptura, KS, Sequência e CRM)
    let indActionsCol
    try {
      indActionsCol = app.findCollectionByNameOrId('mp_industrializer_actions')
    } catch (_) {
      indActionsCol = new Collection({
        name: 'mp_industrializer_actions',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'action_code', type: 'text', required: true },
          { name: 'client_code', type: 'text', required: true },
          { name: 'origin_trigger', type: 'text', required: true }, // RUPTURA_MP, ATRASO_TRANSITO, REVISAO_L1, DESVIO_RENDIMENTO
          { name: 'action_type', type: 'text', required: true }, // CONFIRMAR_TRANSITO, ANTECIPAR_RECEBIMENTO, REVISAR_L1, REVISAR_KS, MP_ALTERNATIVA, COMUNICAR_COMERCIAL, COMUNICAR_INDUSTRIA, EVENTO_CRM
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'text' },
          { name: 'responsible_name', type: 'text', required: true },
          { name: 'target_deadline', type: 'date' },
          { name: 'status', type: 'text', required: true }, // PENDENTE, EM_ANDAMENTO, CONCLUIDO, CANCELADO
          { name: 'severity', type: 'text' }, // CRITICO, ALTO, MEDIO, BAIXO
          { name: 'impacted_tons', type: 'number' },
          { name: 'impacted_orders_json', type: 'json' },
          { name: 'evidence_notes', type: 'text' },
          { name: 'crm_event_dispatched', type: 'bool' },
          { name: 'control_tower_synced', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_ind_act_code ON mp_industrializer_actions (action_code)',
          'CREATE INDEX idx_mp_ind_act_client ON mp_industrializer_actions (client_code, status)',
        ],
      })
      app.save(indActionsCol)
    }

    // 7. mp_industrializer_snapshots (Histórico Cronológico e Auditoria de Assertividade das Previsões do PCP)
    let indSnapshotsCol
    try {
      indSnapshotsCol = app.findCollectionByNameOrId('mp_industrializer_snapshots')
    } catch (_) {
      indSnapshotsCol = new Collection({
        name: 'mp_industrializer_snapshots',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'snapshot_code', type: 'text', required: true },
          { name: 'client_code', type: 'text', required: true },
          { name: 'snapshot_date', type: 'date', required: true },
          { name: 'schedule_version', type: 'text' },
          { name: 'physical_stock_tons', type: 'number' },
          { name: 'transit_stock_tons', type: 'number' },
          { name: 'projected_consumption_tons', type: 'number' },
          { name: 'projected_balance_tons', type: 'number' },
          { name: 'predicted_rupture_date', type: 'date' },
          { name: 'requested_tons', type: 'number' },
          { name: 'effective_received_tons', type: 'number' },
          { name: 'outcome_status', type: 'text' }, // RUPTURA_EVITADA, RUPTURA_OCORRIDA, AJUSTE_PROGRAMACAO, EM_MONITORAMENTO
          { name: 'accuracy_score_pct', type: 'number' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_ind_snp_client ON mp_industrializer_snapshots (client_code, snapshot_date DESC)',
        ],
      })
      app.save(indSnapshotsCol)
    }

    // 8. Atualizar Agente IA Especialista em Matéria-Prima com as novas ferramentas e memória de industrializadores
    try {
      $ai.agents.define(app, {
        slug: 'ciafal-mp-analyst-agent',
        name: 'Agente Especialista em Matéria-Prima CIAFAL',
        description:
          'Agente de IA especializado na análise contínua de estoques de MP, projeções de ruptura, simulação de compras, balanço por destino/industrializadores, regras TB-002 de tarugos 130/150, rendimento de contratos e comunicados.',
        systemPrompt:
          'Você é o Engenheiro Especialista em Matéria-Prima e PCP do HUB CIAFAL. Analise estoque SAP MB52 (DP07, DP18, DP20), MP em trânsito de clientes industrializadores (como Arcelor), consumo da programação vigente L1, rendimento metálico contratual versionado (ex: 93%), compatibilidade dimensional conforme TB-002 (produtos >18 t/h aceitam 130x130 ou 150x150, ≤18 t/h usam 130x130), alocação inteligente preservando tarugos restritivos, identificação de rupturas com data/ordem/turno exatos, geração de comunicados executivos e despacho de ações corretivas. Nunca altere dados silenciosamente; gere recomendações fundamentadas.',
        tier: 'fast',
        tools: [
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
              text: 'Diretrizes Oficiais CIAFAL MP Industrializadores: Rendimento metálico contratual Arcelor = 93% (6.000 t produto = 6.451,61 t MP teórica, com base histórica de 6.420 t exibida para validação do PCP). Regra de compatibilidade TB-002: produtividade > 18 t/h aceita 130x130 e 150x150; <= 18 t/h exige 130x130. Tarugos 130x130 (ST930*AI) e 150x150 (ST950*AI) parametrizados na Matriz. Depósitos SAP Centro CFPL: DP07 (cortados prontos), DP18 (inteiros), DP20 (apontados KS aguardando transferência). MP física e trânsito mantidos estritamente separados. Rotina seg/qua/sex com elevação de frequência em condição crítica.',
            },
          },
        ],
      })
    } catch (e) {
      console.log('Skip AI Agent update skipped or not supported:', e)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('mp_industrializer_snapshots'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_industrializer_actions'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_industrializer_communications'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_industrializer_transit'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_industrializer_inventory'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_industrializer_matrix'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_industrializer_contracts'))
    } catch (_) {}
  },
)
