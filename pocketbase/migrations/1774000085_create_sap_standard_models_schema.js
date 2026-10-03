migrate(
  (app) => {
    // 1. Coleção sap_standard_models (Códigos Modelos Padrão homologados para sugestão na Validação SAP)
    let standardModelsCol = null
    try {
      standardModelsCol = app.findCollectionByNameOrId('sap_standard_models')
    } catch (_) {}

    if (!standardModelsCol) {
      standardModelsCol = new Collection({
        name: 'sap_standard_models',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: null, // Exclusão física bloqueada por regra de negócio (preservar histórico e auditoria)
        fields: [
          { name: 'material_code', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'material_type', type: 'text', required: true },
          { name: 'line_id', type: 'text', required: true },
          { name: 'line_code', type: 'text', required: false },
          { name: 'company_id', type: 'text', required: true },
          { name: 'company_code', type: 'text', required: false },
          { name: 'company_name', type: 'text', required: false },
          { name: 'center', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ATIVO', 'INATIVO'],
            maxSelect: 1,
          },
          { name: 'created_by_user_id', type: 'text', required: false },
          { name: 'created_by_user_name', type: 'text', required: false },
          { name: 'updated_by_user_id', type: 'text', required: false },
          { name: 'updated_by_user_name', type: 'text', required: false },
          { name: 'notes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ssm_code ON sap_standard_models (material_code)',
          'CREATE INDEX idx_ssm_type ON sap_standard_models (material_type)',
          'CREATE INDEX idx_ssm_center ON sap_standard_models (center)',
          'CREATE INDEX idx_ssm_line ON sap_standard_models (line_id)',
          'CREATE INDEX idx_ssm_company ON sap_standard_models (company_id)',
          'CREATE INDEX idx_ssm_status ON sap_standard_models (status)',
          'CREATE UNIQUE INDEX idx_ssm_unique_combo ON sap_standard_models (material_code, material_type, line_id, company_id, center)',
        ],
      })
      app.save(standardModelsCol)
    }

    // 2. Registrar permissões RBAC para Códigos Modelos Padrão
    try {
      const permsCol = app.findCollectionByNameOrId('pcp_permissions')
      const permissionsToSeed = [
        {
          key: 'pcp.sap_validation.models.view',
          name: 'Visualizar Códigos Modelos Padrão',
          category: 'Cadastros',
          description: 'Acesso à consulta dos códigos modelos padrão cadastrados no PCP',
          is_critical: false,
        },
        {
          key: 'pcp.sap_validation.models.manage',
          name: 'Gerenciar Códigos Modelos Padrão',
          category: 'Cadastros',
          description: 'Cadastrar, editar e ativar/inativar códigos modelos de referência',
          is_critical: false,
        },
      ]

      for (let i = 0; i < permissionsToSeed.length; i++) {
        const p = permissionsToSeed[i]
        try {
          app.findFirstRecordByData('pcp_permissions', 'key', p.key)
        } catch (_) {
          const rec = new Record(permsCol)
          rec.set('key', p.key)
          rec.set('name', p.name)
          rec.set('category', p.category)
          rec.set('description', p.description)
          rec.set('is_critical', p.is_critical)
          app.save(rec)
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('sap_standard_models')
      app.delete(col)
    } catch (_) {}
  },
)
