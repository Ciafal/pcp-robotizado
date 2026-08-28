migrate(
  (app) => {
    const routesCol = app.findCollectionByNameOrId('production_routes')
    const nodesCol = app.findCollectionByNameOrId('production_route_nodes')
    const edgesCol = app.findCollectionByNameOrId('production_route_edges')
    const capCol = app.findCollectionByNameOrId('production_capacity_logs')
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const usersCol = app.findCollectionByNameOrId('users')
    const approvCol = app.findCollectionByNameOrId('line_double_approvals')

    const adminUser = app.findAuthRecordByEmail('users', 'ciafal@ciafal.com.br')
    const progUser = app.findAuthRecordByEmail('users', 'programador.pcp@ciafal.com.br')
    const gestorL1 = app.findAuthRecordByEmail('users', 'gestor.l1@ciafal.com.br')
    const gestorL2 = app.findAuthRecordByEmail('users', 'gestor.l2@ciafal.com.br')

    const lines = app.findRecordsByFilter('production_lines', '', 'code', 20, 0)
    const lineMap = {}
    for (const l of lines) {
      lineMap[l.getString('code')] = l
    }

    // 1. Rota 1: ROTA_TUB_PADRAO (L1 -> ENF_L1 -> L2 -> ACAB_L1) - APPROVED V1
    let r1
    try {
      r1 = app.findFirstRecordByData('production_routes', 'code', 'ROUT_TUB_STD_V1')
    } catch (_) {
      r1 = new Record(routesCol)
      r1.set('code', 'ROUT_TUB_STD_V1')
      r1.set('description', 'Rota Padrão N:N — Tubos Estruturais e Quadrados 50x50')
      r1.set('product_code', 'TUB_50X50')
      r1.set('family_code', 'TUB_QUAD')
      r1.set('version', 1)
      r1.set('status', 'APPROVED')
      r1.set('active', true)
      r1.set('preferred', true)
      r1.set('author_id', adminUser.id)
      r1.set('author_name', 'Administrador PCP')
      r1.set('change_reason', 'Rota base homologada de laminação e conformação contínua')
      app.save(r1)

      // Nodes
      const nData1 = [
        {
          code: 'L1',
          order: 1,
          proc: 'Laminação a Quente e Conformação Inicial',
          rate: 120,
          unit: 't/h',
          inMin: 50,
          inMax: 400,
          outMin: 20,
          outMax: 180,
        },
        {
          code: 'ENF_L1',
          order: 2,
          proc: 'Tratamento Térmico de Alívio (Forno)',
          rate: 120,
          unit: 't/h',
          inMin: 20,
          inMax: 180,
          outMin: 15,
          outMax: 120,
        },
        {
          code: 'L2',
          order: 3,
          proc: 'Calibração Dimensional e Soldagem RF',
          rate: 95,
          unit: 't/h',
          inMin: 15,
          inMax: 120,
          outMin: 10,
          outMax: 100,
        },
        {
          code: 'ACAB_L1',
          order: 4,
          proc: 'Célula de Acabamento, Corte e Embalagem',
          rate: 110,
          unit: 't/h',
          inMin: 10,
          inMax: 100,
          outMin: 5,
          outMax: 80,
        },
      ]
      for (const nd of nData1) {
        if (lineMap[nd.code]) {
          const nr = new Record(nodesCol)
          nr.set('route_id', r1.id)
          nr.set('line_id', lineMap[nd.code].id)
          nr.set('line_code', nd.code)
          nr.set('process_name', nd.proc)
          nr.set('logical_order', nd.order)
          nr.set('nominal_rate', nd.rate)
          nr.set('capacity_unit', nd.unit)
          nr.set('input_buffer_min', nd.inMin)
          nr.set('input_buffer_max', nd.inMax)
          nr.set('output_buffer_min', nd.outMin)
          nr.set('output_buffer_max', nd.outMax)
          app.save(nr)
        }
      }

      // Edges (1:N, N:1, Alternativas)
      const eData1 = [
        {
          orig: 'L1',
          dest: 'ENF_L1',
          type: 'MANDATORY',
          prio: 1,
          mand: true,
          lt: 30,
          bMin: 20,
          bMax: 180,
          bTgt: 90,
          bPhys: 'BUFFER_OPERACIONAL',
          bUnit: 't',
          cur: 75,
          proj: 82,
          cond: 'Fluxo contínuo padrão',
        },
        {
          orig: 'ENF_L1',
          dest: 'L2',
          type: 'MANDATORY',
          prio: 1,
          mand: true,
          lt: 25,
          bMin: 15,
          bMax: 120,
          bTgt: 60,
          bPhys: 'BUFFER_FISICO',
          bUnit: 't',
          cur: 50,
          proj: 55,
          cond: 'Resfriamento controlado mínimo 25 min',
        },
        {
          orig: 'L2',
          dest: 'ACAB_L1',
          type: 'MANDATORY',
          prio: 1,
          mand: true,
          lt: 15,
          bMin: 10,
          bMax: 100,
          bTgt: 45,
          bPhys: 'BUFFER_SEGURANCA',
          bUnit: 't',
          cur: 38,
          proj: 40,
          cond: 'Inspeção dimensional por ultrassom',
        },
        {
          orig: 'L2',
          dest: 'ENDIR',
          type: 'ALTERNATIVE',
          prio: 2,
          mand: false,
          lt: 35,
          bMin: 10,
          bMax: 80,
          bTgt: 30,
          bPhys: 'BUFFER_OPERACIONAL',
          bUnit: 't',
          cur: 15,
          proj: 20,
          cond: 'Bypass para Endireitadeira em caso de tolerância h9',
        },
      ]
      for (const ed of eData1) {
        const er = new Record(edgesCol)
        er.set('route_id', r1.id)
        er.set('origin_line_code', ed.orig)
        er.set('target_line_code', ed.dest)
        er.set('relation_type', ed.type)
        er.set('priority', ed.prio)
        er.set('is_precedence_mandatory', ed.mand)
        er.set('lead_time_minutes', ed.lt)
        er.set('buffer_min_tons', ed.bMin)
        er.set('buffer_max_tons', ed.bMax)
        er.set('buffer_target_tons', ed.bTgt)
        er.set('buffer_physical_type', ed.bPhys)
        er.set('buffer_unit', ed.bUnit)
        er.set('current_buffer_stock', ed.cur)
        er.set('projected_buffer_stock', ed.proj)
        er.set('condition_expression', ed.cond)
        er.set('status', 'APPROVED')
        app.save(er)
      }
    }

    // 2. Rota 2: ROTA_TUB_PERF_U (L1 + L2 -> ENDIR -> ACAB_L2) - PENDING_APPROVAL V2 (Para teste de Aprovação Dupla)
    let r2
    try {
      r2 = app.findFirstRecordByData('production_routes', 'code', 'ROUT_PERF_U_V2')
    } catch (_) {
      r2 = new Record(routesCol)
      r2.set('code', 'ROUT_PERF_U_V2')
      r2.set('description', 'Rota N:1 & N:N — Perfis U e Cantoneiras Especiais')
      r2.set('product_code', 'PERF_U_100')
      r2.set('family_code', 'PERF_U')
      r2.set('version', 2)
      r2.set('status', 'PENDING_APPROVAL')
      r2.set('active', false)
      r2.set('preferred', false)
      r2.set('author_id', progUser.id)
      r2.set('author_name', 'Lucas Ferreira (PCP)')
      r2.set(
        'change_reason',
        'Inclusão de rota paralela L1+L2 alimentando a Endireitadeira para ganho de cadência',
      )
      app.save(r2)

      // Edges pendentes
      const eData2 = [
        {
          orig: 'L1',
          dest: 'ENDIR',
          type: 'PARALLEL',
          prio: 1,
          mand: true,
          lt: 40,
          bMin: 20,
          bMax: 150,
          bTgt: 70,
          bPhys: 'BUFFER_OPERACIONAL',
          bUnit: 't',
          cur: 30,
          proj: 40,
          cond: 'Lote prioritário Perfis U',
        },
        {
          orig: 'L2',
          dest: 'ENDIR',
          type: 'PARALLEL',
          prio: 1,
          mand: true,
          lt: 40,
          bMin: 15,
          bMax: 100,
          bTgt: 50,
          bPhys: 'BUFFER_OPERACIONAL',
          bUnit: 't',
          cur: 25,
          proj: 35,
          cond: 'Alimentação convergente N:1',
        },
        {
          orig: 'ENDIR',
          dest: 'RETRAB',
          type: 'CONDITIONAL',
          prio: 3,
          mand: false,
          lt: 60,
          bMin: 5,
          bMax: 60,
          bTgt: 20,
          bPhys: 'BUFFER_SEGURANCA',
          bUnit: 't',
          cur: 4,
          proj: 8,
          cond: 'Desvio para retrabalho se retilinidade > 1.5mm/m',
        },
      ]
      for (const ed of eData2) {
        const er = new Record(edgesCol)
        er.set('route_id', r2.id)
        er.set('origin_line_code', ed.orig)
        er.set('target_line_code', ed.dest)
        er.set('relation_type', ed.type)
        er.set('priority', ed.prio)
        er.set('is_precedence_mandatory', ed.mand)
        er.set('lead_time_minutes', ed.lt)
        er.set('buffer_min_tons', ed.bMin)
        er.set('buffer_max_tons', ed.bMax)
        er.set('buffer_target_tons', ed.bTgt)
        er.set('buffer_physical_type', ed.bPhys)
        er.set('buffer_unit', ed.bUnit)
        er.set('current_buffer_stock', ed.cur)
        er.set('projected_buffer_stock', ed.proj)
        er.set('condition_expression', ed.cond)
        er.set('status', 'PENDING_APPROVAL')
        app.save(er)
      }

      // Criar item de aprovação dupla no line_double_approvals
      const appRec = new Record(approvCol)
      appRec.set('entity_type', 'PRODUCTION_ROUTE')
      appRec.set('entity_id', r2.id)
      appRec.set('line_code', 'L1 -> ENDIR (N:N)')
      appRec.set('version', 'V2')
      appRec.set(
        'change_reason',
        'Alteração de rota estrutural: Adição de fluxo paralelo L1/L2 para Endireitadeira',
      )
      appRec.set('status', 'PENDING_PCP')
      app.save(appRec)
    }

    // 3. Seed dos 4 Conceitos de Capacidade por Linha e Período (SHIFT, DAY, WEEK, MONTH)
    const capSeed = [
      {
        line: 'L1',
        period: 'DAY',
        ref: '2025-05-10',
        unit: 't/h',
        nominal: 120,
        stops_plan: 8,
        setup_plan: 6,
        cal_plan: 2,
        other_plan: 0,
        prog: 104,
        stops_unplan: 4,
        setup_unplan: 3,
        maint: 2,
        mat: 1,
        qual: 2,
        bottle: 3,
        op: 1,
        other_exec: 0,
        real: 88,
        lost: 32,
        util: 84.6,
        eff: 88.0,
        risk: 'MEDIUM',
        source: 'ESTIMATED_MOCK',
      },
      {
        line: 'ENF_L1',
        period: 'DAY',
        ref: '2025-05-10',
        unit: 't/h',
        nominal: 120,
        stops_plan: 10,
        setup_plan: 4,
        cal_plan: 2,
        other_plan: 0,
        prog: 104,
        stops_unplan: 8,
        setup_unplan: 2,
        maint: 6,
        mat: 0,
        qual: 1,
        bottle: 9,
        op: 2,
        other_exec: 0,
        real: 76,
        lost: 44,
        util: 73.0,
        eff: 80.5,
        risk: 'HIGH',
        source: 'ESTIMATED_MOCK',
      },
      {
        line: 'L2',
        period: 'DAY',
        ref: '2025-05-10',
        unit: 't/h',
        nominal: 95,
        stops_plan: 5,
        setup_plan: 8,
        cal_plan: 2,
        other_plan: 0,
        prog: 80,
        stops_unplan: 2,
        setup_unplan: 2,
        maint: 1,
        mat: 2,
        qual: 1,
        bottle: 1,
        op: 1,
        other_exec: 0,
        real: 70,
        lost: 25,
        util: 87.5,
        eff: 91.0,
        risk: 'LOW',
        source: 'ESTIMATED_MOCK',
      },
    ]

    for (const cs of capSeed) {
      if (lineMap[cs.line]) {
        try {
          const existing = app.findRecordsByFilter(
            'production_capacity_logs',
            `line_code = '${cs.line}' && period_type = '${cs.period}' && period_ref = '${cs.ref}'`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const cr = new Record(capCol)
            cr.set('line_id', lineMap[cs.line].id)
            cr.set('line_code', cs.line)
            cr.set('period_type', cs.period)
            cr.set('period_ref', cs.ref)
            cr.set('unit', cs.unit)
            cr.set('nominal_capacity', cs.nominal)
            cr.set('planned_stops_loss', cs.stops_plan)
            cr.set('planned_setup_loss', cs.setup_plan)
            cr.set('planned_calendar_loss', cs.cal_plan)
            cr.set('other_planned_loss', cs.other_plan)
            cr.set('programmable_capacity', cs.prog)
            cr.set('unplanned_stops_loss', cs.stops_unplan)
            cr.set('unplanned_setup_loss', cs.setup_unplan)
            cr.set('maintenance_loss', cs.maint)
            cr.set('material_shortage_loss', cs.mat)
            cr.set('quality_defect_loss', cs.qual)
            cr.set('bottleneck_loss', cs.bottle)
            cr.set('operational_loss', cs.op)
            cr.set('other_execution_loss', cs.other_exec)
            cr.set('realized_capacity', cs.real)
            cr.set('total_lost_capacity', cs.lost)
            cr.set('utilization_pct', cs.util)
            cr.set('efficiency_pct', cs.eff)
            cr.set('bottleneck_risk', cs.risk)
            cr.set('data_source', cs.source)
            app.save(cr)
          }
        } catch (_) {}
      }
    }
  },
  (app) => {},
)
