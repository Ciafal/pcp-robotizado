migrate(
  (app) => {
    // Atualizar regras de pcp_production_reference_documents para públicas caso o usuário não esteja logado
    if (app.hasTable('pcp_production_reference_documents')) {
      const col = app.findCollectionByNameOrId('pcp_production_reference_documents')
      col.listRule = ''
      col.viewRule = ''
      col.createRule = ''
      col.updateRule = ''
      col.deleteRule = ''
      app.save(col)
    }

    if (app.hasTable('pcp_production_reference_governance_logs')) {
      const col = app.findCollectionByNameOrId('pcp_production_reference_governance_logs')
      col.listRule = ''
      col.viewRule = ''
      col.createRule = ''
      col.updateRule = ''
      col.deleteRule = ''
      app.save(col)
    }
  },
  (app) => {},
)
