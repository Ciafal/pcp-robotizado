migrate((app) => {
  // 1. Demanda de Inventário de Matéria-Prima
  if (!app.hasTable("pcp_mp_inventory_demands")) {
    const demandCol = new Collection({
      name: "pcp_mp_inventory_demands",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null, // Proibido exclusão física (append-only / auditoria)
      fields: [
        { name: "control_number", type: "text", required: true }, // ex. INV-2026-000001
        { name: "company", type: "text", required: true },
        { name: "line", type: "text", required: true },
        { name: "center", type: "text", required: true },
        { name: "storage_deposit", type: "text", required: true },
        { name: "material_code", type: "text", required: true },
        { name: "material_description", type: "text" },
        { name: "unit_of_measure", type: "text" },
        { name: "sap_stock", type: "number" },
        { name: "sap_last_sync", type: "text" },
        { name: "sap_query_status", type: "text" },
        { name: "priority", type: "select", values: ["Baixa", "Normal", "Alta", "Urgente"], required: true, maxSelect: 1 },
        { name: "status", type: "select", values: ["Gerada", "Em inventário", "Inventário parcial", "Inventário concluído", "Cancelada"], required: true, maxSelect: 1 },
        { name: "observation", type: "text" },
        { name: "requester_id", type: "text" },
        { name: "requester_name", type: "text" },
        { name: "requester_role", type: "text" },
        { name: "generation_date_formatted", type: "text" }, // 25/09/2026 19:35
        { name: "total_pieces_required", type: "number" },
        { name: "total_pieces_inventoried", type: "number" },
        { name: "divergence_pieces", type: "number" },
        { name: "divergence_pct", type: "number" },
        { name: "ai_suggestion_payload", type: "json" },
        { name: "cancellation_reason", type: "text" },
        { name: "cancelled_at", type: "text" },
        { name: "cancelled_by", type: "text" },
        { name: "concluded_at", type: "text" },
        { name: "concluded_by", type: "text" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_pcp_inv_dem_ctrl ON pcp_mp_inventory_demands (control_number)",
        "CREATE INDEX idx_pcp_inv_dem_status ON pcp_mp_inventory_demands (status)",
        "CREATE INDEX idx_pcp_inv_dem_center ON pcp_mp_inventory_demands (center)",
        "CREATE INDEX idx_pcp_inv_dem_mat ON pcp_mp_inventory_demands (material_code)"
      ]
    });
    app.save(demandCol);
  }

  // 2. Necessidade por Bitola / Aplicação (1:N com Demanda)
  if (!app.hasTable("pcp_mp_inventory_gauges")) {
    const gaugeCol = new Collection({
      name: "pcp_mp_inventory_gauges",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: "demand_id", type: "relation", collectionId: app.findCollectionByNameOrId("pcp_mp_inventory_demands").id, required: true, cascadeDelete: true, maxSelect: 1 },
        { name: "control_number", type: "text", required: true },
        { name: "gauge", type: "text", required: true },
        { name: "application", type: "text", required: true },
        { name: "quantity_required", type: "number", required: true },
        { name: "unit_of_measure", type: "text", required: true },
        { name: "suggested_run", type: "text" },
        { name: "run_stock", type: "number" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
      ],
      indexes: [
        "CREATE INDEX idx_pcp_inv_g_dem ON pcp_mp_inventory_gauges (demand_id)",
        "CREATE INDEX idx_pcp_inv_g_ctrl ON pcp_mp_inventory_gauges (control_number)"
      ]
    });
    app.save(gaugeCol);
  }

  // 3. Corridas vinculadas à Demanda (1:N com Demanda)
  if (!app.hasTable("pcp_mp_inventory_runs")) {
    const runCol = new Collection({
      name: "pcp_mp_inventory_runs",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: "demand_id", type: "relation", collectionId: app.findCollectionByNameOrId("pcp_mp_inventory_demands").id, required: true, cascadeDelete: true, maxSelect: 1 },
        { name: "control_number", type: "text", required: true },
        { name: "run_number", type: "text", required: true }, // ex. Corrida 458921
        { name: "batch_number", type: "text" },
        { name: "gauge", type: "text" },
        { name: "application", type: "text" },
        { name: "sap_stock_pieces", type: "number" },
        { name: "suggested_pieces", type: "number" },
        { name: "selected_pieces", type: "number" },
        { name: "is_ai_suggested", type: "bool" },
        { name: "is_manual_override", type: "bool" },
        { name: "ai_criteria", type: "text" },
        { name: "ai_justification", type: "text" },
        { name: "inventoried_pieces", type: "number" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
      ],
      indexes: [
        "CREATE INDEX idx_pcp_inv_r_dem ON pcp_mp_inventory_runs (demand_id)",
        "CREATE INDEX idx_pcp_inv_r_num ON pcp_mp_inventory_runs (run_number)"
      ]
    });
    app.save(runCol);
  }

  // 4. Lançamentos de Inventário (1:N por Corrida, cada Lançamento -> 1 Localização, 1 Quantidade, 1 Usuário, 1 Data/Hora)
  if (!app.hasTable("pcp_mp_inventory_entries")) {
    const entryCol = new Collection({
      name: "pcp_mp_inventory_entries",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: "demand_id", type: "relation", collectionId: app.findCollectionByNameOrId("pcp_mp_inventory_demands").id, required: true, cascadeDelete: true, maxSelect: 1 },
        { name: "run_id", type: "relation", collectionId: app.findCollectionByNameOrId("pcp_mp_inventory_runs").id, required: true, cascadeDelete: true, maxSelect: 1 },
        { name: "control_number", type: "text", required: true },
        { name: "run_number", type: "text", required: true },
        { name: "gauge", type: "text" },
        { name: "location_wms", type: "text", required: true }, // Autocomplete WMS / depósito
        { name: "pieces_count", type: "number", required: true }, // Inteiro >= 0
        { name: "entry_date_formatted", type: "text", required: true }, // dd/mm/aaaa hh:mm
        { name: "user_id", type: "text", required: true },
        { name: "user_name", type: "text", required: true },
        { name: "user_role", type: "text" },
        { name: "user_profile", type: "text" },
        { name: "notes", type: "text" },
        { name: "is_active", type: "bool" }, // exclusão lógica
        { name: "deleted_reason", type: "text" },
        { name: "deleted_by_name", type: "text" },
        { name: "deleted_at", type: "text" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
      ],
      indexes: [
        "CREATE INDEX idx_pcp_inv_e_dem ON pcp_mp_inventory_entries (demand_id)",
        "CREATE INDEX idx_pcp_inv_e_run ON pcp_mp_inventory_entries (run_id)",
        "CREATE INDEX idx_pcp_inv_e_loc ON pcp_mp_inventory_entries (location_wms)"
      ]
    });
    app.save(entryCol);
  }

  // 5. Timeline de Histórico e Auditoria Append-Only de Todos os Eventos (NADA apagável fisicamente)
  if (!app.hasTable("pcp_mp_inventory_audit_events")) {
    const auditCol = new Collection({
      name: "pcp_mp_inventory_audit_events",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null, // estritamente append-only
      deleteRule: null, // proibido apagar
      fields: [
        { name: "demand_id", type: "text", required: true },
        { name: "control_number", type: "text", required: true },
        { name: "event_type", type: "select", values: [
          "DEMANDA_GERADA",
          "CONSULTA_SAP",
          "RECOMENDACAO_IA",
          "ACEITE_IA",
          "ALTERACAO_MANUAL_CORRIDAS",
          "INVENTARIO_INICIADO",
          "LANCAMENTO_ADICIONADO",
          "LANCAMENTO_ALTERADO",
          "LANCAMENTO_EXCLUIDO_LOGICO",
          "SALVAMENTO_PARCIAL",
          "INVENTARIO_CONCLUIDO",
          "DEMANDA_CANCELADA"
        ], required: true, maxSelect: 1 },
        { name: "event_description", type: "text", required: true },
        { name: "run_number", type: "text" },
        { name: "location_wms", type: "text" },
        { name: "pieces_count", type: "number" },
        { name: "previous_value", type: "text" },
        { name: "new_value", type: "text" },
        { name: "origin", type: "text" }, // SAP, IA, USUARIO, SISTEMA
        { name: "result", type: "text" }, // SUCESSO, DIVERGENCIA, PENDENCIA
        { name: "user_id", type: "text" },
        { name: "user_name", type: "text" },
        { name: "user_role", type: "text" },
        { name: "event_timestamp_formatted", type: "text" },
        { name: "details_json", type: "json" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
      ],
      indexes: [
        "CREATE INDEX idx_pcp_inv_aud_dem ON pcp_mp_inventory_audit_events (demand_id)",
        "CREATE INDEX idx_pcp_inv_aud_ctrl ON pcp_mp_inventory_audit_events (control_number)",
        "CREATE INDEX idx_pcp_inv_aud_evt ON pcp_mp_inventory_audit_events (event_type)"
      ]
    });
    app.save(auditCol);
  }
}, (app) => {
  // Revert idempotent
  try {
    const col5 = app.findCollectionByNameOrId("pcp_mp_inventory_audit_events");
    app.delete(col5);
  } catch (_) {}
  try {
    const col4 = app.findCollectionByNameOrId("pcp_mp_inventory_entries");
    app.delete(col4);
  } catch (_) {}
  try {
    const col3 = app.findCollectionByNameOrId("pcp_mp_inventory_runs");
    app.delete(col3);
  } catch (_) {}
  try {
    const col2 = app.findCollectionByNameOrId("pcp_mp_inventory_gauges");
    app.delete(col2);
  } catch (_) {}
  try {
    const col1 = app.findCollectionByNameOrId("pcp_mp_inventory_demands");
    app.delete(col1);
  } catch (_) {}
});
