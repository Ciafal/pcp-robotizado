migrate(
  (app) => {
    // 1. Coleção: pcp_ata_distribuicoes
    // Registra cada evento/sessão de distribuição de ATA (via HUB ou via E-mail)
    if (!app.hasTable('pcp_ata_distribuicoes')) {
      const colDist = new Collection({
        name: 'pcp_ata_distribuicoes',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null, // Histórico imutável — não permitir apagar
        fields: [
          { name: 'ata_id', type: 'text', required: true },
          { name: 'meeting_id', type: 'text', required: true },
          { name: 'meeting_code', type: 'text', required: false },
          { name: 'meeting_date', type: 'text', required: false },
          { name: 'meeting_title', type: 'text', required: false },
          { name: 'canal', type: 'select', required: true, values: ['HUB', 'EMAIL'] },
          { name: 'versao_ata', type: 'number', required: true },
          { name: 'is_minuta', type: 'bool', required: false },
          { name: 'assunto', type: 'text', required: true },
          { name: 'mensagem_complementar', type: 'text', required: false },
          { name: 'exigir_confirmacao', type: 'bool', required: false },
          { name: 'destinatarios_json', type: 'json', required: false },
          { name: 'destinatarios_count', type: 'number', required: false },
          { name: 'cc_json', type: 'json', required: false },
          { name: 'emissor_id', type: 'text', required: false },
          { name: 'emissor_nome', type: 'text', required: false },
          { name: 'emissor_email', type: 'text', required: false },
          { name: 'pdf_nome_arquivo', type: 'text', required: false },
          { name: 'pdf_identificador', type: 'text', required: false },
          { name: 'comunicado_hub_id', type: 'text', required: false },
          {
            name: 'status_distribuicao',
            type: 'select',
            required: false,
            values: [
              'PUBLICADO',
              'NOTIFICADO',
              'AGUARDANDO_CONFIRMACAO',
              'LEITURA_CONFIRMADA',
              'PENDENTE',
              'PENDENTE_SMTP',
              'ENVIADO',
              'ENTREGUE',
              'ERRO',
            ],
          },
          { name: 'detalhes_status', type: 'text', required: false },
          { name: 'idempotency_key', type: 'text', required: false },
          { name: 'confirmacoes_count', type: 'number', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ata_dist_ata ON pcp_ata_distribuicoes (ata_id)',
          'CREATE INDEX idx_ata_dist_canal ON pcp_ata_distribuicoes (canal)',
          'CREATE INDEX idx_ata_dist_idemp ON pcp_ata_distribuicoes (idempotency_key)',
          'CREATE INDEX idx_ata_dist_meeting ON pcp_ata_distribuicoes (meeting_id)',
        ],
      })
      app.save(colDist)
    }

    // 2. Coleção: pcp_ata_destinatarios_envio
    // Registra cada destinatário individualmente por distribuição (grão por destinatário + canal)
    if (!app.hasTable('pcp_ata_destinatarios_envio')) {
      const colDest = new Collection({
        name: 'pcp_ata_destinatarios_envio',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null, // Histórico imutável
        fields: [
          { name: 'distribuicao_id', type: 'text', required: true },
          { name: 'ata_id', type: 'text', required: true },
          { name: 'meeting_id', type: 'text', required: true },
          { name: 'versao_ata', type: 'number', required: true },
          { name: 'canal', type: 'select', required: true, values: ['HUB', 'EMAIL'] },
          { name: 'user_id', type: 'text', required: false },
          { name: 'destinatario_nome', type: 'text', required: true },
          { name: 'destinatario_email', type: 'text', required: true },
          { name: 'setor', type: 'text', required: false },
          { name: 'is_cc', type: 'bool', required: false },
          {
            name: 'status_envio',
            type: 'select',
            required: false,
            values: [
              'PUBLICADO',
              'NOTIFICADO',
              'AGUARDANDO_CONFIRMACAO',
              'LEITURA_CONFIRMADA',
              'PENDENTE',
              'PENDENTE_SMTP',
              'ENVIADO',
              'ENTREGUE',
              'ERRO',
            ],
          },
          { name: 'enviado_em', type: 'text', required: false },
          { name: 'confirmado_leitura', type: 'bool', required: false },
          { name: 'confirmado_em', type: 'text', required: false },
          { name: 'canal_confirmacao', type: 'text', required: false },
          { name: 'ip_origem', type: 'text', required: false },
          { name: 'detalhes_envio', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ata_dest_dist ON pcp_ata_destinatarios_envio (distribuicao_id)',
          'CREATE INDEX idx_ata_dest_ata ON pcp_ata_destinatarios_envio (ata_id)',
          'CREATE INDEX idx_ata_dest_user ON pcp_ata_destinatarios_envio (user_id)',
          'CREATE INDEX idx_ata_dest_status ON pcp_ata_destinatarios_envio (status_envio)',
        ],
      })
      app.save(colDest)
    }

    // 3. Coleção: pcp_ata_confirmacoes_leitura
    // Registros imutáveis de confirmação formal de leitura pelo destinatário no HUB ou via evidência
    if (!app.hasTable('pcp_ata_confirmacoes_leitura')) {
      const colConf = new Collection({
        name: 'pcp_ata_confirmacoes_leitura',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null, // Histórico imutável de conformidade SGQ
        fields: [
          { name: 'ata_id', type: 'text', required: true },
          { name: 'meeting_id', type: 'text', required: true },
          { name: 'distribuicao_id', type: 'text', required: false },
          { name: 'destinatario_envio_id', type: 'text', required: false },
          { name: 'codigo_ata', type: 'text', required: true },
          { name: 'versao_ata', type: 'number', required: true },
          { name: 'user_id', type: 'text', required: false },
          { name: 'user_nome', type: 'text', required: true },
          { name: 'user_email', type: 'text', required: true },
          { name: 'setor', type: 'text', required: false },
          { name: 'canal_acesso', type: 'text', required: false }, // Ex: 'HUB_PCP_ROBOTIZADO' ou 'HUB_CENTRAL_COMUNICADOS'
          { name: 'confirmado_em', type: 'text', required: true },
          { name: 'ip_origem', type: 'text', required: false },
          { name: 'user_agent', type: 'text', required: false },
          { name: 'declaracao_leitura', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ata_conf_ata ON pcp_ata_confirmacoes_leitura (ata_id)',
          'CREATE INDEX idx_ata_conf_user ON pcp_ata_confirmacoes_leitura (user_id)',
          'CREATE INDEX idx_ata_conf_dist ON pcp_ata_confirmacoes_leitura (distribuicao_id)',
        ],
      })
      app.save(colConf)
    }
  },
  (app) => {
    try {
      const c3 = app.findCollectionByNameOrId('pcp_ata_confirmacoes_leitura')
      if (c3) app.delete(c3)
    } catch (_) {}
    try {
      const c2 = app.findCollectionByNameOrId('pcp_ata_destinatarios_envio')
      if (c2) app.delete(c2)
    } catch (_) {}
    try {
      const c1 = app.findCollectionByNameOrId('pcp_ata_distribuicoes')
      if (c1) app.delete(c1)
    } catch (_) {}
  },
)
