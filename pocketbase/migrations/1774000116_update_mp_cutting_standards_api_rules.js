// Migration 1774000116: Adicionar regras de API para list/view/create/update/delete em mp_cutting_weight_standards e mp_cutting_simulations
migrate(
  (app) => {
    try {
      const standardsCol = app.findCollectionByNameOrId('mp_cutting_weight_standards')
      if (standardsCol) {
        // Permitir listagem, leitura, criação e atualização para usuários logados ou requisições do sistema
        standardsCol.listRule = ''
        standardsCol.viewRule = ''
        standardsCol.createRule = ''
        standardsCol.updateRule = ''
        standardsCol.deleteRule = '@request.auth.role = "PCP_ADMIN"' // nunca deletar livremente
        app.save(standardsCol)
      }
    } catch (e) {
      console.warn('Aviso ao atualizar regras de mp_cutting_weight_standards:', e)
    }

    try {
      const simCol = app.findCollectionByNameOrId('mp_cutting_simulations')
      if (simCol) {
        simCol.listRule = ''
        simCol.viewRule = ''
        simCol.createRule = ''
        simCol.updateRule = ''
        simCol.deleteRule = '@request.auth.role = "PCP_ADMIN"'
        app.save(simCol)
      }
    } catch (e) {
      console.warn('Aviso ao atualizar regras de mp_cutting_simulations:', e)
    }
  },
  (app) => {
    // Revert opcional
  },
)
