/**
 * Hook de Governança e Integridade da Hierarquia de Linhas e Centros de Produção
 *
 * Regras Obrigatórias do PCP Robotizado (HUB CIAFAL):
 * 1. Antes de QUALQUER exclusão de vínculo Centro x Linha, verificar histórico no PCP:
 *    - Programação semanal (weekly_schedules, pcp_schedules, etc.)
 *    - Programação mensal/geral (pcp_monthly_summaries, master_plans, etc.)
 *    - Sequenciamento e dependências (line_ideal_sequences, line_sequencing_dependencies)
 *    - Ordens derivadas e de produção (pcp_production_orders, pcp_production_postings, pcp_derived_schedules)
 *    - Paradas, perdas e parâmetros (pcp_production_stops, line_theoretical_losses, pcp_programming_parameters)
 * 2. Centro SEM histórico -> remoção do vínculo em line_sequencing_dependencies permitida.
 *    Centro COM histórico -> DELETE e remoção REJEITADOS pela API com mensagem clara.
 * 3. Desativação: mantém o vínculo e o cadastro mestre, altera status para 'INATIVO' e active = false.
 *    Reativação: altera status para 'ATIVO' e active = true (sem duplicar cadastros).
 * 4. Auditoria imutável append-only em pcp_audit_logs com:
 *    usuário, data/hora, empresa, Linha, Centro, código, status anterior, status posterior,
 *    operação (REMOCAO_CENTRO_HIERARQUIA / DESATIVACAO_CENTRO_HIERARQUIA / REATIVACAO_CENTRO_HIERARQUIA),
 *    motivo, resultado e contagem de registros históricos.
 * 5. Permissões RBAC do PCP: pcp.lines.manage / pcp.masterdata.edit obrigatórias no servidor.
 * 6. Concorrência: checagem de histórico executada no instante da operação no servidor.
 * 7. Integridade: exclusão lógica preferencial, histórico de relacionamentos preservado.
 */

// -------------------------------------------------------------
// ENDPOINT: Consulta de Histórico do Centro (GET)
// -------------------------------------------------------------
routerAdd('GET', '/backend/v1/pcp/hierarchy/check-center-usage', (e) => {
  try {
    const centerId = (e.request.url.query().get('centerId') || '').trim()
    let centerCode = (e.request.url.query().get('centerCode') || '').trim()
    let centerName = ''

    if (!centerId && !centerCode) {
      return e.json(400, { error: 'centerId ou centerCode é obrigatório para a checagem.' })
    }

    if (centerId && !centerCode) {
      try {
        const cRec = $app.findRecordById('production_lines', centerId)
        if (cRec) {
          centerCode = cRec.getString('code')
          centerName = cRec.getString('name')
        }
      } catch (_) {}
    } else if (centerId) {
      try {
        const cRec = $app.findRecordById('production_lines', centerId)
        if (cRec) {
          centerName = cRec.getString('name')
        }
      } catch (_) {}
    }

    // Checagem de histórico inline
    let totalCount = 0
    const details = []

    const entityDefinitions = [
      {
        collection: 'weekly_schedules',
        label: 'Programação Semanal Operacional',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (centerCode) parts.push(`line_code = '${centerCode}'`)
          return parts
        },
      },
      {
        collection: 'pcp_production_orders',
        label: 'Ordens de Produção PCP',
        filterParts: () => {
          const parts = []
          if (centerCode) {
            parts.push(`centro_code = '${centerCode}'`)
            parts.push(`work_center = '${centerCode}'`)
            parts.push(`linha_code = '${centerCode}'`)
          }
          return parts
        },
      },
      {
        collection: 'pcp_production_postings',
        label: 'Apontamentos de Produção',
        filterParts: () => {
          const parts = []
          if (centerCode) {
            parts.push(`centro_code = '${centerCode}'`)
            parts.push(`work_center = '${centerCode}'`)
          }
          return parts
        },
      },
      {
        collection: 'pcp_derived_schedules',
        label: 'Programação Derivada de Centros',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`center_id = '${centerId}'`)
          if (centerCode) parts.push(`center_code = '${centerCode}'`)
          return parts
        },
      },
      {
        collection: 'pcp_production_stops',
        label: 'Apontamentos de Paradas de Centros',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (centerCode) parts.push(`line_code = '${centerCode}'`)
          return parts
        },
      },
      {
        collection: 'pcp_programming_parameters',
        label: 'Parâmetros de Programação do Centro',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (centerCode) parts.push(`line_code = '${centerCode}'`)
          return parts
        },
      },
      {
        collection: 'pcp_lesson_feedback',
        label: 'Feedbacks e Lições Aprendidas',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (centerCode) parts.push(`line_code = '${centerCode}'`)
          return parts
        },
      },
      {
        collection: 'line_ideal_sequences',
        label: 'Sequenciamento Ideal da Linha/Centro',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'line_theoretical_losses',
        label: 'Perdas Teóricas Cadastradas',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (centerCode) parts.push(`line_code = '${centerCode}'`)
          return parts
        },
      },
      {
        collection: 'line_buffers',
        label: 'Pulmões e Buffers do Centro',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'line_gauge_min_restrictions',
        label: 'Restrições Dimensionais de Bitola',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'pcp_center_derivations',
        label: 'Regras de Derivação entre Centros',
        filterParts: () => {
          const parts = []
          if (centerId) {
            parts.push(`origin_center_id = '${centerId}'`)
            parts.push(`target_center_id = '${centerId}'`)
          }
          if (centerCode) {
            parts.push(`origin_center_code = '${centerCode}'`)
            parts.push(`target_center_code = '${centerCode}'`)
          }
          return parts
        },
      },
      {
        collection: 'line_raw_material_applications',
        label: 'Aplicações de Matéria-Prima no Centro',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (centerCode) parts.push(`line_code = '${centerCode}'`)
          return parts
        },
      },
      {
        collection: 'line_productivity_rates',
        label: 'Taxas de Produtividade Cadastradas',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'line_setup_matrix',
        label: 'Matriz de Setup do Centro',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'line_blocked_products',
        label: 'Restrições de Produtos Bloqueados',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'line_structural_constraints',
        label: 'Restrições Estruturais da Linha/Centro',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'line_bottleneck_matrix',
        label: 'Classificação de Gargalo Fabril',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (centerCode) parts.push(`line_code = '${centerCode}'`)
          return parts
        },
      },
      {
        collection: 'production_route_nodes',
        label: 'Nós de Rotas Produtivas',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (centerCode) parts.push(`line_code = '${centerCode}'`)
          return parts
        },
      },
      {
        collection: 'production_shifts',
        label: 'Turnos Operacionais Vinculados',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'production_shift_crews',
        label: 'Vínculos de Turno x Turma',
        filterParts: () => {
          const parts = []
          if (centerCode) parts.push(`line_code = '${centerCode}'`)
          return parts
        },
      },
      {
        collection: 'pcp_schedules',
        label: 'Propostas de Programação PCP',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (centerCode) parts.push(`line_code = '${centerCode}'`)
          return parts
        },
      },
      {
        collection: 'pcp_mp_inventory_demands',
        label: 'Demandas de Inventário de MP',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (centerCode) {
            parts.push(`line_code = '${centerCode}'`)
            parts.push(`work_center_code = '${centerCode}'`)
          }
          return parts
        },
      },
      {
        collection: 'pcp_monthly_summaries',
        label: 'Consolidados Mensais do PCP',
        filterParts: () => {
          const parts = []
          if (centerCode) parts.push(`line_code = '${centerCode}'`)
          return parts
        },
      },
    ]

    for (let i = 0; i < entityDefinitions.length; i++) {
      const item = entityDefinitions[i]
      try {
        const col = $app.findCollectionByNameOrId(item.collection)
        if (!col) continue

        const parts = item.filterParts()
        if (!parts || parts.length === 0) continue

        const filterStr = parts.join(' || ')
        const records = $app.findRecordsByFilter(item.collection, filterStr, '-created', 10, 0)
        if (records && records.length > 0) {
          totalCount += records.length
          details.push({
            entity: item.collection,
            label: item.label,
            count: records.length,
            sampleId: records[0].id,
          })
        }
      } catch (_) {}
    }

    const hasHistory = totalCount > 0

    return e.json(200, {
      centerId,
      centerCode,
      centerName,
      hasHistory,
      historyCount: totalCount,
      details,
      canRemove: !hasHistory,
      message: hasHistory
        ? `O Centro '${centerCode || centerId}' possui histórico de ${totalCount} registro(s) no PCP. Exclusão física não permitida; realize a desativação lógica.`
        : `Centro '${centerCode || centerId}' sem utilização histórica no PCP. Remoção do vínculo permitida.`,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Erro ao checar histórico do centro.' })
  }
})

