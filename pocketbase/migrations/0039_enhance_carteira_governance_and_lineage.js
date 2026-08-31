/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Verificar e enriquecer coleção carteira_uploads
    const uploadsCol = app.findCollectionByNameOrId('carteira_uploads')
    if (uploadsCol) {
      const existingFields = uploadsCol.fields.map((f) => f.name)
      if (!existingFields.includes('file_hash_sha256')) {
        uploadsCol.fields.add(new TextField({ name: 'file_hash_sha256' }))
      }
      if (!existingFields.includes('snapshot_version')) {
        uploadsCol.fields.add(new TextField({ name: 'snapshot_version' }))
      }
      if (!existingFields.includes('execution_status')) {
        uploadsCol.fields.add(new TextField({ name: 'execution_status' }))
      }
      if (!existingFields.includes('reconciliation_status')) {
        uploadsCol.fields.add(new TextField({ name: 'reconciliation_status' }))
      }
      if (!existingFields.includes('environment')) {
        uploadsCol.fields.add(new TextField({ name: 'environment' }))
      }
      if (!existingFields.includes('lineage_summary')) {
        uploadsCol.fields.add(new JSONField({ name: 'lineage_summary' }))
      }
      app.save(uploadsCol)
    }

    // 2. Verificar e enriquecer coleção carteira_items com lineage e governança
    const itemsCol = app.findCollectionByNameOrId('carteira_items')
    if (itemsCol) {
      const existingItemFields = itemsCol.fields.map((f) => f.name)
      if (!existingItemFields.includes('source_load_id')) {
        itemsCol.fields.add(new TextField({ name: 'source_load_id' }))
      }
      if (!existingItemFields.includes('source_file')) {
        itemsCol.fields.add(new TextField({ name: 'source_file' }))
      }
      if (!existingItemFields.includes('source_row')) {
        itemsCol.fields.add(new NumberField({ name: 'source_row' }))
      }
      if (!existingItemFields.includes('source_transaction')) {
        itemsCol.fields.add(new TextField({ name: 'source_transaction' }))
      }
      if (!existingItemFields.includes('source_system')) {
        itemsCol.fields.add(new TextField({ name: 'source_system' }))
      }
      if (!existingItemFields.includes('rule_version_applied')) {
        itemsCol.fields.add(new TextField({ name: 'rule_version_applied' }))
      }
      if (!existingItemFields.includes('calculation_memory')) {
        itemsCol.fields.add(new JSONField({ name: 'calculation_memory' }))
      }
      if (!existingItemFields.includes('environment')) {
        itemsCol.fields.add(new TextField({ name: 'environment' }))
      }
      app.save(itemsCol)
    }

    // 3. Registrar default config em carteira_regras_config se vazio
    const regrasCol = app.findCollectionByNameOrId('carteira_regras_config')
    if (regrasCol) {
      try {
        const existing = app.findRecordsByFilter(
          'carteira_regras_config',
          "version_number = 'V001' || version_number = '1'",
          '-created',
          1,
        )
        if (!existing || existing.length === 0) {
          const defaultRegra = new Record(regrasCol)
          defaultRegra.set('version_number', 'V001')
          defaultRegra.set('descricao', 'Regra Padrão Canônica de Cálculo ZSD28C e Ciclos L1/L2')
          defaultRegra.set(
            'justificativa',
            'Carga inicial das regras parametrizadas com governança auditável',
          )
          defaultRegra.set('is_active', true)
          defaultRegra.set('autor_email', 'pcp.admin@ciafal.com.br')
          defaultRegra.set('regras_json', {
            prefixosL1: {
              C: { descricao: 'Barra Chata', familia: 'BARRA_CHATA' },
              Q: { descricao: 'Quadrado', familia: 'QUADRADO' },
              S: { descricao: 'Sextavado', familia: 'SEXTAVADO' },
              B: { descricao: 'Barra Redonda', familia: 'REDONDO' },
            },
            prefixosL2: {
              V: { descricao: 'Cantoneira', familia: 'CANTONEIRA' },
              U: { descricao: 'Perfil U', familia: 'PERFIL_U' },
              R: { descricao: 'Redondo Pesado', familia: 'REDONDO' },
              T: { descricao: 'Perfil T', familia: 'PERFIL_T' },
            },
            amareloDiasRuptura: 7,
            leadTimePadraoDias: 5,
            produtividadeNominalL1_th: 18.0,
            produtividadeNominalL2_th: 16.0,
            estoqueMinimoSegurancaDias: 3,
            formula_l1:
              'Disp = Livre + MTO + Semiacabado; Demanda = Vendas + MTO; Saldo = Disp - Demanda',
            formula_l2:
              'Negativa = MIN(0; (Livre+MTO+SemiCIAFAL+SemiVallourec)-(ZSD24+MTO)); Saldo = MAX(0; (Livre+MTO+SemiCIAFAL)-(Vendas+MTO)) [Sujeita a validação do PCP]',
          })
          app.save(defaultRegra)
        }
      } catch (err) {
        // Ignorar se já configurado
      }
    }
  },
  (app) => {
    // Rollback não destrutivo
  },
)
