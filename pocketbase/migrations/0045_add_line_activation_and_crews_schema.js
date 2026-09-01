migrate(
  (app) => {
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const shiftsCol = app.findCollectionByNameOrId('production_shifts')

    // 1. Atualizar production_lines com is_active (booleano com default true) se não existir
    if (!linesCol.fields.getByName('is_active')) {
      linesCol.fields.add(
        new BoolField({
          name: 'is_active',
        }),
      )
      app.save(linesCol)

      // Atualizar todas as linhas existentes como is_active = true
      const allLines = app.findRecordsByFilter('production_lines', '1=1')
      for (const line of allLines) {
        line.set('is_active', true)
        app.save(line)
      }
    }

    // 2. Atualizar production_shifts com sequence_order e description se não existirem
    let shiftUpdated = false
    if (!shiftsCol.fields.getByName('sequence_order')) {
      shiftsCol.fields.add(
        new NumberField({
          name: 'sequence_order',
          min: 1,
        }),
      )
      shiftUpdated = true
    }
    if (!shiftsCol.fields.getByName('description')) {
      shiftsCol.fields.add(
        new TextField({
          name: 'description',
        }),
      )
      shiftUpdated = true
    }
    if (shiftUpdated) {
      app.save(shiftsCol)
    }

    // 3. Criar coleção production_crews (Turmas por Linha)
    let crewsCol
    try {
      crewsCol = app.findCollectionByNameOrId('production_crews')
    } catch {
      crewsCol = new Collection({
        name: 'production_crews',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          {
            name: 'line_id',
            type: 'relation',
            required: true,
            collectionId: linesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'code', type: 'text', required: true }, // ex: "TURMA_A", "TURMA_B", "TURMA_C", "TURMA_D"
          { name: 'name', type: 'text', required: true }, // ex: "Turma A", "Turma B"
          { name: 'description', type: 'text' },
          { name: 'active', type: 'bool' },
          { name: 'valid_from', type: 'date' },
          { name: 'valid_until', type: 'date' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_pcrews_line ON production_crews (line_id, active)'],
      })
      app.save(crewsCol)
    }

    // 4. Criar coleção production_shift_crews (Relação Turno × Turma por Linha)
    let shiftCrewsCol
    try {
      shiftCrewsCol = app.findCollectionByNameOrId('production_shift_crews')
    } catch {
      shiftCrewsCol = new Collection({
        name: 'production_shift_crews',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          {
            name: 'line_id',
            type: 'relation',
            required: true,
            collectionId: linesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'shift_id',
            type: 'relation',
            required: true,
            collectionId: shiftsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'crew_id',
            type: 'relation',
            required: true,
            collectionId: crewsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'day_of_week', type: 'text' }, // SEG, TER, QUA, QUI, SEX, SAB, DOM ou ALL
          { name: 'active', type: 'bool' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_psc_shift_crew ON production_shift_crews (shift_id, crew_id, active)',
        ],
      })
      app.save(shiftCrewsCol)
    }
  },
  (app) => {
    try {
      const shiftCrewsCol = app.findCollectionByNameOrId('production_shift_crews')
      app.delete(shiftCrewsCol)
    } catch {}
    try {
      const crewsCol = app.findCollectionByNameOrId('production_crews')
      app.delete(crewsCol)
    } catch {}
  },
)
