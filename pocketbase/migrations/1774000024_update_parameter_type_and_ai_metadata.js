/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pcp_programming_parameters')
    if (col) {
      // 1. Atualizar ou substituir parameter_type para permitir os 15 tipos oficiais e legados
      const typeField = col.fields.getByName('parameter_type')
      const allowedValues = [
        'Matéria-prima dimensional',
        'Matéria-prima aço',
        'Matéria-prima fornecedor',
        'Redução',
        'Produtividade',
        'Restrição técnica',
        'Restrição equipamento',
        'Qualidade',
        'Operador',
        'Mecânica',
        'Elétrica',
        'Automação',
        'PCP',
        'Comprimento',
        'Outros',
        // Legados para compatibilidade sem quebras
        'NUMERICO',
        'TEXTO',
        'BOOLEANO',
        'PERCENTUAL',
        'TEMPO',
        'RESTRICAO',
        'Restrição',
        'Regra',
        'Alerta',
        'Condição',
        'Limite',
        'Prioridade',
        'Numérico',
        'Texto',
        'Booleano',
        'Percentual',
        'Tempo',
      ]

      if (typeField) {
        typeField.values = allowedValues
      }

      // 2. Campo ai_analysis_metadata (json) para persistir o metadado da análise IA (rastreabilidade)
      if (!col.fields.getByName('ai_analysis_metadata')) {
        col.fields.addAt(
          col.fields.length,
          new JSONField({
            name: 'ai_analysis_metadata',
            required: false,
          }),
        )
      }

      // 3. Campo user_decision (text) para registrar se o usuário aplicou ou manteve a classificação
      if (!col.fields.getByName('user_decision')) {
        col.fields.addAt(
          col.fields.length,
          new TextField({
            name: 'user_decision',
            required: false,
          }),
        )
      }

      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pcp_programming_parameters')
    if (col) {
      const fAi = col.fields.getByName('ai_analysis_metadata')
      if (fAi) col.fields.removeByName('ai_analysis_metadata')
      const fDec = col.fields.getByName('user_decision')
      if (fDec) col.fields.removeByName('user_decision')
      app.save(col)
    }
  },
)
