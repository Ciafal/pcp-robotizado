migrate(
  (app) => {
    // 1. Resolver ID da coleção production_lines
    let linesColId = ''
    try {
      linesColId = app.findCollectionByNameOrId('production_lines').id
    } catch (_) {}

    // 2. Criar coleção pcp_programming_parameters
    let existingCol = null
    try {
      existingCol = app.findCollectionByNameOrId('pcp_programming_parameters')
    } catch (_) {}

    if (!existingCol) {
      const collection = new Collection({
        name: 'pcp_programming_parameters',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          {
            name: 'center_id',
            type: 'relation',
            collectionId: linesColId || undefined,
            maxSelect: 1,
            required: false,
          },
          { name: 'center_code', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          {
            name: 'parameter_type',
            type: 'select',
            required: true,
            values: ['NUMERICO', 'TEXTO', 'BOOLEANO', 'PERCENTUAL', 'TEMPO', 'RESTRICAO'],
            maxSelect: 1,
          },
          { name: 'value', type: 'text', required: false },
          { name: 'unit_of_measure', type: 'text', required: false },
          { name: 'valid_from', type: 'date', required: true },
          { name: 'valid_until', type: 'date', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Ativo', 'Inativo', 'ATIVO', 'INATIVO'],
            maxSelect: 1,
          },
          { name: 'notes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ppp_center_code ON pcp_programming_parameters (center_code)',
          'CREATE INDEX idx_ppp_status ON pcp_programming_parameters (status)',
          'CREATE INDEX idx_ppp_valid_from ON pcp_programming_parameters (valid_from)',
          'CREATE INDEX idx_ppp_valid_until ON pcp_programming_parameters (valid_until)',
        ],
      })

      app.save(collection)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('pcp_programming_parameters')
      app.delete(col)
    } catch (_) {}
  },
)
