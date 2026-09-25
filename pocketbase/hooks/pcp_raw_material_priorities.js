// pocketbase/hooks/pcp_raw_material_priorities.js
// Hook e endpoint para salvamento idempotente, validação de sobreposição e reorganização atômica em transação ($app.runInTransaction)

routerAdd('POST', '/backend/v1/pcp/raw-material-priorities/save', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação requerida' })
  }

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id
  const userName = authRecord.getString('name') || authRecord.getString('email') || 'Usuário PCP'
  const userEmail = authRecord.getString('email') || ''

  const body = e.requestInfo().body || {}
  const id = (body.id || '').trim()
  const lineId = (body.line_id || '').trim()
  const lineMasterId = (body.line_master_id || '').trim()
  const materialCode = (body.material_code || '').trim().toUpperCase()
  const materialDescription = (body.material_description || '').trim()
  const bitola = (body.bitola || '').trim()
  const materialGroup = (body.material_group || '').trim()
  const priorityOrder = parseInt(body.priority_order, 10)
  const validFrom = (body.valid_from || '').trim()
  const validUntil = (body.valid_until || '').trim()
  const criterioPrioridade = (body.criterio_prioridade || 'Rotativa').trim()
  const descricaoOutroCriterio = (body.descricao_outro_criterio || '').trim()
  const active = body.active !== false
  const idempotencyKey = (body.idempotency_key || '').trim()
  const reorganizeHierarchy = body.reorganize_hierarchy === true

  // 1. Validações básicas
  if (!lineId) {
    return e.json(400, { error: 'O vínculo com o Centro/Linha é obrigatório.' })
  }
  if (!materialCode) {
    return e.json(400, { error: 'O Código da Matéria-Prima é obrigatório.' })
  }
  if (!materialDescription) {
    return e.json(400, { error: 'A Descrição da Matéria-Prima é obrigatória.' })
  }
  if (!priorityOrder || isNaN(priorityOrder) || priorityOrder < 1) {
    return e.json(400, { error: 'Informe uma ordem de prioridade maior ou igual a 1.' })
  }
  if (!validFrom) {
    return e.json(400, { error: 'A data de início é obrigatória.' })
  }
  if (validUntil && validUntil < validFrom) {
    return e.json(400, { error: 'A data fim deve ser igual ou posterior à data de início.' })
  }

  // 2. Proteção de Idempotência no Backend para criação (se idempotency_key for enviada)
  if (!id && idempotencyKey) {
    try {
      const existingByIdemp = $app.findRecordsByFilter(
        'line_raw_material_priorities',
        `idempotency_key = '${idempotencyKey}'`,
        '-created',
        1,
        0,
      )
      if (existingByIdemp.length > 0) {
        return e.json(200, {
          success: true,
          idempotent: true,
          record: existingByIdemp[0],
          reorganizedCount: 0,
          message: 'Prioridade de MP salva com sucesso.',
        })
      }
    } catch (_) {}
  }

  // 3. Buscar prioridades ativas existentes para a mesma linha
  let activeList = []
  try {
    activeList = $app.findRecordsByFilter(
      'line_raw_material_priorities',
      `line_id = '${lineId}' && active = true`,
      'priority_order',
      500,
      0,
    )
  } catch (err) {
    activeList = []
  }

  // Função auxiliar de overlap
  const isOverlapping = (startA, endA, startB, endB) => {
    const sA = startA || '1970-01-01'
    const eA = endA || '9999-12-31'
    const sB = startB || '1970-01-01'
    const eB = endB || '9999-12-31'
    return sA <= eB && eA >= sB
  }

  // 4. Checar conflito com prioridade ativa igual no mesmo período
  if (active) {
    const conflicting = activeList.filter((rec) => {
      if (id && rec.id === id) return false
      const recPrio = rec.getInt('priority_order')
      if (recPrio !== priorityOrder) return false
      const recFrom = (rec.getString('valid_from') || '').slice(0, 10)
      const recUntil = (rec.getString('valid_until') || '').slice(0, 10)
      return isOverlapping(validFrom, validUntil, recFrom, recUntil)
    })

    if (conflicting.length > 0 && !reorganizeHierarchy) {
      // Retorna conflito com a lista de impacto prevista
      // Reorganização prevista: todos com prio >= priorityOrder que estejam ativos e sobreponham período
      const shiftCandidates = activeList
        .filter((rec) => {
          if (id && rec.id === id) return false
          const recPrio = rec.getInt('priority_order')
          if (recPrio < priorityOrder) return false
          const recFrom = (rec.getString('valid_from') || '').slice(0, 10)
          const recUntil = (rec.getString('valid_until') || '').slice(0, 10)
          return isOverlapping(validFrom, validUntil, recFrom, recUntil)
        })
        .sort((a, b) => a.getInt('priority_order') - b.getInt('priority_order'))

      // Se for edição, pode ser deslocamento para baixo ou para cima
      let impactList = []
      impactList.push({
        material_code: materialCode,
        material_description: materialDescription,
        current_priority: id
          ? (activeList.find((r) => r.id === id)?.getInt('priority_order') ?? null)
          : null,
        new_priority: priorityOrder,
        is_target: true,
      })

      shiftCandidates.forEach((c) => {
        const curPrio = c.getInt('priority_order')
        impactList.push({
          id: c.id,
          material_code: c.getString('material_code'),
          material_description: c.getString('material_description'),
          current_priority: curPrio,
          new_priority: curPrio + 1,
          is_target: false,
        })
      })

      return e.json(409, {
        conflict: true,
        message: `Já existe uma matéria-prima cadastrada como prioridade #${priorityOrder} para este Centro durante o período informado. Deseja inserir esta matéria-prima como prioridade #${priorityOrder} e reorganizar automaticamente toda a hierarquia?`,
        conflictingRecord: conflicting[0],
        impactList: impactList,
      })
    }
  }

  // 5. Executar em Transação Única ($app.runInTransaction)
  let resultRecord = null
  let reorganizedCount = 0
  let auditLogsToInsert = []

  try {
    $app.runInTransaction((txApp) => {
      const col = txApp.findCollectionByNameOrId('line_raw_material_priorities')

      let oldPrioForTarget = null
      let targetRecord = null

      if (id) {
        targetRecord = txApp.findRecordById('line_raw_material_priorities', id)
        oldPrioForTarget = targetRecord.getInt('priority_order')
      }

      // Se reorganização foi solicitada e o registro está ativo
      if (active && reorganizeHierarchy) {
        // Obter todos ativos da linha novamente dentro da transação
        const currentActive = txApp.findRecordsByFilter(
          'line_raw_material_priorities',
          `line_id = '${lineId}' && active = true`,
          '-priority_order',
          500,
          0,
        )

        // Se for NOVO CADASTRO assumindo prioridade P:
        // Deslocar todos com priority_order >= P que sobreponham o período (+1)
        if (!id) {
          const toShift = currentActive.filter((rec) => {
            const p = rec.getInt('priority_order')
            if (p < priorityOrder) return false
            const recFrom = (rec.getString('valid_from') || '').slice(0, 10)
            const recUntil = (rec.getString('valid_until') || '').slice(0, 10)
            return isOverlapping(validFrom, validUntil, recFrom, recUntil)
          })

          // Ordenar decrescente para não colidir
          toShift.sort((a, b) => b.getInt('priority_order') - a.getInt('priority_order'))

          toShift.forEach((rec) => {
            const oldVal = rec.getInt('priority_order')
            const newVal = oldVal + 1
            rec.set('priority_order', newVal)
            rec.set('atualizado_por', userName)
            txApp.save(rec)
            reorganizedCount++

            auditLogsToInsert.push({
              action: 'REORGANIZE_RAW_MATERIAL_PRIORITY',
              resource_id: rec.id,
              mp: rec.getString('material_code'),
              old_prio: oldVal,
              new_prio: newVal,
              reason: `Hierarquia reorganizada: MP ${rec.getString('material_code')} — prioridade alterada de ${oldVal} para ${newVal}`,
            })
          })
        } else if (oldPrioForTarget !== null && oldPrioForTarget !== priorityOrder) {
          // EDIÇÃO DE PRIORIDADE: Exemplo 4 para 2
          // Se oldPrio > newPrio (ex 4 -> 2): desloca quem está entre newPrio e oldPrio-1 para +1 (2->3, 3->4)
          // Se oldPrio < newPrio (ex 2 -> 4): desloca quem está entre oldPrio+1 e newPrio para -1 (3->2, 4->3)
          if (oldPrioForTarget > priorityOrder) {
            const toShift = currentActive.filter((rec) => {
              if (rec.id === id) return false
              const p = rec.getInt('priority_order')
              if (p < priorityOrder || p >= oldPrioForTarget) return false
              const recFrom = (rec.getString('valid_from') || '').slice(0, 10)
              const recUntil = (rec.getString('valid_until') || '').slice(0, 10)
              return isOverlapping(validFrom, validUntil, recFrom, recUntil)
            })
            toShift.sort((a, b) => b.getInt('priority_order') - a.getInt('priority_order'))

            toShift.forEach((rec) => {
              const oldVal = rec.getInt('priority_order')
              const newVal = oldVal + 1
              rec.set('priority_order', newVal)
              rec.set('atualizado_por', userName)
              txApp.save(rec)
              reorganizedCount++

              auditLogsToInsert.push({
                action: 'REORGANIZE_RAW_MATERIAL_PRIORITY',
                resource_id: rec.id,
                mp: rec.getString('material_code'),
                old_prio: oldVal,
                new_prio: newVal,
                reason: `Hierarquia reorganizada: MP ${rec.getString('material_code')} — prioridade alterada de ${oldVal} para ${newVal}`,
              })
            })
          } else {
            // oldPrioForTarget < priorityOrder (ex 2 -> 4)
            const toShift = currentActive.filter((rec) => {
              if (rec.id === id) return false
              const p = rec.getInt('priority_order')
              if (p <= oldPrioForTarget || p > priorityOrder) return false
              const recFrom = (rec.getString('valid_from') || '').slice(0, 10)
              const recUntil = (rec.getString('valid_until') || '').slice(0, 10)
              return isOverlapping(validFrom, validUntil, recFrom, recUntil)
            })
            toShift.sort((a, b) => a.getInt('priority_order') - b.getInt('priority_order'))

            toShift.forEach((rec) => {
              const oldVal = rec.getInt('priority_order')
              const newVal = oldVal - 1
              rec.set('priority_order', newVal)
              rec.set('atualizado_por', userName)
              txApp.save(rec)
              reorganizedCount++

              auditLogsToInsert.push({
                action: 'REORGANIZE_RAW_MATERIAL_PRIORITY',
                resource_id: rec.id,
                mp: rec.getString('material_code'),
                old_prio: oldVal,
                new_prio: newVal,
                reason: `Hierarquia reorganizada: MP ${rec.getString('material_code')} — prioridade alterada de ${oldVal} para ${newVal}`,
              })
            })
          }
        }
      }

      // Agora salva/cria o registro alvo
      if (id) {
        if (!targetRecord) {
          targetRecord = txApp.findRecordById('line_raw_material_priorities', id)
        }
      } else {
        targetRecord = new Record(col)
        targetRecord.set('criado_por', userName)
        if (idempotencyKey) {
          targetRecord.set('idempotency_key', idempotencyKey)
        }
      }

      targetRecord.set('line_id', lineId)
      if (lineMasterId) targetRecord.set('line_master_id', lineMasterId)
      targetRecord.set('material_code', materialCode)
      targetRecord.set('material_description', materialDescription)
      targetRecord.set('bitola', bitola)
      targetRecord.set('material_group', materialGroup)
      targetRecord.set('priority_order', priorityOrder)
      targetRecord.set('valid_from', validFrom)
      targetRecord.set('valid_until', validUntil || null)
      targetRecord.set('criterio_prioridade', criterioPrioridade)
      targetRecord.set('descricao_outro_criterio', descricaoOutroCriterio)
      targetRecord.set('active', active)
      targetRecord.set('source_mode', body.source_mode || 'MANUAL')
      targetRecord.set('atualizado_por', userName)

      txApp.save(targetRecord)
      resultRecord = targetRecord

      // Registrar auditoria do registro principal
      const isEdit = Boolean(id)
      const auditAction = isEdit ? 'UPDATE_RAW_MATERIAL_PRIORITY' : 'CREATE_RAW_MATERIAL_PRIORITY'
      const auditReason = isEdit
        ? `MP ${materialCode} — prioridade alterada ${oldPrioForTarget !== null ? 'de ' + oldPrioForTarget + ' para ' + priorityOrder : 'para ' + priorityOrder}`
        : `MP ${materialCode} — cadastrada como prioridade #${priorityOrder}`

      try {
        const auditCol = txApp.findCollectionByNameOrId('pcp_audit_logs')
        const log = new Record(auditCol)
        log.set('user_id', userId)
        log.set('user_email', userEmail)
        log.set('user_name', userName)
        log.set('user_role', userRole || 'PCP_PROGRAMMER')
        log.set('event_type', 'SCHEDULE_ACTION')
        log.set('action', auditAction)
        log.set('resource', 'line_raw_material_priorities')
        log.set('resource_id', targetRecord.id)
        log.set('permission_required', 'pcp.lines.manage')
        log.set('outcome', 'SUCCESS')
        log.set('company', 'CIAFAL')
        log.set('line', lineId)
        log.set('center', lineId)
        log.set('module', 'Centros e Ficha Mestra')
        log.set('screen', 'Ficha Mestre Expandida > Prioridades MP')
        log.set('entity', 'line_raw_material_priorities')
        log.set('record_id', targetRecord.id)
        log.set('status', active ? 'Ativo' : 'Inativo')
        log.set('reason', auditReason)
        log.set('details', {
          id: targetRecord.id,
          line_id: lineId,
          material_code: materialCode,
          material_description: materialDescription,
          bitola: bitola,
          material_group: materialGroup,
          priority_order: priorityOrder,
          old_priority_order: oldPrioForTarget,
          valid_from: validFrom,
          valid_until: validUntil,
          criterio_prioridade: criterioPrioridade,
          status: active ? 'Ativo' : 'Inativo',
          reorganized_count: reorganizedCount,
        })
        txApp.save(log)

        // Salvar auditorias individuais dos reflexos
        auditLogsToInsert.forEach((auditItem) => {
          const refLog = new Record(auditCol)
          refLog.set('user_id', userId)
          refLog.set('user_email', userEmail)
          refLog.set('user_name', userName)
          refLog.set('user_role', userRole || 'PCP_PROGRAMMER')
          refLog.set('event_type', 'SCHEDULE_ACTION')
          refLog.set('action', auditItem.action)
          refLog.set('resource', 'line_raw_material_priorities')
          refLog.set('resource_id', auditItem.resource_id)
          refLog.set('permission_required', 'pcp.lines.manage')
          refLog.set('outcome', 'SUCCESS')
          refLog.set('company', 'CIAFAL')
          refLog.set('line', lineId)
          refLog.set('center', lineId)
          refLog.set('module', 'Centros e Ficha Mestra')
          refLog.set('screen', 'Ficha Mestre Expandida > Prioridades MP')
          refLog.set('entity', 'line_raw_material_priorities')
          refLog.set('record_id', auditItem.resource_id)
          refLog.set('reason', auditItem.reason)
          refLog.set('details', {
            target_material: materialCode,
            material_code: auditItem.mp,
            old_priority: auditItem.old_prio,
            new_priority: auditItem.new_prio,
            reorganized_by: userName,
          })
          txApp.save(refLog)
        })
      } catch (logErr) {
        // Falha no log não deve impedir transação
      }
    })
  } catch (txErr) {
    return e.json(500, {
      error: 'Falha durante a operação na hierarquia: ' + (txErr.message || String(txErr)),
    })
  }

  let finalMessage = 'Prioridade de MP salva com sucesso.'
  if (reorganizedCount > 0) {
    finalMessage = `Prioridade salva com sucesso. A hierarquia foi reorganizada automaticamente. ${reorganizedCount} prioridades foram atualizadas.`
  } else if (id) {
    finalMessage = 'Prioridade de MP atualizada com sucesso.'
  }

  return e.json(200, {
    success: true,
    record: resultRecord,
    reorganizedCount: reorganizedCount,
    message: finalMessage,
  })
})
