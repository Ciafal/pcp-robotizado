/// <reference path="../pb_data/types.d.ts" />
// Migration 1774000194 — Tipos de Enfornamento (Ficha Mestra Expandida)
// Adiciona campo `status` (Ativo | Inativo) à collection line_furnace_charging_types.
// IDEMPOTENTE e NÃO DESTRUTIVA: cria a collection se não existir (padrão if (!app.hasTable)),
// adiciona o campo só se faltar, e preenche "Ativo" onde não existir. Registros existentes preservados.
migrate(
  (app) => {
    const FIELD = 'status'
    const COLLECTION = 'line_furnace_charging_types'

    const has = (name) => {
      try {
        app.findCollectionByNameOrId(name)
        return true
      } catch (_) {
        return false
      }
    }

    // ------------------------------------------------------------------
    // 1) Collection base (espelho das migrations 179/184) se ainda não existir
    // ------------------------------------------------------------------
    if (!has(COLLECTION)) {
      const c = new Collection({
        type: 'base',
        name: COLLECTION,
        listRule: 'id != ""',
        viewRule: 'id != ""',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'line_master_id', type: 'text' },
          { name: 'line_id', type: 'text' },
          { name: 'center_code', type: 'text' },
          { name: 'charging_type', type: 'text' },
          { name: 'raw_material_code', type: 'text' },
          { name: 'raw_material_description', type: 'text' },
          { name: 'mp_principal_code', type: 'text' },
          { name: 'mp_principal_description', type: 'text' },
          { name: 'mp_secundaria_code', type: 'text' },
          { name: 'mp_secundaria_description', type: 'text' },
          { name: 'proporcao', type: 'text' },
          { name: 'min_weight', type: 'number' },
          { name: 'max_weight', type: 'number' },
          { name: 'min_thickness', type: 'number' },
          { name: 'max_thickness', type: 'number' },
          { name: 'min_length', type: 'number' },
          { name: 'max_length', type: 'number' },
          { name: 'min_width', type: 'number' },
          { name: 'max_width', type: 'number' },
          { name: FIELD, type: 'text' },
        ],
      })
      c.addIndex('idx_charging_types_unique', true, 'center_code', 'charging_type', '')
      app.save(c)
    }

    const col = app.findCollectionByNameOrId(COLLECTION)

    // ------------------------------------------------------------------
    // 2) Campos novos (idempotente): status + MPs/proporção caso faltem
    // ------------------------------------------------------------------
    const ensureField = (name, ctor) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(
          ctor === 'text' ? new TextField({ name: name }) : new NumberField({ name: name }),
        )
        return true
      }
      return false
    }
    let modified = false
    modified = ensureField('mp_principal_code', 'text') || modified
    modified = ensureField('mp_principal_description', 'text') || modified
    modified = ensureField('mp_secundaria_code', 'text') || modified
    modified = ensureField('mp_secundaria_description', 'text') || modified
    modified = ensureField('proporcao', 'text') || modified
    modified = ensureField(FIELD, 'text') || modified
    if (modified) {
      app.save(col)
    }

    // ------------------------------------------------------------------
    // 3) Backfill: Status "Ativo" onde não existir (registros antigos preservados)
    //    Filtra em memória (getByName pode negar o campo "status" na query do PocketBase
    //    antes do save da collection; aqui a collection já foi salva com o campo novo)
    // ------------------------------------------------------------------
    const all = app.findRecordsByFilter(COLLECTION, 'id != ""', '', 0, 0)
    let backfilled = 0
    for (const r of all) {
      const cur = r.getString(FIELD, '')
      if (cur !== 'Ativo' && cur !== 'Inativo') {
        r.set(FIELD, 'Ativo')
        app.save(r)
        backfilled++
      }
    }
    console.log('[1774000194] status ensured on ' + COLLECTION + ' — backfill: ' + backfilled)
  },
  (app) => {
    // rollback: remove apenas o campo status (os dados de MPs/proporção permanecem)
    try {
      const col = app.findCollectionByNameOrId('line_furnace_charging_types')
      col.fields.removeByName('status')
      app.save(col)
    } catch (_) {}
  },
)
