/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Coleção: pcp_mp_inventory_orders (Cabeçalho do Inventário Diário de MP para Enfornamento)
    if (!app.hasTable('pcp_mp_inventory_orders')) {
      const headerCol = new Collection({
        name: 'pcp_mp_inventory_orders',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'inventory_code', type: 'text', required: true },
          { name: 'control_key', type: 'text', required: true }, // Empresa|Linha|Centro|DataProg|Versao
          { name: 'company', type: 'text', required: true }, // CIAFAL
          { name: 'line', type: 'text', required: true }, // L1
          { name: 'center', type: 'text', required: true }, // FORNOL1
          { name: 'responsible_sector', type: 'text', required: true }, // DP07 — Preparação de Tarugos
          { name: 'schedule_date', type: 'text', required: true }, // YYYY-MM-DD
          { name: 'schedule_version', type: 'number', required: true },
          { name: 'schedule_code', type: 'text' },
          {
            name: 'programming_type',
            type: 'text',
            required: true,
          }, // Enfornamento
          {
            name: 'enfornamento_type',
            type: 'text',
            required: true,
          }, // FRIO
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'Aguardando Inventário',
              'Em Inventário',
              'Inventário Parcial',
              'Inventário Concluído',
              'Divergência Encontrada',
              'Aguardando Material',
              'Material Bloqueado',
              'Preparação em Andamento',
              'Pronto para Enfornamento',
              'Cancelado',
              'Substituído por Nova Versão',
            ],
            maxSelect: 1,
          },
          { name: 'orders_count', type: 'number' },
          { name: 'total_tons_required', type: 'number' },
          { name: 'total_pieces_required', type: 'number' },
          { name: 'total_pieces_inventoried', type: 'number' },
          { name: 'divergent_materials_count', type: 'number' },
          { name: 'pending_materials_count', type: 'number' },
          { name: 'ready_orders_count', type: 'number' },
          { name: 'delay_risk_orders_count', type: 'number' },
          { name: 'generated_at', type: 'text', required: true },
          { name: 'generated_by', type: 'text' },
          { name: 'last_updated_at', type: 'text' },
          { name: 'last_updated_by', type: 'text' },
          { name: 'notification_status', type: 'text' }, // ex: DISPARO_REGISTRADO_SISTEMA_CANAL_NOTIF_PENDENTE
          { name: 'mes_dispatch_status', type: 'text' }, // ex: DISPARO_REGISTRADO_SISTEMA_CANAL_NOTIF_PENDENTE
          { name: 'sap_sync_status', type: 'text' }, // ex: AGUARDANDO_CONEXAO_SAP
          { name: 'wms_sync_status', type: 'text' }, // ex: AGUARDANDO_CONEXAO_WMS
          { name: 'metadata', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pcp_mp_inv_code ON pcp_mp_inventory_orders (inventory_code)',
          'CREATE UNIQUE INDEX idx_pcp_mp_inv_control ON pcp_mp_inventory_orders (control_key)',
          'CREATE INDEX idx_pcp_mp_inv_date ON pcp_mp_inventory_orders (schedule_date)',
          'CREATE INDEX idx_pcp_mp_inv_status ON pcp_mp_inventory_orders (status)',
        ],
      })
      app.save(headerCol)
    }

    // 2. Coleção: pcp_mp_inventory_items (Itens Operacionais do Inventário com 22 campos exatos e rastreabilidade de origem)
    if (!app.hasTable('pcp_mp_inventory_items')) {
      const itemsCol = new Collection({
        name: 'pcp_mp_inventory_items',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'inventory_id', type: 'text', required: true },
          { name: 'inventory_code', type: 'text', required: true },
          { name: 'item_control_key', type: 'text', required: true }, // Empresa|Linha|Centro|Data|Versao|Ordem|Material|Corrida
          // Campos exatos especificados no Requisito 5 com suas respectivas origens
          { name: 'company', type: 'text', required: true }, // PCP
          { name: 'line', type: 'text', required: true }, // PCP
          { name: 'center', type: 'text', required: true }, // PCP
          { name: 'enfornamento_date', type: 'text', required: true }, // PCP (Data Enfornamento DD/MM/AAAA ou YYYY-MM-DD)
          { name: 'expected_enfornamento_time', type: 'text', required: true }, // PCP (Hora Prevista Enfornamento HH:mm)
          { name: 'production_order', type: 'text', required: true }, // PCP/SAP (Ordem)
          { name: 'raw_material_code', type: 'text', required: true }, // SAP (Código Matéria-Prima)
          { name: 'raw_material_description', type: 'text', required: true }, // SAP (Descrição Matéria-Prima)
          { name: 'heat_number', type: 'text', required: true }, // SAP (Corrida/Lote)
          { name: 'produced_gauge_product', type: 'text', required: true }, // PCP/SAP (Bitola/Produto Produzido)
          { name: 'enfornamento_type', type: 'text', required: true }, // PCP (Tipo de Enfornamento: FRIO)
          { name: 'sap_stock_tons', type: 'number' }, // SAP (Estoque SAP em t)
          { name: 'planned_requirement_tons', type: 'number', required: true }, // PCP (Necessidade em t)
          { name: 'sap_pieces_count', type: 'number' }, // SAP (Nº Peças SAP)
          { name: 'wms_physical_location', type: 'text' }, // WMS (Localização Física: Galpão/Área/Endereço)
          { name: 'wms_warehouse', type: 'text' }, // WMS (Galpão)
          { name: 'wms_address', type: 'text' }, // WMS (Endereço WM/WMS)
          { name: 'wms_stock_status', type: 'text' }, // WMS (Situação / Disponibilidade / Bloqueios)
          { name: 'is_material_blocked', type: 'bool' }, // WMS (Material Bloqueado)
          { name: 'is_material_located', type: 'bool' }, // WMS (Material Localizado)
          // Campos editáveis pelo DP07 (Requisito 6)
          { name: 'dp07_inventoried_pieces', type: 'number' }, // DP07 (Nº Peças Inventariadas)
          { name: 'dp07_enfornamento_sequence', type: 'number' }, // DP07 (Sequência de Enfornamento informada)
          { name: 'dp07_observation', type: 'text' }, // DP07 (Observação)
          // Campos de cálculo e status do Sistema
          { name: 'pcp_planned_sequence', type: 'number', required: true }, // PCP (Sequência planejada original)
          { name: 'pieces_divergence', type: 'number' }, // Sistema (Nº Peças Inventariadas − Nº Peças SAP)
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'Aguardando Inventário',
              'Em Inventário',
              'Inventário Parcial',
              'Inventário Concluído',
              'Divergência Encontrada',
              'Aguardando Material',
              'Material Bloqueado',
              'Preparação em Andamento',
              'Pronto para Enfornamento',
              'Cancelado',
              'Substituído por Nova Versão',
            ],
            maxSelect: 1,
          },
          { name: 'responsible_user', type: 'text' }, // Sistema (Responsável pela atualização)
          { name: 'updated_at_timestamp', type: 'text' }, // Sistema (Data/Hora Atualização)
          // Marcadores de integridade e inteligência histórica (Requisitos 4, 19, 22)
          { name: 'sap_snapshot_data', type: 'json' }, // Snapshot dos dados SAP na geração
          { name: 'wms_snapshot_data', type: 'json' }, // Snapshot dos dados WMS na geração
          { name: 'schedule_version', type: 'number', required: true },
          { name: 'is_active', type: 'bool' }, // Ativo na versão vigente
          { name: 'cancelled_reason', type: 'text' }, // Se deixou de ser FRIO ou ordem cancelada
          { name: 'ready_at', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pcp_mp_items_inv ON pcp_mp_inventory_items (inventory_id)',
          'CREATE UNIQUE INDEX idx_pcp_mp_items_ctrl ON pcp_mp_inventory_items (item_control_key)',
          'CREATE INDEX idx_pcp_mp_items_order ON pcp_mp_inventory_items (production_order)',
          'CREATE INDEX idx_pcp_mp_items_heat ON pcp_mp_inventory_items (heat_number)',
          'CREATE INDEX idx_pcp_mp_items_status ON pcp_mp_inventory_items (status)',
        ],
      })
      app.save(itemsCol)
    }

    // 3. Coleção: pcp_mp_inventory_occurrences (Ocorrências de Divergência SAP x Físico para tratamento no WMS - Requisito 7 e 13)
    if (!app.hasTable('pcp_mp_inventory_occurrences')) {
      const occCol = new Collection({
        name: 'pcp_mp_inventory_occurrences',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'occurrence_code', type: 'text', required: true },
          { name: 'inventory_id', type: 'text', required: true },
          { name: 'inventory_item_id', type: 'text', required: true },
          { name: 'production_order', type: 'text', required: true },
          { name: 'raw_material_code', type: 'text', required: true },
          { name: 'heat_number', type: 'text', required: true },
          { name: 'divergence_type', type: 'text', required: true }, // PEÇAS_FALTANTES, PEÇAS_SOBRANTES, MATERIAL_NAO_LOCALIZADO, MATERIAL_BLOQUEADO, SEQUENCIA_ALTERADA
          { name: 'sap_pieces', type: 'number' },
          { name: 'inventoried_pieces', type: 'number' },
          { name: 'divergence_pieces', type: 'number' },
          { name: 'divergence_tons', type: 'number' },
          { name: 'wms_location', type: 'text' },
          { name: 'status', type: 'text', required: true }, // REGISTRADA_WMS, EM_ANALISE_WMS, RESOLVIDA, BAIXA_AUTORIZADA
          { name: 'dp07_observation', type: 'text' },
          { name: 'reported_by', type: 'text' },
          { name: 'reported_at', type: 'text', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pcp_mp_occ_code ON pcp_mp_inventory_occurrences (occurrence_code)',
          'CREATE INDEX idx_pcp_mp_occ_inv ON pcp_mp_inventory_occurrences (inventory_id)',
          'CREATE INDEX idx_pcp_mp_occ_item ON pcp_mp_inventory_occurrences (inventory_item_id)',
        ],
      })
      app.save(occCol)
    }

    // 4. Coleção: pcp_mp_inventory_history (Histórico Imutável de Auditoria, Edições e IA - Requisitos 19, 20 e 22)
    if (!app.hasTable('pcp_mp_inventory_history')) {
      const histCol = new Collection({
        name: 'pcp_mp_inventory_history',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'inventory_id', type: 'text', required: true },
          { name: 'inventory_item_id', type: 'text' },
          { name: 'event_type', type: 'text', required: true }, // AUTO_GERACAO, EDICAO_DP07, CONCLUSAO_PREPARACAO, NOVA_VERSAO, CANCELAMENTO_ITEM, NOTIFICACAO_DISPARADA, RETORNO_MES
          { name: 'user_name', type: 'text', required: true },
          { name: 'user_id', type: 'text' },
          { name: 'schedule_version', type: 'number' },
          { name: 'previous_value', type: 'json' },
          { name: 'new_value', type: 'json' },
          { name: 'divergence_snapshot', type: 'json' },
          { name: 'lead_time_seconds', type: 'number' },
          { name: 'description', type: 'text' },
          { name: 'timestamp', type: 'text', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pcp_mp_hist_inv ON pcp_mp_inventory_history (inventory_id)',
          'CREATE INDEX idx_pcp_mp_hist_evt ON pcp_mp_inventory_history (event_type)',
        ],
      })
      app.save(histCol)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('pcp_mp_inventory_history'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_mp_inventory_occurrences'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_mp_inventory_items'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pcp_mp_inventory_orders'))
    } catch (_) {}
  },
)
