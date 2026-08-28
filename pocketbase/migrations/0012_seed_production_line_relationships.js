migrate(
  (app) => {
    const relCol = app.findCollectionByNameOrId('production_line_relationships')

    // Seed de relações produtivas N:N industriais CIAFAL
    const initialRelationships = [
      {
        origin_line_code: 'L1',
        target_line_code: 'ENF_L1',
        relation_type: 'Obrigatoria',
        product_code: '',
        family_code: 'TUB_QUAD',
        routing_condition: 'Fluxo padrão de normalização para perfis tubulares quadrados',
        priority_order: 1,
        allocation_pct: 100,
        capacity_limit_rate: 120,
        standard_lead_time_minutes: 45,
        buffer_min_tons: 40,
        buffer_max_tons: 180,
        valid_from: '2026-01-01',
        valid_until: '2027-12-31',
        status: 'ATIVA',
      },
      {
        origin_line_code: 'L1',
        target_line_code: 'ENF_L1',
        relation_type: 'Obrigatoria',
        product_code: '',
        family_code: 'TUB_RET',
        routing_condition: 'Tratamento térmico de alívio de tensões após conformação e solda',
        priority_order: 1,
        allocation_pct: 100,
        capacity_limit_rate: 120,
        standard_lead_time_minutes: 45,
        buffer_min_tons: 30,
        buffer_max_tons: 150,
        valid_from: '2026-01-01',
        valid_until: '2027-12-31',
        status: 'ATIVA',
      },
      {
        origin_line_code: 'L1',
        target_line_code: 'RETRAB',
        relation_type: 'Condicional',
        product_code: 'TUBO_50X50_ESP',
        family_code: 'TUB_QUAD',
        routing_condition:
          'Desvio para retrabalho dimensional se espessura de parede fora de tolerância',
        priority_order: 3,
        allocation_pct: 15,
        capacity_limit_rate: 40,
        standard_lead_time_minutes: 90,
        buffer_min_tons: 10,
        buffer_max_tons: 60,
        valid_from: '2026-01-01',
        valid_until: '2027-12-31',
        status: 'ATIVA',
      },
      {
        origin_line_code: 'ENF_L1',
        target_line_code: 'ENDIR',
        relation_type: 'Preferencial',
        product_code: '',
        family_code: 'BAR_CHATA',
        routing_condition: 'Desempeno de retilineidade para barras chatas após tratamento térmico',
        priority_order: 1,
        allocation_pct: 80,
        capacity_limit_rate: 80,
        standard_lead_time_minutes: 30,
        buffer_min_tons: 20,
        buffer_max_tons: 90,
        valid_from: '2026-01-01',
        valid_until: '2027-12-31',
        status: 'ATIVA',
      },
      {
        origin_line_code: 'L2',
        target_line_code: 'ACAB_L2',
        relation_type: 'Obrigatoria',
        product_code: '',
        family_code: 'PERF_U',
        routing_condition: 'Corte no comprimento comercial, furação e cintamento automático',
        priority_order: 1,
        allocation_pct: 100,
        capacity_limit_rate: 150,
        standard_lead_time_minutes: 30,
        buffer_min_tons: 50,
        buffer_max_tons: 250,
        valid_from: '2026-01-01',
        valid_until: '2027-12-31',
        status: 'ATIVA',
      },
      {
        origin_line_code: 'L2',
        target_line_code: 'ENDIR',
        relation_type: 'Alternativa',
        product_code: '',
        family_code: 'PERF_U',
        routing_condition:
          'Rota alternativa de desempeno se Acabamento L2 saturado (> 88% ocupação)',
        priority_order: 2,
        allocation_pct: 35,
        capacity_limit_rate: 80,
        standard_lead_time_minutes: 60,
        buffer_min_tons: 15,
        buffer_max_tons: 80,
        valid_from: '2026-01-01',
        valid_until: '2027-12-31',
        status: 'ATIVA',
      },
      {
        origin_line_code: 'ENDIR',
        target_line_code: 'ACAB_L2',
        relation_type: 'Preferencial',
        product_code: '',
        family_code: '',
        routing_condition:
          'Reintegração na esteira de embalagem final e liberação para expedição WMS',
        priority_order: 1,
        allocation_pct: 100,
        capacity_limit_rate: 150,
        standard_lead_time_minutes: 25,
        buffer_min_tons: 20,
        buffer_max_tons: 100,
        valid_from: '2026-01-01',
        valid_until: '2027-12-31',
        status: 'ATIVA',
      },
      {
        origin_line_code: 'RETRAB',
        target_line_code: 'ACAB_L2',
        relation_type: 'Retrabalho',
        product_code: '',
        family_code: '',
        routing_condition: 'Reinspeção de qualidade e reembalagem de material recuperado',
        priority_order: 2,
        allocation_pct: 100,
        capacity_limit_rate: 40,
        standard_lead_time_minutes: 120,
        buffer_min_tons: 5,
        buffer_max_tons: 40,
        valid_from: '2026-01-01',
        valid_until: '2027-12-31',
        status: 'ATIVA',
      },
    ]

    for (const rel of initialRelationships) {
      try {
        const existing = app.findFirstRecordByData(
          'production_line_relationships',
          'origin_line_code',
          rel.origin_line_code,
        )
        // Se já existe com mesmo origin e target, pula
      } catch (_) {
        const record = new Record(relCol)
        record.set('origin_line_code', rel.origin_line_code)
        record.set('target_line_code', rel.target_line_code)
        record.set('relation_type', rel.relation_type)
        record.set('product_code', rel.product_code)
        record.set('family_code', rel.family_code)
        record.set('routing_condition', rel.routing_condition)
        record.set('priority_order', rel.priority_order)
        record.set('allocation_pct', rel.allocation_pct)
        record.set('capacity_limit_rate', rel.capacity_limit_rate)
        record.set('standard_lead_time_minutes', rel.standard_lead_time_minutes)
        record.set('buffer_min_tons', rel.buffer_min_tons)
        record.set('buffer_max_tons', rel.buffer_max_tons)
        record.set('valid_from', rel.valid_from)
        record.set('valid_until', rel.valid_until)
        record.set('status', rel.status)
        app.save(record)
      }
    }
  },
  (app) => {
    // Revert
    try {
      const records = app.findRecordsByFilter('production_line_relationships', 'status = "ATIVA"')
      for (const r of records) {
        app.delete(r)
      }
    } catch (_) {}
  },
)
