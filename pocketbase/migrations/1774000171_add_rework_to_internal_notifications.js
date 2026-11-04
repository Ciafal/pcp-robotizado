/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000171: Adiciona valor 'REWORK' ao campo select 'type'
 * da collection pcp_internal_notifications de forma idempotente.
 */
migrate(
  (app) => {
    let col = null
    try {
      if (app.hasTable('pcp_internal_notifications')) {
        col = app.findCollectionByNameOrId('pcp_internal_notifications')
      }
    } catch (_) {}

    if (!col) {
      console.log('Collection pcp_internal_notifications não encontrada, pulando.')
      return
    }

    const typeField = col.fields.getByName('type')
    if (!typeField) {
      console.log('Campo type não encontrado em pcp_internal_notifications.')
      return
    }

    const currentValues = Array.isArray(typeField.values) ? [...typeField.values] : []
    if (!currentValues.includes('REWORK')) {
      currentValues.push('REWORK')
      typeField.values = currentValues
      app.save(col)
      console.log('Valor REWORK adicionado a type em pcp_internal_notifications.')
    }
  },
  (app) => {
    try {
      if (app.hasTable('pcp_internal_notifications')) {
        const col = app.findCollectionByNameOrId('pcp_internal_notifications')
        const typeField = col.fields.getByName('type')
        if (typeField && Array.isArray(typeField.values)) {
          typeField.values = typeField.values.filter((v) => v !== 'REWORK')
          app.save(col)
        }
      }
    } catch (_) {}
  },
)
