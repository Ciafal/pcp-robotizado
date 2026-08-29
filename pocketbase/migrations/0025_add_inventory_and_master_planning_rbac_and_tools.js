/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Cadastrar Permissões Granulares para Estoques e Planejamento Mestre
    const permsCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolesCol = app.findCollectionByNameOrId('pcp_roles')
    const rolePermsCol = app.findCollectionByNameOrId('pcp_role_permissions')

    const newPerms = [
      {
        key: 'pcp.inventory.overview',
        name: 'Visualizar Visão Geral de Estoques',
        category: 'Gestão de Estoques',
        description: 'Permite consultar cards executivos de estoques com drill-down e filtros.',
        is_critical: false,
      },
      {
        key: 'pcp.inventory.raw_material',
        name: 'Visualizar Matéria-Prima (MP)',
        category: 'Gestão de Estoques',
        description: 'Permite consultar MP por Centro, Depósito, tipo, aplicação e sem aplicação.',
        is_critical: false,
      },
      {
        key: 'pcp.inventory.semi_finished',
        name: 'Visualizar Semiacabados',
        category: 'Gestão de Estoques',
        description: 'Permite consultar pulmão intermediário e mapa de integração produtiva.',
        is_critical: false,
      },
      {
        key: 'pcp.inventory.finished_goods',
        name: 'Visualizar Produtos Acabados',
        category: 'Gestão de Estoques',
        description: 'Permite consultar acabados, carteira reservada e saldo projetado.',
        is_critical: false,
      },
      {
        key: 'pcp.inventory.coverage',
        name: 'Visualizar Cobertura & Projeções',
        category: 'Gestão de Estoques',
        description:
          'Permite projetar estoque dia a dia nos 3 cenários e calcular data de ruptura.',
        is_critical: false,
      },
      {
        key: 'pcp.inventory.discrepancies',
        name: 'Visualizar Divergências SAP x WMS',
        category: 'Gestão de Estoques',
        description: 'Permite analisar divergências entre saldos contábeis SAP e físicos WMS.',
        is_critical: false,
      },
      {
        key: 'pcp.inventory.ai',
        name: 'Analisar Estoques com IA',
        category: 'Gestão de Estoques',
        description:
          'Permite consultar recomendações da IA para risco de ruptura, excesso e aplicações.',
        is_critical: false,
      },
      {
        key: 'pcp.masterplan.overview',
        name: 'Visualizar Visão Geral PMP',
        category: 'Planejamento Mestre',
        description: 'Permite consultar indicadores consolidados do Plano Mestre de Produção.',
        is_critical: false,
      },
      {
        key: 'pcp.masterplan.adherence',
        name: 'Visualizar Aderência Programado x Realizado',
        category: 'Planejamento Mestre',
        description: 'Permite analisar aderência por volume, mix, produto, temporal e por linha.',
        is_critical: false,
      },
      {
        key: 'pcp.masterplan.deviations',
        name: 'Análise de Desvios & Causas PMP',
        category: 'Planejamento Mestre',
        description:
          'Permite classificar causas de desvios do plano mestre e apontar planos de ação.',
        is_critical: false,
      },
      {
        key: 'pcp.masterplan.demand_crm',
        name: 'Demanda & Previsibilidade CRM 360º',
        category: 'Planejamento Mestre',
        description:
          'Permite integrar previsão comercial CRM ponderada sem alterar plano automaticamente.',
        is_critical: false,
      },
      {
        key: 'pcp.masterplan.forecast_ai',
        name: 'Forecast IA & Acuracidade',
        category: 'Planejamento Mestre',
        description: 'Permite analisar Forecast Accuracy, Bias e simulações de cenários e-se.',
        is_critical: false,
      },
      {
        key: 'pcp.masterplan.versions',
        name: 'Histórico & Versões do Plano',
        category: 'Planejamento Mestre',
        description: 'Permite consultar versionamento e snapshots vigentes do Plano Mestre.',
        is_critical: false,
      },
    ]

    for (const p of newPerms) {
      try {
        const existing = app.findRecordsByFilter('pcp_permissions', `key = '${p.key}'`, '', 1, 0)
        if (existing.length === 0) {
          const rec = new Record(permsCol)
          rec.set('key', p.key)
          rec.set('name', p.name)
          rec.set('category', p.category)
          rec.set('description', p.description)
          rec.set('is_critical', p.is_critical)
          app.save(rec)
        }
      } catch (_) {}
    }

    // Vincular permissões aos papéis
    const roleMappings = {
      PCP_ADMIN: [
        'pcp.inventory.overview',
        'pcp.inventory.raw_material',
        'pcp.inventory.semi_finished',
        'pcp.inventory.finished_goods',
        'pcp.inventory.coverage',
        'pcp.inventory.discrepancies',
        'pcp.inventory.ai',
        'pcp.masterplan.overview',
        'pcp.masterplan.adherence',
        'pcp.masterplan.deviations',
        'pcp.masterplan.demand_crm',
        'pcp.masterplan.forecast_ai',
        'pcp.masterplan.versions',
      ],
      PCP_PROGRAMMER: [
        'pcp.inventory.overview',
        'pcp.inventory.raw_material',
        'pcp.inventory.semi_finished',
        'pcp.inventory.finished_goods',
        'pcp.inventory.coverage',
        'pcp.inventory.discrepancies',
        'pcp.inventory.ai',
        'pcp.masterplan.overview',
        'pcp.masterplan.adherence',
        'pcp.masterplan.deviations',
        'pcp.masterplan.demand_crm',
        'pcp.masterplan.forecast_ai',
        'pcp.masterplan.versions',
      ],
      LINE_MANAGER: [
        'pcp.inventory.overview',
        'pcp.inventory.raw_material',
        'pcp.inventory.semi_finished',
        'pcp.inventory.finished_goods',
        'pcp.inventory.coverage',
        'pcp.masterplan.overview',
        'pcp.masterplan.adherence',
        'pcp.masterplan.deviations',
      ],
      EXECUTIVE_VIEWER: [
        'pcp.inventory.overview',
        'pcp.inventory.raw_material',
        'pcp.inventory.semi_finished',
        'pcp.inventory.finished_goods',
        'pcp.inventory.coverage',
        'pcp.inventory.discrepancies',
        'pcp.inventory.ai',
        'pcp.masterplan.overview',
        'pcp.masterplan.adherence',
        'pcp.masterplan.deviations',
        'pcp.masterplan.demand_crm',
        'pcp.masterplan.forecast_ai',
        'pcp.masterplan.versions',
      ],
      PRODUCTION_VIEWER: [
        'pcp.inventory.overview',
        'pcp.inventory.raw_material',
        'pcp.inventory.semi_finished',
        'pcp.inventory.finished_goods',
        'pcp.masterplan.overview',
      ],
      AUDITOR: [
        'pcp.inventory.overview',
        'pcp.inventory.raw_material',
        'pcp.inventory.semi_finished',
        'pcp.inventory.finished_goods',
        'pcp.inventory.coverage',
        'pcp.inventory.discrepancies',
        'pcp.masterplan.overview',
        'pcp.masterplan.adherence',
        'pcp.masterplan.deviations',
        'pcp.masterplan.versions',
      ],
    }

    for (const [roleCode, permKeys] of Object.entries(roleMappings)) {
      try {
        const roleRecs = app.findRecordsByFilter('pcp_roles', `code = '${roleCode}'`, '', 1, 0)
        if (roleRecs.length === 0) continue
        const roleRec = roleRecs[0]

        for (const permKey of permKeys) {
          const permRecs = app.findRecordsByFilter(
            'pcp_permissions',
            `key = '${permKey}'`,
            '',
            1,
            0,
          )
          if (permRecs.length === 0) continue
          const permRec = permRecs[0]

          const existingRP = app.findRecordsByFilter(
            'pcp_role_permissions',
            `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
            '',
            1,
            0,
          )
          if (existingRP.length === 0) {
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
        { collection: 'inventory_discrepancies', perms: { list: true, read: true } },
        { collection: 'master_plans', perms: { list: true, read: true } },
        { collection: 'master_plan_items', perms: { list: true, read: true } },
        { collection: 'crm_forecast_records', perms: { list: true, read: true } },
        { collection: 'master_plan_versions', perms: { list: true, read: true } },
      ])
    } catch (_) {}
  },
  (app) => {
    try {
      $ai.agents.deleteTools(app, 'ciafal-executive-agent', [
        'inventory_discrepancies',
        'master_plans',
        'master_plan_items',
        'crm_forecast_records',
        'master_plan_versions',
      ])
    } catch (_) {}
  },
)
