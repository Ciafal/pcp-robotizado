// Hook: Bloqueio temporal corporativo de programações passadas
// Garante validação server-side contra manipulação de registros no passado (Criar, Editar, Excluir, Mover)
// Regra de ouro Skip Cloud: Todo o código deve ser inline dentro do callback sem declarações top-level.

onRecordCreateRequest((e) => {
  const record = e.record
  const year = record.getInt('year')
  const weekNumber = record.getInt('week_number')
  const startDt = record.getString('start_datetime')
  const endDt = record.getString('end_datetime')
  const now = new Date()

  // 1. Checa semana ISO atual em UTC-3 (America/Sao_Paulo)
  const d = new Date(now.getTime() - 3 * 3600 * 1000)
  const curYear = d.getUTCFullYear()
  const jan4 = new Date(Date.UTC(curYear, 0, 4))
  const dayDiff = (d.getTime() - jan4.getTime()) / 86400000
  const curWeek = 1 + Math.round((dayDiff - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7)

  if (year > 0 && weekNumber > 0) {
    if (year < curYear || (year === curYear && weekNumber < curWeek)) {
      return e.json(400, {
        code: 'TEMPORAL_PAST_BLOCKED',
        message:
          'Não é permitido alterar programação com data/hora do passado. A semana informada é histórica.',
      })
    }
  }

  // 2. Se a semana for a semana atual ou não informada, checa se a data/hora já ocorreu
  const checkStr = endDt || startDt
  if (checkStr) {
    const cleanStr = checkStr.indexOf('T') !== -1 ? checkStr : checkStr.replace(' ', 'T')
    const parsed = new Date(cleanStr)
    if (!isNaN(parsed.getTime())) {
      if (parsed.getTime() < now.getTime() - 120000) {
        return e.json(400, {
          code: 'TEMPORAL_PAST_BLOCKED',
          message: 'Não é permitido criar programação com data/hora do passado.',
        })
      }
    }
  }

  return e.next()
}, 'weekly_schedules')

onRecordUpdateRequest((e) => {
  const record = e.record
  const now = new Date()
  const d = new Date(now.getTime() - 3 * 3600 * 1000)
  const curYear = d.getUTCFullYear()
  const jan4 = new Date(Date.UTC(curYear, 0, 4))
  const dayDiff = (d.getTime() - jan4.getTime()) / 86400000
  const curWeek = 1 + Math.round((dayDiff - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7)

  const orig = record.original()
  if (orig) {
    const oYear = orig.getInt('year')
    const oWeek = orig.getInt('week_number')
    const oStart = orig.getString('start_datetime')
    const oEnd = orig.getString('end_datetime')
    let isOrigPast = false

    if (oYear > 0 && oWeek > 0) {
      if (oYear < curYear || (oYear === curYear && oWeek < curWeek)) {
        isOrigPast = true
      }
    }

    if (!isOrigPast) {
      const cStr = oEnd || oStart
      if (cStr) {
        const cleanStr = cStr.indexOf('T') !== -1 ? cStr : cStr.replace(' ', 'T')
        const parsed = new Date(cleanStr)
        if (!isNaN(parsed.getTime()) && parsed.getTime() < now.getTime() - 120000) {
          isOrigPast = true
        }
      }
    }

    if (isOrigPast) {
      const newStatus = record.getString('status')
      const origStatus = orig.getString('status')
      if (newStatus !== origStatus && (newStatus === 'REALIZADO' || newStatus === 'EXECUTANDO')) {
        return e.next()
      }
      return e.json(400, {
        code: 'TEMPORAL_PAST_BLOCKED',
        message: 'Não é permitido alterar programação com data/hora do passado.',
      })
    }
  }

  const year = record.getInt('year')
  const weekNumber = record.getInt('week_number')
  const startDt = record.getString('start_datetime')
  const endDt = record.getString('end_datetime')

  if (year > 0 && weekNumber > 0) {
    if (year < curYear || (year === curYear && weekNumber < curWeek)) {
      return e.json(400, {
        code: 'TEMPORAL_PAST_BLOCKED',
        message:
          'Não é permitido alterar programação com data/hora do passado. A semana informada é histórica.',
      })
    }
  }

  const checkStr = endDt || startDt
  if (checkStr) {
    const cleanStr = checkStr.indexOf('T') !== -1 ? checkStr : checkStr.replace(' ', 'T')
    const parsed = new Date(cleanStr)
    if (!isNaN(parsed.getTime()) && parsed.getTime() < now.getTime() - 120000) {
      return e.json(400, {
        code: 'TEMPORAL_PAST_BLOCKED',
        message: 'Não é permitido alterar programação com data/hora do passado.',
      })
    }
  }

  return e.next()
}, 'weekly_schedules')

onRecordDeleteRequest((e) => {
  const record = e.record
  const year = record.getInt('year')
  const weekNumber = record.getInt('week_number')
  const startDt = record.getString('start_datetime')
  const endDt = record.getString('end_datetime')
  const now = new Date()

  const d = new Date(now.getTime() - 3 * 3600 * 1000)
  const curYear = d.getUTCFullYear()
  const jan4 = new Date(Date.UTC(curYear, 0, 4))
  const dayDiff = (d.getTime() - jan4.getTime()) / 86400000
  const curWeek = 1 + Math.round((dayDiff - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7)

  if (year > 0 && weekNumber > 0) {
    if (year < curYear || (year === curYear && weekNumber < curWeek)) {
      return e.json(400, {
        code: 'TEMPORAL_PAST_BLOCKED',
        message: 'Não é permitido excluir programação com data/hora do passado.',
      })
    }
  }

  const checkStr = endDt || startDt
  if (checkStr) {
    const cleanStr = checkStr.indexOf('T') !== -1 ? checkStr : checkStr.replace(' ', 'T')
    const parsed = new Date(cleanStr)
    if (!isNaN(parsed.getTime()) && parsed.getTime() < now.getTime() - 120000) {
      return e.json(400, {
        code: 'TEMPORAL_PAST_BLOCKED',
        message: 'Não é permitido excluir programação com data/hora do passado.',
      })
    }
  }

  return e.next()
}, 'weekly_schedules')
