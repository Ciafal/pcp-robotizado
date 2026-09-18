migrate(
  (app) => {
    // 1. Obter ID da coleção de production_lines
    let linesColId = ''
    try {
      linesColId = app.findCollectionByNameOrId('production_lines').id
    } catch (_) {}

    // 2. Criar coleção line_gauge_min_restrictions (Restrições Mínimas de Programação por Bitola)
    const collection = new Collection({
      name: 'line_gauge_min_restrictions',
      type: 'base',
      listRule: "@request.auth.id != '' || @request.auth.id = ''",
      viewRule: "@request.auth.id != '' || @request.auth.id = ''",
      createRule: "@request.auth.id != '' || @request.auth.id = ''",
      updateRule: "@request.auth.id != '' || @request.auth.id = ''",
      deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          collectionId: linesColId || undefined,
          maxSelect: 1,
          required: false,
        },
        { name: 'line_code', type: 'text', required: true },
        {
          name: 'restriction_type',
          type: 'text',
          required: true,
        },
        { name: 'min_value', type: 'number', required: true },
        { name: 'unit_of_measure', type: 'text', required: true },
        { name: 'rule_description', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: false,
          values: ['ATIVA', 'INATIVA'],
          maxSelect: 1,
        },
        { name: 'created_by_name', type: 'text', required: false },
        { name: 'updated_by_name', type: 'text', required: false },
        { name: 'has_scheduling_history', type: 'bool', required: false },
        { name: 'notes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lgmr_line ON line_gauge_min_restrictions (line_code, status)',
        'CREATE INDEX idx_lgmr_type ON line_gauge_min_restrictions (restriction_type)',
      ],
    })

    app.save(collection)

    // 3. Obter ID do Centro FORNOL1 ou L1 para seed inicial demonstrativo conforme especificação
    let targetLineId = ''
    let targetLineCode = 'L1'
    try {
      const lineRec = app.findFirstRecordByData('production_lines', 'code', 'ENF_L1')
      targetLineId = lineRec.id
      targetLineCode = 'ENF_L1'
    } catch (_) {
      try {
        const l1Rec = app.findFirstRecordByData('production_lines', 'code', 'L1')
        targetLineId = l1Rec.id
        targetLineCode = 'L1'
      } catch (_) {}
    }

    const sampleRestrictions = [
      {
        line_id: targetLineId || null,
        line_code: targetLineCode,
        restriction_type: 'Horas',
        min_value: 8,
        unit_of_measure: 'h',
        rule_description: 'Manter no mínimo 8 horas consecutivas de produção da mesma bitola antes de permitir troca.',
        status: 'ATIVA',
        created_by_name: 'PCP Robotizado',
        has_scheduling_history: false,
      },
      {
        line_id: targetLineId || null,
        line_code: targetLineCode,
        restriction_type: 'Quantidade',
        min_value: 100,
        unit_of_measure: 't',
        rule_description: 'Programar no mínimo 100 toneladas da bitola antes da próxima troca.',
        status: 'ATIVA',
        created_by_name: 'PCP Robotizado',
        has_scheduling_history: false,
      },
      {
        line_id: targetLineId || null,
        line_code: targetLineCode,
        restriction_type: 'Dias',
        min_value: 1,
        unit_of_measure: 'dia',
        rule_description: 'Para esta linha manter a mesma bitola por no mínimo 1 dia produtivo.',
        status: 'INATIVA',
        created_by_name: 'PCP Robotizado',
        has_scheduling_history: false,
      },
    ]

    for (const item of sampleRestrictions) {
      try {
        const record = new Record(collection)
        for (const [key, val] of Object.entries(item)) {
          if (val !== undefined && val !== null) {
            record.set(key, val)
          }
        }
        app.save(record)
      } catch (err) {
        console.log('Erro ao criar seed de line_gauge_min_restrictions:', err)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('line_gauge_min_restrictions')
      app.delete(col)
    } catch (_) {}
  },
)
