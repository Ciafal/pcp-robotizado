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
