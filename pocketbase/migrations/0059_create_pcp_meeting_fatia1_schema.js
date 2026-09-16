migrate(
  (app) => {
    // 1. pcp_meeting
    const meetingCol = new Collection({
      name: 'pcp_meeting',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'meeting_code', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'week', type: 'number', required: true },
        { name: 'year', type: 'number', required: true },
        { name: 'company', type: 'text', required: true },
        { name: 'meeting_date', type: 'text', required: true },
        { name: 'start_time', type: 'text', required: true },
        { name: 'expected_end_time', type: 'text', required: true },
        {
          name: 'modality',
          type: 'select',
          required: true,
          values: ['PRESENCIAL', 'ONLINE', 'HIBRIDA'],
          maxSelect: 1,
        },
        { name: 'location', type: 'text' },
        { name: 'room', type: 'text' },
        { name: 'online_link', type: 'text' },
        { name: 'organizer', type: 'text', required: true },
        { name: 'conductor', type: 'text', required: true },
        { name: 'objective', type: 'text' },
        { name: 'notes', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'RASCUNHO',
            'PREPARACAO',
            'PREVIA_GERADA',
            'PREVIA_VALIDADA',
            'PREVIA_ENVIADA',
            'AGENDADA',
            'EM_ANDAMENTO',
            'REALIZADA',
            'ATA_FINAL_GERADA',
            'ATA_APROVADA',
            'PUBLICADA',
            'CANCELADA',
            'REAGENDADA',
          ],
          maxSelect: 1,
        },
        { name: 'briefing_gerado', type: 'bool' },
        { name: 'pauta_gerada', type: 'bool' },
        { name: 'previa_gerada', type: 'bool' },
        { name: 'previa_enviada', type: 'bool' },
        { name: 'previa_envio_info', type: 'json' }, // { data_hora, usuario, versao, destinatarios: [] }
        { name: 'agendamento_confirmado', type: 'bool' },
        { name: 'recurrence_config', type: 'json' }, // { enabled, day_of_week, start_time, periodicity }
        { name: 'cancellation_reason', type: 'text' },
        { name: 'reschedule_reason', type: 'text' },
        { name: 'created_by_user', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pcp_meeting_code ON pcp_meeting (meeting_code)',
        'CREATE INDEX idx_pcp_meeting_status ON pcp_meeting (status)',
        'CREATE INDEX idx_pcp_meeting_week_year ON pcp_meeting (year, week)',
        'CREATE INDEX idx_pcp_meeting_date ON pcp_meeting (meeting_date)',
      ],
    })
    app.save(meetingCol)

    // 2. pcp_meeting_participant
    const participantCol = new Collection({
      name: 'pcp_meeting_participant',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'meeting_id', type: 'text', required: true },
        { name: 'person_name', type: 'text', required: true },
        { name: 'person_email', type: 'text' },
        { name: 'role_title', type: 'text' },
        { name: 'area', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'CONVOCADO',
            'CONFIRMOU',
            'RECUSOU',
            'SEM_RESPOSTA',
            'PARTICIPOU',
            'NAO_PARTICIPOU',
          ],
          maxSelect: 1,
        },
        { name: 'response_notes', type: 'text' },
        { name: 'responded_at', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pcp_part_meeting ON pcp_meeting_participant (meeting_id)',
        'CREATE INDEX idx_pcp_part_area ON pcp_meeting_participant (area)',
        'CREATE INDEX idx_pcp_part_status ON pcp_meeting_participant (status)',
      ],
    })
    app.save(participantCol)

    // 3. pcp_meeting_pendency
    const pendencyCol = new Collection({
      name: 'pcp_meeting_pendency',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'pendency_code', type: 'text', required: true },
        { name: 'origin_week', type: 'number', required: true },
        { name: 'origin_year', type: 'number', required: true },
        { name: 'meeting_id', type: 'text', required: true },
        { name: 'area', type: 'text', required: true },
        { name: 'subject', type: 'text', required: true },
        { name: 'action', type: 'text', required: true },
        { name: 'responsible', type: 'text', required: true },
        { name: 'deadline', type: 'text', required: true },
        {
          name: 'priority',
          type: 'select',
          required: true,
          values: ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'ABERTA',
            'EM_ANDAMENTO',
            'AGUARDANDO_TERCEIRO',
            'CONCLUIDA',
            'CANCELADA',
            'VENCIDA',
          ],
          maxSelect: 1,
        },
        { name: 'last_update_note', type: 'text' },
        { name: 'evidence', type: 'text' },
        { name: 'origin', type: 'text' },
        { name: 'performance_action_id', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pcp_pend_code ON pcp_meeting_pendency (pendency_code)',
        'CREATE INDEX idx_pcp_pend_meeting ON pcp_meeting_pendency (meeting_id)',
        'CREATE INDEX idx_pcp_pend_status ON pcp_meeting_pendency (status)',
        'CREATE INDEX idx_pcp_pend_area ON pcp_meeting_pendency (area)',
      ],
    })
    app.save(pendencyCol)

    // 4. pcp_meeting_decision
    const decisionCol = new Collection({
      name: 'pcp_meeting_decision',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'meeting_id', type: 'text', required: true },
        { name: 'description', type: 'text', required: true },
        { name: 'area', type: 'text', required: true },
        { name: 'responsible', type: 'text', required: true },
        { name: 'decision_date', type: 'text', required: true },
        {
          name: 'origin',
          type: 'select',
          required: true,
          values: ['PREVIA', 'REUNIAO'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pcp_dec_meeting ON pcp_meeting_decision (meeting_id)',
        'CREATE INDEX idx_pcp_dec_area ON pcp_meeting_decision (area)',
        'CREATE INDEX idx_pcp_dec_origin ON pcp_meeting_decision (origin)',
      ],
    })
    app.save(decisionCol)

    // 5. pcp_meeting_agenda_item
    const agendaItemCol = new Collection({
      name: 'pcp_meeting_agenda_item',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'meeting_id', type: 'text', required: true },
        { name: 'subject', type: 'text', required: true },
        { name: 'area', type: 'text', required: true },
        { name: 'reason', type: 'text' },
        {
          name: 'priority',
          type: 'select',
          required: true,
          values: ['CRITICO', 'ALTO', 'MEDIO', 'INFORMATIVO'],
          maxSelect: 1,
        },
        { name: 'estimated_time_min', type: 'number', required: true },
        { name: 'presenter', type: 'text', required: true },
        { name: 'decision_needed', type: 'bool' },
        { name: 'order', type: 'number', required: true },
        { name: 'origin_ref', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pcp_agenda_meeting ON pcp_meeting_agenda_item (meeting_id)',
        'CREATE INDEX idx_pcp_agenda_order ON pcp_meeting_agenda_item (meeting_id, order)',
      ],
    })
    app.save(agendaItemCol)

    // 6. pcp_meeting_ata
    const ataCol = new Collection({
      name: 'pcp_meeting_ata',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'meeting_id', type: 'text', required: true },
        { name: 'version', type: 'number', required: true },
        { name: 'structured_content', type: 'json', required: true },
        {
          name: 'ata_type',
          type: 'select',
          required: true,
          values: ['PREVIA', 'FINAL'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['MINUTA', 'EM_REVISAO', 'APROVADA', 'PUBLICADA'],
          maxSelect: 1,
        },
        { name: 'section_completeness', type: 'json' }, // { [sectionId]: number }
        { name: 'overall_completeness', type: 'number' },
        { name: 'template_code', type: 'text' },
        { name: 'published_at', type: 'text' },
        { name: 'published_by', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pcp_ata_meeting ON pcp_meeting_ata (meeting_id)',
        'CREATE INDEX idx_pcp_ata_status ON pcp_meeting_ata (status)',
      ],
    })
    app.save(ataCol)

    // 7. pcp_meeting_template
    const templateCol = new Collection({
      name: 'pcp_meeting_template',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'code', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'revision', type: 'number', required: true },
        { name: 'revision_date', type: 'text', required: true },
        { name: 'effective_date', type: 'text', required: true },
        { name: 'structure', type: 'json', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['VIGENTE', 'EM_REVISAO', 'OBSOLETO'],
          maxSelect: 1,
        },
        { name: 'responsible', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pcp_tpl_code ON pcp_meeting_template (code)',
        'CREATE INDEX idx_pcp_tpl_status ON pcp_meeting_template (status)',
      ],
    })
    app.save(templateCol)

    // 8. pcp_meeting_log
    const logCol = new Collection({
      name: 'pcp_meeting_log',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'meeting_id', type: 'text', required: true },
        { name: 'meeting_code', type: 'text' },
        { name: 'week', type: 'number' },
        { name: 'year', type: 'number' },
        { name: 'user_name', type: 'text', required: true },
        { name: 'user_id', type: 'text' },
        { name: 'action', type: 'text', required: true },
        { name: 'target_object', type: 'text', required: true },
        { name: 'previous_value', type: 'text' },
        { name: 'new_value', type: 'text' },
        { name: 'reason', type: 'text' },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pcp_mlog_meeting ON pcp_meeting_log (meeting_id)',
        'CREATE INDEX idx_pcp_mlog_action ON pcp_meeting_log (action)',
      ],
    })
    app.save(logCol)

    // 9. pcp_meeting_briefing
    const briefingCol = new Collection({
      name: 'pcp_meeting_briefing',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'meeting_id', type: 'text', required: true },
        { name: 'briefing_items', type: 'json', required: true }, // array of BriefingItem
        { name: 'priority_topics', type: 'json', required: true }, // array of PriorityTopic
        { name: 'missing_info_count', type: 'number' },
        { name: 'critical_items_count', type: 'number' },
        { name: 'generated_at', type: 'text', required: true },
        { name: 'generated_by', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pcp_brf_meeting ON pcp_meeting_briefing (meeting_id)'],
    })
    app.save(briefingCol)

    // 10. Seed inicial do template de ATA SGQ (8.1.001-R002, revisão 8)
    const seedTemplate = new Record(templateCol)
    seedTemplate.set('code', '8.1.001-R002')
    seedTemplate.set('title', 'ATA DE REUNIÃO - PCP')
    seedTemplate.set('revision', 8)
    seedTemplate.set('revision_date', '2025-01-15')
    seedTemplate.set('effective_date', '2025-01-20')
    seedTemplate.set('status', 'VIGENTE')
    seedTemplate.set('responsible', 'SGQ CIAFAL / Coordenação PCP')
    seedTemplate.set('structure', {
      template_code: '8.1.001-R002',
      title: 'ATA DE REUNIÃO - PCP',
      revision: 8,
      secoes: [
        { id: 'sec_pcp', nome: 'PCP', obrigatorio: true, ordem: 1 },
        { id: 'sec_comercial', nome: 'Comercial', obrigatorio: true, ordem: 2 },
        { id: 'sec_mp', nome: 'Matéria-Prima', obrigatorio: true, ordem: 3 },
        { id: 'sec_qualidade', nome: 'Qualidade', obrigatorio: true, ordem: 4 },
        { id: 'sec_sdc', nome: 'SDC', obrigatorio: true, ordem: 5 },
        { id: 'sec_estoque', nome: 'Estoque', obrigatorio: true, ordem: 6 },
        { id: 'sec_ks', nome: 'KS', obrigatorio: false, ordem: 7 },
        { id: 'sec_l1', nome: 'L1', obrigatorio: true, ordem: 8 },
        { id: 'sec_l2', nome: 'L2', obrigatorio: true, ordem: 9 },
        { id: 'sec_prep_l2', nome: 'Preparação L2', obrigatorio: false, ordem: 10 },
        { id: 'sec_endireitadeira', nome: 'Endireitadeira', obrigatorio: false, ordem: 11 },
        { id: 'sec_teste_prog', nome: 'Teste Programado', obrigatorio: true, ordem: 12 },
        { id: 'sec_acab_l2', nome: 'Acabamento L2', obrigatorio: false, ordem: 13 },
        { id: 'sec_insp_vallourec', nome: 'Inspeção Vallourec', obrigatorio: false, ordem: 14 },
        { id: 'sec_industrializacao', nome: 'Industrialização', obrigatorio: false, ordem: 15 },
        { id: 'sec_arcelor', nome: 'Arcelor', obrigatorio: false, ordem: 16 },
        { id: 'sec_vallourec', nome: 'Vallourec', obrigatorio: false, ordem: 17 },
      ],
    })
    app.save(seedTemplate)
  },
  (app) => {
    const collections = [
      'pcp_meeting_briefing',
      'pcp_meeting_log',
      'pcp_meeting_template',
      'pcp_meeting_ata',
      'pcp_meeting_agenda_item',
      'pcp_meeting_decision',
      'pcp_meeting_pendency',
      'pcp_meeting_participant',
      'pcp_meeting',
    ]
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
