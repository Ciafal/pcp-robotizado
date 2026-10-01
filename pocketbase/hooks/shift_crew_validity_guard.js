/**
 * pb_hook: shift_crew_validity_guard.js
 *
 * Regras de cardinalidade e vigência para vínculos Turno × Turma:
 * 1. 1 Turno pode ter várias turmas.
 * 2. 1 Turma NÃO pode pertencer simultaneamente a mais de 1 Turno (nem sobreposição de vigência).
 * 3. Mesma turma só pode ser vinculada a outro turno quando o anterior estiver encerrado/inativo
 *    e sem sobreposição de vigência.
 * 4. Bloquear sobreposição com mensagem EXATA:
 *    "Esta turma já possui vínculo vigente com o turno [TURNO]. Encerre ou altere a vigência do vínculo existente antes de realizar um novo vínculo."
 * 5. Bloquear duplicidade exata (mesmo Turno + mesma Turma + mesmo período).
 * 6. Data Início obrigatória (valid_from).
 * 7. Data Fim opcional, mas quando preenchida não pode ser anterior a Data Início.
 * 8. Auditoria append-only em pcp_audit_logs para criação e edição de vínculos.
 *
 * NOTA: O JSVM do PocketBase executa callbacks em pools isolados, portanto todas as
 * funções utilitárias devem ser definidas dentro do corpo de cada callback.
 */

// Interceptor de Validação para Criação
onRecordCreateRequest((e) => {
  function toIsoDay(val) {
    if (!val) return ''
    const s = String(val).trim()
    if (!s) return ''
    if (s.includes('/')) {
      const parts = s.split('/')
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      }
    }
    return s.slice(0, 10)
  }

  function overlaps(startA, endA, startB, endB) {
    const sA = startA || '0000-01-01'
    const eA = endA || '9999-12-31'
    const sB = startB || '0000-01-01'
    const eB = endB || '9999-12-31'
    return sA <= eB && eA >= sB
  }

  function resolveShiftCode(shiftId) {
    if (!shiftId) return 'Turno'
    try {
      const s = $app.findRecordById('production_shifts', shiftId)
      return s.getString('code') || s.getString('name') || shiftId
    } catch (_) {
      return shiftId
    }
  }

  function resolveCrewCode(crewId) {
    if (!crewId) return 'Turma'
    try {
      const c = $app.findRecordById('production_crews', crewId)
      return c.getString('code') || c.getString('name') || crewId
    } catch (_) {
      return crewId
    }
  }

  const record = e.record
  const crewId = record.getString('crew_id')
  const shiftId = record.getString('shift_id')
  const rawStatus = (record.getString('status') || '').toUpperCase()
  const status = rawStatus === 'INATIVO' ? 'INATIVO' : 'ATIVO'
  record.set('status', status)
  record.set('active', status === 'ATIVO')

  if (!shiftId) {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'Selecione o Turno.',
      data: { shift_id: { code: 'required', message: 'Selecione o Turno.' } },
    })
  }

  if (!crewId) {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'Selecione a Turma Operacional.',
      data: { crew_id: { code: 'required', message: 'Selecione a Turma Operacional.' } },
    })
  }

  const rawFrom = record.get('valid_from')
  const fromIso = toIsoDay(rawFrom)
  if (!fromIso) {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'Data de início é obrigatória.',
      data: { valid_from: { code: 'required', message: 'Data de início é obrigatória.' } },
    })
  }

  const rawUntil = record.get('valid_until')
  const untilIso = toIsoDay(rawUntil)
  if (untilIso && untilIso < fromIso) {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'A Data de fim não pode ser anterior à Data de início.',
      data: {
        valid_until: {
          code: 'invalid_range',
          message: 'A Data de fim não pode ser anterior à Data de início.',
        },
      },
    })
  }

  // Se o novo registro está ativo, verificar conflitos de vigência com outros vínculos da MESMA turma
  if (status === 'ATIVO') {
    const existing = $app.findRecordsByFilter(
      'production_shift_crews',
      `crew_id = '${crewId}'`,
      '-created',
      100,
      0,
    )

    for (let i = 0; i < existing.length; i++) {
      const other = existing[i]
      const otherStatus = (
        other.getString('status') || (other.getBool('active') ? 'ATIVO' : 'INATIVO')
      ).toUpperCase()
      if (otherStatus !== 'ATIVO') {
        continue
      }

      const otherFrom = toIsoDay(other.get('valid_from')) || '0000-01-01'
      const otherUntil = toIsoDay(other.get('valid_until'))

      if (overlaps(fromIso, untilIso, otherFrom, otherUntil)) {
        const conflictShiftId = other.getString('shift_id')
        const conflictShiftCode = resolveShiftCode(conflictShiftId)

        return e.json(400, {
          code: 'VALIDATION_ERROR',
          message: `Esta turma já possui vínculo vigente com o turno ${conflictShiftCode}. Encerre ou altere a vigência do vínculo existente antes de realizar um novo vínculo.`,
          data: {
            crew_id: {
              code: 'crew_active_conflict',
              message: `Esta turma já possui vínculo vigente com o turno ${conflictShiftCode}. Encerre ou altere a vigência do vínculo existente antes de realizar um novo vínculo.`,
            },
          },
        })
      }
    }
  }

  const shiftCode = resolveShiftCode(shiftId)
  const crewCode = resolveCrewCode(crewId)

  const res = e.next()

  // Registrar auditoria
  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    if (auditCol) {
      const authRecord = e.auth
      const userId = authRecord ? authRecord.id : ''
      const userEmail = authRecord ? authRecord.getString('email') : 'sistema@ciafal.com.br'
      const userName = authRecord ? authRecord.getString('name') || userEmail : 'Usuário do Sistema'
      const userRole = authRecord ? authRecord.getString('role') || 'PCP_OPERATOR' : 'PCP_OPERATOR'

      const lineId = record.getString('line_id')
      let lineCode = lineId
      let lineCenter = ''
      try {
        if (lineId) {
          const l = $app.findRecordById('production_lines', lineId)
          lineCode = l.getString('code') || lineId
          lineCenter = l.getString('center_code') || l.getString('center_name') || ''
        }
      } catch (_) {}

      const log = new Record(auditCol)
      log.set('user_id', userId)
      log.set('user_email', userEmail)
      log.set('user_name', userName)
      log.set('user_role', userRole)
      log.set('event_type', 'SCHEDULE_ACTION')
      log.set('action', 'CREATE_SHIFT_CREW_LINK')
      log.set('resource', 'production_shift_crews')
      log.set('resource_id', record.id || '')
      log.set('permission_required', 'pcp.masterdata.edit')
      log.set('outcome', 'SUCCESS')
      log.set('screen', 'Turnos e Turmas')
      log.set('module', 'PCP Robotizado - Ficha Mestra')
      log.set('line', lineCode)
      log.set('center', lineCenter)
      log.set('status', status)
      log.set('changes', {
        turno: shiftCode,
        turma: crewCode,
        valores_anteriores: null,
        valores_novos: {
          shift_id: shiftId,
          crew_id: crewId,
          valid_from: fromIso,
          valid_until: untilIso || null,
          status: status,
          notes: record.getString('notes'),
        },
      })
      log.set('details', {
        shift_id: shiftId,
        crew_id: crewId,
        shift_code: shiftCode,
        crew_code: crewCode,
        action: 'CREATE_SHIFT_CREW_LINK',
      })
      $app.save(log)
    }
  } catch (err) {
    console.log('[AUDIT] Falha ao gravar auditoria do vínculo shift_crews:', err)
  }

  return res
}, 'production_shift_crews')

