migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const linesCol = app.findCollectionByNameOrId('production_lines')

    // 1. pcp_meetings (Reuniões de PCP)
    let meetingsCol
    try {
      meetingsCol = app.findCollectionByNameOrId('pcp_meetings')
    } catch (_) {
      meetingsCol = new Collection({
        name: 'pcp_meetings',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'title', type: 'text', required: true },
          { name: 'reference_week', type: 'text', required: true }, // ex: "2026-W35" ou "Semana 35 / 2026"
          { name: 'meeting_date', type: 'text', required: true }, // YYYY-MM-DD
          { name: 'meeting_time', type: 'text', required: true }, // HH:mm
          { name: 'duration_minutes', type: 'number' },
          {
            name: 'modality',
            type: 'select',
            values: ['PRESENCIAL', 'ONLINE', 'HIBRIDA'],
            required: true,
            maxSelect: 1,
          },
          { name: 'location', type: 'text' },
          { name: 'online_link', type: 'text' },
          { name: 'organizer_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'conductor_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'minute_taker_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          {
            name: 'status',
            type: 'select',
            values: ['AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA', 'REMARCADA'],
            required: true,
            maxSelect: 1,
          },
          { name: 'agenda_topics', type: 'json' }, // [{ id, title, description, order, duration_min, line_codes: [] }]
          { name: 'mandatory_participants', type: 'json' }, // [{ user_id, name, email, role, status: 'PENDING'|'ACCEPTED'|'DECLINED'|'NO_RESPONSE', responded_at }]
          { name: 'optional_participants', type: 'json' }, // [{ user_id, name, email, role, status: 'PENDING'|'ACCEPTED'|'DECLINED' }]
          { name: 'involved_sectors', type: 'json' }, // ["PCP", "PRODUCAO", "QUALIDADE", "MANUTENCAO", "LOGISTICA", "ESTOQUE", "DIRETORIA"]
          { name: 'involved_lines', type: 'json' }, // ["L01", "L02", "ENDL1", "ACABL1"]
          { name: 'general_notes', type: 'text' },
          { name: 'reschedule_history', type: 'json' }, // [{ previous_date, previous_time, new_date, new_time, reason, changed_by, changed_at }]
          { name: 'pre_meeting_briefing', type: 'json' }, // Briefing gerado por IA com resumo executivo, pendências, desvios e pauta sugerida
          { name: 'pre_meeting_generated_at', type: 'text' },
          { name: 'audio_recording_url', type: 'text' },
          { name: 'audio_transcript_status', type: 'text' }, // PENDING | COMPLETED | FAILED | NONE
          { name: 'audio_transcript_text', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_meetings_code ON pcp_meetings (code)',
          'CREATE INDEX idx_meetings_week ON pcp_meetings (reference_week)',
          'CREATE INDEX idx_meetings_date ON pcp_meetings (meeting_date)',
          'CREATE INDEX idx_meetings_status ON pcp_meetings (status)',
        ],
      })
      app.save(meetingsCol)
    }

    // 2. pcp_meeting_minutes (Atas Digitais Oficiais)
    let minutesCol
    try {
      minutesCol = app.findCollectionByNameOrId('pcp_meeting_minutes')
    } catch (_) {
      minutesCol = new Collection({
        name: 'pcp_meeting_minutes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          {
            name: 'meeting_id',
            type: 'relation',
            collectionId: meetingsCol.id,
            maxSelect: 1,
            required: true,
          },
          { name: 'meeting_code', type: 'text', required: true },
          { name: 'reference_week', type: 'text', required: true },
          { name: 'title', type: 'text', required: true },
          { name: 'version', type: 'number', required: true },
          {
            name: 'status',
            type: 'select',
            values: ['DRAFT_IA', 'REVISAO_PCP', 'APROVADA', 'PUBLICADA', 'CANCELADA'],
            required: true,
            maxSelect: 1,
          },
          { name: 'executive_summary', type: 'text' },
          { name: 'topics_payload', type: 'json' }, // Estrutura em tópicos com itens
          { name: 'participants_present', type: 'json' }, // Lista de presentes confirmados
          { name: 'reviewed_by_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'reviewed_by_name', type: 'text' },
          { name: 'reviewed_at', type: 'text' },
          { name: 'published_by_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'published_by_name', type: 'text' },
          { name: 'published_at', type: 'text' },
          { name: 'email_dispatched_at', type: 'text' },
          { name: 'email_recipients', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_minutes_meeting ON pcp_meeting_minutes (meeting_id)',
          'CREATE INDEX idx_minutes_status ON pcp_meeting_minutes (status)',
          'CREATE INDEX idx_minutes_week ON pcp_meeting_minutes (reference_week)',
        ],
      })
      app.save(minutesCol)
    }

    // 3. pcp_minute_items (Itens Atômicos da ATA: 1 ITEM -> N LINHAS, CONTEXTO ÚNICO)
    let minuteItemsCol
    try {
      minuteItemsCol = app.findCollectionByNameOrId('pcp_minute_items')
    } catch (_) {
      minuteItemsCol = new Collection({
        name: 'pcp_minute_items',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          {
            name: 'meeting_id',
            type: 'relation',
            collectionId: meetingsCol.id,
            maxSelect: 1,
            required: true,
          },
          { name: 'minute_id', type: 'relation', collectionId: minutesCol.id, maxSelect: 1 },
          { name: 'item_code', type: 'text', required: true },
          { name: 'topic_title', type: 'text', required: true },
          {
            name: 'classification',
            type: 'select',
            values: [
              'INFORMACAO',
              'OBSERVACAO',
              'DECISAO',
              'PENDENCIA',
              'ALERTA',
              'RISCO',
              'ACAO',
              'ALTERACAO_PROGRAMACAO',
              'COMUNICADO',
            ],
            required: true,
            maxSelect: 1,
          },
          {
            name: 'category',
            type: 'select',
            values: [
              'GERAL',
              'QUALIDADE',
              'MATERIA_PRIMA',
              'ESTOQUE',
              'MANUTENCAO',
              'LOGISTICA',
              'SEGURANCA',
              'CAPACIDADE',
              'PROCESSO',
            ],
            maxSelect: 1,
          },
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'text', required: true },
          { name: 'impact_level', type: 'text' }, // BAIXO | MEDIO | ALTO | CRITICO
          {
            name: 'responsible_user_id',
            type: 'relation',
            collectionId: usersCol.id,
            maxSelect: 1,
          },
          { name: 'responsible_name', type: 'text' },
          { name: 'sector', type: 'text' },
          { name: 'deadline', type: 'text' }, // YYYY-MM-DD
          {
            name: 'status',
            type: 'select',
            values: [
              'ABERTA',
              'EM_ANDAMENTO',
              'CONCLUIDA',
              'CANCELADA',
              'VENCIDA',
              'AGUARDANDO_TERCEIRO',
              'SEM_ATUALIZACAO',
              'VALIDADO_HUMANO',
              'IDENTIFICADO_IA',
            ],
            required: true,
            maxSelect: 1,
          },
          { name: 'is_ai_generated', type: 'bool' },
          { name: 'ai_confidence_score', type: 'number' },
          { name: 'validated_by_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'validated_at', type: 'text' },
          // Vínculo Multilinhas 1:N via JSON array de códigos e relações
          { name: 'line_codes', type: 'json' }, // ["L01", "ENDL1", "ACABL1"]
          { name: 'line_ids', type: 'relation', collectionId: linesCol.id, maxSelect: 20 },
          // Vínculos contextuais
          { name: 'product_code', type: 'text' },
          { name: 'product_name', type: 'text' },
          { name: 'material_code', type: 'text' },
          { name: 'production_order', type: 'text' },
          { name: 'customer_order', type: 'text' },
          { name: 'customer_name', type: 'text' },
          { name: 'schedule_code', type: 'text' },
          { name: 'reference_week', type: 'text' },
          // Vigência
          { name: 'valid_from', type: 'text' },
          { name: 'valid_until', type: 'text' },
          { name: 'is_active_operational', type: 'bool' }, // reflete se está ativa na tela operacional
          // Rastreabilidade e Auditoria
          { name: 'conclusion_notes', type: 'text' },
          { name: 'concluded_at', type: 'text' },
          { name: 'concluded_by_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'history_log', type: 'json' }, // [{ timestamp, user_name, from_status, to_status, note }]
          { name: 'attachments', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_minute_items_code ON pcp_minute_items (item_code)',
          'CREATE INDEX idx_minute_items_meeting ON pcp_minute_items (meeting_id)',
          'CREATE INDEX idx_minute_items_class ON pcp_minute_items (classification)',
          'CREATE INDEX idx_minute_items_status ON pcp_minute_items (status)',
          'CREATE INDEX idx_minute_items_deadline ON pcp_minute_items (deadline)',
        ],
      })
      app.save(minuteItemsCol)
    }

    // 4. pcp_communications (Central de Comunicados PCP)
    let commsCol
    try {
      commsCol = app.findCollectionByNameOrId('pcp_communications')
    } catch (_) {
      commsCol = new Collection({
        name: 'pcp_communications',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'title', type: 'text', required: true },
          { name: 'summary', type: 'text' }, // Resumo executivo / curto
          { name: 'content', type: 'text', required: true }, // Conteúdo completo / orientações
          {
            name: 'comm_type',
            type: 'select',
            values: [
              'INFORMATIVO',
              'ATENCAO',
              'OPERACIONAL',
              'ALTERACAO_PROGRAMACAO',
              'QUALIDADE',
              'MATERIA_PRIMA',
              'ESTOQUE',
              'MANUTENCAO',
              'LOGISTICA',
              'SEGURANCA',
              'URGENTE',
              'CRITICO',
              'BLOQUEANTE',
            ],
            required: true,
            maxSelect: 1,
          },
          {
            name: 'criticality',
            type: 'select',
            values: ['NORMAL', 'ATENCAO', 'URGENTE', 'CRITICA', 'BLOQUEANTE'],
            required: true,
            maxSelect: 1,
          },
          {
            name: 'origin_type',
            type: 'select',
            values: [
              'MANUAL',
              'REUNIAO_PCP',
              'ATA_PCP',
              'PENDENCIA_PCP',
              'ALERTA_PCP',
              'ALTERACAO_PROGRAMACAO',
              'ANALISE_IA',
              'OCORRENCIA_OPERACIONAL',
              'QUALIDADE',
              'ESTOQUE_MATERIA_PRIMA',
            ],
            required: true,
            maxSelect: 1,
          },
          { name: 'origin_ref_id', type: 'text' }, // meeting_id, minute_item_id, etc.
          { name: 'origin_ref_code', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['RASCUNHO', 'PROGRAMADO', 'VIGENTE', 'ENCERRADO', 'CANCELADO'],
            required: true,
            maxSelect: 1,
          },
          // Vigência
          { name: 'published_at', type: 'text' },
          { name: 'scheduled_publish_at', type: 'text' },
          { name: 'valid_from', type: 'text', required: true },
          { name: 'valid_until', type: 'text' },
          { name: 'closed_at', type: 'text' },
          { name: 'closed_by_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'close_reason', type: 'text' },
          // Autoria e Aprovação
          { name: 'author_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'author_name', type: 'text' },
          { name: 'approver_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'approver_name', type: 'text' },
          { name: 'approved_at', type: 'text' },
          // Exigência de Ciência / Leitura Obrigatória
          { name: 'requires_acknowledgement', type: 'bool' },
          { name: 'ack_deadline', type: 'text' }, // Prazo limite para dar ciência
          {
            name: 'escalation_responsible_id',
            type: 'relation',
            collectionId: usersCol.id,
            maxSelect: 1,
          },
          // Campos específicos para Comunicados BLOQUEANTES
          { name: 'is_blocking', type: 'bool' },
          { name: 'block_reason', type: 'text' },
          { name: 'unblock_condition', type: 'text' },
          { name: 'unblocked_at', type: 'text' },
          { name: 'unblocked_by_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          // Público-Alvo e Destinatários
          {
            name: 'target_audience_type',
            type: 'select',
            values: [
              'TODOS',
              'PCP',
              'LINHAS_ESPECIFICAS',
              'SETORES_ESPECIFICOS',
              'SUPERVISORES_GESTORES',
              'OPERACAO',
              'QUALIDADE',
              'ESTOQUE',
              'COMERCIAL',
              'LOGISTICA',
              'MANUTENCAO',
              'USUARIOS_ESPECIFICOS',
            ],
            required: true,
            maxSelect: 1,
          },
          { name: 'target_line_codes', type: 'json' }, // ["L01", "L02"]
          { name: 'target_sectors', type: 'json' }, // ["QUALIDADE", "OPERACAO"]
          { name: 'target_user_ids', type: 'relation', collectionId: usersCol.id, maxSelect: 50 },
          // Vínculo Contextual com Objetos Fabris
          { name: 'product_code', type: 'text' },
          { name: 'material_code', type: 'text' },
          { name: 'production_order', type: 'text' },
          { name: 'customer_order', type: 'text' },
          { name: 'customer_name', type: 'text' },
          { name: 'schedule_code', type: 'text' },
          // Métricas de Leitura Consolidadas
          { name: 'total_recipients_count', type: 'number' },
          { name: 'read_count', type: 'number' },
          { name: 'acknowledged_count', type: 'number' },
          { name: 'pending_count', type: 'number' },
          { name: 'attachments', type: 'json' },
          { name: 'is_ai_assisted', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_comms_code ON pcp_communications (code)',
          'CREATE INDEX idx_comms_status ON pcp_communications (status)',
          'CREATE INDEX idx_comms_type ON pcp_communications (comm_type)',
          'CREATE INDEX idx_comms_crit ON pcp_communications (criticality)',
          'CREATE INDEX idx_comms_validity ON pcp_communications (valid_from)',
        ],
      })
      app.save(commsCol)
    }

    // 5. pcp_communication_reads (Controle Individual de Entrega, Visualização, Leitura e Ciência)
    let commReadsCol
    try {
      commReadsCol = app.findCollectionByNameOrId('pcp_communication_reads')
    } catch (_) {
      commReadsCol = new Collection({
        name: 'pcp_communication_reads',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          {
            name: 'communication_id',
            type: 'relation',
            collectionId: commsCol.id,
            maxSelect: 1,
            required: true,
          },
          {
            name: 'user_id',
            type: 'relation',
            collectionId: usersCol.id,
            maxSelect: 1,
            required: true,
          },
          { name: 'user_email', type: 'text' },
          { name: 'user_name', type: 'text' },
          { name: 'delivered_at', type: 'text' },
          { name: 'viewed_at', type: 'text' },
          { name: 'read_at', type: 'text' },
          { name: 'acknowledged_at', type: 'text' },
          { name: 'acknowledged_version', type: 'number' },
          { name: 'user_role', type: 'text' },
          { name: 'user_sector', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_comm_user_read ON pcp_communication_reads (communication_id, user_id)',
          'CREATE INDEX idx_comm_reads_user ON pcp_communication_reads (user_id)',
        ],
      })
      app.save(commReadsCol)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('pcp_communication_reads'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_communications'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_minute_items'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_meeting_minutes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_meetings'))
    } catch (_) {}
  },
)
