/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Check if collection already exists for idempotency
    let exists = true
    try {
      app.findCollectionByNameOrId('line_reference_documents')
    } catch (_) {
      exists = false
    }

    if (exists) {
      return
    }

    const productionLines = app.findCollectionByNameOrId('production_lines')
    const productionLinesId = productionLines ? productionLines.id : 'production_lines'

    const collection = new Collection({
      name: 'line_reference_documents',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          required: true,
          collectionId: productionLinesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'company_id',
          type: 'text',
        },
        {
          name: 'document_ref',
          type: 'text',
          required: true,
        },
        {
          name: 'document_code',
          type: 'text',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'revision',
          type: 'text',
          required: true,
        },
        {
          name: 'document_type',
          type: 'text',
        },
        {
          name: 'responsible_area',
          type: 'text',
        },
        {
          name: 'validity_date',
          type: 'text',
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['VIGENTE', 'OBSOLETO', 'CANCELADO', 'SUBSTITUIDO'],
          maxSelect: 1,
        },
        {
          name: 'source',
          type: 'text',
        },
        {
          name: 'original_url',
          type: 'text',
        },
        {
          name: 'interference_categories',
          type: 'json',
        },
        {
          name: 'active_revision_ref',
          type: 'text',
        },
        {
          name: 'interpreted_rules',
          type: 'json',
        },
        {
          name: 'created_by_user_id',
          type: 'text',
        },
        {
          name: 'updated_by_user_id',
          type: 'text',
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_lrd_line_docref ON line_reference_documents (line_id, document_ref)',
        'CREATE INDEX idx_lrd_doc_code ON line_reference_documents (document_code)',
        'CREATE INDEX idx_lrd_status ON line_reference_documents (status)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('line_reference_documents')
      app.delete(collection)
    } catch (_) {}
  },
)
