/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // Idempotente: se a coleção pcp_rework_items já existir, não recria
  if (app.hasTable && app.hasTable('pcp_rework_items')) {
    return
  }

  const collection = new Collection({
    id: 'col_pcp_rework_01',
    name: 'pcp_rework_items',
    type: 'base',
    system: false,
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      {
        name: 'schedule_code',
        type: 'text',
        required: false,
      },
      {
        name: 'schedule_item_id',
        type: 'text',
        required: false,
      },
      {
        name: 'company_code',
        type: 'text',
        required: false,
      },
      {
        name: 'plant_code',
        type: 'text',
        required: false,
      },
      {
        name: 'rework_center_code',
        type: 'text',
        required: true,
      },
      {
        name: 'material_code',
        type: 'text',
        required: true,
      },
      {
        name: 'material_description',
        type: 'text',
        required: false,
      },
      {
        name: 'lot_number',
        type: 'text',
        required: true,
      },
      {
        name: 'heat_number',
        type: 'text',
        required: false,
      },
      {
        name: 'stock_origin_type',
        type: 'select',
        required: true,
        maxSelect: 1,
        values: ['SEMIACABADO', 'ACABADO'],
      },
      {
        name: 'storage_deposit',
        type: 'text',
        required: true,
      },
      {
        name: 'storage_location',
        type: 'text',
        required: true,
      },
      {
        name: 'available_quantity',
        type: 'number',
        required: true,
      },
      {
        name: 'rework_quantity',
        type: 'number',
        required: true,
      },
      {
        name: 'unit',
        type: 'text',
        required: false,
      },
      {
        name: 'rework_reason_code',
        type: 'text',
        required: false,
      },
      {
        name: 'rework_reason',
        type: 'text',
        required: true,
      },
      {
        name: 'rework_notes',
        type: 'text',
        required: false,
      },
      {
        name: 'rework_operation',
        type: 'text',
        required: true,
      },
      {
        name: 'user_name',
        type: 'text',
        required: false,
      },
      {
        name: 'user_email',
        type: 'text',
        required: false,
      },
      {
        name: 'version_number',
        type: 'number',
        required: false,
      },
      {
        name: 'stock_reference_id',
        type: 'text',
        required: false,
      },
      {
        name: 'audit_payload',
        type: 'json',
        required: false,
      },
    ],
  })

  app.save(collection)
})
