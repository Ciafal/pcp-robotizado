// PocketBase custom hook: Geração atômica de próximo número de demanda de inventário MP
// Endpoint: GET /backend/v1/pcp-inventory-demands-next-number

routerAdd('GET', '/backend/v1/pcp-inventory-demands-next-number', (e) => {
  const year = new Date().getFullYear()
  const prefix = 'INV-' + year + '-'

  let nextNumStr = ''
  let maxSeq = 0

  // 1. Consulta o maior control_number em pcp_mp_inventory_demands para o ano atual
  try {
    const records = $app.findRecordsByFilter(
      'pcp_mp_inventory_demands',
      "control_number ~ '" + prefix + "'",
      '-control_number',
      50,
      0,
    )

    for (let i = 0; i < records.length; i++) {
      const ctrl = records[i].getString('control_number') || ''
      const parts = ctrl.split('-')
      if (parts.length >= 3) {
        const seq = parseInt(parts[2], 10)
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq
        }
      }
    }
  } catch (err) {
    // Tabela vazia ou erro transitório
  }

  // 2. Consulta também pcp_mp_inventory_orders / pcp_mp_inventory_items para garantir que não haja colisão
  try {
    if ($app.hasTable && $app.hasTable('pcp_mp_inventory_orders')) {
      const orderRecords = $app.findRecordsByFilter(
        'pcp_mp_inventory_orders',
        "inventory_code ~ '" + prefix + "'",
        '-inventory_code',
        50,
        0,
      )
      for (let i = 0; i < orderRecords.length; i++) {
        const ctrl = orderRecords[i].getString('inventory_code') || ''
        const parts = ctrl.split('-')
        if (parts.length >= 3) {
          const seq = parseInt(parts[2], 10)
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq
          }
        }
      }
    }
  } catch (orderErr) {
    // Ignora se não houver registros
  }

  // Se não encontrou no filtro, busca todos em pcp_mp_inventory_demands
  if (maxSeq === 0) {
    try {
      const all = $app.findRecordsByFilter('pcp_mp_inventory_demands', '', '-created', 100, 0)
      for (let i = 0; i < all.length; i++) {
        const ctrl = all[i].getString('control_number') || ''
        if (ctrl.indexOf(prefix) === 0) {
          const parts = ctrl.split('-')
          if (parts.length >= 3) {
            const seq = parseInt(parts[2], 10)
            if (!isNaN(seq) && seq > maxSeq) {
              maxSeq = seq
            }
          }
        }
      }
    } catch (err) {
      // Ignora
    }
  }

  const nextSeq = maxSeq + 1
  const padded = ('000000' + nextSeq).slice(-6)
  nextNumStr = prefix + padded

  return e.json(200, {
    success: true,
    control_number: nextNumStr,
    sequence: nextSeq,
    year: year,
  })
})

// ETAPA A: Hooks de integridade e governança de Solicitante em pcp_mp_inventory_demands
// onRecordCreateRequest: se !e.auth -> 401/403 com mensagem amigável; sobrescrever requester_*
onRecordCreateRequest((e) => {
  const auth = e.auth
  if (!auth) {
    throw new BadRequestError(
      'Acesso não autenticado: faça login para gerar demandas de inventário.',
    )
  }

  const requesterId = auth.id
  const requesterName = auth.get('name') || auth.get('email') || 'Programador PCP'
  const requesterRole = auth.get('role') || 'PCP_PROGRAMMER'

  // O frontend NÃO envia o Solicitante — sobrescrever incondicionalmente no servidor
  e.record.set('requester_id', requesterId)
  e.record.set('requester_name', requesterName)
  e.record.set('requester_role', requesterRole)

  e.next()
}, 'pcp_mp_inventory_demands')

// onRecordUpdateRequest: preservar requester_* originais e bloquear alterações indevidas em demandas já concluídas
onRecordUpdateRequest((e) => {
  const original = e.record.original()
  if (original) {
    const origId = original.getString('requester_id')
    const origName = original.getString('requester_name')
    const origRole = original.getString('requester_role')

    if (origId) e.record.set('requester_id', origId)
    if (origName) e.record.set('requester_name', origName)
    if (origRole) e.record.set('requester_role', origRole)

    const prevStatus = (original.getString('status') || '').trim().toLowerCase()
    const nextStatus = (e.record.getString('status') || '').trim().toLowerCase()
    const isOriginalConcluded =
      prevStatus === 'concluído' ||
      prevStatus === 'concluido' ||
      prevStatus === 'inventário concluído' ||
      prevStatus === 'inventario concluido'

    // Concluído é o único estado terminal absoluto: nenhuma alteração permitida
    if (isOriginalConcluded) {
      throw new BadRequestError('Inventário concluído. Novas contagens não são permitidas.')
    }

    // Se estava cancelado, só é permitida atualização se estiver sendo reaberto (status mudando para Aberto com incremento de ciclo)
    const isOriginalCancelled = prevStatus === 'cancelado' || prevStatus === 'cancelada'
    if (isOriginalCancelled && (nextStatus === 'cancelado' || nextStatus === 'cancelada')) {
      // Modificações internas mantendo cancelado são rejeitadas se tentarem inventariar
      const prevPieces = original.getInt('total_pieces_inventoried')
      const nextPieces = e.record.getInt('total_pieces_inventoried')
      if (prevPieces !== nextPieces) {
        throw new BadRequestError(
          'Não é possível registrar contagens em um ciclo de inventário cancelado. Reabra a demanda para iniciar um novo ciclo.',
        )
      }
    }
  }

  e.next()
}, 'pcp_mp_inventory_demands')

