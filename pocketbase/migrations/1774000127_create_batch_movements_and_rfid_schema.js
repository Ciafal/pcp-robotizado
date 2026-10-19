migrate(
  (app) => {
    // 1. Coleção rfid_movements (Movimentações RFID / Coletas WMS no HUB)
    if (!app.hasTable('rfid_movements')) {
      const colRfid = new Collection({
        name: 'rfid_movements',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null,
        fields: [
          { name: 'data_leitura', type: 'text', required: true },
          { name: 'hora_leitura', type: 'text', required: true },
          { name: 'tag_rfid', type: 'text', required: true },
          { name: 'epc', type: 'text', required: false },
          { name: 'lote', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_desc', type: 'text', required: false },
          { name: 'quantidade', type: 'number', required: false },
          { name: 'unidade_medida', type: 'text', required: false },
          { name: 'localizacao_anterior', type: 'text', required: false },
          { name: 'localizacao_atual', type: 'text', required: true },
          { name: 'deposito', type: 'text', required: false },
          { name: 'centro', type: 'text', required: false },
          { name: 'equipamento_coletor', type: 'text', required: false },
          { name: 'usuario', type: 'text', required: false },
          { name: 'tipo_coleta', type: 'text', required: false },
          { name: 'numero_coleta_inventario', type: 'text', required: false },
          { name: 'origem', type: 'text', required: false },
          { name: 'destino', type: 'text', required: false },
          { name: 'status', type: 'text', required: false },
          { name: 'observacao', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_rfid_lote ON rfid_movements (lote)',
          'CREATE INDEX idx_rfid_mat ON rfid_movements (material_code)',
          'CREATE INDEX idx_rfid_tag ON rfid_movements (tag_rfid)',
          'CREATE INDEX idx_rfid_dep ON rfid_movements (deposito)',
        ],
      })
      app.save(colRfid)
    }

    // 2. Coleção sap_batch_movements_cache (Armazenamento e cache de movimentações contábeis do SAP ECC - MB51)
    if (!app.hasTable('sap_batch_movements_cache')) {
      const colSap = new Collection({
        name: 'sap_batch_movements_cache',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null,
        fields: [
          { name: 'lote', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_desc', type: 'text', required: false },
          { name: 'data_lancamento', type: 'text', required: true },
          { name: 'hora', type: 'text', required: false },
          { name: 'mblnr', type: 'text', required: true }, // Documento de material
          { name: 'mjahr', type: 'text', required: true }, // Ano
          { name: 'zeile', type: 'text', required: true }, // Item
          { name: 'bwart', type: 'text', required: true }, // Tipo de movimento (101, 102, 261, 311, 601, etc.)
          { name: 'bwart_desc', type: 'text', required: false }, // Descrição oficial do tipo de movimento vinda do SAP
          { name: 'quantidade', type: 'number', required: true },
          { name: 'unidade_medida', type: 'text', required: false },
          { name: 'shkzg', type: 'text', required: false }, // S (Entrada +) ou H (Saída -)
          { name: 'werks', type: 'text', required: false }, // Centro
          { name: 'lgort', type: 'text', required: false }, // Depósito
          { name: 'aufnr', type: 'text', required: false }, // Ordem de produção
          { name: 'kdauf', type: 'text', required: false }, // Pedido de venda
          { name: 'kdpos', type: 'text', required: false }, // Item do pedido de venda
          { name: 'xblnr', type: 'text', required: false }, // Documento de referência
          { name: 'vbeln_vf', type: 'text', required: false }, // Documento de faturamento
          { name: 'usnam', type: 'text', required: false }, // Usuário SAP
          { name: 'bktxt', type: 'text', required: false }, // Texto do cabeçalho
          { name: 'origem_movimento', type: 'text', required: false },
          { name: 'destino_movimento', type: 'text', required: false },
          { name: 'is_estorno', type: 'bool', required: false },
          { name: 'doc_estorno_original', type: 'text', required: false },
          { name: 'raw_payload', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_sap_mov_lote ON sap_batch_movements_cache (lote)',
          'CREATE INDEX idx_sap_mov_mat ON sap_batch_movements_cache (material_code)',
          'CREATE INDEX idx_sap_mov_doc ON sap_batch_movements_cache (mblnr, mjahr, zeile)',
          'CREATE INDEX idx_sap_mov_bwart ON sap_batch_movements_cache (bwart)',
        ],
      })
      app.save(colSap)
    }

    // 3. Coleção pcp_label_reprint_requests (Auditoria estrita e pedidos de 2ª via de etiqueta)
    if (!app.hasTable('pcp_label_reprint_requests')) {
      const colLabel = new Collection({
        name: 'pcp_label_reprint_requests',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null,
        fields: [
          { name: 'protocolo', type: 'text', required: true },
          { name: 'lote', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_desc', type: 'text', required: false },
          { name: 'peso', type: 'number', required: false },
          { name: 'centro', type: 'text', required: false },
          { name: 'deposito', type: 'text', required: false },
          { name: 'etiqueta_atual_id', type: 'text', required: false },
          { name: 'impressora', type: 'text', required: true },
          { name: 'quantidade_copias', type: 'number', required: true },
          { name: 'motivo_reimpressao', type: 'text', required: true },
          { name: 'justificativa', type: 'text', required: false },
          { name: 'status_integracao', type: 'text', required: true }, // PENDENTE_PARAMETRIZACAO, SUCESSO, ERRO
          { name: 'retorno_sap', type: 'text', required: false },
          { name: 'usuario_id', type: 'text', required: false },
          { name: 'usuario_nome', type: 'text', required: false },
          { name: 'usuario_email', type: 'text', required: false },
          { name: 'data_hora_solicitacao', type: 'text', required: true },
          { name: 'detalhes_tecnicos', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_label_rep_proto ON pcp_label_reprint_requests (protocolo)',
          'CREATE INDEX idx_label_rep_lote ON pcp_label_reprint_requests (lote)',
          'CREATE INDEX idx_label_rep_user ON pcp_label_reprint_requests (usuario_email)',
        ],
      })
      app.save(colLabel)
    }

    // 4. Cadastrar Permissões RBAC para Movimentações Lote se existirem as collections de RBAC
    if (app.hasTable('pcp_permissions')) {
      const permsCol = app.findCollectionByNameOrId('pcp_permissions')
      const newPerms = [
        {
          name: 'Visualizar Movimentações Lote (SAP MB51 e RFID)',
          key: 'pcp.batch_movements.view',
          category: 'Controle de Produção',
          description:
            'Permite consultar movimentações contábeis SAP e rastreabilidade RFID por lote.',
          is_critical: false,
        },
        {
          name: 'Emitir 2ª Via de Etiqueta de Lote',
          key: 'pcp.batch_movements.reprint',
          category: 'Controle de Produção',
          description:
            'Permite acionar a rotina oficial de reimpressão de etiquetas de lote no SAP.',
          is_critical: true,
        },
        {
          name: 'Auditoria de Movimentações e Etiquetas de Lote',
          key: 'pcp.batch_movements.audit',
          category: 'Controle de Produção',
          description:
            'Permite visualizar o histórico completo e logs de auditoria de consultas e reimpressões de etiquetas.',
          is_critical: false,
        },
      ]

      newPerms.forEach((p) => {
        try {
          const existing = app.findFirstRecordByFilter('pcp_permissions', `key = '${p.key}'`)
          if (!existing) {
            const rec = new Record(permsCol)
            rec.set('name', p.name)
            rec.set('key', p.key)
            rec.set('category', p.category)
            rec.set('description', p.description)
            rec.set('is_critical', p.is_critical)
            app.save(rec)
          }
        } catch (_) {}
      })
    }

    // 5. Atualizar catálogo de integração SAP com MB51 e Reimpressão de Etiqueta
    if (app.hasTable('sap_integration_catalog')) {
      const catCol = app.findCollectionByNameOrId('sap_integration_catalog')
      const catEntries = [
        {
          code: 'RFC_SAP_MB51_BATCH_MOVEMENTS',
          description: 'Consulta RFC/BAPI de Documentos de Material por Lote (Equivalente MB51)',
          function_name: 'BAPI_GOODSMVT_GETITEMS',
          integration_type: 'RFC_BAPI',
          standard_or_z: 'STANDARD',
          source_object: 'MKPF / MSEG / T156T',
          active: true,
          last_status: 'INDISPONIVEL',
          last_error_message: 'Pendente de parametrização no SAP Gateway / FCA',
        },
        {
          code: 'RFC_SAP_BATCH_LABEL_REPRINT',
          description: 'Rotina Oficial SAP de Reimpressão de 2ª Via de Etiqueta de Lote',
          function_name: 'Z_RFC_PCP_PRINT_BATCH_LABEL',
          integration_type: 'RFC_BAPI',
          standard_or_z: 'Z_CUSTOM',
          source_object: 'MCHA / MCH1 / SMARTFORMS / ADOBE_FORMS',
          active: true,
          last_status: 'INDISPONIVEL',
          last_error_message: 'Integração SAP de reimpressão pendente de parametrização',
        },
      ]

      catEntries.forEach((entry) => {
        try {
          const existing = app.findFirstRecordByFilter(
            'sap_integration_catalog',
            `code = '${entry.code}'`,
          )
          if (!existing) {
            const rec = new Record(catCol)
            rec.set('code', entry.code)
            rec.set('description', entry.description)
            rec.set('function_name', entry.function_name)
            rec.set('integration_type', entry.integration_type)
            rec.set('standard_or_z', entry.standard_or_z)
            rec.set('source_object', entry.source_object)
            rec.set('active', entry.active)
            rec.set('last_status', entry.last_status)
            rec.set('last_error_message', entry.last_error_message)
            app.save(rec)
          }
        } catch (_) {}
      })
    }
  },
  (app) => {
    try {
      const c3 = app.findCollectionByNameOrId('pcp_label_reprint_requests')
      if (c3) app.delete(c3)
    } catch (_) {}
    try {
      const c2 = app.findCollectionByNameOrId('sap_batch_movements_cache')
      if (c2) app.delete(c2)
    } catch (_) {}
    try {
      const c1 = app.findCollectionByNameOrId('rfid_movements')
      if (c1) app.delete(c1)
    } catch (_) {}
  },
)
