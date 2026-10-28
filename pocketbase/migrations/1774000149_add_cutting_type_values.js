/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000149: Adicionar valores 'GEOMETRIA_DO_CORTE' e garantir 'PLACAS'
 * no campo select 'cutting_type' da collection mp_cutting_weight_standards.
 * Idempotente com verificação de valores existentes.
 */
migrate(
  (app) => {
    let col = null
    try {
      if (app.hasTable('mp_cutting_weight_standards')) {
        col = app.findCollectionByNameOrId('mp_cutting_weight_standards')
      }
    } catch (_) {}

    if (!col) {
      console.log(
        'Collection mp_cutting_weight_standards não encontrada, pulando atualização de select.',
      )
      return
    }

    const cuttingTypeField = col.fields.getByName('cutting_type')
    if (!cuttingTypeField) {
      console.log('Campo cutting_type não encontrado na collection mp_cutting_weight_standards.')
      return
    }

    const currentValues = Array.isArray(cuttingTypeField.values) ? [...cuttingTypeField.values] : []
    const targetValues = ['BLOCOS', 'MULTIPLOS', 'PLACAS', 'BOBINAS', 'GEOMETRIA_DO_CORTE']
    let changed = false

    for (let i = 0; i < targetValues.length; i++) {
      const val = targetValues[i]
      if (!currentValues.includes(val)) {
        currentValues.push(val)
        changed = true
      }
    }

    if (changed) {
      cuttingTypeField.values = currentValues
      app.save(col)
      console.log(
        'Valores de cutting_type atualizados em mp_cutting_weight_standards:',
        currentValues,
      )
    } else {
      console.log('Valores de cutting_type já continham os novos tipos.')
    }
  },
  (app) => {
    // Reversão segura sem quebrar integridade referencial existente
    try {
      if (app.hasTable('mp_cutting_weight_standards')) {
        const col = app.findCollectionByNameOrId('mp_cutting_weight_standards')
        const cuttingTypeField = col.fields.getByName('cutting_type')
        if (cuttingTypeField && Array.isArray(cuttingTypeField.values)) {
          cuttingTypeField.values = cuttingTypeField.values.filter(
            (v) => v !== 'GEOMETRIA_DO_CORTE' && v !== 'PLACAS',
          )
          app.save(col)
        }
      }
    } catch (_) {}
  },
)