// Interceptor de Validação para Atualização (Edição)
onRecordUpdateRequest((e) => {
  function toIsoDay(val) {
    if (!val) return ''
    const s = String(val).trim()
    if (!s) return ''
    if (s.includes('/')) {
      const parts = s.split('/')
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      }
    }
    return s.slice(0, 10)
  }

  function overlaps(startA, endA, startB, endB) {
    const sA = startA || '0000-01-01'
    const eA = endA || '9999-12-31'
    const sB = startB || '0000-01-01'
    const eB = endB || '9999-12-31'
    return sA <= eB && eA >= sB
  }

  function resolveShiftCode(shiftId) {
    if (!shiftId) return 'Turno'
    try {
      const s = $app.findRecordById('production_shifts', shiftId)
      return s.getString('code') || s.getString('name') || shiftId
    } catch (_) {
      return shiftId
    }
  }

  function resolveCrewCode(crewId) {
    if (!crewId) return 'Turma'
    try {
      const c = $app.findRecordById('production_crews', crewId)
      return c.getString('code') || c.getString('name') || crewId
    } catch (_) {
      return crewId
    }
  }

  const record = e.record
  const crewId = record.getString('crew_id')
  const shiftId = record.getString('shift_id')
  const rawStatus = (record.getString('status') || '').toUpperCase()
  const status = rawStatus === 'INATIVO' ? 'INATIVO' : 'ATIVO'
  record.set('status', status)
  record.set('active', status === 'ATIVO')

  if (!shiftId) {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'Selecione o Turno.',
      data: { shift_id: { code: 'required', message: 'Selecione o Turno.' } },
    })
  }

  if (!crewId) {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'Selecione a Turma Operacional.',
      data: { crew_id: { code: 'required', message: 'Selecione a Turma Operacional.' } },
    })
  }

  const rawFrom = record.get('valid_from')
  const fromIso = toIsoDay(rawFrom)
  if (!fromIso) {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'Data de início é obrigatória.',
      data: { valid_from: { code: 'required', message: 'Data de início é obrigatória.' } },
    })
  }

  const rawUntil = record.get('valid_until')
  const untilIso = toIsoDay(rawUntil)
  if (untilIso && untilIso < fromIso) {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'A Data de fim não pode ser anterior à Data de início.',
      data: {
        valid_until: {
          code: 'invalid_range',
          message: 'A Data de fim não pode ser anterior à Data de início.',
        },
      },
    })
  }

  let oldRecord = null
  try {
    oldRecord = $app.findRecordById('production_shift_crews', record.id)
  } catch (_) {}

  // Se estiver ATIVO, verificar conflito com outros vínculos ativos da mesma turma
  if (status === 'ATIVO') {
    const existing = $app.findRecordsByFilter(
      'production_shift_crews',
      `crew_id = '${crewId}' && id != '${record.id}'`,
      '-created',
      100,
      0,
    )

    for (let i = 0; i < existing.length; i++) {
      const other = existing[i]
      const otherStatus = (
        other.getString('status') || (other.getBool('active') ? 'ATIVO' : 'INATIVO')
      ).toUpperCase()
      if (otherStatus !== 'ATIVO') {
        continue
      }

      const otherFrom = toIsoDay(other.get('valid_from')) || '0000-01-01'
      const otherUntil = toIsoDay(other.get('valid_until'))

      if (overlaps(fromIso, untilIso, otherFrom, otherUntil)) {
        const conflictShiftId = other.getString('shift_id')
        const conflictShiftCode = resolveShiftCode(conflictShiftId)

        return e.json(400, {
          code: 'VALIDATION_ERROR',
          message: `Esta turma já possui vínculo vigente com o turno ${conflictShiftCode}. Encerre ou altere a vigência do vínculo existente antes de realizar um novo vínculo.`,
          data: {
            crew_id: {
              code: 'crew_active_conflict',
              message: `Esta turma já possui vínculo vigente com o turno ${conflictShiftCode}. Encerre ou altere a vigência do vínculo existente antes de realizar um novo vínculo.`,
            },
          },
        })
      }
    }
  }

  const shiftCode = resolveShiftCode(shiftId)
  const crewCode = resolveCrewCode(crewId)

  const res = e.next()

  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    if (auditCol) {
      const authRecord = e.auth
      const userId = authRecord ? authRecord.id : ''
      const userEmail = authRecord ? authRecord.getString('email') : 'sistema@ciafal.com.br'
      const userName = authRecord ? authRecord.getString('name') || userEmail : 'Usuário do Sistema'
      const userRole = authRecord ? authRecord.getString('role') || 'PCP_OPERATOR' : 'PCP_OPERATOR'

      const lineId = record.getString('line_id')
      let lineCode = lineId
      let lineCenter = ''
      try {
        if (lineId) {
          const l = $app.findRecordById('production_lines', lineId)
          lineCode = l.getString('code') || lineId
          lineCenter = l.getString('center_code') || l.getString('center_name') || ''
        }
      } catch (_) {}

      const oldValues = oldRecord
        ? {
            shift_id: oldRecord.getString('shift_id'),
            crew_id: oldRecord.getString('crew_id'),
            valid_from: toIsoDay(oldRecord.get('valid_from')),
            valid_until: toIsoDay(oldRecord.get('valid_until')) || null,
            status:
              oldRecord.getString('status') || (oldRecord.getBool('active') ? 'ATIVO' : 'INATIVO'),
            notes: oldRecord.getString('notes'),
          }
        : null

      let specificAction = 'UPDATE_SHIFT_CREW_LINK'
      if (oldValues && oldValues.status !== status) {
        specificAction =
          status === 'ATIVO' ? 'ACTIVATE_SHIFT_CREW_LINK' : 'INACTIVATE_SHIFT_CREW_LINK'
      } else if (oldValues && oldValues.shift_id !== shiftId) {
        specificAction = 'CHANGE_SHIFT_IN_CREW_LINK'
      } else if (oldValues && oldValues.crew_id !== crewId) {
        specificAction = 'CHANGE_CREW_IN_SHIFT_LINK'
      }

      const log = new Record(auditCol)
      log.set('user_id', userId)
      log.set('user_email', userEmail)
      log.set('user_name', userName)
      log.set('user_role', userRole)
      log.set('event_type', 'SCHEDULE_ACTION')
      log.set('action', specificAction)
      log.set('resource', 'production_shift_crews')
      log.set('resource_id', record.id || '')
      log.set('permission_required', 'pcp.masterdata.edit')
      log.set('outcome', 'SUCCESS')
      log.set('screen', 'Turnos e Turmas')
      log.set('module', 'PCP Robotizado - Ficha Mestra')
      log.set('line', lineCode)
      log.set('center', lineCenter)
      log.set('status', status)
      log.set('changes', {
        turno: shiftCode,
        turma: crewCode,
        valores_anteriores: oldValues,
        valores_novos: {
          shift_id: shiftId,
          crew_id: crewId,
          valid_from: fromIso,
          valid_until: untilIso || null,
          status: status,
          notes: record.getString('notes'),
        },
      })
      log.set('details', {
        shift_id: shiftId,
        crew_id: crewId,
        shift_code: shiftCode,
        crew_code: crewCode,
        action: specificAction,
      })
      $app.save(log)
    }
  } catch (err) {
    console.log('[AUDIT] Falha ao gravar auditoria no update de shift_crews:', err)
  }

  return res
}, 'production_shift_crews')
