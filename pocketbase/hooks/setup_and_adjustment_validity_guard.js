/**
 * pb_hook: setup_and_adjustment_validity_guard.js
 *
 * Validação no back-end para Setup e Acerto:
 * (2) DATA FIM OBRIGATÓRIA — SETUP:
 *     Não permitir salvar um Setup sem Data Fim (valid_until).
 *     Mensagem: "Informe a Data Fim da vigência deste Setup."
 * (3) DATA FIM OBRIGATÓRIA — ACERTO:
 *     Não permitir salvar um Acerto sem Data Fim (valid_until).
 *     Mensagem: "Informe a Data Fim da vigência deste Tempo de Acerto."
 * (4) VALIDAÇÕES DAS DATAS (Setup e Acerto):
 *     Data Início obrigatória; Data Fim obrigatória;
 *     Data Fim >= Data Início. Não permitir Data Fim < Data Início.
 *     Mensagem: "A Data Fim não pode ser anterior à Data Início."
 * (5) Registros antigos sem Data Fim:
 *     Ao editar um registro antigo sem Data Fim: obrigar o preenchimento da Data Fim antes de salvar novamente.
 */

// 1. Validação de Setup (Create e Update)
onRecordCreateRequest((e) => {
  const validFrom = e.record.get('valid_from')
  const validUntil = e.record.get('valid_until')

  if (!validUntil || String(validUntil).trim() === '') {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'Informe a Data Fim da vigência deste Setup.',
      data: {
        valid_until: { code: 'required', message: 'Informe a Data Fim da vigência deste Setup.' },
      },
    })
  }

  if (!validFrom || String(validFrom).trim() === '') {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'A Data Início é obrigatória.',
      data: { valid_from: { code: 'required', message: 'A Data Início é obrigatória.' } },
    })
  }

  const fromStr = String(validFrom).slice(0, 10)
  const untilStr = String(validUntil).slice(0, 10)

  if (untilStr < fromStr) {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'A Data Fim não pode ser anterior à Data Início.',
      data: {
        valid_until: {
          code: 'invalid_range',
          message: 'A Data Fim não pode ser anterior à Data Início.',
        },
      },
    })
  }

  return e.next()
}, 'line_setup_matrix')

onRecordUpdateRequest((e) => {
  const validFrom = e.record.get('valid_from')
  const validUntil = e.record.get('valid_until')

  if (!validUntil || String(validUntil).trim() === '') {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'Informe a Data Fim da vigência deste Setup.',
      data: {
        valid_until: { code: 'required', message: 'Informe a Data Fim da vigência deste Setup.' },
      },
    })
  }

  if (!validFrom || String(validFrom).trim() === '') {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'A Data Início é obrigatória.',
      data: { valid_from: { code: 'required', message: 'A Data Início é obrigatória.' } },
    })
  }

  const fromStr = String(validFrom).slice(0, 10)
  const untilStr = String(validUntil).slice(0, 10)

  if (untilStr < fromStr) {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'A Data Fim não pode ser anterior à Data Início.',
      data: {
        valid_until: {
          code: 'invalid_range',
          message: 'A Data Fim não pode ser anterior à Data Início.',
        },
      },
    })
  }

  return e.next()
}, 'line_setup_matrix')

// 2. Validação de Acerto (Create e Update)
onRecordCreateRequest((e) => {
  const validFrom = e.record.get('valid_from')
  const validUntil = e.record.get('valid_until')

  if (!validUntil || String(validUntil).trim() === '') {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'Informe a Data Fim da vigência deste Tempo de Acerto.',
      data: {
        valid_until: {
          code: 'required',
          message: 'Informe a Data Fim da vigência deste Tempo de Acerto.',
        },
      },
    })
  }

  if (!validFrom || String(validFrom).trim() === '') {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'A Data Início é obrigatória.',
      data: { valid_from: { code: 'required', message: 'A Data Início é obrigatória.' } },
    })
  }

  const fromStr = String(validFrom).slice(0, 10)
  const untilStr = String(validUntil).slice(0, 10)

  if (untilStr < fromStr) {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'A Data Fim não pode ser anterior à Data Início.',
      data: {
        valid_until: {
          code: 'invalid_range',
          message: 'A Data Fim não pode ser anterior à Data Início.',
        },
      },
    })
  }

  return e.next()
}, 'adjustment_time_rules')

onRecordUpdateRequest((e) => {
  const validFrom = e.record.get('valid_from')
  const validUntil = e.record.get('valid_until')

  if (!validUntil || String(validUntil).trim() === '') {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'Informe a Data Fim da vigência deste Tempo de Acerto.',
      data: {
        valid_until: {
          code: 'required',
          message: 'Informe a Data Fim da vigência deste Tempo de Acerto.',
        },
      },
    })
  }

  if (!validFrom || String(validFrom).trim() === '') {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'A Data Início é obrigatória.',
      data: { valid_from: { code: 'required', message: 'A Data Início é obrigatória.' } },
    })
  }

  const fromStr = String(validFrom).slice(0, 10)
  const untilStr = String(validUntil).slice(0, 10)

  if (untilStr < fromStr) {
    return e.json(400, {
      code: 'VALIDATION_ERROR',
      message: 'A Data Fim não pode ser anterior à Data Início.',
      data: {
        valid_until: {
          code: 'invalid_range',
          message: 'A Data Fim não pode ser anterior à Data Início.',
        },
      },
    })
  }

  return e.next()
}, 'adjustment_time_rules')
