/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000095: Reestruturação da collection line_raw_material_applications
 * - Pesos em toneladas (t): min_weight_t, avg_weight_t, max_weight_t
 * - Conversão idempotente de kg para t (kg / 1000) com flag units_migrated
 * - Fornecedor da MP: supplier_applicable (bool), suppliers_json (array estruturado de {code, name})
 * - Tipo de MP: raw_material_type (single select)
 * - Aplicação do Produto: bitolas_json (array), steel_types_json (array)
 * - Comprimentos Laminado (mm): rolled_min_length_mm, rolled_ideal_length_mm, rolled_max_length_mm
 * - Reduções (%): reduction_min_pct, reduction_ideal_pct, reduction_max_pct
 * - Vigência: validity_start (date), validity_end (date)
 * - Comprimentos MP (mm): mp_min_length_mm, mp_ideal_length_mm, mp_max_length_mm
 * - Conversão idempotente de m para mm (m * 1000)
 */

migrate(
  (app) => {
    if (!app.hasTable('line_raw_material_applications')) {
      return
    }

    const col = app.findCollectionByNameOrId('line_raw_material_applications')
    let changed = false

    const addNumberField = (name) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(new NumberField({ name, required: false }))
        changed = true
      }
    }

    const addTextField = (name) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(new TextField({ name, required: false }))
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
        col.fields.add(new DateTimeField({ name, required: false }))
        changed = true
      }
    }

    // Pesos em toneladas (t)
    addNumberField('min_weight_t')
    addNumberField('avg_weight_t')
    addNumberField('max_weight_t')

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
    addDateField('validity_start')
    addDateField('validity_end')

    // Tópico 5: Comprimento MP (mm)
    addNumberField('mp_min_length_mm')
    addNumberField('mp_ideal_length_mm')
    addNumberField('mp_max_length_mm')

    // Flag de controle de migração idempotente
    addBoolField('units_migrated')

    if (changed) {
      app.save(col)
    }

    // Conversão de dados existentes de kg -> t e m -> mm (idempotente)
    try {
      const records = app.findRecordsByFilter(
        'line_raw_material_applications',
        'units_migrated = false || units_migrated = null',
        'created',
        1000,
        0,
      )

      for (const record of records) {
        // Conversão de pesos: kg -> t
        const oldMinW = record.get('min_weight_kg')
        const oldAvgW = record.get('average_weight_kg')
        const oldMaxW = record.get('max_weight_kg')

        if (oldMinW !== null && oldMinW !== undefined && oldMinW !== '') {
          record.set('min_weight_t', Number(oldMinW) / 1000)
        }
        if (oldAvgW !== null && oldAvgW !== undefined && oldAvgW !== '') {
          record.set('avg_weight_t', Number(oldAvgW) / 1000)
        }
        if (oldMaxW !== null && oldMaxW !== undefined && oldMaxW !== '') {
          record.set('max_weight_t', Number(oldMaxW) / 1000)
        }

        // Conversão de comprimentos MP: m -> mm
        const oldMinMp = record.get('min_mp_length_m')
        const oldMaxMp = record.get('max_mp_length_m')

        if (oldMinMp !== null && oldMinMp !== undefined && oldMinMp !== '') {
          record.set('mp_min_length_mm', Number(oldMinMp) * 1000)
        }
        if (oldMaxMp !== null && oldMaxMp !== undefined && oldMaxMp !== '') {
          record.set('mp_max_length_mm', Number(oldMaxMp) * 1000)
        }
        if (record.get('mp_ideal_length_mm') == null && oldMinMp != null && oldMaxMp != null) {
          record.set('mp_ideal_length_mm', ((Number(oldMinMp) + Number(oldMaxMp)) / 2) * 1000)
        }

        // Conversão de comprimento laminado: m -> mm
        const oldRolled = record.get('rolled_length_m')
        if (oldRolled !== null && oldRolled !== undefined && oldRolled !== '') {
          record.set('rolled_ideal_length_mm', Number(oldRolled) * 1000)
          record.set('rolled_min_length_mm', Number(oldRolled) * 1000)
          record.set('rolled_max_length_mm', Number(oldRolled) * 1000)
        }

        // Conversão de fornecedor legado para estrutura
        const oldSupplier = record.get('supplier')
        if (
          oldSupplier &&
          (!record.get('suppliers_json') || record.get('suppliers_json').length === 0)
        ) {
          record.set('supplier_applicable', true)
          record.set('suppliers_json', [
            {
              code: record.get('supplier_id') || 'FORN-LEGADO',
              name: String(oldSupplier),
              description: String(oldSupplier),
            },
          ])
        } else if (
          record.get('supplier_applicable') === null ||
          record.get('supplier_applicable') === undefined
        ) {
          record.set('supplier_applicable', Boolean(oldSupplier))
        }

        // Conversão de bitola legada para bitolas_json
        const oldBitola = record.get('bitola_ref')
        if (oldBitola && (!record.get('bitolas_json') || record.get('bitolas_json').length === 0)) {
          record.set('bitolas_json', [String(oldBitola)])
        }

        // Conversão de aço legado para steel_types_json
        const oldSteel = record.get('steel_type')
        if (
          oldSteel &&
          (!record.get('steel_types_json') || record.get('steel_types_json').length === 0)
        ) {
          record.set('steel_types_json', [String(oldSteel)])
        }

        // Reduções legadas
        const oldRedPct = record.get('reduction_percentage')
        if (oldRedPct !== null && oldRedPct !== undefined && oldRedPct !== '') {
          record.set('reduction_ideal_pct', Number(oldRedPct))
          record.set('reduction_min_pct', Number(oldRedPct))
          record.set('reduction_max_pct', Number(oldRedPct))
        }

        record.set('units_migrated', true)
        app.save(record)
      }
    } catch (err) {
      console.log('Aviso ao converter registros legados de line_raw_material_applications:', err)
    }
  },
  (app) => {
    // Reversão
  },
)
