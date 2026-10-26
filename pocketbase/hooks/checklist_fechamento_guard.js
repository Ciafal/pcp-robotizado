// PocketBase custom hook: Geração automática de código e regras do Check-list Fechamento
// Endpoint: GET /backend/v1/pcp/checklist/next-code
// Hooks: onRecordCreateRequest('checklist_fechamento_modelos'), onRecordUpdateRequest('checklist_fechamento_modelos')

// 1. Endpoint público/autenticado para a UI consultar o próximo código antes de salvar
routerAdd('GET', '/backend/v1/pcp/checklist/next-code', (e) => {
  let maxMinor = 0
  if ($app.hasTable('checklist_fechamento_modelos')) {
    try {
      const records = $app.findRecordsByFilter(
        'checklist_fechamento_modelos',
        '',
        '-created',
        500,
        0,
      )
      for (let i = 0; i < records.length; i++) {
        const cod = (records[i].getString('codigo') || '').trim()
        const match = cod.match(/^(\d+)\.(\d+)(?:\.(\d+))?$/)
        if (match) {
          const major = parseInt(match[1], 10)
          const minor = parseInt(match[2], 10)
          if (major === 1) {
            if (minor > maxMinor) {
              maxMinor = minor
            }
          }
        } else {
          const num = parseInt(cod, 10)
          if (!isNaN(num) && num < 100 && num > maxMinor) {
            maxMinor = num
          }
        }
      }
    } catch (err) {
      console.warn('[checklist_fechamento_guard] Erro ao buscar códigos:', err)
    }
  }

  if (maxMinor < 26) {
    maxMinor = 26
  }

  const nextMinor = maxMinor + 1
  const nextCode = '1.' + nextMinor
  const nextSequencia = nextMinor + 1

  return e.json(200, {
    success: true,
    next_code: nextCode,
    next_sequence: nextSequencia,
    format_pattern: '1.X',
  })
})

// 2. Hook server-side ao criar novo modelo: garante atomicidade e código único
onRecordCreateRequest((e) => {
  const codAtual = (e.record.getString('codigo') || '').trim()

  const precisaGerar =
    !codAtual ||
    codAtual === 'AUTO' ||
    codAtual === 'Gerado automaticamente' ||
    codAtual.indexOf('Próximo') === 0 ||
    codAtual.indexOf('1.27') === 0 // se colidir

  let maxMinor = 0
  if ($app.hasTable('checklist_fechamento_modelos')) {
    try {
      const records = $app.findRecordsByFilter(
        'checklist_fechamento_modelos',
        '',
        '-created',
        500,
        0,
      )
      for (let i = 0; i < records.length; i++) {
        const cod = (records[i].getString('codigo') || '').trim()
        const match = cod.match(/^(\d+)\.(\d+)(?:\.(\d+))?$/)
        if (match) {
          const major = parseInt(match[1], 10)
          const minor = parseInt(match[2], 10)
          if (major === 1) {
            if (minor > maxMinor) {
              maxMinor = minor
            }
          }
        } else {
          const num = parseInt(cod, 10)
          if (!isNaN(num) && num < 100 && num > maxMinor) {
            maxMinor = num
          }
        }
      }
    } catch (err) {
      console.warn('[checklist_fechamento_guard] Erro ao verificar maxMinor:', err)
    }
  }

  if (maxMinor < 26) {
    maxMinor = 26
  }

  const calculatedNextCode = '1.' + (maxMinor + 1)
  const calculatedNextSeq = maxMinor + 2

  if (precisaGerar) {
    e.record.set('codigo', calculatedNextCode)
    if (!e.record.getInt('sequencia')) {
      e.record.set('sequencia', calculatedNextSeq)
    }
  } else {
    // Verificar se já existe algum registro com este código para evitar duplicidade
    try {
      const existe = $app.findFirstRecordByData('checklist_fechamento_modelos', 'codigo', codAtual)
      if (existe) {
        // Se já existe, força o próximo disponível para evitar corrida
        e.record.set('codigo', calculatedNextCode)
      }
    } catch (_) {
      // Não encontrou duplicado, aceita
    }
  }

  // Validação dos campos de programação
  const tipoProg = e.record.getString('tipo_programacao') || 'dia_util'
  e.record.set('tipo_programacao', tipoProg)

  e.next()
}, 'checklist_fechamento_modelos')

// 3. Hook server-side ao editar modelo: proibir alteração do código
onRecordUpdateRequest((e) => {
  const original = e.record.original()
  if (original) {
    const origCod = original.getString('codigo')
    if (origCod) {
      e.record.set('codigo', origCod)
    }
  }
  e.next()
}, 'checklist_fechamento_modelos')
