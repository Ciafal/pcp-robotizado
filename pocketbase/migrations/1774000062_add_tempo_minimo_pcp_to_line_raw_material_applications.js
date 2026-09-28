/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000062: Acrescenta campos de Tempo Mínimo PCP na collection
 * line_raw_material_applications:
 * - tempo_minimo_pcp_unidade: 'Minutos' | 'Horas' | 'Dias' | 'Semanas' (TextField)
 * - tempo_minimo_pcp_valor: número > 0 (NumberField)
 * - tempo_minimo_pcp_minutos: valor convertido para minutos (NumberField, para queries/índices)
 * - updated_by_user_id / updated_by_user_name: TextField
 *
 * Idempotente com checagens app.hasTable e getByName.
 */
migrate(
  (app) => {
    if (app.hasTable('line_raw_material_applications')) {
      const col = app.findCollectionByNameOrId('line_raw_material_applications')
      let changed = false

      if (!col.fields.getByName('tempo_minimo_pcp_unidade')) {
        col.fields.add(
          new TextField({
            name: 'tempo_minimo_pcp_unidade',
            required: false,
          }),
        )
        changed = true
      }

      if (!col.fields.getByName('tempo_minimo_pcp_valor')) {
        col.fields.add(
          new NumberField({
            name: 'tempo_minimo_pcp_valor',
            required: false,
          }),
        )
        changed = true
      }

      if (!col.fields.getByName('tempo_minimo_pcp_minutos')) {
        col.fields.add(
          new NumberField({
            name: 'tempo_minimo_pcp_minutos',
            required: false,
          }),
        )
        changed = true
      }

      if (!col.fields.getByName('updated_by_user_id')) {
        col.fields.add(
          new TextField({
            name: 'updated_by_user_id',
            required: false,
          }),
        )
        changed = true
      }

      if (!col.fields.getByName('updated_by_user_name')) {
        col.fields.add(
          new TextField({
            name: 'updated_by_user_name',
            required: false,
          }),
        )
        changed = true
      }

      if (changed) {
        app.save(col)
      }

      try {
        app
          .db()
          .newQuery(
            'CREATE INDEX IF NOT EXISTS idx_line_mp_app_tempo ON line_raw_material_applications (center_code, product_code, raw_material_code);',
          )
          .execute()
      } catch (_) {
        // ignora se índice já existir
      }
    }
  },
  (app) => {
    // Reversão no-op segura
  },
)
