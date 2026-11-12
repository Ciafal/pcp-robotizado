// Migration 1774000185 — Estende pcp_rework_items com os dados da seção
// "2 — Dados do Retrabalho" (Material Final, Origem, Localização, Local
// Retrabalho, Solicitado por, Responsável retrabalho + rastreabilidade).
// Idempotente: só cria campos quando a coleção existe e o campo não existe.
// NUNCA recria/altera as migrations 1774000140/141/142 (padrão do projeto).

migrate(
  (app) => {
    if (!app.hasTable('pcp_rework_items')) return

    const collection = app.findCollectionByNameOrId('pcp_rework_items')

    const targetFields = [
      'final_material_code',
      'final_material_description',
      'rework_origin',
      'rework_location',
      'rework_place',
      'requested_by',
      'requested_by_user_id',
      'responsable_rework',
      'schedule_code',
      'center_code',
      'line_code',
      'created_by',
    ]

    let changed = false
    for (const name of targetFields) {
      const exists = collection.fields.some((f) => f.name === name)
      if (exists) continue
      collection.fields.add(new Field({ type: 'text', name: name, required: false }))
      changed = true
    }

    if (changed) app.save(collection)
  },
  (app) => {
    // Rollback seguro: apenas remove os campos novos se existirem.
    if (!app.hasTable('pcp_rework_items')) return
    const collection = app.findCollectionByNameOrId('pcp_rework_items')
    const names = [
      'final_material_code',
      'final_material_description',
      'rework_origin',
      'rework_location',
      'rework_place',
      'requested_by',
      'requested_by_user_id',
      'responsable_rework',
      'schedule_code',
      'center_code',
      'line_code',
      'created_by',
    ]
    let changed = false
    for (const name of names) {
      const field = collection.fields.find((f) => f.name === name)
      if (field) {
        collection.fields.remove(field)
        changed = true
      }
    }
    if (changed) app.save(collection)
  },
)
