migrate(
  (app) => {
    // 1. Coleção: pcp_production_reference_documents
    if (!app.hasTable('pcp_production_reference_documents')) {
      const docsCol = new Collection({
        name: 'pcp_production_reference_documents',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'document_ref', type: 'text', required: true },
          { name: 'document_code', type: 'text', required: true },
          { name: 'title', type: 'text', required: true },
          { name: 'revision', type: 'text', required: true },
          { name: 'revision_date', type: 'text' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['VIGENTE', 'EM_REVISAO', 'OBSOLETO', 'CANCELADO', 'SUBSTITUIDO'],
            maxSelect: 1,
          },
          { name: 'document_type', type: 'text' },
          { name: 'process', type: 'text' },
          { name: 'responsible_area', type: 'text' },
          { name: 'validity_date_start', type: 'text' },
          { name: 'validity_date_end', type: 'text' },
          { name: 'document_author', type: 'text' },
          { name: 'source', type: 'text' },
          { name: 'original_url', type: 'text' },
          { name: 'last_sync_at', type: 'text' },
          { name: 'applications', type: 'json' },
          { name: 'ai_categories', type: 'json' },
          { name: 'criteria', type: 'json' },
          {
            name: 'priority',
            type: 'select',
            values: ['ALTA', 'MEDIA', 'BAIXA'],
            maxSelect: 1,
          },
          { name: 'is_primary', type: 'bool' },
          { name: 'active', type: 'bool' },
          { name: 'has_new_revision_available', type: 'bool' },
          { name: 'new_revision_details', type: 'json' },
          { name: 'extractable_content', type: 'text' },
          { name: 'created_by_user_id', type: 'text' },
          { name: 'created_by_user_name', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pprd_doc_code ON pcp_production_reference_documents (document_code)',
          'CREATE INDEX idx_pprd_status ON pcp_production_reference_documents (status)',
          'CREATE INDEX idx_pprd_active ON pcp_production_reference_documents (active)',
        ],
      })
      app.save(docsCol)
    }

    // 2. Coleção: pcp_production_reference_governance_logs
    if (!app.hasTable('pcp_production_reference_governance_logs')) {
      const logsCol = new Collection({
        name: 'pcp_production_reference_governance_logs',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'reference_document_id', type: 'text', required: true },
          { name: 'document_code', type: 'text', required: true },
          { name: 'revision', type: 'text' },
          { name: 'action', type: 'text', required: true },
          { name: 'applications', type: 'json' },
          { name: 'categories', type: 'json' },
          { name: 'criteria', type: 'json' },
          { name: 'priority', type: 'text' },
          { name: 'is_primary', type: 'bool' },
          { name: 'previous_value', type: 'json' },
          { name: 'new_value', type: 'json' },
          { name: 'user_id', type: 'text' },
          { name: 'user_name', type: 'text' },
          { name: 'user_email', type: 'text' },
          { name: 'details', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pprgl_ref_id ON pcp_production_reference_governance_logs (reference_document_id)',
          'CREATE INDEX idx_pprgl_doc_code ON pcp_production_reference_governance_logs (document_code)',
          'CREATE INDEX idx_pprgl_action ON pcp_production_reference_governance_logs (action)',
        ],
      })
      app.save(logsCol)
    }

    // 3. Coleção: pcp_production_treatment_history
    if (!app.hasTable('pcp_production_treatment_history')) {
      const treatCol = new Collection({
        name: 'pcp_production_treatment_history',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'occurrence_id', type: 'text', required: true },
          { name: 'occurrence_type', type: 'text', required: true },
          { name: 'op_number', type: 'text' },
          { name: 'material_code', type: 'text' },
          { name: 'document_code', type: 'text' },
          { name: 'document_title', type: 'text' },
          { name: 'document_revision', type: 'text' },
          { name: 'proposed_action', type: 'text' },
          { name: 'actual_action_taken', type: 'text' },
          { name: 'responsible_name', type: 'text' },
          { name: 'responsible_area', type: 'text' },
          { name: 'outcome', type: 'text' },
          { name: 'reprocessing_done', type: 'bool' },
          { name: 'resolved', type: 'bool' },
          { name: 'divergence_identified', type: 'bool' },
          { name: 'divergence_notes', type: 'text' },
          { name: 'observation', type: 'text' },
          { name: 'ai_traceability_data', type: 'json' },
          { name: 'user_id', type: 'text' },
          { name: 'user_name', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ppth_occ_id ON pcp_production_treatment_history (occurrence_id)',
          'CREATE INDEX idx_ppth_occ_type ON pcp_production_treatment_history (occurrence_type)',
          'CREATE INDEX idx_ppth_op ON pcp_production_treatment_history (op_number)',
        ],
      })
      app.save(treatCol)
    }

    // 4. Coleção: pcp_production_ai_traceability
    if (!app.hasTable('pcp_production_ai_traceability')) {
      const traceCol = new Collection({
        name: 'pcp_production_ai_traceability',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'occurrence_id', type: 'text', required: true },
          { name: 'occurrence_type', type: 'text' },
          { name: 'analysis_timestamp', type: 'text' },
          { name: 'documents_consulted', type: 'json' },
          { name: 'revisions_consulted', type: 'json' },
          { name: 'rules_and_excerpts_used', type: 'json' },
          { name: 'identified_category', type: 'text' },
          { name: 'source_sap_data', type: 'json' },
          { name: 'result_facts', type: 'json' },
          { name: 'result_hypotheses', type: 'json' },
          { name: 'result_proposed_action', type: 'json' },
          { name: 'has_divergence_with_history', type: 'bool' },
          { name: 'divergence_message', type: 'text' },
          { name: 'user_id', type: 'text' },
          { name: 'user_name', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ppat_occ_id ON pcp_production_ai_traceability (occurrence_id)',
          'CREATE INDEX idx_ppat_created ON pcp_production_ai_traceability (created DESC)',
        ],
      })
      app.save(traceCol)
    }
  },
  (app) => {
    const tableNames = [
      'pcp_production_ai_traceability',
      'pcp_production_treatment_history',
      'pcp_production_reference_governance_logs',
      'pcp_production_reference_documents',
    ]
    for (const name of tableNames) {
      if (app.hasTable(name)) {
        try {
          const col = app.findCollectionByNameOrId(name)
          app.delete(col)
        } catch (_) {}
      }
    }
  },
)
