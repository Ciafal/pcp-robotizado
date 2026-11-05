/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000176 (IDEMPOTENTE):
 * Adiciona campos estruturados em line_gauge_min_restrictions:
 * - reason: Motivo da restrição (obrigatório nas novas regras)
 * - reason_category: Categoria do motivo
 * - Campos estruturados para futuro motor de programação/IA
 */
migrate(
  (app) => {
    if (app.hasTable('line_gauge_min_restrictions')) {
      const col = app.findCollectionByNameOrId('line_gauge_min_restrictions')

      const addTextFieldIfMissing = (name) => {
        if (!col.fields.getByName(name)) {
          col.fields.add(new TextField({ name }))
        }
      }

      const addNumberFieldIfMissing = (name) => {
        if (!col.fields.getByName(name)) {
          col.fields.add(new NumberField({ name }))
        }
      }

      const addDateFieldIfMissing = (name) => {
        if (!col.fields.getByName(name)) {
          col.fields.add(new DateField({ name }))
        }
      }

      const addBoolFieldIfMissing = (name) => {
        if (!col.fields.getByName(name)) {
          col.fields.add(new BoolField({ name }))
        }
      }

      addTextFieldIfMissing('reason')
      addTextFieldIfMissing('reason_category')
      addNumberFieldIfMissing('min_value_numeric')
      addNumberFieldIfMissing('max_value_numeric')
      addNumberFieldIfMissing('target_value')
      addTextFieldIfMissing('unit')
      addTextFieldIfMissing('product_code')
      addTextFieldIfMissing('family_code')
      addTextFieldIfMissing('gauge_dimension')
      addTextFieldIfMissing('steel_grade')
      addTextFieldIfMissing('raw_material_code')
      addTextFieldIfMissing('origin_center_code')
      addTextFieldIfMissing('target_center_code')
      addTextFieldIfMissing('product_from')
      addTextFieldIfMissing('product_to')
      addTextFieldIfMissing('gauge_from')
      addTextFieldIfMissing('gauge_to')
      addDateFieldIfMissing('valid_from')
      addDateFieldIfMissing('valid_until')
      addNumberFieldIfMissing('rule_priority')
      addTextFieldIfMissing('created_by_user_id')
      addTextFieldIfMissing('updated_by_user_id')
      addBoolFieldIfMissing('is_active')

      app.save(col)
      console.log(
        'Migration 1774000176: campos estruturados adicionados em line_gauge_min_restrictions com sucesso.',
      )
    }
  },
  (app) => {
    // Reversão segura no-op para preservar dados em downgrade
  },
)
