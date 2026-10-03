/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Garantir que collection line_raw_material_applications exista
    let col = null
    try {
      col = app.findCollectionByNameOrId('line_raw_material_applications')
    } catch (e) {
      col = null
    }

    if (!col) {
      console.log('Collection line_raw_material_applications não encontrada para reestruturação')
      return
    }

    let changed = false

    const addTextField = (name) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(new TextField({ name, required: false }))
        changed = true
      }
    }

    const addNumberField = (name) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(new NumberField({ name, required: false }))
        changed = true
      }
    }

    const addBoolField = (name) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(new BoolField({ name, required: false }))
        changed = true
      }
    }

    const addJsonField = (name) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(new JSONField({ name, required: false }))
        changed = true
      }
    }

    const addDateField = (name) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(new DateField({ name, required: false }))
        changed = true
      }
    }

    // Tópico 2: Fornecedor da MP
    addBoolField('supplier_applicable')
    addJsonField('suppliers_json')
    addTextField('raw_material_type')

    // Tópico 3: Aplicação do Produto
    addJsonField('bitolas_json')
    addJsonField('steel_types_json')
    addNumberField('rolled_min_length_mm')
    addNumberField('rolled_ideal_length_mm')
    addNumberField('rolled_max_length_mm')
    addNumberField('reduction_min_pct')
    addNumberField('reduction_ideal_pct')
    addNumberField('reduction_max_pct')
    addDateField('validity_start_date')
    addDateField('validity_end_date')

    // Tópico 4: Pesos da Matéria-prima (t)
    addNumberField('min_weight_t')
    addNumberField('average_weight_t')
    addNumberField('max_weight_t')

    // Tópico 5: Comprimento Matéria-prima (mm)
    addNumberField('min_mp_length_mm')
    addNumberField('ideal_mp_length_mm')
    addNumberField('max_mp_length_mm')

    if (changed) {
      app.save(col)
      console.log('Collection line_raw_material_applications atualizada com novos campos')
    }

    // Migração de dados legados existentes: conversões matemáticas kg->t e m->mm
    try {
      const records = app.findRecordsByFilter(
        'line_raw_material_applications',
        'id != ""',
        '-created',
        500,
        0,
      )

      for (let i = 0; i < records.length; i++) {
        const record = records[i]
        let recChanged = false

        // 1. Pesos: kg -> t (t = kg / 1000)
        const avgKg = record.get('average_weight_kg')
        if (
          avgKg !== null &&
          avgKg !== undefined &&
          (record.get('average_weight_t') === null || record.get('average_weight_t') === undefined)
        ) {
          record.set('average_weight_t', Number((avgKg / 1000).toFixed(6)))
          recChanged = true
        }

        const minKg = record.get('min_weight_kg')
        if (
          minKg !== null &&
          minKg !== undefined &&
          (record.get('min_weight_t') === null || record.get('min_weight_t') === undefined)
        ) {
          record.set('min_weight_t', Number((minKg / 1000).toFixed(6)))
          recChanged = true
        }

        const maxKg = record.get('max_weight_kg')
        if (
          maxKg !== null &&
          maxKg !== undefined &&
          (record.get('max_weight_t') === null || record.get('max_weight_t') === undefined)
        ) {
          record.set('max_weight_t', Number((maxKg / 1000).toFixed(6)))
          recChanged = true
        }

        // 2. Comprimento MP: m -> mm (mm = m * 1000)
        const minMpM = record.get('min_mp_length_m')
        if (
          minMpM !== null &&
          minMpM !== undefined &&
          (record.get('min_mp_length_mm') === null || record.get('min_mp_length_mm') === undefined)
        ) {
          record.set('min_mp_length_mm', Math.round(minMpM * 1000))
          recChanged = true
        }

        const maxMpM = record.get('max_mp_length_m')
        if (
          maxMpM !== null &&
          maxMpM !== undefined &&
          (record.get('max_mp_length_mm') === null || record.get('max_mp_length_mm') === undefined)
        ) {
          record.set('max_mp_length_mm', Math.round(maxMpM * 1000))
          recChanged = true
        }

        // Comp Ideal MP inicializado a partir de rolled_length_m ou média se não houver
        if (
          record.get('ideal_mp_length_mm') === null ||
          record.get('ideal_mp_length_mm') === undefined
        ) {
          const rolledM = record.get('rolled_length_m')
          if (rolledM !== null && rolledM !== undefined) {
            record.set('ideal_mp_length_mm', Math.round(rolledM * 1000))
            recChanged = true
          } else if (record.get('min_mp_length_mm') && record.get('max_mp_length_mm')) {
            record.set(
              'ideal_mp_length_mm',
              Math.round((record.get('min_mp_length_mm') + record.get('max_mp_length_mm')) / 2),
            )
            recChanged = true
          }
        }

        // 3. Comprimento Laminado: m -> mm
        const rolledM = record.get('rolled_length_m')
        if (
          rolledM !== null &&
          rolledM !== undefined &&
          (record.get('rolled_ideal_length_mm') === null ||
            record.get('rolled_ideal_length_mm') === undefined)
        ) {
          const rolledMm = Math.round(rolledM * 1000)
          record.set('rolled_ideal_length_mm', rolledMm)
          if (!record.get('rolled_min_length_mm')) record.set('rolled_min_length_mm', rolledMm)
          if (!record.get('rolled_max_length_mm')) record.set('rolled_max_length_mm', rolledMm)
          recChanged = true
        }

        // 4. Redução: percentual legado vai para ideal/min/max se vazio
        const redPct = record.get('reduction_percentage')
        if (
          redPct !== null &&
          redPct !== undefined &&
          (record.get('reduction_ideal_pct') === null ||
            record.get('reduction_ideal_pct') === undefined)
        ) {
          record.set('reduction_ideal_pct', Number(redPct))
          if (!record.get('reduction_min_pct')) record.set('reduction_min_pct', Number(redPct))
          if (!record.get('reduction_max_pct')) record.set('reduction_max_pct', Number(redPct))
          recChanged = true
        }

        // 5. Fornecedor legado para JSON estruturado
        const sup = record.get('supplier')
        const supId = record.get('supplier_id')
        if (
          record.get('supplier_applicable') === null ||
          record.get('supplier_applicable') === undefined
        ) {
          record.set('supplier_applicable', Boolean(sup && sup.trim()))
          recChanged = true
        }

        const existingSupJson = record.get('suppliers_json')
        if (
          (!existingSupJson || (Array.isArray(existingSupJson) && existingSupJson.length === 0)) &&
          sup &&
          sup.trim()
        ) {
          record.set('suppliers_json', [
            {
              code: supId
                ? String(supId).trim()
                : 'FORN-' + String(sup).replace(/\s+/g, '-').toUpperCase().slice(0, 10),
              name: String(sup).trim(),
            },
          ])
          recChanged = true
        }

        // 6. Bitola legada para bitolas_json
        const bitola = record.get('bitola_ref')
        const existingBitolas = record.get('bitolas_json')
        if (
          (!existingBitolas || (Array.isArray(existingBitolas) && existingBitolas.length === 0)) &&
          bitola &&
          bitola.trim()
        ) {
          record.set('bitolas_json', [bitola.trim()])
          recChanged = true
        }

        // 7. Tipo de aço legado para steel_types_json
        const steel = record.get('steel_type')
        const existingSteels = record.get('steel_types_json')
        if (
          (!existingSteels || (Array.isArray(existingSteels) && existingSteels.length === 0)) &&
          steel &&
          steel.trim()
        ) {
          record.set('steel_types_json', [steel.trim()])
          recChanged = true
        }

        if (recChanged) {
          app.save(record)
        }
      }
    } catch (err) {
      console.log('Aviso ao migrar registros legados de line_raw_material_applications:', err)
    }
  },
  (app) => {
    // Reversão
  },
)
