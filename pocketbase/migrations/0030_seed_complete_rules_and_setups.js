migrate(
  (app) => {
    // 1. Obter coleções necessárias
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const familiesCol = app.findCollectionByNameOrId('product_families')
    const lineMastersCol = app.findCollectionByNameOrId('line_masters')
    const setupMatCol = app.findCollectionByNameOrId('line_setup_matrix')
    const stopsCol = app.findCollectionByNameOrId('standard_scheduled_stops')
    const coolingCol = app.findCollectionByNameOrId('cooling_times')
    const rulePacksCol = app.findCollectionByNameOrId('rule_packs')
    const doubleApprCol = app.findCollectionByNameOrId('line_double_approvals')
    const auditCol = app.findCollectionByNameOrId('rule_audit_logs')

    // Mapeamento de Linhas
    let l1 = null,
      l2 = null,
      enfL1 = null,
      acabL2 = null,
      endir = null
    try {
      l1 = app.findFirstRecordByData('production_lines', 'code', 'L1')
    } catch (_) {}
    try {
      l2 = app.findFirstRecordByData('production_lines', 'code', 'L2')
    } catch (_) {}
    try {
      enfL1 = app.findFirstRecordByData('production_lines', 'code', 'ENF_L1')
    } catch (_) {}
    try {
      acabL2 = app.findFirstRecordByData('production_lines', 'code', 'ACAB_L2')
    } catch (_) {}
    try {
      endir = app.findFirstRecordByData('production_lines', 'code', 'ENDIR')
    } catch (_) {}

    // Mapeamento de Famílias
    let famTQ = null,
      famTR = null,
      famTRed = null,
      famPU = null,
      famBar = null
    try {
      famTQ = app.findFirstRecordByData('product_families', 'code', 'TUB_QUAD')
    } catch (_) {}
    try {
      famTR = app.findFirstRecordByData('product_families', 'code', 'TUB_RET')
    } catch (_) {}
    try {
      famTRed = app.findFirstRecordByData('product_families', 'code', 'TUB_RED')
    } catch (_) {}
    try {
      famPU = app.findFirstRecordByData('product_families', 'code', 'PERF_U')
    } catch (_) {}
    try {
      famBar = app.findFirstRecordByData('product_families', 'code', 'BAR_CHATA')
    } catch (_) {}

    // Mapeamento de Line Masters
    let lm1 = null,
      lm2 = null
    try {
      lm1 = app.findFirstRecordByData('line_masters', 'code', 'L1')
    } catch (_) {}
    try {
      lm2 = app.findFirstRecordByData('line_masters', 'code', 'L2')
    } catch (_) {}

    // 2. Enriquecer line_setup_matrix com pares DE -> PARA completos e regras genéricas
    const setupSeeds = [
      {
        code: 'STP_L1_TQ_TQ_DIM',
        line_id: l1 ? l1.id : '',
        line_master_id: lm1 ? lm1.id : '',
        from_fam: famTQ ? famTQ.id : '',
        to_fam: famTQ ? famTQ.id : '',
        from_code: 'TQ-20x20',
        to_code: 'TQ-50x50',
        desc: 'Ajuste de Bitola Quadrada (20x20 -> 50x50)',
        setup_min: 45,
        impact: 'Ajuste de abertura de eixos e roletes de calibração.',
        source: 'SAP',
      },
      {
        code: 'STP_L1_TQ_TR',
        line_id: l1 ? l1.id : '',
        line_master_id: lm1 ? lm1.id : '',
        from_fam: famTQ ? famTQ.id : '',
        to_fam: famTR ? famTR.id : '',
        from_code: 'TQ-50x50',
        to_code: 'TR-80x40',
        desc: 'Transição Tubo Quadrado -> Tubo Retangular',
        setup_min: 90,
        impact: 'Troca de cassetes de conformação e afinação de esquadro.',
        source: 'MANUAL',
      },
      {
        code: 'STP_L1_TR_TRed',
        line_id: l1 ? l1.id : '',
        line_master_id: lm1 ? lm1.id : '',
        from_fam: famTR ? famTR.id : '',
        to_fam: famTRed ? famTRed.id : '',
        from_code: 'TR-80x40',
        to_code: 'TR-OD-50',
        desc: 'Transição Perfil Retangular -> Tubo Redondo',
        setup_min: 120,
        impact: 'Substituição completa do jogo de cilindros conformadores.',
        source: 'SAP',
      },
      {
        code: 'STP_L1_GEN_TRed',
        line_id: l1 ? l1.id : '',
        line_master_id: lm1 ? lm1.id : '',
        from_fam: '',
        to_fam: famTRed ? famTRed.id : '',
        from_code: '',
        to_code: 'TR-OD-GEN',
        desc: 'Regra Genérica: Entrada em Tubo Redondo',
        setup_min: 110,
        impact: 'Regra padrão quando não há transição específica DE->PARA cadastrada.',
        source: 'MANUAL',
      },
      {
        code: 'STP_L1_OUTDATED_EXAMPLE',
        line_id: l1 ? l1.id : '',
        line_master_id: lm1 ? lm1.id : '',
        from_fam: famTQ ? famTQ.id : '',
        to_fam: famTQ ? famTQ.id : '',
        from_code: 'TQ-100x100',
        to_code: 'TQ-100x100',
        desc: 'Troca de Ferramenta Tubo Estrutural 100x100 mm',
        setup_min: 180, // Valor histórico cadastrado no SAP
        impact:
          'Cadastrado no SAP como 180 min, mas histórico MES recente opera com mediana 118 min.',
        source: 'SAP',
      },
      {
        code: 'STP_L2_PU_TQ',
        line_id: l2 ? l2.id : '',
        line_master_id: lm2 ? lm2.id : '',
        from_fam: famPU ? famPU.id : '',
        to_fam: famTQ ? famTQ.id : '',
        from_code: 'PU-150x50',
        to_code: 'TQ-100x100',
        desc: 'Transição Perfil U Enrijecido -> Tubo Pesado L2',
        setup_min: 120,
        impact: 'Montagem de mandris pesados e troca de cabeçote de solda.',
        source: 'MANUAL',
      },
      {
        code: 'STP_L2_PU_PU_ESP',
        line_id: l2 ? l2.id : '',
        line_master_id: lm2 ? lm2.id : '',
        from_fam: famPU ? famPU.id : '',
        to_fam: famPU ? famPU.id : '',
        from_code: 'PU-100x40',
        to_code: 'PU-150x50',
        desc: 'Ajuste de Aba e Espessura Perfil U',
        setup_min: 60,
        impact: 'Regulagem das matrizes de dobra e espaçadores.',
        source: 'SAP',
      },
      {
        code: 'STP_L2_GEN_PU',
        line_id: l2 ? l2.id : '',
        line_master_id: lm2 ? lm2.id : '',
        from_fam: '',
        to_fam: famPU ? famPU.id : '',
        from_code: '',
        to_code: 'PU-GEN',
        desc: 'Regra Genérica: Entrada em Perfis U Dobrados',
        setup_min: 80,
        impact: 'Regra padrão para a Linha L2.',
        source: 'MANUAL',
      },
    ]

    for (const s of setupSeeds) {
      try {
        app.findFirstRecordByData('line_setup_matrix', 'setup_code', s.code)
      } catch (_) {
        const rec = new Record(setupMatCol)
        rec.set('setup_code', s.code)
        rec.set('setup_description', s.desc)
        rec.set('setup_category', 'TOOL_CHANGE')
        if (s.line_id) rec.set('line_id', s.line_id)
        if (s.line_master_id) rec.set('line_master_id', s.line_master_id)
        if (s.from_fam) rec.set('from_family_id', s.from_fam)
        if (s.to_fam) rec.set('to_family_id', s.to_fam)
        if (s.from_code) rec.set('from_product_code', s.from_code)
        if (s.to_code) rec.set('to_product_code', s.to_code)
        rec.set('setup_duration_minutes', s.setup_min)
        rec.set('capacity_loss_impact', s.impact)
        rec.set('source_mode', s.source)
        rec.set('active', true)
        rec.set('valid_from', '2026-01-01 00:00:00.000Z')
        app.save(rec)
      }
    }

    // 3. Enriquecer Paradas Programadas (standard_scheduled_stops)
    const stopSeeds = [
      {
        code: 'LIMP_AUTONOMA_L1',
        desc: 'Limpeza Autônoma e Desobstrução de Cavacos L1',
        cat: 'CLEANING',
        rec: 'PER_SHIFT',
        dur: 20,
        time: '05:40',
        shift: 'Todos os Turnos',
        line_id: l1 ? l1.id : '',
        impact: '1.0h/dia perdida — Impacto: 120t/dia',
      },
      {
        code: 'AFERICAO_SENSORES_L2',
        desc: 'Calibração Óptica de Laser e Medição Dimensional L2',
        cat: 'CALIBRATION',
        rec: 'WEEKLY',
        dur: 90,
        time: '12:00',
        shift: 'T2_L2',
        line_id: l2 ? l2.id : '',
        impact: '6h/mês — Impacto: 900t/mês',
      },
      {
        code: 'PREV_ELETRICA_MENSAL_L1',
        desc: 'Inspeção Termográfica e Painéis Elétricos L1',
        cat: 'PREVENTIVE_MAINTENANCE',
        rec: 'MONTHLY',
        dur: 360,
        time: '06:00',
        shift: 'T1_L1',
        line_id: l1 ? l1.id : '',
        impact: '6h/mês de parada total — Perda estimada: 720t',
      },
    ]

    for (const st of stopSeeds) {
      try {
        app.findFirstRecordByData('standard_scheduled_stops', 'code', st.code)
      } catch (_) {
        const rec = new Record(stopsCol)
        rec.set('code', st.code)
        rec.set('description', st.desc)
        rec.set('category', st.cat)
        rec.set('recurrence', st.rec)
        rec.set('expected_duration_minutes', st.dur)
        rec.set('scheduled_time', st.time)
        rec.set('applicable_shift', st.shift)
        rec.set('expected_impact', st.impact)
        if (st.line_id) rec.set('line_id', st.line_id)
        rec.set('active', true)
        rec.set('valid_from', '2026-01-01 00:00:00.000Z')
        app.save(rec)
      }
    }

    // 4. Enriquecer Histórico & Auditoria (rule_audit_logs)
    const auditSeeds = [
      {
        parameter_name: 'Setup STP_TQ_TR_L1 (L1)',
        entity_type: 'SETUP_MATRIX',
        entity_id: '00qlmxa8qj5i4vv',
        previous_value: '110 min',
        new_value: '90 min',
        user_name: 'Carlos Alberto (PCP)',
        user_email: 'carlos.alberto@ciafal.com.br',
        change_date: '15/08/2026 10:30',
        reason: 'Otimização com novo ferramental de encaixe rápido',
        origin: 'MANUAL',
        mes_validation_status: 'VALIDADO',
        ai_recommendation: '🟢 COERENTE — Mediana histórica MES de 88 min nos últimos 4 meses.',
        approver_name: 'Roberto Silva (Gerência Industrial)',
        published_at: '15/08/2026 14:00',
      },
      {
        parameter_name: 'Resfriamento PU-150x50x4.75 (L2 -> ENDIR)',
        entity_type: 'COOLING_TIME',
        entity_id: 'owm9gzvmhkkq1tw',
        previous_value: '48 h',
        new_value: '36 h',
        user_name: 'Fernanda Lima (Eng. Metalúrgica)',
        user_email: 'fernanda.lima@ciafal.com.br',
        change_date: '10/08/2026 16:45',
        reason: 'Instalação de exaustores forçados no leito de resfriamento',
        origin: 'ENGENHARIA',
        mes_validation_status: 'VALIDADO',
        ai_recommendation: '🟢 COERENTE — Ensaios metalúrgicos confirmaram alívio térmico em 36h.',
        approver_name: 'Roberto Silva (Gerência Industrial)',
        published_at: '11/08/2026 09:15',
      },
      {
        parameter_name: 'Parada Preventiva MANUT_PREV_L1',
        entity_type: 'SCHEDULED_STOP',
        entity_id: 'zn6urtui5f0fpwe',
        previous_value: '240 min',
        new_value: '180 min',
        user_name: 'Equipe de Manutenção',
        user_email: 'manutencao@ciafal.com.br',
        change_date: '02/08/2026 08:00',
        reason: 'Padronização SMED e checklist pré-montado',
        origin: 'MES',
        mes_validation_status: 'VALIDADO',
        ai_recommendation:
          '🟢 COERENTE — Tempo médio realizado nas últimas 8 semanas foi de 176 min.',
        approver_name: 'Carlos Alberto (PCP)',
        published_at: '02/08/2026 11:30',
      },
    ]

    for (const a of auditSeeds) {
      try {
        app.findFirstRecordByData('rule_audit_logs', 'parameter_name', a.parameter_name)
      } catch (_) {
        const rec = new Record(auditCol)
        rec.set('parameter_name', a.parameter_name)
        rec.set('entity_type', a.entity_type)
        rec.set('entity_id', a.entity_id)
        rec.set('previous_value', a.previous_value)
        rec.set('new_value', a.new_value)
        rec.set('user_name', a.user_name)
        rec.set('user_email', a.user_email)
        rec.set('change_date', a.change_date)
        rec.set('reason', a.reason)
        rec.set('origin', a.origin)
        rec.set('mes_validation_status', a.mes_validation_status)
        rec.set('ai_recommendation', a.ai_recommendation)
        rec.set('approver_name', a.approver_name)
        rec.set('published_at', a.published_at)
        app.save(rec)
      }
    }

    // 5. Enriquecer Revisões Pendentes (line_double_approvals)
    const pendingSeeds = [
      {
        entity_type: 'SETUP',
        entity_id: 'STP_L1_OUTDATED_EXAMPLE',
        line_code: 'L1',
        version: 'v2.0 (Proposta)',
        change_reason:
          'Ajuste do setup de 180 min -> 120 min sugerido pela IA baseado no histórico MES',
        status: 'PENDING_PCP',
      },
      {
        entity_type: 'COOLING',
        entity_id: 'lhjgabe761fcm2e',
        line_code: 'L1 -> ENDIR',
        version: 'v1.1 (Proposta)',
        change_reason:
          'Redução de tempo de resfriamento de tarugo pesado de 24h para 20h com ventilação assistida',
        status: 'PENDING_LINE_MANAGER',
      },
    ]

    for (const p of pendingSeeds) {
      try {
        app.findFirstRecordByData('line_double_approvals', 'entity_id', p.entity_id)
      } catch (_) {
        const rec = new Record(doubleApprCol)
        rec.set('entity_type', p.entity_type)
        rec.set('entity_id', p.entity_id)
        rec.set('line_code', p.line_code)
        rec.set('version', p.version)
        rec.set('change_reason', p.change_reason)
        rec.set('status', p.status)
        app.save(rec)
      }
    }
  },
  (app) => {
    // Reversão limpa
  },
)
