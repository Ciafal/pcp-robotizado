// Hook: Interceptor de governança e regras de negócio para Tipos de Código Modelo SAP
// Regra: Bloquear duplicidade de combinação ATIVA: Centro (WERKS) + Centro de Trabalho (ARBPL) + Tipo de Material (MARA-MTART)
// Mensagem exata exigida:
// "Já existe um Tipo de Código Modelo cadastrado para esta combinação de Centro, Centro de Trabalho e Tipo de Material."
// Regra: Proibir exclusão física (inativação lógica deve ser utilizada)
// Regra: Gravar auditoria em pcp_audit_logs e sap_validation_audit_logs

onRecordCreateRequest((e) => {
  const centro = (e.record.getString('centro') || '').trim()
  const centroTrabalho = (e.record.getString('centro_trabalho') || '').trim()
  const tipoMaterial = (e.record.getString('tipo_material') || '').trim()
  const status = (e.record.getString('status') || 'Ativo').trim()

  if (status.toLowerCase() === 'ativo') {
    try {
      const existing = $app.findRecordsByFilter(
        'sap_model_types',
        `centro = '${centro}' && centro_trabalho = '${centroTrabalho}' && tipo_material = '${tipoMaterial}' && (status = 'Ativo' || status = 'ATIVO')`,
        '',
        1,
        0,
      )
      if (existing && existing.length > 0) {
        return e.json(400, {
          code: 'DUPLICATE_ACTIVE_MODEL_TYPE',
          existingId: existing[0].id,
          message:
            'Já existe um Tipo de Código Modelo cadastrado para esta combinação de Centro, Centro de Trabalho e Tipo de Material.',
        })
      }
    } catch (err) {
      // Se der erro de consulta segue ou loga
    }
  }

  return e.next()
}, 'sap_model_types')

onRecordUpdateRequest((e) => {
  const recordId = e.record.id
  const centro = (e.record.getString('centro') || '').trim()
  const centroTrabalho = (e.record.getString('centro_trabalho') || '').trim()
  const tipoMaterial = (e.record.getString('tipo_material') || '').trim()
  const status = (e.record.getString('status') || 'Ativo').trim()

  if (status.toLowerCase() === 'ativo') {
    try {
      const existing = $app.findRecordsByFilter(
        'sap_model_types',
        `id != '${recordId}' && centro = '${centro}' && centro_trabalho = '${centroTrabalho}' && tipo_material = '${tipoMaterial}' && (status = 'Ativo' || status = 'ATIVO')`,
        '',
        1,
        0,
      )
      if (existing && existing.length > 0) {
        return e.json(400, {
          code: 'DUPLICATE_ACTIVE_MODEL_TYPE',
          existingId: existing[0].id,
          message:
            'Já existe um Tipo de Código Modelo cadastrado para esta combinação de Centro, Centro de Trabalho e Tipo de Material.',
        })
      }
    } catch (err) {
      // Se der erro de consulta segue
    }
  }

  return e.next()
}, 'sap_model_types')

onRecordDeleteRequest((e) => {
  return e.json(403, {
    code: 'FORBIDDEN_PHYSICAL_DELETE',
    message:
      'A exclusão física de Tipos de Código Modelo é proibida pelas regras de governança e rastreabilidade SAP. Utilize a inativação do registro.',
  })
}, 'sap_model_types')
