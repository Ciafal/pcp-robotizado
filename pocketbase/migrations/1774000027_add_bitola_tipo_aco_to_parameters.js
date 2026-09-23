/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pcp_programming_parameters')
    if (col) {
      if (!col.fields.getByName('bitola')) {
        col.fields.add(
          new TextField({
            name: 'bitola',
            required: false,
          }),
        )
      }
      if (!col.fields.getByName('tipo_aco')) {
        col.fields.add(
          new TextField({
            name: 'tipo_aco',
            required: false,
          }),
        )
      }
      if (!col.fields.getByName('codigo_sap')) {
        col.fields.add(
          new TextField({
            name: 'codigo_sap',
            required: false,
          }),
        )
      }
      if (!col.fields.getByName('sap_metadata')) {
        col.fields.add(
          new JSONField({
            name: 'sap_metadata',
            required: false,
          }),
        )
      }
      if (!col.fields.getByName('created_by_user')) {
        col.fields.add(
          new TextField({
            name: 'created_by_user',
            required: false,
          }),
        )
      }
      if (!col.fields.getByName('updated_by_user')) {
        col.fields.add(
          new TextField({
            name: 'updated_by_user',
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
      const fBitola = col.fields.getByName('bitola')
      if (fBitola) col.fields.removeByName('bitola')
      const fTipoAco = col.fields.getByName('tipo_aco')
      if (fTipoAco) col.fields.removeByName('tipo_aco')
      const fCodigoSap = col.fields.getByName('codigo_sap')
      if (fCodigoSap) col.fields.removeByName('codigo_sap')
      const fSapMeta = col.fields.getByName('sap_metadata')
      if (fSapMeta) col.fields.removeByName('sap_metadata')
      const fCreatedBy = col.fields.getByName('created_by_user')
      if (fCreatedBy) col.fields.removeByName('created_by_user')
      const fUpdatedBy = col.fields.getByName('updated_by_user')
      if (fUpdatedBy) col.fields.removeByName('updated_by_user')
      app.save(col)
    }
  },
)
