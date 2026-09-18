migrate(
  (app) => {
    // 1. Obter IDs das coleções existentes para relacionamentos opcionais/seguros
    let companiesColId = ''
    try {
      companiesColId = app.findCollectionByNameOrId('companies').id
    } catch (_) {}

    let linesColId = ''
    try {
      linesColId = app.findCollectionByNameOrId('production_lines').id
    } catch (_) {}

    let routesColId = ''
    try {
      routesColId = app.findCollectionByNameOrId('production_routes').id
    } catch (_) {}

    // 2. Criar coleção line_buffers
    const collection = new Collection({
      name: 'line_buffers',
      type: 'base',
      listRule: "@request.auth.id != '' || @request.auth.id = ''",
      viewRule: "@request.auth.id != '' || @request.auth.id = ''",
      createRule: "@request.auth.id != '' || @request.auth.id = ''",
      updateRule: "@request.auth.id != '' || @request.auth.id = ''",
      deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          collectionId: companiesColId || undefined,
          maxSelect: 1,
          required: false,
        },
        { name: 'company_code', type: 'text', required: true },
        {
          name: 'line_id',
          type: 'relation',
          collectionId: linesColId || undefined,
          maxSelect: 1,
          required: false,
        },
        { name: 'line_code', type: 'text', required: true },
        {
          name: 'route_id',
          type: 'relation',
          collectionId: routesColId || undefined,
          maxSelect: 1,
          required: false,
        },
        { name: 'route_code', type: 'text', required: true },
        { name: 'center_code', type: 'text', required: true },
        { name: 'related_center_code', type: 'text', required: true },
        {
          name: 'position',
          type: 'select',
          required: true,
          values: ['Entrada do Centro', 'Saída do Centro', 'Entre Centros'],
          maxSelect: 1,
        },
        {
          name: 'buffer_type',
          type: 'select',
          required: true,
          values: [
            'Buffer Físico',
            'Buffer Operacional',
            'Buffer de Segurança',
            'Pulmão de Produção',
            'Pulmão Intermediário',
          ],
          maxSelect: 1,
        },
        {
          name: 'unit_of_measure',
          type: 'select',
          required: true,
          values: ['t', 'kg', 'peças', 'unidades', 'barras', 'tarugos', 'palanquilhas'],
          maxSelect: 1,
        },
        { name: 'min_capacity', type: 'number', required: true },
        { name: 'ideal_capacity', type: 'number', required: true },
        { name: 'max_capacity', type: 'number', required: true },
        { name: 'alert_lower_limit', type: 'number', required: false },
        { name: 'alert_upper_limit', type: 'number', required: false },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Ativo', 'Inativo'],
          maxSelect: 1,
        },
        { name: 'valid_from', type: 'date', required: true },
        { name: 'valid_until', type: 'date', required: true },
        { name: 'observation', type: 'text', required: false },
        {
          name: 'stock_source',
          type: 'select',
          required: true,
          values: [
            'WMS',
            'SAP',
            'MES 4.0',
            'Banco Industrial',
            'Sensor',
            'Apontamento Manual Controlado',
          ],
          maxSelect: 1,
        },
        { name: 'source_config', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_line_buffers_route ON line_buffers (route_code)',
        'CREATE INDEX idx_line_buffers_centers ON line_buffers (center_code, related_center_code)',
        'CREATE INDEX idx_line_buffers_status ON line_buffers (status)',
      ],
    })

    app.save(collection)

    // 3. Seed inicial representativo dos buffers das rotas padrão homologadas (L1, L2, ENDIR, RETRAB)
    const seedBuffers = [
      {
        company_code: 'CIAFAL',
        line_code: 'L2',
        route_code: 'ROUT_PERF_U_V2',
        center_code: 'L2',
        related_center_code: 'ENDIR',
        position: 'Saída do Centro',
        buffer_type: 'Buffer Operacional',
        unit_of_measure: 't',
        min_capacity: 15,
        ideal_capacity: 30,
        max_capacity: 100,
        alert_lower_limit: 18,
        alert_upper_limit: 90,
        status: 'Ativo',
        valid_from: '2025-01-01 00:00:00.000Z',
        valid_until: '2026-12-31 23:59:59.000Z',
        observation: 'Buffer de transição entre calibração L2 e endireitamento',
        stock_source: 'MES 4.0',
        source_config: {
          deposito: 'DP07',
          localizacao: 'BAIA-L2-01',
          centro: 'CR_ESTRUT',
          campo: 'PESO_LIQ',
          origem: 'APONTAMENTO_AUTO',
        },
      },
      {
        company_code: 'CIAFAL',
        line_code: 'ENDIR',
        route_code: 'ROUT_PERF_U_V2',
        center_code: 'ENDIR',
        related_center_code: 'L2',
        position: 'Entrada do Centro',
        buffer_type: 'Buffer Operacional',
        unit_of_measure: 't',
        min_capacity: 15,
        ideal_capacity: 25,
        max_capacity: 100,
        alert_lower_limit: 18,
        alert_upper_limit: 90,
        status: 'Ativo',
        valid_from: '2025-01-01 00:00:00.000Z',
        valid_until: '2026-12-31 23:59:59.000Z',
        observation: 'Pulmão de recepção na Endireitadeira vindo de L2',
        stock_source: 'Sensor',
        source_config: {
          deposito: 'DP07',
          localizacao: 'ESTEIRA_ENTRADA_ENDIR',
          centro: 'WC-CTG-ENDIR',
        },
      },
      {
        company_code: 'CIAFAL',
        line_code: 'ENDIR',
        route_code: 'ROUT_PERF_U_V2',
        center_code: 'ENDIR',
        related_center_code: 'RETRAB',
        position: 'Saída do Centro',
        buffer_type: 'Buffer de Segurança',
        unit_of_measure: 't',
        min_capacity: 5,
        ideal_capacity: 15,
        max_capacity: 60,
        alert_lower_limit: 8,
        alert_upper_limit: 50,
        status: 'Ativo',
        valid_from: '2025-01-01 00:00:00.000Z',
        valid_until: '2026-12-31 23:59:59.000Z',
        observation: 'Pulmão de segurança para peças desviadas para Retrabalho',
        stock_source: 'WMS',
        source_config: {
          deposito: 'DP04',
          localizacao: 'BOX-RETRAB',
          centro: 'WC-CTG-RETRAB',
        },
      },
      {
        company_code: 'CIAFAL',
        line_code: 'L1',
        route_code: 'ROUT_TUB_STD_V1',
        center_code: 'L1',
        related_center_code: 'ENF_L1',
        position: 'Saída do Centro',
        buffer_type: 'Buffer Operacional',
        unit_of_measure: 't',
        min_capacity: 20,
        ideal_capacity: 50,
        max_capacity: 180,
        alert_lower_limit: 25,
        alert_upper_limit: 160,
        status: 'Ativo',
        valid_from: '2025-01-01 00:00:00.000Z',
        valid_until: '2026-12-31 23:59:59.000Z',
        observation: 'Pulmão de laminação a quente para enfornamento térmico',
        stock_source: 'SAP',
        source_config: {
          deposito: 'DP01',
          localizacao: 'PATIO_QUENTE',
          centro: 'WC-DIV-L1',
        },
      },
    ]

    for (const item of seedBuffers) {
      try {
        const record = new Record(collection)
        for (const [key, val] of Object.entries(item)) {
          record.set(key, val)
        }
        app.save(record)
      } catch (err) {
        console.log('Erro ao criar seed de line_buffer:', err)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('line_buffers')
      app.delete(col)
    } catch (_) {}
  },
)
