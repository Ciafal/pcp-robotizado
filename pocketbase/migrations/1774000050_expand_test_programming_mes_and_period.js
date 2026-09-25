/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Expandir coleção test_programming com novos campos de período previsto e execução MES 4.0
    try {
      const col = app.findCollectionByNameOrId('test_programming')

      // Período Previsto do Teste
      if (!col.fields.getByName('expected_start_date')) {
        col.fields.add(new TextField({ name: 'expected_start_date', required: false }))
      }
      if (!col.fields.getByName('expected_start_time')) {
        col.fields.add(new TextField({ name: 'expected_start_time', required: false }))
      }
      if (!col.fields.getByName('expected_end_date')) {
        col.fields.add(new TextField({ name: 'expected_end_date', required: false }))
      }
      if (!col.fields.getByName('expected_end_time')) {
        col.fields.add(new TextField({ name: 'expected_end_time', required: false }))
      }
      if (!col.fields.getByName('expected_duration_minutes')) {
        col.fields.add(new NumberField({ name: 'expected_duration_minutes', required: false }))
      }
      if (!col.fields.getByName('expected_duration_formatted')) {
        col.fields.add(new TextField({ name: 'expected_duration_formatted', required: false }))
      }

      // Execução Real - MES 4.0
      if (!col.fields.getByName('mes_integration_status')) {
        col.fields.add(
          new SelectField({
            name: 'mes_integration_status',
            required: false,
            values: [
              'Aguardando execução',
              'Aguardando dados MES',
              'Sincronizado',
              'Sincronização parcial',
              'Erro de integração',
            ],
            maxSelect: 1,
          }),
        )
      }
      if (!col.fields.getByName('mes_execution_data')) {
        col.fields.add(new JSONField({ name: 'mes_execution_data', required: false }))
      }
      if (!col.fields.getByName('mes_last_sync')) {
        col.fields.add(new TextField({ name: 'mes_last_sync', required: false }))
      }
      if (!col.fields.getByName('mes_sync_message')) {
        col.fields.add(new TextField({ name: 'mes_sync_message', required: false }))
      }

      // Indicadores de Desvio calculados
      if (!col.fields.getByName('deviation_metrics')) {
        col.fields.add(new JSONField({ name: 'deviation_metrics', required: false }))
      }

      // Análise IA consolidada do teste
      if (!col.fields.getByName('ai_analysis_data')) {
        col.fields.add(new JSONField({ name: 'ai_analysis_data', required: false }))
      }

      app.save(col)

      // Índices adicionais
      try {
        col.addIndex('idx_tp_mes_status', false, 'mes_integration_status', '')
        col.addIndex('idx_tp_expected_start', false, 'expected_start_date', '')
        app.save(col)
      } catch (_) {}
    } catch (err) {
      console.warn('Erro ao atualizar campos de test_programming:', err)
    }

    // 2. Expandir coleção test_programming_log com campos granulares de auditoria (origem da alteração, campo alterado, etc)
    try {
      const logCol = app.findCollectionByNameOrId('test_programming_log')
      if (!logCol.fields.getByName('field_changed')) {
        logCol.fields.add(new TextField({ name: 'field_changed', required: false }))
      }
      if (!logCol.fields.getByName('origin')) {
        logCol.fields.add(
          new SelectField({
            name: 'origin',
            required: false,
            values: ['usuário', 'PCP Robotizado', 'MES 4.0', 'integração automática'],
            maxSelect: 1,
          }),
        )
      }
      if (!logCol.fields.getByName('integration_name')) {
        logCol.fields.add(new TextField({ name: 'integration_name', required: false }))
      }
      if (!logCol.fields.getByName('operation_result')) {
        logCol.fields.add(new TextField({ name: 'operation_result', required: false }))
      }
      app.save(logCol)
    } catch (err) {
      console.warn('Erro ao atualizar campos de test_programming_log:', err)
    }

    // 3. Regularização de registros legados para garantir campos novos consistentes
    try {
      const records = app.findRecordsByFilter('test_programming', '1=1', '', 500, 0)
      for (const rec of records) {
        let changed = false
        // Se expected_start_date estiver vazio mas expected_date existir, migra
        if (!rec.getString('expected_start_date') && rec.getString('expected_date')) {
          const expDate = rec.getString('expected_date')
          rec.set('expected_start_date', expDate)
          rec.set('expected_start_time', '08:00')
          rec.set('expected_end_date', expDate)
          rec.set('expected_end_time', '10:30')
          rec.set('expected_duration_minutes', 150)
          rec.set('expected_duration_formatted', '2 h 30 min')
          changed = true
        }

        if (!rec.getString('mes_integration_status')) {
          const status = rec.getString('status')
          if (status === 'Executado' || status === 'Concluído') {
            rec.set('mes_integration_status', 'Aguardando dados MES')
            rec.set('mes_sync_message', 'Dados realizados ainda não disponíveis no MES 4.0.')
          } else {
            rec.set('mes_integration_status', 'Aguardando execução')
          }
          changed = true
        }

        if (changed) {
          app.save(rec)
        }
      }
    } catch (err) {
      console.warn('Erro ao regularizar legados de test_programming:', err)
    }
  },
  (app) => {
    // Reversão limpa idempotente
    try {
      const col = app.findCollectionByNameOrId('test_programming')
      const fields = [
        'ai_analysis_data',
        'deviation_metrics',
        'mes_sync_message',
        'mes_last_sync',
        'mes_execution_data',
        'mes_integration_status',
        'expected_duration_formatted',
        'expected_duration_minutes',
        'expected_end_time',
        'expected_end_date',
        'expected_start_time',
        'expected_start_date',
      ]
      for (const f of fields) {
        try {
          col.fields.removeByName(f)
        } catch (_) {}
      }
      app.save(col)
    } catch (_) {}
  },
)
