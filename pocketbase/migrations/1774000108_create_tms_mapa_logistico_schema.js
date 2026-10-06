/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Coleção: sap_sales_orders (ou carteira oficial de pedidos de vendas integrados ao SAP com geolocalização e itinerário)
    if (!app.hasTable('sap_sales_orders')) {
      const salesOrders = new Collection({
        name: 'sap_sales_orders',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'sales_order', type: 'text', required: true }, // ex.: "4500981240"
          { name: 'sales_order_item', type: 'text', required: true }, // ex.: "10"
          { name: 'customer_code', type: 'text' },
          { name: 'customer_name', type: 'text', required: true },
          { name: 'city', type: 'text', required: true },
          { name: 'uf', type: 'text', required: true },
          { name: 'cep', type: 'text' },
          { name: 'latitude', type: 'number' },
          { name: 'longitude', type: 'number' },
          { name: 'has_valid_geo', type: 'bool' },
          { name: 'company_code', type: 'text' }, // "1000", "2000", "3000"
          { name: 'company_name', type: 'text' }, // CIAFAL, Sidercentro, KS
          { name: 'shipping_center_code', type: 'text' }, // "1001" (DIV), "1002" (CTG), "3001" (SDC)
          { name: 'shipping_center_name', type: 'text' },
          { name: 'origin_plant', type: 'text' }, // CIAFAL Matriz, Sidercentro SDC
          { name: 'deposit_code', type: 'text' }, // LGORT
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text' },
          { name: 'material_group', type: 'text' }, // TUBOS, PERFIS, CANTONEIRAS, BARRAS
          { name: 'quantity', type: 'number' },
          { name: 'unit', type: 'text' },
          { name: 'weight_tons', type: 'number', required: true },
          { name: 'order_value_brl', type: 'number' },
          { name: 'order_date', type: 'text' },
          { name: 'requested_delivery_date', type: 'text' },
          { name: 'planned_delivery_date', type: 'text' },
          { name: 'itinerary_code', type: 'text' }, // ex.: "015", "020"
          { name: 'itinerary_description', type: 'text' },
          { name: 'delivery_condition', type: 'text' }, // CIF, FOB
          {
            name: 'order_status',
            type: 'select',
            values: ['LIBERADO', 'BLOQUEADO', 'FATURADO', 'CANCELADO', 'EM_CARGA'],
            maxSelect: 1,
          },
          {
            name: 'credit_status',
            type: 'select',
            values: ['APROVADO', 'BLOQUEADO', 'EM_ANALISE'],
            maxSelect: 1,
          },
          { name: 'stock_available_tons', type: 'number' },
          { name: 'stock_future_tons', type: 'number' },
          { name: 'pcp_schedule_ref', type: 'text' }, // Vínculo com OP ou programação
          { name: 'pcp_production_status', type: 'text' }, // "Disponível agora", "Disponibilidade futura (PCP 2d)"
          {
            name: 'commercial_priority',
            type: 'select',
            values: ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'],
            maxSelect: 1,
          },
          { name: 'customer_restrictions', type: 'json' }, // restrições veiculares, horário, descarga
          { name: 'assigned_load_id', type: 'text' }, // Carga à qual foi vinculado
          { name: 'rfid_tag_verified', type: 'bool' }, // Validação WMS/RFID
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_sso_order ON sap_sales_orders (sales_order, sales_order_item)',
          'CREATE INDEX idx_sso_itin ON sap_sales_orders (itinerary_code)',
          'CREATE INDEX idx_sso_city ON sap_sales_orders (uf, city)',
          'CREATE INDEX idx_sso_load ON sap_sales_orders (assigned_load_id)',
        ],
      })
      app.save(salesOrders)
    }

    // 2. Coleção: sap_itinerarios (Itinerários Oficiais Cadastrados no SAP)
    if (!app.hasTable('sap_itinerarios')) {
      const itinerarios = new Collection({
        name: 'sap_itinerarios',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'code', type: 'text', required: true }, // "015", "020", "030"
          { name: 'description', type: 'text', required: true }, // "MG / Triângulo", "SP / Capital & Vale"
          { name: 'uf', type: 'text', required: true }, // "MG", "SP", "GO"
          { name: 'region', type: 'text' }, // "Sudeste", "Centro-Oeste"
          { name: 'origin_name', type: 'text', required: true }, // "CIAFAL", "Sidercentro"
          { name: 'origin_center_code', type: 'text' }, // "1001", "3001"
          { name: 'destinations_sequence', type: 'json' }, // array de strings ["Divinópolis", "Uberaba", "Uberlândia"]
          { name: 'cities_covered', type: 'json' }, // array de nomes de cidades
          { name: 'distance_km_estimated', type: 'number' },
          { name: 'transit_time_days_estimated', type: 'number' },
          { name: 'toll_cost_estimated_brl', type: 'number' },
          { name: 'default_freight_per_ton_brl', type: 'number' },
          { name: 'active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_itin_code ON sap_itinerarios (code)',
          'CREATE INDEX idx_itin_uf ON sap_itinerarios (uf)',
        ],
      })
      app.save(itinerarios)
    }

    // 3. Coleção: tms_planned_loads (Cargas do Planejador de Cargas TMS)
    if (!app.hasTable('tms_planned_loads')) {
      const plannedLoads = new Collection({
        name: 'tms_planned_loads',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'load_number', type: 'text', required: true }, // ex.: "CRG-2026-0891"
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'ROTA_SUGERIDA_IA',
              'CARGA_PLANEJADA',
              'CARGA_CONFIRMADA',
              'CARGA_EM_NEGOCIACAO',
              'TRANSPORTE_CRIADO',
              'TRANSPORTE_EM_EXECUCAO',
              'CANCELADA',
            ],
            maxSelect: 1,
          },
          { name: 'origin_plant', type: 'text', required: true }, // "CIAFAL Matriz" / "Sidercentro"
          { name: 'origin_city', type: 'text', required: true }, // "Divinópolis" / "Sete Lagoas"
          { name: 'origin_uf', type: 'text', required: true },
          { name: 'itinerary_code', type: 'text' },
          { name: 'itinerary_description', type: 'text' },
          { name: 'destinations_sequence', type: 'json' }, // array [{city, uf, client, weight_tons}]
          { name: 'destinations_summary', type: 'text' }, // "Divinópolis → Uberaba → Uberlândia"
          { name: 'total_weight_tons', type: 'number', required: true },
          { name: 'total_orders_count', type: 'number' },
          { name: 'total_customers_count', type: 'number' },
          { name: 'vehicle_type_suggested', type: 'text' }, // "Carreta Graneleira 3 eixos (32 t)", "Truck 14 t"
          { name: 'vehicle_capacity_tons', type: 'number' },
          { name: 'load_occupancy_pct', type: 'number' }, // ex.: 92%
          { name: 'carrier_name', type: 'text' }, // ex.: "Transportadora Expresso Transminas"
          { name: 'carrier_code', type: 'text' },
          { name: 'estimated_freight_cost_brl', type: 'number' },
          { name: 'estimated_toll_cost_brl', type: 'number' },
          { name: 'estimated_savings_brl', type: 'number' }, // Economia estimada pela IA
          { name: 'total_unloading_stops', type: 'number' }, // nº de descargas
          { name: 'total_distance_km', type: 'number' },
          { name: 'estimated_travel_time_hours', type: 'number' },
          { name: 'departure_planned_date', type: 'text' },
          { name: 'orders_json', type: 'json' }, // lista de {order, item, weight, client, city}
          { name: 'ai_rationale', type: 'text' }, // justificativa da IA
          { name: 'is_future_prediction', type: 'bool' }, // Carga prevista - aguardando disponibilidade PCP
          { name: 'wms_rfid_alert', type: 'text' }, // "Verificar disponibilidade física"
          { name: 'created_by_user_id', type: 'text' },
          { name: 'created_by_user_name', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_tpl_code ON tms_planned_loads (load_number)',
          'CREATE INDEX idx_tpl_status ON tms_planned_loads (status)',
          'CREATE INDEX idx_tpl_itin ON tms_planned_loads (itinerary_code)',
        ],
      })
      app.save(plannedLoads)
    }

    // 4. Coleção: tms_audit_logs (Auditoria Imutável e Rastreabilidade do Mapa e Planejador)
    if (!app.hasTable('tms_audit_logs')) {
      const auditCol = new Collection({
        name: 'tms_audit_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'user_id', type: 'text' },
          { name: 'user_name', type: 'text' },
          { name: 'user_email', type: 'text' },
          { name: 'action', type: 'text', required: true }, // "SIMULATION_CREATED", "LOAD_PROPOSED", "LOAD_MODIFIED", "AI_RECOMMENDATION_DECISION"
          { name: 'filters_applied', type: 'json' },
          { name: 'selected_orders', type: 'json' },
          { name: 'load_proposed', type: 'json' },
          { name: 'original_ai_suggestion', type: 'json' },
          { name: 'user_final_decision', type: 'json' },
          { name: 'timestamp', type: 'text', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_tms_audit_act ON tms_audit_logs (action)',
          'CREATE INDEX idx_tms_audit_time ON tms_audit_logs (timestamp)',
        ],
      })
      app.save(auditCol)
    }
  },
  (app) => {
    // Reversão segura
  },
)
