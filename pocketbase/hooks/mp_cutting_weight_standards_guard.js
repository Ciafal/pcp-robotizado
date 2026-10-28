// Hook PocketBase: mp_cutting_weight_standards_guard.js
// Governança e regras rígidas para Padrões de Peso de Corte
// Regra de ouro Skip Cloud: Todo o código deve ser inline dentro do callback sem declarações top-level.

onRecordCreateRequest((e) => {
  const record = e.record

  // 1. Obrigatoriedade de empresa
  let company = (record.getString('company_code') || '').trim()
  if (!company) {
    company = 'CIAFAL'
    record.set('company_code', company)
  }

  // 2. Obrigatoriedade de descrição e tipo de corte (rejeitar vazio)
  const description = (record.getString('description') || '').trim()
  if (!description) {
    return e.json(400, {
      code: 'DESCRIPTION_REQUIRED',
      message: 'A descrição do padrão é obrigatória.',
    })
  }

  const cuttingType = (record.getString('cutting_type') || '').trim()
  if (!cuttingType) {
    return e.json(400, {
      code: 'CUTTING_TYPE_REQUIRED',
      message: 'O tipo de corte é obrigatório.',
    })
  }

  // 3. Validar e gerar código sequencial PAD-001, PAD-002, etc. de forma segura e atômica
  let code = (record.getString('code') || '').trim()
  if (!code || code === 'Novo' || code.includes('undefined')) {
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
  } else {
    // Normalizar código informado
    record.set('code', code)
  }

  // 4. Checagem de UNICIDADE do código na MESMA empresa (em TODOS os registros: ativos E inativos)
  try {
    const existingRecords = $app.findRecordsByFilter(
      'mp_cutting_weight_standards',
      '',
      '-id',
      500,
      0,
    )
    const normCode = code.toUpperCase()
    const normCompany = company.toUpperCase()

    for (let i = 0; i < existingRecords.length; i++) {
      const rec = existingRecords[i]
      const recCode = (rec.getString('code') || '').trim().toUpperCase()
      const recComp = (rec.getString('company_code') || '').trim().toUpperCase()

      if (recCode === normCode && recComp === normCompany) {
        return e.json(400, {
          code: 'DUPLICATE_CODE',
          message: `Código ${code} já existe nesta empresa (ativo ou inativo).`,
        })
      }
    }
  } catch (err) {
    console.warn(
      '[mp_cutting_weight_standards_guard] Erro ao validar unicidade de código no create:',
      err,
    )
  }

  // 5. Normalizar prioridade (ALTA, MEDIA, BAIXA)
  let prio = (record.getString('priority') || '').toUpperCase().trim()
  if (prio === 'ALTA' || prio === 'HIGH') prio = 'ALTA'
  else if (prio === 'BAIXA' || prio === 'LOW') prio = 'BAIXA'
  else prio = 'MEDIA'
  record.set('priority', prio)

  // 6. Normalizar status
  let status = (record.getString('status') || '').toUpperCase().trim()
  if (status !== 'ATIVO' && status !== 'INATIVO') {
    status = 'ATIVO'
  }
  record.set('status', status)

  // 7. Validação rigorosa de vigência não retroativa no fuso America/Sao_Paulo (UTC-3)
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

  // 8. Validação INCONDICIONAL matemática de pesos: min <= ideal <= max, todos > 0
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
  let code = (record.getString('code') || '').trim()
  const originalCode = original ? (original.getString('code') || '').trim() : ''
  if (!code || code === 'Novo' || code.includes('undefined')) {
    if (originalCode) {
      code = originalCode
      record.set('code', code)
    }
  }

  // Obter empresa (usar original se vazio)
  let company = (record.getString('company_code') || '').trim()
  if (!company && original) {
    company = (original.getString('company_code') || '').trim()
    record.set('company_code', company)
  }
  if (!company) {
    company = 'CIAFAL'
    record.set('company_code', company)
  }

  // 2. Obrigatoriedade de descrição e tipo de corte na edição
  const description = (record.getString('description') || '').trim()
  if (!description) {
    return e.json(400, {
      code: 'DESCRIPTION_REQUIRED',
      message: 'A descrição do padrão é obrigatória.',
    })
  }

  const cuttingType = (record.getString('cutting_type') || '').trim()
  if (!cuttingType) {
    return e.json(400, {
      code: 'CUTTING_TYPE_REQUIRED',
      message: 'O tipo de corte é obrigatório.',
    })
  }

  // 3. Checagem de UNICIDADE de código na edição (escopado por empresa, outros ids, ativos E inativos)
  try {
    const existingRecords = $app.findRecordsByFilter(
      'mp_cutting_weight_standards',
      '',
      '-id',
      500,
      0,
    )
    const normCode = code.toUpperCase()
    const normCompany = company.toUpperCase()
    const currentId = record.id

    for (let i = 0; i < existingRecords.length; i++) {
      const rec = existingRecords[i]
      if (rec.id === currentId) continue

      const recCode = (rec.getString('code') || '').trim().toUpperCase()
      const recComp = (rec.getString('company_code') || '').trim().toUpperCase()

      if (recCode === normCode && recComp === normCompany) {
        return e.json(400, {
          code: 'DUPLICATE_CODE',
          message: `Código ${code} já existe nesta empresa (ativo ou inativo).`,
        })
      }
    }
  } catch (err) {
    console.warn(
      '[mp_cutting_weight_standards_guard] Erro ao validar unicidade de código no update:',
      err,
    )
  }

  // 4. Normalizar prioridade se presente
  let prio = (record.getString('priority') || '').toUpperCase().trim()
  if (prio === 'ALTA' || prio === 'HIGH') prio = 'ALTA'
  else if (prio === 'BAIXA' || prio === 'LOW') prio = 'BAIXA'
  else if (prio === 'MEDIA' || prio === 'MEDIUM') prio = 'MEDIA'
  else if (original) prio = original.getString('priority') || 'MEDIA'
  record.set('priority', prio)

  // 5. Validação de vigência: datas históricas existentes são PRESERVADAS sem serem destruídas.
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

  // 6. Validação INCONDICIONAL de pesos no UPDATE: alvo obrigatório e > 0; min <= alvo <= max sempre
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
