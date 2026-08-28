migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const linesCol = app.findCollectionByNameOrId('production_lines')

    // 1. Famílias de Produtos
    const productFamilies = new Collection({
      name: 'product_families',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'PCP_ADMIN'",
      updateRule: "@request.auth.role = 'PCP_ADMIN'",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        { name: 'code', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'category', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_pf_code ON product_families (code)'],
    })
    app.save(productFamilies)

    // 2. Ficha Mestre da Linha (Versionada)
    const lineMasters = new Collection({
      name: 'line_masters',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'version', type: 'number', required: true, min: 1, onlyInt: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['DRAFT', 'ACTIVE', 'SUPERSEDED', 'INACTIVE'],
          maxSelect: 1,
        },

        // Identificação estrutural
        { name: 'code', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        {
          name: 'resource_type',
          type: 'select',
          required: true,
          values: [
            'PRODUCTION_LINE',
            'FURNACE',
            'FINISHING',
            'STRAIGHTENER',
            'REWORK',
            'AUXILIARY_PROCESS',
            'STORAGE',
            'OTHER',
          ],
          maxSelect: 1,
        },
        { name: 'unit', type: 'text', required: true },
        { name: 'sap_plant_code', type: 'text' },
        { name: 'sector', type: 'text' },
        { name: 'process_step', type: 'text' },

        // Responsáveis
        {
          name: 'primary_responsible_id',
          type: 'relation',
          collectionId: usersCol.id,
          maxSelect: 1,
        },
        {
          name: 'substitute_responsible_id',
          type: 'relation',
          collectionId: usersCol.id,
          maxSelect: 1,
        },

        // Capacidade produtiva estrutural
        {
          name: 'capacity_unit',
          type: 'select',
          required: true,
          values: ['t/h', 't', 'kg', 'peça', 'm', 'mm', 'h', 'min'],
          maxSelect: 1,
        },
        { name: 'nominal_hourly_capacity', type: 'number', min: 0 },
        { name: 'nominal_shift_capacity', type: 'number', min: 0 },
        { name: 'nominal_daily_capacity', type: 'number', min: 0 },
        { name: 'nominal_monthly_capacity', type: 'number', min: 0 },
        { name: 'planned_efficiency_pct', type: 'number', min: 0, max: 100 },
        { name: 'max_recommended_utilization_pct', type: 'number', min: 0, max: 100 },
        { name: 'min_batch_size', type: 'number', min: 0 },
        { name: 'max_batch_size', type: 'number', min: 0 },
        { name: 'capacity_notes', type: 'text' },

        // Estoques intermediários / Buffer
        { name: 'input_buffer_type', type: 'text' },
        { name: 'input_buffer_capacity', type: 'number', min: 0 },
        { name: 'input_buffer_unit', type: 'text' },
        { name: 'output_buffer_type', type: 'text' },
        { name: 'output_buffer_capacity', type: 'number', min: 0 },
        { name: 'output_buffer_unit', type: 'text' },

        // Dependências industriais (Resumo)
        { name: 'upstream_line_id', type: 'relation', collectionId: linesCol.id, maxSelect: 1 },
        { name: 'downstream_line_id', type: 'relation', collectionId: linesCol.id, maxSelect: 1 },
        { name: 'dependency_notes', type: 'text' },

        // Governança e Vigência
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        {
          name: 'source_type',
          type: 'select',
          values: ['MANUAL_CONFIG', 'SAP', 'ENGINEERING', 'PCP_RULE', 'IMPORTED', 'SYSTEM'],
          maxSelect: 1,
        },
        { name: 'author_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
        { name: 'author_email', type: 'text' },
        { name: 'change_reason', type: 'text' },
        { name: 'technical_notes', type: 'text' },
        { name: 'diff_payload', type: 'json' },

        // Indicadores calculados
        { name: 'completeness_score', type: 'number', min: 0, max: 100 },
        { name: 'ready_for_scheduling', type: 'bool' },
        { name: 'missing_requirements', type: 'json' },

        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_lm_version ON line_masters (line_id, version)',
        'CREATE INDEX idx_lm_status ON line_masters (status)',
        'CREATE INDEX idx_lm_code ON line_masters (code)',
      ],
    })
    app.save(lineMasters)

    // 3. Turnos da Linha
    const productionShifts = new Collection({
      name: 'production_shifts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'line_master_id',
          type: 'relation',
          collectionId: lineMasters.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'start_time', type: 'text', required: true }, // "HH:MM"
        { name: 'end_time', type: 'text', required: true }, // "HH:MM"
        { name: 'duration_hours', type: 'number', required: true, min: 0 },
        { name: 'break_minutes', type: 'number', min: 0 },
        { name: 'applicable_days', type: 'json' }, // ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"]
        { name: 'crosses_midnight', type: 'bool' },
        { name: 'is_special_shift', type: 'bool' },
        { name: 'active', type: 'bool' },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_ps_line ON production_shifts (line_id, active)'],
    })
    app.save(productionShifts)

    // 4. Calendário Produtivo
    const productionCalendars = new Collection({
      name: 'production_calendars',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'line_master_id',
          type: 'relation',
          collectionId: lineMasters.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'year', type: 'number', required: true },
        { name: 'month', type: 'number', min: 1, max: 12 },
        { name: 'operating_days_count', type: 'number', min: 0 },
        { name: 'work_saturdays', type: 'bool' },
        { name: 'work_sundays', type: 'bool' },
        { name: 'work_holidays', type: 'bool' },
        { name: 'holidays_dates', type: 'json' },
        { name: 'scheduled_shutdown_periods', type: 'json' },
        { name: 'special_schedules', type: 'json' },
        { name: 'active', type: 'bool' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pc_line_year ON production_calendars (line_id, year)'],
    })
    app.save(productionCalendars)

    // 5. Paradas Programadas Padrão (Manutenção Preventiva, Limpeza, Troca Eletrodo, etc.)
    // ATENÇÃO: NÃO CONTÉM PARADAS EXTRAORDINÁRIAS (QUE VIRÃO VIA SAP ZPP003)
    const standardScheduledStops = new Collection({
      name: 'standard_scheduled_stops',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'line_master_id',
          type: 'relation',
          collectionId: lineMasters.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'code', type: 'text', required: true },
        { name: 'description', type: 'text', required: true },
        {
          name: 'category',
          type: 'select',
          required: true,
          values: [
            'PREVENTIVE_MAINTENANCE',
            'CLEANING',
            'CALIBRATION',
            'TOOL_CHANGE',
            'INSPECTION',
            'OPERATIONAL_BREAK',
            'OTHER',
          ],
          maxSelect: 1,
        },
        {
          name: 'recurrence',
          type: 'select',
          required: true,
          values: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'PER_SHIFT', 'PER_BATCH', 'CUSTOM'],
          maxSelect: 1,
        },
        { name: 'expected_duration_minutes', type: 'number', required: true, min: 1 },
        { name: 'scheduled_time', type: 'text' }, // "07:00"
        { name: 'applicable_shift', type: 'text' },
        { name: 'applicable_days', type: 'json' },
        { name: 'expected_impact', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_sss_line ON standard_scheduled_stops (line_id, active)'],
    })
    app.save(standardScheduledStops)

    // 6. Setups Estruturais
    const lineSetups = new Collection({
      name: 'line_setups',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'line_master_id',
          type: 'relation',
          collectionId: lineMasters.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'code', type: 'text', required: true },
        { name: 'description', type: 'text', required: true },
        {
          name: 'category',
          type: 'select',
          required: true,
          values: [
            'TOOL_CHANGE',
            'DIMENSION_CHANGE',
            'MATERIAL_CHANGE',
            'COLOR_CHANGE',
            'CLEANING_SETUP',
            'HEATING_CYCLE',
            'OTHER',
          ],
          maxSelect: 1,
        },
        { name: 'standard_duration_minutes', type: 'number', required: true, min: 0 },
        { name: 'affected_resource', type: 'text' },
        {
          name: 'setup_type',
          type: 'select',
          values: ['INTERNAL', 'EXTERNAL', 'COMBINED'],
          maxSelect: 1,
        },
        {
          name: 'from_family_id',
          type: 'relation',
          collectionId: productFamilies.id,
          maxSelect: 1,
        },
        { name: 'to_family_id', type: 'relation', collectionId: productFamilies.id, maxSelect: 1 },
        { name: 'technical_notes', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_ls_line ON line_setups (line_id, active)'],
    })
    app.save(lineSetups)

    // 7. Capabilities e Famílias Produtivas
    const lineCapabilities = new Collection({
      name: 'line_capabilities',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'line_master_id',
          type: 'relation',
          collectionId: lineMasters.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'product_family_id',
          type: 'relation',
          required: true,
          collectionId: productFamilies.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'product_type', type: 'text' },
        { name: 'section_type', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ALLOWED', 'RESTRICTED', 'PROHIBITED', 'UNDER_TEST'],
          maxSelect: 1,
        },

        // Limites dimensionais estruturais
        { name: 'min_dimension_mm', type: 'number', min: 0 },
        { name: 'max_dimension_mm', type: 'number', min: 0 },
        { name: 'min_thickness_mm', type: 'number', min: 0 },
        { name: 'max_thickness_mm', type: 'number', min: 0 },
        { name: 'min_length_mm', type: 'number', min: 0 },
        { name: 'max_length_mm', type: 'number', min: 0 },
        { name: 'min_weight_kg', type: 'number', min: 0 },
        { name: 'max_weight_kg', type: 'number', min: 0 },

        { name: 'specific_capacity', type: 'number', min: 0 },
        { name: 'specific_capacity_unit', type: 'text' },
        { name: 'operating_conditions', type: 'text' },
        { name: 'technical_notes', type: 'text' },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_lc_line_fam ON line_capabilities (line_id, product_family_id)',
      ],
    })
    app.save(lineCapabilities)

    // 8. Restrições Estruturais da Linha (Somente físicas/físico-químicas, NÃO regras de sequenciamento)
    const lineStructuralConstraints = new Collection({
      name: 'line_structural_constraints',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'line_master_id',
          type: 'relation',
          collectionId: lineMasters.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'code', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        {
          name: 'classification',
          type: 'select',
          required: true,
          values: [
            'PHYSICAL_LIMIT',
            'CAPACITY_LIMIT',
            'DIMENSIONAL_LIMIT',
            'MATERIAL_COMPATIBILITY',
            'OPERATIONAL_LIMIT',
            'OTHER_STRUCTURAL',
          ],
          maxSelect: 1,
        },
        { name: 'parameter_name', type: 'text', required: true },
        { name: 'unit', type: 'text', required: true },
        { name: 'min_value', type: 'number' },
        { name: 'max_value', type: 'number' },
        { name: 'description', type: 'text', required: true },
        { name: 'impact', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_lsc_line ON line_structural_constraints (line_id, active)'],
    })
    app.save(lineStructuralConstraints)

    // 9. Referência a Rule Packs Futuros (Apenas metadados de associação)
    const lineRulePackRefs = new Collection({
      name: 'line_rule_pack_refs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'PCP_ADMIN'",
      updateRule: "@request.auth.role = 'PCP_ADMIN'",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'rule_pack_code', type: 'text', required: true },
        { name: 'rule_pack_name', type: 'text', required: true },
        { name: 'version', type: 'text', required: true },
        { name: 'status', type: 'text', required: true },
        { name: 'rules_count', type: 'number', min: 0 },
        { name: 'source', type: 'text' },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_lrpr_line ON line_rule_pack_refs (line_id)'],
    })
    app.save(lineRulePackRefs)
  },
  (app) => {
    const collections = [
      'line_rule_pack_refs',
      'line_structural_constraints',
      'line_capabilities',
      'line_setups',
      'standard_scheduled_stops',
      'production_calendars',
      'production_shifts',
      'line_masters',
      'product_families',
    ]
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
