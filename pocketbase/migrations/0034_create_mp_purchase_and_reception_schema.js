migrate(
  (app) => {
    // 1. mp_purchase_orders (Pedidos de Compra SAP ECC ME23N / ME2M)
    let mpPoCol
    try {
      mpPoCol = app.findCollectionByNameOrId('mp_purchase_orders')
    } catch (_) {
      mpPoCol = new Collection({
        name: 'mp_purchase_orders',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'po_number', type: 'text', required: true },
          { name: 'po_item', type: 'text', required: true },
          { name: 'supplier_code', type: 'text', required: true },
          { name: 'supplier_name', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text' },
          { name: 'steel_grade', type: 'text', required: true },
          { name: 'ordered_qty', type: 'number' },
          { name: 'ordered_weight_kg', type: 'number', required: true },
          { name: 'center_code', type: 'text', required: true },
          { name: 'storage_location', type: 'text' },
          { name: 'order_date', type: 'date', required: true },
          { name: 'delivery_date_contracted', type: 'date', required: true },
          { name: 'delivery_date_updated', type: 'date' },
          { name: 'received_qty', type: 'number' },
          { name: 'received_weight_kg', type: 'number' },
          { name: 'pending_weight_kg', type: 'number' },
          {
            name: 'po_status',
            type: 'select',
            values: [
              'ABERTO',
              'PARCIALMENTE_RECEBIDO',
              'CONCLUIDO',
              'ATRASADO',
              'BLOQUEADO',
              'CANCELADO',
            ],
          },
          { name: 'is_delayed', type: 'bool' },
          { name: 'delay_days', type: 'number' },
          { name: 'contracted_thickness_mm', type: 'number' },
          { name: 'contracted_width_mm', type: 'number' },
          { name: 'contracted_length_mm', type: 'number' },
          { name: 'contracted_diameter_mm', type: 'number' },
          { name: 'contracted_dimensions_text', type: 'text' },
          { name: 'target_application', type: 'text' },
          { name: 'target_production_lines_json', type: 'json' },
          {
            name: 'risk_rupture_level',
            type: 'select',
            values: ['BAIXO', 'MEDIO', 'ALTO', 'CRITICO'],
          },
          { name: 'sap_sync_timestamp', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_po_num_item ON mp_purchase_orders (po_number, po_item)',
          'CREATE INDEX idx_mp_po_status ON mp_purchase_orders (po_status, is_delayed)',
          'CREATE INDEX idx_mp_po_delivery ON mp_purchase_orders (delivery_date_contracted, delivery_date_updated)',
          'CREATE INDEX idx_mp_po_mat ON mp_purchase_orders (material_code, steel_grade, center_code)',
        ],
      })
      app.save(mpPoCol)
    }

    // 2. mp_future_receptions (Recebimentos Futuros nos Horizontes Hoje/7/15/30/60/90 Dias)
    let mpFutRecCol
    try {
      mpFutRecCol = app.findCollectionByNameOrId('mp_future_receptions')
    } catch (_) {
      mpFutRecCol = new Collection({
        name: 'mp_future_receptions',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'reception_code', type: 'text', required: true },
          { name: 'po_number', type: 'text', required: true },
          { name: 'po_item', type: 'text' },
          { name: 'supplier_name', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text' },
          { name: 'steel_grade', type: 'text', required: true },
          { name: 'dimensions_text', type: 'text' },
          { name: 'expected_tons', type: 'number', required: true },
          { name: 'expected_date', type: 'date', required: true },
          {
            name: 'horizon_category',
            type: 'select',
            values: ['HOJE', '7_DIAS', '15_DIAS', '30_DIAS', '60_DIAS', '90_DIAS'],
          },
          { name: 'target_application', type: 'text' },
          { name: 'target_lines_json', type: 'json' },
          {
            name: 'risk_delay_level',
            type: 'select',
            values: ['BAIXO', 'MEDIO', 'ALTO', 'CRITICO'],
          },
          { name: 'risk_delay_reason', type: 'text' },
          { name: 'covers_critical_demand', type: 'bool' },
          { name: 'critical_order_ref', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_fut_code ON mp_future_receptions (reception_code)',
          'CREATE INDEX idx_mp_fut_horizon ON mp_future_receptions (horizon_category, expected_date)',
          'CREATE INDEX idx_mp_fut_po ON mp_future_receptions (po_number, steel_grade)',
        ],
      })
      app.save(mpFutRecCol)
    }

    // 3. mp_future_inventory_projection (ESTOQUE FUTURO = ATUAL + PEDIDOS + RECEBIMENTOS - CONSUMO)
    let mpFutInvCol
    try {
      mpFutInvCol = app.findCollectionByNameOrId('mp_future_inventory_projection')
    } catch (_) {
      mpFutInvCol = new Collection({
        name: 'mp_future_inventory_projection',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'projection_code', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text' },
          { name: 'steel_grade', type: 'text', required: true },
          { name: 'center_code', type: 'text', required: true },
          { name: 'storage_location', type: 'text' },
          { name: 'application_target', type: 'text' },
          { name: 'line_target', type: 'text' },
          { name: 'supplier_code', type: 'text' },
          {
            name: 'horizon_category',
            type: 'select',
            values: ['HOJE', '7_DIAS', '15_DIAS', '30_DIAS', '60_DIAS', '90_DIAS'],
          },
          { name: 'current_stock_tons', type: 'number' },
          { name: 'confirmed_po_tons', type: 'number' },
          { name: 'future_receptions_tons', type: 'number' },
          { name: 'scheduled_consumption_tons', type: 'number' },
          { name: 'projected_future_stock_tons', type: 'number', required: true },
          { name: 'coverage_days', type: 'number' },
          {
            name: 'balance_status',
            type: 'select',
            values: ['NORMAL', 'CRITICO_RUPTURA', 'EXCESSO_ESTOQUE', 'RECEBIMENTO_ATRASADO'],
          },
          { name: 'alerts_json', type: 'json' },
          { name: 'calculated_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_futinv_code ON mp_future_inventory_projection (projection_code)',
          'CREATE INDEX idx_mp_futinv_mat_hor ON mp_future_inventory_projection (material_code, steel_grade, horizon_category)',
          'CREATE INDEX idx_mp_futinv_status ON mp_future_inventory_projection (balance_status)',
        ],
      })
      app.save(mpFutInvCol)
    }

    // 4. Inserir Permissões RBAC para o Submódulo de Gestão de MP na coleção pcp_permissions
    try {
      const permCol = app.findCollectionByNameOrId('pcp_permissions')
      const permissionsToAdd = [
        {
          key: 'pcp.mp_orders.view',
          name: 'Visualizar Pedidos e Recebimento de MP',
          category: 'MATERIA_PRIMA',
          module: 'MP_MANAGEMENT',
          action: 'VIEW_PURCHASE_RECEIPT',
          description: 'Visualizar pedidos de compra SAP ME23N, previsões e recebimentos de MP',
        },
        {
          key: 'pcp.mp_cutting.view',
          name: 'Visualizar Planos de Corte de MP',
          category: 'MATERIA_PRIMA',
          module: 'MP_MANAGEMENT',
          action: 'VIEW_CUTTING_PLANS',
          description: 'Visualizar e criar planos inteligentes de corte e comparar cenários',
        },
        {
          key: 'pcp.mp_optimize.view',
          name: 'Otimizar Aplicações de MP',
          category: 'MATERIA_PRIMA',
          module: 'MP_MANAGEMENT',
          action: 'OPTIMIZE_APPLICATIONS',
          description: 'Acessar ZPP86, ZPP88, matriz de reaplicação e migração dimensional',
        },
        {
          key: 'pcp.mp_reservations.manage',
          name: 'Efetivar Reservas Inteligentes de MP',
          category: 'MATERIA_PRIMA',
          module: 'MP_MANAGEMENT',
          action: 'COMMIT_RESERVATIONS',
          description: 'Aprovar e efetivar reservas inteligentes de placas e blocos no SAP',
        },
      ]

      for (const p of permissionsToAdd) {
        try {
          app.findFirstRecordByData('pcp_permissions', 'key', p.key)
        } catch (_) {
          const record = new Record(permCol)
          record.set('key', p.key)
          record.set('name', p.name)
          record.set('category', p.category)
          record.set('module', p.module)
          record.set('action', p.action)
          record.set('description', p.description)
          record.set('is_active', true)
          app.save(record)
        }
      }
    } catch (err) {
      console.log('pcp_permissions table not found or skipped:', err)
    }
  },
  (app) => {
    try {
      const c1 = app.findCollectionByNameOrId('mp_future_inventory_projection')
      app.delete(c1)
    } catch (_) {}
    try {
      const c2 = app.findCollectionByNameOrId('mp_future_receptions')
      app.delete(c2)
    } catch (_) {}
    try {
      const c3 = app.findCollectionByNameOrId('mp_purchase_orders')
      app.delete(c3)
    } catch (_) {}
  },
)
