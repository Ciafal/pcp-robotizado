/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pcp_programming_parameters')
    if (col) {
      if (!col.fields.getByName('texto_parametro')) {
        col.fields.addAt(
          col.fields.length,
          new TextField({
            name: 'texto_parametro',
            required: false,
          }),
        )
      }
      if (!col.fields.getByName('impacto_consequencia')) {
        col.fields.addAt(
          col.fields.length,
          new TextField({
            name: 'impacto_consequencia',
            required: false,
          }),
        )
      }
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pcp_programming_parameters')
    if (col) {
      const f1 = col.fields.getByName('texto_parametro')
      if (f1) col.fields.removeByName('texto_parametro')
      const f2 = col.fields.getByName('impacto_consequencia')
      if (f2) col.fields.removeByName('impacto_consequencia')
      app.save(col)
    }
  },
)
