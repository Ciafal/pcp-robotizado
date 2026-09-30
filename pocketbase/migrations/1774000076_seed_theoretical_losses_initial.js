/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Seed de perda teórica padrão para linha L1 caso ainda não existam registros
    try {
      const lineCol = app.findCollectionByNameOrId('production_lines')
      const lossesCol = app.findCollectionByNameOrId('line_theoretical_losses')

      if (lossesCol && lineCol) {
        const count = app.countRecords('line_theoretical_losses')
        if (count === 0) {
          const l1Record = app.findFirstRecordByFilter('production_lines', "code = 'L1'")
          if (l1Record) {
            const seedRecord = new Record(lossesCol)
            seedRecord.set('line_id', l1Record.id)
            seedRecord.set('center_code', 'L1')
            seedRecord.set('raw_material_type', 'TARUGO_130X130')
            seedRecord.set('raw_material_code', 'TARUGO-130-1020')
            seedRecord.set('raw_material_description', 'Tarugo 130x130 SAE 1020')
            seedRecord.set('bitola', 'Não há')
            seedRecord.set('application', 'Laminação Geral')
            seedRecord.set('rm_pct', 1.5)
            seedRecord.set('carepa_pct', 0.8)
            seedRecord.set('apara_pct', 0.4)
            seedRecord.set('deleted', false)
            seedRecord.set('notes', 'Perda teórica nominal inicial de referência - Linha L1')
            app.save(seedRecord)
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao inserir seed de perda teórica:', e)
    }
  },
  (app) => {},
)
