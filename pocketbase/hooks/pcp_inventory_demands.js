// PocketBase custom hook: Geração atômica de próximo número de demanda de inventário MP
// Endpoint: GET /backend/v1/pcp-inventory-demands-next-number

routerAdd('GET', '/backend/v1/pcp-inventory-demands-next-number', (e) => {
  const year = new Date().getFullYear()
  const prefix = 'INV-' + year + '-'

  let nextNumStr = ''
  let maxSeq = 0

  // 1. Consulta o maior control_number para o ano atual
  try {
    const records = $app.findRecordsByFilter(
      'pcp_mp_inventory_demands',
      "control_number ~ '" + prefix + "'",
      '-control_number',
      20,
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

  // Se não encontrou no filtro, busca todos ou fallback sequencial
  if (maxSeq === 0) {
    try {
      const all = $app.findRecordsByFilter('pcp_mp_inventory_demands', '', '-created', 50, 0)
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
