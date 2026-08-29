/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Criar coleção weekly_schedules (Itens da Montagem Semanal da Linha)
    if (!app.hasTable('weekly_schedules')) {
      const wsCol = new Collection({
        name: 'weekly_schedules',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'schedule_code', type: 'text', required: true },
          { name: 'company_code', type: 'text', required: true },
          { name: 'plant_code', type: 'text', required: true },
          { name: 'line_code', type: 'text', required: true },
          {
            name: 'line_id',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('production_lines').id,
            maxSelect: 1,
          },
          { name: 'year', type: 'number', required: true },
          { name: 'week_number', type: 'number', required: true },
          { name: 'period_display', type: 'text' }, // Ex: "24/08 a 30/08"
          { name: 'day_of_week', type: 'text', required: true }, // SEG, TER, QUA, QUI, SEX, SAB, DOM
          { name: 'date_str', type: 'text' }, // YYYY-MM-DD
          { name: 'shift_code', type: 'text', required: true }, // T1_L1, T2_L1, etc.
          { name: 'shift_name', type: 'text' },
          { name: 'crew_name', type: 'text' }, // Turma A, Turma B, etc.
          { name: 'sequence_order', type: 'number', required: true },
          {
            name: 'item_type',
            type: 'select',
            values: ['PRODUCTION', 'SETUP', 'SCHEDULED_STOP'],
            maxSelect: 1,
          },
          { name: 'material_code', type: 'text' },
          { name: 'material_description', type: 'text' },
          { name: 'family_code', type: 'text' },
          { name: 'steel_grade', type: 'text' },
          { name: 'dimensions', type: 'text' },
          { name: 'production_order', type: 'text' },
          { name: 'sales_order_mto', type: 'text' },
          { name: 'customer_name', type: 'text' },
          {
            name: 'order_type',
            type: 'select',
            values: ['MTS', 'MTO', 'INDUSTRIALIZACAO'],
            maxSelect: 1,
          },
          { name: 'planned_quantity_tons', type: 'number' },
          { name: 'productivity_rate_th', type: 'number' },
          { name: 'production_hours', type: 'number' },
          { name: 'setup_duration_minutes', type: 'number' },
          { name: 'setup_reason', type: 'text' },
          { name: 'stop_code', type: 'text' },
          { name: 'stop_description', type: 'text' },
          { name: 'stop_duration_minutes', type: 'number' },
          { name: 'start_datetime', type: 'text' }, // ISO string ou "YYYY-MM-DD HH:mm"
          { name: 'end_datetime', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['DRAFT', 'EM_ANALISE', 'APROVADO', 'PUBLICADO'],
            maxSelect: 1,
          },
          { name: 'version', type: 'number' },
          { name: 'pcp_notes', type: 'text' },
          { name: 'raw_material_req_tons', type: 'number' },
          { name: 'raw_material_type', type: 'text' },
          { name: 'is_blocked_attempt', type: 'bool' },
          { name: 'metadata', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ws_line_week ON weekly_schedules (line_code, year, week_number)',
          'CREATE INDEX idx_ws_seq ON weekly_schedules (day_of_week, shift_code, sequence_order)',
          'CREATE INDEX idx_ws_status ON weekly_schedules (status)',
        ],
      })
      app.save(wsCol)
    }

    // 2. Garantir permissões de Montagem Semanal no RBAC
    try {
      const permsCol = app.findCollectionByNameOrId('pcp_permissions')
      const newPerms = [
        {
          key: 'pcp.weekly_schedule.view',
          name: 'Visualizar Montagem Semanal',
          category: 'PROGRAMACAO',
          description:
            'Permite visualizar a grade e indicadores da montagem semanal por linha produtiva.',
          is_critical: false,
        },
        {
          key: 'pcp.weekly_schedule.edit',
          name: 'Editar Montagem Semanal',
          category: 'PROGRAMACAO',
          description: 'Permite adicionar materiais, ordenar sequência, simular e salvar rascunho.',
          is_critical: false,
        },
        {
          key: 'pcp.weekly_schedule.approve',
          name: 'Enviar / Aprovar Montagem Semanal',
          category: 'PROGRAMACAO',
          description: 'Permite submeter e validar a programação semanal da linha.',
          is_critical: true,
        },
      ]

      for (const p of newPerms) {
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
    } catch (_) {}
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('weekly_schedules'))
    } catch (_) {}
  },
)
