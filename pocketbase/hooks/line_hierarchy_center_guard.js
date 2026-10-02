/**
 * Hook de Governança e Integridade da Hierarquia de Linhas e Centros
 *
 * Regra Obrigatória:
 * - Cenário A: Centro nunca utilizado -> pode ser desvinculado da hierarquia.
 * - Cenário B: Centro com histórico em qualquer entidade do PCP -> exclusão bloqueada no servidor,
 *   permitindo exclusivamente desativação lógica.
 * - Hook onRecordDeleteRequest para bloquear chamadas diretas de DELETE na API.
 */

routerAdd('GET', '/backend/v1/pcp/hierarchy/check-center-usage', (e) => {
  try {
    const centerId = e.request.url.query().get('centerId') || ''
    const centerCode = (e.request.url.query().get('centerCode') || '').trim()

    if (!centerId && !centerCode) {
      return e.json(400, { error: 'centerId ou centerCode é obrigatório.' })
    }

    let historyCount = 0
    const details = []
    const collectionsToCheck = [
      'weekly_schedules',
      'pcp_weekly_schedules',
      'daily_schedules',
      'pcp_daily_schedules',
      'monthly_schedules',
      'pcp_monthly_schedules',
      'schedule_versions',
      'pcp_schedule_versions',
      'production_orders',
      'pcp_production_orders',
      'production_appointments',
      'pcp_delivery_items',
      'pcp_deliveries',
      'line_capacities',
      'line_master_sheets',
      'pcp_mp_inventory_demands',
    ]

    for (let i = 0; i < collectionsToCheck.length; i++) {
      const colName = collectionsToCheck[i]
      try {
        if (!$app.findCollectionByNameOrId(colName)) continue

        const filterParts = []
        if (centerId) {
          filterParts.push(`center_id = '${centerId}'`)
          filterParts.push(`work_center_id = '${centerId}'`)
        }
        if (centerCode) {
          filterParts.push(`center_code = '${centerCode}'`)
          filterParts.push(`work_center_code = '${centerCode}'`)
          filterParts.push(`work_center = '${centerCode}'`)
        }

        if (filterParts.length > 0) {
          const filterStr = filterParts.join(' || ')
          const records = $app.findRecordsByFilter(colName, filterStr, '-created', 10, 0)
          if (records && records.length > 0) {
            historyCount += records.length
            details.push({
              entity: colName,
              count: records.length,
              description: `${records.length} registro(s) em ${colName}`,
            })
          }
        }
      } catch (_) {}
    }

    return e.json(200, {
      hasHistory: historyCount > 0,
      historyCount,
      details,
      canRemove: historyCount === 0,
      message:
        historyCount > 0
          ? `O Centro já foi utilizado em ${historyCount} registro(s) do PCP e não pode ser removido fisicamente.`
          : 'Centro sem histórico em programações.',
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Erro interno ao verificar histórico do centro.' })
  }
})

routerAdd('POST', '/backend/v1/pcp/hierarchy/remove-center', (e) => {
  try {
    const data = $apis.requestInfo(e).data || {}
    const { lineId, centerId, centerCode, centerName, dependencyId } = data

    if (!centerId && !dependencyId) {
      return e.json(400, { error: 'Identificador do centro ou dependência não informado.' })
    }

    // 1. Validação de Concorrência e Histórico no Servidor
    let historyCount = 0
    const details = []
    const collectionsToCheck = [
      'weekly_schedules',
      'pcp_weekly_schedules',
      'daily_schedules',
      'pcp_daily_schedules',
      'monthly_schedules',
      'pcp_monthly_schedules',
      'schedule_versions',
      'pcp_schedule_versions',
      'production_orders',
      'pcp_production_orders',
      'production_appointments',
      'pcp_delivery_items',
      'pcp_deliveries',
      'line_capacities',
      'line_master_sheets',
      'pcp_mp_inventory_demands',
    ]

    for (let i = 0; i < collectionsToCheck.length; i++) {
      const colName = collectionsToCheck[i]
      try {
        if (!$app.findCollectionByNameOrId(colName)) continue

        const filterParts = []
        if (centerId) {
          filterParts.push(`center_id = '${centerId}'`)
          filterParts.push(`work_center_id = '${centerId}'`)
        }
        if (centerCode) {
          filterParts.push(`center_code = '${centerCode}'`)
          filterParts.push(`work_center_code = '${centerCode}'`)
          filterParts.push(`work_center = '${centerCode}'`)
        }

        if (filterParts.length > 0) {
          const filterStr = filterParts.join(' || ')
          const records = $app.findRecordsByFilter(colName, filterStr, '-created', 10, 0)
          if (records && records.length > 0) {
            historyCount += records.length
            details.push({
              entity: colName,
              count: records.length,
            })
          }
        }
      } catch (_) {}
    }

    if (historyCount > 0) {
      return e.json(400, {
        error:
          'Não foi possível remover este Centro porque ele já possui utilização no PCP. Atualize a tela e utilize a opção Desativar.',
        hasHistory: true,
        historyCount,
        details,
      })
    }

    // 2. Localizar e remover apenas o vínculo na hierarquia (line_sequencing_dependencies)
    let depRecord = null
    if (dependencyId) {
      try {
        depRecord = $app.findRecordById('line_sequencing_dependencies', dependencyId)
      } catch (_) {}
    }

    if (!depRecord && lineId && centerId) {
      try {
        const query = $app.findRecordsByFilter(
          'line_sequencing_dependencies',
          `line_id = '${lineId}' && (next_line_id = '${centerId}' || line_id = '${centerId}')`,
          '-created',
          1,
          0,
        )
        if (query.length > 0) depRecord = query[0]
      } catch (_) {}
    }

    if (depRecord) {
      $app.delete(depRecord)
    }

    // 3. Auditoria append-only imutável
    try {
      const col = $app.findCollectionByNameOrId('pcp_audit_logs')
      if (col) {
        const audit = new Record(col)
        const user = $apis.requestInfo(e).authRecord
        audit.set('user_id', user ? user.id : '')
        audit.set('user_email', user ? user.get('email') : 'sistema@ciafal.com.br')
        audit.set('user_name', user ? user.get('name') : 'Sistema PCP')
        audit.set('user_role', user ? user.get('role') : 'PCP_ADMIN')
        audit.set('event_type', 'HIERARCHY_MAINTENANCE')
        audit.set('action', 'REMOÇÃO_CENTRO_HIERARQUIA')
        audit.set('resource', 'line_sequencing_dependencies')
        audit.set('resource_id', centerId || lineId || '')
        audit.set('permission_required', 'pcp.lines.manage')
        audit.set('scope', `Linha ${lineId} | Centro ${centerCode || centerId}`)
        audit.set('outcome', 'SUCCESS')
        audit.set('details', {
          empresa: 'CIAFAL',
          linha: lineId,
          centro: centerCode,
          centro_id: centerId,
          centro_nome: centerName,
          status_anterior: 'Ativo',
          status_posterior: 'Removido',
          operacao: 'REMOÇÃO_CENTRO_HIERARQUIA',
          motivo: 'Centro sem histórico de programação desvinculado da hierarquia',
          resultado: 'SUCCESS',
          has_history: false,
          history_count: 0,
          timestamp: new Date().toISOString(),
        })
        $app.save(audit)
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: `Centro '${centerCode || centerId} — ${centerName || ''}' removido da hierarquia com sucesso.`,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Falha ao remover centro da hierarquia.' })
  }
})

routerAdd('POST', '/backend/v1/pcp/hierarchy/deactivate-center', (e) => {
  try {
    const data = $apis.requestInfo(e).data || {}
    const { lineId, centerId, centerCode, centerName, dependencyId, reason } = data

    // Atualiza status na dependência para inativo
    let depRecord = null
    if (dependencyId) {
      try {
        depRecord = $app.findRecordById('line_sequencing_dependencies', dependencyId)
      } catch (_) {}
    }

    if (!depRecord && lineId && centerId) {
      try {
        const query = $app.findRecordsByFilter(
          'line_sequencing_dependencies',
          `line_id = '${lineId}' && (next_line_id = '${centerId}' || line_id = '${centerId}')`,
          '-created',
          1,
          0,
        )
        if (query.length > 0) depRecord = query[0]
      } catch (_) {}
    }

    if (depRecord) {
      depRecord.set('active', false)
      $app.save(depRecord)
    }

    // Atualiza o cadastro do centro (se existir em production_lines) para is_active = false
    if (centerId) {
      try {
        const centerRec = $app.findRecordById('production_lines', centerId)
        if (centerRec) {
          centerRec.set('is_active', false)
          $app.save(centerRec)
        }
      } catch (_) {}
    }

    // Auditoria append-only
    try {
      const col = $app.findCollectionByNameOrId('pcp_audit_logs')
      if (col) {
        const audit = new Record(col)
        const user = $apis.requestInfo(e).authRecord
        audit.set('user_id', user ? user.id : '')
        audit.set('user_email', user ? user.get('email') : 'sistema@ciafal.com.br')
        audit.set('user_name', user ? user.get('name') : 'Sistema PCP')
        audit.set('user_role', user ? user.get('role') : 'PCP_ADMIN')
        audit.set('event_type', 'HIERARCHY_MAINTENANCE')
        audit.set('action', 'DESATIVAÇÃO_CENTRO_HIERARQUIA')
        audit.set('resource', 'line_sequencing_dependencies')
        audit.set('resource_id', centerId || lineId || '')
        audit.set('permission_required', 'pcp.lines.manage')
        audit.set('scope', `Linha ${lineId} | Centro ${centerCode || centerId}`)
        audit.set('outcome', 'SUCCESS')
        audit.set('details', {
          empresa: 'CIAFAL',
          linha: lineId,
          centro: centerCode,
          centro_id: centerId,
          centro_nome: centerName,
          status_anterior: 'Ativo',
          status_posterior: 'Inativo',
          operacao: 'DESATIVAÇÃO_CENTRO_HIERARQUIA',
          motivo: reason || 'Centro possui histórico de programação',
          resultado: 'SUCCESS',
          has_history: true,
          timestamp: new Date().toISOString(),
        })
        $app.save(audit)
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: `Centro '${centerCode || ''} — ${centerName || ''}' desativado com sucesso. O histórico de programações foi preservado.`,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Falha ao desativar centro na hierarquia.' })
  }
})

routerAdd('POST', '/backend/v1/pcp/hierarchy/reactivate-center', (e) => {
  try {
    const data = $apis.requestInfo(e).data || {}
    const { lineId, centerId, centerCode, centerName, dependencyId } = data

    if (dependencyId) {
      try {
        const depRecord = $app.findRecordById('line_sequencing_dependencies', dependencyId)
        depRecord.set('active', true)
        $app.save(depRecord)
      } catch (_) {}
    }

    if (centerId) {
      try {
        const centerRec = $app.findRecordById('production_lines', centerId)
        if (centerRec) {
          centerRec.set('is_active', true)
          $app.save(centerRec)
        }
      } catch (_) {}
    }

    try {
      const col = $app.findCollectionByNameOrId('pcp_audit_logs')
      if (col) {
        const audit = new Record(col)
        const user = $apis.requestInfo(e).authRecord
        audit.set('user_id', user ? user.id : '')
        audit.set('user_email', user ? user.get('email') : 'sistema@ciafal.com.br')
        audit.set('user_name', user ? user.get('name') : 'Sistema PCP')
        audit.set('user_role', user ? user.get('role') : 'PCP_ADMIN')
        audit.set('event_type', 'HIERARCHY_MAINTENANCE')
        audit.set('action', 'REATIVAÇÃO_CENTRO_HIERARQUIA')
        audit.set('resource', 'line_sequencing_dependencies')
        audit.set('resource_id', centerId || lineId || '')
        audit.set('permission_required', 'pcp.lines.manage')
        audit.set('scope', `Linha ${lineId} | Centro ${centerCode || centerId}`)
        audit.set('outcome', 'SUCCESS')
        audit.set('details', {
          empresa: 'CIAFAL',
          linha: lineId,
          centro: centerCode,
          centro_id: centerId,
          centro_nome: centerName,
          status_anterior: 'Inativo',
          status_posterior: 'Ativo',
          operacao: 'REATIVAÇÃO_CENTRO_HIERARQUIA',
          motivo: 'Reativação administrativa de centro na hierarquia',
          resultado: 'SUCCESS',
          has_history: false,
          timestamp: new Date().toISOString(),
        })
        $app.save(audit)
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: `Centro '${centerCode || ''} — ${centerName || ''}' reativado com sucesso.`,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Falha ao reativar centro.' })
  }
})

// Bloqueio direto na tentativa de DELETE via API em line_sequencing_dependencies
onRecordDeleteRequest((e) => {
  const rec = e.record
  const targetCenterId = rec.get('next_line_id') || rec.get('line_id')

  let centerCode = ''
  if (targetCenterId) {
    try {
      const cRec = $app.findRecordById('production_lines', targetCenterId)
      if (cRec) centerCode = cRec.get('code')
    } catch (_) {}
  }

  let historyCount = 0
  const collectionsToCheck = [
    'weekly_schedules',
    'pcp_weekly_schedules',
    'daily_schedules',
    'pcp_daily_schedules',
    'monthly_schedules',
    'pcp_monthly_schedules',
    'schedule_versions',
    'pcp_schedule_versions',
    'production_orders',
    'pcp_production_orders',
    'production_appointments',
    'pcp_delivery_items',
    'pcp_deliveries',
    'line_capacities',
    'line_master_sheets',
    'pcp_mp_inventory_demands',
  ]

  for (let i = 0; i < collectionsToCheck.length; i++) {
    const colName = collectionsToCheck[i]
    try {
      if (!$app.findCollectionByNameOrId(colName)) continue

      const filterParts = []
      if (targetCenterId) {
        filterParts.push(`center_id = '${targetCenterId}'`)
        filterParts.push(`work_center_id = '${targetCenterId}'`)
      }
      if (centerCode) {
        filterParts.push(`center_code = '${centerCode}'`)
        filterParts.push(`work_center_code = '${centerCode}'`)
        filterParts.push(`work_center = '${centerCode}'`)
      }

      if (filterParts.length > 0) {
        const filterStr = filterParts.join(' || ')
        const records = $app.findRecordsByFilter(colName, filterStr, '-created', 1, 0)
        if (records && records.length > 0) {
          historyCount += records.length
          break
        }
      }
    } catch (_) {}
  }

  if (historyCount > 0) {
    throw new BadRequestError(
      'Não foi possível remover este Centro porque ele já possui utilização no PCP. Atualize a tela e utilize a opção Desativar.',
    )
  }

  return e.next()
}, 'line_sequencing_dependencies')
