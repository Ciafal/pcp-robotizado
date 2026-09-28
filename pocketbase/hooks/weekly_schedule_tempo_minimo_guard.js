// Hook: Validação de Tempo Mínimo PCP de Matéria-Prima por Aplicação
// Bloqueia criação ou alteração de agendamentos em weekly_schedules quando a antecedência disponível
// for menor que o tempo mínimo exigido pela Ficha Mestra (Matéria-prima por Aplicação).
// Código de erro canônico: TEMPO_MINIMO_PCP_NAO_ATENDIDO
// Regra de ouro Skip Cloud: Todo o código deve ser inline dentro do callback sem declarações top-level.

onRecordCreateRequest((e) => {
  const record = e.record
  const startDt = record.getString('start_datetime')
  if (!startDt) {
    return e.next()
  }

  const cleanStartStr = startDt.indexOf('T') !== -1 ? startDt : startDt.replace(' ', 'T')
  const startTime = new Date(cleanStartStr).getTime()
  if (isNaN(startTime)) {
    return e.next()
  }

  const now = new Date().getTime()
  const availableMinutes = (startTime - now) / (60 * 1000)

  // Extrai MPs do registro
  const rawMaterialCode = record.getString('material_code')
  const specificMpCode = record.getString('raw_material_material_code')
  const lineCode = record.getString('line_code') || ''

  // Busca cadastros de line_raw_material_applications para a linha/centro e materiais
  const mpCodes = []
  if (specificMpCode && specificMpCode.trim()) {
    mpCodes.push(specificMpCode.trim())
  }
  const rawRows = record.get('raw_material_rows')
  if (rawRows && Array.isArray(rawRows)) {
    for (let r = 0; r < rawRows.length; r++) {
      const code = rawRows[r].materialCode || rawRows[r].material_code
      if (code && mpCodes.indexOf(code) === -1) {
        mpCodes.push(code)
      }
    }
  }

  // Se não tem MP específica nas linhas, checa pelo material/centro
  let appRecords = []
  try {
    if (mpCodes.length > 0) {
      for (let i = 0; i < mpCodes.length; i++) {
        const found = $app.findRecordsByFilter(
          'line_raw_material_applications',
          "raw_material_code = '" + mpCodes[i].replace(/'/g, "\\'") + "'",
          '-created',
          20,
          0,
        )
        if (found && found.length > 0) {
          for (let f = 0; f < found.length; f++) {
            appRecords.push(found[f])
          }
        }
      }
    } else if (rawMaterialCode) {
      const found = $app.findRecordsByFilter(
        'line_raw_material_applications',
        "product_code = '" + rawMaterialCode.replace(/'/g, "\\'") + "'",
        '-created',
        20,
        0,
      )
      if (found && found.length > 0) {
        for (let f = 0; f < found.length; f++) {
          appRecords.push(found[f])
        }
      }
    }
  } catch (err) {
    // Se der erro de busca, não derruba criação
  }

  // Verifica tempo mínimo configurado
  let mostRestrictive = null
  for (let k = 0; k < appRecords.length; k++) {
    const appRec = appRecords[k]
    const unidade = appRec.getString('tempo_minimo_pcp_unidade')
    const valor = appRec.getFloat('tempo_minimo_pcp_valor')
    if (unidade && valor > 0) {
      let multiplierMin = 60
      if (unidade === 'Minutos') multiplierMin = 1
      else if (unidade === 'Horas') multiplierMin = 60
      else if (unidade === 'Dias') multiplierMin = 24 * 60
      else if (unidade === 'Semanas') multiplierMin = 7 * 24 * 60

      const reqMinutes = valor * multiplierMin
      if (!mostRestrictive || reqMinutes > mostRestrictive.reqMinutes) {
        mostRestrictive = {
          rawMaterialCode: appRec.getString('raw_material_code'),
          productCode: appRec.getString('product_code'),
          application: appRec.getString('application'),
          valor: valor,
          unidade: unidade,
          reqMinutes: reqMinutes,
        }
      }
    }
  }

  if (mostRestrictive && availableMinutes < mostRestrictive.reqMinutes) {
    const earliestTime = new Date(now + mostRestrictive.reqMinutes * 60 * 1000)
    const pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    const formattedEarliest =
      pad(earliestTime.getDate()) +
      '/' +
      pad(earliestTime.getMonth() + 1) +
      '/' +
      earliestTime.getFullYear() +
      ' ' +
      pad(earliestTime.getHours()) +
      ':' +
      pad(earliestTime.getMinutes())

    const formatDiff = function (mins) {
      if (mins <= 0) return '0 min'
      if (mins < 60) return Math.round(mins) + ' min'
      const h = mins / 60
      if (h < 48) return (Math.round(h * 10) / 10).toString().replace('.', ',') + ' h'
      const d = h / 24
      return (Math.round(d * 10) / 10).toString().replace('.', ',') + ' dias'
    }

    return e.json(400, {
      code: 'TEMPO_MINIMO_PCP_NAO_ATENDIDO',
      message:
        'A programação não pode ser realizada porque a matéria-prima ' +
        mostRestrictive.rawMaterialCode +
        ' exige antecedência mínima de ' +
        mostRestrictive.valor.toString().replace('.', ',') +
        ' ' +
        mostRestrictive.unidade +
        '.',
      details: {
        rawMaterialCode: mostRestrictive.rawMaterialCode,
        requiredValue: mostRestrictive.valor,
        requiredUnit: mostRestrictive.unidade,
        requiredMinutes: mostRestrictive.reqMinutes,
        availableMinutes: Math.max(0, Math.round(availableMinutes)),
        availableDisplay: formatDiff(availableMinutes),
        earliestAllowedDate: formattedEarliest,
      },
    })
  }

  return e.next()
}, 'weekly_schedules')

onRecordUpdateRequest((e) => {
  const record = e.record
  const orig = record.original()
  const startDt = record.getString('start_datetime')
  if (!startDt) {
    return e.next()
  }

  // Se a data de início não mudou e os itens não mudaram, não revalida (preserva agendamentos passados válidos)
  if (orig) {
    const origStart = orig.getString('start_datetime')
    const origMaterial = orig.getString('material_code')
    const newMaterial = record.getString('material_code')
    const origStatus = orig.getString('status')
    const newStatus = record.getString('status')

    // Se é apenas avanço de status para executando/realizado, não bloqueia
    if (newStatus !== origStatus && (newStatus === 'REALIZADO' || newStatus === 'EXECUTANDO')) {
      return e.next()
    }

    if (origStart === startDt && origMaterial === newMaterial) {
      return e.next()
    }
  }

  const cleanStartStr = startDt.indexOf('T') !== -1 ? startDt : startDt.replace(' ', 'T')
  const startTime = new Date(cleanStartStr).getTime()
  if (isNaN(startTime)) {
    return e.next()
  }

  const now = new Date().getTime()
  const availableMinutes = (startTime - now) / (60 * 1000)

  const rawMaterialCode = record.getString('material_code')
  const specificMpCode = record.getString('raw_material_material_code')

  const mpCodes = []
  if (specificMpCode && specificMpCode.trim()) {
    mpCodes.push(specificMpCode.trim())
  }
  const rawRows = record.get('raw_material_rows')
  if (rawRows && Array.isArray(rawRows)) {
    for (let r = 0; r < rawRows.length; r++) {
      const code = rawRows[r].materialCode || rawRows[r].material_code
      if (code && mpCodes.indexOf(code) === -1) {
        mpCodes.push(code)
      }
    }
  }

  let appRecords = []
  try {
    if (mpCodes.length > 0) {
      for (let i = 0; i < mpCodes.length; i++) {
        const found = $app.findRecordsByFilter(
          'line_raw_material_applications',
          "raw_material_code = '" + mpCodes[i].replace(/'/g, "\\'") + "'",
          '-created',
          20,
          0,
        )
        if (found && found.length > 0) {
          for (let f = 0; f < found.length; f++) {
            appRecords.push(found[f])
          }
        }
      }
    } else if (rawMaterialCode) {
      const found = $app.findRecordsByFilter(
        'line_raw_material_applications',
        "product_code = '" + rawMaterialCode.replace(/'/g, "\\'") + "'",
        '-created',
        20,
        0,
      )
      if (found && found.length > 0) {
        for (let f = 0; f < found.length; f++) {
          appRecords.push(found[f])
        }
      }
    }
  } catch (err) {
    // continua
  }

  let mostRestrictive = null
  for (let k = 0; k < appRecords.length; k++) {
    const appRec = appRecords[k]
    const unidade = appRec.getString('tempo_minimo_pcp_unidade')
    const valor = appRec.getFloat('tempo_minimo_pcp_valor')
    if (unidade && valor > 0) {
      let multiplierMin = 60
      if (unidade === 'Minutos') multiplierMin = 1
      else if (unidade === 'Horas') multiplierMin = 60
      else if (unidade === 'Dias') multiplierMin = 24 * 60
      else if (unidade === 'Semanas') multiplierMin = 7 * 24 * 60

      const reqMinutes = valor * multiplierMin
      if (!mostRestrictive || reqMinutes > mostRestrictive.reqMinutes) {
        mostRestrictive = {
          rawMaterialCode: appRec.getString('raw_material_code'),
          productCode: appRec.getString('product_code'),
          application: appRec.getString('application'),
          valor: valor,
          unidade: unidade,
          reqMinutes: reqMinutes,
        }
      }
    }
  }

  if (mostRestrictive && availableMinutes < mostRestrictive.reqMinutes) {
    const earliestTime = new Date(now + mostRestrictive.reqMinutes * 60 * 1000)
    const pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    const formattedEarliest =
      pad(earliestTime.getDate()) +
      '/' +
      pad(earliestTime.getMonth() + 1) +
      '/' +
      earliestTime.getFullYear() +
      ' ' +
      pad(earliestTime.getHours()) +
      ':' +
      pad(earliestTime.getMinutes())

    const formatDiff = function (mins) {
      if (mins <= 0) return '0 min'
      if (mins < 60) return Math.round(mins) + ' min'
      const h = mins / 60
      if (h < 48) return (Math.round(h * 10) / 10).toString().replace('.', ',') + ' h'
      const d = h / 24
      return (Math.round(d * 10) / 10).toString().replace('.', ',') + ' dias'
    }

    return e.json(400, {
      code: 'TEMPO_MINIMO_PCP_NAO_ATENDIDO',
      message:
        'A programação não pode ser realizada porque a matéria-prima ' +
        mostRestrictive.rawMaterialCode +
        ' exige antecedência mínima de ' +
        mostRestrictive.valor.toString().replace('.', ',') +
        ' ' +
        mostRestrictive.unidade +
        '.',
      details: {
        rawMaterialCode: mostRestrictive.rawMaterialCode,
        requiredValue: mostRestrictive.valor,
        requiredUnit: mostRestrictive.unidade,
        requiredMinutes: mostRestrictive.reqMinutes,
        availableMinutes: Math.max(0, Math.round(availableMinutes)),
        availableDisplay: formatDiff(availableMinutes),
        earliestAllowedDate: formattedEarliest,
      },
    })
  }

  return e.next()
}, 'weekly_schedules')
