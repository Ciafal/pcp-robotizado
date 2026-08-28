migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const linesCol = app.findCollectionByNameOrId('production_lines')

    // 1. Cadastro de EMPRESA (companies)
    // id, código, nome, razão social, CNPJ, status, timezone, moeda, SAP company code, descrição
    let companiesCol
    try {
      companiesCol = app.findCollectionByNameOrId('companies')
    } catch (_) {
      companiesCol = new Collection({
        name: 'companies',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'PCP_ADMIN'",
        updateRule: "@request.auth.role = 'PCP_ADMIN'",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'corporate_name', type: 'text' },
          { name: 'cnpj', type: 'text' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ACTIVE', 'INACTIVE'],
            maxSelect: 1,
          },
          { name: 'timezone', type: 'text' },
          { name: 'currency', type: 'text' },
          { name: 'sap_company_code', type: 'text' },
          { name: 'description', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_companies_code ON companies (code)'],
      })
      app.save(companiesCol)
    }

    // 2. Cadastro de PLANTA (plants)
    // id, código, nome, empresa, cidade, UF, país, centro/planta SAP, status, timezone, responsável
    let plantsCol
    try {
      plantsCol = app.findCollectionByNameOrId('plants')
    } catch (_) {
      plantsCol = new Collection({
        name: 'plants',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'PCP_ADMIN'",
        updateRule: "@request.auth.role = 'PCP_ADMIN'",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          {
            name: 'company_id',
            type: 'relation',
            required: true,
            collectionId: companiesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'city', type: 'text' },
          { name: 'state', type: 'text' },
          { name: 'country', type: 'text' },
          { name: 'sap_plant_code', type: 'text' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
            maxSelect: 1,
          },
          { name: 'timezone', type: 'text' },
          {
            name: 'responsible_user_id',
            type: 'relation',
            collectionId: usersCol.id,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_plants_code ON plants (code)'],
      })
      app.save(plantsCol)
    }

    // 3. Adicionar campos de hierarquia à production_lines se não existirem
    if (!linesCol.fields.getByName('plant_id')) {
      linesCol.fields.add(
        new RelationField({
          name: 'plant_id',
          collectionId: plantsCol.id,
          maxSelect: 1,
        }),
      )
    }
    if (!linesCol.fields.getByName('line_type')) {
      linesCol.fields.add(
        new TextField({
          name: 'line_type',
        }),
      )
    }
    if (!linesCol.fields.getByName('sap_work_center')) {
      linesCol.fields.add(
        new TextField({
          name: 'sap_work_center',
        }),
      )
    }
    if (!linesCol.fields.getByName('nominal_capacity')) {
      linesCol.fields.add(
        new NumberField({
          name: 'nominal_capacity',
          min: 0,
        }),
      )
    }
    if (!linesCol.fields.getByName('capacity_unit')) {
      linesCol.fields.add(
        new TextField({
          name: 'capacity_unit',
        }),
      )
    }
    if (!linesCol.fields.getByName('shifts_count')) {
      linesCol.fields.add(
        new NumberField({
          name: 'shifts_count',
          min: 1,
          max: 4,
        }),
      )
    }
    if (!linesCol.fields.getByName('manager_user_id')) {
      linesCol.fields.add(
        new RelationField({
          name: 'manager_user_id',
          collectionId: usersCol.id,
          maxSelect: 1,
        }),
      )
    }
    if (!linesCol.fields.getByName('pcp_programmer_user_id')) {
      linesCol.fields.add(
        new RelationField({
          name: 'pcp_programmer_user_id',
          collectionId: usersCol.id,
          maxSelect: 1,
        }),
      )
    }
    app.save(linesCol)

    // 4. Centros de Trabalho & Processos (work_centers)
    let workCentersCol
    try {
      workCentersCol = app.findCollectionByNameOrId('work_centers')
    } catch (_) {
      workCentersCol = new Collection({
        name: 'work_centers',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'PCP_ADMIN'",
        updateRule: "@request.auth.role = 'PCP_ADMIN'",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          {
            name: 'line_id',
            type: 'relation',
            required: true,
            collectionId: linesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'process_type', type: 'text' },
          { name: 'sap_work_center_code', type: 'text' },
          { name: 'nominal_capacity', type: 'number' },
          { name: 'capacity_unit', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_wc_code ON work_centers (code)'],
      })
      app.save(workCentersCol)
    }

    // 5. Recursos Físicos (resources)
    let resourcesCol
    try {
      resourcesCol = app.findCollectionByNameOrId('resources')
    } catch (_) {
      resourcesCol = new Collection({
        name: 'resources',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'PCP_ADMIN'",
        updateRule: "@request.auth.role = 'PCP_ADMIN'",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          {
            name: 'work_center_id',
            type: 'relation',
            required: true,
            collectionId: workCentersCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'sap_equipment_id', type: 'text' },
          { name: 'status', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_res_code ON resources (code)'],
      })
      app.save(resourcesCol)
    }

    // 6. Rule Packs com Escopo e Herança (rule_packs)
    let rulePacksCol
    try {
      rulePacksCol = app.findCollectionByNameOrId('rule_packs')
    } catch (_) {
      rulePacksCol = new Collection({
        name: 'rule_packs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'PCP_ADMIN'",
        updateRule: "@request.auth.role = 'PCP_ADMIN'",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'name', type: 'text', required: true },
          { name: 'version', type: 'text', required: true },
          {
            name: 'scope_level',
            type: 'select',
            required: true,
            values: ['GLOBAL', 'COMPANY', 'PLANT', 'LINE', 'RESOURCE'],
            maxSelect: 1,
          },
          { name: 'company_id', type: 'relation', collectionId: companiesCol.id, maxSelect: 1 },
          { name: 'plant_id', type: 'relation', collectionId: plantsCol.id, maxSelect: 1 },
          { name: 'line_id', type: 'relation', collectionId: linesCol.id, maxSelect: 1 },
          { name: 'resource_id', type: 'relation', collectionId: resourcesCol.id, maxSelect: 1 },
          { name: 'rules_payload', type: 'json' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ACTIVE', 'DRAFT', 'SUPERSEDED'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_rp_code_ver ON rule_packs (code, version)'],
      })
      app.save(rulePacksCol)
    }

    // 7. Seed Hierarquia Corporativa CIAFAL
    // Empresa CIAFAL
    let ciafalCompany
    try {
      ciafalCompany = app.findFirstRecordByData('companies', 'code', 'CIAFAL')
    } catch (_) {
      ciafalCompany = new Record(companiesCol)
      ciafalCompany.set('code', 'CIAFAL')
      ciafalCompany.set('name', 'CIAFAL Wilson Santos')
      ciafalCompany.set('corporate_name', 'CIAFAL Comércio e Indústria de Ferro e Aço Ltda.')
      ciafalCompany.set('cnpj', '17.283.940/0001-88')
      ciafalCompany.set('status', 'ACTIVE')
      ciafalCompany.set('timezone', 'America/Sao_Paulo')
      ciafalCompany.set('currency', 'BRL')
      ciafalCompany.set('sap_company_code', '1000')
      ciafalCompany.set(
        'description',
        'Hub Industrial e Matriz de Laminação e Conformação Mecânica',
      )
      app.save(ciafalCompany)
    }

    // Plantas: Divinópolis (Matriz) e Contagem (Unidade 2)
    let plantDivinopolis
    try {
      plantDivinopolis = app.findFirstRecordByData('plants', 'code', 'DIV')
    } catch (_) {
      plantDivinopolis = new Record(plantsCol)
      plantDivinopolis.set('code', 'DIV')
      plantDivinopolis.set('name', 'Planta Divinópolis (Matriz)')
      plantDivinopolis.set('company_id', ciafalCompany.id)
      plantDivinopolis.set('city', 'Divinópolis')
      plantDivinopolis.set('state', 'MG')
      plantDivinopolis.set('country', 'Brasil')
      plantDivinopolis.set('sap_plant_code', '1001')
      plantDivinopolis.set('status', 'ACTIVE')
      plantDivinopolis.set('timezone', 'America/Sao_Paulo')
      app.save(plantDivinopolis)
    }

    let plantContagem
    try {
      plantContagem = app.findFirstRecordByData('plants', 'code', 'CTG')
    } catch (_) {
      plantContagem = new Record(plantsCol)
      plantContagem.set('code', 'CTG')
      plantContagem.set('name', 'Planta Contagem (Perfis & Estruturais)')
      plantContagem.set('company_id', ciafalCompany.id)
      plantContagem.set('city', 'Contagem')
      plantContagem.set('state', 'MG')
      plantContagem.set('country', 'Brasil')
      plantContagem.set('sap_plant_code', '1002')
      plantContagem.set('status', 'ACTIVE')
      plantContagem.set('timezone', 'America/Sao_Paulo')
      app.save(plantContagem)
    }

    // Atualizar linhas existentes com suas plantas correspondentes
    const existingLines = app.findRecordsByFilter('production_lines', '', '', 50, 0)
    for (const l of existingLines) {
      const code = l.getString('code')
      if (code === 'L1' || code === 'ENF_L1' || code === 'ACAB_L1') {
        l.set('plant_id', plantDivinopolis.id)
        l.set('line_type', 'Conformação & Laminação Tubos')
        l.set('sap_work_center', 'WC-DIV-' + code)
        l.set('nominal_capacity', 120)
        l.set('capacity_unit', 't/h')
        l.set('shifts_count', 3)
        app.save(l)
      } else if (code === 'L2' || code === 'ACAB_L2' || code === 'ENDIR' || code === 'RETRAB') {
        l.set('plant_id', plantContagem.id)
        l.set('line_type', 'Perfis Pesados & Endireitamento')
        l.set('sap_work_center', 'WC-CTG-' + code)
        l.set('nominal_capacity', 150)
        l.set('capacity_unit', 't/h')
        l.set('shifts_count', 3)
        app.save(l)
      }
    }

    // Seed Rule Packs com Herança de Parâmetros
    // 1. Global
    try {
      app.findFirstRecordByData('rule_packs', 'code', 'RP-GLOBAL-01')
    } catch (_) {
      const rpGlobal = new Record(rulePacksCol)
      rpGlobal.set('code', 'RP-GLOBAL-01')
      rpGlobal.set('name', 'Diretrizes Globais de Sequenciamento CIAFAL')
      rpGlobal.set('version', 'v1.0')
      rpGlobal.set('scope_level', 'GLOBAL')
      rpGlobal.set('rules_payload', {
        maxSetupDurationMinutes: 60,
        minBatchSizeTons: 50,
        bufferSafetyHours: 8,
        priorityWeightOEE: 0.4,
        priorityWeightOTD: 0.6,
      })
      rpGlobal.set('status', 'ACTIVE')
      app.save(rpGlobal)
    }

    // 2. Empresa CIAFAL (prevalência sobre Global)
    try {
      app.findFirstRecordByData('rule_packs', 'code', 'RP-EMP-CIAFAL-01')
    } catch (_) {
      const rpCompany = new Record(rulePacksCol)
      rpCompany.set('code', 'RP-EMP-CIAFAL-01')
      rpCompany.set('name', 'Parâmetros Operacionais Corporativos CIAFAL')
      rpCompany.set('version', 'v1.0')
      rpCompany.set('scope_level', 'COMPANY')
      rpCompany.set('company_id', ciafalCompany.id)
      rpCompany.set('rules_payload', {
        maxSetupDurationMinutes: 55,
        minBatchSizeTons: 60,
        bufferSafetyHours: 8,
      })
      rpCompany.set('status', 'ACTIVE')
      app.save(rpCompany)
    }

    // 3. Planta Divinópolis (prevalência sobre Empresa)
    try {
      app.findFirstRecordByData('rule_packs', 'code', 'RP-PLANT-DIV-01')
    } catch (_) {
      const rpPlant = new Record(rulePacksCol)
      rpPlant.set('code', 'RP-PLANT-DIV-01')
      rpPlant.set('name', 'Regras de Laminação Divinópolis')
      rpPlant.set('version', 'v1.0')
      rpPlant.set('scope_level', 'PLANT')
      rpPlant.set('plant_id', plantDivinopolis.id)
      rpPlant.set('rules_payload', {
        maxSetupDurationMinutes: 50,
        minBatchSizeTons: 80,
      })
      rpPlant.set('status', 'ACTIVE')
      app.save(rpPlant)
    }

    // 4. Linha L1 (prevalência específica)
    try {
      const l1Rec = app.findFirstRecordByData('production_lines', 'code', 'L1')
      try {
        app.findFirstRecordByData('rule_packs', 'code', 'RP-LINE-L1-01')
      } catch (_) {
        const rpLine = new Record(rulePacksCol)
        rpLine.set('code', 'RP-LINE-L1-01')
        rpLine.set('name', 'Regras Específicas Linha 1 (L1)')
        rpLine.set('version', 'v1.0')
        rpLine.set('scope_level', 'LINE')
        rpLine.set('line_id', l1Rec.id)
        rpLine.set('rules_payload', {
          maxSetupDurationMinutes: 40,
          preferredFamilyOrder: ['TUB_QUAD', 'TUB_RET', 'TUB_RED'],
        })
        rpLine.set('status', 'ACTIVE')
        app.save(rpLine)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const rp = app.findCollectionByNameOrId('rule_packs')
      app.delete(rp)
    } catch (_) {}
    try {
      const res = app.findCollectionByNameOrId('resources')
      app.delete(res)
    } catch (_) {}
    try {
      const wc = app.findCollectionByNameOrId('work_centers')
      app.delete(wc)
    } catch (_) {}
    try {
      const pl = app.findCollectionByNameOrId('plants')
      app.delete(pl)
    } catch (_) {}
    try {
      const cp = app.findCollectionByNameOrId('companies')
      app.delete(cp)
    } catch (_) {}
  },
)
