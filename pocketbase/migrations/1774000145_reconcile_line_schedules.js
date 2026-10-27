/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      var configsCol = app.findCollectionByNameOrId('pcp_line_summary_configs')
      if (!configsCol) {
        console.log('[1774000145] pcp_line_summary_configs not found, skipping')
        return
      }

      // Garantir campos necessários de periodicidade e agendamento
      var hasPeriodicidade = false
      var hasParams = false
      var hasGeracaoAuto = false
      var hasExigirAprov = false
      var hasEnvioAuto = false
      var hasProximaExec = false

      var fields = configsCol.fields
      for (var i = 0; i < fields.length; i++) {
        var f = fields[i]
        if (f.name === 'periodicidade') hasPeriodicidade = true
        if (f.name === 'parametros_personalizados') hasParams = true
        if (f.name === 'geracao_automatica') hasGeracaoAuto = true
        if (f.name === 'exigir_aprovacao') hasExigirAprov = true
        if (f.name === 'envio_automatico_apos_aprovacao') hasEnvioAuto = true
        if (f.name === 'proxima_execucao') hasProximaExec = true
      }

      var changed = false

      if (!hasPeriodicidade) {
        configsCol.fields.add(
          new SelectField({
            name: 'periodicidade',
            values: [
              'diaria',
              'semanal',
              'quinzenal',
              'mensal',
              'trimestral',
              'sob_demanda',
              'personalizada',
            ],
            maxSelect: 1,
          }),
        )
        changed = true
      }

      if (!hasParams) {
        configsCol.fields.add(
          new JSONField({
            name: 'parametros_personalizados',
          }),
        )
        changed = true
      }

      if (!hasGeracaoAuto) {
        configsCol.fields.add(
          new BoolField({
            name: 'geracao_automatica',
          }),
        )
        changed = true
      }

      if (!hasExigirAprov) {
        configsCol.fields.add(
          new BoolField({
            name: 'exigir_aprovacao',
          }),
        )
        changed = true
      }

      if (!hasEnvioAuto) {
        configsCol.fields.add(
          new BoolField({
            name: 'envio_automatico_apos_aprovacao',
          }),
        )
        changed = true
      }

      if (!hasProximaExec) {
        configsCol.fields.add(
          new DateField({
            name: 'proxima_execucao',
          }),
        )
        changed = true
      }

      if (changed) {
        app.save(configsCol)
        console.log('[1774000145] pcp_line_summary_configs fields reconciled successfully')
      }

      // Migração de preservação de dados: se existirem registros sem proxima_execucao calculada
      try {
        var existing = app.findRecordsByFilter(
          'pcp_line_summary_configs',
          'status = "ATIVO"',
          '-created',
          100,
          0,
        )
        for (var j = 0; j < existing.length; j++) {
          var rec = existing[j]
          if (!rec.getString('proxima_execucao') && rec.getBool('geracao_automatica')) {
            var p = rec.getString('periodicidade') || 'mensal'
            var nextDate = new Date()
            if (p === 'diaria') nextDate.setDate(nextDate.getDate() + 1)
            else if (p === 'semanal') nextDate.setDate(nextDate.getDate() + 7)
            else if (p === 'quinzenal') nextDate.setDate(nextDate.getDate() + 15)
            else if (p === 'mensal') nextDate.setMonth(nextDate.getMonth() + 1)
            else if (p === 'trimestral') nextDate.setMonth(nextDate.getMonth() + 3)
            nextDate.setHours(8, 0, 0, 0)
            rec.set('proxima_execucao', nextDate.toISOString())
            app.save(rec)
          }
        }
      } catch (migErr) {
        console.warn('[1774000145] Non-fatal migration check:', migErr)
      }
    } catch (err) {
      console.warn('[1774000145] Non-fatal error reconciling schedules:', err)
    }
  },
  (app) => {
    // down migration: no-op segura
  },
)
