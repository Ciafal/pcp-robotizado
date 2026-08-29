migrate(
  (app) => {
    const permissionsCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolePermsCol = app.findCollectionByNameOrId('pcp_role_permissions')

    const newPermissions = [
      {
        key: 'pcp.product.quality',
        name: 'Visualizar Requisitos de Qualidade do Produto',
        category: 'Qualidade do Produto',
        is_critical: false,
        description:
          'Permite visualizar parâmetros de ultrassom, ensaios mecânicos e fichas técnicas',
      },
      {
        key: 'pcp.quality.view',
        name: 'Acessar Painel de Qualidade e Demandas de Inspeção',
        category: 'Qualidade do Produto',
        is_critical: false,
        description:
          'Permite consultar o workflow de ensaios, ultrassom, ensaios mecânicos e status de liberação',
      },
      {
        key: 'pcp.quality.manage',
        name: 'Gerenciar Demandas e Capacidade da Qualidade',
        category: 'Qualidade do Produto',
        is_critical: true,
        description:
          'Permite programar inspeções, parametrizar capacidades de laboratório e gerenciar filas',
      },
      {
        key: 'pcp.quality.execute',
        name: 'Executar e Registrar Resultados de Ensaio / Liberação',
        category: 'Qualidade do Produto',
        is_critical: true,
        description:
          'Permite aprovar, reprovar, emitir laudos e efetuar a liberação bloqueante de OPs',
      },
      {
        key: 'pcp.requirement.view',
        name: 'Visualizar Ficha de Requisitos do Pedido MTO',
        category: 'Ficha de Requisitos',
        is_critical: false,
        description:
          'Permite abrir e consultar a ficha consolidada de requisitos comerciais, técnicos e de qualidade',
      },
      {
        key: 'pcp.requirement.manage',
        name: 'Validar e Alterar Ficha de Requisitos MTO',
        category: 'Ficha de Requisitos',
        is_critical: true,
        description:
          'Permite resolver conflitos de requisitos, editar especificações do pedido e aprovar exceções',
      },
      {
        key: 'pcp.quality.ai_analytics',
        name: 'Executar IA Analista de Pré-Programação e Consistência',
        category: 'Qualidade do Produto',
        is_critical: false,
        description:
          'Permite acionar IA para validação antecipada de consistência de requisitos, capacidade de ensaios e riscos',
      },
    ]

    const permMap = {}
    for (const p of newPermissions) {
      try {
        const existing = app.findFirstRecordByData('pcp_permissions', 'key', p.key)
        permMap[p.key] = existing
      } catch (_) {
        const rec = new Record(permissionsCol)
        rec.set('key', p.key)
        rec.set('name', p.name)
        rec.set('category', p.category)
        rec.set('is_critical', p.is_critical)
        rec.set('description', p.description)
        app.save(rec)
        permMap[p.key] = rec
      }
    }

    const roleMappings = {
      PCP_ADMIN: [
        'pcp.product.quality',
        'pcp.quality.view',
        'pcp.quality.manage',
        'pcp.quality.execute',
        'pcp.requirement.view',
        'pcp.requirement.manage',
        'pcp.quality.ai_analytics',
      ],
      PCP_PROGRAMMER: [
        'pcp.product.quality',
        'pcp.quality.view',
        'pcp.quality.manage',
        'pcp.requirement.view',
        'pcp.requirement.manage',
        'pcp.quality.ai_analytics',
      ],
      LINE_MANAGER: [
        'pcp.product.quality',
        'pcp.quality.view',
        'pcp.requirement.view',
        'pcp.quality.ai_analytics',
      ],
      EXECUTIVE_VIEWER: [
        'pcp.product.quality',
        'pcp.quality.view',
        'pcp.requirement.view',
        'pcp.quality.ai_analytics',
      ],
      AUDITOR: ['pcp.product.quality', 'pcp.quality.view', 'pcp.requirement.view'],
      PRODUCTION_VIEWER: ['pcp.product.quality', 'pcp.quality.view', 'pcp.requirement.view'],
    }

    for (const [rCode, keys] of Object.entries(roleMappings)) {
      try {
        const roleRec = app.findFirstRecordByData('pcp_roles', 'code', rCode)
        for (const k of keys) {
          const permRec = permMap[k]
          if (!permRec) continue
          const existing = app.findRecordsByFilter(
            'pcp_role_permissions',
            `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const rp = new Record(rolePermsCol)
            rp.set('role_id', roleRec.id)
            rp.set('permission_id', permRec.id)
            app.save(rp)
          }
        }
      } catch (_) {}
    }

    // 2. Atualizar Ferramentas do Agente Corporativo Nativo Skip Cloud (ciafal-executive-agent)
    try {
      $ai.agents.putTools(app, 'ciafal-executive-agent', [
        { collection: 'product_quality_requirements', perms: { list: true, read: true } },
        {
          collection: 'order_requirement_sheets',
          perms: { list: true, read: true, create: true, update: true },
        },
        {
          collection: 'quality_inspection_demands',
          perms: { list: true, read: true, create: true, update: true },
        },
        {
          collection: 'quality_capacity_planning',
          perms: { list: true, read: true, create: true, update: true },
        },
      ])
    } catch (e) {
      console.log('Aviso ao atualizar tools do agente:', e)
    }

    // 3. Seed Dados Homologados CIAFAL para Testes e Demonstração Realista
    const pqrCol = app.findCollectionByNameOrId('product_quality_requirements')
    const sampleReqs = [
      {
        product_code: 'TUBO_5580',
        product_name: 'Tubo Industrial NBR 5580 Classe Leve Ø 2"',
        family_code: 'TUBOS_INDUSTRIAIS',
        production_type: 'MTS',
        ultrasound_requirement: 'CONDICIONAL',
        ultrasound_condition_rule:
          'Exige US quando espessura > 3.0mm e aplicação for condução sob pressão',
        mechanical_test_requirement: 'SIM',
        mechanical_test_condition_rule:
          'Todos os lotes exigem Tração e Dobramento conforme NBR 5580',
        mechanical_test_types: ['TRACAO', 'DOBRAMENTO'],
        applicable_standards: 'ABNT NBR 5580 / ASTM A53',
        is_blocking_default: true,
        standard_sample_count: 2,
        estimated_inspection_hours: 1.5,
        responsible_laboratory: 'LAB_METALOGRAFICO_DIV',
        active: true,
      },
      {
        product_code: 'PERFIL_U',
        product_name: 'Perfil U Estrutural Dobrado 100x50x3.00mm',
        family_code: 'PERFIS_ESTRUTURAIS',
        production_type: 'MTO',
        ultrasound_requirement: 'SIM',
        ultrasound_condition_rule:
          'Exigência 100% de Ultrassom na solda longitudinal para pedidos estruturais',
        mechanical_test_requirement: 'SIM',
        mechanical_test_condition_rule: 'Ensaio de Tração, Escoamento e Impacto Charpy V-Notch',
        mechanical_test_types: ['TRACAO', 'DOBRAMENTO', 'IMPACTO'],
        applicable_standards: 'ABNT NBR 6355 / ASTM A36',
        is_blocking_default: true,
        standard_sample_count: 3,
        estimated_inspection_hours: 2.0,
        responsible_laboratory: 'LAB_MECANICO_DIV',
        active: true,
      },
      {
        product_code: 'CANTONEIRA_STD',
        product_name: 'Cantoneira de Abas Iguais 2" x 1/4"',
        family_code: 'CANTONEIRA',
        production_type: 'MTS',
        ultrasound_requirement: 'NAO',
        ultrasound_condition_rule: 'Isento de Ultrassom para padrão comercial MTS',
        mechanical_test_requirement: 'SIM',
        mechanical_test_condition_rule: 'Ensaio de Tração por corrida de laminação',
        mechanical_test_types: ['TRACAO', 'DUREZA'],
        applicable_standards: 'ASTM A36 / NBR 7007 MR250',
        is_blocking_default: false,
        standard_sample_count: 1,
        estimated_inspection_hours: 0.8,
        responsible_laboratory: 'LAB_MECANICO_DIV',
        active: true,
      },
      {
        product_code: 'BARRA_CHATA',
        product_name: 'Barra Chata Laminada 1" x 1/8"',
        family_code: 'BARRAS_LAMINADAS',
        production_type: 'MTS',
        ultrasound_requirement: 'NAO',
        ultrasound_condition_rule: 'Isento',
        mechanical_test_requirement: 'NAO',
        mechanical_test_condition_rule: 'Controle dimensional contínuo em linha',
        mechanical_test_types: [],
        applicable_standards: 'SAE 1020 / ASTM A36',
        is_blocking_default: false,
        standard_sample_count: 1,
        estimated_inspection_hours: 0.5,
        responsible_laboratory: 'LAB_DIMENSIONAL_DIV',
        active: true,
      },
      {
        product_code: 'TUBO_QUAD',
        product_name: 'Tubo Quadrado Estrutural 80x80x3.75mm',
        family_code: 'TUBOS_INDUSTRIAIS',
        production_type: 'MTO',
        ultrasound_requirement: 'SIM',
        ultrasound_condition_rule: 'Exigência de Ultrassom 100% de costura (Classe B)',
        mechanical_test_requirement: 'SIM',
        mechanical_test_condition_rule: 'Ensaio de Tração, Dureza e Achatamento',
        mechanical_test_types: ['TRACAO', 'DUREZA', 'DOBRAMENTO'],
        applicable_standards: 'NBR 8261 Grau C / ASTM A500',
        is_blocking_default: true,
        standard_sample_count: 2,
        estimated_inspection_hours: 1.8,
        responsible_laboratory: 'LAB_METALOGRAFICO_DIV',
        active: true,
      },
      {
        product_code: 'PERFIL_ENRIJECIDO',
        product_name: 'Perfil U Enrijecido 150x60x20x2.65mm',
        family_code: 'PERFIS_ESTRUTURAIS',
        production_type: 'MTO',
        ultrasound_requirement: 'SIM',
        ultrasound_condition_rule: 'Exigência cliente específico para estruturas solares',
        mechanical_test_requirement: 'SIM',
        mechanical_test_condition_rule: 'Ensaio de Tração e Metalografia de Solda',
        mechanical_test_types: ['TRACAO', 'DOBRAMENTO'],
        applicable_standards: 'NBR 6355 / ASTM A572 Gr 50',
        is_blocking_default: true,
        standard_sample_count: 3,
        estimated_inspection_hours: 2.2,
        responsible_laboratory: 'LAB_MECANICO_DIV',
        active: true,
      },
    ]

    for (const req of sampleReqs) {
      try {
        app.findFirstRecordByData('product_quality_requirements', 'product_code', req.product_code)
      } catch (_) {
        const r = new Record(pqrCol)
        for (const [k, v] of Object.entries(req)) {
          r.set(k, v)
        }
        app.save(r)
      }
    }

    // 4. Seed Fichas de Requisitos MTO (order_requirement_sheets)
    const orsCol = app.findCollectionByNameOrId('order_requirement_sheets')
    const sampleSheets = [
      {
        sheet_code: 'FRS-2026-MTO-001',
        order_number: 'OP-2026-1012',
        customer_name: 'Estruturas Metálicas Brasil S.A.',
        customer_code: 'CLI-88219',
        sales_order_sap: '4500981240',
        sales_order_item: '10',
        material_code: 'PERFIL_U',
        material_description: 'Perfil U Estrutural Dobrado 100x50x3.00mm',
        production_type: 'MTO',
        quantity_tons: 720,
        quantity_units: 1440,
        unit_of_measure: 't',
        order_date: '2026-08-20',
        desired_delivery_date: '2026-09-05',
        confirmed_delivery_date: '2026-09-04',
        commercial_priority: 'ALTA',
        sales_representative: 'Carlos Eduardo Silveira (Vendas Engenharia)',
        nominal_dimension: '100 x 50 x 3.00 mm',
        dimensional_tolerances: 'Espessura ±0.15mm, Abas ±1.0mm, Flecha máx 1mm/m',
        length_meters: 12.0,
        weight_kg_per_piece: 42.0,
        dimensional_notes: 'Corte preciso em esquadro ± 1mm nas extremidades',
        technical_standard: 'ABNT NBR 6355 / ASTM A36',
        steel_grade: 'Aço Estrutural ASTM A36 / NBR 7007 Grau MR250',
        chemical_composition_reqs: {
          C_max: 0.25,
          Mn_max: 1.2,
          P_max: 0.04,
          S_max: 0.05,
          Si_max: 0.4,
        },
        mechanical_properties_reqs: { LE_min_MPa: 250, LR_MPa: '400-550', Along_min_pct: 20 },
        heat_treatment: 'Normalizado pós-conformação a frio',
        surface_finish_condition: 'Decapado e oleado, isento de carepas soltas',
        packaging_requirements: 'Fardos de 2.5 t com 4 cintas de aço e calços de madeira',
        marking_identification: 'Pintura indelével em branco: Lote + OP + Norma + CIAFAL',
        traceability_level: 'Rastreabilidade Total por Corrida e Posição da Bobina',
        mandatory_inspections: [
          'ULTRASSOM_COSTURA',
          'ENSAIO_TRACAO',
          'DOBRAMENTO_180',
          'DIMENSIONAL_TOTAL',
        ],
        requires_ultrasound: true,
        ultrasound_standard: 'ASME Sec. V Artigo 4 / ASTM E213',
        requires_mechanical_tests: true,
        mechanical_tests_detail: { tração: true, dobramento: true, dureza: false, impacto: true },
        requires_chemical_analysis: true,
        requires_metallography: false,
        requires_dimensional_inspection: true,
        requires_surface_inspection: true,
        quality_certificates_required: [
          'CERTIFICADO_TIPO_3_1_B',
          'LAUDO_ULTRASSOM',
          'RELATORIO_DIMENSIONAL',
        ],
        special_customer_requirements:
          'Inspeção visual acompanhada por inspetor N2 qualificado do cliente antes do embarque.',
        requirements_sources_traceability: {
          cadastro_mestre: 'product_quality_requirements [PERFIL_U]',
          cadastro_cliente:
            'Requisitos específicos Estruturas Metálicas BR (Acordo Técnico AT-2025-04)',
          pedido_sap: 'Sales Order SAP 4500981240 item 10',
          especificacoes_internas: 'Procedimento Qualidade CIAFAL PQ-US-08 rev 4',
        },
        validation_status: 'VALIDADO',
        validation_pendency_details:
          'Requisitos validados sem conflito pela Engenharia de Qualidade.',
        version: 1,
      },
      {
        sheet_code: 'FRS-2026-MTO-002',
        order_number: 'OP-2026-1015',
        customer_name: 'Torres Eólicas do Nordeste S.A.',
        customer_code: 'CLI-91044',
        sales_order_sap: '4500981315',
        sales_order_item: '20',
        material_code: 'TUBO_QUAD',
        material_description: 'Tubo Quadrado Estrutural 80x80x3.75mm',
        production_type: 'MTO',
        quantity_tons: 580,
        quantity_units: 920,
        unit_of_measure: 't',
        order_date: '2026-08-22',
        desired_delivery_date: '2026-09-08',
        confirmed_delivery_date: '2026-09-07',
        commercial_priority: 'CRITICA',
        sales_representative: 'Mariana Duarte (Grandes Contas Energia)',
        nominal_dimension: '80 x 80 x 3.75 mm',
        dimensional_tolerances: 'Lados ±0.5mm, Espessura ±0.2mm, Torção máx 1.5mm/m',
        length_meters: 6.0,
        weight_kg_per_piece: 52.0,
        dimensional_notes: 'Raio de canto máximo 2 x espessura nominal',
        technical_standard: 'ABNT NBR 8261 Grau C / ASTM A500',
        steel_grade: 'Aço Grau C (LE 345 MPa)',
        chemical_composition_reqs: { C_max: 0.23, Mn_max: 1.35, P_max: 0.035, S_max: 0.035 },
        mechanical_properties_reqs: { LE_min_MPa: 345, LR_min_MPa: 427, Along_min_pct: 21 },
        heat_treatment: 'Alívio de tensões após soldagem',
        surface_finish_condition: 'Pintura primer epóxi 25 micras',
        packaging_requirements: 'Embalagem marítima com plástico termoencolhível e dessecante',
        marking_identification: 'Etiqueta metálica com QR Code de rastreabilidade',
        traceability_level: 'Rastreabilidade Unitária por Barra',
        mandatory_inspections: ['ULTRASSOM_100', 'ENSAIO_TRACAO', 'ENSAIO_DUREZA', 'ACHATAMENTO'],
        requires_ultrasound: true,
        ultrasound_standard: 'ISO 10893-11 Nível U2',
        requires_mechanical_tests: true,
        mechanical_tests_detail: { tração: true, dobramento: true, dureza: true, impacto: false },
        requires_chemical_analysis: true,
        requires_metallography: true,
        requires_dimensional_inspection: true,
        requires_surface_inspection: true,
        quality_certificates_required: [
          'CERTIFICADO_EN10204_3_1',
          'LAUDO_ULTRASSOM_ISO',
          'MAPA_ESPESSURA',
        ],
        special_customer_requirements:
          'Exige ensaio de ultrassom 100% de costura e corpo. Liberação bloqueante para expedição.',
        requirements_sources_traceability: {
          cadastro_mestre: 'product_quality_requirements [TUBO_QUAD]',
          cadastro_cliente: 'Especificação Técnica Eólica ET-EOL-2026',
          pedido_sap: 'Sales Order SAP 4500981315 item 20',
          especificacoes_internas: 'Procedimento Qualidade CIAFAL PQ-MET-03 rev 2',
        },
        validation_status: 'VALIDADO',
        validation_pendency_details: 'Capacidade do laboratório de Ultrassom confirmada.',
        version: 1,
      },
    ]

    for (const sheet of sampleSheets) {
      try {
        app.findFirstRecordByData('order_requirement_sheets', 'sheet_code', sheet.sheet_code)
      } catch (_) {
        const s = new Record(orsCol)
        for (const [k, v] of Object.entries(sheet)) {
          s.set(k, v)
        }
        app.save(s)
      }
    }

    // 5. Seed Demandas de Qualidade (quality_inspection_demands)
    const qidCol = app.findCollectionByNameOrId('quality_inspection_demands')
    const sampleDemands = [
      {
        demand_code: 'QID-2026-US-001',
        inspection_type: 'ULTRASSOM',
        line_code: 'L1',
        production_order_number: 'OP-2026-1012',
        sales_order_sap: '4500981240',
        sales_order_item: '10',
        customer_name: 'Estruturas Metálicas Brasil S.A.',
        product_code: 'PERFIL_U',
        product_description: 'Perfil U Estrutural Dobrado 100x50x3.00mm',
        production_type: 'MTO',
        quantity_tons: 720,
        sample_count: 6,
        batch_number: 'LOT-2026-09-01-A',
        planned_production_date: '2026-09-01',
        planned_inspection_date: '2026-09-01',
        estimated_duration_hours: 2.0,
        applicable_standard: 'ASME Sec. V Artigo 4 / ASTM E213',
        inspection_requirement_details:
          'Ensaio de Ultrassom por feixe angular na zona fundida longitudinal',
        acceptance_criteria: 'Sem descontinuidades superiores a 2.0mm de diâmetro equivalente',
        is_blocking_release: true,
        priority: 'ALTA',
        status: 'PROGRAMADA',
        laboratory_equipment: 'Aparelho US Krautkramer USM 36 #EQ-US-02',
        reschedule_history: [],
        audit_log: [
          {
            event: 'DEMAND_GENERATED',
            by: 'PCP Automático CIAFAL',
            at: '2026-08-30 08:00',
            details: 'Gerado automaticamente a partir da aprovação da programação L1',
          },
        ],
      },
      {
        demand_code: 'QID-2026-EM-001',
        inspection_type: 'ENSAIO_TRACAO',
        line_code: 'L1',
        production_order_number: 'OP-2026-1012',
        sales_order_sap: '4500981240',
        sales_order_item: '10',
        customer_name: 'Estruturas Metálicas Brasil S.A.',
        product_code: 'PERFIL_U',
        product_description: 'Perfil U Estrutural Dobrado 100x50x3.00mm',
        production_type: 'MTO',
        quantity_tons: 720,
        sample_count: 3,
        batch_number: 'LOT-2026-09-01-A',
        planned_production_date: '2026-09-01',
        planned_inspection_date: '2026-09-01',
        estimated_duration_hours: 1.5,
        applicable_standard: 'ABNT NBR ISO 6892-1 / ASTM A370',
        inspection_requirement_details: 'Ensaio de tração longitudinal em corpos de prova usinados',
        acceptance_criteria: 'LE >= 250 MPa, LR 400-550 MPa, Alongamento >= 20%',
        is_blocking_release: true,
        priority: 'ALTA',
        status: 'PROGRAMADA',
        laboratory_equipment: 'Máquina Universal EMIC 600kN #EQ-UNIV-01',
        reschedule_history: [],
        audit_log: [
          {
            event: 'DEMAND_GENERATED',
            by: 'PCP Automático CIAFAL',
            at: '2026-08-30 08:00',
            details: 'Gerado automaticamente da Ficha de Requisitos do Pedido MTO',
          },
        ],
      },
      {
        demand_code: 'QID-2026-US-002',
        inspection_type: 'ULTRASSOM',
        line_code: 'L2',
        production_order_number: 'OP-2026-1015',
        sales_order_sap: '4500981315',
        sales_order_item: '20',
        customer_name: 'Torres Eólicas do Nordeste S.A.',
        product_code: 'TUBO_QUAD',
        product_description: 'Tubo Quadrado Estrutural 80x80x3.75mm',
        production_type: 'MTO',
        quantity_tons: 580,
        sample_count: 8,
        batch_number: 'LOT-2026-09-02-B',
        planned_production_date: '2026-09-02',
        planned_inspection_date: '2026-09-02',
        estimated_duration_hours: 2.5,
        applicable_standard: 'ISO 10893-11 Nível U2',
        inspection_requirement_details: 'Ultrassom 100% longitudinal com transdutor Phased Array',
        acceptance_criteria: 'Nível de aceitação Classe A conforme norma eólica',
        is_blocking_release: true,
        priority: 'CRITICA',
        status: 'PREVISTA',
        laboratory_equipment: 'Phased Array Olympus OmniScan SX #EQ-PA-01',
        reschedule_history: [],
        audit_log: [
          {
            event: 'DEMAND_GENERATED',
            by: 'PCP Automático CIAFAL',
            at: '2026-08-30 08:15',
            details: 'Planejamento antecipado de inspeção para Qualidade do Produto',
          },
        ],
      },
      {
        demand_code: 'QID-2026-EM-002',
        inspection_type: 'ENSAIO_DOBRAMENTO',
        line_code: 'L1',
        production_order_number: 'OP-2026-1011',
        customer_name: 'Distribuidor Minas Aço S.A.',
        product_code: 'TUBO_5580',
        product_description: 'Tubo Industrial NBR 5580 Classe Leve Ø 2"',
        production_type: 'MTS',
        quantity_tons: 850,
        sample_count: 2,
        batch_number: 'LOT-2026-08-29-C',
        planned_production_date: '2026-08-31',
        planned_inspection_date: '2026-08-31',
        estimated_duration_hours: 1.0,
        applicable_standard: 'ABNT NBR 5580',
        inspection_requirement_details: 'Dobramento a 180° sobre mandril de 4x espessura',
        acceptance_criteria: 'Isento de trincas na região tracionada',
        is_blocking_release: true,
        priority: 'MEDIA',
        status: 'APROVADA',
        laboratory_equipment: 'Dispositivo Hidráulico de Dobramento #EQ-DOB-02',
        inspector_name: 'Marcos Vinicius (Inspetor N2 Qualidade)',
        inspected_at: '2026-08-31 14:30',
        result_notes: 'Corpos de prova aprovados sem fissuras ou descontinuidades.',
        certificate_number: 'LAUDO-EM-2026-8812',
        reschedule_history: [],
        audit_log: [
          {
            event: 'INSPECTION_APPROVED',
            by: 'Marcos Vinicius',
            at: '2026-08-31 14:35',
            details: 'Ensaio executado e aprovado. Material liberado para expedição.',
          },
        ],
      },
    ]

    for (const dem of sampleDemands) {
      try {
        app.findFirstRecordByData('quality_inspection_demands', 'demand_code', dem.demand_code)
      } catch (_) {
        const d = new Record(qidCol)
        for (const [k, v] of Object.entries(dem)) {
          d.set(k, v)
        }
        app.save(d)
      }
    }

    // 6. Seed Capacidade da Qualidade (quality_capacity_planning)
    const qcpCol = app.findCollectionByNameOrId('quality_capacity_planning')
    const sampleCaps = [
      {
        period_ref: '2026-09-01',
        laboratory_or_line: 'LAB_METALOGRAFICO_DIV',
        inspection_type: 'ULTRASSOM',
        planned_tests_count: 6,
        planned_hours: 5.5,
        available_capacity_hours: 8.0,
        daily_capacity_tests_limit: 10,
        utilization_pct: 68.75,
        has_overload: false,
        overload_details: '',
        ai_capacity_alerts: [],
        ai_suggested_rearrangements: [],
      },
      {
        period_ref: '2026-09-01',
        laboratory_or_line: 'LAB_MECANICO_DIV',
        inspection_type: 'ENSAIO_TRACAO',
        planned_tests_count: 5,
        planned_hours: 4.5,
        available_capacity_hours: 8.0,
        daily_capacity_tests_limit: 8,
        utilization_pct: 56.25,
        has_overload: false,
        overload_details: '',
        ai_capacity_alerts: [],
        ai_suggested_rearrangements: [],
      },
      {
        period_ref: '2026-09-02',
        laboratory_or_line: 'LAB_METALOGRAFICO_DIV',
        inspection_type: 'ULTRASSOM',
        planned_tests_count: 12,
        planned_hours: 10.5,
        available_capacity_hours: 8.0,
        daily_capacity_tests_limit: 10,
        utilization_pct: 131.25,
        has_overload: true,
        overload_details:
          'Sobrecarga de 2.5h (12 ensaios programados para capacidade de 10 ensaios/dia)',
        ai_capacity_alerts: [
          'A programação prevista para terça-feira gera 12 demandas de ultrassom, acima da capacidade diária cadastrada da Qualidade (máx: 10).',
          'Risco de atraso na liberação das OPs OP-2026-1015 e OP-2026-1018.',
        ],
        ai_suggested_rearrangements: [
          'Antecipar 3 ensaios da OP-2026-1012 para a 2ª feira turno C.',
          'Ou escalonar execução com o 2º turno de laboratório.',
        ],
      },
    ]

    for (const cap of sampleCaps) {
      try {
        app.findFirstRecordByData('quality_capacity_planning', 'period_ref', cap.period_ref)
      } catch (_) {
        const c = new Record(qcpCol)
        for (const [k, v] of Object.entries(cap)) {
          c.set(k, v)
        }
        app.save(c)
      }
    }
  },
  (app) => {
    try {
      $ai.agents.deleteTools(app, 'ciafal-executive-agent', [
        'product_quality_requirements',
        'order_requirement_sheets',
        'quality_inspection_demands',
        'quality_capacity_planning',
      ])
    } catch (_) {}
  },
)
