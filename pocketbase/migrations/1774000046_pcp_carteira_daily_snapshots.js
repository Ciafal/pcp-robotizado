/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Criação idempotente da collection de snapshots diários da carteira para apuração de KPIs
    if (!app.hasTable('pcp_carteira_daily_snapshots')) {
      const collection = new Collection({
        id: 'pcp_carteira_daily_snapshots',
        name: 'pcp_carteira_daily_snapshots',
        type: 'base',
        system: false,
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          {
            name: 'data',
            type: 'text',
            required: true,
          },
          {
            name: 'material',
            type: 'text',
            required: true,
          },
          {
            name: 'material_descricao',
            type: 'text',
            required: false,
          },
          {
            name: 'familia',
            type: 'text',
            required: false,
          },
          {
            name: 'tipo_material',
            type: 'text',
            required: false,
          },
          {
            name: 'centro',
            type: 'text',
            required: true,
          },
          {
            name: 'linha',
            type: 'text',
            required: false,
          },
          {
            name: 'saldo_carteira',
            type: 'number',
            required: true,
          },
          {
            name: 'curva_abc_vigente',
            type: 'text',
            required: false,
          },
          {
            name: 'origem_dados',
            type: 'text',
            required: false,
          },
          {
            name: 'data_hora_atualizacao',
            type: 'text',
            required: false,
          },
          {
            name: 'competencia',
            type: 'text',
            required: false,
          },
          {
            name: 'estoque_t',
            type: 'number',
            required: false,
          },
          {
            name: 'programacao_t',
            type: 'number',
            required: false,
          },
          {
            name: 'producao_t',
            type: 'number',
            required: false,
          },
          {
            name: 'observacao_ia',
            type: 'text',
            required: false,
          },
        ],
        indexes: [
          'CREATE INDEX idx_pcp_snap_comp_date ON pcp_carteira_daily_snapshots (competencia, data)',
          'CREATE INDEX idx_pcp_snap_mat_center ON pcp_carteira_daily_snapshots (material, centro)',
        ],
      })

      app.save(collection)
    }
  },
  (app) => {
    if (app.hasTable('pcp_carteira_daily_snapshots')) {
      const collection = app.findCollectionByNameOrId('pcp_carteira_daily_snapshots')
      app.delete(collection)
    }
  },
)
