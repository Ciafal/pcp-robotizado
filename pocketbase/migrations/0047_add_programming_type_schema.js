migrate(
  (app) => {
    // 1. Atualizar production_lines com programming_type e programming_stages
    const linesCol = app.findCollectionByNameOrId('production_lines')
    if (!linesCol.fields.getByName('programming_type')) {
      linesCol.fields.add(
        new SelectField({
          name: 'programming_type',
          required: false,
          values: [
            'Enfornamento',
            'Laminação',
            'Envio',
            'Preparação',
            'Acabamento',
            'Endireitadeira',
            'Inspeção',
            'Múltiplo',
            'Argola',
            'Alto-Forno',
            'Aciaria',
          ],
          maxSelect: 1,
        }),
      )
    }

    if (!linesCol.fields.getByName('programming_stages')) {
      linesCol.fields.add(
        new JSONField({
          name: 'programming_stages',
          required: false,
        }),
      )
    }
    app.save(linesCol)

    // 2. Atualizar line_masters com os mesmos campos para manter sincronia
    const mastersCol = app.findCollectionByNameOrId('line_masters')
    if (!mastersCol.fields.getByName('programming_type')) {
      mastersCol.fields.add(
        new SelectField({
          name: 'programming_type',
          required: false,
          values: [
            'Enfornamento',
            'Laminação',
            'Envio',
            'Preparação',
            'Acabamento',
            'Endireitadeira',
            'Inspeção',
            'Múltiplo',
            'Argola',
            'Alto-Forno',
            'Aciaria',
          ],
          maxSelect: 1,
        }),
      )
    }

    if (!mastersCol.fields.getByName('programming_stages')) {
      mastersCol.fields.add(
        new JSONField({
          name: 'programming_stages',
          required: false,
        }),
      )
    }
    app.save(mastersCol)

    // 3. Atualizar linhas existentes com tipos de programação de referência coerentes
    const typeMap = {
      L1: { type: 'Laminação', stages: [] },
      ENF_L1: { type: 'Enfornamento', stages: [] },
      L2: { type: 'Laminação', stages: [] },
      ACAB_L2: { type: 'Acabamento', stages: [] },
      ENDIR: { type: 'Endireitadeira', stages: [] },
      RETRAB: { type: 'Múltiplo', stages: ['Preparação', 'Acabamento', 'Inspeção'] },
    }

    try {
      const lines = app.findRecordsByFilter('production_lines', 'id != ""', 'code', 100, 0)
      for (const l of lines) {
        const code = l.getString('code')
        const mapping = typeMap[code] || { type: 'Laminação', stages: [] }
        l.set('programming_type', mapping.type)
        l.set('programming_stages', mapping.stages)
        if (l.get('is_active') === null || l.get('is_active') === undefined) {
          l.set('is_active', true)
        }
        app.save(l)
      }
    } catch (err) {
      console.warn('Erro ao atualizar programming_type das linhas existentes:', err)
    }

    try {
      const masters = app.findRecordsByFilter('line_masters', 'id != ""', 'code', 100, 0)
      for (const m of masters) {
        const code = m.getString('code')
        const mapping = typeMap[code] || { type: 'Laminação', stages: [] }
        m.set('programming_type', mapping.type)
        m.set('programming_stages', mapping.stages)
        app.save(m)
      }
    } catch (err) {
      console.warn('Erro ao atualizar programming_type das fichas mestre existentes:', err)
    }
  },
  (app) => {
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const ptField = linesCol.fields.getByName('programming_type')
    if (ptField) linesCol.fields.remove(ptField)
    const psField = linesCol.fields.getByName('programming_stages')
    if (psField) linesCol.fields.remove(psField)
    app.save(linesCol)

    const mastersCol = app.findCollectionByNameOrId('line_masters')
    const mPtField = mastersCol.fields.getByName('programming_type')
    if (mPtField) mastersCol.fields.remove(mPtField)
    const mPsField = mastersCol.fields.getByName('programming_stages')
    if (mPsField) mastersCol.fields.remove(mPsField)
    app.save(mastersCol)
  },
)
