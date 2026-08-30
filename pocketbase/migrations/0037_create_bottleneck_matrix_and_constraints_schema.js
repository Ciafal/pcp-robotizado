/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Matriz de Gargalos das Linhas (line_bottleneck_matrix)
    const bottleneckMatrixCol = new Collection({
      name: 'line_bottleneck_matrix',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('production_lines').id,
          maxSelect: 1,
          required: true,
        },
        { name: 'line_code', type: 'text', required: true },
        { name: 'material_code', type: 'text' },
        { name: 'product_family', type: 'text' },
        { name: 'profile_shape', type: 'text' }, // ex: QUAD, RED, CHAT, PERFIL
        { name: 'gauge_dimension', type: 'text' }, // ex: 130x130, 150x150, 1/2", 5/8"
        { name: 'steel_grade', type: 'text' }, // ex: 1020, 1045, SAE 5160, CA-50
        { name: 'billet_section_mm', type: 'number' }, // ex: 130, 150
        { name: 'billet_length_m', type: 'number' }, // ex: 6.0, 7.5, 9.0, 12.0
        { name: 'billet_weight_kg', type: 'number' },
        { name: 'route_code', type: 'text' },
        { name: 'passes_count', type: 'number' },
        { name: 'veins_count', type: 'number' },

        // Capacidades por Etapa Produtiva (t/h)
        { name: 'furnace_capacity_th', type: 'number' }, // Forno de Reaquecimento
        { name: 'roughing_capacity_th', type: 'number' }, // Desbaste (passes simultâneos/sem)
        { name: 'continuous_mill_capacity_th', type: 'number' }, // Trem Contínuo / Velocidade saída
        { name: 'shear_tr2_capacity_th', type: 'number' }, // Tesoura Voadora TR2 / Intervalo entre barras
        { name: 'cooling_bed_tcc_capacity_th', type: 'number' }, // Leito de Resfriamento / TCC
        { name: 'straightener_capacity_th', type: 'number' }, // Endireitamento (quando rota ativa)
        { name: 'packaging_capacity_th', type: 'number' }, // Empacotadora / Formação de Amarrados

        // Gargalo Dinâmico Calculado
        { name: 'primary_bottleneck_stage', type: 'text' }, // Etapa que dita o ritmo (DRUM)
        { name: 'primary_bottleneck_rate_th', type: 'number' },
        { name: 'secondary_bottleneck_stage', type: 'text' },
        { name: 'secondary_bottleneck_rate_th', type: 'number' },
        { name: 'bottleneck_gap_th', type: 'number' },

        // Restrições Específicas Parametrizadas
        { name: 'max_tcc_bar_length_m', type: 'number' }, // Limite físico TCC (ex: 72 m)
        { name: 'max_tcc_bars_per_rack', type: 'number' }, // Barras por estrado (ex: 14)
        { name: 'min_bar_interval_seconds', type: 'number' }, // Intervalo mín TR2 (ex: 3.2s)
        { name: 'max_crop_end_weight_kg', type: 'number' }, // Ponta de segurança máx (ex: 15 kg)
        { name: 'standard_furnace_temp_c', type: 'number' },
        { name: 'thermal_curve_type', type: 'text' }, // QUENTE, FRIO, MORNO

        // Governança e Rastreabilidade
        { name: 'version', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['VIGENTE', 'EM_REVISAO', 'SUPERSEDED', 'RASCUNHO'],
          maxSelect: 1,
        },
        { name: 'reference_doc', type: 'text' }, // Matriz Gargalo QUAD 130mm, 150mm, CISAM, Supervisório
        { name: 'source_authority', type: 'text' }, // Engenharia de Processo CIAFAL
        { name: 'responsible_name', type: 'text' },
        { name: 'approver_name', type: 'text' },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'notes', type: 'text' },
        { name: 'raw_parameters_json', type: 'json' },

        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lbm_line_mat ON line_bottleneck_matrix (line_code, material_code)',
        'CREATE INDEX idx_lbm_gauge_steel ON line_bottleneck_matrix (gauge_dimension, steel_grade)',
        'CREATE INDEX idx_lbm_status ON line_bottleneck_matrix (status)',
      ],
    })
    app.save(bottleneckMatrixCol)

    // 2. Regras e Restrições de Processo (line_process_constraints)
    const processConstraintsCol = new Collection({
      name: 'line_process_constraints',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'line_code', type: 'text', required: true },
        { name: 'rule_code', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        {
          name: 'stage',
          type: 'select',
          values: [
            'MP',
            'FORNO',
            'DESBASTE',
            'TREM_CONTINUO',
            'TESOURA_TR2',
            'TCC_RESFRIAMENTO',
            'ENDIREITAMENTO',
            'EMPACOTAMENTO',
            'GERAL_LINHA',
          ],
          maxSelect: 1,
        },
        {
          name: 'constraint_level',
          type: 'select',
          values: ['HARD_CONSTRAINT', 'SOFT_CONSTRAINT', 'SAFETY_CONSTRAINT'],
          maxSelect: 1,
        },
        { name: 'parameter_key', type: 'text', required: true },
        { name: 'min_limit', type: 'number' },
        { name: 'max_limit', type: 'number' },
        { name: 'target_value', type: 'number' },
        { name: 'unit', type: 'text' },
        { name: 'bypass_allowed', type: 'bool' },
        { name: 'bypass_authority_required', type: 'text' },
        { name: 'failure_message', type: 'text' },
        { name: 'source_doc', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'version', type: 'number' },

        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lpc_line_code ON line_process_constraints (line_code, rule_code)',
        'CREATE INDEX idx_lpc_stage ON line_process_constraints (stage)',
      ],
    })
    app.save(processConstraintsCol)

    // 3. Solicitações de Teste Técnico PCP (pcp_test_requests)
    const pcpTestRequestsCol = new Collection({
      name: 'pcp_test_requests',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'request_code', type: 'text', required: true },
        { name: 'company_code', type: 'text' },
        { name: 'line_code', type: 'text', required: true },
        { name: 'material_code', type: 'text' },
        { name: 'product_description', type: 'text' },
        { name: 'mp_block_number', type: 'text' },
        { name: 'proposed_application', type: 'text' },
        { name: 'test_quantity_tons', type: 'number' },
        { name: 'estimated_test_hours', type: 'number' },
        { name: 'test_parameters_json', type: 'json' },
        { name: 'bottleneck_matrix_snapshot', type: 'json' },
        { name: 'expected_throughput_gain_pct', type: 'number' },
        { name: 'technical_risks', type: 'text' },
        { name: 'justification', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: [
            'SOLICITADO',
            'EM_AVALIACAO_ENGENHARIA',
            'APROVADO_PARA_TESTE',
            'TESTE_EXECUTADO',
            'HOMOLOGADO',
            'REJEITADO',
          ],
          maxSelect: 1,
        },
        { name: 'requester_name', type: 'text' },
        { name: 'engineering_evaluator_name', type: 'text' },
        { name: 'engineering_parecer', type: 'text' },
        { name: 'mes_actual_result_json', type: 'json' },

        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ptr_code ON pcp_test_requests (request_code)',
        'CREATE INDEX idx_ptr_line ON pcp_test_requests (line_code, status)',
      ],
    })
    app.save(pcpTestRequestsCol)

    // 4. Seed Inicial das Matrizes de Referência das Planilhas CIAFAL (QUAD 130mm e 150mm, CISAM, Supervisório)
    const l1Line = app.findFirstRecordByData('production_lines', 'code', 'L1')
    const l2Line = app.findFirstRecordByData('production_lines', 'code', 'L2')

    const seedMatrices = [
      {
        line_id: l1Line.id,
        line_code: 'L1',
        material_code: '700142',
        product_family: 'QUAD_130',
        profile_shape: 'QUAD',
        gauge_dimension: '130x130',
        steel_grade: 'SAE 1020',
        billet_section_mm: 130,
        billet_length_m: 6.0,
        billet_weight_kg: 795,
        route_code: 'ROTA_L1_STD_130',
        passes_count: 6,
        veins_count: 1,
        furnace_capacity_th: 32.0,
        roughing_capacity_th: 29.5,
        continuous_mill_capacity_th: 24.8,
        shear_tr2_capacity_th: 27.5,
        cooling_bed_tcc_capacity_th: 26.1,
        straightener_capacity_th: 30.0,
        packaging_capacity_th: 34.0,
        primary_bottleneck_stage: 'TREM_CONTINUO',
        primary_bottleneck_rate_th: 24.8,
        secondary_bottleneck_stage: 'TCC_RESFRIAMENTO',
        secondary_bottleneck_rate_th: 26.1,
        bottleneck_gap_th: 1.3,
        max_tcc_bar_length_m: 72.0,
        max_tcc_bars_per_rack: 14,
        min_bar_interval_seconds: 3.2,
        max_crop_end_weight_kg: 15.0,
        standard_furnace_temp_c: 1180,
        thermal_curve_type: 'QUENTE',
        version: 1,
        status: 'VIGENTE',
        reference_doc: 'Matriz Gargalo QUAD 130 mm & Matriz Supervisório L1',
        source_authority: 'Engenharia de Processos & Metalurgia CIAFAL',
        responsible_name: 'Eng. Rodolfo Castro',
        approver_name: 'Ger. Fabrício Menezes',
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        notes:
          'Matriz oficial homologada para laminação de tarugo 130x130mm em 1 veio com corte TR2 e alimentação TCC.',
      },
      {
        line_id: l1Line.id,
        line_code: 'L1',
        material_code: '700145',
        product_family: 'QUAD_150',
        profile_shape: 'QUAD',
        gauge_dimension: '150x150',
        steel_grade: 'SAE 1045',
        billet_section_mm: 150,
        billet_length_m: 6.0,
        billet_weight_kg: 1060,
        route_code: 'ROTA_L1_HEAVY_150',
        passes_count: 8,
        veins_count: 1,
        furnace_capacity_th: 35.0,
        roughing_capacity_th: 28.0,
        continuous_mill_capacity_th: 27.2,
        shear_tr2_capacity_th: 26.5,
        cooling_bed_tcc_capacity_th: 23.7,
        straightener_capacity_th: 28.5,
        packaging_capacity_th: 32.0,
        primary_bottleneck_stage: 'TCC_RESFRIAMENTO',
        primary_bottleneck_rate_th: 23.7,
        secondary_bottleneck_stage: 'TESOURA_TR2',
        secondary_bottleneck_rate_th: 26.5,
        bottleneck_gap_th: 2.8,
        max_tcc_bar_length_m: 72.0,
        max_tcc_bars_per_rack: 14,
        min_bar_interval_seconds: 3.4,
        max_crop_end_weight_kg: 15.0,
        standard_furnace_temp_c: 1200,
        thermal_curve_type: 'QUENTE',
        version: 1,
        status: 'VIGENTE',
        reference_doc: 'Matriz Gargalo QUAD 150 mm & Matriz CISAM',
        source_authority: 'Engenharia de Processos CIAFAL',
        responsible_name: 'Eng. Rodolfo Castro',
        approver_name: 'Ger. Fabrício Menezes',
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        notes:
          'No tarugo 150x150mm com maior massa linear, o leito TCC atinge o limite térmico/dimensional e torna-se o gargalo primário (23.7 t/h).',
      },
      {
        line_id: l2Line.id,
        line_code: 'L2',
        material_code: '700210',
        product_family: 'PERFIS_L2',
        profile_shape: 'PERFIL',
        gauge_dimension: '130x130',
        steel_grade: 'SAE 5160',
        billet_section_mm: 130,
        billet_length_m: 7.5,
        billet_weight_kg: 994,
        route_code: 'ROTA_L2_SPECIAL',
        passes_count: 10,
        veins_count: 1,
        furnace_capacity_th: 26.0,
        roughing_capacity_th: 22.5,
        continuous_mill_capacity_th: 19.8,
        shear_tr2_capacity_th: 21.0,
        cooling_bed_tcc_capacity_th: 24.0,
        straightener_capacity_th: 18.2,
        packaging_capacity_th: 25.0,
        primary_bottleneck_stage: 'ENDIREITAMENTO',
        primary_bottleneck_rate_th: 18.2,
        secondary_bottleneck_stage: 'TREM_CONTINUO',
        secondary_bottleneck_rate_th: 19.8,
        bottleneck_gap_th: 1.6,
        max_tcc_bar_length_m: 68.0,
        max_tcc_bars_per_rack: 12,
        min_bar_interval_seconds: 4.0,
        max_crop_end_weight_kg: 15.0,
        standard_furnace_temp_c: 1190,
        thermal_curve_type: 'FRIO',
        version: 1,
        status: 'VIGENTE',
        reference_doc: 'Matriz de Gargalos Linha L2 Perfis Estruturais',
        source_authority: 'Engenharia de Processos CIAFAL',
        responsible_name: 'Eng. Rodolfo Castro',
        approver_name: 'Ger. Fabrício Menezes',
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        notes:
          'Para aços especiais na L2 que exigem endireitamento a frio, a capacidade da endireitadeira limita o throughput da linha em 18.2 t/h.',
      },
    ]

    for (const m of seedMatrices) {
      const rec = new Record(bottleneckMatrixCol)
      for (const [k, v] of Object.entries(m)) {
        rec.set(k, v)
      }
      app.save(rec)
    }

    // 5. Seed das Regras Estruturadas (Hard, Soft e Segurança)
    const seedConstraints = [
      {
        line_code: 'L1',
        rule_code: 'HARD_TCC_MAX_LENGTH',
        title: 'Comprimento Máximo de Barra na TCC',
        stage: 'TCC_RESFRIAMENTO',
        constraint_level: 'HARD_CONSTRAINT',
        parameter_key: 'max_tcc_bar_length_m',
        max_limit: 72.0,
        target_value: 68.0,
        unit: 'm',
        bypass_allowed: false,
        failure_message:
          'PLANO INVIÁVEL: Comprimento da barra ultrapassa o limite físico da TCC (72.0 m). Risco de enroscamento e colisão no leito.',
        source_doc: 'Manual Técnico de Operação TCC Linha L1',
        active: true,
        version: 1,
      },
      {
        line_code: 'L1',
        rule_code: 'HARD_TCC_RACK_OCCUPATION',
        title: 'Capacidade Máxima de Barras por Estrado TCC',
        stage: 'TCC_RESFRIAMENTO',
        constraint_level: 'HARD_CONSTRAINT',
        parameter_key: 'max_tcc_bars_per_rack',
        max_limit: 14,
        target_value: 12,
        unit: 'barras/estrado',
        bypass_allowed: false,
        failure_message:
          'PLANO INVIÁVEL: O corte proposto gera quantidade de barras por ciclo superior à capacidade mecânica dos dentes do estrado da TCC.',
        source_doc: 'Engenharia Mecânica CIAFAL L1',
        active: true,
        version: 1,
      },
      {
        line_code: 'L1',
        rule_code: 'SAFETY_MAX_CROP_END_WEIGHT',
        title: 'Peso Máximo de Pontas e Desponta de Segurança',
        stage: 'TESOURA_TR2',
        constraint_level: 'SAFETY_CONSTRAINT',
        parameter_key: 'max_crop_end_weight_kg',
        max_limit: 15.0,
        target_value: 12.0,
        unit: 'kg',
        bypass_allowed: false,
        failure_message:
          'PLANO INVIÁVEL — RESTRIÇÃO CRÍTICA DE SEGURANÇA: Peso da ponta excede o limite máximo permitido de 15.0 kg. Risco de quebra de faca da tesoura e emperramento na calha.',
        source_doc: 'Procedimento Operacional de Segurança PO-LAM-014',
        active: true,
        version: 1,
      },
      {
        line_code: 'L1',
        rule_code: 'SOFT_MIN_BAR_INTERVAL',
        title: 'Intervalo Mínimo entre Barras na Tesoura TR2',
        stage: 'TESOURA_TR2',
        constraint_level: 'SOFT_CONSTRAINT',
        parameter_key: 'min_bar_interval_seconds',
        min_limit: 3.2,
        target_value: 3.8,
        unit: 's',
        bypass_allowed: true,
        bypass_authority_required: 'GESTOR_LINHA',
        failure_message:
          'PLANO POSSÍVEL COM RESSALVA: Intervalo entre barras inferior a 3.2s pode provocar saturação da calha e microparadas.',
        source_doc: 'Matriz Gargalo Supervisório L1',
        active: true,
        version: 1,
      },
      {
        line_code: 'L1',
        rule_code: 'SOFT_THROUGHPUT_MIN_EFFICIENCY',
        title: 'Throughput Mínimo Aceitável no Gargalo Primário',
        stage: 'TREM_CONTINUO',
        constraint_level: 'SOFT_CONSTRAINT',
        parameter_key: 'min_throughput_th',
        min_limit: 21.0,
        target_value: 24.8,
        unit: 't/h',
        bypass_allowed: true,
        bypass_authority_required: 'PCP_PROGRAMADOR',
        failure_message:
          'PLANO POSSÍVEL COM RESSALVA: Capacidade produtiva do plano abaixo da meta histórica da linha (21.0 t/h). Requer justificativa de mix.',
        source_doc: 'Diretriz Corporativa de Eficiência CIAFAL',
        active: true,
        version: 1,
      },
    ]

    for (const c of seedConstraints) {
      const rec = new Record(processConstraintsCol)
      for (const [k, v] of Object.entries(c)) {
        rec.set(k, v)
      }
      app.save(rec)
    }
  },
  (app) => {
    try {
      const m = app.findCollectionByNameOrId('line_bottleneck_matrix')
      app.delete(m)
    } catch (_) {}
    try {
      const c = app.findCollectionByNameOrId('line_process_constraints')
      app.delete(c)
    } catch (_) {}
    try {
      const t = app.findCollectionByNameOrId('pcp_test_requests')
      app.delete(t)
    } catch (_) {}
  },
)
