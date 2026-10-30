migrate(
  (app) => {
    // 1. Assegurar campos de controle de status em mp_multiple_cutting_plans
    if (app.hasTable('mp_multiple_cutting_plans')) {
      const col = app.findCollectionByNameOrId('mp_multiple_cutting_plans')

      // Verificar campos existentes para idempotência
      const existingNames = new Set(col.fields.map((f) => f.name))

      if (!existingNames.has('status_justification')) {
        col.fields.add(
          new TextField({
            name: 'status_justification',
          }),
        )
      }

      if (!existingNames.has('status_updated_at')) {
        col.fields.add(
          new TextField({
            name: 'status_updated_at',
          }),
        )
      }

      if (!existingNames.has('status_updated_by')) {
        col.fields.add(
          new TextField({
            name: 'status_updated_by',
          }),
        )
      }

      if (!existingNames.has('status_history_json')) {
        col.fields.add(
          new JSONField({
            name: 'status_history_json',
          }),
        )
      }

      app.save(col)

      // 2. Backfill idempotente: normalizar planos existentes para os status oficiais
      // Status oficiais definidos: Rascunho, Em Revisão, Aprovado, Liberado, Executado, Cancelado.
      // Planos legados (ou com status CONFIRMADO_PCP, RASCUNHO, etc.) recebem Rascunho como padrão
      try {
        const records = app.findRecordsByFilter('mp_multiple_cutting_plans', '', '', 1000, 0)
        const validOfficialStatuses = new Set([
          'Rascunho',
          'Em Revisão',
          'Aprovado',
          'Liberado',
          'Executado',
          'Cancelado',
        ])

        const statusNormalizeMap = {
          RASCUNHO: 'Rascunho',
          rascunho: 'Rascunho',
          EM_REVISAO: 'Em Revisão',
          'Em Revisao': 'Em Revisão',
          APROVADO: 'Aprovado',
          aprovado: 'Aprovado',
          LIBERADO: 'Liberado',
          liberado: 'Liberado',
          EXECUTADO: 'Executado',
          executado: 'Executado',
          CANCELADO: 'Cancelado',
          cancelado: 'Cancelado',
          CONFIRMADO_PCP: 'Rascunho',
        }

        for (const record of records) {
          const currentStatus = record.getString('status') || ''
          let targetStatus = 'Rascunho'

          if (validOfficialStatuses.has(currentStatus)) {
            targetStatus = currentStatus
          } else if (statusNormalizeMap[currentStatus]) {
            targetStatus = statusNormalizeMap[currentStatus]
          }

          let changed = false
          if (record.getString('status') !== targetStatus) {
            record.set('status', targetStatus)
            changed = true
          }

          if (!record.getString('status_updated_at')) {
            record.set('status_updated_at', record.getString('created') || new Date().toISOString())
            changed = true
          }

          if (!record.getString('status_updated_by')) {
            record.set(
              'status_updated_by',
              record.getString('responsible_user_name') ||
                record.getString('created_by_user_name') ||
                'Sistema PCP',
            )
            changed = true
          }

          if (changed) {
            app.save(record)
          }
        }
      } catch (backfillErr) {
        console.warn(
          '[migration 1774000158] Aviso no backfill de status mp_multiple_cutting_plans:',
          backfillErr,
        )
      }
    }
  },
  (app) => {
    // Reversão segura e idempotente
    try {
      if (app.hasTable('mp_multiple_cutting_plans')) {
        const col = app.findCollectionByNameOrId('mp_multiple_cutting_plans')
        const toRemove = [
          'status_justification',
          'status_updated_at',
          'status_updated_by',
          'status_history_json',
        ]
        col.fields = col.fields.filter((f) => !toRemove.includes(f.name))
        app.save(col)
      }
    } catch (_) {}
  },
)
