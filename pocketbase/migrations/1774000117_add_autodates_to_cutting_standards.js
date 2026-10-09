// Migration 1774000117: Adicionar autodate created e updated e status PENDENTE_CORRECAO em mp_cutting_weight_standards
migrate(
  (app) => {
    try {
      if (app.hasTable('mp_cutting_weight_standards')) {
        const col = app.findCollectionByNameOrId('mp_cutting_weight_standards')

        // 1. Adicionar created e updated se não existirem
        if (!col.fields.getByName('created')) {
          col.fields.add(
            new AutodateField({
              name: 'created',
              onCreate: true,
              onUpdate: false,
            }),
          )
        }
        if (!col.fields.getByName('updated')) {
          col.fields.add(
            new AutodateField({
              name: 'updated',
              onCreate: true,
              onUpdate: true,
            }),
          )
        }

        // 2. Expandir select de status para incluir PENDENTE_CORRECAO
        const statusField = col.fields.getByName('status')
        if (statusField) {
          statusField.values = ['ATIVO', 'INATIVO', 'PENDENTE_CORRECAO']
          statusField.maxSelect = 1
        }

        app.save(col)
      }
    } catch (e) {
      console.warn('Erro na migration 1774000117 mp_cutting_weight_standards:', e)
    }

    try {
      if (app.hasTable('mp_cutting_simulations')) {
        const simCol = app.findCollectionByNameOrId('mp_cutting_simulations')
        if (!simCol.fields.getByName('created')) {
          simCol.fields.add(
            new AutodateField({
              name: 'created',
              onCreate: true,
              onUpdate: false,
            }),
          )
        }
        if (!simCol.fields.getByName('updated')) {
          simCol.fields.add(
            new AutodateField({
              name: 'updated',
              onCreate: true,
              onUpdate: true,
            }),
          )
        }
        app.save(simCol)
      }
    } catch (e) {
      console.warn('Erro na migration 1774000117 mp_cutting_simulations:', e)
    }
  },
  (app) => {
    // Revert opcional
  },
)
