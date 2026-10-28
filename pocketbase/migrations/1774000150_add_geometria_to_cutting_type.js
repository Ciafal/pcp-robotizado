/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    let collection
    try {
      collection = app.findCollectionByNameOrId('mp_cutting_weight_standards')
    } catch (e) {
      return
    }
    if (!collection) return

    const cuttingTypeField = collection.fields?.getByName?.('cutting_type')
    if (!cuttingTypeField) return

    // Adicionar GEOMETRIA aos valores do select mantendo idempotência
    const currentValues = Array.isArray(cuttingTypeField.values) ? cuttingTypeField.values : []
    const newValues = Array.from(
      new Set([...currentValues, 'BLOCOS', 'PLACAS', 'BOBINAS', 'GEOMETRIA']),
    )
    cuttingTypeField.values = newValues
    app.save(collection)
  },
  (app) => {
    let collection
    try {
      collection = app.findCollectionByNameOrId('mp_cutting_weight_standards')
    } catch (e) {
      return
    }
    if (!collection) return

    const cuttingTypeField = collection.fields?.getByName?.('cutting_type')
    if (!cuttingTypeField) return

    if (Array.isArray(cuttingTypeField.values)) {
      cuttingTypeField.values = cuttingTypeField.values.filter((v) => v !== 'GEOMETRIA')
    }
    app.save(collection)
  },
)
