migrate(
  (app) => {
    const userCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const plantCol = app.findCollectionByNameOrId('plants')
    const lineCol = app.findCollectionByNameOrId('production_lines')

    // 1. mp_dimensional_inventory (Estoque Dimensional rastreável)
    let mpInventoryCol
    try {
      mpInventoryCol = app.findCollectionByNameOrId('mp_dimensional_inventory')
    } catch (_) {
      mpInventoryCol = new Collection({
        name: 'mp_dimensional_inventory',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text' },
          { name: 'steel_grade', type: 'text' }, // Ex: SAE 1020, SAE 1045, ASTM A36
          { name: 'center_code', type: 'text', required: true }, // Centro SAP (ex: 1001, 1002)
          { name: 'storage_location', type: 'text' }, // Depósito (ex: 0001, MP01)
          { name: 'trauml', type: 'text' }, // Depósito de trânsito / TRAUML SAP
          { name: 'batch_number', type: 'text' }, // Lote
          { name: 'heat_number', type: 'text' }, // Corrida
          { name: 'letter_code', type: 'text' }, // Letra
          { name: 'block_number', type: 'text' }, // Nº Bloco
          { name: 'supplier_code', type: 'text' }, // Fornecedor
          { name: 'supplier_name', type: 'text' },
          { name: 'original_application', type: 'text', required: true }, // Aplicação Original ZPP86 (NUNCA sobrescrever)
          { name: 'current_application', type: 'text', required: true }, // Aplicação Atual
          { name: 'thickness_mm', type: 'number', required: true }, // Espessura
          { name: 'width_mm', type: 'number', required: true }, // Largura
          { name: 'length_mm', type: 'number', required: true }, // Comprimento
          { name: 'weight_kg', type: 'number', required: true }, // Peso
          {
            name: 'item_type',
            type: 'select',
            values: ['PLACA', 'BLOCO', 'PECA', 'SOBRA_REUTILIZAVEL', 'RETALHO', 'PARCIAL'],
            maxSelect: 1,
          },
          {
            name: 'sap_block_status',
            type: 'select',
            values: [
              '01_DISPONIVEL',
              '02_SELECIONADO_ENVIO',
              '03_TRANSITO',
              '04_MP_CIAFAL',
              '05_FORNO',
              '06_DEVOLVIDO',
              '07_LAMINADO',
            ],
            maxSelect: 1,
          },
          {
            name: 'reservation_status',
            type: 'select',
            values: [
              'LIVRE',
              'SUGESTAO_RESERVA',
              'RESERVADA',
              'BLOQUEADA',
              'EM_PLANO_DE_CORTE',
              'CORTE_APROVADO',
              'EM_PROCESSO',
            ],
            maxSelect: 1,
          },
          {
            name: 'dimensional_classification',
            type: 'select',
            values: [
              'NIVEL_1_IDEAL',
              'NIVEL_2_ADMISSIVEL',
              'NIVEL_3_FORA_IDEAL_CONFORME',
              'NIVEL_4_EXCECAO_TECNICA',
              'NIVEL_5_PROIBIDO',
            ],
            maxSelect: 1,
          },
          { name: 'is_critical', type: 'bool' },
          { name: 'criticality_reason', type: 'text' },
          { name: 'origin_parent_id', type: 'text' }, // Rastreabilidade do bloco/placa pai quando for sobra
          { name: 'reception_date', type: 'date' },
          { name: 'cut_date', type: 'date' },
          { name: 'physical_balance_status', type: 'text' }, // BWART 261 / saldo físico
          { name: 'possible_applications_json', type: 'json' },
          { name: 'alternative_applications_json', type: 'json' },
          { name: 'next_demand_schedule', type: 'text' },
          { name: 'line_destination_code', type: 'text' },
          { name: 'zppmp_validation_result', type: 'json' }, // DADO REAL x MIN x MAX
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_inv_block ON mp_dimensional_inventory (block_number, heat_number)',
          'CREATE INDEX idx_mp_inv_status ON mp_dimensional_inventory (sap_block_status, reservation_status)',
          'CREATE INDEX idx_mp_inv_app ON mp_dimensional_inventory (current_application, original_application)',
          'CREATE INDEX idx_mp_inv_mat ON mp_dimensional_inventory (material_code, center_code)',
        ],
      })
      app.save(mpInventoryCol)
    }

    // 2. mp_application_requirements (Requisitos por Aplicação ZPPMP & ZBITOLAS)
    let mpReqCol
    try {
      mpReqCol = app.findCollectionByNameOrId('mp_application_requirements')
    } catch (_) {
      mpReqCol = new Collection({
        name: 'mp_application_requirements',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'application_code', type: 'text', required: true }, // Ex: APL_ESTRUTURAL_60
          { name: 'application_name', type: 'text', required: true },
          { name: 'steel_grade', type: 'text', required: true },
          { name: 'supplier_code', type: 'text' },
          { name: 'supplier_name', type: 'text' },
          { name: 'zppmp_table_ref', type: 'text' },
          { name: 'ideal_thickness_mm', type: 'number' },
          { name: 'min_thickness_mm', type: 'number', required: true },
          { name: 'max_thickness_mm', type: 'number', required: true },
          { name: 'ideal_width_mm', type: 'number' },
          { name: 'min_width_mm', type: 'number', required: true },
          { name: 'max_width_mm', type: 'number', required: true },
          { name: 'ideal_length_mm', type: 'number' },
          { name: 'min_length_mm', type: 'number', required: true },
          { name: 'max_length_mm', type: 'number', required: true },
          { name: 'ideal_weight_kg', type: 'number' },
          { name: 'min_weight_kg', type: 'number' },
          { name: 'max_weight_kg', type: 'number' },
          { name: 'allowed_alternatives_json', type: 'json' },
          { name: 'restrictions_json', type: 'json' },
          { name: 'priority_order', type: 'number' },
          { name: 'allows_out_of_ideal', type: 'bool' }, // ZPP88: PERMITE PEÇA FORA DO PADRÃO
          { name: 'zpp88_transformation_rules_json', type: 'json' }, // Regras dimensionais de laminação e perdas
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_req_app_steel ON mp_application_requirements (application_code, steel_grade, supplier_code)',
          'CREATE INDEX idx_mp_req_app ON mp_application_requirements (application_code)',
        ],
      })
      app.save(mpReqCol)
    }

    // 3. mp_cutting_plans (Planos Inteligentes de Corte Versionados)
    let mpCutPlanCol
    try {
      mpCutPlanCol = app.findCollectionByNameOrId('mp_cutting_plans')
    } catch (_) {
      mpCutPlanCol = new Collection({
        name: 'mp_cutting_plans',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'plan_code', type: 'text', required: true },
          { name: 'version', type: 'number', required: true },
          { name: 'title', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            values: [
              'RASCUNHO',
              'IA_SUGERIDO',
              'REVISADO_PCP',
              'PENDENTE_APROVACAO',
              'APROVADO_PCP',
              'EXCECAO_LIBERADA',
              'ENVIADO_SAP',
              'INTEGRADO_SAP',
              'REJEITADO',
              'CANCELADO',
              'HISTORICO',
            ],
            maxSelect: 1,
          },
          {
            name: 'selected_scenario',
            type: 'select',
            values: [
              'RECOMENDADO_IA',
              'MAIOR_RENDIMENTO',
              'MENOR_CUSTO',
              'MENOR_SUCATA',
              'PRESERVACAO_CRITICA',
              'MAIOR_CARTEIRA',
              'PERSONALIZADO_HUMANO',
            ],
            maxSelect: 1,
          },
          { name: 'source_plates_count', type: 'number' },
          { name: 'total_input_weight_tons', type: 'number' },
          { name: 'total_output_weight_tons', type: 'number' },
          { name: 'total_reusable_leftover_tons', type: 'number' },
          { name: 'total_scrap_tons', type: 'number' },
          { name: 'overall_yield_pct', type: 'number' },
          { name: 'overall_ai_score', type: 'number' },
          { name: 'ai_score_breakdown_json', type: 'json' },
          { name: 'ai_explanation_json', type: 'json' }, // Por quê? Precedentes históricos e sensibilidade
          { name: 'scenarios_comparison_json', type: 'json' },
          { name: 'cutting_layout_items_json', type: 'json' }, // Placas, cortes, coordenadas kerf, peças geradas
          { name: 'demands_covered_json', type: 'json' }, // Ordens/carteira/PMP atendidos
          { name: 'human_changes_notes', type: 'text' },
          { name: 'created_by_user_id', type: 'relation', collectionId: userCol.id, maxSelect: 1 },
          { name: 'created_by_user_name', type: 'text' },
          { name: 'reviewed_by_user_id', type: 'relation', collectionId: userCol.id, maxSelect: 1 },
          { name: 'reviewed_by_user_name', type: 'text' },
          { name: 'approved_by_user_id', type: 'relation', collectionId: userCol.id, maxSelect: 1 },
          { name: 'approved_by_user_name', type: 'text' },
          { name: 'approved_at', type: 'date' },
          { name: 'sap_order_ref', type: 'text' },
          { name: 'sap_sync_status', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_cut_code_ver ON mp_cutting_plans (plan_code, version)',
          'CREATE INDEX idx_mp_cut_status ON mp_cutting_plans (status)',
        ],
      })
      app.save(mpCutPlanCol)
    }

    // 4. mp_reapplication_opportunities (Oportunidades de Reaplicação e Cortes Existentes)
    let mpReappCol
    try {
      mpReappCol = app.findCollectionByNameOrId('mp_reapplication_opportunities')
    } catch (_) {
      mpReappCol = new Collection({
        name: 'mp_reapplication_opportunities',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'opportunity_code', type: 'text', required: true },
          { name: 'block_number', type: 'text', required: true },
          { name: 'heat_number', type: 'text' },
          { name: 'letter_code', type: 'text' },
          { name: 'material_code', type: 'text', required: true },
          { name: 'center_code', type: 'text', required: true },
          { name: 'storage_location', type: 'text' },
          { name: 'original_application', type: 'text', required: true }, // ZPP86
          { name: 'current_application', type: 'text', required: true },
          { name: 'recommended_application', type: 'text', required: true },
          { name: 'thickness_mm', type: 'number', required: true },
          { name: 'width_mm', type: 'number', required: true },
          { name: 'length_mm', type: 'number', required: true },
          { name: 'weight_kg', type: 'number', required: true },
          {
            name: 'dimensional_classification',
            type: 'select',
            values: [
              'NIVEL_1_IDEAL',
              'NIVEL_2_ADMISSIVEL',
              'NIVEL_3_FORA_IDEAL_CONFORME',
              'NIVEL_4_EXCECAO_TECNICA',
              'NIVEL_5_PROIBIDO',
            ],
            maxSelect: 1,
          },
          { name: 'ai_score', type: 'number' },
          { name: 'confidence_pct', type: 'number' },
          { name: 'potential_savings_brl', type: 'number' },
          { name: 'scrap_avoided_kg', type: 'number' },
          {
            name: 'risk_level',
            type: 'select',
            values: ['MUITO_BAIXO', 'BAIXO', 'MEDIO', 'ALTO', 'CRITICO'],
            maxSelect: 1,
          },
          {
            name: 'urgency_level',
            type: 'select',
            values: ['IMEDIATA', 'ALTA', 'NORMAL', 'BAIXA'],
            maxSelect: 1,
          },
          { name: 'historical_precedents_count', type: 'number' },
          { name: 'historical_success_rate_pct', type: 'number' },
          { name: 'target_order_number', type: 'text' },
          { name: 'target_schedule_week', type: 'text' },
          { name: 'ai_reasoning', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: [
              'IDENTIFICADA',
              'SIMULADA',
              'SOLICITADA',
              'APROVADA',
              'APLICADA_SAP',
              'REJEITADA',
            ],
            maxSelect: 1,
          },
          {
            name: 'evaluated_by_user_id',
            type: 'relation',
            collectionId: userCol.id,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_reapp_code ON mp_reapplication_opportunities (opportunity_code)',
          'CREATE INDEX idx_mp_reapp_block ON mp_reapplication_opportunities (block_number, heat_number)',
          'CREATE INDEX idx_mp_reapp_status ON mp_reapplication_opportunities (status)',
        ],
      })
      app.save(mpReappCol)
    }

    // 5. mp_workflow_approvals (Governança e Fluxo de Aprovações em 2 Fases & Exceções Técnicas)
    let mpApprCol
    try {
      mpApprCol = app.findCollectionByNameOrId('mp_workflow_approvals')
    } catch (_) {
      mpApprCol = new Collection({
        name: 'mp_workflow_approvals',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'approval_code', type: 'text', required: true },
          {
            name: 'approval_type',
            type: 'select',
            values: [
              'PLANO_CORTE',
              'ALTERACAO_APLICACAO_ZPP86',
              'PECA_FORA_PADRAO_ZPP88',
              'EXCECAO_TECNICA_NIVEL_4',
              'RESERVA_ESTRATEGICA',
            ],
            maxSelect: 1,
          },
          { name: 'entity_ref_id', type: 'text', required: true },
          { name: 'entity_ref_code', type: 'text' },
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'text' },
          { name: 'block_number', type: 'text' },
          { name: 'original_application', type: 'text' },
          { name: 'new_application', type: 'text' },
          { name: 'dimensional_classification', type: 'text' },
          { name: 'requires_engineering_quality_approval', type: 'bool' }, // Exceções técnicas requerem Qualidade + PCP + Produção
          { name: 'requires_production_approval', type: 'bool' },
          {
            name: 'stage_pcp_status',
            type: 'select',
            values: ['PENDENTE', 'APROVADO', 'REJEITADO', 'NAO_APLICAVEL'],
            maxSelect: 1,
          },
          { name: 'stage_pcp_user_id', type: 'relation', collectionId: userCol.id, maxSelect: 1 },
          { name: 'stage_pcp_user_name', type: 'text' },
          { name: 'stage_pcp_notes', type: 'text' },
          { name: 'stage_pcp_date', type: 'date' },
          {
            name: 'stage_quality_status',
            type: 'select',
            values: ['PENDENTE', 'APROVADO', 'REJEITADO', 'NAO_APLICAVEL'],
            maxSelect: 1,
          },
          {
            name: 'stage_quality_user_id',
            type: 'relation',
            collectionId: userCol.id,
            maxSelect: 1,
          },
          { name: 'stage_quality_user_name', type: 'text' },
          { name: 'stage_quality_notes', type: 'text' },
          { name: 'stage_quality_date', type: 'date' },
          {
            name: 'stage_production_status',
            type: 'select',
            values: ['PENDENTE', 'APROVADO', 'REJEITADO', 'NAO_APLICAVEL'],
            maxSelect: 1,
          },
          {
            name: 'stage_production_user_id',
            type: 'relation',
            collectionId: userCol.id,
            maxSelect: 1,
          },
          { name: 'stage_production_user_name', type: 'text' },
          { name: 'stage_production_notes', type: 'text' },
          { name: 'stage_production_date', type: 'date' },
          {
            name: 'overall_status',
            type: 'select',
            values: ['EM_ANALISE', 'APROVADO_TOTAL', 'REJEITADO', 'CANCELADO'],
            maxSelect: 1,
          },
          { name: 'ai_recommendation_summary', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_appr_code ON mp_workflow_approvals (approval_code)',
          'CREATE INDEX idx_mp_appr_entity ON mp_workflow_approvals (entity_ref_id, approval_type)',
          'CREATE INDEX idx_mp_appr_overall ON mp_workflow_approvals (overall_status)',
        ],
      })
      app.save(mpApprCol)
    }

    // 6. mp_application_audit_history (Histórico e Auditoria ZPPT058 / ZMM029)
    let mpHistCol
    try {
      mpHistCol = app.findCollectionByNameOrId('mp_application_audit_history')
    } catch (_) {
      mpHistCol = new Collection({
        name: 'mp_application_audit_history',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'event_code', type: 'text', required: true },
          { name: 'plan_id', type: 'text' },
          { name: 'plan_version', type: 'number' },
          { name: 'center_code', type: 'text', required: true },
          { name: 'block_number', type: 'text', required: true },
          { name: 'heat_number', type: 'text' },
          { name: 'letter_code', type: 'text' },
          { name: 'material_code', type: 'text' },
          { name: 'supplier_code', type: 'text' },
          { name: 'original_application', type: 'text', required: true }, // Preservada para sempre
          { name: 'previous_application', type: 'text' },
          { name: 'new_application', type: 'text', required: true },
          { name: 'thickness_mm', type: 'number' },
          { name: 'width_mm', type: 'number' },
          { name: 'length_mm', type: 'number' },
          { name: 'weight_kg', type: 'number' },
          { name: 'reason_code', type: 'text', required: true },
          { name: 'reason_description', type: 'text', required: true },
          { name: 'user_registration_matricula', type: 'text', required: true },
          { name: 'user_name', type: 'text', required: true },
          { name: 'user_id', type: 'relation', collectionId: userCol.id, maxSelect: 1 },
          { name: 'event_timestamp', type: 'date', required: true },
          { name: 'ai_score_at_time', type: 'number' },
          { name: 'scenario_chosen', type: 'text' },
          { name: 'was_human_override', type: 'bool' },
          { name: 'human_override_justification', type: 'text' },
          { name: 'approvers_summary', type: 'text' },
          { name: 'sap_status_code', type: 'text' }, // Ex: 01, 04, 261
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_hist_block ON mp_application_audit_history (block_number, heat_number)',
          'CREATE INDEX idx_mp_hist_center ON mp_application_audit_history (center_code, event_timestamp DESC)',
          'CREATE INDEX idx_mp_hist_apps ON mp_application_audit_history (original_application, new_application)',
        ],
      })
      app.save(mpHistCol)
    }

    // 7. mp_planned_vs_realized (Aderência e Comparação Planejado x Realizado)
    let mpPlVsReCol
    try {
      mpPlVsReCol = app.findCollectionByNameOrId('mp_planned_vs_realized')
    } catch (_) {
      mpPlVsReCol = new Collection({
        name: 'mp_planned_vs_realized',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'comparison_code', type: 'text', required: true },
          { name: 'plan_code', type: 'text', required: true },
          { name: 'plan_version', type: 'number' },
          { name: 'block_number', type: 'text' },
          { name: 'line_code', type: 'text' },
          { name: 'execution_date', type: 'date' },
          { name: 'planned_weight_kg', type: 'number' },
          { name: 'realized_weight_kg', type: 'number' },
          { name: 'planned_thickness_mm', type: 'number' },
          { name: 'realized_thickness_mm', type: 'number' },
          { name: 'planned_width_mm', type: 'number' },
          { name: 'realized_width_mm', type: 'number' },
          { name: 'planned_length_mm', type: 'number' },
          { name: 'realized_length_mm', type: 'number' },
          { name: 'planned_yield_pct', type: 'number' },
          { name: 'realized_yield_pct', type: 'number' },
          { name: 'planned_scrap_kg', type: 'number' },
          { name: 'realized_scrap_kg', type: 'number' },
          { name: 'planned_leftover_kg', type: 'number' },
          { name: 'realized_leftover_kg', type: 'number' },
          { name: 'planned_application', type: 'text' },
          { name: 'executed_application', type: 'text' },
          {
            name: 'final_product_conformance',
            type: 'select',
            values: ['CONFORME', 'DESVIO_MENOR', 'NAO_CONFORME', 'SUCATA'],
            maxSelect: 1,
          },
          { name: 'deviation_analysis', type: 'text' },
          { name: 'feedback_to_ai_model', type: 'json' }, // Ajuste fino sem alterar regra técnica
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_pvr_code ON mp_planned_vs_realized (comparison_code)',
          'CREATE INDEX idx_mp_pvr_plan ON mp_planned_vs_realized (plan_code, block_number)',
        ],
      })
      app.save(mpPlVsReCol)
    }

    // 8. mp_sap_integration_queue (Fila de Integração PostgreSQL/Skip → SAP)
    let mpSapQueueCol
    try {
      mpSapQueueCol = app.findCollectionByNameOrId('mp_sap_integration_queue')
    } catch (_) {
      mpSapQueueCol = new Collection({
        name: 'mp_sap_integration_queue',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'queue_code', type: 'text', required: true },
          { name: 'plan_code', type: 'text', required: true },
          { name: 'plan_version', type: 'number', required: true },
          { name: 'center_code', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'batch_number', type: 'text' },
          { name: 'heat_number', type: 'text' },
          { name: 'block_number', type: 'text' },
          { name: 'original_application', type: 'text', required: true },
          { name: 'new_application', type: 'text', required: true },
          { name: 'original_dimensions_json', type: 'json' },
          { name: 'result_dimensions_json', type: 'json' },
          { name: 'cutting_plan_json', type: 'json' },
          { name: 'weights_and_losses_json', type: 'json' },
          { name: 'line_code', type: 'text' },
          { name: 'schedule_reference', type: 'text' },
          {
            name: 'integration_lifecycle_stage',
            type: 'select',
            values: [
              'PLANO_APROVADO',
              'ENVIADO_AO_SAP',
              'PROCESSADO_SAP',
              'ORDEM_GERADA',
              'EM_EXECUCAO',
              'CONCLUIDO',
              'ERRO_INTEGRACAO',
            ],
            maxSelect: 1,
          },
          { name: 'sap_bapi_rfc_function', type: 'text' }, // Ex: BAPI_PRODORD_CREATE ou ZPP86_APPLY
          { name: 'sap_order_number', type: 'text' },
          { name: 'sap_response_documents', type: 'json' },
          { name: 'sap_messages', type: 'text' },
          { name: 'sap_error_details', type: 'text' },
          { name: 'approved_by_user_id', type: 'relation', collectionId: userCol.id, maxSelect: 1 },
          { name: 'approved_by_user_name', type: 'text' },
          { name: 'dispatched_at', type: 'date' },
          { name: 'processed_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_sap_q_code ON mp_sap_integration_queue (queue_code)',
          'CREATE INDEX idx_mp_sap_q_stage ON mp_sap_integration_queue (integration_lifecycle_stage)',
          'CREATE INDEX idx_mp_sap_q_plan ON mp_sap_integration_queue (plan_code, plan_version)',
        ],
      })
      app.save(mpSapQueueCol)
    }

    // 9. mp_optimization_parameters (Pesos Parametrizáveis do Motor IA)
    let mpParamsCol
    try {
      mpParamsCol = app.findCollectionByNameOrId('mp_optimization_parameters')
    } catch (_) {
      mpParamsCol = new Collection({
        name: 'mp_optimization_parameters',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'config_key', type: 'text', required: true },
          { name: 'profile_name', type: 'text', required: true }, // Ex: PADRAO_BALANCEADO, MAX_RENDIMENTO, MIN_CUSTO, PRESERVA_CRITICA
          { name: 'weight_yield', type: 'number', required: true }, // Rendimento
          { name: 'weight_demand_fulfillment', type: 'number', required: true }, // Atendimento Carteira
          { name: 'weight_cost_reduction', type: 'number', required: true }, // Custo
          { name: 'weight_scrap_minimization', type: 'number', required: true }, // Sucata
          { name: 'weight_reutilization', type: 'number', required: true }, // Reaproveitamento Sobra
          { name: 'weight_critical_mp_preservation', type: 'number', required: true }, // Preservação MP Crítica
          { name: 'weight_rupture_risk', type: 'number', required: true }, // Risco Ruptura
          { name: 'weight_future_schedule_adherence', type: 'number', required: true }, // Aderência Programação
          { name: 'weight_dimensional_conformance', type: 'number', required: true }, // Conformidade
          { name: 'weight_quality_compliance', type: 'number', required: true }, // Qualidade
          { name: 'default_kerf_mm', type: 'number', required: true }, // Espessura do corte da serra / kerf
          { name: 'default_margin_trim_mm', type: 'number', required: true }, // Sobremetal / refile
          { name: 'is_active_default', type: 'bool' },
          { name: 'updated_by_user_id', type: 'relation', collectionId: userCol.id, maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_param_key ON mp_optimization_parameters (config_key)',
        ],
      })
      app.save(mpParamsCol)
    }

    // 10. Inserir Permissões RBAC para Otimização de Matéria-Prima
    const permsCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolesCol = app.findCollectionByNameOrId('pcp_roles')
    const rolePermCol = app.findCollectionByNameOrId('pcp_role_permissions')

    const mpPermissions = [
      {
        key: 'pcp.mp_opt.view',
        name: 'Visualizar Otimização de MP',
        category: 'Otimização de MP',
        description:
          'Consulta ao Estoque Dimensional, Requisitos ZPPMP, Planos e Indicadores de MP',
        is_critical: false,
      },
      {
        key: 'pcp.mp_opt.simulate',
        name: 'Simular Planos e Reaplicação de MP',
        category: 'Otimização de MP',
        description:
          'Executar motor de otimização dimensional com IA e simular cortes/reaplicações',
        is_critical: false,
      },
      {
        key: 'pcp.mp_opt.modify_app',
        name: 'Alterar Aplicação de Bloco (ZPP86)',
        category: 'Otimização de MP',
        description: 'Modificar aplicação de blocos disponíveis e registrar motivo/matrícula',
        is_critical: true,
      },
      {
        key: 'pcp.mp_opt.evaluate_out_of_ideal',
        name: 'Avaliar Peça Fora do Padrão Ideal (ZPP88)',
        category: 'Otimização de MP',
        description: 'Avaliar conformidade dimensional final de peças fora da faixa ideal',
        is_critical: true,
      },
      {
        key: 'pcp.mp_opt.request_approval',
        name: 'Solicitar Aprovação de Plano de Corte',
        category: 'Otimização de MP',
        description: 'Submeter plano de corte inteligente para fluxo de aprovações',
        is_critical: false,
      },
      {
        key: 'pcp.mp_opt.approve',
        name: 'Aprovar Planos e Alterações de MP',
        category: 'Otimização de MP',
        description: 'Aprovação formal de planos de corte e modificações dimensionais',
        is_critical: true,
      },
      {
        key: 'pcp.mp_opt.approve_technical_exception',
        name: 'Liberar Exceção Técnica Nível 4 (Engenharia/Qualidade)',
        category: 'Otimização de MP',
        description:
          'Aprovação de excepcionalidade técnica dimensional com validação da Qualidade/Engenharia',
        is_critical: true,
      },
      {
        key: 'pcp.mp_opt.manage_parameters',
        name: 'Gerenciar Parâmetros e Pesos do Motor IA',
        category: 'Otimização de MP',
        description: 'Configuração dos pesos da função objetivo e limites dimensionais',
        is_critical: true,
      },
      {
        key: 'pcp.mp_opt.sync_sap',
        name: 'Despachar Fila de Integração SAP',
        category: 'Otimização de MP',
        description: 'Disparar integração dos planos aprovados para as ordens SAP',
        is_critical: true,
      },
    ]

    mpPermissions.forEach((p) => {
      let existing
      try {
        existing = app.findFirstRecordByData('pcp_permissions', 'key', p.key)
      } catch (_) {
        existing = null
      }

      let permRec = existing
      if (!permRec) {
        permRec = new Record(permsCol)
        permRec.set('key', p.key)
        permRec.set('name', p.name)
        permRec.set('category', p.category)
        permRec.set('description', p.description)
        permRec.set('is_critical', p.is_critical)
        app.save(permRec)
      }

      // Associar às roles
      const allRoles = app.findRecordsByFilter('pcp_roles', '', '', 20, 0)
      allRoles.forEach((role) => {
        const roleCode = role.getString('code')
        let shouldHave = false

        if (roleCode === 'PCP_ADMIN') {
          shouldHave = true
        } else if (roleCode === 'PCP_PROGRAMMER') {
          shouldHave = [
            'pcp.mp_opt.view',
            'pcp.mp_opt.simulate',
            'pcp.mp_opt.modify_app',
            'pcp.mp_opt.evaluate_out_of_ideal',
            'pcp.mp_opt.request_approval',
            'pcp.mp_opt.approve',
            'pcp.mp_opt.manage_parameters',
            'pcp.mp_opt.sync_sap',
          ].includes(p.key)
        } else if (roleCode === 'LINE_MANAGER') {
          shouldHave = [
            'pcp.mp_opt.view',
            'pcp.mp_opt.simulate',
            'pcp.mp_opt.approve',
            'pcp.mp_opt.approve_technical_exception',
          ].includes(p.key)
        } else if (
          roleCode === 'PRODUCTION_VIEWER' ||
          roleCode === 'EXECUTIVE_VIEWER' ||
          roleCode === 'AUDITOR'
        ) {
          shouldHave = p.key === 'pcp.mp_opt.view'
        }

        if (shouldHave) {
          const rpFilter = `role_id = '${role.id}' && permission_id = '${permRec.id}'`
          const existingRps = app.findRecordsByFilter('pcp_role_permissions', rpFilter, '', 1, 0)
          if (existingRps.length === 0) {
            const rp = new Record(rolePermCol)
            rp.set('role_id', role.id)
            rp.set('permission_id', permRec.id)
            app.save(rp)
          }
        }
      })
    })
  },
  (app) => {
    const cols = [
      'mp_optimization_parameters',
      'mp_sap_integration_queue',
      'mp_planned_vs_realized',
      'mp_application_audit_history',
      'mp_workflow_approvals',
      'mp_reapplication_opportunities',
      'mp_cutting_plans',
      'mp_application_requirements',
      'mp_dimensional_inventory',
    ]
    cols.forEach((c) => {
      try {
        const col = app.findCollectionByNameOrId(c)
        app.delete(col)
      } catch (_) {}
    })
  },
)
