/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const ordersCol = app.findCollectionByNameOrId('pcp_production_orders')
    const postingsCol = app.findCollectionByNameOrId('pcp_production_postings')
    const pendenciesCol = app.findCollectionByNameOrId('pcp_closing_pendencies')
    const stopsCol = app.findCollectionByNameOrId('pcp_production_stops')

    // 1. Ordens de Produção Homologadas
    const seedOrders = [
      {
        op_number: '4500012342',
        empresa_code: 'CIAFAL',
        centro_code: 'SEML1',
        linha_code: 'L1',
        work_center: 'SEML1',
        material_code: 'TUB-IND-5050',
        material_description: 'Tubo Industrial Quadrado 50x50x2,00 mm',
        family_code: 'TUBOS_ESTRUTURAIS',
        steel_grade: 'SAE 1012',
        gauge_dimension: '50x50 mm',
        product_name: 'Tubo Industrial Quadrado',
        mrp_planner: 'PCP Laminação',
        programming_type: 'Laminação',
        quantity_planned_tons: 140.0,
        quantity_produced_tons: 114.24,
        quantity_posted_tons: 110.0,
        quantity_sap_tons: 110.0,
        balance_tons: 25.76,
        yield_planned_pct: 94.0,
        yield_realized_pct: 91.5,
        planned_start_date: '2026-09-20 06:00',
        planned_end_date: '2026-09-20 18:00',
        real_start_date: '2026-09-20 06:15',
        real_end_date: '',
        status_op: 'EM_PRODUCAO',
        status_mes: 'EM_EXECUCAO',
        status_sap: 'CONFIRMADA_PARCIAL',
        status_fechamento: 'PENDENTE_DE_FECHAMENTO',
        visual_status: 'CRITICO',
        ai_risk_score: 'CRITICO',
        ai_risk_reason: 'Produção 18,4% abaixo do previsto no ritmo horário da linha L1.',
        has_pendency: true,
        has_deviation: true,
        deviation_reason:
          'Produção 18,4% abaixo do previsto por instabilidade no forno de reaquecimento',
        last_posting_at: '2026-09-20 16:30',
        operator_leader: 'Carlos Mendes',
        timeline_json: [
          {
            id: 'ev-1',
            timestamp: '2026-09-20 06:00',
            title: 'Criação e Programação PCP',
            category: 'PROGRAMACAO',
            description: 'Ordem incluída no sequenciamento semanal oficial.',
            origin: 'PCP',
            userOrSystem: 'Sistema PCP',
          },
          {
            id: 'ev-2',
            timestamp: '2026-09-20 06:15',
            title: 'Início da Produção no MES',
            category: 'INICIO_PRODUCAO',
            description: 'Terminal de Linha L1 abriu ordem com operador Carlos Mendes.',
            origin: 'MES',
            userOrSystem: 'Carlos Mendes',
          },
          {
            id: 'ev-3',
            timestamp: '2026-09-20 16:30',
            title: 'Apontamento ZPPT010 Parcial',
            category: 'APONTAMENTO',
            description: 'Lote de 110,000 t apontado na balança de acabamento.',
            origin: 'MES',
            userOrSystem: 'Balança L1',
          },
        ],
        flow_status_json: [
          { step: 'PCP', label: 'Programação PCP', status: 'CONCLUIDO' },
          { step: 'MES', label: 'Produção Física MES', status: 'EM_ANDAMENTO' },
          { step: 'APONTAMENTO', label: 'Apontamento ZPPT010', status: 'EM_ANDAMENTO' },
          { step: 'SAP', label: 'Integração SAP ECC', status: 'EM_ANDAMENTO' },
          { step: 'FECHAMENTO', label: 'Fechamento Técnico', status: 'PENDENTE' },
        ],
        checklist_fechamento_json: [
          { id: 'c1', title: 'Produção física concluída', status: 'PENDENTE' },
          { id: 'c2', title: 'Apontamentos completos na linha', status: 'PENDENTE' },
          { id: 'c3', title: 'Quantidades conciliadas', status: 'PENDENTE' },
          { id: 'c4', title: 'Integração SAP 100% concluída', status: 'PENDENTE' },
        ],
      },
      {
        op_number: '4500012338',
        empresa_code: 'CIAFAL',
        centro_code: 'PNCL1',
        linha_code: 'L1',
        work_center: 'PNCL1',
        material_code: 'PERF-U-100',
        material_description: 'Perfil U Laminado 100x50 mm A36',
        family_code: 'PERFIS_LAMINADOS',
        steel_grade: 'ASTM A36',
        gauge_dimension: '100x50 mm',
        product_name: 'Perfil U Estrutural',
        mrp_planner: 'PCP Central',
        programming_type: 'Laminação',
        quantity_planned_tons: 80.0,
        quantity_produced_tons: 48.0,
        quantity_posted_tons: 48.0,
        quantity_sap_tons: 48.0,
        balance_tons: 32.0,
        yield_planned_pct: 93.5,
        yield_realized_pct: 93.0,
        planned_start_date: '2026-09-20 07:00',
        planned_end_date: '2026-09-20 14:00',
        real_start_date: '2026-09-20 07:10',
        real_end_date: '',
        status_op: 'EM_PRODUCAO',
        status_mes: 'SEM_COMUNICACAO',
        status_sap: 'CONFIRMADA_PARCIAL',
        status_fechamento: 'PENDENTE_DE_FECHAMENTO',
        visual_status: 'ATENCAO',
        ai_risk_score: 'ALTO_RISCO',
        ai_risk_reason: '2 horas completas sem qualquer novo apontamento de peso no terminal MES.',
        has_pendency: true,
        has_deviation: true,
        deviation_reason: '2h sem novo apontamento no terminal de acabamento',
        last_posting_at: '2026-09-20 14:30',
        operator_leader: 'Julio Cesar',
        timeline_json: [],
        flow_status_json: [],
        checklist_fechamento_json: [],
      },
      {
        op_number: '4500012335',
        empresa_code: 'CIAFAL',
        centro_code: 'ENDL1',
        linha_code: 'L1',
        work_center: 'ENDL1',
        material_code: 'TUB-RED-6025',
        material_description: 'Tubo Redondo Mecânico 60,30x2,65 mm',
        family_code: 'TUBOS_REDONDOS',
        steel_grade: 'SAE 1020',
        gauge_dimension: 'Ø 60,30 mm',
        product_name: 'Tubo Redondo Mecânico',
        mrp_planner: 'PCP Linha 1',
        programming_type: 'Endireitadeira',
        quantity_planned_tons: 95.0,
        quantity_produced_tons: 93.35,
        quantity_posted_tons: 85.0,
        quantity_sap_tons: 85.0,
        balance_tons: 8.35,
        yield_planned_pct: 95.0,
        yield_realized_pct: 94.6,
        planned_start_date: '2026-09-20 06:00',
        planned_end_date: '2026-09-20 12:00',
        real_start_date: '2026-09-20 06:20',
        real_end_date: '2026-09-20 13:30',
        status_op: 'AGUARDANDO_FECHAMENTO',
        status_mes: 'FINALIZADO_OPERADOR',
        status_sap: 'ERRO_INTEGRACAO',
        status_fechamento: 'PENDENTE_DE_FECHAMENTO',
        visual_status: 'CRITICO',
        ai_risk_score: 'CRITICO',
        ai_risk_reason:
          'Divergência de 8,350 t entre o volume físico MES (93,350 t) e o integrado SAP (85,000 t).',
        has_pendency: true,
        has_deviation: true,
        deviation_reason: 'Divergência de 8,350 t entre MES e SAP ZPPT010',
        last_posting_at: '2026-09-20 13:25',
        operator_leader: 'Marcos Souza',
        timeline_json: [],
        flow_status_json: [],
        checklist_fechamento_json: [],
      },
      {
        op_number: 'OP-2025-0891',
        empresa_code: 'CIAFAL',
        centro_code: 'SEML1',
        linha_code: 'L1',
        work_center: 'SEML1',
        material_code: 'TUB-IND-5050',
        material_description: 'Tubo Industrial Quadrado 50x50x2,00 mm',
        family_code: 'TUBOS_LEVES',
        steel_grade: 'SAE 1012',
        gauge_dimension: '50x50 mm',
        product_name: 'Tubo Quadrado Mecânico',
        mrp_planner: 'PCP Linha 1',
        programming_type: 'Laminação',
        quantity_planned_tons: 120.0,
        quantity_produced_tons: 115.4,
        quantity_posted_tons: 115.4,
        quantity_sap_tons: 102.0,
        balance_tons: 13.4,
        yield_planned_pct: 94.5,
        yield_realized_pct: 91.8,
        planned_start_date: '2026-09-18 07:00',
        planned_end_date: '2026-09-18 17:30',
        real_start_date: '2026-09-18 07:22',
        real_end_date: '2026-09-18 18:40',
        status_op: 'CONCLUIDA_FISICAMENTE',
        status_mes: 'FINALIZADO_OPERADOR',
        status_sap: 'ERRO_INTEGRACAO',
        status_fechamento: 'PENDENTE_DE_FECHAMENTO',
        visual_status: 'CRITICO',
        ai_risk_score: 'CRITICO',
        ai_risk_reason:
          'Diferença de 13,400 t entre MES e SAP; Apontamento lote 3 rejeitado no SAP por bloqueio contábil.',
        has_pendency: true,
        has_deviation: true,
        deviation_reason: 'Rendimento 2,7% abaixo da tolerância e divergência MES x SAP',
        last_posting_at: '2026-09-18 18:35',
        operator_leader: 'Carlos Mendes',
        timeline_json: [
          {
            id: 't1',
            timestamp: '2026-09-17 10:15',
            title: 'Criação da Programação Semanal',
            category: 'PROGRAMACAO',
            description: 'Ordem incluída na campanha semanal L1 pelo planejador PCP.',
            origin: 'PCP',
            userOrSystem: 'Sistema PCP',
          },
          {
            id: 't2',
            timestamp: '2026-09-18 07:22',
            title: 'Início da Produção no MES',
            category: 'INICIO_PRODUCAO',
            description: 'Terminal de Linha L1 abriu ordem com operador Carlos Mendes.',
            origin: 'MES',
            userOrSystem: 'Terminal MES L1',
          },
          {
            id: 't3',
            timestamp: '2026-09-18 18:35',
            title: 'Apontamento Lote 3 (13,400 t) - Rejeição SAP',
            category: 'ERRO_SAP',
            description: 'SAP retornou: Lote bloqueado ou divergência de período contábil.',
            origin: 'SAP',
            userOrSystem: 'SAP RFC ZPPT010',
          },
        ],
        flow_status_json: [
          { step: 'PCP', label: 'Programação PCP', status: 'CONCLUIDO' },
          { step: 'MES', label: 'Produção Física MES', status: 'CONCLUIDO' },
          { step: 'APONTAMENTO', label: 'Apontamento ZPPT010', status: 'CONCLUIDO' },
          { step: 'SAP', label: 'Integração SAP ECC', status: 'ERRO' },
          { step: 'FECHAMENTO', label: 'Fechamento Técnico', status: 'BLOQUEADO' },
        ],
        checklist_fechamento_json: [
          { id: 'chk-1', title: 'Produção física concluída', status: 'OK' },
          { id: 'chk-2', title: 'Apontamentos completos na linha', status: 'OK' },
          {
            id: 'chk-5',
            title: 'Integração SAP 100% concluída',
            status: 'ERRO',
            detail: 'Lote 3 rejeitado (13,400 t não integradas).',
          },
        ],
      },
      {
        op_number: 'OP-2025-0892',
        empresa_code: 'CIAFAL',
        centro_code: 'ENDL1',
        linha_code: 'L1',
        work_center: 'ENDL1',
        material_code: 'TUB-RED-6025',
        material_description: 'Tubo Redondo 60,30x2,65 mm',
        family_code: 'TUBOS_REDONDOS',
        steel_grade: 'SAE 1020',
        gauge_dimension: 'Ø 60,30 mm',
        product_name: 'Tubo Mecânico Redondo',
        mrp_planner: 'PCP Linha 1',
        programming_type: 'Endireitadeira',
        quantity_planned_tons: 85.0,
        quantity_produced_tons: 85.0,
        quantity_posted_tons: 85.0,
        quantity_sap_tons: 85.0,
        balance_tons: 0.0,
        yield_planned_pct: 95.0,
        yield_realized_pct: 95.2,
        planned_start_date: '2026-09-18 19:00',
        planned_end_date: '2026-09-19 02:00',
        real_start_date: '2026-09-18 19:15',
        real_end_date: '2026-09-19 01:50',
        status_op: 'ENCERRADA',
        status_mes: 'FINALIZADO_OPERADOR',
        status_sap: 'FECHADA_TECNICAMENTE',
        status_fechamento: 'FECHADA',
        visual_status: 'CONCLUIDO',
        ai_risk_score: 'NORMAL',
        ai_risk_reason: 'Ordem executada em total conformidade técnica e contábil.',
        has_pendency: false,
        has_deviation: false,
        deviation_reason: '',
        last_posting_at: '2026-09-19 01:45',
        operator_leader: 'Julio Cesar',
        timeline_json: [],
        flow_status_json: [],
        checklist_fechamento_json: [],
      },
    ]

    for (const item of seedOrders) {
      try {
        app.findFirstRecordByData('pcp_production_orders', 'op_number', item.op_number)
      } catch (_) {
        const rec = new Record(ordersCol)
        for (const [k, v] of Object.entries(item)) {
          rec.set(k, v)
        }
        app.save(rec)
      }
    }

    // 2. Apontamentos Homologados
    const seedPostings = [
      {
        posting_code: 'ZPPT-20260918-001',
        op_number: 'OP-2025-0891',
        posting_date: '2026-09-18',
        posting_time: '11:45:10',
        empresa_code: 'CIAFAL',
        centro_code: 'SEML1',
        linha_code: 'L1',
        work_center: 'SEML1',
        shift_code: 'TURNO_1',
        operation_code: '0010_LAMINACAO',
        posting_type: 'CONFIRMACAO_PARCIAL',
        quantity_tons: 45.0,
        unit: 't',
        operator_name: 'Carlos Mendes',
        data_origin: 'MES',
        status_mes: 'VALIDADO_MES',
        status_sap: 'PROCESSADO_SAP',
        sap_message: 'Documento contábil 4900128472 gerado com sucesso.',
        sap_document_number: '4900128472',
        retry_attempts: 1,
        last_retry_at: '2026-09-18 11:46:02',
        has_pendency: false,
      },
      {
        posting_code: 'ZPPT-20260918-002',
        op_number: 'OP-2025-0891',
        posting_date: '2026-09-18',
        posting_time: '16:20:44',
        empresa_code: 'CIAFAL',
        centro_code: 'SEML1',
        linha_code: 'L1',
        work_center: 'SEML1',
        shift_code: 'TURNO_2',
        operation_code: '0010_LAMINACAO',
        posting_type: 'CONFIRMACAO_PARCIAL',
        quantity_tons: 57.0,
        unit: 't',
        operator_name: 'Carlos Mendes',
        data_origin: 'MES',
        status_mes: 'VALIDADO_MES',
        status_sap: 'PROCESSADO_SAP',
        sap_message: 'Documento contábil 4900128509 gerado com sucesso.',
        sap_document_number: '4900128509',
        retry_attempts: 1,
        last_retry_at: '2026-09-18 16:21:10',
        has_pendency: false,
      },
      {
        posting_code: 'ZPPT-20260918-003',
        op_number: 'OP-2025-0891',
        posting_date: '2026-09-18',
        posting_time: '18:35:12',
        empresa_code: 'CIAFAL',
        centro_code: 'SEML1',
        linha_code: 'L1',
        work_center: 'SEML1',
        shift_code: 'TURNO_2',
        operation_code: '0010_LAMINACAO',
        posting_type: 'CONFIRMACAO_FINAL',
        quantity_tons: 13.4,
        unit: 't',
        operator_name: 'Carlos Mendes',
        data_origin: 'MES',
        status_mes: 'VALIDADO_MES',
        status_sap: 'REJEITADO_SAP',
        sap_message: 'M7021: Saldo de depósito insuficiente ou lote bloqueado no centro SEML1.',
        sap_document_number: '',
        retry_attempts: 3,
        last_retry_at: '2026-09-18 18:48:00',
        has_pendency: true,
        pendency_reason: 'Erro de integração SAP ZPPT010 (M7021).',
        required_action: 'Ajustar lote de matéria-prima no SAP e acionar reprocessamento.',
      },
    ]

    for (const item of seedPostings) {
      try {
        app.findFirstRecordByData('pcp_production_postings', 'posting_code', item.posting_code)
      } catch (_) {
        const rec = new Record(postingsCol)
        for (const [k, v] of Object.entries(item)) {
          rec.set(k, v)
        }
        app.save(rec)
      }
    }

    // 3. Pendências Homologadas
    const seedPendencies = [
      {
        pendency_code: 'PEND-0891-01',
        op_number: 'OP-2025-0891',
        centro_code: 'SEML1',
        linha_code: 'L1',
        material_code: 'TUB-IND-5050',
        material_description: 'Tubo Industrial Quadrado 50x50x2,00 mm',
        problem_category: 'ERRO_INTEGRACAO_SAP',
        problem_description: 'Apontamento ZPPT010 de 13,400 t rejeitado pelo SAP ECC (M7021).',
        business_impact: 'Impede encerramento técnico da ordem e faturamento do lote final.',
        responsible_role_or_user: 'Analista de Integrações SAP / PCP',
        detected_at: '2026-09-18 18:35',
        pending_duration_text: '16h 25min',
        criticality: 'CRITICA',
        required_action: 'Desbloquear lote no SAP ou reprocessar com lote subsidiário homologado.',
        resolution_status: 'PENDENTE',
        checklist_item_affected: 'Integração SAP 100% concluída',
      },
    ]

    for (const item of seedPendencies) {
      try {
        app.findFirstRecordByData('pcp_closing_pendencies', 'pendency_code', item.pendency_code)
      } catch (_) {
        const rec = new Record(pendenciesCol)
        for (const [k, v] of Object.entries(item)) {
          rec.set(k, v)
        }
        app.save(rec)
      }
    }

    // 4. Paradas Homologadas
    const seedStops = [
      {
        stop_code: 'STP-20260918-01',
        op_number: 'OP-2025-0891',
        linha_code: 'L1',
        centro_code: 'SEML1',
        start_datetime: '2026-09-18 14:10',
        end_datetime: '2026-09-18 14:35',
        duration_minutes: 25,
        reason_reported: 'Troca de fieira e acerto de rolos guias',
        technical_cause_confirmed: 'Desgaste prematuro na bucha do trem intermediário',
        category: 'MANUTENCAO_MECANICA',
        maintenance_order_ref: 'OM-883210',
        operator_name: 'Carlos Mendes',
        is_open: false,
      },
    ]

    for (const item of seedStops) {
      try {
        app.findFirstRecordByData('pcp_production_stops', 'stop_code', item.stop_code)
      } catch (_) {
        const rec = new Record(stopsCol)
        for (const [k, v] of Object.entries(item)) {
          rec.set(k, v)
        }
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      app
        .db()
        .newQuery(
          "DELETE FROM pcp_production_orders WHERE op_number IN ('4500012342', '4500012338', '4500012335', 'OP-2025-0891', 'OP-2025-0892')",
        )
        .execute()
      app
        .db()
        .newQuery("DELETE FROM pcp_production_postings WHERE posting_code LIKE 'ZPPT-20260918%'")
        .execute()
      app
        .db()
        .newQuery("DELETE FROM pcp_closing_pendencies WHERE pendency_code LIKE 'PEND-0891%'")
        .execute()
      app
        .db()
        .newQuery("DELETE FROM pcp_production_stops WHERE stop_code LIKE 'STP-20260918%'")
        .execute()
    } catch (_) {}
  },
)
