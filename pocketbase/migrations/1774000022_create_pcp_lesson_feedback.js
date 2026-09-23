migrate(
  (app) => {
    let existingCol = null
    try {
      existingCol = app.findCollectionByNameOrId('pcp_lesson_feedback')
    } catch (_) {}

    if (!existingCol) {
      const collection = new Collection({
        name: 'pcp_lesson_feedback',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'lesson_key', type: 'text', required: true },
          { name: 'center_code', type: 'text', required: true },
          {
            name: 'feedback_type',
            type: 'select',
            required: true,
            values: ['UTIL', 'NAO_APLICAVEL', 'VALIDAR_MELHOR_PRATICA', 'DESCARTAR'],
            maxSelect: 1,
          },
          { name: 'user_comment', type: 'text', required: false },
          { name: 'user_name', type: 'text', required: false },
          { name: 'user_id', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_plf_center_code ON pcp_lesson_feedback (center_code)',
          'CREATE INDEX idx_plf_lesson_key ON pcp_lesson_feedback (lesson_key)',
          'CREATE INDEX idx_plf_feedback_type ON pcp_lesson_feedback (feedback_type)',
        ],
      })

      app.save(collection)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('pcp_lesson_feedback')
      app.delete(col)
    } catch (_) {}
  },
)
