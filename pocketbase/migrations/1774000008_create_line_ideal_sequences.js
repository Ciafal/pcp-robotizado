migrate(
  (app) => {
    // 1. Obter IDs das coleções existentes para relacionamentos opcionais/seguros
    let linesColId = ''
    try {
      linesColId = app.findCollectionByNameOrId('production_lines').id
    } catch (_) {}

    let familiesColId = ''
    try {
      familiesColId = app.findCollectionByNameOrId('product_families').id
    } catch (_) {}

    // 2. Criar coleção line_ideal_sequences
    const collection = new Collection({
      name: 'line_ideal_sequences',
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
        { name: 'family_order', type: 'number', required: true },
        {
          name: 'family_id',
          type: 'relation',
          collectionId: familiesColId || undefined,
          maxSelect: 1,
          required: false,
        },
        { name: 'family_code', type: 'text', required: false },
        { name: 'family_name', type: 'text', required: true },
        { name: 'subsequence_order', type: 'number', required: true },
        { name: 'gauge_dimension', type: 'text', required: true },
        { name: 'material_code', type: 'text', required: true },
        { name: 'material_description', type: 'text', required: false },
        { name: 'cycle_time_avg_min', type: 'number', required: true },
        { name: 'cycle_time_tolerance_pct', type: 'number', required: true },
        { name: 'stock_coverage_max_days', type: 'number', required: true },
        { name: 'is_active', type: 'bool', required: false },
        {
          name: 'homologation_status',
          type: 'select',
          required: false,
          values: ['HOMOLOGADA', 'NAO_HOMOLOGADA'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text', required: false },
        { name: 'sap_work_center', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lis_line ON line_ideal_sequences (line_code, is_active)',
        'CREATE INDEX idx_lis_mat ON line_ideal_sequences (material_code)',
        'CREATE INDEX idx_lis_order ON line_ideal_sequences (family_order, subsequence_order)',
      ],
    })

    app.save(collection)

    // 3. Obter ID da linha L1 como referência padrão para seed dos 6 registros originais
    let l1LineId = ''
    try {
      const l1Rec = app.findFirstRecordByData('production_lines', 'code', 'L1')
      l1LineId = l1Rec.id
    } catch (_) {}

    // 4. Seed com os 6 registros originais da Ficha Mestra
    const seedRecords = [
      {
        line_id: l1LineId || null,
        line_code: 'L1',
        family_order: 1,
        family_code: 'TUB_QUAD',
        family_name: 'Tubo Quadrado',
        subsequence_order: 1,
        gauge_dimension: '40x40 mm #1.50',
        material_code: 'TQ-GALV-40x40',
        material_description: 'TUBO PRE-GALV Z275 40X40X1,50MM',
        cycle_time_avg_min: 36,
        cycle_time_tolerance_pct: 10,
        stock_coverage_max_days: 30,
        is_active: true,
        homologation_status: 'HOMOLOGADA',
      },
      {
        line_id: l1LineId || null,
        line_code: 'L1',
        family_order: 1,
        family_code: 'TUB_QUAD',
        family_name: 'Tubo Quadrado',
        subsequence_order: 2,
        gauge_dimension: '50x50 mm #2.00',
        material_code: 'TQ-50x50x2.0',
        material_description: 'TUBO QUADRADO ASTM A500 50X50X2,00MM',
        cycle_time_avg_min: 42,
        cycle_time_tolerance_pct: 10,
        stock_coverage_max_days: 30,
        is_active: true,
        homologation_status: 'HOMOLOGADA',
      },
      {
        line_id: l1LineId || null,
        line_code: 'L1',
        family_order: 1,
        family_code: 'TUB_QUAD',
        family_name: 'Tubo Quadrado',
        subsequence_order: 3,
        gauge_dimension: '100x100 mm #8.00',
        material_code: 'TQ-100x100x8.0',
        material_description: 'TUBO QUADRADO ASTM A36 100X100X8,00MM',
        cycle_time_avg_min: 68,
        cycle_time_tolerance_pct: 12,
        stock_coverage_max_days: 20,
        is_active: true,
        homologation_status: 'HOMOLOGADA',
      },
      {
        line_id: l1LineId || null,
        line_code: 'L1',
        family_order: 2,
        family_code: 'TUB_RET',
        family_name: 'Tubo Retangular',
        subsequence_order: 1,
        gauge_dimension: '80x40 mm #2.50',
        material_code: 'TR-80x40x2.5',
        material_description: 'TUBO RETANGULAR ASTM A500 80X40X2,50MM',
        cycle_time_avg_min: 55,
        cycle_time_tolerance_pct: 10,
        stock_coverage_max_days: 30,
        is_active: true,
        homologation_status: 'HOMOLOGADA',
      },
      {
        line_id: l1LineId || null,
        line_code: 'L1',
        family_order: 3,
        family_code: 'PERF_U',
        family_name: 'Perfil U',
        subsequence_order: 1,
        gauge_dimension: '100x40 mm #1.20',
        material_code: 'PU-FINO-1.20',
        material_description: 'PERFIL U SIMPLES NBR 6355 100X40X1,20MM',
        cycle_time_avg_min: 50,
        cycle_time_tolerance_pct: 10,
        stock_coverage_max_days: 25,
        is_active: true,
        homologation_status: 'HOMOLOGADA',
      },
      {
        line_id: l1LineId || null,
        line_code: 'L1',
        family_order: 3,
        family_code: 'PERF_U',
        family_name: 'Perfil U',
        subsequence_order: 2,
        gauge_dimension: '150x50 mm #4.75',
        material_code: 'PU-150x50x4.75',
        material_description: 'PERFIL U ENRIJECIDO NBR 6355 150X50X4,75MM',
        cycle_time_avg_min: 48,
        cycle_time_tolerance_pct: 10,
        stock_coverage_max_days: 35,
        is_active: true,
        homologation_status: 'HOMOLOGADA',
      },
    ]

    for (const item of seedRecords) {
      try {
        const record = new Record(collection)
        for (const [key, val] of Object.entries(item)) {
          if (val !== undefined && val !== null) {
            record.set(key, val)
          }
        }
        app.save(record)
      } catch (err) {
        console.log('Erro ao criar seed de line_ideal_sequence:', err)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('line_ideal_sequences')
      app.delete(col)
    } catch (_) {}
  },
)
