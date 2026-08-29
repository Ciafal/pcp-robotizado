/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Atualizar campos da coleção weekly_schedules para suportar novos status do workflow e governança
    if (app.hasTable('weekly_schedules')) {
      const wsCol = app.findCollectionByNameOrId('weekly_schedules')

      // Atualizar campo status com os 7 estados do ciclo completo
      const statusField = wsCol.fields.getByName('status')
      if (statusField) {
        statusField.values = [
          'DRAFT',
          'SIMULADO',
          'VALIDADO',
          'AGUARDANDO_APROVACAO_PCP',
          'APROVADO_PCP',
          'ENVIADO_GESTOR_LINHA',
          'PUBLICADO',
          'EXECUTANDO',
          'REALIZADO',
          'ANALISADO',
          // Legados para retrocompatibilidade
          'EM_ANALISE',
          'APROVADO',
        ]
      }

      // Adicionar campos para rastreamento de cenário e execução prevista x realizada se não existirem
      if (!wsCol.fields.getByName('scenario_id')) {
        wsCol.fields.add(
          new TextField({
            name: 'scenario_id',
            required: false,
          }),
        )
      }

      if (!wsCol.fields.getByName('scenario_name')) {
        wsCol.fields.add(
          new TextField({
            name: 'scenario_name',
            required: false,
          }),
        )
      }

      if (!wsCol.fields.getByName('realized_quantity_tons')) {
        wsCol.fields.add(
          new NumberField({
            name: 'realized_quantity_tons',
            required: false,
          }),
        )
      }

      if (!wsCol.fields.getByName('realized_hours')) {
        wsCol.fields.add(
          new NumberField({
            name: 'realized_hours',
            required: false,
          }),
        )
      }

      if (!wsCol.fields.getByName('realized_productivity_th')) {
        wsCol.fields.add(
          new NumberField({
            name: 'realized_productivity_th',
            required: false,
          }),
        )
      }

      if (!wsCol.fields.getByName('deviation_notes')) {
        wsCol.fields.add(
          new TextField({
            name: 'deviation_notes',
            required: false,
          }),
        )
      }

      if (!wsCol.fields.getByName('lifecycle_stage')) {
        wsCol.fields.add(
          new SelectField({
            name: 'lifecycle_stage',
            values: ['PLANEJADO', 'PROGRAMADO', 'APROVADO', 'EXECUTANDO', 'REALIZADO', 'ANALISADO'],
            maxSelect: 1,
            required: false,
          }),
        )
      }

      app.save(wsCol)
    }

    // 2. Criar coleção weekly_schedule_versions para versionamento pós-publicação
    if (!app.hasTable('weekly_schedule_versions')) {
      const verCol = new Collection({
        name: 'weekly_schedule_versions',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'schedule_code', type: 'text', required: true },
          { name: 'line_code', type: 'text', required: true },
          { name: 'year', type: 'number', required: true },
          { name: 'week_number', type: 'number', required: true },
          { name: 'version_number', type: 'number', required: true },
          { name: 'user_id', type: 'text' },
          { name: 'user_name', type: 'text', required: true },
          { name: 'user_email', type: 'text' },
          { name: 'change_reason', type: 'text', required: true },
          { name: 'impact_assessment', type: 'text', required: true },
          { name: 'previous_schedule_data', type: 'json' },
          { name: 'new_schedule_data', type: 'json' },
          { name: 'diff_summary', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_wsv_schedule ON weekly_schedule_versions (schedule_code, version_number DESC)',
          'CREATE INDEX idx_wsv_line_week ON weekly_schedule_versions (line_code, year, week_number)',
        ],
      })
      app.save(verCol)
    }

    // 3. Criar coleção weekly_schedule_scenarios para armazenar os cenários A/B/C
    if (!app.hasTable('weekly_schedule_scenarios')) {
      const scenCol = new Collection({
        name: 'weekly_schedule_scenarios',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'scenario_code', type: 'text', required: true }, // ex: "A", "B", "C"
          { name: 'scenario_name', type: 'text', required: true },
          { name: 'description', type: 'text' },
          { name: 'schedule_code', type: 'text', required: true },
          { name: 'line_code', type: 'text', required: true },
          { name: 'year', type: 'number', required: true },
          { name: 'week_number', type: 'number', required: true },
          { name: 'is_active', type: 'bool' },
          { name: 'items_snapshot', type: 'json' },
          { name: 'metrics_snapshot', type: 'json' },
          { name: 'ai_recommendation', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_wsc_schedule ON weekly_schedule_scenarios (schedule_code, scenario_code)',
        ],
      })
      app.save(scenCol)
    }
  },
  (app) => {
    try {
      if (app.hasTable('weekly_schedule_scenarios')) {
        app.delete(app.findCollectionByNameOrId('weekly_schedule_scenarios'))
      }
      if (app.hasTable('weekly_schedule_versions')) {
        app.delete(app.findCollectionByNameOrId('weekly_schedule_versions'))
      }
    } catch (_) {}
  },
)
