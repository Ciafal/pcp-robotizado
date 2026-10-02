/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000088: Adicionar campos estruturados de Empresa/Linha/Centro
 * nas collections de checklist de fechamento (checklist_fechamento_modelos e checklist_fechamento_itens).
 *
 * Campos adicionados:
 * - werks: código da empresa/planta SAP (ex. '1000', '1001', '2001')
 * - line_id: ID do registro original em production_lines
 * - line_code: Código da Linha produtiva (ex. 'L1', 'L2', 'ENF_L1')
 * - line_name: Nome amigável da Linha produtiva
 * - center_id: ID do centro/work center/line_master relacionado
 * - center_code: Código do Centro de Trabalho (ex. 'WC-DIV-L1', 'LAML2')
 * - center_name: Nome amigável do Centro
 *
 * Preserva integralmente o campo legado linha_centro_relacionado para compatibilidade.
 * Idempotente com verificação via col.fields.getByName(f).
 */
migrate(
  (app) => {
    const collectionsToUpdate = ['checklist_fechamento_modelos', 'checklist_fechamento_itens']

    const newTextFields = [
      'werks',
      'line_id',
      'line_code',
      'line_name',
      'center_id',
      'center_code',
      'center_name',
    ]

    for (const colName of collectionsToUpdate) {
      if (!app.hasTable(colName)) continue

      const col = app.findCollectionByNameOrId(colName)
      let modified = false

      for (const fieldName of newTextFields) {
        if (!col.fields.getByName(fieldName)) {
          col.fields.add(
            new TextField({
              name: fieldName,
              required: false,
            }),
          )
          modified = true
        }
      }

      if (modified) {
        app.save(col)
      }
    }
  },
  (app) => {
    const collectionsToUpdate = ['checklist_fechamento_modelos', 'checklist_fechamento_itens']

    const fieldsToRemove = [
      'werks',
      'line_id',
      'line_code',
      'line_name',
      'center_id',
      'center_code',
      'center_name',
    ]

    for (const colName of collectionsToUpdate) {
      if (!app.hasTable(colName)) continue
      const col = app.findCollectionByNameOrId(colName)
      let modified = false
      for (const f of fieldsToRemove) {
        if (col.fields.getByName(f)) {
          col.fields.removeByName(f)
          modified = true
        }
      }
      if (modified) {
        app.save(col)
      }
    }
  },
)
