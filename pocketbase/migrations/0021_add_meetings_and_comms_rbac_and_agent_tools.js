migrate(
  (app) => {
    const permissionsCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolesCol = app.findCollectionByNameOrId('pcp_roles')
    const rolePermsCol = app.findCollectionByNameOrId('pcp_role_permissions')

    const newPermissions = [
      {
        key: 'pcp.meeting.view',
        name: 'Visualizar Reuniões PCP',
        category: 'Reuniões PCP',
        is_critical: false,
        description:
          'Permite visualizar calendário, pautas, histórico e detalhes das reuniões semanais de PCP',
      },
      {
        key: 'pcp.meeting.create',
        name: 'Criar e Agendar Reuniões PCP',
        category: 'Reuniões PCP',
        is_critical: false,
        description:
          'Permite agendar novas reuniões de PCP, convocar participantes e gerar compromissos de agenda',
      },
      {
        key: 'pcp.meeting.conduct',
        name: 'Conduzir e Registrar Reunião em Andamento',
        category: 'Reuniões PCP',
        is_critical: false,
        description:
          'Permite operar o painel de projeção da reunião em andamento, registrar itens, decisões e pendências',
      },
      {
        key: 'pcp.meeting.publish',
        name: 'Revisar e Publicar ATA Digital',
        category: 'Reuniões PCP',
        is_critical: true,
        description:
          'Permite validar o rascunho oficial da ATA, aprovar itens identificados e disparar envio por e-mail',
      },
      {
        key: 'pcp.meeting.manage',
        name: 'Gerenciar Parâmetros e Cancelamento de Reuniões',
        category: 'Reuniões PCP',
        is_critical: true,
        description:
          'Permite cancelar reuniões, alterar periodicidade padrão e reatribuir papéis de condução/ata',
      },
      {
        key: 'pcp.communication.view',
        name: 'Visualizar Comunicados PCP',
        category: 'Comunicados PCP',
        is_critical: false,
        description: 'Permite acessar a caixa de comunicados, vigentes, programados e histórico',
      },
      {
        key: 'pcp.communication.create',
        name: 'Criar e Agendar Comunicado PCP',
        category: 'Comunicados PCP',
        is_critical: false,
        description:
          'Permite criar comunicados operacionais, definir público-alvo, vigência e gerar via IA',
      },
      {
        key: 'pcp.communication.publish',
        name: 'Publicar e Aprovar Comunicados',
        category: 'Comunicados PCP',
        is_critical: true,
        description:
          'Permite aprovar e publicar comunicados vigentes e comunicados de criticidade urgente/bloqueante',
      },
      {
        key: 'pcp.communication.ack',
        name: 'Registrar Ciência de Leitura Obrigatória',
        category: 'Comunicados PCP',
        is_critical: false,
        description:
          'Permite ao operador e gestores assinarem eletronicamente a confirmação de leitura e ciência',
      },
      {
        key: 'pcp.meeting.ai_briefing',
        name: 'Gerar Pré-Meeting e Análise de Reuniões com IA',
        category: 'Reuniões PCP',
        is_critical: false,
        description:
          'Permite solicitar análise preditiva, briefing pré-reunião e transcrição estruturada com IA nativa',
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

    // Role permissions mappings
    const roleMappings = {
      PCP_ADMIN: [
        'pcp.meeting.view',
        'pcp.meeting.create',
        'pcp.meeting.conduct',
        'pcp.meeting.publish',
        'pcp.meeting.manage',
        'pcp.meeting.ai_briefing',
        'pcp.communication.view',
        'pcp.communication.create',
        'pcp.communication.publish',
        'pcp.communication.ack',
      ],
      PCP_PROGRAMMER: [
        'pcp.meeting.view',
        'pcp.meeting.create',
        'pcp.meeting.conduct',
        'pcp.meeting.publish',
        'pcp.meeting.ai_briefing',
        'pcp.communication.view',
        'pcp.communication.create',
        'pcp.communication.publish',
        'pcp.communication.ack',
      ],
      LINE_MANAGER: [
        'pcp.meeting.view',
        'pcp.meeting.conduct',
        'pcp.communication.view',
        'pcp.communication.create',
        'pcp.communication.ack',
      ],
      EXECUTIVE_VIEWER: [
        'pcp.meeting.view',
        'pcp.meeting.ai_briefing',
        'pcp.communication.view',
        'pcp.communication.ack',
      ],
      AUDITOR: ['pcp.meeting.view', 'pcp.communication.view'],
      PRODUCTION_VIEWER: ['pcp.meeting.view', 'pcp.communication.view', 'pcp.communication.ack'],
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
        { collection: 'pcp_meetings', perms: { list: true, read: true } },
        { collection: 'pcp_meeting_minutes', perms: { list: true, read: true } },
        {
          collection: 'pcp_minute_items',
          perms: { list: true, read: true, create: true, update: true },
        },
        {
          collection: 'pcp_communications',
          perms: { list: true, read: true, create: true, update: true },
        },
        { collection: 'pcp_communication_reads', perms: { list: true, read: true } },
      ])
    } catch (e) {
      console.log('Aviso ao atualizar tools do agente:', e)
    }
  },
  (app) => {
    // Reverter tools
    try {
      $ai.agents.deleteTools(app, 'ciafal-executive-agent', [
        'pcp_meetings',
        'pcp_meeting_minutes',
        'pcp_minute_items',
        'pcp_communications',
        'pcp_communication_reads',
      ])
    } catch (_) {}
  },
)
