// Endpoint para exportação estruturada de Contexto da Ficha Mestre para futura IA / Motores de Otimização
// GET /backend/v1/pcp/line-master-context/{lineId}
// Requer autenticação e permissão pcp.masterdata.view

routerAdd(
  'GET',
  '/backend/v1/pcp/line-master-context/{lineId}',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação corporativa requerida' })
    }

    const lineId = e.requestInfo().pathParams.lineId
    if (!lineId) {
      return e.json(400, { error: 'ID da linha de produção não informado.' })
    }

    // 1. Carregar linha
    let line = null
    try {
      line = $app.findFirstRecordByData('production_lines', 'id', lineId)
    } catch (_) {
      return e.json(404, { error: 'Linha de produção não encontrada.' })
    }

    // 2. Carregar versão ativa da Ficha Mestre
    let activeMaster = null
    try {
      const masters = $app.findRecordsByFilter(
        'line_masters',
        `line_id = '${lineId}' && status = 'ACTIVE'`,
        '-version',
        1,
        0,
      )
      if (masters.length > 0) {
        activeMaster = masters[0]
      }
    } catch (_) {}

    // 3. Carregar Turnos
    let shifts = []
    try {
      shifts = $app.findRecordsByFilter(
        'production_shifts',
        `line_id = '${lineId}' && active = true`,
        'start_time',
        20,
        0,
      )
    } catch (_) {}

    // 4. Carregar Calendário
    let calendar = null
    try {
      const cals = $app.findRecordsByFilter(
        'production_calendars',
        `line_id = '${lineId}' && active = true`,
        '-year',
        1,
        0,
      )
      if (cals.length > 0) {
        calendar = cals[0]
      }
    } catch (_) {}

    // 5. Carregar Capabilities
    let capabilities = []
    try {
      capabilities = $app.findRecordsByFilter(
        'line_capabilities',
        `line_id = '${lineId}' && active = true`,
        'created',
        50,
        0,
      )
    } catch (_) {}

    // 6. Carregar Setups
    let setups = []
    try {
      setups = $app.findRecordsByFilter(
        'line_setups',
        `line_id = '${lineId}' && active = true`,
        'code',
        50,
        0,
      )
    } catch (_) {}

    // 7. Carregar Restrições Estruturais
    let structuralConstraints = []
    try {
      structuralConstraints = $app.findRecordsByFilter(
        'line_structural_constraints',
        `line_id = '${lineId}' && active = true`,
        'code',
        50,
        0,
      )
    } catch (_) {}

    // 8. Carregar Paradas Programadas Padrão (Sem extraordinárias)
    let scheduledStops = []
    try {
      scheduledStops = $app.findRecordsByFilter(
        'standard_scheduled_stops',
        `line_id = '${lineId}' && active = true`,
        'scheduled_time',
        50,
        0,
      )
    } catch (_) {}

    // 9. Referências a Rule Packs
    let rulePackRefs = []
    try {
      rulePackRefs = $app.findRecordsByFilter(
        'line_rule_pack_refs',
        `line_id = '${lineId}'`,
        'rule_pack_code',
        20,
        0,
      )
    } catch (_) {}

    // DTO Estruturado para o Futuro Motor / IA
    const contextDTO = {
      metadata: {
        generated_at: new Date().toISOString(),
        system: 'HUB CIAFAL - PCP ROBOTIZADO',
        source: 'Ficha Mestre das Linhas (Prompt 03)',
        version: activeMaster ? activeMaster.get('version') : null,
        ready_for_scheduling: activeMaster ? activeMaster.get('ready_for_scheduling') : false,
        completeness_score: activeMaster ? activeMaster.get('completeness_score') : 0,
        extraordinary_stops_source: 'SAP ZPP003 (Futuro / Histórico)',
      },
      production_line: {
        id: line.id,
        code: line.getString('code'),
        name: line.getString('name'),
        status: line.getString('status'),
        current_rate: line.get('current_rate'),
        efficiency: line.get('efficiency'),
      },
      line_master: activeMaster
        ? {
            id: activeMaster.id,
            version: activeMaster.get('version'),
            status: activeMaster.getString('status'),
            resource_type: activeMaster.getString('resource_type'),
            unit: activeMaster.getString('unit'),
            sap_plant_code: activeMaster.getString('sap_plant_code'),
            sector: activeMaster.getString('sector'),
            process_step: activeMaster.getString('process_step'),
            capacity: {
              unit: activeMaster.getString('capacity_unit'),
              hourly: activeMaster.get('nominal_hourly_capacity'),
              shift: activeMaster.get('nominal_shift_capacity'),
              daily: activeMaster.get('nominal_daily_capacity'),
              monthly: activeMaster.get('nominal_monthly_capacity'),
              planned_efficiency_pct: activeMaster.get('planned_efficiency_pct'),
              max_recommended_utilization_pct: activeMaster.get('max_recommended_utilization_pct'),
              batch_range: {
                min: activeMaster.get('min_batch_size'),
                max: activeMaster.get('max_batch_size'),
              },
            },
            buffer: {
              input: {
                type: activeMaster.getString('input_buffer_type'),
                capacity: activeMaster.get('input_buffer_capacity'),
                unit: activeMaster.getString('input_buffer_unit'),
              },
              output: {
                type: activeMaster.getString('output_buffer_type'),
                capacity: activeMaster.get('output_buffer_capacity'),
                unit: activeMaster.getString('output_buffer_unit'),
              },
            },
          }
        : null,
      shifts: shifts.map((s) => ({
        code: s.getString('code'),
        name: s.getString('name'),
        start_time: s.getString('start_time'),
        end_time: s.getString('end_time'),
        duration_hours: s.get('duration_hours'),
        break_minutes: s.get('break_minutes'),
        applicable_days: s.get('applicable_days'),
        crosses_midnight: s.get('crosses_midnight'),
      })),
      calendar: calendar
        ? {
            year: calendar.get('year'),
            month: calendar.get('month'),
            operating_days: calendar.get('operating_days_count'),
            work_saturdays: calendar.get('work_saturdays'),
            work_sundays: calendar.get('work_sundays'),
            work_holidays: calendar.get('work_holidays'),
            holidays: calendar.get('holidays_dates'),
          }
        : null,
      capabilities: capabilities.map((c) => ({
        id: c.id,
        product_family_id: c.getString('product_family_id'),
        product_type: c.getString('product_type'),
        status: c.getString('status'),
        dimensions: {
          dim_min: c.get('min_dimension_mm'),
          dim_max: c.get('max_dimension_mm'),
          thickness_min: c.get('min_thickness_mm'),
          thickness_max: c.get('max_thickness_mm'),
          length_min: c.get('min_length_mm'),
          length_max: c.get('max_length_mm'),
          weight_min: c.get('min_weight_kg'),
          weight_max: c.get('max_weight_kg'),
        },
        specific_capacity: c.get('specific_capacity'),
      })),
      setups: setups.map((st) => ({
        code: st.getString('code'),
        description: st.getString('description'),
        category: st.getString('category'),
        standard_duration_minutes: st.get('standard_duration_minutes'),
        affected_resource: st.getString('affected_resource'),
        setup_type: st.getString('setup_type'),
      })),
      structural_constraints: structuralConstraints.map((sc) => ({
        code: sc.getString('code'),
        title: sc.getString('title'),
        classification: sc.getString('classification'),
        parameter: sc.getString('parameter_name'),
        unit: sc.getString('unit'),
        min_value: sc.get('min_value'),
        max_value: sc.get('max_value'),
        description: sc.getString('description'),
        impact: sc.getString('impact'),
      })),
      standard_scheduled_stops: scheduledStops.map((ss) => ({
        code: ss.getString('code'),
        description: ss.getString('description'),
        category: ss.getString('category'),
        recurrence: ss.getString('recurrence'),
        duration_minutes: ss.get('expected_duration_minutes'),
        scheduled_time: ss.getString('scheduled_time'),
        applicable_shift: ss.getString('applicable_shift'),
        impact: ss.getString('impact'),
      })),
      rule_pack_references: rulePackRefs.map((rp) => ({
        code: rp.getString('rule_pack_code'),
        name: rp.getString('rule_pack_name'),
        version: rp.getString('version'),
        status: rp.getString('status'),
      })),
    }

    return e.json(200, contextDTO)
  },
  $apis.requireAuth(),
)
