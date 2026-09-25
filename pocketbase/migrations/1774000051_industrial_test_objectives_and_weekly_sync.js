/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Coleção industrial_test_objectives
    if (!app.hasTable('industrial_test_objectives')) {
      const objCol = new Collection({
        name: 'industrial_test_objectives',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'is_custom_trigger', type: 'bool', required: false },
          { name: 'active', type: 'bool', required: false },
          { name: 'created_by', type: 'text', required: false },
          { name: 'updated_by', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_ito_code ON industrial_test_objectives (code)',
          'CREATE INDEX idx_ito_active ON industrial_test_objectives (active)',
        ],
      })
      app.save(objCol)
    }

    // Seed dos 35 objetivos industriais padronizados (OBJ-01 a OBJ-35)
    const objectivesSeed = [
      { code: 'OBJ-01', name: 'Homologação de equipamento', is_custom_trigger: false },
      { code: 'OBJ-02', name: 'Validação de novo equipamento', is_custom_trigger: false },
      {
        code: 'OBJ-03',
        name: 'Validação após manutenção ou modificação de equipamento',
        is_custom_trigger: false,
      },
      { code: 'OBJ-04', name: 'Validação de matéria-prima', is_custom_trigger: false },
      {
        code: 'OBJ-05',
        name: 'Validação de novo fornecedor de matéria-prima',
        is_custom_trigger: false,
      },
      { code: 'OBJ-06', name: 'Validação de receita de processo', is_custom_trigger: false },
      { code: 'OBJ-07', name: 'Validação de parâmetros de processo', is_custom_trigger: false },
      { code: 'OBJ-08', name: 'Validação de ferramental', is_custom_trigger: false },
      { code: 'OBJ-09', name: 'Validação de cilindros', is_custom_trigger: false },
      { code: 'OBJ-10', name: 'Desenvolvimento de novo produto', is_custom_trigger: false },
      { code: 'OBJ-11', name: 'Homologação de produto', is_custom_trigger: false },
      { code: 'OBJ-12', name: 'Homologação de processo', is_custom_trigger: false },
      { code: 'OBJ-13', name: 'Aumento de produtividade', is_custom_trigger: false },
      { code: 'OBJ-14', name: 'Aumento de capacidade produtiva', is_custom_trigger: false },
      { code: 'OBJ-15', name: 'Redução de tempo de setup', is_custom_trigger: false },
      { code: 'OBJ-16', name: 'Redução de tempo de acerto', is_custom_trigger: false },
      { code: 'OBJ-17', name: 'Redução de paradas', is_custom_trigger: false },
      { code: 'OBJ-18', name: 'Redução de refugo', is_custom_trigger: false },
      { code: 'OBJ-19', name: 'Redução de sucata', is_custom_trigger: false },
      { code: 'OBJ-20', name: 'Redução de retrabalho', is_custom_trigger: false },
      { code: 'OBJ-21', name: 'Melhoria de rendimento metálico', is_custom_trigger: false },
      { code: 'OBJ-22', name: 'Melhoria da qualidade do produto', is_custom_trigger: false },
      { code: 'OBJ-23', name: 'Estabilidade do processo', is_custom_trigger: false },
      { code: 'OBJ-24', name: 'Redução de custo industrial', is_custom_trigger: false },
      { code: 'OBJ-25', name: 'Redução de consumo de matéria-prima', is_custom_trigger: false },
      { code: 'OBJ-26', name: 'Redução de consumo energético', is_custom_trigger: false },
      { code: 'OBJ-27', name: 'Teste de velocidade de produção', is_custom_trigger: false },
      { code: 'OBJ-28', name: 'Teste de capacidade operacional', is_custom_trigger: false },
      { code: 'OBJ-29', name: 'Teste de sequência produtiva', is_custom_trigger: false },
      { code: 'OBJ-30', name: 'Teste de segurança operacional', is_custom_trigger: false },
      { code: 'OBJ-31', name: 'Melhoria ergonômica/operacional', is_custom_trigger: false },
      { code: 'OBJ-32', name: 'Investigação de desvio de processo', is_custom_trigger: false },
      { code: 'OBJ-33', name: 'Investigação de desvio de qualidade', is_custom_trigger: false },
      { code: 'OBJ-34', name: 'Teste para solução de problema', is_custom_trigger: false },
      { code: 'OBJ-35', name: 'Outro objetivo industrial', is_custom_trigger: true },
    ]

    try {
      const objCol = app.findCollectionByNameOrId('industrial_test_objectives')
      for (const item of objectivesSeed) {
        try {
          app.findFirstRecordByData('industrial_test_objectives', 'code', item.code)
        } catch (_) {
          const rec = new Record(objCol)
          rec.set('code', item.code)
          rec.set('name', item.name)
          rec.set('is_custom_trigger', item.is_custom_trigger)
          rec.set('active', true)
          rec.set('description', item.name)
          app.save(rec)
        }
      }
    } catch (e) {
      console.warn('Erro ao popular industrial_test_objectives:', e)
    }

    // 2. Expandir test_programming
    try {
      const tpCol = app.findCollectionByNameOrId('test_programming')
      if (!tpCol.fields.getByName('objectives_list')) {
        tpCol.fields.add(new JSONField({ name: 'objectives_list', required: false }))
      }
      if (!tpCol.fields.getByName('other_objective_description')) {
        tpCol.fields.add(new TextField({ name: 'other_objective_description', required: false }))
      }
      if (!tpCol.fields.getByName('weekly_schedule_item_id')) {
        tpCol.fields.add(new TextField({ name: 'weekly_schedule_item_id', required: false }))
      }
      if (!tpCol.fields.getByName('weekly_schedule_status')) {
        tpCol.fields.add(
          new SelectField({
            name: 'weekly_schedule_status',
            required: false,
            values: ['INTEGRADO', 'SINCRONIZADO', 'DESVINCULADO', 'CANCELADO'],
            maxSelect: 1,
          }),
        )
      }
      app.save(tpCol)
    } catch (err) {
      console.warn('Erro ao atualizar campos de test_programming:', err)
    }

    // 3. Expandir weekly_schedules
    try {
      const wsCol = app.findCollectionByNameOrId('weekly_schedules')
      // Atualizar valores de item_type para incluir TEST_INDUSTRIAL
      const itemTypeField = wsCol.fields.getByName('item_type')
      if (itemTypeField && itemTypeField.type === 'select') {
        const currentVals = (itemTypeField.values || []).slice()
        if (!currentVals.includes('TEST_INDUSTRIAL')) {
          currentVals.push('TEST_INDUSTRIAL')
          itemTypeField.values = currentVals
        }
      }

      if (!wsCol.fields.getByName('test_programming_id')) {
        wsCol.fields.add(new TextField({ name: 'test_programming_id', required: false }))
      }
      if (!wsCol.fields.getByName('test_code')) {
        wsCol.fields.add(new TextField({ name: 'test_code', required: false }))
      }
      if (!wsCol.fields.getByName('is_origin_test_programming')) {
        wsCol.fields.add(new BoolField({ name: 'is_origin_test_programming', required: false }))
      }
      if (!wsCol.fields.getByName('is_locked_externally')) {
        wsCol.fields.add(new BoolField({ name: 'is_locked_externally', required: false }))
      }
      if (!wsCol.fields.getByName('test_technical_lead')) {
        wsCol.fields.add(new TextField({ name: 'test_technical_lead', required: false }))
      }
      if (!wsCol.fields.getByName('test_objectives')) {
        wsCol.fields.add(new JSONField({ name: 'test_objectives', required: false }))
      }

      app.save(wsCol)

      try {
        wsCol.addIndex('idx_ws_tp_id', false, 'test_programming_id', '')
        wsCol.addIndex('idx_ws_test_code', false, 'test_code', '')
        app.save(wsCol)
      } catch (_) {}
    } catch (err) {
      console.warn('Erro ao atualizar campos de weekly_schedules:', err)
    }
  },
  (app) => {
    try {
      const wsCol = app.findCollectionByNameOrId('weekly_schedules')
      const wsFields = [
        'test_objectives',
        'test_technical_lead',
        'is_locked_externally',
        'is_origin_test_programming',
        'test_code',
        'test_programming_id',
      ]
      for (const f of wsFields) {
        try {
          wsCol.fields.removeByName(f)
        } catch (_) {}
      }
      app.save(wsCol)
    } catch (_) {}

    try {
      const tpCol = app.findCollectionByNameOrId('test_programming')
      const tpFields = [
        'weekly_schedule_status',
        'weekly_schedule_item_id',
        'other_objective_description',
        'objectives_list',
      ]
      for (const f of tpFields) {
        try {
          tpCol.fields.removeByName(f)
        } catch (_) {}
      }
      app.save(tpCol)
    } catch (_) {}

    try {
      if (app.hasTable('industrial_test_objectives')) {
        const col = app.findCollectionByNameOrId('industrial_test_objectives')
        app.delete(col)
      }
    } catch (_) {}
  },
)