// BLOQUEIO SERVER-SIDE DE NOVAS CONTAGENS / EDIÇÕES / EXCLUSÕES EM pcp_mp_inventory_items
onRecordCreateRequest((e) => {
  const demandId = e.record.getString('demand_id') || e.record.getString('inventory_id')
  const inventoryCode = e.record.getString('inventory_code') || e.record.getString('control_number')

  let demandRecord = null
  if (demandId) {
    try {
      demandRecord = $app.findRecordById('pcp_mp_inventory_demands', demandId)
    } catch (_) {}
  }
  if (!demandRecord && inventoryCode) {
    try {
      demandRecord = $app.findFirstRecordByData(
        'pcp_mp_inventory_demands',
        'control_number',
        inventoryCode,
      )
    } catch (_) {}
  }

  if (demandRecord) {
    const st = (demandRecord.getString('status') || '').trim().toLowerCase()
    const isCancelled = st === 'cancelado' || st === 'cancelada'
    const isConcluded =
      st === 'concluído' ||
      st === 'concluido' ||
      st === 'inventário concluído' ||
      st === 'inventario concluido'

    if (isConcluded) {
      throw new BadRequestError('Inventário concluído. Novas contagens não são permitidas.')
    }
    if (isCancelled) {
      throw new BadRequestError(
        'Não é possível registrar contagens em um ciclo de inventário cancelado. Reabra a demanda para iniciar um novo ciclo.',
      )
    }

    // Se a demanda possui cycle_count e o item não veio com cycle_number definido, vincula ao ciclo atual
    const currentDemandCycle = demandRecord.getInt('cycle_count') || 1
    const itemCycle = e.record.getInt('cycle_number')
    if (!itemCycle || itemCycle < 1) {
      e.record.set('cycle_number', currentDemandCycle)
    }
  }

  e.next()
}, 'pcp_mp_inventory_items')

onRecordUpdateRequest((e) => {
  const demandId = e.record.getString('demand_id') || e.record.getString('inventory_id')
  const inventoryCode = e.record.getString('inventory_code') || e.record.getString('control_number')

  let demandRecord = null
  if (demandId) {
    try {
      demandRecord = $app.findRecordById('pcp_mp_inventory_demands', demandId)
    } catch (_) {}
  }
  if (!demandRecord && inventoryCode) {
    try {
      demandRecord = $app.findFirstRecordByData(
        'pcp_mp_inventory_demands',
        'control_number',
        inventoryCode,
      )
    } catch (_) {}
  }

  if (demandRecord) {
    const st = (demandRecord.getString('status') || '').trim().toLowerCase()
    const isCancelled = st === 'cancelado' || st === 'cancelada'
    const isConcluded =
      st === 'concluído' ||
      st === 'concluido' ||
      st === 'inventário concluído' ||
      st === 'inventario concluido'

    if (isConcluded) {
      throw new BadRequestError('Inventário concluído. Novas contagens não são permitidas.')
    }
    if (isCancelled) {
      throw new BadRequestError(
        'Não é possível registrar contagens em um ciclo de inventário cancelado. Reabra a demanda para iniciar um novo ciclo.',
      )
    }

    // Também bloquear alteração de contagens de ciclos anteriores já encerrados
    const currentDemandCycle = demandRecord.getInt('cycle_count') || 1
    const itemCycle = e.record.getInt('cycle_number') || 1
    if (itemCycle < currentDemandCycle) {
      throw new BadRequestError(
        'Contagens de ciclos anteriores são somente leitura para fins de auditoria.',
      )
    }
  }

  e.next()
}, 'pcp_mp_inventory_items')

onRecordDeleteRequest((e) => {
  const demandId = e.record.getString('demand_id') || e.record.getString('inventory_id')
  const inventoryCode = e.record.getString('inventory_code') || e.record.getString('control_number')

  let demandRecord = null
  if (demandId) {
    try {
      demandRecord = $app.findRecordById('pcp_mp_inventory_demands', demandId)
    } catch (_) {}
  }
  if (!demandRecord && inventoryCode) {
    try {
      demandRecord = $app.findFirstRecordByData(
        'pcp_mp_inventory_demands',
        'control_number',
        inventoryCode,
      )
    } catch (_) {}
  }

  if (demandRecord) {
    const st = (demandRecord.getString('status') || '').trim().toLowerCase()
    const isCancelled = st === 'cancelado' || st === 'cancelada'
    const isConcluded =
      st === 'concluído' ||
      st === 'concluido' ||
      st === 'inventário concluído' ||
      st === 'inventario concluido'

    if (isConcluded) {
      throw new BadRequestError('Inventário concluído. Novas contagens não são permitidas.')
    }
    if (isCancelled) {
      throw new BadRequestError(
        'Não é possível registrar contagens em um ciclo de inventário cancelado. Reabra a demanda para iniciar um novo ciclo.',
      )
    }

    // Bloquear exclusão de contagens de ciclos anteriores (preservação para auditoria)
    const currentDemandCycle = demandRecord.getInt('cycle_count') || 1
    const itemCycle = e.record.getInt('cycle_number') || 1
    if (itemCycle < currentDemandCycle) {
      throw new BadRequestError(
        'Contagens de ciclos anteriores são preservadas para histórico e não podem ser excluídas.',
      )
    }
  }

  e.next()
}, 'pcp_mp_inventory_items')
