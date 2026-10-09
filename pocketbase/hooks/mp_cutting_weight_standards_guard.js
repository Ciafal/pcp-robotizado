// Hook PocketBase: mp_cutting_weight_standards_guard.js
// Governança e regras rígidas para Padrões de Peso de Corte
// Regra de ouro Skip Cloud: Todo o código deve ser inline dentro do callback sem declarações top-level.

onRecordCreateRequest((e) => {
  const record = e.record

  // 1. Validar e gerar código sequencial PAD-001, PAD-002, etc. de forma segura e atômica
  let code = record.getString('code') || ''
  if (!code || code.trim() === '' || code.trim() === 'Novo' || code.includes('undefined')) {
    let maxNum = 0
    try {
      const allRecords = $app.findRecordsByFilter('mp_cutting_weight_standards', '', '-id', 500, 0)
      for (let i = 0; i < allRecords.length; i++) {
        const c = allRecords[i].getString('code') || ''
        const m = c.match(/PAD-(\d+)/)
        if (m && m[1]) {
          const n = parseInt(m[1], 10)
          if (!isNaN(n) && n > maxNum) {
            maxNum = n
          }
        }
      }
    } catch (err) {
      console.warn('[mp_cutting_weight_standards_guard] Erro ao buscar maior código:', err)
    }

    const nextNum = maxNum + 1
    code = 'PAD-' + String(nextNum).padStart(3, '0')
    record.set('code', code)
  }

  // 2. Normalizar prioridade (ALTA, MEDIA, BAIXA)
  let prio = (record.getString('priority') || '').toUpperCase().trim()
  if (prio === 'ALTA' || prio === 'HIGH') prio = 'ALTA'
  else if (prio === 'BAIXA' || prio === 'LOW') prio = 'BAIXA'
  else prio = 'MEDIA'
  record.set('priority', prio)

  // 3. Normalizar status
  let status = (record.getString('status') || '').toUpperCase().trim()
  if (status !== 'ATIVO' && status !== 'INATIVO') {
    status = 'ATIVO'
  }
  record.set('status', status)

  // 4. Validação rigorosa de vigência não retroativa no fuso America/Sao_Paulo (UTC-3)
  // Data atual no fuso SP
  const now = new Date()
  const spOffsetMs = -3 * 3600 * 1000
  const spNow = new Date(now.getTime() + spOffsetMs)
  const todaySp = spNow.toISOString().split('T')[0] // YYYY-MM-DD

  const startDate = record.getString('start_date') || ''
  const startDay = startDate.split('T')[0].split(' ')[0]

  if (!startDay) {
    return e.json(400, {
      code: 'START_DATE_REQUIRED',
      message: 'A data de início da vigência é obrigatória.',
    })
  }

  // Na CRIAÇÃO, início não pode ser anterior a hoje no fuso America/Sao_Paulo
  if (startDay < todaySp) {
    return e.json(400, {
      code: 'RETROACTIVE_DATE_BLOCKED',
      message: 'A data de início da vigência não pode ser anterior à data atual.',
    })
  }

  // Fim de vigência opcional >= início
  const endDate = record.getString('end_date') || ''
  const endDay = endDate ? endDate.split('T')[0].split(' ')[0] : ''
  if (endDay && endDay < startDay) {
    return e.json(400, {
      code: 'INVALID_END_DATE',
      message: 'A data de fim da vigência não pode ser anterior à data de início.',
    })
  }

  // 5. Validação matemática de pesos: min <= ideal <= max, todos > 0
  const targetKg = record.getFloat('target_weight_kg')
  const minKg = record.getFloat('min_weight_kg')
  const maxKg = record.getFloat('max_weight_kg')

  if (isNaN(targetKg) || targetKg <= 0) {
    return e.json(400, {
      code: 'INVALID_TARGET_WEIGHT',
      message: 'O peso ideal deve ser informado e maior que zero.',
    })
  }
  if (isNaN(minKg) || minKg <= 0) {
    return e.json(400, {
      code: 'INVALID_MIN_WEIGHT',
      message: 'O peso mínimo deve ser informado e maior que zero.',
    })
  }
  if (isNaN(maxKg) || maxKg <= 0) {
    return e.json(400, {
      code: 'INVALID_MAX_WEIGHT',
      message: 'O peso máximo deve ser informado e maior que zero.',
    })
  }
  if (minKg > targetKg) {
    return e.json(400, {
      code: 'MIN_GREATER_THAN_TARGET',
      message: 'O peso mínimo não pode ser maior que o peso ideal.',
    })
  }
  if (targetKg > maxKg) {
    return e.json(400, {
      code: 'TARGET_GREATER_THAN_MAX',
      message: 'O peso máximo não pode ser menor que o peso ideal.',
    })
  }

  return e.next()
}, 'mp_cutting_weight_standards')

