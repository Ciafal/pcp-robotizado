migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('production_shift_crews')
    if (!col) return

    // Permitir criação por usuários autenticados ou quando houver autenticação corporativa
    col.createRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.id != ''"
    col.deleteRule = "@request.auth.id != ''"

    if (!col.fields.getByName('valid_from')) {
      col.fields.add(
        new DateField({
          name: 'valid_from',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('valid_until')) {
      col.fields.add(
        new DateField({
          name: 'valid_until',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('status')) {
      col.fields.add(
        new SelectField({
          name: 'status',
          required: false,
          values: ['ATIVO', 'INATIVO'],
          maxSelect: 1,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('production_shift_crews')
    if (!col) return

    if (col.fields.getByName('valid_from')) {
      col.fields.removeByName('valid_from')
    }
    if (col.fields.getByName('valid_until')) {
      col.fields.removeByName('valid_until')
    }
    if (col.fields.getByName('status')) {
      col.fields.removeByName('status')
    }

    app.save(col)
  },
)
