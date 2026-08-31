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
  },
  (app) => {
    // Rollback não destrutivo
  },
)
