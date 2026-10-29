// pocketbase/hooks/mp_cutting_plan_numbering.js
// Endpoint oficial do servidor para geração atômica e exclusiva de numeração de Planos de Corte
// Formato: PCM-YYYY-XXXXX (Múltiplo) e PCB-YYYY-XXXXX (Blocos)
// Controle atômico com concorrência segura, transação no banco e idempotência

routerAdd('POST', '/backend/v1/pcp/cutting-plans/next-code', (e) => {
  const reqInfo = e.requestInfo()
  const data = reqInfo.body || {}
  const rawPrefix = (data.prefix || 'PCM').toString().toUpperCase().trim()
  const prefix = rawPrefix === 'PCB' ? 'PCB' : 'PCM'
  const year = data.year ? parseInt(data.year, 10) : new Date().getFullYear()

  let generatedCode = ''
  let finalSeq = 1

  // Executa dentro de transação atômica do servidor
  $app.runInTransaction((txApp) => {
    let seqRecord = null

    try {
      const records = txApp.findRecordsByFilter(
        'mp_cutting_plan_sequences',
        `prefix = '${prefix}' && year = ${year}`,
        '-updated',
        1,
        0,
      )
      if (records && records.length > 0) {
        seqRecord = records[0]
      }
    } catch (_) {
      // registro não existe ainda
    }

    if (seqRecord) {
      finalSeq = (seqRecord.getInt('current_number') || 0) + 1
      seqRecord.set('current_number', finalSeq)
      seqRecord.set('sequence_key', `${prefix}-${year}-${finalSeq}`)
      txApp.save(seqRecord)
    } else {
      // Cria registro de sequência inicial
      const col = txApp.findCollectionByNameOrId('mp_cutting_plan_sequences')
      const newSeq = new Record(col)
      newSeq.set('prefix', prefix)
      newSeq.set('year', year)
      newSeq.set('current_number', 1)
      newSeq.set('sequence_key', `${prefix}-${year}-1`)
      txApp.save(newSeq)
      finalSeq = 1
    }

    const padded = ('00000' + finalSeq).slice(-5)
    generatedCode = `${prefix}-${year}-${padded}`

    // Idempotência extra: verifica se já existe algum plano gravado com este mesmo código
    try {
      const existingPlan = txApp.findFirstRecordByData(
        'mp_multiple_cutting_plans',
        'plan_code',
        generatedCode,
      )
      if (existingPlan && seqRecord) {
        finalSeq += 1
        seqRecord.set('current_number', finalSeq)
        seqRecord.set('sequence_key', `${prefix}-${year}-${finalSeq}`)
        txApp.save(seqRecord)
        const paddedNext = ('00000' + finalSeq).slice(-5)
        generatedCode = `${prefix}-${year}-${paddedNext}`
      }
    } catch (_) {}
  })

  return e.json(200, {
    success: true,
    plan_code: generatedCode,
    prefix: prefix,
    year: year,
    sequence: finalSeq,
  })
})
