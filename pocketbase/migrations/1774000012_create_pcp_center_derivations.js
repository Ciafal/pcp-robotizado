migrate(
  (app) => {
    // 1. Adicionar campo is_derived na coleção production_lines (se não existir)
    try {
      const prodLinesCol = app.findCollectionByNameOrId('production_lines')
      if (!prodLinesCol.fields.getByName('is_derived')) {
        prodLinesCol.fields.add(new BoolField({ name: 'is_derived' }))
        app.save(prodLinesCol)
      }
    } catch (err) {
      console.log('Aviso ao atualizar production_lines com is_derived:', err)
    }

    // 2. Resolver IDs de coleções relacionadas
    let linesColId = ''
    try {
      linesColId = app.findCollectionByNameOrId('production_lines').id
    } catch (_) {}

    let usersColId = '_pb_users_auth_'

    // 3. Criar coleção pcp_center_derivations
    let existingDerivCol = null
    try {
      existingDerivCol = app.findCollectionByNameOrId('pcp_center_derivations')
    } catch (_) {}

    if (!existingDerivCol) {
      const collection = new Collection({
        name: 'pcp_center_derivations',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          {
            name: 'center_id',
            type: 'relation',
            collectionId: linesColId || undefined,
            maxSelect: 1,
            required: false,
          },
          { name: 'center_code', type: 'text', required: true },
          {
            name: 'source_center_id',
            type: 'relation',
            collectionId: linesColId || undefined,
            maxSelect: 1,
            required: false,
          },
          { name: 'source_center_code', type: 'text', required: true },
          { name: 'source_center_name', type: 'text', required: false },
          { name: 'source_center_sap', type: 'text', required: false },
          { name: 'source_center_company', type: 'text', required: false },
          { name: 'source_center_line', type: 'text', required: false },
          { name: 'matkl_groups', type: 'json', required: false },
          { name: 'start_date', type: 'date', required: true },
          { name: 'end_date', type: 'date', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Ativa', 'Inativa', 'ATIVA', 'INATIVA'],
            maxSelect: 1,
          },
          { name: 'deleted', type: 'bool', required: false },
          { name: 'created_by', type: 'text', required: false },
          { name: 'updated_by', type: 'text', required: false },
          {
            name: 'user_id',
            type: 'relation',
            collectionId: usersColId,
            maxSelect: 1,
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pcd_center ON pcp_center_derivations (center_code)',
          'CREATE INDEX idx_pcd_source ON pcp_center_derivations (source_center_code)',
          'CREATE INDEX idx_pcd_status ON pcp_center_derivations (status)',
          'CREATE INDEX idx_pcd_deleted ON pcp_center_derivations (deleted)',
        ],
      })

      app.save(collection)
    }

    // 4. Criar coleção sap_matkl_groups (cache para Grupos de Mercadorias MATKL)
    let existingMatklCol = null
    try {
      existingMatklCol = app.findCollectionByNameOrId('sap_matkl_groups')
    } catch (_) {}

    if (!existingMatklCol) {
      const matklCollection = new Collection({
        name: 'sap_matkl_groups',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'matkl', type: 'text', required: true },
          { name: 'description', type: 'text', required: true },
          {
            name: 'origin_source',
            type: 'select',
            values: ['SAP_RFC', 'CACHE'],
            maxSelect: 1,
            required: true,
          },
          { name: 'last_sync', type: 'date', required: false },
          { name: 'is_active', type: 'bool', required: false },
          { name: 'raw_sap_payload', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_smg_matkl ON sap_matkl_groups (matkl)',
          'CREATE INDEX idx_smg_active ON sap_matkl_groups (is_active)',
        ],
      })

      app.save(matklCollection)

      // Seed com dados oficiais SAP MATKL (tabela MARA / T023)
      const officialMatkl = [
        { matkl: '001', description: 'Tubos Industriais Redondos Soldados HF' },
        { matkl: '002', description: 'Tubos Estruturais Quadrados e Retangulares' },
        { matkl: '003', description: 'Perfis Laminares e Cantoneiras de Abas Iguais' },
        { matkl: '005', description: 'Barras Chatas Laminadas a Quente' },
        { matkl: '010', description: 'Vergalhões e Fios-Máquina Trefilados' },
        { matkl: '012', description: 'Tarugos e Palanquilhas de Aço Carbono' },
        { matkl: '015', description: 'Perfis U e Vigas I Laminadas Médias' },
        { matkl: '020', description: 'Tubos Mecânicos e Condução Schedule' },
        { matkl: '025', description: 'Arames e Derivados Trefilados a Frio' },
        { matkl: '030', description: 'Bobinas e Tiras de Aço Laminadas a Quente' },
      ]

      for (const item of officialMatkl) {
        try {
          const rec = new Record(matklCollection)
          rec.set('matkl', item.matkl)
          rec.set('description', item.description)
          rec.set('origin_source', 'CACHE')
          rec.set('is_active', true)
          rec.set('last_sync', '2026-09-18 10:00:00.000Z')
          app.save(rec)
        } catch (e) {
          console.log('Erro ao inserir seed de MATKL:', e)
        }
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('pcp_center_derivations')
      app.delete(col)
    } catch (_) {}

    try {
      const colMatkl = app.findCollectionByNameOrId('sap_matkl_groups')
      app.delete(colMatkl)
    } catch (_) {}

    try {
      const prodLinesCol = app.findCollectionByNameOrId('production_lines')
      if (prodLinesCol.fields.getByName('is_derived')) {
        prodLinesCol.fields.removeByName('is_derived')
        app.save(prodLinesCol)
      }
    } catch (_) {}
  },
)
