/// <reference path="../pb_data/types.d.ts" />

/**
 * Server-side validation and sequence logic for PCP Raw Material Inventory Demands
 */

routerAdd('GET', '/backend/v1/pcp-inventory-demands-next-number', (e) => {
  const currentYear = new Date().getFullYear()
  const prefix = 'INV-' + currentYear + '-'

  try {
    // Busca registros da collection pcp_mp_inventory_demands
    const records = $app.findRecordsByFilter(
      'pcp_mp_inventory_demands',
      'control_number ~ {:prefix}',
      '-control_number',
      1,
      0,
      { prefix: prefix },
    )

    let nextSeq = 1
    if (records && records.length > 0) {
      const lastNum = records[0].getString('control_number')
      const parts = lastNum.split('-')
      if (parts.length === 3) {
        const parsed = parseInt(parts[2], 10)
        if (!isNaN(parsed) && parsed >= 1) {
          nextSeq = parsed + 1
        }
      }
    }

    const padded = String(nextSeq).padStart(6, '0')
    const nextNumber = prefix + padded

    return e.json(200, {
      nextNumber: nextNumber,
      year: currentYear,
      seq: nextSeq,
    })
  } catch (err) {
    const fallbackSeq = String(Date.now()).slice(-6)
    return e.json(200, {
      nextNumber: prefix + fallbackSeq,
      year: currentYear,
      seq: parseInt(fallbackSeq, 10),
    })
  }
})

onRecordCreateRequest(
  (e) => {
    const collectionName = e.record.collection().name
    if (collectionName === 'pcp_mp_inventory_demands') {
      const ctrl = e.record.getString('control_number')
      if (!ctrl || !ctrl.startsWith('INV-')) {
        throw new BadRequestError('Número de controle INV-AAAA-###### inválido.')
      }

      // Validação server-side bloqueante dos campos obrigatórios da demanda
      const company = e.record.getString('company')
      if (!company || company.trim() === '') {
        throw new BadRequestError('Empresa é obrigatória para gerar Demanda de Inventário.')
      }

      const line = e.record.getString('line')
      if (!line || line.trim() === '') {
        throw new BadRequestError('Linha é obrigatória para gerar Demanda de Inventário.')
      }

      const center = e.record.getString('center')
      if (!center || center.trim() === '') {
        throw new BadRequestError('Centro é obrigatório para gerar Demanda de Inventário.')
      }

      const storageDeposit = e.record.getString('storage_deposit')
      if (!storageDeposit || storageDeposit.trim() === '') {
        throw new BadRequestError('Depósito é obrigatório para gerar Demanda de Inventário.')
      }

      const productionOrder = e.record.getString('production_order')
      if (!productionOrder || productionOrder.trim() === '') {
        throw new BadRequestError(
          'Ordem de Produção é obrigatória para gerar Demanda de Inventário.',
        )
      }

      const priority = e.record.getString('priority')
      if (!priority || priority.trim() === '') {
        throw new BadRequestError('Prioridade é obrigatória para gerar Demanda de Inventário.')
      }

      // materials_summary deve ser JSON válido não nulo
      const rawMaterialsSummary = e.record.get('materials_summary')
      if (!rawMaterialsSummary) {
        throw new BadRequestError(
          'A demanda de inventário precisa de pelo menos uma matéria-prima vinculada.',
        )
      }

      try {
        const existing = $app.findFirstRecordByData(
          'pcp_mp_inventory_demands',
          'control_number',
          ctrl,
        )
        if (existing) {
          throw new BadRequestError('Número de controle ' + ctrl + ' já foi utilizado.')
        }
      } catch (_) {
        // not found is valid
      }
    }

    if (collectionName === 'pcp_mp_inventory_items') {
      const rawMat = e.record.getString('raw_material_code')
      if (!rawMat || rawMat.trim() === '') {
        throw new BadRequestError('Código da matéria-prima é obrigatório.')
      }
    }

    if (collectionName === 'pcp_mp_inventory_entries') {
      const pieces = e.record.getInt('pieces_count')
      if (pieces < 0) {
        throw new BadRequestError('O número de peças não pode ser negativo.')
      }
    }
  },
  'pcp_mp_inventory_demands',
  'pcp_mp_inventory_items',
  'pcp_mp_inventory_entries',
)
