migrate(
  (app) => {
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const shiftsCol = app.findCollectionByNameOrId('production_shifts')
    const crewsCol = app.findCollectionByNameOrId('production_crews')
    const shiftCrewsCol = app.findCollectionByNameOrId('production_shift_crews')

    // 1. Para cada linha existente, popular sequence_order nos turnos se estiver nulo
    const lines = app.findRecordsByFilter('production_lines', '1=1')
    for (const line of lines) {
      const lineShifts = app.findRecordsByFilter(
        'production_shifts',
        `line_id = '${line.id}'`,
        'start_time',
      )
      let ord = 1
      for (const shift of lineShifts) {
        if (!shift.get('sequence_order')) {
          shift.set('sequence_order', ord)
          app.save(shift)
        }
        ord++
      }

      // 2. Criar turmas padrão (Turma A, B, C, D) para a linha se ainda não existirem
      const existingCrews = app.findRecordsByFilter('production_crews', `line_id = '${line.id}'`)
      if (existingCrews.length === 0) {
        const defaultCrewsData = [
          { code: 'TURMA_A', name: 'Turma A', description: 'Turma Operacional Alfa' },
          { code: 'TURMA_B', name: 'Turma B', description: 'Turma Operacional Bravo' },
          { code: 'TURMA_C', name: 'Turma C', description: 'Turma Operacional Charlie' },
          { code: 'TURMA_D', name: 'Turma D', description: 'Turma Operacional Delta' },
        ]

        const createdCrews = []
        for (const cData of defaultCrewsData) {
          const crewRec = new Record(crewsCol)
          crewRec.set('line_id', line.id)
          crewRec.set('code', cData.code)
          crewRec.set('name', cData.name)
          crewRec.set('description', cData.description)
          crewRec.set('active', true)
          app.save(crewRec)
          createdCrews.push(crewRec)
        }

        // 3. Vincular turnos existentes com as turmas criadas
        for (let i = 0; i < lineShifts.length; i++) {
          const shift = lineShifts[i]
          const assignedCrew = createdCrews[i % createdCrews.length]
          if (assignedCrew) {
            const scRec = new Record(shiftCrewsCol)
            scRec.set('line_id', line.id)
            scRec.set('shift_id', shift.id)
            scRec.set('crew_id', assignedCrew.id)
            scRec.set('day_of_week', 'ALL')
            scRec.set('active', true)
            app.save(scRec)
          }
        }
      }
    }
  },
  (app) => {},
)
