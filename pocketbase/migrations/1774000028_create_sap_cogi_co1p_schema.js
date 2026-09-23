migrate(
  (app) => {
    // 1. Coleção: sap_pendencies_config (Critérios e pesos parametrizáveis de criticidade e regras IA)
    let configCol = null
    try {
      configCol = app.findCollectionByNameOrId('sap_pendencies_config')
    } catch (_) {}

    if (!configCol) {
      configCol = new Collection({
        name: 'sap_pendencies_config',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'config_key', type: 'text', required: true },
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'thresholds', type: 'json', required: false },
          { name: 'active', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_spc_key ON sap_pendencies_config (config_key)'],
      })
      app.save(configCol)

      // Seed de configuração inicial de criticidade parametrizável
      const defaultCfg = new Record(configCol)
      defaultCfg.set('config_key', 'CRITICALITY_THRESHOLDS')
      defaultCfg.set('title', 'Parâmetros de Pontuação de Criticidade')
      defaultCfg.set(
        'description',
        'Pesos e tempos de corte para cálculo visual e paramétrico de criticidade',
      )
      defaultCfg.set('thresholds', {
        age_hours_urgent: 24,
        age_hours_critical: 48,
        qty_critical_tons: 50,
        qty_urgent_tons: 20,
        weight_impact_programacao: 30,
        weight_blocks_closing: 40,
        weight_recurrent: 25,
        weight_age: 20,
        score_critical_min: 70,
        score_urgent_min: 45,
        score_attention_min: 20,
      })
      defaultCfg.set('active', true)
      app.save(defaultCfg)
    }

    // 2. Coleção: sap_pendencies_sgq_mapping (Associação Categoria/Erro SAP -> Documento SGQ)
    let sgqCol = null
    try {
      sgqCol = app.findCollectionByNameOrId('sap_pendencies_sgq_mapping')
    } catch (_) {}

    if (!sgqCol) {
      sgqCol = new Collection({
        name: 'sap_pendencies_sgq_mapping',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'category', type: 'text', required: true },
          { name: 'sap_msg_code', type: 'text', required: false },
          { name: 'movement_type', type: 'text', required: false },
          { name: 'sgq_document_code', type: 'text', required: true },
          { name: 'sgq_document_title', type: 'text', required: true },
          { name: 'sgq_document_revision', type: 'text', required: true },
          { name: 'sgq_applicable_procedure', type: 'text', required: true },
          { name: 'sgq_recommended_step', type: 'text', required: false },
          { name: 'sgq_procedure_responsible', type: 'text', required: false },
          { name: 'sgq_restrictions', type: 'text', required: false },
          { name: 'sgq_notes', type: 'text', required: false },
          { name: 'active', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_spsm_cat ON sap_pendencies_sgq_mapping (category)',
          'CREATE INDEX idx_spsm_code ON sap_pendencies_sgq_mapping (sap_msg_code)',
          'CREATE INDEX idx_spsm_doc ON sap_pendencies_sgq_mapping (sgq_document_code)',
        ],
      })
      app.save(sgqCol)

      // Seed inicial dos mapeamentos oficiais SGQ para as categorias SAP
      const seedMappings = [
        {
          category: 'Estoque',
          sap_msg_code: 'M7021',
          movement_type: '261',
          sgq_document_code: 'PO-EST-005',
          sgq_document_title:
            'Procedimento Operacional de Regularização e Ajuste de Divergência de Estoque',
          sgq_document_revision: 'Rev.03',
          sgq_applicable_procedure:
            'Item 4.2 - Verificação física imediata no depósito de consumo e apontamento de transferência ou estorno.',
          sgq_recommended_step:
            '1. Conferir inventário físico no depósito; 2. Solicitar ao almoxarifado transferência sistêmica se material estiver em outro depósito; 3. Registrar ocorrência no PCP.',
          sgq_procedure_responsible: 'Almoxarifado / Estoque Central',
          sgq_restrictions: 'Não efetuar baixa fictícia sem saldo físico conferido.',
          sgq_notes: 'Bloqueia encerramento técnico de ordens em andamento.',
          active: true,
        },
        {
          category: 'Lote',
          sap_msg_code: 'M7043',
          movement_type: '261',
          sgq_document_code: 'IT-GQ-018',
          sgq_document_title:
            'Instrução de Trabalho — Gestão e Desbloqueio de Lotes Retidos pela Qualidade',
          sgq_document_revision: 'Rev.02',
          sgq_applicable_procedure:
            'Item 5 - Análise do motivo de retenção (ensaios mecânicos ou liberação condicional).',
          sgq_recommended_step:
            '1. Consultar status do lote na transação QA33/MSC3N; 2. Verificar laudo do SGQ; 3. Encaminhar para parecer da Qualidade Metalúrgica.',
          sgq_procedure_responsible: 'Qualidade Assegurada / Metalurgia',
          sgq_restrictions:
            'Apenas inspetores de qualidade credenciados podem emitir parecer de liberação.',
          sgq_notes: 'Impacta diretamente a ordem vigente.',
          active: true,
        },
        {
          category: 'Contábil',
          sap_msg_code: 'M7053',
          movement_type: '101',
          sgq_document_code: 'PO-CTB-002',
          sgq_document_title: 'Norma de Encerramento Contábil e Abertura de Períodos de Lançamento',
          sgq_document_revision: 'Rev.04',
          sgq_applicable_procedure:
            'Seção 3.4 - Tratamento de lançamentos em período anterior ou conta bloqueada para lançamento direto.',
          sgq_recommended_step:
            '1. Validar data contábil de competência; 2. Contatar Contabilidade para liberação transitória da MMRV/OB52.',
          sgq_procedure_responsible: 'Controladoria e Contabilidade',
          sgq_restrictions: 'Proibido alterar competência contábil sem chancela da Controladoria.',
          sgq_notes: 'Causa frequente em viradas de mês.',
          active: true,
        },
        {
          category: 'Confirmação',
          sap_msg_code: 'RU010',
          movement_type: '',
          sgq_document_code: 'PO-PCP-012',
          sgq_document_title:
            'Procedimento Operacional de Processamento Posterior de Confirmações (CO1P/CO14)',
          sgq_document_revision: 'Rev.01',
          sgq_applicable_procedure:
            'Item 6 - Desacoplamento de confirmações e baixa retroativa por explosão de lista técnica.',
          sgq_recommended_step:
            '1. Localizar chave Ordem -> Confirmação -> Reserva; 2. Verificar se componentes possuem saldo; 3. Solicitar reprocessamento no SAP ECC.',
          sgq_procedure_responsible: 'PCP Central / Programador da Linha',
          sgq_restrictions:
            'Não forçar confirmação de operação subsequente sem sanar baixa dos componentes.',
          sgq_notes: 'Processamento posterior CO1P.',
          active: true,
        },
        {
          category: 'Cadastro',
          sap_msg_code: 'M3018',
          movement_type: '',
          sgq_document_code: 'PO-CAD-001',
          sgq_document_title: 'Diretriz de Dados Mestres de Materiais e Visões de Produção SAP',
          sgq_document_revision: 'Rev.05',
          sgq_applicable_procedure:
            'Seção 2.1 - Ampliação de material para centro/depósito e tipo de avaliação.',
          sgq_recommended_step:
            '1. Verificar se material está ampliado no centro da ordem; 2. Validar visão de contabilidade e cálculo de custos; 3. Solicitar ampliação à equipe de Cadastro.',
          sgq_procedure_responsible: 'Cadastro Central / TI Dados Mestres',
          sgq_restrictions: 'Uso obrigatório do formulário de solicitação de ampliação ZCAD.',
          sgq_notes: 'Resolve de forma definitiva pendências repetitivas por novo código.',
          active: true,
        },
        {
          category: 'Ordem de Produção',
          sap_msg_code: 'CO101',
          movement_type: '',
          sgq_document_code: 'PO-PRD-007',
          sgq_document_title:
            'Gestão do Ciclo de Vida de Ordens de Produção (Liberação, Apontamento e TECO)',
          sgq_document_revision: 'Rev.03',
          sgq_applicable_procedure:
            'Seção 4 - Status de sistema incompatível com movimentação ou encerramento.',
          sgq_recommended_step:
            '1. Verificar status de sistema da ordem (LIB, CONF, ENT, TECI, ENCR); 2. Retirar bloqueio se aplicável; 3. Ajustar status no SAP ECC.',
          sgq_procedure_responsible: 'PCP / Líder de Produção',
          sgq_restrictions: 'Ordens encerradas tecnicamente não recebem apontamento retroativo.',
          sgq_notes: 'Bloqueia fechamento da programação vigente.',
          active: true,
        },
      ]

      for (const m of seedMappings) {
        const rec = new Record(sgqCol)
        Object.entries(m).forEach(([k, v]) => rec.set(k, v))
        app.save(rec)
      }
    }

    // 3. Coleção: sap_cogi_pendencies (Pendências COGI - Movimentação de Mercadorias)
    let cogiCol = null
    try {
      cogiCol = app.findCollectionByNameOrId('sap_cogi_pendencies')
    } catch (_) {}

    if (!cogiCol) {
      cogiCol = new Collection({
        name: 'sap_cogi_pendencies',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'empresa_code', type: 'text', required: false },
          { name: 'centro_code', type: 'text', required: true },
          { name: 'linha_code', type: 'text', required: false },
          { name: 'work_center', type: 'text', required: false },
          { name: 'op_number', type: 'text', required: false },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text', required: true },
          { name: 'deposito', type: 'text', required: false },
          { name: 'lote', type: 'text', required: false },
          { name: 'tipo_movimento', type: 'text', required: true },
          { name: 'quantidade', type: 'number', required: true },
          { name: 'unidade_medida', type: 'text', required: true },
          { name: 'area_funcional', type: 'text', required: false },
          { name: 'contador_tecnico', type: 'text', required: false },
          { name: 'data_criacao', type: 'text', required: true },
          { name: 'data_erro', type: 'text', required: true },
          { name: 'sap_message', type: 'text', required: true }, // Preservada ipsi literis
          { name: 'sap_msg_code', type: 'text', required: true },
          { name: 'sap_status', type: 'text', required: false },
          { name: 'idade_horas', type: 'number', required: false },
          {
            name: 'categoria_ia',
            type: 'select',
            required: true,
            values: [
              'Estoque',
              'Saldo/Reserva',
              'Contábil',
              'Cadastro',
              'Lote',
              'Ordem de Produção',
              'Confirmação',
              'Integração',
              'Outros',
            ],
            maxSelect: 1,
          },
          {
            name: 'criticality',
            type: 'select',
            required: true,
            values: ['CRITICA', 'URGENTE', 'ATENCAO', 'BAIXA'],
            maxSelect: 1,
          },
          { name: 'area_responsavel_sugerida', type: 'text', required: true },
          {
            name: 'treatment_status',
            type: 'select',
            required: true,
            values: [
              'Nova',
              'Em análise',
              'Em tratamento',
              'Aguardando outra área',
              'Corrigida',
              'Aguardando reprocessamento SAP',
              'Reprocessada',
              'Não resolvida',
              'Encerrada',
            ],
            maxSelect: 1,
          },
          { name: 'responsavel_tratamento_id', type: 'text', required: false },
          { name: 'responsavel_tratamento_nome', type: 'text', required: false },
          { name: 'sgq_document_code', type: 'text', required: false },
          { name: 'sgq_document_title', type: 'text', required: false },
          { name: 'sgq_document_revision', type: 'text', required: false },
          { name: 'impacta_programacao', type: 'bool', required: false },
          { name: 'bloqueia_fechamento', type: 'bool', required: false },
          { name: 'reincidente', type: 'bool', required: false },
          { name: 'reincidencia_chave', type: 'text', required: false },
          { name: 'recorrencia_count', type: 'number', required: false },
          { name: 'ai_diagnosis_facts', type: 'json', required: false },
          { name: 'ai_diagnosis_hypotheses', type: 'json', required: false },
          { name: 'ai_recommended_action', type: 'json', required: false },
          { name: 'treatment_notes', type: 'text', required: false },
          { name: 'is_demo', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cogi_op ON sap_cogi_pendencies (op_number)',
          'CREATE INDEX idx_cogi_mat ON sap_cogi_pendencies (material_code)',
          'CREATE INDEX idx_cogi_centro ON sap_cogi_pendencies (centro_code)',
          'CREATE INDEX idx_cogi_crit ON sap_cogi_pendencies (criticality)',
          'CREATE INDEX idx_cogi_cat ON sap_cogi_pendencies (categoria_ia)',
          'CREATE INDEX idx_cogi_status ON sap_cogi_pendencies (treatment_status)',
          'CREATE INDEX idx_cogi_reinc ON sap_cogi_pendencies (reincidencia_chave)',
        ],
      })
      app.save(cogiCol)
    }

    // 4. Coleção: sap_co1p_pendencies (Pendências CO1P - Confirmações em Processamento Posterior)
    let co1pCol = null
    try {
      co1pCol = app.findCollectionByNameOrId('sap_co1p_pendencies')
    } catch (_) {}

    if (!co1pCol) {
      co1pCol = new Collection({
        name: 'sap_co1p_pendencies',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'empresa_code', type: 'text', required: false },
          { name: 'centro_code', type: 'text', required: true },
          { name: 'linha_code', type: 'text', required: false },
          { name: 'work_center', type: 'text', required: false },
          { name: 'op_number', type: 'text', required: true },
          { name: 'confirmation_number', type: 'text', required: true },
          { name: 'confirmation_counter', type: 'text', required: true },
          { name: 'reservation_number', type: 'text', required: false },
          { name: 'processo_confirmacao', type: 'text', required: true }, // ex: "Baixa por explosão", "Cálculo de custos", "Transferência"
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text', required: true },
          { name: 'operacao', type: 'text', required: false },
          { name: 'data_hora_confirmacao', type: 'text', required: true },
          { name: 'data_hora_geracao_pendencia', type: 'text', required: true },
          { name: 'sap_message', type: 'text', required: true }, // Preservada ipsi literis
          { name: 'sap_msg_code', type: 'text', required: true },
          { name: 'sap_status', type: 'text', required: false },
          { name: 'idade_horas', type: 'number', required: false },
          {
            name: 'categoria_ia',
            type: 'select',
            required: true,
            values: [
              'Estoque',
              'Saldo/Reserva',
              'Contábil',
              'Cadastro',
              'Lote',
              'Ordem de Produção',
              'Confirmação',
              'Integração',
              'Outros',
            ],
            maxSelect: 1,
          },
          {
            name: 'criticality',
            type: 'select',
            required: true,
            values: ['CRITICA', 'URGENTE', 'ATENCAO', 'BAIXA'],
            maxSelect: 1,
          },
          { name: 'area_responsavel_sugerida', type: 'text', required: true },
          {
            name: 'treatment_status',
            type: 'select',
            required: true,
            values: [
              'Nova',
              'Em análise',
              'Em tratamento',
              'Aguardando outra área',
              'Corrigida',
              'Aguardando reprocessamento SAP',
              'Reprocessada',
              'Não resolvida',
              'Encerrada',
            ],
            maxSelect: 1,
          },
          { name: 'responsavel_tratamento_id', type: 'text', required: false },
          { name: 'responsavel_tratamento_nome', type: 'text', required: false },
          { name: 'sgq_document_code', type: 'text', required: false },
          { name: 'sgq_document_title', type: 'text', required: false },
          { name: 'sgq_document_revision', type: 'text', required: false },
          { name: 'impacta_programacao', type: 'bool', required: false },
          { name: 'bloqueia_fechamento', type: 'bool', required: false },
          { name: 'reincidente', type: 'bool', required: false },
          { name: 'reincidencia_chave', type: 'text', required: false },
          { name: 'recorrencia_count', type: 'number', required: false },
          { name: 'ai_diagnosis_facts', type: 'json', required: false },
          { name: 'ai_diagnosis_hypotheses', type: 'json', required: false },
          { name: 'ai_recommended_action', type: 'json', required: false },
          { name: 'treatment_notes', type: 'text', required: false },
          { name: 'is_demo', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_co1p_op ON sap_co1p_pendencies (op_number)',
          'CREATE INDEX idx_co1p_conf ON sap_co1p_pendencies (confirmation_number)',
          'CREATE INDEX idx_co1p_mat ON sap_co1p_pendencies (material_code)',
          'CREATE INDEX idx_co1p_centro ON sap_co1p_pendencies (centro_code)',
          'CREATE INDEX idx_co1p_crit ON sap_co1p_pendencies (criticality)',
          'CREATE INDEX idx_co1p_cat ON sap_co1p_pendencies (categoria_ia)',
          'CREATE INDEX idx_co1p_status ON sap_co1p_pendencies (treatment_status)',
          'CREATE INDEX idx_co1p_reinc ON sap_co1p_pendencies (reincidencia_chave)',
        ],
      })
      app.save(co1pCol)
    }

    // 5. Coleção: sap_pendencies_audit_logs (Trilha imutável de auditoria)
    let auditCol = null
    try {
      auditCol = app.findCollectionByNameOrId('sap_pendencies_audit_logs')
    } catch (_) {}

    if (!auditCol) {
      auditCol = new Collection({
        name: 'sap_pendencies_audit_logs',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: null, // Imutável
        deleteRule: null, // Imutável
        fields: [
          { name: 'pendency_type', type: 'text', required: true }, // 'COGI' ou 'CO1P'
          { name: 'pendency_id', type: 'text', required: true },
          { name: 'op_number', type: 'text', required: false },
          { name: 'material_code', type: 'text', required: false },
          { name: 'action', type: 'text', required: true },
          { name: 'previous_status', type: 'text', required: false },
          { name: 'new_status', type: 'text', required: false },
          { name: 'assigned_user_id', type: 'text', required: false },
          { name: 'assigned_user_name', type: 'text', required: false },
          { name: 'sgq_document_code', type: 'text', required: false },
          { name: 'comment', type: 'text', required: false },
          { name: 'ai_analysis_generated', type: 'json', required: false },
          { name: 'user_id', type: 'text', required: false },
          { name: 'user_name', type: 'text', required: false },
          { name: 'user_email', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_spal_pend ON sap_pendencies_audit_logs (pendency_id)',
          'CREATE INDEX idx_spal_op ON sap_pendencies_audit_logs (op_number)',
          'CREATE INDEX idx_spal_created ON sap_pendencies_audit_logs (created DESC)',
        ],
      })
      app.save(auditCol)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('sap_pendencies_audit_logs'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sap_co1p_pendencies'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sap_cogi_pendencies'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sap_pendencies_sgq_mapping'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sap_pendencies_config'))
    } catch (_) {}
  },
)