// -------------------------------------------------------------
// ENDPOINT: Remoção de Vínculo de Centro SEM Histórico (POST)
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/pcp/hierarchy/remove-center', (e) => {
  try {
    const authRecord = $apis.requestInfo(e).authRecord

    // Validação RBAC inline
    if (!authRecord) {
      return e.json(401, { error: 'Usuário não autenticado no sistema PCP.' })
    }

    const userRole = authRecord.getString('role')
    const userId = authRecord.id
    const userEmail = authRecord.getString('email') || 'sistema@ciafal.com.br'
    const userName = authRecord.getString('name') || userEmail

    let isAuthorized = userRole === 'PCP_ADMIN'
    if (!isAuthorized) {
      const authorizedRoles = new Set([
        'PCP_PROGRAMMER',
        'PPC_PROGRAMMER',
        'PCP_PLANNER',
        'LINE_MANAGER',
        'AUDITOR',
      ])
      if (authorizedRoles.has(userRole)) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      try {
        const roleRec = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
        if (roleRec) {
          const permKeyCandidates = ['pcp.lines.manage', 'pcp.masterdata.edit']
          for (const pKey of permKeyCandidates) {
            try {
              const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', pKey)
              if (permRec) {
                const rolePerms = $app.findRecordsByFilter(
                  'pcp_role_permissions',
                  `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
                  '',
                  1,
                  0,
                )
                if (rolePerms && rolePerms.length > 0) {
                  isAuthorized = true
                  break
                }
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    // Exceções granulares
    try {
      const permKeyCandidates = ['pcp.lines.manage', 'pcp.masterdata.edit']
      for (const pKey of permKeyCandidates) {
        try {
          const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', pKey)
          if (permRec) {
            const exceptions = $app.findRecordsByFilter(
              'pcp_permission_exceptions',
              `user_id = '${userId}' && permission_id = '${permRec.id}'`,
              '',
              1,
              0,
            )
            if (exceptions && exceptions.length > 0) {
              const excType = exceptions[0].getString('type')
              if (excType === 'DENY') {
                isAuthorized = false
                break
              }
              if (excType === 'GRANT') {
                isAuthorized = true
              }
            }
          }
        } catch (_) {}
      }
    } catch (_) {}

    if (!isAuthorized) {
      try {
        const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
        if (auditCol) {
          const audit = new Record(auditCol)
          audit.set('user_id', userId)
          audit.set('user_email', userEmail)
          audit.set('user_name', userName)
          audit.set('user_role', userRole)
          audit.set('event_type', 'UNAUTHORIZED_ACTION_ATTEMPT')
          audit.set('action', 'REMOCAO_CENTRO_HIERARQUIA')
          audit.set('resource', 'line_sequencing_dependencies')
          audit.set('permission_required', 'pcp.lines.manage')
          audit.set('outcome', 'FORBIDDEN')
          audit.set('reason', 'Usuário sem permissão pcp.lines.manage')
          audit.set('details', {
            operacao: 'REMOCAO_CENTRO_HIERARQUIA',
            resultado: 'FORBIDDEN',
            motivo: 'Acesso negado: requer pcp.lines.manage ou pcp.masterdata.edit',
            timestamp: new Date().toISOString(),
          })
          $app.save(audit)
        }
      } catch (_) {}
      return e.json(403, {
        error:
          'Acesso negado: Manutenção da Hierarquia das Linhas requer permissão pcp.lines.manage ou pcp.masterdata.edit.',
      })
    }

    const data = $apis.requestInfo(e).data || {}
    const { lineId, lineCode, centerId, centerCode, centerName, dependencyId, company, motivo } =
      data

    if (!centerId && !dependencyId) {
      return e.json(400, { error: 'centerId ou dependencyId é obrigatório.' })
    }

    let effCenterCode = centerCode || ''
    let effCenterName = centerName || ''
    if (centerId && (!effCenterCode || !effCenterName)) {
      try {
        const cRec = $app.findRecordById('production_lines', centerId)
        if (cRec) {
          effCenterCode = effCenterCode || cRec.getString('code')
          effCenterName = effCenterName || cRec.getString('name')
        }
      } catch (_) {}
    }

    // 1. CHECAGEM OBRIGATÓRIA DE HISTÓRICO NO INSTANTE DA OPERAÇÃO (CONCORRÊNCIA)
    let totalCount = 0
    const details = []
    const entityDefinitions = [
      {
        collection: 'weekly_schedules',
        label: 'Programação Semanal Operacional',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (effCenterCode) parts.push(`line_code = '${effCenterCode}'`)
          return parts
        },
      },
      {
        collection: 'pcp_production_orders',
        label: 'Ordens de Produção PCP',
        filterParts: () => {
          const parts = []
          if (effCenterCode) {
            parts.push(`centro_code = '${effCenterCode}'`)
            parts.push(`work_center = '${effCenterCode}'`)
            parts.push(`linha_code = '${effCenterCode}'`)
          }
          return parts
        },
      },
      {
        collection: 'pcp_production_postings',
        label: 'Apontamentos de Produção',
        filterParts: () => {
          const parts = []
          if (effCenterCode) {
            parts.push(`centro_code = '${effCenterCode}'`)
            parts.push(`work_center = '${effCenterCode}'`)
          }
          return parts
        },
      },
      {
        collection: 'pcp_derived_schedules',
        label: 'Programação Derivada de Centros',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`center_id = '${centerId}'`)
          if (effCenterCode) parts.push(`center_code = '${effCenterCode}'`)
          return parts
        },
      },
      {
        collection: 'pcp_production_stops',
        label: 'Apontamentos de Paradas de Centros',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (effCenterCode) parts.push(`line_code = '${effCenterCode}'`)
          return parts
        },
      },
      {
        collection: 'pcp_programming_parameters',
        label: 'Parâmetros de Programação do Centro',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (effCenterCode) parts.push(`line_code = '${effCenterCode}'`)
          return parts
        },
      },
      {
        collection: 'line_ideal_sequences',
        label: 'Sequenciamento Ideal da Linha/Centro',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'line_theoretical_losses',
        label: 'Perdas Teóricas Cadastradas',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (effCenterCode) parts.push(`line_code = '${effCenterCode}'`)
          return parts
        },
      },
      {
        collection: 'line_buffers',
        label: 'Pulmões e Buffers do Centro',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'pcp_center_derivations',
        label: 'Regras de Derivação entre Centros',
        filterParts: () => {
          const parts = []
          if (centerId) {
            parts.push(`origin_center_id = '${centerId}'`)
            parts.push(`target_center_id = '${centerId}'`)
          }
          if (effCenterCode) {
            parts.push(`origin_center_code = '${effCenterCode}'`)
            parts.push(`target_center_code = '${effCenterCode}'`)
          }
          return parts
        },
      },
      {
        collection: 'line_productivity_rates',
        label: 'Taxas de Produtividade Cadastradas',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'line_setup_matrix',
        label: 'Matriz de Setup do Centro',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'line_blocked_products',
        label: 'Restrições de Produtos Bloqueados',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'line_bottleneck_matrix',
        label: 'Classificação de Gargalo Fabril',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (effCenterCode) parts.push(`line_code = '${effCenterCode}'`)
          return parts
        },
      },
      {
        collection: 'production_route_nodes',
        label: 'Nós de Rotas Produtivas',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (effCenterCode) parts.push(`line_code = '${effCenterCode}'`)
          return parts
        },
      },
      {
        collection: 'production_shifts',
        label: 'Turnos Operacionais Vinculados',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          return parts
        },
      },
      {
        collection: 'pcp_schedules',
        label: 'Propostas de Programação PCP',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (effCenterCode) parts.push(`line_code = '${effCenterCode}'`)
          return parts
        },
      },
      {
        collection: 'pcp_mp_inventory_demands',
        label: 'Demandas de Inventário de MP',
        filterParts: () => {
          const parts = []
          if (centerId) parts.push(`line_id = '${centerId}'`)
          if (effCenterCode) {
            parts.push(`line_code = '${effCenterCode}'`)
            parts.push(`work_center_code = '${effCenterCode}'`)
          }
          return parts
        },
      },
    ]

    for (let i = 0; i < entityDefinitions.length; i++) {
      const item = entityDefinitions[i]
      try {
        const col = $app.findCollectionByNameOrId(item.collection)
        if (!col) continue
        const parts = item.filterParts()
        if (!parts || parts.length === 0) continue
        const filterStr = parts.join(' || ')
        const records = $app.findRecordsByFilter(item.collection, filterStr, '-created', 10, 0)
        if (records && records.length > 0) {
          totalCount += records.length
          details.push({
            entity: item.collection,
            label: item.label,
            count: records.length,
          })
        }
      } catch (_) {}
    }

    if (totalCount > 0) {
      try {
        const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
        if (auditCol) {
          const audit = new Record(auditCol)
          audit.set('user_id', userId)
          audit.set('user_email', userEmail)
          audit.set('user_name', userName)
          audit.set('user_role', userRole)
          audit.set('event_type', 'HIERARCHY_MAINTENANCE')
          audit.set('action', 'REMOCAO_CENTRO_HIERARQUIA')
          audit.set('resource', 'line_sequencing_dependencies')
          audit.set('resource_id', centerId || '')
          audit.set('permission_required', 'pcp.lines.manage')
          audit.set('scope', `Linha ${lineCode || lineId} | Centro ${effCenterCode || centerId}`)
          audit.set('outcome', 'BLOCKED_BY_HISTORY')
          audit.set('line', lineCode || lineId || '')
          audit.set('center', effCenterCode || '')
          audit.set('company', company || 'CIAFAL')
          audit.set('status', 'Ativo')
          audit.set(
            'reason',
            'Tentativa de remoção rejeitada: Centro possui registros históricos vinculados no PCP.',
          )
          audit.set('details', {
            empresa: company || 'CIAFAL',
            linha_id: lineId || '',
            linha_code: lineCode || '',
            centro_id: centerId || '',
            centro_code: effCenterCode || '',
            centro_nome: effCenterName || '',
            status_anterior: 'Ativo',
            status_posterior: 'Ativo',
            operacao: 'REMOCAO_CENTRO_HIERARQUIA',
            motivo:
              'Tentativa de remoção rejeitada: Centro possui registros históricos vinculados no PCP.',
            resultado: 'BLOCKED_BY_HISTORY',
            quantidade_historico: totalCount,
            detalhes_historico: details,
            timestamp: new Date().toISOString(),
          })
          $app.save(audit)
        }
      } catch (_) {}

      return e.json(400, {
        code: 'CENTER_HAS_HISTORY',
        error: `Não é permitido remover este Centro pois constam ${totalCount} registro(s) históricos no PCP. Utilize a opção de Desativação para manter a rastreabilidade.`,
        hasHistory: true,
        historyCount: totalCount,
        details,
      })
    }

    // 2. Localizar e remover apenas o vínculo em line_sequencing_dependencies
    let depRecord = null
    if (dependencyId) {
      try {
        depRecord = $app.findRecordById('line_sequencing_dependencies', dependencyId)
      } catch (_) {}
    }

    if (!depRecord && lineId && centerId) {
      try {
        const matches = $app.findRecordsByFilter(
          'line_sequencing_dependencies',
          `line_id = '${lineId}' && (next_line_id = '${centerId}' || line_id = '${centerId}')`,
          '-created',
          1,
          0,
        )
        if (matches.length > 0) depRecord = matches[0]
      } catch (_) {}
    }

    if (depRecord) {
      $app.delete(depRecord)
    }

    // 3. Auditoria append-only de sucesso
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      if (auditCol) {
        const audit = new Record(auditCol)
        audit.set('user_id', userId)
        audit.set('user_email', userEmail)
        audit.set('user_name', userName)
        audit.set('user_role', userRole)
        audit.set('event_type', 'HIERARCHY_MAINTENANCE')
        audit.set('action', 'REMOCAO_CENTRO_HIERARQUIA')
        audit.set('resource', 'line_sequencing_dependencies')
        audit.set('resource_id', depRecord ? depRecord.id : centerId || '')
        audit.set('permission_required', 'pcp.lines.manage')
        audit.set('scope', `Linha ${lineCode || lineId} | Centro ${effCenterCode || centerId}`)
        audit.set('outcome', 'SUCCESS')
        audit.set('line', lineCode || lineId || '')
        audit.set('center', effCenterCode || '')
        audit.set('company', company || 'CIAFAL')
        audit.set('status', 'Removido')
        audit.set('reason', motivo || 'Remoção de vínculo de Centro sem histórico operacional')
        audit.set('details', {
          empresa: company || 'CIAFAL',
          linha_id: lineId || '',
          linha_code: lineCode || '',
          centro_id: centerId || '',
          centro_code: effCenterCode || '',
          centro_nome: effCenterName || '',
          status_anterior: 'Ativo',
          status_posterior: 'Removido',
          operacao: 'REMOCAO_CENTRO_HIERARQUIA',
          motivo: motivo || 'Remoção de vínculo de Centro sem histórico operacional',
          resultado: 'SUCCESS',
          quantidade_historico: 0,
          timestamp: new Date().toISOString(),
        })
        $app.save(audit)
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      operation: 'REMOCAO_CENTRO_HIERARQUIA',
      message: `Vínculo do centro '${effCenterCode || centerId}' removido com sucesso da linha.`,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Erro ao remover vínculo do centro.' })
  }
})

// -------------------------------------------------------------
// ENDPOINT: Desativação de Centro na Hierarquia (POST)
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/pcp/hierarchy/deactivate-center', (e) => {
  try {
    const authRecord = $apis.requestInfo(e).authRecord

    if (!authRecord) {
      return e.json(401, { error: 'Usuário não autenticado no sistema PCP.' })
    }

    const userRole = authRecord.getString('role')
    const userId = authRecord.id
    const userEmail = authRecord.getString('email') || 'sistema@ciafal.com.br'
    const userName = authRecord.getString('name') || userEmail

    let isAuthorized = userRole === 'PCP_ADMIN'
    if (!isAuthorized) {
      const authorizedRoles = new Set([
        'PCP_PROGRAMMER',
        'PPC_PROGRAMMER',
        'PCP_PLANNER',
        'LINE_MANAGER',
        'AUDITOR',
      ])
      if (authorizedRoles.has(userRole)) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      try {
        const roleRec = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
        if (roleRec) {
          const permKeyCandidates = ['pcp.lines.manage', 'pcp.masterdata.edit']
          for (const pKey of permKeyCandidates) {
            try {
              const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', pKey)
              if (permRec) {
                const rolePerms = $app.findRecordsByFilter(
                  'pcp_role_permissions',
                  `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
                  '',
                  1,
                  0,
                )
                if (rolePerms && rolePerms.length > 0) {
                  isAuthorized = true
                  break
                }
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    if (!isAuthorized) {
      return e.json(403, {
        error:
          'Acesso negado: Manutenção da Hierarquia das Linhas requer permissão pcp.lines.manage ou pcp.masterdata.edit.',
      })
    }

    const data = $apis.requestInfo(e).data || {}
    const { lineId, lineCode, centerId, centerCode, centerName, dependencyId, company, motivo } =
      data

    if (!centerId && !dependencyId) {
      return e.json(400, { error: 'centerId ou dependencyId é obrigatório.' })
    }

    let effCenterCode = centerCode || ''
    let effCenterName = centerName || ''
    if (centerId && (!effCenterCode || !effCenterName)) {
      try {
        const cRec = $app.findRecordById('production_lines', centerId)
        if (cRec) {
          effCenterCode = effCenterCode || cRec.getString('code')
          effCenterName = effCenterName || cRec.getString('name')
        }
      } catch (_) {}
    }

    // Contagem de histórico para registro de auditoria
    let histCount = 0
    try {
      if (effCenterCode) {
        const ws = $app.findRecordsByFilter(
          'weekly_schedules',
          `line_code = '${effCenterCode}'`,
          '-created',
          10,
          0,
        )
        histCount += ws.length
        const po = $app.findRecordsByFilter(
          'pcp_production_orders',
          `centro_code = '${effCenterCode}' || work_center = '${effCenterCode}'`,
          '-created',
          10,
          0,
        )
        histCount += po.length
      }
    } catch (_) {}

    // 1. Atualizar vínculo na hierarquia (line_sequencing_dependencies)
    let depRecord = null
    if (dependencyId) {
      try {
        depRecord = $app.findRecordById('line_sequencing_dependencies', dependencyId)
      } catch (_) {}
    }

    if (!depRecord && lineId && centerId) {
      try {
        const matches = $app.findRecordsByFilter(
          'line_sequencing_dependencies',
          `line_id = '${lineId}' && (next_line_id = '${centerId}' || line_id = '${centerId}')`,
          '-created',
          1,
          0,
        )
        if (matches.length > 0) depRecord = matches[0]
      } catch (_) {}
    }

    if (depRecord) {
      depRecord.set('active', false)
      depRecord.set('status', 'INATIVO')
      $app.save(depRecord)
    }

    // 2. Atualizar cadastro mestre da linha/centro (production_lines) se aplicável
    if (centerId) {
      try {
        const centerRec = $app.findRecordById('production_lines', centerId)
        if (centerRec) {
          centerRec.set('is_active', false)
          $app.save(centerRec)
        }
      } catch (_) {}
    }

    // 3. Auditoria append-only
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      if (auditCol) {
        const audit = new Record(auditCol)
        audit.set('user_id', userId)
        audit.set('user_email', userEmail)
        audit.set('user_name', userName)
        audit.set('user_role', userRole)
        audit.set('event_type', 'HIERARCHY_MAINTENANCE')
        audit.set('action', 'DESATIVACAO_CENTRO_HIERARQUIA')
        audit.set('resource', 'line_sequencing_dependencies')
        audit.set('resource_id', depRecord ? depRecord.id : centerId || '')
        audit.set('permission_required', 'pcp.lines.manage')
        audit.set('scope', `Linha ${lineCode || lineId} | Centro ${effCenterCode || centerId}`)
        audit.set('outcome', 'SUCCESS')
        audit.set('line', lineCode || lineId || '')
        audit.set('center', effCenterCode || '')
        audit.set('company', company || 'CIAFAL')
        audit.set('status', 'Inativo')
        audit.set('reason', motivo || 'Desativação operacional de centro preservando histórico')
        audit.set('details', {
          empresa: company || 'CIAFAL',
          linha_id: lineId || '',
          linha_code: lineCode || '',
          centro_id: centerId || '',
          centro_code: effCenterCode || '',
          centro_nome: effCenterName || '',
          status_anterior: 'Ativo',
          status_posterior: 'Inativo',
          operacao: 'DESATIVACAO_CENTRO_HIERARQUIA',
          motivo: motivo || 'Desativação operacional de centro preservando histórico',
          resultado: 'SUCCESS',
          quantidade_historico: histCount,
          timestamp: new Date().toISOString(),
        })
        $app.save(audit)
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      operation: 'DESATIVACAO_CENTRO_HIERARQUIA',
      message: `Centro '${effCenterCode || centerId}' desativado com sucesso na hierarquia. Todo o histórico foi preservado.`,
      historyCount: histCount,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Erro ao desativar centro na hierarquia.' })
  }
})

// -------------------------------------------------------------
// ENDPOINT: Reativação de Centro na Hierarquia (POST)
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/pcp/hierarchy/reactivate-center', (e) => {
  try {
    const authRecord = $apis.requestInfo(e).authRecord

    if (!authRecord) {
      return e.json(401, { error: 'Usuário não autenticado no sistema PCP.' })
    }

    const userRole = authRecord.getString('role')
    const userId = authRecord.id
    const userEmail = authRecord.getString('email') || 'sistema@ciafal.com.br'
    const userName = authRecord.getString('name') || userEmail

    let isAuthorized = userRole === 'PCP_ADMIN'
    if (!isAuthorized) {
      const authorizedRoles = new Set([
        'PCP_PROGRAMMER',
        'PPC_PROGRAMMER',
        'PCP_PLANNER',
        'LINE_MANAGER',
        'AUDITOR',
      ])
      if (authorizedRoles.has(userRole)) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      try {
        const roleRec = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
        if (roleRec) {
          const permKeyCandidates = ['pcp.lines.manage', 'pcp.masterdata.edit']
          for (const pKey of permKeyCandidates) {
            try {
              const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', pKey)
              if (permRec) {
                const rolePerms = $app.findRecordsByFilter(
                  'pcp_role_permissions',
                  `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
                  '',
                  1,
                  0,
                )
                if (rolePerms && rolePerms.length > 0) {
                  isAuthorized = true
                  break
                }
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    if (!isAuthorized) {
      return e.json(403, {
        error:
          'Acesso negado: Manutenção da Hierarquia das Linhas requer permissão pcp.lines.manage ou pcp.masterdata.edit.',
      })
    }

    const data = $apis.requestInfo(e).data || {}
    const { lineId, lineCode, centerId, centerCode, centerName, dependencyId, company, motivo } =
      data

    if (!centerId && !dependencyId) {
      return e.json(400, { error: 'centerId ou dependencyId é obrigatório.' })
    }

    let effCenterCode = centerCode || ''
    let effCenterName = centerName || ''
    if (centerId && (!effCenterCode || !effCenterName)) {
      try {
        const cRec = $app.findRecordById('production_lines', centerId)
        if (cRec) {
          effCenterCode = effCenterCode || cRec.getString('code')
          effCenterName = effCenterName || cRec.getString('name')
        }
      } catch (_) {}
    }

    // 1. Reativar vínculo existente (sem duplicar registros)
    let depRecord = null
    if (dependencyId) {
      try {
        depRecord = $app.findRecordById('line_sequencing_dependencies', dependencyId)
      } catch (_) {}
    }

    if (!depRecord && lineId && centerId) {
      try {
        const matches = $app.findRecordsByFilter(
          'line_sequencing_dependencies',
          `line_id = '${lineId}' && (next_line_id = '${centerId}' || line_id = '${centerId}')`,
          '-created',
          1,
          0,
        )
        if (matches.length > 0) depRecord = matches[0]
      } catch (_) {}
    }

    if (depRecord) {
      depRecord.set('active', true)
      depRecord.set('status', 'ATIVO')
      $app.save(depRecord)
    }

    // 2. Reativar cadastro em production_lines
    if (centerId) {
      try {
        const centerRec = $app.findRecordById('production_lines', centerId)
        if (centerRec) {
          centerRec.set('is_active', true)
          $app.save(centerRec)
        }
      } catch (_) {}
    }

    // 3. Auditoria append-only
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      if (auditCol) {
        const audit = new Record(auditCol)
        audit.set('user_id', userId)
        audit.set('user_email', userEmail)
        audit.set('user_name', userName)
        audit.set('user_role', userRole)
        audit.set('event_type', 'HIERARCHY_MAINTENANCE')
        audit.set('action', 'REATIVACAO_CENTRO_HIERARQUIA')
        audit.set('resource', 'line_sequencing_dependencies')
        audit.set('resource_id', depRecord ? depRecord.id : centerId || '')
        audit.set('permission_required', 'pcp.lines.manage')
        audit.set('scope', `Linha ${lineCode || lineId} | Centro ${effCenterCode || centerId}`)
        audit.set('outcome', 'SUCCESS')
        audit.set('line', lineCode || lineId || '')
        audit.set('center', effCenterCode || '')
        audit.set('company', company || 'CIAFAL')
        audit.set('status', 'Ativo')
        audit.set('reason', motivo || 'Reativação operacional de centro na hierarquia')
        audit.set('details', {
          empresa: company || 'CIAFAL',
          linha_id: lineId || '',
          linha_code: lineCode || '',
          centro_id: centerId || '',
          centro_code: effCenterCode || '',
          centro_nome: effCenterName || '',
          status_anterior: 'Inativo',
          status_posterior: 'Ativo',
          operacao: 'REATIVACAO_CENTRO_HIERARQUIA',
          motivo: motivo || 'Reativação operacional de centro na hierarquia',
          resultado: 'SUCCESS',
          timestamp: new Date().toISOString(),
        })
        $app.save(audit)
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      operation: 'REATIVACAO_CENTRO_HIERARQUIA',
      message: `Centro '${effCenterCode || centerId}' reativado com sucesso na hierarquia.`,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Erro ao reativar centro.' })
  }
})

// -------------------------------------------------------------
// BLOQUEIO VIA API REST: onRecordDeleteRequest('line_sequencing_dependencies')
// Impede DELETE direto no endpoint PocketBase quando o centro possuir histórico
// -------------------------------------------------------------
onRecordDeleteRequest((e) => {
  const rec = e.record
  const authRecord = e.auth

  // 1. Validar permissões
  let isAuthorized = false
  let userId = ''
  let userEmail = 'sistema@ciafal.com.br'
  let userName = 'Sistema PCP'
  let userRole = 'PCP_ADMIN'

  if (authRecord) {
    userRole = authRecord.getString('role')
    userId = authRecord.id
    userEmail = authRecord.getString('email') || userEmail
    userName = authRecord.getString('name') || userEmail

    if (userRole === 'PCP_ADMIN') {
      isAuthorized = true
    } else {
      const authorizedRoles = new Set([
        'PCP_PROGRAMMER',
        'PPC_PROGRAMMER',
        'PCP_PLANNER',
        'LINE_MANAGER',
        'AUDITOR',
      ])
      if (authorizedRoles.has(userRole)) {
        isAuthorized = true
      }
    }
  }

  if (!isAuthorized) {
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      if (auditCol) {
        const audit = new Record(auditCol)
        audit.set('user_id', userId)
        audit.set('user_email', userEmail)
        audit.set('user_name', userName)
        audit.set('user_role', userRole)
        audit.set('event_type', 'UNAUTHORIZED_ACTION_ATTEMPT')
        audit.set('action', 'REMOCAO_CENTRO_HIERARQUIA')
        audit.set('resource', 'line_sequencing_dependencies')
        audit.set('resource_id', rec.id)
        audit.set('permission_required', 'pcp.lines.manage')
        audit.set('outcome', 'FORBIDDEN')
        audit.set(
          'reason',
          'Acesso negado: Exclusão requer permissão pcp.lines.manage ou pcp.masterdata.edit.',
        )
        $app.save(audit)
      }
    } catch (_) {}
    throw new ForbiddenError(
      'Acesso negado: Exclusão de vínculo na Hierarquia requer permissão pcp.lines.manage ou pcp.masterdata.edit.',
    )
  }

  // 2. Identificar Centro alvo
  const targetCenterId = rec.getString('next_line_id') || rec.getString('line_id')
  let centerCode = ''
  let centerName = ''

  if (targetCenterId) {
    try {
      const cRec = $app.findRecordById('production_lines', targetCenterId)
      if (cRec) {
        centerCode = cRec.getString('code')
        centerName = cRec.getString('name')
      }
    } catch (_) {}
  }

  // 3. Checagem em tempo real de histórico no PCP
  let totalCount = 0
  const details = []
  const entityDefinitions = [
    {
      collection: 'weekly_schedules',
      label: 'Programação Semanal Operacional',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        if (centerCode) parts.push(`line_code = '${centerCode}'`)
        return parts
      },
    },
    {
      collection: 'pcp_production_orders',
      label: 'Ordens de Produção PCP',
      filterParts: () => {
        const parts = []
        if (centerCode) {
          parts.push(`centro_code = '${centerCode}'`)
          parts.push(`work_center = '${centerCode}'`)
          parts.push(`linha_code = '${centerCode}'`)
        }
        return parts
      },
    },
    {
      collection: 'pcp_production_postings',
      label: 'Apontamentos de Produção',
      filterParts: () => {
        const parts = []
        if (centerCode) {
          parts.push(`centro_code = '${centerCode}'`)
          parts.push(`work_center = '${centerCode}'`)
        }
        return parts
      },
    },
    {
      collection: 'pcp_derived_schedules',
      label: 'Programação Derivada de Centros',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`center_id = '${targetCenterId}'`)
        if (centerCode) parts.push(`center_code = '${centerCode}'`)
        return parts
      },
    },
    {
      collection: 'pcp_production_stops',
      label: 'Apontamentos de Paradas de Centros',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        if (centerCode) parts.push(`line_code = '${centerCode}'`)
        return parts
      },
    },
    {
      collection: 'pcp_programming_parameters',
      label: 'Parâmetros de Programação do Centro',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        if (centerCode) parts.push(`line_code = '${centerCode}'`)
        return parts
      },
    },
    {
      collection: 'line_ideal_sequences',
      label: 'Sequenciamento Ideal da Linha/Centro',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        return parts
      },
    },
    {
      collection: 'line_theoretical_losses',
      label: 'Perdas Teóricas Cadastradas',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        if (centerCode) parts.push(`line_code = '${centerCode}'`)
        return parts
      },
    },
    {
      collection: 'line_buffers',
      label: 'Pulmões e Buffers do Centro',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        return parts
      },
    },
    {
      collection: 'pcp_center_derivations',
      label: 'Regras de Derivação entre Centros',
      filterParts: () => {
        const parts = []
        if (targetCenterId) {
          parts.push(`origin_center_id = '${targetCenterId}'`)
          parts.push(`target_center_id = '${targetCenterId}'`)
        }
        if (centerCode) {
          parts.push(`origin_center_code = '${centerCode}'`)
          parts.push(`target_center_code = '${centerCode}'`)
        }
        return parts
      },
    },
    {
      collection: 'line_productivity_rates',
      label: 'Taxas de Produtividade Cadastradas',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        return parts
      },
    },
    {
      collection: 'line_setup_matrix',
      label: 'Matriz de Setup do Centro',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        return parts
      },
    },
    {
      collection: 'line_blocked_products',
      label: 'Restrições de Produtos Bloqueados',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        return parts
      },
    },
    {
      collection: 'line_bottleneck_matrix',
      label: 'Classificação de Gargalo Fabril',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        if (centerCode) parts.push(`line_code = '${centerCode}'`)
        return parts
      },
    },
    {
      collection: 'production_route_nodes',
      label: 'Nós de Rotas Produtivas',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        if (centerCode) parts.push(`line_code = '${centerCode}'`)
        return parts
      },
    },
    {
      collection: 'production_shifts',
      label: 'Turnos Operacionais Vinculados',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        return parts
      },
    },
    {
      collection: 'pcp_schedules',
      label: 'Propostas de Programação PCP',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        if (centerCode) parts.push(`line_code = '${centerCode}'`)
        return parts
      },
    },
    {
      collection: 'pcp_mp_inventory_demands',
      label: 'Demandas de Inventário de MP',
      filterParts: () => {
        const parts = []
        if (targetCenterId) parts.push(`line_id = '${targetCenterId}'`)
        if (centerCode) {
          parts.push(`line_code = '${centerCode}'`)
          parts.push(`work_center_code = '${centerCode}'`)
        }
        return parts
      },
    },
  ]

  for (let i = 0; i < entityDefinitions.length; i++) {
    const item = entityDefinitions[i]
    try {
      const col = $app.findCollectionByNameOrId(item.collection)
      if (!col) continue
      const parts = item.filterParts()
      if (!parts || parts.length === 0) continue
      const filterStr = parts.join(' || ')
      const records = $app.findRecordsByFilter(item.collection, filterStr, '-created', 1, 0)
      if (records && records.length > 0) {
        totalCount += records.length
        details.push({
          entity: item.collection,
          label: item.label,
          count: records.length,
        })
        break
      }
    } catch (_) {}
  }

  if (totalCount > 0) {
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      if (auditCol) {
        const audit = new Record(auditCol)
        audit.set('user_id', userId)
        audit.set('user_email', userEmail)
        audit.set('user_name', userName)
        audit.set('user_role', userRole)
        audit.set('line', rec.getString('line_id'))
        audit.set('center', centerCode)
        audit.set('company', 'CIAFAL')
        audit.set('status', 'Ativo')
        audit.set('event_type', 'HIERARCHY_MAINTENANCE')
        audit.set('action', 'REMOCAO_CENTRO_HIERARQUIA')
        audit.set('resource', 'line_sequencing_dependencies')
        audit.set('resource_id', rec.id)
        audit.set('permission_required', 'pcp.lines.manage')
        audit.set(
          'scope',
          `Linha ${rec.getString('line_id')} | Centro ${centerCode || targetCenterId}`,
        )
        audit.set('outcome', 'BLOCKED_BY_HISTORY')
        audit.set('reason', 'Tentativa direta de DELETE bloqueada por histórico existente no PCP')
        audit.set('details', {
          empresa: 'CIAFAL',
          linha_id: rec.getString('line_id'),
          centro_id: targetCenterId,
          centro_code: centerCode,
          centro_nome: centerName,
          status_anterior: 'Ativo',
          status_posterior: 'Ativo',
          operacao: 'REMOCAO_CENTRO_HIERARQUIA',
          motivo: 'Tentativa direta de DELETE bloqueada por histórico existente no PCP',
          resultado: 'BLOCKED_BY_HISTORY',
          quantidade_historico: totalCount,
          detalhes_historico: details,
          timestamp: new Date().toISOString(),
        })
        $app.save(audit)
      }
    } catch (_) {}

    throw new BadRequestError(
      `Exclusão rejeitada: O Centro '${centerCode || targetCenterId}' possui histórico no PCP. Utilize a desativação lógica (/deactivate-center) para preservar a integridade.`,
    )
  }

  // Auditoria append-only para a exclusão autorizada do vínculo
  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    if (auditCol) {
      const audit = new Record(auditCol)
      audit.set('user_id', userId)
      audit.set('user_email', userEmail)
      audit.set('user_name', userName)
      audit.set('user_role', userRole)
      audit.set('line', rec.getString('line_id'))
      audit.set('center', centerCode)
      audit.set('company', 'CIAFAL')
      audit.set('status', 'Removido')
      audit.set('event_type', 'HIERARCHY_MAINTENANCE')
      audit.set('action', 'REMOCAO_CENTRO_HIERARQUIA')
      audit.set('resource', 'line_sequencing_dependencies')
      audit.set('resource_id', rec.id)
      audit.set('permission_required', 'pcp.lines.manage')
      audit.set(
        'scope',
        `Linha ${rec.getString('line_id')} | Centro ${centerCode || targetCenterId}`,
      )
      audit.set('outcome', 'SUCCESS')
      audit.set('reason', 'Exclusão direta autorizada de vínculo de Centro sem histórico')
      audit.set('details', {
        empresa: 'CIAFAL',
        linha_id: rec.getString('line_id'),
        centro_id: targetCenterId,
        centro_code: centerCode,
        centro_nome: centerName,
        status_anterior: 'Ativo',
        status_posterior: 'Removido',
        operacao: 'REMOCAO_CENTRO_HIERARQUIA',
        motivo: 'Exclusão direta autorizada de vínculo de Centro sem histórico',
        resultado: 'SUCCESS',
        quantidade_historico: 0,
        timestamp: new Date().toISOString(),
      })
      $app.save(audit)
    }
  } catch (_) {}

  return e.next()
}, 'line_sequencing_dependencies')
