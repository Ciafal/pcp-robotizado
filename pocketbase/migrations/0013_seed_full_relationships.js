migrate(
  (app) => {
    const relCol = app.findCollectionByNameOrId('production_line_relationships')

    const additionalRelationships = [
      {
        origin_line_code: 'L1',
        target_line_code: 'ENF_L1',
        relation_type: 'Obrigatoria',
        product_code: '',
        family_code: 'TUB_RED',
        routing_condition: 'Tratamento térmico contínuo de tubulações redondas e conduítes NBR',
        priority_order: 1,
        allocation_pct: 100,
        capacity_limit_rate: 120,
        standard_lead_time_minutes: 45,
        buffer_min_tons: 35,
        buffer_max_tons: 160,
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
    ]

    for (const rel of additionalRelationships) {
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
  },
  (app) => {},
)
