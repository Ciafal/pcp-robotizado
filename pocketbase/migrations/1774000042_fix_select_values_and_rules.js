migrate(
  (app) => {
    // 1. Corrigir selectValues e regras de pcp_production_reference_documents
    if (app.hasTable('pcp_production_reference_documents')) {
      const col = app.findCollectionByNameOrId('pcp_production_reference_documents')
      col.listRule = ''
      col.viewRule = ''
      col.createRule = ''
      col.updateRule = ''
      col.deleteRule = ''

      // Garantir que status aceite todos os valores necessários
      const statusField = col.fields.getByName('status')
      if (statusField) {
        statusField.values = ['VIGENTE', 'EM_REVISAO', 'OBSOLETO', 'CANCELADO', 'SUBSTITUIDO']
        statusField.maxSelect = 1
      }

      const priorityField = col.fields.getByName('priority')
      if (priorityField) {
        priorityField.values = ['ALTA', 'MEDIA', 'BAIXA']
        priorityField.maxSelect = 1
      }

      app.save(col)
    }

    // 2. Corrigir selectValues e regras de pcp_production_reference_governance_logs
    if (app.hasTable('pcp_production_reference_governance_logs')) {
      const logsCol = app.findCollectionByNameOrId('pcp_production_reference_governance_logs')
      logsCol.listRule = ''
      logsCol.viewRule = ''
      logsCol.createRule = ''
      logsCol.updateRule = ''
      logsCol.deleteRule = ''

      const actionField = logsCol.fields.getByName('action')
      if (actionField) {
        actionField.values = [
          'ASSOCIACAO_CRIADA',
          'ASSOCIACAO_ATUALIZADA',
          'ASSOCIACAO_INATIVADA',
          'ASSOCIACAO_REATIVADA',
          'ASSOCIACAO_REMOVIDA',
          'NOVA_REVISAO_DETECTADA',
          'NOVA_REVISAO_APLICADA',
        ]
        actionField.maxSelect = 1
      }

      app.save(logsCol)
    }
  },
  (app) => {},
)
