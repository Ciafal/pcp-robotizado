migrate(
  (app) => {
    // mp_cutting_piece_applications (Distribuição Otimizada de Aplicações por Peça)
    if (!app.hasTable('mp_cutting_piece_applications')) {
      const collection = new Collection({
        name: 'mp_cutting_piece_applications',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          new TextField({
            name: 'piece_identifier',
            required: true,
          }),
          new TextField({
            name: 'scenario_id',
            required: true,
          }),
          new TextField({
            name: 'scenario_name',
            required: false,
          }),
          new TextField({
            name: 'material_code',
            required: true,
          }),
          new TextField({
            name: 'gauge_dimension',
            required: false,
          }),
          new TextField({
            name: 'center_code',
            required: false,
          }),
          new TextField({
            name: 'heat_number',
            required: false,
          }),
          new NumberField({
            name: 'piece_weight_kg',
            required: false,
            min: 0,
          }),
          new NumberField({
            name: 'linear_mass_kg_m',
            required: true,
            min: 0.001,
          }),
          new NumberField({
            name: 'rolled_length_mm',
            required: false,
            min: 0,
          }),
          new NumberField({
            name: 'saw_kerf_mm',
            required: false,
            min: 0,
          }),
          new NumberField({
            name: 'squaring_loss_mm',
            required: false,
            min: 0,
          }),
          new NumberField({
            name: 'end_crop_loss_mm',
            required: false,
            min: 0,
          }),
          new NumberField({
            name: 'cutting_yield_pct',
            required: false,
            min: 0,
            max: 100,
          }),
          new NumberField({
            name: 'used_length_mm',
            required: false,
            min: 0,
          }),
          new NumberField({
            name: 'cut_losses_length_mm',
            required: false,
            min: 0,
          }),
          new NumberField({
            name: 'usable_leftover_mm',
            required: false,
            min: 0,
          }),
          new NumberField({
            name: 'scrap_mm',
            required: false,
            min: 0,
          }),
          new NumberField({
            name: 'generated_pieces_count',
            required: false,
            min: 0,
          }),
          new NumberField({
            name: 'fulfilled_applications_count',
            required: false,
            min: 0,
          }),
          new JSONField({
            name: 'allocated_items_json',
            required: true,
          }),
          new JSONField({
            name: 'visual_segments_json',
            required: false,
          }),
          new TextField({
            name: 'confirmed_by_user_name',
            required: false,
          }),
          new TextField({
            name: 'notes',
            required: false,
          }),
        ],
        indexes: [
          'CREATE INDEX idx_mp_cpa_piece ON mp_cutting_piece_applications (piece_identifier)',
          'CREATE INDEX idx_mp_cpa_scenario ON mp_cutting_piece_applications (scenario_id)',
          'CREATE INDEX idx_mp_cpa_mat ON mp_cutting_piece_applications (material_code)',
        ],
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      if (app.hasTable('mp_cutting_piece_applications')) {
        const col = app.findCollectionByNameOrId('mp_cutting_piece_applications')
        app.delete(col)
      }
    } catch (_) {}
  },
)
