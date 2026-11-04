/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000173 (IDEMPOTENTE):
 * 1. Cria a collection pc_tarugo_plans (Plano Tarugos — planos padrão de corte de
 *    tarugos por Empresa/Centro/Linha/Plano de Corte, com tarugo principal e
 *    alternativas), apenas se ainda não existir.
 * 2. Cria a collection pc_tarugo_plan_history (histórico/auditoria dos planos),
 *    apenas se ainda não existir.
 *
 * Sem dados fictícios: nenhuma linha é inserida.
 */
migrate(
  (app) => {
    if (!app.hasTable('pc_tarugo_plans')) {
      const col = new Collection({
        name: 'pc_tarugo_plans',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // exclusão lógica via is_active=false; DELETE não permitido via API
        fields: [
          { name: 'company', type: 'text', required: true },
          { name: 'center', type: 'text', required: true },
          { name: 'line', type: 'text', required: true },
          { name: 'cutting_plan', type: 'text', required: true },
          { name: 'plan_description', type: 'text' },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['Ativo', 'Inativo'],
          },
          { name: 'main_material_code', type: 'text', required: true },
          { name: 'main_description', type: 'text' },
          { name: 'main_steel_family', type: 'text' },
          { name: 'main_supplier_code', type: 'text' },
          { name: 'main_supplier_name', type: 'text' },
          { name: 'main_dimension_section', type: 'text' },
          { name: 'main_length_m', type: 'number', required: true },
          { name: 'main_length_min_m', type: 'number' },
          { name: 'main_length_max_m', type: 'number' },
          { name: 'main_weight_kg', type: 'number', required: true },
          { name: 'alternatives', type: 'json' },
          {
            name: 'origin',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['HUB', 'SAP', 'Sincronizado SAP/HUB'],
          },
          { name: 'sap_synced_at', type: 'date' },
          { name: 'created_by_user_id', type: 'text' },
          { name: 'created_by_user_name', type: 'text' },
          { name: 'updated_by_user_id', type: 'text' },
          { name: 'updated_by_user_name', type: 'text' },
          { name: 'last_change_summary', type: 'text' },
          { name: 'derived_from_plan', type: 'text' },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pc_tarugo_plans_key ON pc_tarugo_plans (company, center, line, cutting_plan)',
          'CREATE INDEX idx_pc_tarugo_plans_mat ON pc_tarugo_plans (main_material_code)',
          'CREATE INDEX idx_pc_tarugo_plans_status ON pc_tarugo_plans (status)',
        ],
      })
      app.save(col)
      console.log('Collection pc_tarugo_plans criada.')
    }

    if (!app.hasTable('pc_tarugo_plan_history')) {
      const col = new Collection({
        name: 'pc_tarugo_plan_history',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: null, // histórico imutável
        deleteRule: null,
        fields: [
          { name: 'plan_record_id', type: 'text', required: true },
          { name: 'cutting_plan', type: 'text' },
          { name: 'company', type: 'text' },
          { name: 'center', type: 'text' },
          { name: 'line', type: 'text' },
          {
            name: 'event_type',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: [
              'PLANO_CRIADO',
              'PLANO_EDITADO',
              'PLANO_DUPLICADO',
              'PLANO_ATIVADO',
              'PLANO_INATIVADO',
              'ALTERNATIVA_INCLUIDA',
              'ALTERNATIVA_ALTERADA',
              'ALTERNATIVA_REMOVIDA',
              'SINCRONIZACAO_SAP',
            ],
          },
          { name: 'user_id', type: 'text' },
          { name: 'user_name', type: 'text' },
          { name: 'user_email', type: 'text' },
          { name: 'previous_state', type: 'json' },
          { name: 'new_state', type: 'json' },
          { name: 'details', type: 'text' },
          { name: 'event_timestamp', type: 'date' },
        ],
        indexes: [
          'CREATE INDEX idx_pc_tarugo_hist_plan ON pc_tarugo_plan_history (plan_record_id)',
          'CREATE INDEX idx_pc_tarugo_hist_cut ON pc_tarugo_plan_history (cutting_plan)',
        ],
      })
      app.save(col)
      console.log('Collection pc_tarugo_plan_history criada.')
    }
  },
  (app) => {
    // Down: apenas remove o que esta migration criou (se ainda existir).
    try {
      if (app.hasTable('pc_tarugo_plan_history')) {
        app.delete(app.findCollectionByNameOrId('pc_tarugo_plan_history'))
      }
    } catch (err) {
      console.warn('Down pc_tarugo_plan_history:', err)
    }
    try {
      if (app.hasTable('pc_tarugo_plans')) {
        app.delete(app.findCollectionByNameOrId('pc_tarugo_plans'))
      }
    } catch (err) {
      console.warn('Down pc_tarugo_plans:', err)
    }
  },
)
