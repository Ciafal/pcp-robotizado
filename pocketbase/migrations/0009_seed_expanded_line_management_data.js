migrate(
  (app) => {
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const usersCol = app.findCollectionByNameOrId('users')
    const sapCatCol = app.findCollectionByNameOrId('sap_integration_catalog')
    const famCol = app.findCollectionByNameOrId('product_families')
    const masterCol = app.findCollectionByNameOrId('line_masters')
    const orgCol = app.findCollectionByNameOrId('line_org_hierarchy')
    const mgrCol = app.findCollectionByNameOrId('line_managers_assignment')
    const appCol = app.findCollectionByNameOrId('line_approvers_matrix')
    const seqCol = app.findCollectionByNameOrId('line_sequencing_dependencies')
    const prodCol = app.findCollectionByNameOrId('line_productivity_rates')
    const rmpCol = app.findCollectionByNameOrId('line_raw_material_priorities')
    const blkCol = app.findCollectionByNameOrId('line_blocked_products')
    const stpMatCol = app.findCollectionByNameOrId('line_setup_matrix')

    // 1. Obter usuários chave
    let adminUser = null
    let gestorL1 = null
    let gestorL2 = null
    let lucasPcp = null
    let dirMariana = null
    try {
      adminUser = app.findAuthRecordByEmail('users', 'ciafal@ciafal.com.br')
    } catch (_) {}
    try {
      gestorL1 = app.findAuthRecordByEmail('users', 'gestor.l1@ciafal.com.br')
    } catch (_) {}
    try {
      gestorL2 = app.findAuthRecordByEmail('users', 'gestor.l2@ciafal.com.br')
    } catch (_) {}
    try {
      lucasPcp = app.findAuthRecordByEmail('users', 'programador.pcp@ciafal.com.br')
    } catch (_) {}
    try {
      dirMariana = app.findAuthRecordByEmail('users', 'diretor.industrial@ciafal.com.br')
    } catch (_) {}

    // 2. Seed Catálogo Central de Integrações SAP
    const sapCatalogEntries = [
      {
        code: 'SAP_BAPI_PROD_RATES',
        description: 'BAPI Standard de Produtividade e Cadência de Centros de Trabalho',
        integration_type: 'RFC_BAPI',
        function_name: 'BAPI_ROUTING_GET_DETAIL',
        standard_or_z: 'STANDARD',
        source_object: 'CRHD / AFVC / MAPL',
        active: true,
        last_status: 'CONECTADO',
        last_sync_records_count: 142,
        technical_responsible: 'Equipe ABAP / Basis CIAFAL',
        homologation_date: '2026-02-15 00:00:00.000Z',
        environment: 'PRD (ECC 6.0 EHP8)',
        system_version: 'SAP ECC 6.08',
      },
      {
        code: 'SAP_Z_RAW_MAT_PRIO',
        description: 'Função Customizada CIAFAL de Priorização e Saldo de Bobinas / Matéria-Prima',
        integration_type: 'RFC_BAPI',
        function_name: 'Z_CIAFAL_PCP_RAW_MAT_PRIORITY',
        standard_or_z: 'Z_CUSTOM',
        source_object: 'MARD / ZMM_BOBINAS_PRIO',
        active: true,
        last_status: 'CONECTADO',
        last_sync_records_count: 88,
        technical_responsible: 'Consultoria SAP MM/PP CIAFAL',
        homologation_date: '2026-03-01 00:00:00.000Z',
        environment: 'PRD (ECC 6.0 EHP8)',
        system_version: 'CUSTOM CIAFAL v2.1',
      },
      {
        code: 'SAP_Z_PRODUCT_BLOCKS',
        description:
          'Extrator Customizado CIAFAL de Bloqueios de Materiais e Restrições de Qualidade',
        integration_type: 'RFC_BAPI',
        function_name: 'Z_CIAFAL_PP_BLOCKED_MATERIALS',
        standard_or_z: 'Z_CUSTOM',
        source_object: 'MARA-MSTAE / ZQM_BLOQUEIOS',
        active: true,
        last_status: 'CONECTADO',
        last_sync_records_count: 19,
        technical_responsible: 'Consultoria SAP QM/PP CIAFAL',
        homologation_date: '2026-03-10 00:00:00.000Z',
        environment: 'PRD (ECC 6.0 EHP8)',
        system_version: 'CUSTOM CIAFAL v1.4',
      },
      {
        code: 'SAP_BAPI_SETUPS',
        description: 'BAPI Standard de Matriz de Troca de Ferramental e Tempos de Transição',
        integration_type: 'RFC_BAPI',
        function_name: 'BAPI_WORKCENTER_GETDETAIL',
        standard_or_z: 'STANDARD',
        source_object: 'CRHD / TC25 / TC28',
        active: true,
        last_status: 'CONECTADO',
        last_sync_records_count: 54,
        technical_responsible: 'Equipe Basis CIAFAL',
        homologation_date: '2026-01-20 00:00:00.000Z',
        environment: 'PRD (ECC 6.0 EHP8)',
        system_version: 'SAP ECC 6.08',
      },
    ]

    const savedSapCatalog = {}
    for (const cat of sapCatalogEntries) {
      try {
        const existing = app.findFirstRecordByData('sap_integration_catalog', 'code', cat.code)
        savedSapCatalog[cat.code] = existing
      } catch (_) {
        const rec = new Record(sapCatCol)
        rec.set('code', cat.code)
        rec.set('description', cat.description)
        rec.set('integration_type', cat.integration_type)
        rec.set('function_name', cat.function_name)
        rec.set('standard_or_z', cat.standard_or_z)
        rec.set('source_object', cat.source_object)
        rec.set('active', cat.active)
        rec.set('last_status', cat.last_status)
        rec.set('last_sync_records_count', cat.last_sync_records_count)
        rec.set('technical_responsible', cat.technical_responsible)
        rec.set('homologation_date', cat.homologation_date)
        rec.set('environment', cat.environment)
        rec.set('system_version', cat.system_version)
        app.save(rec)
        savedSapCatalog[cat.code] = rec
      }
    }

    // 3. Mapear linhas existentes
    const allLines = app.findRecordsByFilter('production_lines', '', 'code', 50, 0)
    const lineMap = {}
    for (const l of allLines) {
      lineMap[l.getString('code')] = l
    }

    // Famílias existentes
    const savedFam = {}
    const fams = app.findRecordsByFilter('product_families', '', 'code', 50, 0)
    for (const f of fams) {
      savedFam[f.getString('code')] = f
    }

    // Masters existentes
    const savedMasters = {}
    const masters = app.findRecordsByFilter('line_masters', "status = 'ACTIVE'", 'code', 50, 0)
    for (const m of masters) {
      savedMasters[m.getString('code')] = m
    }

    // 4. Seed Hierarquia Organizacional por Linha
    const hierarchyLevels = [
      {
        order: 1,
        level: 'Diretoria Industrial',
        area: 'Diretoria de Operações',
        title: 'Diretora Industrial',
        user: dirMariana,
      },
      {
        order: 2,
        level: 'Gerência Industrial',
        area: 'Gerência de Produção e Laminação',
        title: 'Gerente Industrial',
        user: adminUser,
      },
      {
        order: 3,
        level: 'Supervisão de Turno',
        area: 'Supervisão Geral de Fábrica',
        title: 'Supervisor Fabril',
        user: gestorL2,
      },
      {
        order: 4,
        level: 'Gestor da Linha',
        area: 'Operação de Linha de Produção',
        title: 'Gestor Titular da Linha',
        user: gestorL1,
      },
    ]

    for (const lineCode of ['L1', 'L2', 'ENF_L1', 'ACAB_L1', 'ENDIR', 'RETRAB']) {
      const lineRec = lineMap[lineCode]
      if (!lineRec) continue

      for (const h of hierarchyLevels) {
        try {
          const existing = app.findRecordsByFilter(
            'line_org_hierarchy',
            `line_id = '${lineRec.id}' && org_level_order = ${h.order}`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const orgRec = new Record(orgCol)
            orgRec.set('line_id', lineRec.id)
            orgRec.set('org_level_name', h.level)
            orgRec.set('org_level_order', h.order)
            orgRec.set('area_name', h.area)
            orgRec.set('job_title', h.title)
            if (h.user) orgRec.set('user_id', h.user.id)
            orgRec.set('integration_status', 'CONECTADO_HUB')
            orgRec.set('active', true)
            orgRec.set('notes', `Hierarquia homologada no HUB Industrial para a linha ${lineCode}`)
            app.save(orgRec)
          }
        } catch (_) {}
      }
    }

    // 5. Seed Gestores da Linha (line_managers_assignment)
    if (lineMap['L1'] && gestorL1) {
      try {
        const exist = app.findRecordsByFilter(
          'line_managers_assignment',
          `line_id = '${lineMap['L1'].id}'`,
          '',
          1,
          0,
        )
        if (exist.length === 0) {
          const m1 = new Record(mgrCol)
          m1.set('line_id', lineMap['L1'].id)
          m1.set('user_id', gestorL1.id)
          m1.set('responsibility_type', 'PRIMARY_MANAGER')
          m1.set('role_title', 'Gestor Titular da Linha L1')
          m1.set('active', true)
          m1.set('valid_from', '2026-01-01 00:00:00.000Z')
          m1.set(
            'scope_description',
            'Responsável operacional, aprovação e liberação de turnos na Linha L1',
          )
          app.save(m1)

          if (gestorL2) {
            const m2 = new Record(mgrCol)
            m2.set('line_id', lineMap['L1'].id)
            m2.set('user_id', gestorL2.id)
            m2.set('responsibility_type', 'SUBSTITUTE_MANAGER')
            m2.set('role_title', 'Gestor Substituto L1 / Titular L2')
            m2.set('active', true)
            m2.set('valid_from', '2026-01-01 00:00:00.000Z')
            m2.set('scope_description', 'Substituição em férias e escalas extraordinárias')
            app.save(m2)
          }
        }
      } catch (_) {}
    }

    if (lineMap['L2'] && gestorL2) {
      try {
        const exist = app.findRecordsByFilter(
          'line_managers_assignment',
          `line_id = '${lineMap['L2'].id}'`,
          '',
          1,
          0,
        )
        if (exist.length === 0) {
          const m1 = new Record(mgrCol)
          m1.set('line_id', lineMap['L2'].id)
          m1.set('user_id', gestorL2.id)
          m1.set('responsibility_type', 'PRIMARY_MANAGER')
          m1.set('role_title', 'Gestor Titular da Linha L2')
          m1.set('active', true)
          m1.set('valid_from', '2026-01-01 00:00:00.000Z')
          m1.set('scope_description', 'Responsável operacional pela Linha Pesada L2')
          app.save(m1)
        }
      } catch (_) {}
    }

    // 6. Seed Matriz de Aprovadores (line_approvers_matrix)
    const approverSeeds = [
      {
        line: 'L1',
        type: 'PCP_APPROVAL',
        stage: 'STAGE_1_PCP',
        seq: 1,
        user: lucasPcp || adminUser,
        role_title: 'Programador PCP Homologador',
        req: 'MANDATORY',
        sub: adminUser,
      },
      {
        line: 'L1',
        type: 'LINE_MANAGER_APPROVAL',
        stage: 'STAGE_2_LINE_MANAGER',
        seq: 2,
        user: gestorL1 || adminUser,
        role_title: 'Gestor Operacional da Linha L1',
        req: 'MANDATORY',
        sub: gestorL2,
      },
      {
        line: 'L2',
        type: 'PCP_APPROVAL',
        stage: 'STAGE_1_PCP',
        seq: 1,
        user: lucasPcp || adminUser,
        role_title: 'Programador PCP Homologador',
        req: 'MANDATORY',
        sub: adminUser,
      },
      {
        line: 'L2',
        type: 'LINE_MANAGER_APPROVAL',
        stage: 'STAGE_2_LINE_MANAGER',
        seq: 2,
        user: gestorL2 || adminUser,
        role_title: 'Gestor Operacional da Linha L2',
        req: 'MANDATORY',
        sub: gestorL1,
      },
      {
        line: 'ENF_L1',
        type: 'PCP_APPROVAL',
        stage: 'STAGE_1_PCP',
        seq: 1,
        user: lucasPcp || adminUser,
        role_title: 'Programador PCP',
        req: 'MANDATORY',
      },
      {
        line: 'ENF_L1',
        type: 'LINE_MANAGER_APPROVAL',
        stage: 'STAGE_2_LINE_MANAGER',
        seq: 2,
        user: gestorL1 || adminUser,
        role_title: 'Gestor Forno',
        req: 'OPTIONAL', // Forno com aprovação opcional conforme regra 43
      },
    ]

    for (const ap of approverSeeds) {
      const lineRec = lineMap[ap.line]
      if (!lineRec || !ap.user) continue
      try {
        const exist = app.findRecordsByFilter(
          'line_approvers_matrix',
          `line_id = '${lineRec.id}' && approval_stage = '${ap.stage}'`,
          '',
          1,
          0,
        )
        if (exist.length === 0) {
          const rec = new Record(appCol)
          rec.set('line_id', lineRec.id)
          rec.set('approval_type', ap.type)
          rec.set('approval_stage', ap.stage)
          rec.set('sequence_order', ap.seq)
          rec.set('user_id', ap.user.id)
          rec.set('role_title', ap.role_title)
          rec.set('requirement_type', ap.req)
          if (ap.sub) rec.set('substitute_user_id', ap.sub.id)
          rec.set('active', true)
          rec.set('valid_from', '2026-01-01 00:00:00.000Z')
          app.save(rec)
        }
      } catch (_) {}
    }

    // 7. Seed Sequenciamento e Dependências Produtivas (line_sequencing_dependencies)
    const seqConfigs = [
      {
        line: 'L1',
        prev_proc: 'Pátio de Bobinas e Corte Slitter',
        next_proc: 'Tratamento Térmico / Forno Contínuo',
        next_line: 'ENF_L1',
        seq: 1,
        nature: 'MANDATORY',
        dep_type: 'BUFFER_REQUIRED',
        lead_time: 45,
        buf_type: 'Pulmão Intermediário L1 -> ENF',
        buf_cap: 180,
        buf_unit: 't',
        notes: 'L1 alimenta o pulmão intermediário do Forno ENF_L1.',
      },
      {
        line: 'ENF_L1',
        prev_proc: 'Conformação e Solda L1',
        prev_line: 'L1',
        next_proc: 'Corte e Acabamento Final L1',
        next_line: 'ACAB_L1',
        seq: 2,
        nature: 'MANDATORY',
        dep_type: 'FINISH_TO_START',
        lead_time: 60,
        buf_type: 'Mesa de Resfriamento Lenta',
        buf_cap: 90,
        buf_unit: 't',
        notes: 'Alívio de tensões após solda L1 antes do acabamento.',
      },
      {
        line: 'L2',
        prev_proc: 'Pátio de Matéria-Prima Pesada',
        next_proc: 'Célula de Acabamento e Embalagem L2',
        next_line: 'ACAB_L2',
        seq: 1,
        nature: 'MANDATORY',
        dep_type: 'TRANSFER_BATCH',
        lead_time: 30,
        buf_type: 'Baia de Transferência L2 -> Acabamento',
        buf_cap: 250,
        buf_unit: 't',
        notes: 'Transferência de lotes conformados para serra e cintamento.',
      },
    ]

    for (const sc of seqConfigs) {
      const lineRec = lineMap[sc.line]
      if (!lineRec) continue
      try {
        const exist = app.findRecordsByFilter(
          'line_sequencing_dependencies',
          `line_id = '${lineRec.id}' && sequence_order = ${sc.seq}`,
          '',
          1,
          0,
        )
        if (exist.length === 0) {
          const rec = new Record(seqCol)
          rec.set('line_id', lineRec.id)
          if (sc.prev_proc) rec.set('previous_process_name', sc.prev_proc)
          if (sc.prev_line && lineMap[sc.prev_line])
            rec.set('previous_line_id', lineMap[sc.prev_line].id)
          if (sc.next_proc) rec.set('next_process_name', sc.next_proc)
          if (sc.next_line && lineMap[sc.next_line])
            rec.set('next_line_id', lineMap[sc.next_line].id)
          rec.set('sequence_order', sc.seq)
          rec.set('relation_nature', sc.nature)
          rec.set('dependency_type', sc.dep_type)
          rec.set('standard_lead_time_minutes', sc.lead_time)
          rec.set('intermediate_buffer_type', sc.buf_type)
          rec.set('intermediate_buffer_capacity', sc.buf_cap)
          rec.set('intermediate_buffer_unit', sc.buf_unit)
          rec.set('notes', sc.notes)
          rec.set('active', true)
          app.save(rec)
        }
      } catch (_) {}
    }

    // 8. Seed Produtividade (line_productivity_rates)
    const prodConfigs = [
      {
        line: 'L1',
        fam: 'TUB_QUAD',
        prod_code: 'TQ-50x50x2.0',
        prod_name: 'Tubo Quadrado 50x50x2.0mm',
        dim: '50x50 mm #2.00',
        unit: 't/h',
        nominal: 12.5,
        planned: 11.8,
        eff: 94.4,
        source: 'MANUAL',
        notes: 'Velocidade de solda HF padrão 65 m/min',
      },
      {
        line: 'L1',
        fam: 'TUB_RET',
        prod_code: 'TR-80x40x2.5',
        prod_name: 'Tubo Retangular 80x40x2.5mm',
        dim: '80x40 mm #2.50',
        unit: 't/h',
        nominal: 11.0,
        planned: 10.2,
        eff: 92.7,
        source: 'SAP',
        sap_cat: 'SAP_BAPI_PROD_RATES',
        notes: 'Sincronizado via RFC BAPI_ROUTING_GET_DETAIL',
      },
      {
        line: 'L2',
        fam: 'PERF_U',
        prod_code: 'PU-150x50x4.75',
        prod_name: 'Perfil U Enrijecido 150x50x4.75mm',
        dim: '150x50 mm #4.75',
        unit: 't/h',
        nominal: 18.0,
        planned: 16.5,
        eff: 91.6,
        source: 'MANUAL',
        notes: 'Conformação pesada com corte automático a frio',
      },
      {
        line: 'ACAB_L2',
        fam: 'PERF_U',
        prod_code: 'PU-150x50-EMB',
        prod_name: 'Embalagem e Cintamento Perfil U',
        dim: 'Feixe 5000kg',
        unit: 'peça/h',
        nominal: 150.0,
        planned: 140.0,
        eff: 93.3,
        source: 'MANUAL',
        notes: 'Cintamento com fitas de alta tensão',
      },
    ]

    for (const p of prodConfigs) {
      const lineRec = lineMap[p.line]
      const famRec = savedFam[p.fam]
      const masterRec = savedMasters[p.line]
      if (!lineRec) continue
      try {
        const exist = app.findRecordsByFilter(
          'line_productivity_rates',
          `line_id = '${lineRec.id}' && material_product_code = '${p.prod_code}'`,
          '',
          1,
          0,
        )
        if (exist.length === 0) {
          const rec = new Record(prodCol)
          rec.set('line_id', lineRec.id)
          if (masterRec) rec.set('line_master_id', masterRec.id)
          if (famRec) rec.set('product_family_id', famRec.id)
          rec.set('material_product_code', p.prod_code)
          rec.set('material_product_name', p.prod_name)
          rec.set('dimension_spec', p.dim)
          rec.set('productivity_unit', p.unit)
          rec.set('nominal_productivity', p.nominal)
          rec.set('planned_productivity', p.planned)
          rec.set('expected_efficiency_pct', p.eff)
          rec.set('source_mode', p.source)
          if (p.sap_cat && savedSapCatalog[p.sap_cat]) {
            rec.set('sap_integration_id', savedSapCatalog[p.sap_cat].id)
          }
          rec.set('notes', p.notes)
          rec.set('active', true)
          rec.set('valid_from', '2026-01-01 00:00:00.000Z')
          app.save(rec)
        }
      } catch (_) {}
    }

    // 9. Seed Prioridades de Matéria-Prima (line_raw_material_priorities)
    const prioConfigs = [
      {
        line: 'L1',
        mat_code: 'BOB_CSN_BQ_1012',
        mat_desc: 'Bobina Laminada a Quente SAE 1012 (CSN)',
        group: 'Bobinas BQ',
        fam: 'TUB_QUAD',
        origin: 'CSN Volta Redonda',
        priority: 1, // 1 = Máxima prioridade
        cond: 'Utilizar preferencialmente para tubos estruturais com garantia de solda HF',
        source: 'MANUAL',
      },
      {
        line: 'L1',
        mat_code: 'BOB_USI_BQ_1010',
        mat_desc: 'Bobina Laminada a Quente SAE 1010 (Usiminas)',
        group: 'Bobinas BQ',
        fam: 'TUB_QUAD',
        origin: 'Usiminas Ipatinga',
        priority: 2,
        cond: 'Segunda opção de fornecimento homologada',
        source: 'SAP',
        sap_cat: 'SAP_Z_RAW_MAT_PRIO',
      },
      {
        line: 'L1',
        mat_code: 'BOB_GER_BQ_1008',
        mat_desc: 'Bobina BQ Baixo Carbono (Gerdau)',
        group: 'Bobinas BQ',
        fam: 'TUB_RET',
        origin: 'Gerdau Ouro Branco',
        priority: 3,
        cond: 'Destinar a produtos de menor espessura (#1.20 a #1.50)',
        source: 'MANUAL',
      },
    ]

    for (const pr of prioConfigs) {
      const lineRec = lineMap[pr.line]
      const famRec = savedFam[pr.fam]
      const masterRec = savedMasters[pr.line]
      if (!lineRec) continue
      try {
        const exist = app.findRecordsByFilter(
          'line_raw_material_priorities',
          `line_id = '${lineRec.id}' && material_code = '${pr.mat_code}'`,
          '',
          1,
          0,
        )
        if (exist.length === 0) {
          const rec = new Record(rmpCol)
          rec.set('line_id', lineRec.id)
          if (masterRec) rec.set('line_master_id', masterRec.id)
          rec.set('material_code', pr.mat_code)
          rec.set('material_description', pr.mat_desc)
          rec.set('material_group', pr.group)
          if (famRec) rec.set('product_family_id', famRec.id)
          rec.set('material_origin', pr.origin)
          rec.set('priority_order', pr.priority)
          rec.set('condition_rule', pr.cond)
          rec.set('source_mode', pr.source)
          if (pr.sap_cat && savedSapCatalog[pr.sap_cat]) {
            rec.set('sap_integration_id', savedSapCatalog[pr.sap_cat].id)
          }
          rec.set('active', true)
          rec.set('valid_from', '2026-01-01 00:00:00.000Z')
          app.save(rec)
        }
      } catch (_) {}
    }

    // 10. Seed Produtos Bloqueados (line_blocked_products)
    const blockConfigs = [
      {
        line: 'L1',
        prod_code: 'TQ-100x100x8.0',
        prod_desc: 'Tubo Quadrado 100x100x8.0mm Parede Extrapesada',
        fam: 'TUB_QUAD',
        reason:
          'Espessura 8.0mm excede capacidade mecânica de tração e conformação de roletes da Linha L1 (máx 6.35mm). Deve ser direcionado para Linha L2.',
        block_type: 'TECHNICAL',
        user: adminUser,
        source: 'MANUAL',
      },
      {
        line: 'L1',
        prod_code: 'TQ-GALV-40x40',
        prod_desc: 'Tubo Pré-Galvanizado 40x40mm',
        fam: 'TUB_QUAD',
        reason:
          'Emissão de vapores de zinco no cabeçote de solda HF sem exaustão dedicada instalada. Bloqueio preventivo de segurança.',
        block_type: 'PROCESS',
        user: gestorL1,
        source: 'SAP',
        sap_cat: 'SAP_Z_PRODUCT_BLOCKS',
      },
      {
        line: 'L2',
        prod_code: 'PU-FINO-1.20',
        prod_desc: 'Perfil U Chapa Fina #1.20mm',
        fam: 'PERF_U',
        reason: 'Risco de ondulamento e deformação no trem de tração de alta tonelagem L2.',
        block_type: 'CAPACITY',
        user: gestorL2,
        source: 'MANUAL',
      },
    ]

    for (const b of blockConfigs) {
      const lineRec = lineMap[b.line]
      const famRec = savedFam[b.fam]
      const masterRec = savedMasters[b.line]
      if (!lineRec) continue
      try {
        const exist = app.findRecordsByFilter(
          'line_blocked_products',
          `line_id = '${lineRec.id}' && product_code = '${b.prod_code}'`,
          '',
          1,
          0,
        )
        if (exist.length === 0) {
          const rec = new Record(blkCol)
          rec.set('line_id', lineRec.id)
          if (masterRec) rec.set('line_master_id', masterRec.id)
          rec.set('product_code', b.prod_code)
          rec.set('product_description', b.prod_desc)
          if (famRec) rec.set('product_family_id', famRec.id)
          rec.set('block_reason', b.reason)
          rec.set('block_type', b.block_type)
          if (b.user) rec.set('responsible_user_id', b.user.id)
          rec.set('source_mode', b.source)
          if (b.sap_cat && savedSapCatalog[b.sap_cat]) {
            rec.set('sap_integration_id', savedSapCatalog[b.sap_cat].id)
          }
          rec.set('active', true)
          rec.set('valid_from', '2026-01-01 00:00:00.000Z')
          app.save(rec)
        }
      } catch (_) {}
    }

    // 11. Seed Matriz de Setup (line_setup_matrix)
    const setupMatrixConfigs = [
      {
        line: 'L1',
        code: 'STP_TQ_TR_L1',
        desc: 'Transição Tubo Quadrado -> Tubo Retangular',
        cat: 'TOOL_CHANGE',
        from_fam: 'TUB_QUAD',
        to_fam: 'TUB_RET',
        duration: 90,
        impact: 'Troca completa de cassetes de conformação e calibração de esquadro',
        source: 'MANUAL',
      },
      {
        line: 'L1',
        code: 'STP_TQ_TQ_DIM',
        desc: 'Mudança de Bitola Quadrada (20x20 -> 50x50)',
        cat: 'DIMENSION_CHANGE',
        from_fam: 'TUB_QUAD',
        to_fam: 'TUB_QUAD',
        duration: 45,
        impact: 'Ajuste de abertura de eixos e troca de roletes guias',
        source: 'SAP',
        sap_cat: 'SAP_BAPI_SETUPS',
      },
      {
        line: 'L2',
        code: 'STP_PU_TQ_L2',
        desc: 'Mudança de Perfil U para Tubo Pesado L2',
        cat: 'TOOL_CHANGE',
        from_fam: 'PERF_U',
        to_fam: 'TUB_QUAD',
        duration: 120,
        impact: 'Montagem de cabeçote de solda longitudinal e mandris reforçados',
        source: 'MANUAL',
      },
    ]

    for (const sm of setupMatrixConfigs) {
      const lineRec = lineMap[sm.line]
      const fromFam = savedFam[sm.from_fam]
      const toFam = savedFam[sm.to_fam]
      const masterRec = savedMasters[sm.line]
      if (!lineRec) continue
      try {
        const exist = app.findRecordsByFilter(
          'line_setup_matrix',
          `line_id = '${lineRec.id}' && setup_code = '${sm.code}'`,
          '',
          1,
          0,
        )
        if (exist.length === 0) {
          const rec = new Record(stpMatCol)
          rec.set('line_id', lineRec.id)
          if (masterRec) rec.set('line_master_id', masterRec.id)
          rec.set('setup_code', sm.code)
          rec.set('setup_description', sm.desc)
          rec.set('setup_category', sm.cat)
          if (fromFam) rec.set('from_family_id', fromFam.id)
          if (toFam) rec.set('to_family_id', toFam.id)
          rec.set('setup_duration_minutes', sm.duration)
          rec.set('capacity_loss_impact', sm.impact)
          rec.set('source_mode', sm.source)
          if (sm.sap_cat && savedSapCatalog[sm.sap_cat]) {
            rec.set('sap_integration_id', savedSapCatalog[sm.sap_cat].id)
          }
          rec.set('active', true)
          rec.set('valid_from', '2026-01-01 00:00:00.000Z')
          app.save(rec)
        }
      } catch (_) {}
    }
  },
  (app) => {
    // rollback
  },
)
