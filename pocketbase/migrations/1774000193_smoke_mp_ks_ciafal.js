// Migration 1774000193 — smoke test: cria collection mínima para diagnosticar
// por que as migrations mp_ks_ciafal marcam "applied" sem efeito.
migrate((app) => {
  try {
    app.findCollectionByNameOrId('mp_ks_ciafal_smoke')
    return
  } catch (_) {}
  const c = new Collection({
    name: 'mp_ks_ciafal_smoke',
    type: 'base',
    fields: [new TextField({ name: 'teste', required: false })],
  })
  app.save(c)
})
