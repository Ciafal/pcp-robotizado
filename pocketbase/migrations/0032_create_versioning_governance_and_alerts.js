/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Coleção: schedule_relevance_criteria (Configuração dos Limites de Relevância)
    if (!app.hasTable('schedule_relevance_criteria')) {
      const col = new Collection({
        name: 'schedule_relevance_criteria',
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
          { name: 'is_active', type: 'bool' },
          { name: 'qty_low_threshold_pct', type: 'number', required: true }, // ex: 5 (até 5%)
          { name: 'qty_medium_threshold_pct', type: 'number', required: true }, // ex: 15 (5 a 15%, >15% é alta)
          { name: 'date_shift_change_level', type: 'text', required: true }, // "MEDIA"
          { name: 'date_day_change_level', type: 'text', required: true }, // "ALTA"
          { name: 'date_week_change_level', type: 'text', required: true }, // "ALTA"
          { name: 'seq_setup_increase_level', type: 'text', required: true }, // "MEDIA"
          { name: 'seq_customer_affected_level', type: 'text', required: true }, // "ALTA"
          { name: 'product_add_remove_level', type: 'text', required: true }, // "ALTA"
          { name: 'mto_impact_level', type: 'text', required: true }, // "ALTA"
          { name: 'post_approval_change_level', type: 'text', required: true }, // "ALTA"
          { name: 'existing_sap_op_change_level', type: 'text', required: true }, // "ALTA"
          { name: 'custom_rules_json', type: 'json' },
          { name: 'updated_by_name', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_src_code ON schedule_relevance_criteria (code)'],
      })
      app.save(col)

      // Seed inicial de critérios de relevância padrão oficial CIAFAL
      const critRec = new Record(col)
      critRec.set('code', 'CRITERIA_CIAFAL_DEFAULT')
      critRec.set('name', 'Critérios Oficiais CIAFAL de Relevância de Reprogramação')
      critRec.set(
        'description',
        'Limites parametrizáveis para classificação automática de BAIXA, MÉDIA e ALTA relevância.',
      )
      critRec.set('is_active', true)
      critRec.set('qty_low_threshold_pct', 5.0)
      critRec.set('qty_medium_threshold_pct', 15.0)
      critRec.set('date_shift_change_level', 'MEDIA')
      critRec.set('date_day_change_level', 'ALTA')
      critRec.set('date_week_change_level', 'ALTA')
      critRec.set('seq_setup_increase_level', 'MEDIA')
      critRec.set('seq_customer_affected_level', 'ALTA')
      critRec.set('product_add_remove_level', 'ALTA')
      critRec.set('mto_impact_level', 'ALTA')
      critRec.set('post_approval_change_level', 'ALTA')
      critRec.set('existing_sap_op_change_level', 'ALTA')
      critRec.set('updated_by_name', 'Engenharia de Processos / PCP')
      app.save(critRec)
    }

    // 2. Coleção: schedule_version_records (Controle Completo de Versionamento com Snapshot Completo)
    if (!app.hasTable('schedule_version_records')) {
      const col = new Collection({
        name: 'schedule_version_records',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'version_code', type: 'text', required: true }, // ex: "PCP-L1-2026-S35-V01"
          { name: 'schedule_code', type: 'text', required: true }, // ex: "WS-L1-2026-W35"
          { name: 'line_code', type: 'text', required: true },
          { name: 'year', type: 'number', required: true },
          { name: 'week_number', type: 'number', required: true },
          { name: 'version_number', type: 'number', required: true }, // 1, 2, 3...
          { name: 'version_tag', type: 'text', required: true }, // "V01", "V02", "V03"
          { name: 'previous_version_tag', type: 'text' }, // "V01"
          { name: 'previous_version_code', type: 'text' },
          { name: 'status', type: 'text', required: true }, // "DRAFT_REPROGRAMACAO", "SIMULADO", "APROVADO", "PUBLICADO", "HISTORICO"
          { name: 'is_current_published', type: 'bool' },
          {
            name: 'relevance_level',
            type: 'select',
            values: ['BAIXA', 'MEDIA', 'ALTA'],
            maxSelect: 1,
            required: true,
          },
          { name: 'change_reason', type: 'text', required: true }, // Opções exatas
          { name: 'change_notes', type: 'text' },
          { name: 'user_id', type: 'text' },
          { name: 'user_name', type: 'text', required: true },
          { name: 'user_email', type: 'text' },
          { name: 'snapshot_data', type: 'json' }, // Snapshot completo de cada versão
          { name: 'diff_payload', type: 'json' }, // Lista detalhada de diffs V_antiga x V_nova
          { name: 'impact_summary', type: 'json' }, // Produção, MES, Carteira, CRM, TMS, SAP
          { name: 'governing_parameters_snapshot', type: 'json' }, // Parâmetros do Motor de Regras vigentes
          { name: 'ai_score', type: 'number' },
          { name: 'ai_explanation', type: 'text' },
          { name: 'mes_dispatched', type: 'bool' },
          { name: 'mes_dispatched_at', type: 'text' },
          { name: 'mes_ack_status', type: 'text' }, // "NAO_LIDO", "VISUALIZADO", "RECONHECIDO"
          { name: 'crm_dispatched', type: 'bool' },
          { name: 'crm_dispatched_at', type: 'text' },
          { name: 'tms_dispatched', type: 'bool' },
          { name: 'sap_dispatched', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_svr_code ON schedule_version_records (version_code)',
          'CREATE INDEX idx_svr_schedule_ver ON schedule_version_records (schedule_code, version_number DESC)',
          'CREATE INDEX idx_svr_line_week ON schedule_version_records (line_code, year, week_number)',
          'CREATE INDEX idx_svr_curr ON schedule_version_records (line_code, is_current_published)',
        ],
      })
      app.save(col)
    }

    // 3. Coleção: schedule_mes_alerts (Alertas Automáticos ao MES com Controle de Ciência)
    if (!app.hasTable('schedule_mes_alerts')) {
      const col = new Collection({
        name: 'schedule_mes_alerts',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'alert_code', type: 'text', required: true },
          { name: 'programacao_id', type: 'text', required: true },
          { name: 'version_code', type: 'text', required: true },
          { name: 'previous_version_tag', type: 'text' },
          { name: 'new_version_tag', type: 'text', required: true },
          { name: 'line_code', type: 'text', required: true },
          { name: 'line_name', type: 'text' },
          { name: 'product_code', type: 'text' },
          { name: 'product_description', type: 'text' },
          { name: 'sequence_prev', type: 'text' },
          { name: 'sequence_new', type: 'text' },
          { name: 'qty_prev_tons', type: 'number' },
          { name: 'qty_new_tons', type: 'number' },
          { name: 'datetime_prev', type: 'text' },
          { name: 'datetime_new', type: 'text' },
          { name: 'reason', type: 'text', required: true },
          {
            name: 'relevance',
            type: 'select',
            values: ['BAIXA', 'MEDIA', 'ALTA'],
            maxSelect: 1,
            required: true,
          },
          { name: 'user_name', type: 'text', required: true },
          { name: 'user_email', type: 'text' },
          { name: 'notes', type: 'text' },
          { name: 'diff_items_json', type: 'json' },
          {
            name: 'ack_status',
            type: 'select',
            values: ['NAO_LIDO', 'VISUALIZADO', 'RECONHECIDO'],
            maxSelect: 1,
            required: true,
          },
          { name: 'viewed_at', type: 'text' },
          { name: 'viewed_by_user', type: 'text' },
          { name: 'acknowledged_at', type: 'text' },
          { name: 'acknowledged_by_user', type: 'text' },
          { name: 'acknowledgment_notes', type: 'text' },
          { name: 'is_active_banner', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_sma_code ON schedule_mes_alerts (alert_code)',
          'CREATE INDEX idx_sma_line_status ON schedule_mes_alerts (line_code, ack_status)',
          'CREATE INDEX idx_sma_prog ON schedule_mes_alerts (programacao_id)',
        ],
      })
      app.save(col)
    }

    // 4. Coleção: schedule_crm_alerts (Alertas Automáticos ao CRM 360º com Impacto Comercial)
    if (!app.hasTable('schedule_crm_alerts')) {
      const col = new Collection({
        name: 'schedule_crm_alerts',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'alert_code', type: 'text', required: true },
          { name: 'programacao_id', type: 'text', required: true },
          { name: 'version_code', type: 'text', required: true },
          { name: 'sales_order_number', type: 'text', required: true }, // ex: "45871/10"
          { name: 'sales_order_item', type: 'text' }, // "10"
          { name: 'customer_name', type: 'text', required: true }, // ex: "ABC Ltda."
          { name: 'customer_code', type: 'text' },
          { name: 'sales_rep_name', type: 'text' }, // Vendedor
          { name: 'sales_rep_email', type: 'text' },
          { name: 'sales_agent_name', type: 'text' }, // Representante
          { name: 'material_code', type: 'text', required: true }, // ex: "TR-60x30x2.0"
          { name: 'material_description', type: 'text' },
          { name: 'order_type', type: 'text' }, // "MTO" / "MTS"
          { name: 'original_promised_date', type: 'text' },
          { name: 'previous_production_date', type: 'text' }, // ex: "25/08/2026"
          { name: 'new_production_date', type: 'text' }, // ex: "27/08/2026"
          { name: 'previous_dispatch_date', type: 'text' },
          { name: 'new_dispatch_date', type: 'text' },
          { name: 'previous_delivery_date', type: 'text' },
          { name: 'new_delivery_date', type: 'text' },
          { name: 'previous_quantity_tons', type: 'number' }, // ex: 70
          { name: 'new_quantity_tons', type: 'number' }, // ex: 50
          { name: 'uncovered_quantity_tons', type: 'number' }, // ex: 20
          { name: 'order_balance_tons', type: 'number' },
          { name: 'reason', type: 'text', required: true }, // ex: "Indisponibilidade de MP"
          { name: 'commercial_impact_summary', type: 'text', required: true }, // "20 t sem cobertura nesta programação."
          { name: 'ai_commercial_explanation', type: 'text' }, // Linguagem comercial clara gerada por IA
          { name: 'tms_recalculation_required', type: 'bool' },
          { name: 'tms_new_delivery_estimate', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['PENDENTE', 'VISUALIZADO_VENDEDOR', 'REAVALIACAO_SOLICITADA', 'TRATADO'],
            maxSelect: 1,
            required: true,
          },
          { name: 'viewed_at', type: 'text' },
          { name: 'viewed_by_user', type: 'text' },
          { name: 'reevaluation_request_notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_sca_code ON schedule_crm_alerts (alert_code)',
          'CREATE INDEX idx_sca_order ON schedule_crm_alerts (sales_order_number)',
          'CREATE INDEX idx_sca_customer ON schedule_crm_alerts (customer_name)',
          'CREATE INDEX idx_sca_status ON schedule_crm_alerts (status)',
        ],
      })
      app.save(col)
    }

    // 5. Coleção: schedule_tms_events (Eventos e Previsões Logísticas Integradas TMS)
    if (!app.hasTable('schedule_tms_events')) {
      const col = new Collection({
        name: 'schedule_tms_events',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'event_code', type: 'text', required: true },
          { name: 'programacao_id', type: 'text', required: true },
          { name: 'version_code', type: 'text', required: true },
          { name: 'sales_order_number', type: 'text' },
          { name: 'customer_name', type: 'text' },
          { name: 'destination_city', type: 'text' },
          { name: 'destination_state', type: 'text' },
          { name: 'material_code', type: 'text', required: true },
          { name: 'quantity_tons', type: 'number', required: true },
          { name: 'product_available_datetime', type: 'text', required: true },
          { name: 'previous_product_available_datetime', type: 'text' },
          { name: 'recalculated_shipping_date', type: 'text' },
          { name: 'recalculated_delivery_date', type: 'text' },
          { name: 'transit_lead_time_days', type: 'number' },
          { name: 'carrier_name', type: 'text' },
          { name: 'logistics_status', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_ste_code ON schedule_tms_events (event_code)',
          'CREATE INDEX idx_ste_prog ON schedule_tms_events (programacao_id)',
        ],
      })
      app.save(col)
    }

    // 6. Coleção: schedule_sap_queue (Tratamento de Ordens SAP Existentes e Fila PostgreSQL → SAP)
    if (!app.hasTable('schedule_sap_queue')) {
      const col = new Collection({
        name: 'schedule_sap_queue',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'queue_code', type: 'text', required: true },
          { name: 'programacao_id', type: 'text', required: true },
          { name: 'version_code', type: 'text', required: true },
          { name: 'sap_production_order', type: 'text', required: true }, // ex: "1000456789"
          { name: 'material_code', type: 'text', required: true },
          { name: 'line_code', type: 'text', required: true },
          {
            name: 'sync_action',
            type: 'select',
            values: [
              'CRIAR_OP',
              'ATUALIZAR_DATAS_OP',
              'ATUALIZAR_QTD_OP',
              'CANCELAR_REPLANEJAR_OP',
              'REORGANIZAR_SEQUENCIA',
            ],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'status',
            type: 'select',
            values: [
              'AGUARDANDO_INTEGRACAO_SAP',
              'ENVIADO_SAP',
              'OP_CONFIRMADA',
              'DIVERGENCIA_SAP',
              'PROCESSADO_COM_SUCESSO',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'diff_details_json', type: 'json' },
          { name: 'sap_response_message', type: 'text' },
          { name: 'sap_document_number', type: 'text' },
          { name: 'dispatched_at', type: 'text' },
          { name: 'confirmed_at', type: 'text' },
          { name: 'user_name', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_ssq_code ON schedule_sap_queue (queue_code)',
          'CREATE INDEX idx_ssq_op ON schedule_sap_queue (sap_production_order)',
          'CREATE INDEX idx_ssq_prog ON schedule_sap_queue (programacao_id)',
          'CREATE INDEX idx_ssq_status ON schedule_sap_queue (status)',
        ],
      })
      app.save(col)
    }

    // 7. Permissões RBAC para Central de Alterações e Versionamento
    const permCol = app.findCollectionByNameOrId('pcp_permissions')
    const permsToAdd = [
      {
        name: 'Visualizar Alterações e Histórico de Versões',
        key: 'pcp.schedule_changes.view',
        category: 'SCHEDULE',
        description:
          'Permite visualizar o histórico completo de versões, central de alterações e comparativos diff.',
        is_critical: false,
      },
      {
        name: 'Gerenciar Critérios de Relevância',
        key: 'pcp.relevance_criteria.manage',
        category: 'GOVERNANCE',
        description:
          'Permite editar os limites parametrizáveis de relevância (Baixa, Média, Alta).',
        is_critical: true,
      },
      {
        name: 'Reconhecer Alertas MES',
        key: 'pcp.mes_alerts.acknowledge',
        category: 'OPERATIONAL',
        description: 'Permite registrar ciência operacional dos alertas enviados ao MES.',
        is_critical: false,
      },
      {
        name: 'Reavaliar Alertas CRM',
        key: 'pcp.crm_alerts.manage',
        category: 'COMMERCIAL',
        description:
          'Permite visualizar e responder a solicitações de reavaliação de clientes e pedidos no CRM.',
        is_critical: false,
      },
    ]

    for (const p of permsToAdd) {
      try {
        app.findFirstRecordByData('pcp_permissions', 'key', p.key)
      } catch (_) {
        const rec = new Record(permCol)
        rec.set('name', p.name)
        rec.set('key', p.key)
        rec.set('category', p.category)
        rec.set('description', p.description)
        rec.set('is_critical', p.is_critical)
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      if (app.hasTable('schedule_sap_queue')) {
        app.delete(app.findCollectionByNameOrId('schedule_sap_queue'))
      }
      if (app.hasTable('schedule_tms_events')) {
        app.delete(app.findCollectionByNameOrId('schedule_tms_events'))
      }
      if (app.hasTable('schedule_crm_alerts')) {
        app.delete(app.findCollectionByNameOrId('schedule_crm_alerts'))
      }
      if (app.hasTable('schedule_mes_alerts')) {
        app.delete(app.findCollectionByNameOrId('schedule_mes_alerts'))
      }
      if (app.hasTable('schedule_version_records')) {
        app.delete(app.findCollectionByNameOrId('schedule_version_records'))
      }
      if (app.hasTable('schedule_relevance_criteria')) {
        app.delete(app.findCollectionByNameOrId('schedule_relevance_criteria'))
      }
    } catch (_) {}
  },
)
