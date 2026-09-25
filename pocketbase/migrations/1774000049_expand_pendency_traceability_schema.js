migrate(
  (app) => {
    // 1. Atualizar campos em pcp_meeting_pendency
    try {
      const col = app.findCollectionByNameOrId('pcp_meeting_pendency')

      // ata_id (texto ou relação - como pcp_meeting_ata tem id string alfanumérico, relation com collectionId)
      let ataColId = ''
      try {
        ataColId = app.findCollectionByNameOrId('pcp_meeting_ata').id
      } catch (_) {}

      if (!col.fields.getByName('ata_id')) {
        if (ataColId) {
          col.fields.add(
            new RelationField({
              name: 'ata_id',
              collectionId: ataColId,
              maxSelect: 1,
              required: false,
            }),
          )
        } else {
          col.fields.add(
            new TextField({
              name: 'ata_id',
              required: false,
            }),
          )
        }
      }

      // ata_code
      if (!col.fields.getByName('ata_code')) {
        col.fields.add(
          new TextField({
            name: 'ata_code',
            required: false,
          }),
        )
      }

      // meeting_code
      if (!col.fields.getByName('meeting_code')) {
        col.fields.add(
          new TextField({
            name: 'meeting_code',
            required: false,
          }),
        )
      }

      // meeting_date
      if (!col.fields.getByName('meeting_date')) {
        col.fields.add(
          new TextField({
            name: 'meeting_date',
            required: false,
          }),
        )
      }

      // company
      if (!col.fields.getByName('company')) {
        col.fields.add(
          new TextField({
            name: 'company',
            required: false,
          }),
        )
      }

      // update_history (JSON)
      if (!col.fields.getByName('update_history')) {
        col.fields.add(
          new JSONField({
            name: 'update_history',
            required: false,
          }),
        )
      }

      // origem_pendente_regularizacao (Bool)
      if (!col.fields.getByName('origem_pendente_regularizacao')) {
        col.fields.add(
          new BoolField({
            name: 'origem_pendente_regularizacao',
            required: false,
          }),
        )
      }

      app.save(col)

      // Índices adicionais para performance de rastreabilidade
      try {
        col.addIndex('idx_pcp_pend_meeting_code', false, 'meeting_code', '')
        col.addIndex('idx_pcp_pend_ata_id', false, 'ata_id', '')
        app.save(col)
      } catch (_) {}
    } catch (err) {
      console.warn('Erro ao atualizar campos de pcp_meeting_pendency:', err)
    }

    // 2. Regularização segura dos registros legados
    // Se a associação for inequívoca (meeting_id aponta para um pcp_meeting existente),
    // vincula meeting_code, meeting_date, company e busca a ATA correspondente.
    // Caso contrário (como meeting_id = 'REUNIAO_MANUAL'), NÃO associar à reunião errada:
    // apenas marcar origem_pendente_regularizacao = true e inicializar update_history.
    try {
      const records = app.findRecordsByFilter('pcp_meeting_pendency', '1=1', '', 500, 0)
      for (const rec of records) {
        const mId = rec.getString('meeting_id')
        const currentHist = rec.get('update_history') || []
        const currentHistArr = Array.isArray(currentHist) ? currentHist : []

        if (!mId || mId === 'REUNIAO_MANUAL' || mId === 'MANUAL') {
          // Associação inequívoca NÃO é possível -> marcar origem_pendente_regularizacao = true
          rec.set('origem_pendente_regularizacao', true)
          if (!rec.getString('company')) {
            rec.set('company', 'CIAFAL')
          }
          if (currentHistArr.length === 0 && rec.getString('last_update_note')) {
            rec.set('update_history', [
              {
                id: 'hist_init_' + rec.id,
                timestamp: rec.getString('created') || new Date().toISOString(),
                user_name: 'Sistema PCP (Criação / Legado)',
                user_id: '',
                status_anterior: rec.getString('status') || 'ABERTA',
                status_novo: rec.getString('status') || 'ABERTA',
                nota: rec.getString('last_update_note') || 'Registro inicial legado importado',
                evidencia: rec.getString('evidence') || '',
                origem_atualizacao: rec.getString('origin') || 'Painel de Pendências e Ações',
              },
            ])
          }
          app.save(rec)
        } else {
          // Verificar se meeting_id existe em pcp_meeting
          try {
            const meetingRec = app.findFirstRecordByData('pcp_meeting', 'id', mId)
            rec.set('meeting_code', meetingRec.getString('meeting_code'))
            rec.set('meeting_date', meetingRec.getString('meeting_date'))
            rec.set('company', meetingRec.getString('company') || 'CIAFAL')
            rec.set('origem_pendente_regularizacao', false)

            // Buscar ATA associada a esta reunião se existir
            try {
              const ataRecs = app.findRecordsByFilter(
                'pcp_meeting_ata',
                `meeting_id = '${meetingRec.id}'`,
                '-version',
                1,
                0,
              )
              if (ataRecs.length > 0) {
                rec.set('ata_id', ataRecs[0].id)
                rec.set(
                  'ata_code',
                  `ATA-${meetingRec.getString('meeting_code')}-V${ataRecs[0].getInt('version')}`,
                )
              }
            } catch (_) {}

            if (currentHistArr.length === 0 && rec.getString('last_update_note')) {
              rec.set('update_history', [
                {
                  id: 'hist_init_' + rec.id,
                  timestamp: rec.getString('created') || new Date().toISOString(),
                  user_name: 'Sistema PCP',
                  user_id: '',
                  status_anterior: rec.getString('status') || 'ABERTA',
                  status_novo: rec.getString('status') || 'ABERTA',
                  nota: rec.getString('last_update_note') || 'Registro inicial',
                  evidencia: rec.getString('evidence') || '',
                  origem_atualizacao: 'Reunião PCP',
                },
              ])
            }
            app.save(rec)
          } catch (_) {
            // Reunião não encontrada -> marcar para regularização
            rec.set('origem_pendente_regularizacao', true)
            app.save(rec)
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao regularizar registros legados em pcp_meeting_pendency:', err)
    }
  },
  (app) => {
    // Revert idempotente: remover campos adicionados
    try {
      const col = app.findCollectionByNameOrId('pcp_meeting_pendency')
      const fieldsToRemove = [
        'origem_pendente_regularizacao',
        'update_history',
        'company',
        'meeting_date',
        'meeting_code',
        'ata_code',
        'ata_id',
      ]
      for (const f of fieldsToRemove) {
        try {
          col.fields.removeByName(f)
        } catch (_) {}
      }
      app.save(col)
    } catch (_) {}
  },
)
