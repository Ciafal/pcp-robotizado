migrate(
  (app) => {
    // 1. Criar collection test_types se não existir
    if (!app.hasTable('test_types')) {
      const testTypesCollection = new Collection({
        name: 'test_types',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'description', type: 'text', required: true },
          { name: 'active', type: 'bool', required: false },
          { name: 'created_by', type: 'text', required: false },
          { name: 'updated_by', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(testTypesCollection)

      // Seed tipos iniciais
      const initialTypes = [
        'Homologação Operacional',
        'Validação de Processo',
        'Validação de Matéria-Prima',
        'Homologação de Equipamento',
        'Teste de Calibração de Bitola',
        'Teste de Modificação de Bitola',
        'Receita de Laminação',
        'Teste de Produtividade',
        'Ajuste Dimensional',
      ]

      const typesCol = app.findCollectionByNameOrId('test_types')
      for (const desc of initialTypes) {
        try {
          const record = new Record(typesCol, {
            description: desc,
            active: true,
            created_by: 'sistema',
          })
          app.save(record)
        } catch (e) {
          console.log('Erro seed tipo: ' + desc, e)
        }
      }
    }

    // 2. Adicionar novos objetivos industriais em industrial_test_objectives
    if (app.hasTable('industrial_test_objectives')) {
      const objCol = app.findCollectionByNameOrId('industrial_test_objectives')
      const newObjectives = [
        {
          code: 'OBJ-38',
          name: 'Teste de nova calibração de bitola',
          description:
            'Validação e acerto operacional para introdução de nova calibração de bitola.',
          is_custom_trigger: false,
          active: true,
        },
        {
          code: 'OBJ-39',
          name: 'Teste de modificação de bitola',
          description: 'Ajuste e validação técnica de modificação de bitola em linha produtiva.',
          is_custom_trigger: false,
          active: true,
        },
      ]

      for (const obj of newObjectives) {
        try {
          // Checar se já existe pelo nome ou código
          const existing = app.findRecordsByFilter(
            'industrial_test_objectives',
            `name ~ '${obj.name}' || code = '${obj.code}'`,
            '',
            1,
            0,
          )
          if (!existing || existing.length === 0) {
            const rec = new Record(objCol, {
              code: obj.code,
              name: obj.name,
              description: obj.description,
              is_custom_trigger: obj.is_custom_trigger,
              active: obj.active,
              created_by: 'sistema',
            })
            app.save(rec)
          }
        } catch (err) {
          console.log('Erro inserindo objetivo: ' + obj.name, err)
        }
      }
    }

    // 3. Adicionar novos campos em test_programming para conclusão, revisão e responsáveis
    if (app.hasTable('test_programming')) {
      const testProg = app.findCollectionByNameOrId('test_programming')
      const fieldsToAdd = [
        { name: 'requester_user_id', type: 'text' },
        { name: 'technical_lead_user_id', type: 'text' },
        { name: 'conclusion', type: 'text' },
        { name: 'conclusion_user_id', type: 'text' },
        { name: 'conclusion_user_name', type: 'text' },
        { name: 'conclusion_date', type: 'text' },
        { name: 'conclusion_time', type: 'text' },
        { name: 'needs_revision', type: 'bool' },
        { name: 'revision_types', type: 'json' },
        { name: 'revision_reason', type: 'text' },
        { name: 'revision_document_code', type: 'text' },
        { name: 'revision_document_title', type: 'text' },
        { name: 'revision_document_version', type: 'text' },
        { name: 'revision_status', type: 'text' },
        { name: 'ai_revision_suggestion', type: 'json' },
        { name: 'ai_revision_decision', type: 'text' },
        { name: 'ai_revision_decision_by', type: 'text' },
        { name: 'ai_revision_decision_at', type: 'text' },
      ]

      for (const f of fieldsToAdd) {
        try {
          const fieldExists = testProg.fields.getByName ? testProg.fields.getByName(f.name) : null
          if (!fieldExists) {
            if (f.type === 'text') {
              testProg.fields.add(new TextField({ name: f.name, required: false }))
            } else if (f.type === 'bool') {
              testProg.fields.add(new BoolField({ name: f.name, required: false }))
            } else if (f.type === 'json') {
              testProg.fields.add(new JSONField({ name: f.name, required: false }))
            }
          }
        } catch (e) {
          // Ignora se campo já existe
        }
      }
      app.save(testProg)
    }
  },
  (app) => {
    // rollback seguro
  },
)
