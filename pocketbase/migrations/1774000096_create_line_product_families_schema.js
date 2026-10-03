/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Collection line_product_families — Famílias Técnicas vinculadas ao Centro / Ficha Mestra
    if (!app.hasTable('line_product_families')) {
      const col = new Collection({
        name: 'line_product_families',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // Auditável: exclusão lógica / cancelamento apenas
        fields: [
          // Vínculo com a Linha / Centro
          { name: 'line_id', type: 'text', required: true },
          { name: 'line_master_id', type: 'text' },
          { name: 'center_code', type: 'text', required: true },
          { name: 'center_name', type: 'text' },

          // Identificação da Família
          { name: 'family_name', type: 'text', required: true },
          { name: 'family_code', type: 'text' },

          // Cilindro e Código Equipamento PM (SAP PM RFC)
          { name: 'cylinder_code', type: 'text', required: true },
          { name: 'cylinder_name', type: 'text' },
          { name: 'pm_equipment_code', type: 'text', required: true },
          { name: 'pm_equipment_name', type: 'text' },

          // Faixa de Matéria-Prima Admissível (mm)
          { name: 'min_mp_diameter_mm', type: 'number', required: true },
          { name: 'max_mp_diameter_mm', type: 'number', required: true },

          // Bitolas da Família (JSON estruturado com múltiplas bitolas: bitola, min_length_mm, max_length_mm)
          { name: 'gauges_json', type: 'json', required: true },
          { name: 'gauges_count', type: 'number', required: true },

          // Status Operacional
          { name: 'active', type: 'bool', required: true },

          // Observações técnicas
          { name: 'notes', type: 'text' },

          // Exclusão lógica / Auditoria
          { name: 'deleted', type: 'bool' },
          { name: 'deleted_at', type: 'text' },
          { name: 'deleted_by', type: 'text' },
          { name: 'created_by_user_id', type: 'text' },
          { name: 'created_by_user_name', type: 'text' },
          { name: 'updated_by_user_id', type: 'text' },
          { name: 'updated_by_user_name', type: 'text' },

          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_lpf_line ON line_product_families (line_id)',
          'CREATE INDEX idx_lpf_center ON line_product_families (center_code)',
          'CREATE INDEX idx_lpf_active ON line_product_families (active)',
          'CREATE INDEX idx_lpf_deleted ON line_product_families (deleted)',
          'CREATE INDEX idx_lpf_created ON line_product_families (created DESC)',
        ],
      })
      app.save(col)
    }

    // 2. Registrar permissões do módulo em pcp_permissions e vincular aos roles
    const perms = [
      {
        key: 'pcp.line_families.view',
        name: 'Visualizar Famílias da Ficha Mestra',
        category: 'Ficha Mestra',
        description:
          'Permite consultar o cadastro de famílias, cilindros e bitolas vinculado à Ficha Mestra.',
        is_critical: false,
      },
      {
        key: 'pcp.line_families.manage',
        name: 'Gerenciar Famílias da Ficha Mestra',
        category: 'Ficha Mestra',
        description:
          'Permite criar, editar e desativar famílias técnicas, cilindros e faixas de bitolas na Ficha Mestra.',
        is_critical: false,
      },
    ]

    const permIds = {}
    for (const p of perms) {
      let rec = null
      try {
        rec = app.findFirstRecordByData('pcp_permissions', 'key', p.key)
      } catch (_) {}
      if (!rec) {
        const pCol = app.findCollectionByNameOrId('pcp_permissions')
        rec = new Record(pCol, p)
        app.save(rec)
      }
      permIds[p.key] = rec.id
    }

    // Vincular permissões aos roles PCP_ADMIN e PCP_PROGRAMMER
    const roleAdmin = (() => {
      try {
        return app.findFirstRecordByData('pcp_roles', 'code', 'PCP_ADMIN')
      } catch (_) {
        return null
      }
    })()

    const roleProg = (() => {
      try {
        return app.findFirstRecordByData('pcp_roles', 'code', 'PCP_PROGRAMMER')
      } catch (_) {
        return null
      }
    })()

    const roleRpCol = (() => {
      try {
        return app.findCollectionByNameOrId('pcp_role_permissions')
      } catch (_) {
        return null
      }
    })()

    if (roleRpCol) {
      const grant = (roleId, permKey) => {
        if (!roleId || !permIds[permKey]) return
        try {
          const existing = app.findRecordsByFilter(
            'pcp_role_permissions',
            `role_id = '${roleId}' && permission_id = '${permIds[permKey]}'`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const r = new Record(roleRpCol, {
              role_id: roleId,
              permission_id: permIds[permKey],
            })
            app.save(r)
          }
        } catch (_) {}
      }

      if (roleAdmin) {
        grant(roleAdmin.id, 'pcp.line_families.view')
        grant(roleAdmin.id, 'pcp.line_families.manage')
      }

      if (roleProg) {
        grant(roleProg.id, 'pcp.line_families.view')
        grant(roleProg.id, 'pcp.line_families.manage')
      }
    }
  },
  (app) => {
    try {
      if (app.hasTable('line_product_families')) {
        app.delete(app.findCollectionByNameOrId('line_product_families'))
      }
    } catch (_) {}
  },
)
