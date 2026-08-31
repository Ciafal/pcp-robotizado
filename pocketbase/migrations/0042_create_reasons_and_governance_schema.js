migrate(
  (app) => {
    // 1. pcp_reason_families
    const reasonFamilies = new Collection({
      name: 'pcp_reason_families',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'code', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'icon_name', type: 'text' },
        { name: 'color', type: 'text' },
        { name: 'sort_order', type: 'number' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_rf_code ON pcp_reason_families (code)'],
    })
    app.save(reasonFamilies)

    // 2. pcp_change_reasons
    const changeReasons = new Collection({
      name: 'pcp_change_reasons',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'code', type: 'text', required: true },
        {
          name: 'family_id',
          type: 'relation',
          collectionId: reasonFamilies.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'family_code', type: 'text' },
        { name: 'family_name', type: 'text' },
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        {
          name: 'severity',
          type: 'select',
          values: ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'],
          maxSelect: 1,
          required: true,
        },
        { name: 'source_type', type: 'text' }, // ex: "SAP MM / WMS", "MES / Chão de Fábrica"
        { name: 'related_modules', type: 'text' }, // ex: "SAP,WMS,MES"
        { name: 'change_types_allowed', type: 'text' }, // ex: "DATA,SEQUENCIA,QUANTIDADE,LINHA,TURNO"
        { name: 'allows_date_change', type: 'bool' },
        { name: 'allows_sequence_change', type: 'bool' },
        { name: 'allows_quantity_change', type: 'bool' },
        { name: 'allows_line_change', type: 'bool' },
        { name: 'allows_shift_change', type: 'bool' },
        { name: 'require_comment', type: 'bool' },
        { name: 'require_evidence', type: 'bool' },
        { name: 'require_approval', type: 'bool' },
        {
          name: 'criticality',
          type: 'select',
          values: ['NORMAL', 'ATENCAO', 'CRITICA', 'BLOQUEANTE'],
          maxSelect: 1,
        },
        { name: 'notify_mes', type: 'bool' },
        { name: 'notify_crm', type: 'bool' },
        { name: 'notify_tms', type: 'bool' },
        { name: 'notify_pcm', type: 'bool' },
        { name: 'notify_roll_shop', type: 'bool' },
        { name: 'generate_sgq_occurrence', type: 'bool' },
        { name: 'generate_action_plan', type: 'bool' },
        { name: 'count_as_reprogram_cause', type: 'bool' },
        { name: 'created_by_name', type: 'text' },
        { name: 'updated_by_name', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_cr_code ON pcp_change_reasons (code)'],
    })
    app.save(changeReasons)

    // 3. pcp_version_diffs
    const versionDiffs = new Collection({
      name: 'pcp_version_diffs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'schedule_code', type: 'text' },
        { name: 'line_code', type: 'text' },
        { name: 'previous_version_code', type: 'text' },
        { name: 'current_version_code', type: 'text' },
        { name: 'previous_version_id', type: 'text' },
        { name: 'current_version_id', type: 'text' },
        { name: 'entity_type', type: 'text' }, // ex: "SCHEDULE_ITEM", "PRODUCTION_ORDER"
        { name: 'entity_id', type: 'text' },
        { name: 'material_code', type: 'text' },
        { name: 'material_description', type: 'text' },
        {
          name: 'change_type',
          type: 'select',
          values: ['INCLUIDO', 'ALTERADO', 'REMOVIDO'],
          maxSelect: 1,
        },
        { name: 'field', type: 'text' }, // ex: "DATA", "QUANTIDADE", "SEQUENCIA"
        { name: 'field_name_pt', type: 'text' },
        { name: 'old_value', type: 'text' },
        { name: 'new_value', type: 'text' },
        { name: 'delta_numeric', type: 'number' },
        { name: 'delta_display', type: 'text' },
        { name: 'relevance', type: 'select', values: ['BAIXA', 'MEDIA', 'ALTA'], maxSelect: 1 },
        { name: 'customer_affected', type: 'text' },
        { name: 'sales_order', type: 'text' },
        { name: 'sap_op_affected', type: 'text' },
        { name: 'diff_payload', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_vd_sch_ver ON pcp_version_diffs (schedule_code, current_version_code)',
        'CREATE INDEX idx_vd_mat ON pcp_version_diffs (material_code)',
      ],
    })
    app.save(versionDiffs)

    // 4. pcp_change_justifications
    const changeJustifications = new Collection({
      name: 'pcp_change_justifications',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'schedule_code', type: 'text' },
        { name: 'line_code', type: 'text' },
        { name: 'shift_name', type: 'text' },
        { name: 'period_display', type: 'text' },
        { name: 'version_from', type: 'text' },
        { name: 'version_to', type: 'text' },
        {
          name: 'reason_id',
          type: 'relation',
          collectionId: changeReasons.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'reason_code', type: 'text' },
        { name: 'reason_name', type: 'text' },
        { name: 'family_code', type: 'text' },
        { name: 'family_name', type: 'text' },
        { name: 'specific_cause', type: 'text' }, // Nível 3 - complemento / causa específica
        { name: 'justification', type: 'text' }, // Justificativa detalhada
        { name: 'leadership_notes', type: 'text' }, // Notas adicionais para liderança
        { name: 'ai_generated', type: 'bool' },
        { name: 'ai_confidence', type: 'number' }, // 0 a 100
        { name: 'ai_suggested_reason_code', type: 'text' },
        { name: 'ai_suggested_reason_name', type: 'text' },
        {
          name: 'human_decision',
          type: 'select',
          values: ['ACCEPTED', 'EDITED', 'REJECTED', 'MANUAL'],
          maxSelect: 1,
        },
        {
          name: 'evidence_status',
          type: 'select',
          values: ['SYSTEM_CONFIRMED', 'PARTIAL_EVIDENCE', 'EXTERNAL_UNAVAILABLE', 'HUMAN_ONLY'],
          maxSelect: 1,
        },
        { name: 'impact_hours', type: 'number' },
        { name: 'impact_tons', type: 'number' },
        { name: 'impact_orders_count', type: 'number' },
        { name: 'impact_customers_count', type: 'number' },
        { name: 'related_modules', type: 'text' },
        {
          name: 'created_by_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'created_by_name', type: 'text' },
        { name: 'created_by_email', type: 'text' },
        { name: 'created_by_role', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_cj_sch_ver ON pcp_change_justifications (schedule_code, version_to)',
        'CREATE INDEX idx_cj_reason ON pcp_change_justifications (reason_code)',
      ],
    })
    app.save(changeJustifications)

    // 5. pcp_change_evidence
    const changeEvidence = new Collection({
      name: 'pcp_change_evidence',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'justification_id',
          type: 'relation',
          collectionId: changeJustifications.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'source_system',
          type: 'select',
          values: [
            'SAP',
            'WMS',
            'MES',
            'AOM',
            'PCM',
            'QUALIDADE',
            'CRM',
            'TMS',
            'OFICINA_CILINDROS',
            'FICHA_MESTRE',
            'MATRIZ_GARGALO',
            'MOTOR_REGRAS',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'source_entity', type: 'text' }, // ex: "STOCK_BALANCE", "EQUIPMENT_STOP", "MAINTENANCE_ORDER"
        { name: 'source_reference', type: 'text' }, // ex: "Lote 2026-B91", "OP 100456"
        { name: 'evidence_type', type: 'text' }, // ex: "SALDO_INSUFICIENTE", "PARADA_CORRETIVA", "BLOQUEIO_QUALIDADE"
        { name: 'description', type: 'text' },
        { name: 'old_value', type: 'text' },
        { name: 'new_value', type: 'text' },
        { name: 'confidence_score', type: 'number' },
        { name: 'evidence_timestamp', type: 'date' },
        { name: 'raw_payload', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ce_just ON pcp_change_evidence (justification_id)',
        'CREATE INDEX idx_ce_source ON pcp_change_evidence (source_system)',
      ],
    })
    app.save(changeEvidence)

    // 6. pcp_ai_reason_suggestions
    const aiReasonSuggestions = new Collection({
      name: 'pcp_ai_reason_suggestions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'diff_id', type: 'text' },
        { name: 'schedule_code', type: 'text' },
        { name: 'line_code', type: 'text' },
        { name: 'suggested_reason_code', type: 'text' },
        { name: 'suggested_reason_name', type: 'text' },
        { name: 'suggested_family_code', type: 'text' },
        { name: 'confidence', type: 'number' }, // 0 a 100
        { name: 'explanation', type: 'text' },
        { name: 'evidences_summary', type: 'text' },
        { name: 'evidences_json', type: 'json' },
        {
          name: 'human_action',
          type: 'select',
          values: ['PENDING', 'ACCEPTED', 'EDITED', 'REJECTED'],
          maxSelect: 1,
        },
        { name: 'final_reason_code', type: 'text' },
        { name: 'final_reason_name', type: 'text' },
        {
          name: 'validated_by_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'validated_by_name', type: 'text' },
        { name: 'validated_at', type: 'date' },
        { name: 'feedback_notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ais_sch ON pcp_ai_reason_suggestions (schedule_code)',
        'CREATE INDEX idx_ais_status ON pcp_ai_reason_suggestions (human_action)',
      ],
    })
    app.save(aiReasonSuggestions)

    // 7. pcp_reason_clusters
    const reasonClusters = new Collection({
      name: 'pcp_reason_clusters',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'cluster_code', type: 'text', required: true },
        { name: 'proposed_name', type: 'text', required: true },
        { name: 'proposed_code', type: 'text' },
        { name: 'proposed_family_code', type: 'text' },
        { name: 'proposed_family_name', type: 'text' },
        { name: 'occurrence_count', type: 'number' },
        { name: 'similarity_score', type: 'number' },
        { name: 'impact_hours', type: 'number' },
        { name: 'impact_tons', type: 'number' },
        { name: 'recurring_terms', type: 'json' },
        { name: 'sample_justifications', type: 'json' },
        { name: 'affected_lines', type: 'json' },
        {
          name: 'status',
          type: 'select',
          values: ['PROPOSED', 'APPROVED', 'MERGED', 'REJECTED'],
          maxSelect: 1,
          required: true,
        },
        { name: 'approved_reason_code', type: 'text' },
        { name: 'merged_into_reason_code', type: 'text' },
        { name: 'reviewed_by_name', type: 'text' },
        { name: 'reviewed_at', type: 'date' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_rc_code ON pcp_reason_clusters (cluster_code)',
        'CREATE INDEX idx_rc_status ON pcp_reason_clusters (status)',
      ],
    })
    app.save(reasonClusters)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('pcp_reason_clusters'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_ai_reason_suggestions'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_change_evidence'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_change_justifications'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_version_diffs'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_change_reasons'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_reason_families'))
    } catch (_) {}
  },
)