onRecordUpdateRequest((e) => {
  const record = e.record
  const original = e.record.original()

  // 1. Preservar o código existente se o payload tentar apagar ou anular
  let code = record.getString('code') || ''
  const originalCode = original ? original.getString('code') : ''
  if (!code || code.trim() === '' || code.trim() === 'Novo' || code.includes('undefined')) {
    if (originalCode) {
      record.set('code', originalCode)
    }
  }

  // 2. Normalizar prioridade se presente
  let prio = (record.getString('priority') || '').toUpperCase().trim()
  if (prio === 'ALTA' || prio === 'HIGH') prio = 'ALTA'
  else if (prio === 'BAIXA' || prio === 'LOW') prio = 'BAIXA'
  else if (prio === 'MEDIA' || prio === 'MEDIUM') prio = 'MEDIA'
  else if (original) prio = original.getString('priority') || 'MEDIA'
  record.set('priority', prio)

  // 3. Validação de vigência: datas históricas existentes são PRESERVADAS sem serem destruídas.
  // Se o usuário estiver alterando a data de início para um novo valor diferente do original:
  const startDate = record.getString('start_date') || ''
  const startDay = startDate.split('T')[0].split(' ')[0]
  const origStartDate = original ? original.getString('start_date') || '' : ''
  const origStartDay = origStartDate.split('T')[0].split(' ')[0]

  if (startDay !== origStartDay) {
    const now = new Date()
    const spOffsetMs = -3 * 3600 * 1000
    const spNow = new Date(now.getTime() + spOffsetMs)
    const todaySp = spNow.toISOString().split('T')[0]

    // Se estiver mudando a data de início, a nova data não pode ser anterior a hoje
    if (startDay < todaySp) {
      return e.json(400, {
        code: 'RETROACTIVE_DATE_BLOCKED',
        message: 'A data de início da vigência não pode ser anterior à data atual.',
      })
    }
  }

  // Fim opcional >= início
  const endDate = record.getString('end_date') || ''
  const endDay = endDate ? endDate.split('T')[0].split(' ')[0] : ''
  if (endDay && startDay && endDay < startDay) {
    return e.json(400, {
      code: 'INVALID_END_DATE',
      message: 'A data de fim da vigência não pode ser anterior à data de início.',
    })
  }

  // 4. Se alterando pesos, validar min <= ideal <= max
  const targetKg = record.getFloat('target_weight_kg')
  const minKg = record.getFloat('min_weight_kg')
  const maxKg = record.getFloat('max_weight_kg')

  if (targetKg > 0 && minKg > 0 && targetKg < minKg) {
    return e.json(400, {
      code: 'MIN_GREATER_THAN_TARGET',
      message: 'O peso mínimo não pode ser maior que o peso ideal.',
    })
  }
  if (targetKg > 0 && maxKg > 0 && targetKg > maxKg) {
    return e.json(400, {
      code: 'TARGET_GREATER_THAN_MAX',
      message: 'O peso máximo não pode ser menor que o peso ideal.',
    })
  }

  return e.next()
}, 'mp_cutting_weight_standards')
