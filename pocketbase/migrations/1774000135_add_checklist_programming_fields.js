/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000135: Idempotente para adicionar campos de Programação do Check-list
 * nas collections checklist_fechamento_modelos e checklist_fechamento_itens.
 */
migrate(
  (app) => {
    // 1. Atualizar checklist_fechamento_modelos
    if (app.hasTable('checklist_fechamento_modelos')) {
      const modelosCol = app.findCollectionByNameOrId('checklist_fechamento_modelos')

      const camposModelos = [
        { name: 'tipo_programacao', type: 'text' }, // 'dia_util' | 'dia_mes' | 'data_especifica'
        { name: 'dia_util', type: 'number' }, // 1..31 (ex: 2 para 2º dia útil)
        { name: 'dia_mes', type: 'number' }, // 1..31
        { name: 'data_especifica', type: 'text' }, // YYYY-MM-DD
        { name: 'regra_execucao_texto', type: 'text' }, // Ex: "Todo 2º dia útil do mês", "Todo dia 5 do mês", "10/11/2026"
        { name: 'proxima_execucao', type: 'text' }, // YYYY-MM-DD
        { name: 'proxima_execucao_formatada', type: 'text' }, // DD/MM/AAAA
        { name: 'competencia_vigente', type: 'text' }, // MM/AAAA da ocorrência atual calculada
      ]

      let alterouModelos = false
      camposModelos.forEach((campo) => {
        try {
          if (!modelosCol.fields.getByName(campo.name)) {
            modelosCol.fields.add(new TextField({ name: campo.name, type: campo.type }))
            alterouModelos = true
          }
        } catch (_) {
          // Field might already exist
        }
      })

      if (alterouModelos) {
        app.save(modelosCol)
      }
    }

    // 2. Atualizar checklist_fechamento_itens
    if (app.hasTable('checklist_fechamento_itens')) {
      const itensCol = app.findCollectionByNameOrId('checklist_fechamento_itens')

      const camposItens = [
        { name: 'tipo_programacao', type: 'text' },
        { name: 'dia_util', type: 'number' },
        { name: 'dia_mes', type: 'number' },
        { name: 'data_especifica', type: 'text' },
        { name: 'regra_execucao_texto', type: 'text' },
        { name: 'proxima_execucao', type: 'text' },
        { name: 'proxima_execucao_formatada', type: 'text' },
      ]

      let alterouItens = false
      camposItens.forEach((campo) => {
        try {
          if (!itensCol.fields.getByName(campo.name)) {
            itensCol.fields.add(new TextField({ name: campo.name, type: campo.type }))
            alterouItens = true
          }
        } catch (_) {
          // Field might already exist
        }
      })

      if (alterouItens) {
        app.save(itensCol)
      }
    }
  },
  (app) => {
    // Reverter campos se necessário
  },
)
