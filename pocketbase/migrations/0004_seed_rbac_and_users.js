migrate(
  (app) => {
    const rolesCol = app.findCollectionByNameOrId('pcp_roles')
    const permissionsCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolePermissionsCol = app.findCollectionByNameOrId('pcp_role_permissions')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const scopesCol = app.findCollectionByNameOrId('pcp_access_scopes')
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const lineRespCol = app.findCollectionByNameOrId('pcp_line_responsibles')
    const auditCol = app.findCollectionByNameOrId('pcp_audit_logs')

    // 1. Roles Definition
    const rolesData = [
      {
        code: 'PCP_ADMIN',
        name: 'Administrador PCP',
        description: 'Acesso administrativo completo e governança funcional do PCP',
        hierarchy_level: 1,
        is_system: true,
      },
      {
        code: 'PCP_PROGRAMMER',
        name: 'Programador PCP',
        description:
          'Responsável pelo sequenciamento, programação e simulação de ordens industriais',
        hierarchy_level: 2,
        is_system: true,
      },
      {
        code: 'LINE_MANAGER',
        name: 'Gestor de Linha / Processo',
        description: 'Gestão operacional e aprovação de programações nas linhas sob seu escopo',
        hierarchy_level: 3,
        is_system: true,
      },
      {
        code: 'PRODUCTION_VIEWER',
        name: 'Operação / Consulta',
        description: 'Visualização operacional das linhas, programações ativas e planos',
        hierarchy_level: 4,
        is_system: true,
      },
      {
        code: 'EXECUTIVE_VIEWER',
        name: 'Diretoria / Executivo',
        description: 'Visão executiva agregada de capacidade, cenários e indicadores industriais',
        hierarchy_level: 2,
        is_system: true,
      },
      {
        code: 'AUDITOR',
        name: 'Auditoria e Compliance',
        description:
          'Acesso a relatórios de conformidade, trilhas de auditoria e histórico de decisões',
        hierarchy_level: 2,
        is_system: true,
      },
    ]

    const roleRecords = {}
    for (const r of rolesData) {
      try {
        const existing = app.findFirstRecordByData('pcp_roles', 'code', r.code)
        roleRecords[r.code] = existing
      } catch (_) {
        const rec = new Record(rolesCol)
        rec.set('name', r.name)
        rec.set('code', r.code)
        rec.set('description', r.description)
        rec.set('hierarchy_level', r.hierarchy_level)
        rec.set('is_system', r.is_system)
        app.save(rec)
        roleRecords[r.code] = rec
      }
    }

    // 2. Granular Permissions Definition
    const permissionsData = [
      {
        key: 'pcp.dashboard.view',
        name: 'Visualizar Cockpit',
        category: 'Cockpit',
        is_critical: false,
        description: 'Acesso ao painel principal do PCP',
      },
      {
        key: 'pcp.masterplan.view',
        name: 'Visualizar Planejamento Mestre',
        category: 'Planejamento',
        is_critical: false,
        description: 'Consulta ao plano mestre de produção',
      },
      {
        key: 'pcp.schedule.view',
        name: 'Visualizar Programações',
        category: 'Programação',
        is_critical: false,
        description: 'Consulta a sequenciamentos e ordens',
      },
      {
        key: 'pcp.schedule.create',
        name: 'Criar Programação',
        category: 'Programação',
        is_critical: false,
        description: 'Criação de novos planos e sequenciamentos',
      },
      {
        key: 'pcp.schedule.edit',
        name: 'Editar Programação',
        category: 'Programação',
        is_critical: false,
        description: 'Edição e reordenação de ordens',
      },
      {
        key: 'pcp.schedule.simulate',
        name: 'Executar Simulações',
        category: 'Simulação',
        is_critical: false,
        description: 'Simulação de cenários com motor de regras',
      },
      {
        key: 'pcp.schedule.approve',
        name: 'Aprovar Programação (Geral)',
        category: 'Aprovação',
        is_critical: true,
        description: 'Aprovação consolidada de programação',
      },
      {
        key: 'pcp.schedule.approve.pcp',
        name: 'Aprovar Fase 1 (PCP)',
        category: 'Aprovação',
        is_critical: true,
        description: 'Validação e liberação técnica pelo PCP',
      },
      {
        key: 'pcp.schedule.approve.manager',
        name: 'Aprovar Fase 2 (Gestor de Linha)',
        category: 'Aprovação',
        is_critical: true,
        description: 'Homologação operacional pelo gestor da linha',
      },
      {
        key: 'pcp.schedule.reject',
        name: 'Rejeitar Programação',
        category: 'Aprovação',
        is_critical: true,
        description: 'Reprovação formal com apontamento de motivo',
      },
      {
        key: 'pcp.schedule.publish',
        name: 'Publicar Programação Oficial',
        category: 'Programação',
        is_critical: true,
        description: 'Disponibilizar programação oficial para chão de fábrica',
      },
      {
        key: 'pcp.scenario.view',
        name: 'Visualizar Cenários',
        category: 'Cenários',
        is_critical: false,
        description: "Consulta a cenários paralelos 'what-if'",
      },
      {
        key: 'pcp.scenario.create',
        name: 'Criar Cenários',
        category: 'Cenários',
        is_critical: false,
        description: 'Criação de cenários alternativos',
      },
      {
        key: 'pcp.scenario.compare',
        name: 'Comparar Cenários',
        category: 'Cenários',
        is_critical: false,
        description: 'Comparação de indicadores de desempenho entre cenários',
      },
      {
        key: 'pcp.production_map.view',
        name: 'Visualizar Mapa de Produção',
        category: 'Produção',
        is_critical: false,
        description: 'Mapa de ocupação e cadência das linhas',
      },
      {
        key: 'pcp.production_map.edit',
        name: 'Editar Mapa de Produção',
        category: 'Produção',
        is_critical: false,
        description: 'Ajuste na distribuição de capacidades no mapa',
      },
      {
        key: 'pcp.capacity.view',
        name: 'Visualizar Capacidade Fabril',
        category: 'Capacidade',
        is_critical: false,
        description: 'Ocupação e gargalos por centro de trabalho',
      },
      {
        key: 'pcp.demand.view',
        name: 'Visualizar Demanda',
        category: 'Demanda',
        is_critical: false,
        description: 'Carteira de pedidos e necessidades de clientes',
      },
      {
        key: 'pcp.demand.forecast',
        name: 'Previsão de Demanda',
        category: 'Demanda',
        is_critical: false,
        description: 'Modelos preditivos de demanda futura',
      },
      {
        key: 'pcp.inventory.view',
        name: 'Visualizar Estoques e Pulmões',
        category: 'Estoque',
        is_critical: false,
        description: 'Níveis de matérias-primas e produtos intermediários',
      },
      {
        key: 'pcp.inventory.slotting',
        name: 'Alocação de Estoques',
        category: 'Estoque',
        is_critical: false,
        description: 'Otimização de buffer e endereçamento de materiais',
      },
      {
        key: 'pcp.analysis.view',
        name: 'Visualizar Análises e KPIs',
        category: 'Indicadores',
        is_critical: false,
        description: 'Dashboards analíticos, OEE e aderência ao plano',
      },
      {
        key: 'pcp.approval.view',
        name: 'Visualizar Painel de Aprovações',
        category: 'Aprovação',
        is_critical: false,
        description: 'Central de aprovações pendentes',
      },
      {
        key: 'pcp.approval.decide',
        name: 'Decidir Aprovações',
        category: 'Aprovação',
        is_critical: true,
        description: 'Ação de deferimento ou recusa de solicitações',
      },
      {
        key: 'pcp.alert.view',
        name: 'Visualizar Alertas Industriais',
        category: 'Alertas',
        is_critical: false,
        description: 'Monitoramento de anomalias e desvios',
      },
      {
        key: 'pcp.alert.manage',
        name: 'Gerenciar Alertas',
        category: 'Alertas',
        is_critical: false,
        description: 'Reconhecimento, resolução e silenciamento de alertas',
      },
      {
        key: 'pcp.history.view',
        name: 'Visualizar Histórico Operacional',
        category: 'Histórico',
        is_critical: false,
        description: 'Registro histórico de execuções e versões',
      },
      {
        key: 'pcp.masterdata.view',
        name: 'Visualizar Ficha Mestre',
        category: 'Ficha Mestre',
        is_critical: false,
        description: 'Consulta a parâmetros de linhas e produtos',
      },
      {
        key: 'pcp.masterdata.edit',
        name: 'Editar Ficha Mestre',
        category: 'Ficha Mestre',
        is_critical: true,
        description: 'Alteração de parâmetros industriais e capacidades',
      },
      {
        key: 'pcp.rules.view',
        name: 'Visualizar Rule Packs',
        category: 'Regras',
        is_critical: false,
        description: 'Consulta a matriz mestre de regras de sequenciamento',
      },
      {
        key: 'pcp.rules.edit',
        name: 'Editar Regras Industriais',
        category: 'Regras',
        is_critical: true,
        description: 'Modificação de pesos, restrições e rule packs',
      },
      {
        key: 'pcp.rules.approve',
        name: 'Aprovar Alteração de Regras',
        category: 'Regras',
        is_critical: true,
        description: 'Homologação de novas regras industriais',
      },
      {
        key: 'pcp.integration.view',
        name: 'Visualizar Integrações (SAP/MES)',
        category: 'Integração',
        is_critical: false,
        description: 'Status de sincronização de dados SAP e MES',
      },
      {
        key: 'pcp.integration.manage',
        name: 'Gerenciar Conexões e Sync',
        category: 'Integração',
        is_critical: true,
        description: 'Disparo forçado de cargas e configuração de conectores',
      },
      {
        key: 'pcp.audit.view',
        name: 'Visualizar Auditoria de Segurança',
        category: 'Auditoria',
        is_critical: false,
        description: 'Consulta a trilhas de auditoria e acessos',
      },
      {
        key: 'pcp.admin.access',
        name: 'Administração de Perfis e Acessos',
        category: 'Administração',
        is_critical: true,
        description: 'Gestão completa de roles, escopos e permissões',
      },
    ]

    const permRecords = {}
    for (const p of permissionsData) {
      try {
        const existing = app.findFirstRecordByData('pcp_permissions', 'key', p.key)
        permRecords[p.key] = existing
      } catch (_) {
        const rec = new Record(permissionsCol)
        rec.set('name', p.name)
        rec.set('key', p.key)
        rec.set('category', p.category)
        rec.set('is_critical', p.is_critical)
        rec.set('description', p.description)
        app.save(rec)
        permRecords[p.key] = rec
      }
    }

    // 3. Matriz Inicial de Permissões por Perfil
    const matrix = {
      PCP_ADMIN: [
        'pcp.dashboard.view',
        'pcp.masterplan.view',
        'pcp.schedule.view',
        'pcp.schedule.create',
        'pcp.schedule.edit',
        'pcp.schedule.simulate',
        'pcp.schedule.approve',
        'pcp.schedule.approve.pcp',
        'pcp.schedule.approve.manager',
        'pcp.schedule.reject',
        'pcp.schedule.publish',
        'pcp.scenario.view',
        'pcp.scenario.create',
        'pcp.scenario.compare',
        'pcp.production_map.view',
        'pcp.production_map.edit',
        'pcp.capacity.view',
        'pcp.demand.view',
        'pcp.demand.forecast',
        'pcp.inventory.view',
        'pcp.inventory.slotting',
        'pcp.analysis.view',
        'pcp.approval.view',
        'pcp.approval.decide',
        'pcp.alert.view',
        'pcp.alert.manage',
        'pcp.history.view',
        'pcp.masterdata.view',
        'pcp.masterdata.edit',
        'pcp.rules.view',
        'pcp.rules.edit',
        'pcp.rules.approve',
        'pcp.integration.view',
        'pcp.integration.manage',
        'pcp.audit.view',
        'pcp.admin.access',
      ],
      PCP_PROGRAMMER: [
        'pcp.dashboard.view',
        'pcp.masterplan.view',
        'pcp.schedule.view',
        'pcp.schedule.create',
        'pcp.schedule.edit',
        'pcp.schedule.simulate',
        'pcp.schedule.approve.pcp',
        'pcp.schedule.publish',
        'pcp.scenario.view',
        'pcp.scenario.create',
        'pcp.scenario.compare',
        'pcp.production_map.view',
        'pcp.capacity.view',
        'pcp.demand.view',
        'pcp.demand.forecast',
        'pcp.inventory.view',
        'pcp.analysis.view',
        'pcp.approval.view',
        'pcp.alert.view',
        'pcp.alert.manage',
        'pcp.history.view',
        'pcp.masterdata.view',
        'pcp.masterdata.edit',
        'pcp.rules.view',
        'pcp.integration.view',
      ],
      LINE_MANAGER: [
        'pcp.dashboard.view',
        'pcp.masterplan.view',
        'pcp.schedule.view',
        'pcp.schedule.simulate',
        'pcp.schedule.approve.manager',
        'pcp.schedule.reject',
        'pcp.production_map.view',
        'pcp.capacity.view',
        'pcp.inventory.view',
        'pcp.analysis.view',
        'pcp.approval.view',
        'pcp.approval.decide',
        'pcp.alert.view',
        'pcp.alert.manage',
        'pcp.history.view',
        'pcp.masterdata.view',
        'pcp.rules.view',
      ],
      PRODUCTION_VIEWER: [
        'pcp.dashboard.view',
        'pcp.masterplan.view',
        'pcp.schedule.view',
        'pcp.production_map.view',
        'pcp.capacity.view',
        'pcp.alert.view',
      ],
      EXECUTIVE_VIEWER: [
        'pcp.dashboard.view',
        'pcp.masterplan.view',
        'pcp.schedule.view',
        'pcp.scenario.view',
        'pcp.scenario.compare',
        'pcp.production_map.view',
        'pcp.capacity.view',
        'pcp.demand.view',
        'pcp.inventory.view',
        'pcp.analysis.view',
        'pcp.masterdata.view',
        'pcp.rules.view',
        'pcp.audit.view',
      ],
      AUDITOR: [
        'pcp.dashboard.view',
        'pcp.masterplan.view',
        'pcp.schedule.view',
        'pcp.production_map.view',
        'pcp.capacity.view',
        'pcp.analysis.view',
        'pcp.history.view',
        'pcp.masterdata.view',
        'pcp.rules.view',
        'pcp.integration.view',
        'pcp.audit.view',
      ],
    }

    for (const [roleCode, permKeys] of Object.entries(matrix)) {
      const roleRec = roleRecords[roleCode]
      if (!roleRec) continue
      for (const pKey of permKeys) {
        const permRec = permRecords[pKey]
        if (!permRec) continue
        try {
          app.findFirstRecordByData('pcp_role_permissions', 'role_id', roleRec.id)
          // check specific pair
          const existingPairs = app.findRecordsByFilter(
            'pcp_role_permissions',
            `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
            '',
            1,
            0,
          )
          if (existingPairs.length > 0) continue
        } catch (_) {}

        const rec = new Record(rolePermissionsCol)
        rec.set('role_id', roleRec.id)
        rec.set('permission_id', permRec.id)
        app.save(rec)
      }
    }

    // 4. Create Seed Users for Testing and Demonstration of all 6 Roles
    const sampleUsers = [
      {
        email: 'ciafal@ciafal.com.br',
        name: 'Administrador Geral CIAFAL',
        role: 'PCP_ADMIN',
        scope_type: 'GLOBAL',
      },
      {
        email: 'programador.pcp@ciafal.com.br',
        name: 'Lucas Ferreira (PCP)',
        role: 'PCP_PROGRAMMER',
        scope_type: 'GLOBAL',
      },
      {
        email: 'gestor.l1@ciafal.com.br',
        name: 'Carlos Mendes (Gestor L1)',
        role: 'LINE_MANAGER',
        scope_type: 'PRODUCTION_LINE',
        target_code: 'L1',
      },
      {
        email: 'gestor.l2@ciafal.com.br',
        name: 'Marcos Souza (Gestor L2)',
        role: 'LINE_MANAGER',
        scope_type: 'PRODUCTION_LINE',
        target_code: 'L2',
      },
      {
        email: 'operador.fabrica@ciafal.com.br',
        name: 'Roberto Silva (Operação)',
        role: 'PRODUCTION_VIEWER',
        scope_type: 'GLOBAL',
      },
      {
        email: 'diretor.industrial@ciafal.com.br',
        name: 'Mariana Albuquerque (Diretoria)',
        role: 'EXECUTIVE_VIEWER',
        scope_type: 'GLOBAL',
      },
      {
        email: 'auditor.compliance@ciafal.com.br',
        name: 'Fernando Rocha (Auditoria)',
        role: 'AUDITOR',
        scope_type: 'GLOBAL',
      },
    ]

    const lines = app.findRecordsByFilter('production_lines', '', 'name', 20, 0)
    const lineMap = {}
    for (const line of lines) {
      lineMap[line.getString('code')] = line
    }

    for (const u of sampleUsers) {
      let userRec
      try {
        userRec = app.findAuthRecordByEmail('_pb_users_auth_', u.email)
        userRec.set('role', u.role)
        userRec.set('name', u.name)
        app.save(userRec)
      } catch (_) {
        userRec = new Record(usersCol)
        userRec.setEmail(u.email)
        userRec.setPassword('Skip@Pass')
        userRec.setVerified(true)
        userRec.set('name', u.name)
        userRec.set('role', u.role)
        app.save(userRec)
      }

      // Assign scope
      try {
        const existingScopes = app.findRecordsByFilter(
          'pcp_access_scopes',
          `user_id = '${userRec.id}'`,
          '',
          5,
          0,
        )
        if (existingScopes.length === 0) {
          const scopeRec = new Record(scopesCol)
          scopeRec.set('user_id', userRec.id)
          scopeRec.set('scope_type', u.scope_type)
          scopeRec.set('active', true)

          if (u.scope_type === 'PRODUCTION_LINE' && u.target_code && lineMap[u.target_code]) {
            const targetLine = lineMap[u.target_code]
            scopeRec.set('target_id', targetLine.id)
            scopeRec.set('target_code', targetLine.getString('code'))
            scopeRec.set('target_name', targetLine.getString('name'))

            // Also set Line Responsible
            const respRec = new Record(lineRespCol)
            respRec.set('line_id', targetLine.id)
            respRec.set('user_id', userRec.id)
            respRec.set('role_type', 'PRIMARY')
            respRec.set('active', true)
            app.save(respRec)
          } else if (u.scope_type === 'GLOBAL') {
            scopeRec.set('target_id', 'ALL')
            scopeRec.set('target_code', 'GLOBAL')
            scopeRec.set('target_name', 'Todas as Unidades e Linhas CIAFAL')
          }
          app.save(scopeRec)
        }
      } catch (_) {}
    }

    // 5. Seed Initial Audit Logs
    const initialLogs = [
      {
        user_email: 'ciafal@ciafal.com.br',
        user_name: 'Administrador Geral CIAFAL',
        user_role: 'PCP_ADMIN',
        event_type: 'ACCESS_GRANTED',
        action: 'LOGIN_SSO_AD',
        resource: 'HUB_CIAFAL_AUTH',
        outcome: 'ALLOW',
        scope: 'GLOBAL',
        details: {
          client: 'CIAFAL AD Federation Services',
          method: 'SAML2.0 / Kerberos',
          tenant: 'CIAFAL_CORP',
        },
      },
      {
        user_email: 'ciafal@ciafal.com.br',
        user_name: 'Administrador Geral CIAFAL',
        user_role: 'PCP_ADMIN',
        event_type: 'ROLE_ASSIGNED',
        action: 'INITIALIZE_RBAC_MATRICES',
        resource: 'PCP_GOVERNANCE',
        permission_required: 'pcp.admin.access',
        outcome: 'SUCCESS',
        scope: 'GLOBAL',
        details: { version: '0.0.2', roles_count: 6, permissions_count: 36 },
      },
      {
        user_email: 'gestor.l1@ciafal.com.br',
        user_name: 'Carlos Mendes (Gestor L1)',
        user_role: 'LINE_MANAGER',
        event_type: 'SCOPE_ASSIGNED',
        action: 'ASSIGN_PRODUCTION_LINE',
        resource: 'LINE_L1',
        resource_id: lineMap['L1'] ? lineMap['L1'].id : '',
        permission_required: 'pcp.admin.access',
        outcome: 'SUCCESS',
        scope: 'PRODUCTION_LINE (L1)',
        details: { role_type: 'PRIMARY', line_code: 'L1' },
      },
    ]

    for (const log of initialLogs) {
      const rec = new Record(auditCol)
      rec.set('user_email', log.user_email)
      rec.set('user_name', log.user_name)
      rec.set('user_role', log.user_role)
      rec.set('event_type', log.event_type)
      rec.set('action', log.action)
      rec.set('resource', log.resource)
      if (log.resource_id) rec.set('resource_id', log.resource_id)
      if (log.permission_required) rec.set('permission_required', log.permission_required)
      rec.set('outcome', log.outcome)
      rec.set('scope', log.scope)
      rec.set('details', log.details)
      rec.set('ip_address', '10.12.0.45 (Rede Corporativa CIAFAL)')
      rec.set('user_agent', 'CIAFAL HUB Industrial Client v2.4')
      app.save(rec)
    }
  },
  (app) => {
    // down migration
  },
)
