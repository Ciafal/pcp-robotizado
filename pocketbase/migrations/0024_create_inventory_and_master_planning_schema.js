/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Expandir coleção inventory_items com novos campos se não existirem
    try {
      const invCol = app.findCollectionByNameOrId('inventory_items')
      if (!invCol.fields.getByName('steel_grade')) {
        invCol.fields.add(new TextField({ name: 'steel_grade' }))
      }
      if (!invCol.fields.getByName('mp_type')) {
        invCol.fields.add(new TextField({ name: 'mp_type' }))
      }
      if (!invCol.fields.getByName('application_code')) {
        invCol.fields.add(new TextField({ name: 'application_code' }))
      }
      if (!invCol.fields.getByName('production_nature')) {
        invCol.fields.add(
          new SelectField({
            name: 'production_nature',
            values: ['PRODUCAO_PROPRIA', 'INDUSTRIALIZACAO', 'TODAS'],
            maxSelect: 1,
          }),
        )
      }
      if (!invCol.fields.getByName('days_in_stock')) {
        invCol.fields.add(new NumberField({ name: 'days_in_stock' }))
      }
      if (!invCol.fields.getByName('dimensions')) {
        invCol.fields.add(new TextField({ name: 'dimensions' }))
      }
      if (!invCol.fields.getByName('crm_order_ref')) {
        invCol.fields.add(new TextField({ name: 'crm_order_ref' }))
      }
      if (!invCol.fields.getByName('shipping_expected_date')) {
        invCol.fields.add(new TextField({ name: 'shipping_expected_date' }))
      }
      if (!invCol.fields.getByName('origin_process_line')) {
        invCol.fields.add(new TextField({ name: 'origin_process_line' }))
      }
      if (!invCol.fields.getByName('next_process_line')) {
        invCol.fields.add(new TextField({ name: 'next_process_line' }))
      }
      if (!invCol.fields.getByName('wms_qty_total')) {
        invCol.fields.add(new NumberField({ name: 'wms_qty_total' }))
      }
      if (!invCol.fields.getByName('wms_last_sync')) {
        invCol.fields.add(new TextField({ name: 'wms_last_sync' }))
      }
      if (!invCol.fields.getByName('divergence_status')) {
        invCol.fields.add(
          new SelectField({
            name: 'divergence_status',
            values: ['OK', 'DIVERGENCIA', 'ANALISE'],
            maxSelect: 1,
          }),
        )
      }
      app.save(invCol)
    } catch (_) {}

    // 2. Criar coleção inventory_discrepancies (Divergências SAP x WMS)
    if (!app.hasTable('inventory_discrepancies')) {
      const discCol = new Collection({
        name: 'inventory_discrepancies',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'discrepancy_code', type: 'text', required: true },
          { name: 'plant_code', type: 'text', required: true },
          { name: 'storage_location', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text' },
          { name: 'batch_number', type: 'text' },
          { name: 'sap_qty', type: 'number' },
          { name: 'wms_qty', type: 'number' },
          { name: 'diff_qty', type: 'number' },
          { name: 'diff_pct', type: 'number' },
          { name: 'unit', type: 'text' },
          { name: 'sap_sync_at', type: 'text' },
          { name: 'wms_sync_at', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['PENDENTE', 'EM_TRATAMENTO', 'CONCILIADO', 'JUSTIFICADO'],
            maxSelect: 1,
          },
          { name: 'occurrence_notes', type: 'text' },
          { name: 'responsible_name', type: 'text' },
          { name: 'resolved_at', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_inv_disc_code ON inventory_discrepancies (discrepancy_code)',
          'CREATE INDEX idx_inv_disc_mat ON inventory_discrepancies (material_code)',
          'CREATE INDEX idx_inv_disc_status ON inventory_discrepancies (status)',
        ],
      })
      app.save(discCol)
    }

    // 3. Criar coleção master_plans (Planejamento Mestre / S&OP)
    if (!app.hasTable('master_plans')) {
      const mpCol = new Collection({
        name: 'master_plans',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'plan_code', type: 'text', required: true },
          { name: 'title', type: 'text', required: true },
          {
            name: 'horizon_type',
            type: 'select',
            values: ['ANUAL', 'MENSAL', 'SEMANAL'],
            maxSelect: 1,
          },
          { name: 'period_ref', type: 'text', required: true },
          { name: 'year', type: 'number' },
          { name: 'month', type: 'number' },
          { name: 'version', type: 'number' },
          {
            name: 'status',
            type: 'select',
            values: ['DRAFT', 'EM_APROVACAO', 'VIGENTE', 'SUPERSEDED', 'CANCELADO'],
            maxSelect: 1,
          },
          { name: 'plant_code', type: 'text' },
          { name: 'total_planned_tons', type: 'number' },
          { name: 'total_produced_tons', type: 'number' },
          { name: 'firm_demand_tons', type: 'number' },
          { name: 'crm_forecast_tons', type: 'number' },
          { name: 'adherence_volume_pct', type: 'number' },
          { name: 'adherence_mix_pct', type: 'number' },
          { name: 'adherence_temporal_pct', type: 'number' },
          { name: 'adherence_overall_pct', type: 'number' },
          { name: 'forecast_accuracy_pct', type: 'number' },
          { name: 'forecast_bias_pct', type: 'number' },
          { name: 'responsible_name', type: 'text' },
          { name: 'change_reason', type: 'text' },
          { name: 'snapshot_crm_payload', type: 'json' },
          { name: 'items_summary_payload', type: 'json' },
          { name: 'ai_analysis_payload', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_code ON master_plans (plan_code)',
          'CREATE INDEX idx_mp_period ON master_plans (period_ref, horizon_type)',
          'CREATE INDEX idx_mp_status ON master_plans (status)',
        ],
      })
      app.save(mpCol)
    }

    // 4. Criar coleção master_plan_items (Itens detalhados por Produto/Linha/Período)
    if (!app.hasTable('master_plan_items')) {
      const mpiCol = new Collection({
        name: 'master_plan_items',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'item_code', type: 'text', required: true },
          { name: 'plan_code', type: 'text', required: true },
          { name: 'product_code', type: 'text', required: true },
          { name: 'product_name', type: 'text' },
          { name: 'family_code', type: 'text' },
          { name: 'steel_grade', type: 'text' },
          { name: 'line_code', type: 'text' },
          { name: 'plant_code', type: 'text' },
          {
            name: 'production_nature',
            type: 'select',
            values: ['PRODUCAO_PROPRIA', 'INDUSTRIALIZACAO'],
            maxSelect: 1,
          },
          {
            name: 'order_type',
            type: 'select',
            values: ['MTS', 'MTO'],
            maxSelect: 1,
          },
          { name: 'period_ref', type: 'text' },
          { name: 'planned_tons', type: 'number' },
          { name: 'programmed_tons', type: 'number' },
          { name: 'produced_tons', type: 'number' },
          { name: 'firm_sales_tons', type: 'number' },
          { name: 'crm_forecast_tons', type: 'number' },
          { name: 'final_stock_tons', type: 'number' },
          { name: 'adherence_volume_pct', type: 'number' },
          { name: 'adherence_mix_pct', type: 'number' },
          { name: 'adherence_temporal_pct', type: 'number' },
          { name: 'gap_tons', type: 'number' },
          { name: 'forecast_accuracy_pct', type: 'number' },
          { name: 'forecast_bias_pct', type: 'number' },
          { name: 'deviation_cause', type: 'text' },
          { name: 'deviation_justification', type: 'text' },
          { name: 'action_plan', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mpi_item_code ON master_plan_items (item_code)',
          'CREATE INDEX idx_mpi_plan ON master_plan_items (plan_code)',
          'CREATE INDEX idx_mpi_prod ON master_plan_items (product_code, line_code)',
        ],
      })
      app.save(mpiCol)
    }

    // 5. Criar coleção crm_forecast_records (Previsibilidade Comercial CRM 360º)
    if (!app.hasTable('crm_forecast_records')) {
      const crmCol = new Collection({
        name: 'crm_forecast_records',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'record_code', type: 'text', required: true },
          { name: 'customer_code', type: 'text' },
          { name: 'customer_name', type: 'text', required: true },
          { name: 'sales_rep_name', type: 'text' },
          { name: 'region', type: 'text' },
          { name: 'segment', type: 'text' },
          { name: 'product_code', type: 'text', required: true },
          { name: 'product_name', type: 'text' },
          { name: 'family_code', type: 'text' },
          { name: 'steel_grade', type: 'text' },
          {
            name: 'demand_layer',
            type: 'select',
            values: [
              'DEMANDA_FIRME',
              'DEMANDA_PLANEJADA',
              'COMERCIAL_PROVAVEL',
              'DEMANDA_POTENCIAL',
            ],
            maxSelect: 1,
          },
          { name: 'funnel_stage', type: 'text' },
          { name: 'probability_pct', type: 'number' },
          { name: 'quantity_tons', type: 'number' },
          { name: 'weighted_tons', type: 'number' },
          { name: 'period_ref', type: 'text' },
          { name: 'expected_date', type: 'text' },
          { name: 'last_purchase_date', type: 'text' },
          { name: 'historical_conversion_pct', type: 'number' },
          { name: 'status', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_crm_rec_code ON crm_forecast_records (record_code)',
          'CREATE INDEX idx_crm_prod ON crm_forecast_records (product_code)',
          'CREATE INDEX idx_crm_period ON crm_forecast_records (period_ref)',
        ],
      })
      app.save(crmCol)
    }

    // 6. Criar coleção master_plan_versions (Histórico & Versionamento do Plano)
    if (!app.hasTable('master_plan_versions')) {
      const mpvCol = new Collection({
        name: 'master_plan_versions',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'version_code', type: 'text', required: true },
          { name: 'plan_code', type: 'text', required: true },
          { name: 'version_number', type: 'number', required: true },
          { name: 'period_ref', type: 'text', required: true },
          { name: 'author_name', type: 'text' },
          { name: 'author_email', type: 'text' },
          { name: 'change_reason', type: 'text' },
          { name: 'valid_from', type: 'text' },
          { name: 'valid_until', type: 'text' },
          { name: 'total_planned_tons', type: 'number' },
          { name: 'crm_forecast_tons', type: 'number' },
          { name: 'crm_active_snapshot', type: 'json' },
          { name: 'plan_payload', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mpv_code ON master_plan_versions (version_code)',
          'CREATE INDEX idx_mpv_plan ON master_plan_versions (plan_code, version_number)',
        ],
      })
      app.save(mpvCol)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('master_plan_versions'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('crm_forecast_records'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('master_plan_items'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('master_plans'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('inventory_discrepancies'))
    } catch (_) {}
  },
)
