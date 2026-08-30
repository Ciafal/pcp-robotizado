/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Coleção: integration_event (Fila e Log Completo de Eventos de Integração Ponta a Ponta)
    if (!app.hasTable('integration_event')) {
      const col = new Collection({
        name: 'integration_event',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'event_id', type: 'text', required: true }, // ex: "EVT-PCP-L1-2026-S35-V04-0001"
          { name: 'origem', type: 'text', required: true }, // "PCP"
          { name: 'destino', type: 'text', required: true }, // "MES" | "CRM" | "TMS" | "SAP" | "WMS"
          { name: 'tipo_evento', type: 'text', required: true }, // "PROGRAMACAO_PUBLICADA" | "ORDEM_REPROGRAMADA" | "PREVISAO_LOGISTICA_ATUALIZADA" | "OP_CRIADA_ATUALIZADA"
          { name: 'programacao_id', type: 'text', required: true }, // "WS-L1-2026-W35"
          { name: 'programacao_item_id', type: 'text' }, // ID do item específico ou material
          { name: 'versao', type: 'text', required: true }, // "V04"
          { name: 'versao_num', type: 'number' }, // 4
          { name: 'ambiente', type: 'text', required: true }, // "MOCK" | "HOMOLOGACAO" | "PRODUCAO"
          { name: 'payload', type: 'json' }, // Contrato tipado sem segredos técnicos
          {
            name: 'status',
            type: 'select',
            values: [
              'PENDENTE',
              'ENVIANDO',
              'ENVIADO',
              'RECEBIDO',
              'PROCESSADO',
              'ERRO',
              'INTERVENCAO_NECESSARIA',
              'EVENTO_JA_PROCESSADO',
              'NAO_APLICAVEL',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'tentativas', type: 'number', required: true }, // 1, 2, 3...
          { name: 'max_tentativas', type: 'number' }, // padrão 3
          { name: 'criado_em', type: 'text', required: true },
          { name: 'enviado_em', type: 'text' },
          { name: 'recebido_em', type: 'text' },
          { name: 'processado_em', type: 'text' },
          { name: 'retorno_em', type: 'text' },
          { name: 'mensagem_erro', type: 'text' },
          { name: 'retorno_payload', type: 'json' },
          { name: 'responsavel_acao', type: 'text' }, // Usuário que publicou, reconheceu ou visualizou
          { name: 'reconciliado', type: 'bool' },
          { name: 'reconciliado_em', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_ie_event_dest ON integration_event (event_id, destino)',
          'CREATE INDEX idx_ie_prog_ver ON integration_event (programacao_id, versao)',
          'CREATE INDEX idx_ie_status ON integration_event (status)',
          'CREATE INDEX idx_ie_dest_env ON integration_event (destino, ambiente)',
        ],
      })
      app.save(col)
    }

    // 2. Coleção: integration_connector_configs (Definição dos Conectores Reais / Mock / Homologação)
    if (!app.hasTable('integration_connector_configs')) {
      const col = new Collection({
        name: 'integration_connector_configs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'system_code', type: 'text', required: true }, // "SAP_ECC", "MES", "CRM_360", "TMS", "WMS"
          { name: 'system_name', type: 'text', required: true },
          { name: 'ambiente', type: 'text', required: true }, // "MOCK" | "HOMOLOGACAO" | "PRODUCAO"
          { name: 'interface_type', type: 'text', required: true }, // "REST_API" | "RFC_BAPI" | "POSTGRESQL_BRIDGE" | "EVENT_BUS_WEBHOOK" | "IDOC_FILE"
          { name: 'endpoint', type: 'text', required: true },
          { name: 'method', type: 'text', required: true }, // "POST /api/v1/events", "RFC ZPP_PROD", "PG_TABLE pcp_sap_bridge", "WEBHOOK /hooks/crm"
          {
            name: 'status',
            type: 'select',
            values: ['CONECTADO', 'DESCONECTADO', 'DEGRADADO', 'EM_TESTE'],
            maxSelect: 1,
            required: true,
          },
          { name: 'latency_ms', type: 'number' },
          { name: 'pending_queue_count', type: 'number' },
          { name: 'errors_count', type: 'number' },
          { name: 'last_communication_at', type: 'text' },
          { name: 'last_success_at', type: 'text' },
          { name: 'last_error_at', type: 'text' },
          { name: 'last_error_message', type: 'text' },
          { name: 'retry_policy_json', type: 'json' }, // { maxRetries: 3, backoffSec: 5, alertOnFailure: true }
          { name: 'description', type: 'text' },
          { name: 'admin_permission_required', type: 'text' }, // "pcp.integrations.manage"
          { name: 'updated_by_user', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_icc_sys_env ON integration_connector_configs (system_code, ambiente)',
        ],
      })
      app.save(col)

      // Seed inicial dos 5 conectores padrão
      const connectors = [
        {
          system_code: 'SAP_ECC',
          system_name: 'SAP ECC 6.0 EHP8 / S/4HANA (PCP -> PostgreSQL Bridge -> RFC ZPP_PROD)',
          ambiente: 'HOMOLOGACAO',
          interface_type: 'POSTGRESQL_BRIDGE',
          endpoint: 'pg://pcp_sap_bridge.tbl_schedule_sync',
          method: 'BATCH_JOB_RFC_ZPP_PROD',
          status: 'CONECTADO',
          latency_ms: 45,
          pending_queue_count: 0,
          errors_count: 0,
          last_communication_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          retry_policy_json: { maxRetries: 3, backoffSec: 10, alertOnFailure: true },
          description:
            'Modelo Oficial: PCP grava em PostgreSQL intermediário, programa SAP lê aprovados e atualiza OP, gravando retorno.',
          admin_permission_required: 'pcp.integrations.manage',
          updated_by_user: 'Engenharia de Sistemas CIAFAL',
        },
        {
          system_code: 'MES',
          system_name: 'MES Chão de Fábrica (Terminais de Linha L1..L6)',
          ambiente: 'HOMOLOGACAO',
          interface_type: 'EVENT_BUS_WEBHOOK',
          endpoint: 'https://mes-api.ciafal.local/v1/schedules/events',
          method: 'POST /v1/schedules/events',
          status: 'CONECTADO',
          latency_ms: 18,
          pending_queue_count: 0,
          errors_count: 0,
          last_communication_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          retry_policy_json: { maxRetries: 3, backoffSec: 3, alertOnFailure: true },
          description:
            'Notificação em tempo real de programação publicada com controle de visualização e ciência do operador líder.',
          admin_permission_required: 'pcp.integrations.manage',
          updated_by_user: 'Automação Industrial CIAFAL',
        },
        {
          system_code: 'CRM_360',
          system_name: 'CRM 360º Comercial CIAFAL (Carteira & Pedidos)',
          ambiente: 'HOMOLOGACAO',
          interface_type: 'REST_API',
          endpoint: 'https://crm.ciafal.com.br/api/v2/pcp-alerts',
          method: 'POST /api/v2/pcp-alerts',
          status: 'CONECTADO',
          latency_ms: 62,
          pending_queue_count: 0,
          errors_count: 0,
          last_communication_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          retry_policy_json: { maxRetries: 3, backoffSec: 5, alertOnFailure: true },
          description:
            'Recepção de reprogramações de alta relevância e MTO para notificação aos vendedores e representantes.',
          admin_permission_required: 'pcp.integrations.manage',
          updated_by_user: 'TI Comercial CIAFAL',
        },
        {
          system_code: 'TMS',
          system_name: 'TMS Logística & Gestão de Frotas',
          ambiente: 'HOMOLOGACAO',
          interface_type: 'REST_API',
          endpoint: 'https://tms.ciafal.com.br/api/v1/shipment-replan',
          method: 'POST /api/v1/shipment-replan',
          status: 'CONECTADO',
          latency_ms: 80,
          pending_queue_count: 0,
          errors_count: 0,
          last_communication_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          retry_policy_json: { maxRetries: 3, backoffSec: 5, alertOnFailure: true },
          description:
            'Reavaliação automática de consolidação de carga, disponibilidade de expedição e previsão de entrega ao cliente.',
          admin_permission_required: 'pcp.integrations.manage',
          updated_by_user: 'Logística CIAFAL',
        },
        {
          system_code: 'WMS',
          system_name: 'WMS Expedição & Pátio de Tarugos/Produtos Acabados',
          ambiente: 'HOMOLOGACAO',
          interface_type: 'REST_API',
          endpoint: 'https://wms.ciafal.local/api/v1/inventory-sync',
          method: 'POST /api/v1/inventory-sync',
          status: 'CONECTADO',
          latency_ms: 25,
          pending_queue_count: 0,
          errors_count: 0,
          last_communication_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          retry_policy_json: { maxRetries: 3, backoffSec: 5, alertOnFailure: true },
          description:
            'Sincronização de saldo físico em pátio e posições de estoque de produtos acabados.',
          admin_permission_required: 'pcp.integrations.manage',
          updated_by_user: 'Expedição CIAFAL',
        },
      ]

      for (const conn of connectors) {
        const rec = new Record(col)
        Object.entries(conn).forEach(([k, v]) => rec.set(k, v))
        app.save(rec)
      }
    }

    // 3. Permissões RBAC para Integrações e Modo de Teste
    const permCol = app.findCollectionByNameOrId('pcp_permissions')
    const permsToAdd = [
      {
        name: 'Gerenciar Integrações e Conectores PCP',
        key: 'pcp.integrations.manage',
        category: 'GOVERNANCE',
        description:
          'Permite configurar conectores (SAP, MES, CRM, TMS, WMS), testar conexões e alterar modo de ambiente (Mock/Homolog/Prod).',
        is_critical: true,
      },
      {
        name: 'Visualizar Monitor de Integrações',
        key: 'pcp.integrations.view',
        category: 'OPERATIONAL',
        description:
          'Permite visualizar o monitor de eventos ponta a ponta, histórico de envios, retentativas e reconciliações.',
        is_critical: false,
      },
      {
        name: 'Executar Reconciliação e Reprocessamento',
        key: 'pcp.integrations.reconcile',
        category: 'GOVERNANCE',
        description:
          'Permite disparar processos periódicos de reconciliação de versão (PCP x MES x SAP) e reprocessar eventos pendentes.',
        is_critical: true,
      },
    ]

    for (const p of permsToAdd) {
      try {
        app.findFirstRecordByData('pcp_permissions', 'key', p.key)
      } catch (_) {
        const rec = new Record(permCol)
        rec.set('name', p.name)
        rec.set('key', p.key)
        rec.set('category', p.category)
        rec.set('description', p.description)
        rec.set('is_critical', p.is_critical)
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      if (app.hasTable('integration_connector_configs')) {
        app.delete(app.findCollectionByNameOrId('integration_connector_configs'))
      }
      if (app.hasTable('integration_event')) {
        app.delete(app.findCollectionByNameOrId('integration_event'))
      }
    } catch (_) {}
  },
)
