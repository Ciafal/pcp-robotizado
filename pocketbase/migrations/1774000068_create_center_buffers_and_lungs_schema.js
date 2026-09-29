/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Coleção: center_buffers (Camada de Parametrização Mestra na Ficha Mestra de Centros)
    if (!app.hasTable('center_buffers')) {
      const lineCol = app.findCollectionByNameOrId('production_lines')
      const lineColId = lineCol ? lineCol.id : undefined

      const centerBuffersCol = new Collection({
        name: 'center_buffers',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          {
            name: 'line_id',
            type: 'relation',
            collectionId: lineColId,
            maxSelect: 1,
            required: false,
          },
          { name: 'center_code', type: 'text', required: true },
          { name: 'center_name', type: 'text', required: false },
          { name: 'description', type: 'text', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Ativo', 'Inativo'],
            maxSelect: 1,
          },
          {
            name: 'buffer_type',
            type: 'select',
            required: true,
            values: [
              'Espaço físico',
              'Capacidade máxima da baia',
              'Área bloqueada por segurança',
              'Bloqueio temporário — Segurança',
              'Bloqueio temporário — Manutenção',
              'Bloqueio temporário — Obra',
            ],
            maxSelect: 1,
          },
          // Campos dinâmicos por tipo
          { name: 'location_physical', type: 'text', required: false },
          { name: 'available_area', type: 'number', required: false },
          { name: 'unit_of_measure', type: 'text', required: false },
          { name: 'operational_capacity', type: 'number', required: false },
          { name: 'observation', type: 'text', required: false },
          { name: 'bay_identification', type: 'text', required: false },
          { name: 'max_capacity', type: 'number', required: false },
          { name: 'recommended_capacity', type: 'number', required: false },
          { name: 'max_percentage_allowed', type: 'number', required: false },
          { name: 'block_reason', type: 'text', required: false },
          { name: 'responsible_name', type: 'text', required: false },
          { name: 'start_date', type: 'text', required: false }, // aceita YYYY-MM-DD ou ISO
          { name: 'expected_release_date', type: 'text', required: false },
          { name: 'block_status', type: 'text', required: false }, // Programado, Ativo, Finalizado, Cancelado
          { name: 'related_equipment', type: 'text', required: false },
          { name: 'construction_description', type: 'text', required: false },
          // Seção 3: Impacto na Capacidade Produtiva
          { name: 'impacts_capacity', type: 'bool', required: false },
          { name: 'capacity_reduction', type: 'number', required: false },
          { name: 'capacity_reduction_unit', type: 'text', required: false }, // %, t, t/h, quantidade, área indisponível
          { name: 'capacity_impact_start', type: 'text', required: false },
          { name: 'capacity_impact_end', type: 'text', required: false },
          // Exclusão lógica e metadados
          { name: 'is_deleted', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_center_buffers_code ON center_buffers (code)',
          'CREATE INDEX idx_center_buffers_center ON center_buffers (center_code)',
          'CREATE INDEX idx_center_buffers_type ON center_buffers (buffer_type)',
          'CREATE INDEX idx_center_buffers_status ON center_buffers (status)',
        ],
      })

      app.save(centerBuffersCol)
    }

    // 2. Coleção: center_lung_stocks (Estoque Pulmão na Ficha Mestra de Centros)
    if (!app.hasTable('center_lung_stocks')) {
      const lineCol = app.findCollectionByNameOrId('production_lines')
      const lineColId = lineCol ? lineCol.id : undefined

      const centerLungsCol = new Collection({
        name: 'center_lung_stocks',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          {
            name: 'line_id',
            type: 'relation',
            collectionId: lineColId,
            maxSelect: 1,
            required: false,
          },
          { name: 'center_code', type: 'text', required: true },
          { name: 'center_name', type: 'text', required: false },
          { name: 'location_deposit', type: 'text', required: false },
          { name: 'description', type: 'text', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Ativo', 'Inativo'],
            maxSelect: 1,
          },
          { name: 'material_or_group', type: 'text', required: true },
          { name: 'unit_of_measure', type: 'text', required: true },
          { name: 'min_stock', type: 'number', required: true },
          { name: 'ideal_stock', type: 'number', required: true },
          { name: 'max_stock', type: 'number', required: true },
          { name: 'max_physical_capacity', type: 'number', required: false },
          { name: 'min_coverage_hours', type: 'number', required: false },
          { name: 'ideal_coverage_hours', type: 'number', required: false },
          { name: 'current_real_stock', type: 'number', required: false }, // Preparado para SAP/RFC
          { name: 'observation', type: 'text', required: false },
          { name: 'is_deleted', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_center_lungs_code ON center_lung_stocks (code)',
          'CREATE INDEX idx_center_lungs_center ON center_lung_stocks (center_code)',
          'CREATE INDEX idx_center_lungs_status ON center_lung_stocks (status)',
        ],
      })

      app.save(centerLungsCol)
    }

    // 3. Seed inicial de demonstração associado aos Centros homologados (L1, L2, ENDIR)
    try {
      const buffersCol = app.findCollectionByNameOrId('center_buffers')
      const existingBuffersCount = app.countRecords('center_buffers')
      if (existingBuffersCount === 0) {
        const seedB1 = new Record(buffersCol)
        seedB1.set('code', 'BUF-00001')
        seedB1.set('name', 'Baia MP Principal Forno')
        seedB1.set('center_code', 'L1')
        seedB1.set('center_name', 'Linha 1 - Laminação')
        seedB1.set(
          'description',
          'Baia de estocagem de palanquilhas e tarugos para aquecimento contínuo',
        )
        seedB1.set('status', 'Ativo')
        seedB1.set('buffer_type', 'Capacidade máxima da baia')
        seedB1.set('bay_identification', 'Baia MP-01')
        seedB1.set('max_capacity', 150)
        seedB1.set('unit_of_measure', 't')
        seedB1.set('recommended_capacity', 120)
        seedB1.set('max_percentage_allowed', 95)
        seedB1.set('observation', 'Baia MP-01, Capacidade máxima: 150 t')
        seedB1.set('impacts_capacity', false)
        seedB1.set('is_deleted', false)
        app.save(seedB1)

        const seedB2 = new Record(buffersCol)
        seedB2.set('code', 'BUF-00002')
        seedB2.set('name', 'Área Bloqueada Manutenção Cilindros')
        seedB2.set('center_code', 'L1')
        seedB2.set('center_name', 'Linha 1 - Laminação')
        seedB2.set('description', 'Manutenção preventiva periódica dos mancais de laminação')
        seedB2.set('status', 'Ativo')
        seedB2.set('buffer_type', 'Bloqueio temporário — Manutenção')
        seedB2.set('location_physical', 'Gaiola 03 / Desbaste')
        seedB2.set('related_equipment', 'Mancal G03-L1')
        seedB2.set('block_reason', 'Reforma emergencial e troca de mancais')
        seedB2.set('responsible_name', 'Eng. Roberto Silva - PCM')
        seedB2.set('start_date', '2026-10-05 08:00')
        seedB2.set('expected_release_date', '2026-10-05 18:00')
        seedB2.set('block_status', 'Programado')
        seedB2.set('impacts_capacity', true)
        seedB2.set('capacity_reduction', 25)
        seedB2.set('capacity_reduction_unit', '%')
        seedB2.set('capacity_impact_start', '2026-10-05 08:00')
        seedB2.set('capacity_impact_end', '2026-10-05 18:00')
        seedB2.set(
          'observation',
          'Centro L1, Buffer: Área bloqueada para manutenção, Redução de capacidade: 25%, Vigência: 05/10/2026 08:00 até 05/10/2026 18:00',
        )
        seedB2.set('is_deleted', false)
        app.save(seedB2)
      }
    } catch (e) {
      console.log('Seed center_buffers aviso:', e)
    }

    try {
      const lungsCol = app.findCollectionByNameOrId('center_lung_stocks')
      const existingLungsCount = app.countRecords('center_lung_stocks')
      if (existingLungsCount === 0) {
        const seedL1 = new Record(lungsCol)
        seedL1.set('code', 'PUL-00001')
        seedL1.set('name', 'Pulmão Tarugos 130x130 SAE 1020')
        seedL1.set('center_code', 'L1')
        seedL1.set('center_name', 'Linha 1 - Laminação')
        seedL1.set('location_deposit', 'DP01 - Pátio de Matéria-Prima')
        seedL1.set(
          'description',
          'Estoque pulmão para garantir corrida térmica contínua de laminação',
        )
        seedL1.set('status', 'Ativo')
        seedL1.set('material_or_group', 'Tarugo 130x130 SAE 1020')
        seedL1.set('unit_of_measure', 't')
        seedL1.set('min_stock', 40)
        seedL1.set('ideal_stock', 100)
        seedL1.set('max_stock', 220)
        seedL1.set('max_physical_capacity', 250)
        seedL1.set('min_coverage_hours', 8)
        seedL1.set('ideal_coverage_hours', 24)
        seedL1.set('current_real_stock', 115)
        seedL1.set(
          'observation',
          'Dimensionado para proteger a Linha 1 de atrasos na aciaria/recebimento',
        )
        seedL1.set('is_deleted', false)
        app.save(seedL1)
      }
    } catch (e) {
      console.log('Seed center_lung_stocks aviso:', e)
    }
  },
  (app) => {
    try {
      if (app.hasTable('center_lung_stocks')) {
        const col = app.findCollectionByNameOrId('center_lung_stocks')
        app.delete(col)
      }
      if (app.hasTable('center_buffers')) {
        const col = app.findCollectionByNameOrId('center_buffers')
        app.delete(col)
      }
    } catch (_) {}
  },
)
